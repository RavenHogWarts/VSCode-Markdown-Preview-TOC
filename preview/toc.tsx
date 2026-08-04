// preview/toc.tsx
// 预览脚本入口（React）。运行在预览 webview（浏览器环境，无 acquireVsCodeApi、无 vscode），
// 构建为 media/toc.js（IIFE）经 markdown.previewScripts 注入。
//
// 架构：React「岛屿」模型（见 dev/260804/05-react-migration.md §5）——
//   React 只接管注入的 #mdtoc-sidebar 这一个 widget；正文 h1-h6 由 VSCode 渲染，
//   useToc 用 observer 从外部 DOM 采集标题/高亮，React 只负责画侧栏。
//
// 迁移自 v1 命令式 preview/toc.ts（M2）。行为对齐见 §14 DoD。

import { useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';

import { useConfig } from './hooks/useConfig';
import { useMediaQuery } from './hooks/useMediaQuery';
import { useToc } from './hooks/useToc';
import { Header } from './components/Header';
import { TocList } from './components/TocList';
import { Fab } from './components/Fab';

interface WindowWithMdtoc extends Window {
  __mdtoc_cleanup__?: () => void;
}

const NARROW_QUERY = '(max-width: 720px)';

function App({ fabHost }: { fabHost: HTMLElement }) {
  const cfg = useConfig();
  const narrow = useMediaQuery(NARROW_QUERY);
  const { items, activeId, jump } = useToc(cfg);

  // 配置驱动的 body 副作用（宽度 / 左右位置 / 折叠默认值）。
  // 正文让位靠 media/toc.css 读 body 上的 --mdtoc-width 与 mdtoc-right/mdtoc-collapsed class。
  // 用 useLayoutEffect：在 paint 前同步应用，避免「侧栏先渲染、正文后让位」的一帧闪烁。
  // cfg 来自 useConfig（稳定引用），故此 effect 每次挂载只跑一次（= v1 init 顶部的同步设置）。
  useLayoutEffect(() => {
    const body = document.body;
    body.style.setProperty('--mdtoc-width', cfg.width + 'px');
    body.classList.toggle('mdtoc-right', cfg.position === 'right');
    body.classList.toggle('mdtoc-collapsed', cfg.defaultCollapsed);
  }, [cfg]);

  // 窄屏响应式：matchMedia → body class（与 CSS @media(max-width:720px) 配合，= v1 applyNarrow）。
  useLayoutEffect(() => {
    document.body.classList.toggle('mdtoc-narrow', narrow);
  }, [narrow]);

  // 折叠交互（= v1）：点 header 整栏折叠切换；FAB 点击/回车展开。
  // collapsed 的单一真相源是 body class（CSS 据此驱动 sidebar 滑出 + FAB 显隐 + 正文让位），
  // 不做成 React state——它不改变组件结构，只切 CSS，命令式操作 body 最贴近 v1 且零回归。
  const toggleCollapsed = () => document.body.classList.toggle('mdtoc-collapsed');
  const expand = () => document.body.classList.remove('mdtoc-collapsed');

  return (
    <>
      <Header onToggle={toggleCollapsed} />
      <TocList
        items={items}
        activeId={activeId}
        minDepth={cfg.minDepth}
        enabled={cfg.enabled}
        onJump={jump}
      />
      {/* FAB 是 body 下的独立浮层（折叠态才显示），用 portal 渲染进 #mdtoc-fab 容器 */}
      {createPortal(<Fab onExpand={expand} />, fabHost)}
    </>
  );
}

// ---- 幂等挂载 ----
// VSCode 内容变更（日常编辑 md）由 useToc 内部的 MutationObserver 处理，**不重跑本脚本**。
// 本脚本重跑仅发生在预览刷新/重开（如改配置触发 markdown.preview.refresh）时，window 可能保留。
// 策略：每次重跑先 cleanup（unmount 旧 root + 移除旧 DOM）再全新挂载 —— 与 v1 init 的
// 「先 remove 再重建」等价，保证读到最新配置、无重复挂载、无 observer 泄漏。
// （日常编辑不走这里，故刷新时的一次性重建不影响输入流畅度。）
function mount() {
  const w = window as unknown as WindowWithMdtoc;
  w.__mdtoc_cleanup__?.();

  // 防御性清理：即便上一轮未设 cleanup，也不残留重复节点（= v1 的 `?.remove()`）。
  document.getElementById('mdtoc-sidebar')?.remove();
  document.getElementById('mdtoc-fab')?.remove();

  const sidebar = document.createElement('aside');
  sidebar.id = 'mdtoc-sidebar';
  sidebar.setAttribute('aria-label', 'Table of contents');
  document.body.prepend(sidebar);

  const fab = document.createElement('div');
  fab.id = 'mdtoc-fab';
  document.body.appendChild(fab);

  const root = createRoot(sidebar);
  root.render(<App fabHost={fab} />);

  w.__mdtoc_cleanup__ = () => {
    try {
      root.unmount(); // React 卸载 → 各 hook 的 useEffect cleanup 断开 observer/监听
    } catch {
      /* 已卸载则忽略 */
    }
    sidebar.remove();
    fab.remove();
  };
}

mount();
