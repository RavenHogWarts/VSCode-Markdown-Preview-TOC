// preview/components/TocList.tsx
// TOC 列表容器（<nav id="mdtoc-list">）。
//   - enabled=false：渲染空 nav（= v1 `if(!cfg.enabled) return`，骨架在、列表不填充）。
//   - 无标题：空状态提示（= v1 nav.mdtoc-empty「暂无可跳转的标题」）。
//   - active 变化：把 active 项滚进 TOC 视区（= v1 setActive 的 scroll=true 分支）。

import { useEffect, useRef } from 'react';
import type { TocItem as TocItemModel } from '../types';
import { cssEscape } from '../lib/dom';
import { TocItem } from './TocItem';

interface TocListProps {
  items: TocItemModel[];
  activeId: string | null;
  minDepth: number;
  enabled: boolean;
  onJump: (id: string) => void;
}

export function TocList({ items, activeId, minDepth, enabled, onJump }: TocListProps) {
  const navRef = useRef<HTMLElement>(null);

  // active 项滚进 TOC 视区（block:'nearest'，不打扰正文滚动）。
  // 注意：这是 TOC 列表自身的滚动，不应解除 useToc 里的跳转挂起——useToc 的 scrollend 只监听
  // window/visualViewport，不监听本 nav，故此处滚动不会误触发恢复。
  useEffect(() => {
    if (!activeId || !navRef.current) return;
    const el = navRef.current.querySelector<HTMLElement>(
      `.mdtoc-item[data-target="${cssEscape(activeId)}"]`
    );
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeId]);

  if (!enabled) {
    return <nav id="mdtoc-list" ref={navRef} />;
  }

  if (items.length === 0) {
    return (
      <nav id="mdtoc-list" ref={navRef} className="mdtoc-empty" aria-labelledby="mdtoc-title-text">
        暂无可跳转的标题
      </nav>
    );
  }

  return (
    <nav id="mdtoc-list" ref={navRef} aria-labelledby="mdtoc-title-text">
      {items.map((it) => (
        <TocItem
          key={it.id}
          item={it}
          active={it.id === activeId}
          minDepth={minDepth}
          onJump={onJump}
        />
      ))}
    </nav>
  );
}
