// preview/components/Toolbar.tsx
// TOC 工具栏（dev/260804/01）：左右切换 / 整栏折叠 / 全部展开收起 / 回到顶部。
//
// 与提案 §2/§5.4 的差异（React 化，见 dev/260804/06 §2）：
//   - 不用 data-act 事件委托——React 组件不存在「rebuild 重绑」问题，按钮直接 onClick；
//   - 不用 updateToolbarState() 手动同步——aria-pressed 由 props（state）派生；
//   - 「折叠 ▾ / 展开 ▸」合并为单个 toggle：整栏折叠后 sidebar 滑出，独立「展开」按钮
//     永远点不到（展开入口是 FAB），保留两个只剩冗余；
//   - 图标用 lucide-react（05 迁移后已有依赖），非 Unicode。
//
// 无障碍（提案 §6）：原生 <button>（Tab/Enter/Space 免费获得）+ role="toolbar" 包组 +
// toggle 类按钮 aria-pressed。

import {
  ArrowUp,
  ChevronsDownUp,
  ChevronsUpDown,
  PanelLeft,
  PanelLeftClose,
  PanelRight,
} from 'lucide-react';

interface ToolbarProps {
  position: 'left' | 'right';
  collapsed: boolean;
  onPosition: (p: 'left' | 'right') => void;
  onToggleCollapsed: () => void;
  /** 全部展开(false)/收起(true)。M1 阶段仅写入哨兵，无可见效果（03 落地时消费）。 */
  onSetAllNodes: (collapse: boolean) => void;
  onBackToTop: () => void;
}

const ICON_SIZE = 14;

export function Toolbar({
  position,
  collapsed,
  onPosition,
  onToggleCollapsed,
  onSetAllNodes,
  onBackToTop,
}: ToolbarProps) {
  return (
    <div className="mdtoc-toolbar" role="toolbar" aria-label="TOC 操作">
      <button
        type="button"
        className="mdtoc-tbtn"
        title="全部展开"
        aria-label="全部展开"
        onClick={() => onSetAllNodes(false)}
      >
        <ChevronsUpDown size={ICON_SIZE} aria-hidden />
      </button>
      <button
        type="button"
        className="mdtoc-tbtn"
        title="全部收起"
        aria-label="全部收起"
        onClick={() => onSetAllNodes(true)}
      >
        <ChevronsDownUp size={ICON_SIZE} aria-hidden />
      </button>
      <span className="mdtoc-tsep" aria-hidden />
      <button
        type="button"
        className="mdtoc-tbtn"
        title="回到顶部"
        aria-label="回到顶部"
        onClick={onBackToTop}
      >
        <ArrowUp size={ICON_SIZE} aria-hidden />
      </button>
      <span className="mdtoc-tsep" aria-hidden />
      <button
        type="button"
        className="mdtoc-tbtn"
        title="靠左显示"
        aria-label="靠左显示"
        aria-pressed={position === 'left'}
        onClick={() => onPosition('left')}
      >
        <PanelLeft size={ICON_SIZE} aria-hidden />
      </button>
      <button
        type="button"
        className="mdtoc-tbtn"
        title="靠右显示"
        aria-label="靠右显示"
        aria-pressed={position === 'right'}
        onClick={() => onPosition('right')}
      >
        <PanelRight size={ICON_SIZE} aria-hidden />
      </button>
      <span className="mdtoc-tsep" aria-hidden />
      <button
        type="button"
        className="mdtoc-tbtn"
        title="折叠目录"
        aria-label="折叠目录"
        aria-pressed={collapsed}
        onClick={onToggleCollapsed}
      >
        <PanelLeftClose size={ICON_SIZE} aria-hidden />
      </button>
    </div>
  );
}
