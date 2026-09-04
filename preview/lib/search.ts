// preview/lib/search.ts
// 页内搜索的纯逻辑层：文本匹配（纯函数）、DOM Range 采集、CSS Custom Highlight 封装。
//
// 为什么用 CSS Custom Highlight API 而非「包 <span>」：
//   原生预览的正文 DOM 随时会被 VSCode 重建（编辑刷新），包 span 会与之打架
//   （改 DOM → 触发 MutationObserver → 再重建），还会污染正文结构。
//   Highlight API 只登记 Range、不动 DOM，天然规避这两个问题；
//   webview 内核 Chromium ≥ 105 即支持（VSCode 1.85+ 满足）。
//   不可用时降级为「仅计数 + 跳转」，不高亮（见 paintHits/paintActive 的空实现兜底）。

/** 在 text 中查找 query 的全部命中区间（大小写不敏感、不重叠），返回 [start, end) 列表。 */
export function findMatches(text: string, query: string): Array<[number, number]> {
  if (!query) return [];
  const haystack = text.toLowerCase();
  const needle = query.toLowerCase();
  const out: Array<[number, number]> = [];
  let from = 0;
  for (;;) {
    const hit = haystack.indexOf(needle, from);
    if (hit === -1) break;
    out.push([hit, hit + needle.length]);
    from = hit + needle.length; // 不重叠：与浏览器 find 行为一致
  }
  return out;
}

/** 搜索时跳过的子树：本插件注入的 UI 与不可见元素。 */
const SKIP_SELECTOR = '#mdtoc-sidebar, #mdtoc-fab, #mdtoc-searchbar, script, style, noscript, template';

/**
 * 采集 root 内所有文本节点对 query 的命中 Range（文档顺序）。
 * TreeWalker 逐文本节点走查；命中区间逐条生成 Range，供 Highlight API 登记与跳转定位。
 */
export function collectMatchRanges(root: HTMLElement, query: string): Range[] {
  const ranges: Range[] = [];
  if (!query) return ranges;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = (node as Text).parentElement;
      if (!parent || parent.closest(SKIP_SELECTOR)) return NodeFilter.FILTER_REJECT;
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    for (const [start, end] of findMatches(node.nodeValue ?? '', query)) {
      const r = document.createRange();
      r.setStart(node, start);
      r.setEnd(node, end);
      ranges.push(r);
    }
  }
  return ranges;
}

/** 全部命中的 Highlight 注册名。 */
const HIT_NAME = 'mdtoc-search-hit';
/** 当前命中（active）的 Highlight 注册名。后注册者同优先级时绘制在上层。 */
const ACTIVE_NAME = 'mdtoc-search-active';

// TS 5.4 的 DOM lib 尚未稳定收录 Highlight API 类型，这里定义最小结构类型兜底，
// 运行期再做能力探测（老 webview 无此 API 时优雅降级）。
interface HighlightRegistryLike {
  set(name: string, highlight: unknown): void;
  delete(name: string): void;
}
interface HighlightWindow extends Window {
  Highlight?: new (...ranges: Range[]) => unknown;
  CSS?: { highlights?: HighlightRegistryLike };
}

function highlightRegistry(): { registry: HighlightRegistryLike; ctor: NonNullable<HighlightWindow['Highlight']> } | null {
  const w = window as unknown as HighlightWindow;
  if (typeof w.Highlight !== 'function' || !w.CSS?.highlights) return null;
  return { registry: w.CSS.highlights, ctor: w.Highlight };
}

/** 高亮全部命中（黄色底）。空数组时清除该层。 */
export function paintHits(ranges: Range[]): void {
  const api = highlightRegistry();
  if (!api) return;
  api.registry.set(HIT_NAME, new api.ctor(...ranges));
}

/** 高亮当前命中（橙色底，盖在 hit 层上）。null 时清除该层。 */
export function paintActive(range: Range | null): void {
  const api = highlightRegistry();
  if (!api) return;
  if (range) api.registry.set(ACTIVE_NAME, new api.ctor(range));
  else api.registry.delete(ACTIVE_NAME);
}

/** 关闭搜索时清除两层高亮。 */
export function clearSearchHighlights(): void {
  const api = highlightRegistry();
  if (!api) return;
  api.registry.delete(HIT_NAME);
  api.registry.delete(ACTIVE_NAME);
}

/** 把命中滚动进视口（居中，平滑）。Range 由文本节点构造，必有 parentElement。 */
export function scrollToRange(range: Range): void {
  (range.startContainer as Text).parentElement?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  });
}
