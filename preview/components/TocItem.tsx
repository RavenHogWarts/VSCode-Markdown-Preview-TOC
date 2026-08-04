// preview/components/TocItem.tsx
// TOC 单项。className / data-target / 缩进与 v1 完全对齐。
//
// v2-M2（dev/260804/03 §3）：父项前置折叠 toggle（点它折叠子树、不跳转），
// 叶子项渲染同宽占位符使文本左缘对齐。类名钩子 mdtoc-parent / mdtoc-collapsed-node
// 同时供 M3 风格变体覆写（02 §6）。
//
// 附带收益：{item.text} 由 React 自动转义，v1 的 escapeHtml/escapeAttr 在此退休（XSS 面收窄）。

import { ChevronDown, ChevronRight } from 'lucide-react';
import type { TocItem as TocItemModel } from '../types';

interface TocItemProps {
  item: TocItemModel;
  active: boolean;
  minDepth: number;
  /** 该父项的子树当前是否收起（叶子项恒 false）。 */
  collapsed: boolean;
  onJump: (id: string) => void;
  onToggle: (id: string) => void;
}

export function TocItem({ item, active, minDepth, collapsed, onJump, onToggle }: TocItemProps) {
  // 缩进：与 v1 一致 —— 12 基准 + 每级 14px。
  const paddingLeft = 12 + (item.level - minDepth) * 14;

  const className =
    `mdtoc-item level-${item.level}` +
    (active ? ' active' : '') +
    (item.hasChildren ? ' mdtoc-parent' : '') +
    (collapsed ? ' mdtoc-collapsed-node' : '');

  return (
    <a
      className={className}
      style={{ paddingLeft }}
      data-target={item.id}
      title={item.text}
      // aria-current="location"：补 v1 欠的无障碍（260804/00 §2.3），AT 用户可感知当前位置。
      aria-current={active ? 'location' : undefined}
      onClick={(e) => {
        e.preventDefault();
        onJump(item.id);
      }}
    >
      {item.hasChildren ? (
        <span
          className="mdtoc-toggle"
          role="button"
          tabIndex={0}
          aria-expanded={!collapsed}
          aria-label={collapsed ? '展开子级' : '收起子级'}
          // stopPropagation：点 toggle 只折叠，不冒泡到 <a> 的跳转（03 §5.1）。
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggle(item.id);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              onToggle(item.id);
            }
          }}
        >
          {collapsed ? (
            <ChevronRight size={12} aria-hidden />
          ) : (
            <ChevronDown size={12} aria-hidden />
          )}
        </span>
      ) : (
        // 叶子项：同宽占位，保证同级文本左缘对齐（03 §3.2 的 margin 方案改为占位元素，
        // 免去「toggle 宽 + margin 两处魔数对齐」的维护成本）。
        <span className="mdtoc-toggle mdtoc-toggle-spacer" aria-hidden />
      )}
      <span className="mdtoc-text">{item.text}</span>
    </a>
  );
}
