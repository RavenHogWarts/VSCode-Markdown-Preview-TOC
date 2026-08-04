// preview/components/TocList.tsx
// TOC 列表容器（<nav id="mdtoc-list">）。
//   - enabled=false：渲染空 nav（= v1 `if(!cfg.enabled) return`，骨架在、列表不填充）。
//   - 无标题：空状态提示（= v1 nav.mdtoc-empty「暂无可跳转的标题」）。
//   - active 变化：把 active 项滚进 TOC 视区（= v1 setActive 的 scroll=true 分支）。
//
// v2-M2：折叠显隐在 render 期由 deriveHidden 纯函数推导，被隐藏项直接不渲染
// （React 下无需提案 03 §3.3 的 .mdtoc-hidden class + 命令式遍历；不渲染 = 同时
// 从视觉与无障碍树移除，语义一致且零 CSS）。折叠全收起且从未手动操作时，
// 列表尾部给「逐级展开」提示（03 §6.3）。

import { useEffect, useMemo, useRef } from 'react';
import type { StyleName, TocItem as TocItemModel } from '../types';
import { cssEscape } from '../lib/dom';
import { ancestorIds, deriveHidden } from '../lib/tree';
import { TocItem } from './TocItem';
import { StarlightRail } from './StarlightRail';

interface TocListProps {
  items: TocItemModel[];
  activeId: string | null;
  /** 当前在视口内的标题 id 集合（Starlight 等变体用）。 */
  visibleIds?: ReadonlySet<string>;
  /** 当前风格：starlight 时额外渲染蛇形轨道线 SVG（StarlightRail）。 */
  styleName: StyleName;
  minDepth: number;
  enabled: boolean;
  collapsedIds: ReadonlySet<string>;
  /** autoExpandDepth=0 且用户未操作过时，在列表尾部提示如何展开（03 §6.3）。 */
  showCollapseHint: boolean;
  onJump: (id: string) => void;
  onToggleNode: (id: string) => void;
}

export function TocList({
  items,
  activeId,
  visibleIds,
  styleName,
  minDepth,
  enabled,
  collapsedIds,
  showCollapseHint,
  onJump,
  onToggleNode,
}: TocListProps) {
  const navRef = useRef<HTMLElement>(null);

  // active 项滚进 TOC 视区（block:'nearest'，不打扰正文滚动）。
  // 注意：这是 TOC 列表自身的滚动，不应解除 useToc 里的跳转挂起——useToc 的 scrollend 只监听
  // window/visualViewport，不监听本 nav，故此处滚动不会误触发恢复。
  // 依赖含 collapsedIds：active 项可能因祖先展开（expandAncestorsOf）从「未渲染」变为可见，
  // 首个 activeId 通知到达时元素还不在 DOM，需在折叠集变化后重试。
  useEffect(() => {
    if (!activeId || !navRef.current) return;
    const el = navRef.current.querySelector<HTMLElement>(
      `.mdtoc-item[data-target="${cssEscape(activeId)}"]`
    );
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeId, collapsedIds]);

  // active 项的祖先链：用于弱化高亮当前阅读路径（设计文档 §6.4）。
  // 注意：Hooks 必须放在所有早期 return 之前，以保证每次渲染调用顺序一致。
  const ancestorSet = useMemo(
    () => new Set(activeId ? ancestorIds(items, activeId) : []),
    [activeId, items]
  );

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

  const hidden = deriveHidden(items, collapsedIds);
  const hiddenCount = hidden.reduce((n, h) => n + (h ? 1 : 0), 0);

  return (
    <nav id="mdtoc-list" ref={navRef} aria-labelledby="mdtoc-title-text">
      {styleName === 'starlight' && (
        <StarlightRail
          navRef={navRef}
          items={items}
          collapsedIds={collapsedIds}
          visibleIds={visibleIds ?? new Set()}
          activeId={activeId}
        />
      )}
      {items.map((it, i) =>
        hidden[i] ? null : (
          <TocItem
            key={it.id}
            item={it}
            active={it.id === activeId}
            ancestor={ancestorSet.has(it.id)}
            inView={visibleIds ? visibleIds.has(it.id) : it.id === activeId}
            minDepth={minDepth}
            collapsed={it.hasChildren && collapsedIds.has(it.id)}
            onJump={onJump}
            onToggle={onToggleNode}
          />
        )
      )}
      {showCollapseHint && hiddenCount > 0 && (
        <div className="mdtoc-hint">
          共 {items.length} 个标题，点 ▸ 逐级展开
        </div>
      )}
    </nav>
  );
}
