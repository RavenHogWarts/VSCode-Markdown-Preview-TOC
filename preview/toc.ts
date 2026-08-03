// preview/toc.ts
// 运行在预览 webview（浏览器环境，无 acquireVsCodeApi、无 vscode）。
// 构建为 media/toc.js（IIFE）经 markdown.previewScripts 注入。
//
// M0 阶段：仅 console.log 验证注入链路。
//   - 确认脚本确实被加载（DevTools Console 出现 [mdtoc] ...）
//   - 确认 <meta id="mdtoc-config"> 已由 extension.ts 的 extendMarkdownIt 注入
//   - 确认原生标题已带 id（githubSlugifier 生成）
// 完整 TOC 实现（buildToc / 点击跳转 / 滚动高亮）见 M1，参考 dev/260803/04-implementation.md §2。

(function init() {
  // 防重入：VSCode 内容变更会重载脚本；window 可能保留。
  (window as any).__mdtoc_cleanup__?.();
  const cleaners: Array<() => void> = [];
  (window as any).__mdtoc_cleanup__ = () => {
    cleaners.forEach((fn) => { try { fn(); } catch {} });
    cleaners.length = 0;
  };

  const metaEl = document.getElementById('mdtoc-config');
  const rawConfig = metaEl?.getAttribute('data-config') ?? null;
  let cfg: any = null;
  try {
    cfg = rawConfig ? JSON.parse(rawConfig) : null;
  } catch {
    cfg = null;
  }

  const headings = Array.from(
    document.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6')
  );

  console.log('[mdtoc] preview script loaded (M0 scaffold)');
  console.log('[mdtoc] config meta present:', !!metaEl, cfg);
  console.log('[mdtoc] headings found:', headings.length);
  if (headings.length) {
    const sample = headings.slice(0, 3).map((h) => ({ tag: h.tagName, id: h.id, text: h.textContent }));
    console.log('[mdtoc] sample headings:', sample);
  }
})();
