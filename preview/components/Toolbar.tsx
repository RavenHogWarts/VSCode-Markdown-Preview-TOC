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
  Palette,
  PanelLeft,
  PanelLeftClose,
  PanelRight,
} from 'lucide-react';
import type { StyleName } from '../types';
import { useState } from 'react';

interface ToolbarProps {
  position: 'left' | 'right';
  collapsed: boolean;
  styleName: StyleName;
  onPosition: (p: 'left' | 'right') => void;
  onToggleCollapsed: () => void;
  /** 全部展开(false)/收起(true)。 */
  onSetAllNodes: (collapse: boolean) => void;
  onBackToTop: () => void;
  /** 循环切换风格（02 §3.2：单按钮循环，title 播报当前风格）。 */
  onCycleStyle: () => void;
}

/** 风格的中文名（title/aria 播报用，02 §3.2）。 */
const STYLE_LABELS: Record<StyleName, string> = {
  indented: '缩进',
  pill: '药丸',
  starlight: '星标',
};

const ICON_SIZE = 14;

export function Toolbar({
  position,
  collapsed,
  styleName,
  onPosition,
  onToggleCollapsed,
  onSetAllNodes,
  onBackToTop,
  onCycleStyle,
}: ToolbarProps) {
  const [isCollapsed, setIsCollapsed] = useState(collapsed);

  return (
    <div className="mdtoc-toolbar" role="toolbar" aria-label="TOC 操作">
      <button
        type="button"
        className="mdtoc-tbtn"
        title={`全部${isCollapsed ? '展开' : '收起'}`}
        aria-label={`全部${isCollapsed ? '展开' : '收起'}`}
        onClick={() => {onSetAllNodes(!isCollapsed); setIsCollapsed(!isCollapsed)}}
      >
        {isCollapsed ? (
          <ChevronsUpDown size={ICON_SIZE} aria-hidden />
        ) : (
          <ChevronsDownUp size={ICON_SIZE} aria-hidden />
        )}        
      </button>
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
        title={`TOC 风格：${STYLE_LABELS[styleName]}（点击切换）`}
        aria-label={`切换 TOC 风格，当前：${STYLE_LABELS[styleName]}`}
        onClick={onCycleStyle}
      >
        <Palette size={ICON_SIZE} aria-hidden />
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
