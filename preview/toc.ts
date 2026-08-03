// preview/toc.ts
// 运行在预览 webview（浏览器环境，无 acquireVsCodeApi、无 vscode）。
// 构建为 media/toc.js（IIFE）经 markdown.previewScripts 注入。
//
// M1 范围（核心 TOC MVP）：
//   1. 读取 <meta id="mdtoc-config">（由 extension.ts 的 extendMarkdownIt 注入）。
//   2. 扫描 h1-h6（原生已带 id）→ 生成 #mdtoc-sidebar 插到 body。
//   3. 点击 TOC 项 → scrollIntoView 平滑滚到对应标题。
//   4. 防重入：__mdtoc_cleanup__ 清理旧 observer 与旧 sidebar，避免重载产生重复。
//   5. MutationObserver 监听正文变化 → 内容变更重建（用 signature 比对避免无限循环）。
//
// 不在本阶段：滚动高亮、折叠、FAB、防抖、响应式（见 M2/M3）。
// 参考实现：dev/260803/04-implementation.md §2，并修正其中的两处问题（见文末注释）。

interface TocItem {
  id: string;       // 标题原生 id（githubSlugifier 生成）
  text: string;     // 标题纯文本
  level: number;    // 1-6
  el: HTMLElement;  // 标题 DOM 引用
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
  // 注意：不能设在 #mdtoc-sidebar —— CSS 变量不跨兄弟继承，会导致正文 margin 失效。
  document.body.style.setProperty('--mdtoc-width', cfg.width + 'px');

  // 位置 / 折叠态（M1 暂不实现折叠交互，但先把 class 落上，CSS 已准备）。
  document.body.classList.toggle('mdtoc-right', cfg.position === 'right');
  document.body.classList.toggle('mdtoc-collapsed', cfg.defaultCollapsed);

  // ---- 1. 构建侧栏骨架 ----
  // 重载时先移除旧 sidebar，避免重复（__mdtoc_cleanup__ 也会兜底）。
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

  if (!cfg.enabled) return;

  // ---- 2. 扫描标题 → 生成 TOC ----
  let items: TocItem[] = [];
  // 记录上一次渲染的内容签名，避免 MutationObserver 自身改 DOM 引发无限循环。
  let lastSignature = '';

  function rebuild() {
    const headings = Array.from(
      document.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6')
    ).filter((h) => {
      const level = Number(h.tagName.slice(1));
      return level >= cfg.minDepth && level <= cfg.maxDepth && h.id;
    });

    items = headings.map((h) => ({
      id: h.id,
      text: h.textContent || '(无标题)',
      level: Number(h.tagName.slice(1)),
      el: h,
    }));

    // 签名比对：标题集合未变则跳过渲染，避免 nav.innerHTML 改动再次触发 mutation。
    const sig = items.map((it) => `${it.level}:${it.id}:${it.text}`).join('|');
    if (sig === lastSignature) return;
    lastSignature = sig;

    // 渲染：扁平列表 + level 控制缩进（避免树形结构的复杂度）。
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

    bindClicks();
  }

  // ---- 3. 点击跳转 ----
  function bindClicks() {
    nav.querySelectorAll<HTMLElement>('.mdtoc-item').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const id = a.dataset.target;
        if (!id) return;
        const target = document.getElementById(id);
        // scrollIntoView 平滑滚动；scroll-margin-top 由 CSS 提供让位。
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  // ---- 4. 内容变更重建 ----
  // 直接在回调里 rebuild 会触发自身改 nav.innerHTML → mutation → 死循环。
  // 用上面的 signature 比对短路（标题不变即 return），从根上断开循环。
  // （M2 会在此基础上加 100ms 防抖，进一步降低高频重渲染的开销。）
  const mut = new MutationObserver(() => rebuild());
  mut.observe(document.body, { childList: true, subtree: true });
  cleaners.push(() => mut.disconnect());

  // ---- 启动 ----
  rebuild();

  console.log('[mdtoc] M1 sidebar ready, items:', items.length);
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

/*
 * 与设计文档（04-implementation.md §2 / 05-styling-and-layout.md §2）的差异（已回填至 10-milestones.md）：
 *
 * 1. --mdtoc-width 作用域：
 *    文档把 --mdtoc-width 设在 #mdtoc-sidebar 上，但正文 .markdown-body 是其兄弟，
 *    CSS 自定义属性不跨兄弟引用 → 正文 margin-left 会拿不到值、回退到 0，正文被遮挡。
 *    改为设在 document.body（sidebar 与正文的共同祖先），sidebar 与正文都能引用。
 *
 * 2. MutationObserver 无限循环：
 *    文档原写法 mut → rebuild() → nav.innerHTML 改动 → 触发新 mut → 又 rebuild()。
 *    用「标题签名比对」短路：标题集合没变就不重渲染，从根上断开循环（M2 再叠 100ms 防抖）。
 */
