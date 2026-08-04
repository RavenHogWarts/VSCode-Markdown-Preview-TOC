// preview/types.ts
// 预览侧共享类型。与宿主 src/extension.ts 的 MdtocConfig 保持一致。

export interface MdtocConfig {
  enabled: boolean;
  width: number;
  position: 'left' | 'right';
  defaultCollapsed: boolean;
  minDepth: number;
  maxDepth: number;
  highlightOnScroll: boolean;
  autoExpandDepth: number;
}

/**
 * TOC 单项。
 *
 * 与 v1（命令式版）的差异：**不再持有 `el: HTMLElement`**。
 * v1 每次 rebuild 都要刷新 el 引用（标题 DOM 被 VSCode 重建后旧引用失效）。
 * React 版改为在需要时用 `document.getElementById(id)` 实时取节点（见 useToc），
 * 从根上规避「持有过期 DOM 引用」的问题。
 */
export interface TocItem {
  id: string;    // 标题原生 id（githubSlugifier 生成）
  text: string;  // 标题纯文本
  level: number; // 1-6
}
