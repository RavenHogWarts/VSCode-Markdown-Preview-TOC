// preview/toc.ts
// 运行在预览 webview（浏览器环境，无 acquireVsCodeApi、无 vscode）。
// 构建为 media/toc.js（IIFE）经 markdown.previewScripts 注入。
//
// 已完成范围：
//   M1 核心 TOC：sidebar + 扫描标题生成列表 + 点击跳转 + 防重入 + 内容变更重建。
//   M2 滚动高亮 + 折叠 + 防抖（本次）。
//
// 参考：dev/260803/04-implementation.md §2~§7、05-styling-and-layout.md §2、§5、§6。
// 与文档的差异见文末注释。

interface TocItem {
  id: string;       // 标题原生 id（githubSlugifier 生成）
  text: string;     // 标题纯文本
  level: number;    // 1-6
  el: HTMLElement;  // 标题 DOM 引用（每次 rebuild 刷新）
}

interface MdtocConfig {
  enabled: boolean;
  width: number;
  position: 'left' | 'right';
  defaultCollapsed: boolean;
  minDepth: number;
  maxDepth: number;
  highlightOnScroll: boolean;
  autoExpandDepth: number;
}

(function init() {
  // ---- 防重入 ----
  // VSCode 内容变更会重载脚本；window 可能保留。先清理上一轮。
  (window as any).__mdtoc_cleanup__?.();
  const cleaners: Array<() => void> = [];
  (window as any).__mdtoc_cleanup__ = () => {
    cleaners.forEach((fn) => { try { fn(); } catch {} });
    cleaners.length = 0;
  };

  const cfg = readConfig();

  // 宽度变量设到 body，使正文 margin 选择器（兄弟元素）也能引用。
  document.body.style.setProperty('--mdtoc-width', cfg.width + 'px');

  // 位置 / 折叠态（折叠默认值来自配置）。
  document.body.classList.toggle('mdtoc-right', cfg.position === 'right');
  document.body.classList.toggle('mdtoc-collapsed', cfg.defaultCollapsed);

  // ---- 1. 构建侧栏骨架 ----
  document.getElementById('mdtoc-sidebar')?.remove();
  const sidebar = document.createElement('aside');
  sidebar.id = 'mdtoc-sidebar';
  sidebar.setAttribute('aria-label', 'Table of contents');

  const header = document.createElement('div');
  header.id = 'mdtoc-header';
  header.innerHTML =
    '<span class="mdtoc-title">目录</span>' +
    '<span class="mdtoc-fold-btn" aria-hidden="true">▾</span>';
  sidebar.appendChild(header);

  const nav = document.createElement('nav');
  nav.id = 'mdtoc-list';
  sidebar.appendChild(nav);

  document.body.prepend(sidebar);

  // ---- 窄屏响应式（matchMedia 驱动） ----
  // 与 CSS @media(max-width:720px) 配合：窄屏给 body 加 .mdtoc-narrow，
  // CSS 把 sidebar 浮动并默认滑出（避免遮挡正文）；FAB 提供展开入口。
  // 用 matchMedia 而非 resize 事件，避免高频回调。
  const NARROW_QUERY = '(max-width: 720px)';
  const mql = window.matchMedia(NARROW_QUERY);
  const applyNarrow = (narrow: boolean) => {
    document.body.classList.toggle('mdtoc-narrow', narrow);
    // 窄屏退出时确保 sidebar 不被遗留为「滑出」态（mdtoc-collapsed 由用户/FAB 控制）。
    if (!narrow) document.body.classList.remove('mdtoc-narrow');
  };
  applyNarrow(mql.matches);
  // addEventListener 兼容老 Webview（Safari 14 前用 addListener）。
  if (typeof mql.addEventListener === 'function') {
    mql.addEventListener('change', (e) => applyNarrow(e.matches));
    cleaners.push(() => mql.removeEventListener('change', (e: MediaQueryListEvent) => applyNarrow(e.matches)));
  } else if (typeof (mql as any).addListener === 'function') {
    (mql as any).addListener((e: MediaQueryList) => applyNarrow(e.matches));
    cleaners.push(() => (mql as any).removeListener((e: MediaQueryList) => applyNarrow(e.matches)));
  }

  // ---- 2. 折叠浮动按钮（FAB） ----
  // sidebar 折叠滑走后点不到，FAB 提供展开入口。
  document.getElementById('mdtoc-fab')?.remove();
  const fab = document.createElement('div');
  fab.id = 'mdtoc-fab';
  fab.textContent = '☰';
  fab.title = '展开目录';
  fab.setAttribute('role', 'button');
  fab.setAttribute('tabindex', '0');
  document.body.appendChild(fab);

  if (!cfg.enabled) return;

  // ---- 3. 扫描标题 → 生成 TOC ----
  let items: TocItem[] = [];
  // 仅在标题集合变化时重渲染 nav HTML，避免高频重绘。
  let lastSignature = '';
  let observer: IntersectionObserver | null = null;
  let currentActive: string | null = null;
  // 全局可见标题集合：IntersectionObserver 回调只含「本帧状态变化」的标题，
  // 不含「仍在活跃区但没变化」的标题。若直接从 entries 取最上方项，会跳过
  // 仍在可见区、只是没变化的中间标题（如 active=2.1 时，2.2/2.3 仍可见但不在
  // entries，新进入的 3.3 会被误判为「最上方」→ active 直接跳到 3.3，漏掉 2.2/2.3）。
  // 解法：维护全局可见集合，按变化增删，再从 items（文档顺序）取第一个可见项。
  const visibleIds = new Set<string>();

  function rebuild() {
    const headings = Array.from(
      document.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6')
    ).filter((h) => {
      const level = Number(h.tagName.slice(1));
      return level >= cfg.minDepth && level <= cfg.maxDepth && h.id;
    });

    // 关键修正：items[].el 必须每次刷新。
    // VSCode 重渲染预览时，即使标题文本/id 不变，DOM 节点也是新创建的；
    // 若沿用旧 el 引用，IntersectionObserver 会盯着已脱离文档的旧节点，高亮失效。
    items = headings.map((h) => ({
      id: h.id,
      text: h.textContent || '(无标题)',
      level: Number(h.tagName.slice(1)),
      el: h,
    }));

    // 签名比对：标题集合（文本维度）未变则跳过 nav.innerHTML 重写。
    // 仅避免「视觉上的无谓重绘」，不影响上面的 el 刷新与下面的 observer 重连。
    const sig = items.map((it) => `${it.level}:${it.id}:${it.text}`).join('|');
    const structChanged = sig !== lastSignature;
    lastSignature = sig;

    if (structChanged) {
      if (items.length === 0) {
        // 边界：无标题（或全部不在 minDepth..maxDepth 范围）→ 友好空状态。
        nav.classList.add('mdtoc-empty');
        nav.textContent = '暂无可跳转的标题';
      } else {
        nav.classList.remove('mdtoc-empty');
        nav.innerHTML = items
          .map((it) => {
            const indent = (it.level - cfg.minDepth) * 14;
            return (
              `<a class="mdtoc-item level-${it.level}"` +
              ` data-target="${escapeAttr(it.id)}"` +
              ` style="padding-left:${12 + indent}px"` +
              ` title="${escapeAttr(it.text)}"` +
              `>` +
              `<span class="mdtoc-text">${escapeHtml(it.text)}</span>` +
              `</a>`
            );
          })
          .join('');
      }
      bindClicks();
      // 结构变了，active 状态可能失效，重新应用一次。
      if (currentActive) setActive(currentActive, /*scroll*/ false);
    }

    // observer 必须每次重建并重新 observe 新节点（无论结构是否变化）。
    observeScroll();
  }

  // ---- 4. 点击跳转 ----
  function bindClicks() {
    nav.querySelectorAll<HTMLElement>('.mdtoc-item').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const id = a.dataset.target;
        if (!id) return;
        const target = document.getElementById(id);
        if (!target) return;
        // 跳转期间挂起高亮跟随：平滑滚动会依次掠过中间标题，
        // 若不挂起，IntersectionObserver 会把这些中间标题逐个置 active，
        // 导致 TOC 高亮不停跳变、列表也跟着抖动（setActive 会滚 TOC 视区）。
        suspendHighlightForScroll();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // 点击后立刻置 active（目标标题即当前），不等 observer 回调（更跟手）。
        setActive(id);
      });
    });
  }

  /**
   * 跳转期间挂起高亮跟随，并在滚动真正结束后恢复。
   *
   * 为什么需要：点击 TOC → 正文 smooth 滚动会依次经过中间标题，IntersectionObserver
   * 会逐个把它们判为「当前可见」并 setActive，TOC 高亮会一路跳变；setActive 又会
   * scrollIntoView 把 active 项滚进 TOC 视区，TOC 列表也跟着抖动。
   *
   * 恢复时机：
   *   - 首选 `scrollend`（滚动结束即解除，最精准）；
   *   - 兜底超时 600ms（老 Chromium / 部分场景不触发 scrollend，避免永久挂起）；
   *   - 忽略「TOC 列表自身滚动」的 scrollend（setActive 滚 TOC 是副作用，不应提前解除）。
   */
  let scrollSuspendTimer: number | undefined;
  let isProgrammaticScroll = false;
  function suspendHighlightForScroll() {
    isProgrammaticScroll = true;
    clearTimeout(scrollSuspendTimer);
    // 兜底：平滑滚动一般 < 600ms；超时强制恢复，防止 scrollend 未触发时永久挂起。
    scrollSuspendTimer = setTimeout(() => { isProgrammaticScroll = false; }, 600) as unknown as number;
  }
  // 只关心「正文（window/visualViewport）」的滚动结束；
  // TOC 列表 #mdtoc-list 自身滚动（setActive 触发）的 scrollend 不应解除挂起。
  const onScrollEnd = () => {
    if (!isProgrammaticScroll) return;
    clearTimeout(scrollSuspendTimer);
    isProgrammaticScroll = false;
  };
  window.addEventListener('scrollend', onScrollEnd);
  window.visualViewport?.addEventListener('scrollend', onScrollEnd);
  cleaners.push(() => {
    window.removeEventListener('scrollend', onScrollEnd);
    window.visualViewport?.removeEventListener('scrollend', onScrollEnd);
    clearTimeout(scrollSuspendTimer);
  });

  // ---- 5. 滚动高亮（IntersectionObserver） ----
  function observeScroll() {
    observer?.disconnect();
    // 重建 observer 时可见集合失效（旧目标已脱离文档），清空避免脏数据。
    visibleIds.clear();
    if (!cfg.highlightOnScroll || items.length === 0) {
      observer = null;
      return;
    }
    observer = new IntersectionObserver(
      (entries) => {
        // 按「本帧变化」增删全局可见集合：进入的加入，离开的移除。
        // 注意：即使点击跳转期间 isProgrammaticScroll=true（挂起 setActive 跟随），
        // 这里仍要维护 visibleIds，否则挂起期间离开/进入的标题状态丢失，
        // 解除挂起后取到的「最上方可见项」会基于过时集合。
        for (const e of entries) {
          const id = (e.target as HTMLElement).id;
          if (e.isIntersecting) visibleIds.add(id);
          else visibleIds.delete(id);
        }
        // 点击跳转发起的平滑滚动期间，挂起高亮跟随（见 suspendHighlightForScroll）。
        if (isProgrammaticScroll) return;
        setActiveFromVisible();
      },
      // 底部 70% 不算，标题进入视口顶部 30% 才算「当前在看的」。
      { rootMargin: '0px 0px -70% 0px', threshold: 0 }
    );
    items.forEach((it) => observer!.observe(it.el));
  }

  /**
   * 从全局可见集合中取「文档顺序最靠上」的标题作为 active。
   *
   * 关键修正：不能只看 IntersectionObserver 本帧的 entries（它只含状态变化的标题），
   * 否则当中间标题仍在可见区但本帧没变化时，新进入的更靠后标题会被误判为最上方
   * （如 active=2.1、2.2/2.3 仍可见但不在 entries、3.3 新进入 → 误判 3.3）。
   * 这里遍历 items（文档顺序），第一个在 visibleIds 里的即是最上方可见标题。
   */
  function setActiveFromVisible() {
    if (visibleIds.size === 0) return;
    for (const it of items) {
      if (visibleIds.has(it.id)) {
        if (it.id !== currentActive) setActive(it.id);
        return;
      }
    }
  }

  /** 设置 active 高亮；scroll=true 时把 active 项滚进 TOC 视区。 */
  function setActive(id: string | null, scroll = true) {
    currentActive = id;
    nav.querySelectorAll('.mdtoc-item').forEach((el) => {
      el.classList.toggle('active', (el as HTMLElement).dataset.target === id);
    });
    if (id && scroll) {
      const activeEl = nav.querySelector<HTMLElement>(
        `.mdtoc-item[data-target="${cssEscape(id)}"]`
      );
      activeEl?.scrollIntoView({ block: 'nearest' });
    }
  }

  // ---- 6. 折叠交互 ----
  // 点 header 切换折叠；FAB 点击/回车展开。
  const toggleFold = () => document.body.classList.toggle('mdtoc-collapsed');
  header.addEventListener('click', toggleFold);
  const expandFromFab = () => document.body.classList.remove('mdtoc-collapsed');
  fab.addEventListener('click', expandFromFab);
  fab.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      expandFromFab();
    }
  });

  // ---- 7. 内容变更重建（防抖 100ms） ----
  // VSCode 重渲染预览时 mutation 高频触发，防抖合并。
  // 防抖内仍走 rebuild()：el 每次刷新、observer 每次重连，签名比对兜底避免无谓重绘。
  let rebuildTimer: number | undefined;
  const rebuildDebounced = () => {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(rebuild, 100) as unknown as number;
  };
  const mut = new MutationObserver(rebuildDebounced);
  mut.observe(document.body, { childList: true, subtree: true });
  cleaners.push(() => mut.disconnect());
  cleaners.push(() => {
    clearTimeout(rebuildTimer);
    observer?.disconnect();
  });

  // ---- 启动 ----
  rebuild();

  console.log('[mdtoc] M2 sidebar ready, items:', items.length);
})();

// ---------- 工具 ----------

function readConfig(): MdtocConfig {
  const raw = document.getElementById('mdtoc-config')?.getAttribute('data-config');
  const fallback: MdtocConfig = {
    enabled: true,
    width: 260,
    position: 'left',
    defaultCollapsed: false,
    minDepth: 2,
    maxDepth: 6,
    highlightOnScroll: true,
    autoExpandDepth: 3,
  };
  if (!raw) return fallback;
  try {
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function cssEscape(s: string): string {
  return (window as any).CSS?.escape?.(s) ?? s.replace(/"/g, '\\"');
}

/*
 * 与设计文档的差异（已回填至 10-milestones.md）：
 *
 * 1. 标题 DOM 重渲染后 el 引用失效（M2 新发现）：
 *    VSCode 编辑 md → 重新渲染预览，会重建标题 DOM 节点（即使文本/id 不变）。
 *    若沿用 M1 的「签名不变就整体 return」，IntersectionObserver 仍盯着已脱离文档的旧节点，
 *    导致滚动高亮失效。修正：把「刷新 el + 重连 observer」与「重写 nav.innerHTML」解耦 ——
 *    前者每次 rebuild 都做，后者仅签名变化时做。
 *
 * 2. --mdtoc-width 作用域（M1 已修正，沿用）：设在 body 而非 sidebar。
 * 3. MutationObserver 无限循环（M1 已用签名短路修正，M2 再叠 100ms 防抖）。
 */
