// preview/components/TocItem.tsx
// TOC 单项。className / data-target / 缩进与 v1 完全对齐，故 media/toc.css 无需改动。
//
// 附带收益：{item.text} 由 React 自动转义，v1 的 escapeHtml/escapeAttr 在此退休（XSS 面收窄）。

import type { TocItem as TocItemModel } from '../types';

interface TocItemProps {
  item: TocItemModel;
  active: boolean;
  minDepth: number;
  onJump: (id: string) => void;
}

export function TocItem({ item, active, minDepth, onJump }: TocItemProps) {
  // 缩进：与 v1 一致 —— 12 基准 + 每级 14px。
  const paddingLeft = 12 + (item.level - minDepth) * 14;

  return (
    <a
      className={`mdtoc-item level-${item.level}${active ? ' active' : ''}`}
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
      <span className="mdtoc-text">{item.text}</span>
    </a>
  );
}
