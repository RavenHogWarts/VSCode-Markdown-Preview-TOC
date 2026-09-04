// preview/hooks/useSearch.ts
// 页内搜索 hook：搜索栏开关/查询状态、命中采集与高亮、上一个/下一个跳转。
//
// 背景：VSCode 的 Markdown 预览是 webview，原生没有 find-in-page
//   （Ctrl+F 不会唤起预览内查找），用户无法在预览里搜内容。本 hook 补上这个能力：
//   Ctrl/Cmd+F 唤起搜索栏，CSS Custom Highlight 高亮全部命中，Enter/Shift+Enter 跳转。
//
// 与 useToc 的关系：完全独立。两者都挂了 body 级 MutationObserver，互不干扰；
//   搜索的高亮不动 DOM（Highlight API），不会触发 useToc 的 rebuild。

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clearSearchHighlights,
  collectMatchRanges,
  paintActive,
  paintHits,
  scrollToRange,
} from '../lib/search';

interface UseSearchResult {
  open: boolean;
  query: string;
  /** 命中总数（query 为空或搜索关闭时为 0）。 */
  matchCount: number;
  /** 当前命中下标（0 起始；-1 表示无命中）。 */
  activeIndex: number;
  setQuery: (q: string) => void;
  openSearch: () => void;
  closeSearch: () => void;
  next: () => void;
  prev: () => void;
}

// 输入防抖：边打字边全文采集足够快，但 Highlight 重绘在大文档下有感，小防抖平滑输入。
const SEARCH_DEBOUNCE = 120;
// 正文变更（编辑同步）后重采集的防抖：编辑期 DOM 变更密集，比输入防抖略长。
const MUTATION_DEBOUNCE = 150;

export function useSearch(): UseSearchResult {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [matchCount, setMatchCount] = useState(0);
  const [activeIndex, setActiveIndex] = useState(-1);

  // 命中 Range 列表（文档顺序）。Range 是 live 的但 VSCode 重建正文后旧节点会脱离文档，
  // 故只在一个采集周期内有效；变更后由 MutationObserver 触发重采集。
  const rangesRef = useRef<Range[]>([]);

  const openSearch = useCallback(() => setOpen(true), []);

  const closeSearch = useCallback(() => {
    setOpen(false);
    setMatchCount(0);
    setActiveIndex(-1);
    rangesRef.current = [];
    clearSearchHighlights();
    // query 保留：浏览器 find 重开时记住上次关键词，此处对齐该习惯。
  }, []);

  /**
   * 采集 + 高亮 + 定位。
   * @param scroll 是否滚动到当前命中（输入关键词/翻页时 true；正文变更重采集时 false，
   *               避免用户正在阅读时视口被拽走）。
   */
  const runSearch = useCallback((q: string, opts: { scroll: boolean; keepIndex: boolean }) => {
    const ranges = collectMatchRanges(document.body, q);
    rangesRef.current = ranges;
    setMatchCount(ranges.length);
    if (ranges.length === 0) {
      // 无命中（含清空 query）：两层高亮都要清，否则残留上次的高亮。
      setActiveIndex(-1);
      paintHits(ranges);
      paintActive(null);
      return;
    }
    paintHits(ranges); // 先注册 hit 层，active 层后注册绘制在上层
    setActiveIndex((prev) => {
      const idx = opts.keepIndex && prev >= 0 && prev < ranges.length ? prev : 0;
      if (opts.scroll) scrollToRange(ranges[idx]);
      paintActive(ranges[idx]);
      return idx;
    });
  }, []);

  // ---- 快捷键：Ctrl/Cmd+F 唤起 ----
  // 为什么必须 capture + stopImmediatePropagation：
  //   VSCode 的 webview host 脚本在 window 的 bubble 阶段监听 keydown，把按键经
  //   postMessage('did-keydown') 转发给 workbench 键绑定服务（不检查 defaultPrevented），
  //   于是 Ctrl+F 总会触发 VSCode 自己的查找命令（原生 webview find widget，在 markdown
  //   预览内不能正常高亮/跳转）。bubble 阶段才拦的话 host 早已把消息发出；
  //   挂在 window 的 capture 阶段（整条传播路径最前）+ stopImmediatePropagation
  //   可让 host 的监听器根本收不到该按键，Ctrl+F 完全归本搜索栏。
  //   只拦这一个组合键：Ctrl+Shift+F（全局搜索）等其它按键照常放行。
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (open) {
          // 已打开：对齐浏览器 find——重按 Ctrl+F 聚焦并全选现有关键词。
          const input = document.querySelector<HTMLInputElement>('.mdtoc-searchbar-input');
          input?.focus();
          input?.select();
        } else {
          setOpen(true);
        }
        return;
      }
      if (open && e.key === 'Escape') {
        e.preventDefault();
        closeSearch();
      }
    };
    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [open, closeSearch]);

  // ---- 采集生命周期：打开且有 query 时做首次采集（输入防抖），并挂 observer 跟踪正文变更 ----
  useEffect(() => {
    if (!open) return;

    const t = setTimeout(() => runSearch(query, { scroll: true, keepIndex: false }), SEARCH_DEBOUNCE);

    let mutTimer: number | undefined;
    const mut = new MutationObserver((records) => {
      // 搜索栏自身的 DOM 变化（打字、计数刷新）不算正文变更——
      // 否则每敲一个字都会触发一次冗余重采集。
      const onlySearchbar = records.every((r) => {
        const t = r.target;
        const el = t instanceof Element ? t : t.parentElement;
        return el?.closest('#mdtoc-searchbar') != null;
      });
      if (onlySearchbar) return;
      clearTimeout(mutTimer);
      mutTimer = setTimeout(() => {
        // 关闭后 observer 已 disconnect，此处无需再判 open；query 用最新闭包值。
        runSearch(query, { scroll: false, keepIndex: true });
      }, MUTATION_DEBOUNCE) as unknown as number;
    });
    mut.observe(document.body, { childList: true, subtree: true, characterData: true });

    return () => {
      clearTimeout(t);
      clearTimeout(mutTimer);
      mut.disconnect();
    };
  }, [open, query, runSearch]);

  // ---- 翻页：环形跳转（对齐浏览器 find 的 wrap 行为）----
  const goTo = useCallback(
    (delta: 1 | -1) => {
      const ranges = rangesRef.current;
      if (ranges.length === 0) return;
      setActiveIndex((prev) => {
        const idx = (prev + delta + ranges.length) % ranges.length;
        paintActive(ranges[idx]);
        scrollToRange(ranges[idx]);
        return idx;
      });
    },
    []
  );
  const next = useCallback(() => goTo(1), [goTo]);
  const prev = useCallback(() => goTo(-1), [goTo]);

  return { open, query, matchCount, activeIndex, setQuery, openSearch, closeSearch, next, prev };
}
