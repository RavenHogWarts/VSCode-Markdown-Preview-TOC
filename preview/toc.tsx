// preview/toc.tsx
// 预览脚本入口（React）。运行在预览 webview（浏览器环境，无 acquireVsCodeApi、无 vscode），
// 构建为 media/toc.js（IIFE）经 markdown.previewScripts 注入。
//
// 架构：React「岛屿」模型（见 dev/260804/05-react-migration.md §5）——
//   React 只接管注入的 #mdtoc-sidebar 这一个 widget；正文 h1-h6 由 VSCode 渲染，
//   useToc 用 observer 从外部 DOM 采集标题/高亮，React 只负责画侧栏。
//
// v2-M1（dev/260804/01 + 06 §4）：双层状态模型落地——
//   position / collapsed 的真相源从「cfg 直写 body class」迁为 useOverrideState
//   （localStorage 即时层 > <meta> 配置默认层），body class 降级为派生副作用。
//   工具栏（Toolbar）承载左右切换 / 整栏折叠 / 全部展开收起 / 回到顶部。
// v2-M2（dev/260804/03 + 06 §5）：子树折叠——useCollapsedNodes 管理折叠集
//   （autoExpandDepth 在此激活）+ active 祖先链手风琴跟随，显隐由 TocList 纯函数推导；
//   工具栏「全部展开/收起」从 M1 的哨兵 no-op 接上真实现。

import { useCallback, useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';

import { useConfig } from './hooks/useConfig';
import { useMediaQuery } from './hooks/useMediaQuery';
import { useOverrideState, type OverrideCodec } from './hooks/useOverrideState';
import { useCollapsedNodes } from './hooks/useCollapsedNodes';
import { useToc } from './hooks/useToc';
import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { TocList } from './components/TocList';
import { Fab } from './components/Fab';

interface WindowWithMdtoc extends Window {
  __mdtoc_cleanup__?: () => void;
}

const NARROW_QUERY = '(max-width: 720px)';

// 工具栏在此宽度以下进入紧凑模式（隐藏文字标题）。与 toc.css 的 @container 断点一致。
const COMPACT_WIDTH = 220;

// codec 必须模块级（引用稳定），见 useOverrideState 头注释。
// 键名/取值约定见 dev/260804/01 §3.1。
const POSITION_CODEC: OverrideCodec<'left' | 'right'> = {
  parse: (raw) => (raw === 'left' || raw === 'right' ? raw : null),
  serialize: (v) => v,
};
const COLLAPSED_CODEC: OverrideCodec<boolean> = {
  parse: (raw) => (raw === '1' ? true : raw === '0' ? false : null),
  serialize: (v) => (v ? '1' : '0'),
};

function App({ fabHost }: { fabHost: HTMLElement }) {
  const cfg = useConfig();
  const narrow = useMediaQuery(NARROW_QUERY);
  const { items, activeId, jump } = useToc(cfg);

  // 子树折叠（M2）：折叠集三态管理 + autoExpandDepth 激活 + 手风琴跟随——
  // activeId 的祖先链作为会话 overlay 从折叠集减除：全部折叠时滚动正文，
  // 只展开当前在读的子树，active 移走后自动回收（详见 useCollapsedNodes 头注释）。
  const { collapsedIds, isAuto, toggleNode, setAllNodes } = useCollapsedNodes(
    items,
    cfg.autoExpandDepth,
    activeId
  );

  // 双层状态：localStorage（工具栏即时层）> cfg（配置默认层）。
  // setter 同步写 localStorage（跨刷新记忆），body class 在下方 effect 派生。
  const [position, setPosition] = useOverrideState<'left' | 'right'>(
    'position',
    cfg.position,
    POSITION_CODEC
  );
  const [collapsed, setCollapsed] = useOverrideState<boolean>(
    'collapsed',
    cfg.defaultCollapsed,
    COLLAPSED_CODEC
  );

  // 配置/状态驱动的 body 副作用。正文让位靠 media/toc.css 读 body 上的
  // --mdtoc-width 与 mdtoc-right/mdtoc-collapsed class。
  // 用 useLayoutEffect：在 paint 前同步应用，避免「侧栏先渲染、正文后让位」的一帧闪烁。
  // 拆成三个 effect：width 只由 cfg 决定；position/collapsed 由 resolved state 决定——
  // 不能再让 cfg 直写这两个 class，否则与即时层双写打架（dev/260804/06 §9 风险 1）。
  useLayoutEffect(() => {
    document.body.style.setProperty('--mdtoc-width', cfg.width + 'px');
  }, [cfg]);
  useLayoutEffect(() => {
    document.body.classList.toggle('mdtoc-right', position === 'right');
  }, [position]);
  useLayoutEffect(() => {
    document.body.classList.toggle('mdtoc-collapsed', collapsed);
  }, [collapsed]);

  // 窄屏响应式：matchMedia → body class（与 CSS @media(max-width:720px) 配合，= v1 applyNarrow）。
  useLayoutEffect(() => {
    document.body.classList.toggle('mdtoc-narrow', narrow);
  }, [narrow]);

  // 窄 sidebar（如用户设 sidebarWidth: 180）下标题+按钮挤不下 → .mdtoc-compact 隐藏标题。
  // 主方案是 CSS container query（toc.css §2.5）；这里用 ResizeObserver 作 JS 兜底，
  // 两者规则镜像，不支持 @container 的老 webview 也能降级（dev/260804/01 §9.1）。
  useLayoutEffect(() => {
    const sidebar = document.getElementById('mdtoc-sidebar');
    if (!sidebar || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      sidebar.classList.toggle('mdtoc-compact', sidebar.clientWidth <= COMPACT_WIDTH);
    });
    ro.observe(sidebar);
    return () => ro.disconnect();
  }, []);

  // 折叠交互：标题/工具栏切换（经 setCollapsed 持久化）；FAB 展开。
  const toggleCollapsed = () => setCollapsed(!collapsed);
  const expand = () => setCollapsed(false);

  const backToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <>
      <Header onToggle={toggleCollapsed}>
        <Toolbar
          position={position}
          collapsed={collapsed}
          onPosition={setPosition}
          onToggleCollapsed={toggleCollapsed}
          onSetAllNodes={setAllNodes}
          onBackToTop={backToTop}
        />
      </Header>
      <TocList
        items={items}
        activeId={activeId}
        minDepth={cfg.minDepth}
        enabled={cfg.enabled}
        collapsedIds={collapsedIds}
        // 空态提示仅在「配置全收起且用户从未手动操作」时出现（03 §6.3）。
        showCollapseHint={isAuto && cfg.autoExpandDepth <= 0}
        onJump={jump}
        onToggleNode={toggleNode}
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
