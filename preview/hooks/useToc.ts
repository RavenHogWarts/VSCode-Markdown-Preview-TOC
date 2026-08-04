// preview/hooks/useToc.ts
// TOC 核心 hook：扫描标题 → 生成列表 → 滚动高亮 → 点击跳转。
//
// 这是 v1 `preview/toc.ts` 里 rebuild() + observeScroll() + setActiveFromVisible()
// + bindClicks()/suspendHighlightForScroll() 的**内聚移植**。逻辑 1:1 照搬，只把
// 「结果的呈现」从命令式（切 .active class / 重写 nav.innerHTML）改为 React state
// （items / activeId），交给组件声明式渲染。
//
// 为什么合成一个 hook 而非拆成 useHeadings + useActiveHeading：
//   v1 的关键正确性依赖「扫描」与「重连 observer」的强时序耦合——标题 DOM 被 VSCode
//   重建后，即使 id/text 不变，IntersectionObserver 也必须重新 observe 新节点，否则高亮
//   失效（v1 文末注释 §1）。把两者放同一个 rebuild() 里最稳；拆成两个 hook 需额外的
//   version 信号跨 hook 传递，反而易错。故内聚。

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MdtocConfig, TocItem } from '../types';
import { markTree } from '../lib/tree';

interface UseTocResult {
  items: TocItem[];
  activeId: string | null;
  /** 章节与视口有重叠的标题 id 集合（Starlight 轨道高亮用，按章节区间计算）。 */
  visibleIds: ReadonlySet<string>;
  /** 点击 TOC 项：平滑滚动到标题 + 立即高亮 + 挂起滚动跟随。 */
  jump: (id: string) => void;
}

export function useToc(cfg: MdtocConfig): UseTocResult {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [visibleIdsState, setVisibleIdsState] = useState<ReadonlySet<string>>(new Set());

  // ---- 跨渲染的可变状态（用 ref，不触发重渲染，语义等价 v1 的闭包变量）----
  const itemsRef = useRef<TocItem[]>([]);         // = v1 items（文档顺序，供 IO 回调取最上项）
  const lastSig = useRef('');                     // = v1 lastSignature（签名短路）
  const visibleIds = useRef<Set<string>>(new Set()); // = v1 visibleIds（全局可见集合）
  const lastVisibleSig = useRef('');              // 用于 visibleIdsState 去重，避免频繁重渲染
  const activeRef = useRef<string | null>(null);  // = v1 currentActive（供 IO 回调读当前 active）
  const suspended = useRef(false);                // = v1 isProgrammaticScroll（跳转期挂起）
  const suspendTimer = useRef<number | undefined>(undefined);

  // 高亮/扫描/观察的完整生命周期。cfg 各字段来自 useConfig（稳定），一个会话内只建一次。
  useEffect(() => {
    if (!cfg.enabled) {
      setItems([]);
      itemsRef.current = [];
      setVisibleIdsState(new Set());
      lastVisibleSig.current = '';
      return;
    }

    let observer: IntersectionObserver | null = null;

    const setActive = (id: string | null) => {
      activeRef.current = id;
      setActiveId(id);
    };

    // 从全局可见集合取「文档顺序最靠上」的标题作为 active（= v1 setActiveFromVisible）。
    // 关键：不能只看本帧 entries（只含状态变化的标题），否则中间仍可见但未变化的标题会被跳过。
    const setActiveFromVisible = () => {
      if (visibleIds.current.size === 0) return;
      for (const it of itemsRef.current) {
        if (visibleIds.current.has(it.id)) {
          if (it.id !== activeRef.current) setActive(it.id);
          return;
        }
      }
    };

    // 重连 IntersectionObserver（= v1 observeScroll）。每次 rebuild 都调，无论签名是否变——
    // 因为标题 DOM 可能被 VSCode 重建，必须 observe 新节点。
    const observeScroll = () => {
      observer?.disconnect();
      visibleIds.current.clear(); // 旧目标已脱离文档，清空避免脏数据
      if (!cfg.highlightOnScroll || itemsRef.current.length === 0) {
        observer = null;
        return;
      }
      observer = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            const id = (e.target as HTMLElement).id;
            if (e.isIntersecting) visibleIds.current.add(id);
            else visibleIds.current.delete(id);
          }
          // 跳转期挂起高亮跟随（仍维护 visibleIds，见下方 jump）。
          if (suspended.current) return;
          setActiveFromVisible();
        },
        // 底部 70% 不算，标题进入视口顶部 30% 才算「当前在看的」。
        { rootMargin: '0px 0px -70% 0px', threshold: 0 }
      );
      // 用 getElementById 实时取节点（不持有过期引用，见 types.ts TocItem 注释）。
      itemsRef.current.forEach((it) => {
        const el = document.getElementById(it.id);
        if (el) observer!.observe(el);
      });
    };

    // ---- 可见章节计算（Starlight 轨道高亮用，与 active 检测解耦）----
    // active 用的 IO 带 rootMargin -70%（只算顶部 30%），语义是「当前在读哪一条」；
    // Starlight 要的是「阅读区正显示着哪些章节」：标题 i 的章节区间 = [标题 i, 标题 i+1)。
    // 阅读区不是整个视口，而是顶部 60% 的带（对齐 Fumadocs 的 rootMargin 底部 -40%）——
    // 否则短文档整篇都在屏上时，轨道会整条点亮，失去「当前读到哪」的指示意义。
    // 标题即使已滚出顶部，只要其内容还盖住阅读区，该项就保持高亮。
    // 滚动高频触发，rAF 节流 + 签名去重。
    let visRaf = 0;
    const computeVisibleSections = () => {
      visRaf = 0;
      const bandBottom = window.innerHeight * 0.6;
      const tops = itemsRef.current.map((it) => {
        const el = document.getElementById(it.id);
        return el ? el.getBoundingClientRect().top : Number.POSITIVE_INFINITY;
      });
      const next = new Set<string>();
      for (let i = 0; i < tops.length; i++) {
        const start = tops[i];
        const end = i + 1 < tops.length ? tops[i + 1] : Number.POSITIVE_INFINITY;
        if (end > 0 && start < bandBottom) next.add(itemsRef.current[i].id);
      }
      const sig = Array.from(next).join('|');
      if (sig !== lastVisibleSig.current) {
        lastVisibleSig.current = sig;
        setVisibleIdsState(next);
      }
    };
    const scheduleVisible = () => {
      if (!visRaf) visRaf = requestAnimationFrame(computeVisibleSections);
    };
    window.addEventListener('scroll', scheduleVisible, { passive: true });
    window.addEventListener('resize', scheduleVisible);

    // 扫描标题 → 更新 items + 重连 observer（= v1 rebuild）。
    const rebuild = () => {
      const headings = Array.from(
        document.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6')
      ).filter((h) => {
        const level = Number(h.tagName.slice(1));
        return level >= cfg.minDepth && level <= cfg.maxDepth && !!h.id;
      });

      const next: TocItem[] = headings.map((h) => ({
        id: h.id,
        text: h.textContent || '(无标题)',
        level: Number(h.tagName.slice(1)),
        hasChildren: false,
      }));
      markTree(next); // 标记可折叠父项（v2-M2 子树折叠用，O(n) 单遍栈）
      itemsRef.current = next;

      // 签名短路：仅在标题集合（层级/id/文本）变化时才 setItems，避免无谓重渲染。
      // React 的 keyed diff 会进一步把 DOM patch 降到最小；此处短路是「连 setState 都省」。
      // hasChildren 由 level 序列唯一决定，签名含 level 即已覆盖，无需单独入签。
      const sig = next.map((it) => `${it.level}:${it.id}:${it.text}`).join('|');
      if (sig !== lastSig.current) {
        lastSig.current = sig;
        setItems(next);
      }

      // observer 必须每次重建（新标题节点），无论结构是否变化。
      observeScroll();
      // 内容/结构变化后章节几何过期，重算可见集合。
      scheduleVisible();
    };

    // ---- 内容变更重建（防抖 100ms，= v1 rebuildDebounced）----
    let rebuildTimer: number | undefined;
    const rebuildDebounced = () => {
      clearTimeout(rebuildTimer);
      rebuildTimer = setTimeout(rebuild, 100) as unknown as number;
    };
    const mut = new MutationObserver(rebuildDebounced);
    mut.observe(document.body, { childList: true, subtree: true });

    // ---- 跳转期挂起的 scrollend 恢复（= v1 onScrollEnd）----
    // 只关心正文（window / visualViewport）滚动结束；TOC 列表自身滚动的 scrollend 不解除挂起。
    const onScrollEnd = () => {
      if (!suspended.current) return;
      clearTimeout(suspendTimer.current);
      suspended.current = false;
    };
    window.addEventListener('scrollend', onScrollEnd);
    window.visualViewport?.addEventListener('scrollend', onScrollEnd);

    rebuild(); // 首次

    return () => {
      clearTimeout(rebuildTimer);
      clearTimeout(suspendTimer.current);
      if (visRaf) cancelAnimationFrame(visRaf);
      mut.disconnect();
      observer?.disconnect();
      window.removeEventListener('scroll', scheduleVisible);
      window.removeEventListener('resize', scheduleVisible);
      window.removeEventListener('scrollend', onScrollEnd);
      window.visualViewport?.removeEventListener('scrollend', onScrollEnd);
    };
    // cfg 来自 useConfig（稳定引用）；列出具体字段让依赖精确。
  }, [cfg.enabled, cfg.minDepth, cfg.maxDepth, cfg.highlightOnScroll]);

  // 点击跳转（= v1 bindClicks + suspendHighlightForScroll）。
  const jump = useCallback((id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    // 挂起高亮跟随：平滑滚动会依次掠过中间标题，若不挂起，IO 会把它们逐个置 active，
    // 导致高亮跳变、TOC 列表抖动。scrollend 或 600ms 兜底恢复。
    suspended.current = true;
    clearTimeout(suspendTimer.current);
    suspendTimer.current = setTimeout(() => {
      suspended.current = false;
    }, 600) as unknown as number;

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // 点击后立刻置 active（目标标题即当前），不等 observer 回调（更跟手）。
    activeRef.current = id;
    setActiveId(id);
  }, []);

  return { items, activeId, visibleIds: visibleIdsState, jump };
}
