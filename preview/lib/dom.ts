// preview/lib/dom.ts
// 预览侧纯 DOM 工具。
//
// 注意：v1 的 escapeHtml / escapeAttr 已**退休**——React 渲染文本/属性时自动转义
// （见 TocItem.tsx 的 {item.text}），列表拼接不再手动转义，XSS 面收窄。
// 仅保留 cssEscape：它用于 querySelector 选择器（属性值里的特殊字符），React 不代管。

/** 转义用于 CSS 属性选择器的字符串（如 `.mdtoc-item[data-target="..."]`）。 */
export function cssEscape(s: string): string {
  const w = window as unknown as { CSS?: { escape?: (v: string) => string } };
  return w.CSS?.escape?.(s) ?? s.replace(/"/g, '\\"');
}
