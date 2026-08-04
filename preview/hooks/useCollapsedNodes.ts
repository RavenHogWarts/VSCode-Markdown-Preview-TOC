// preview/hooks/useCollapsedNodes.ts
// 子树折叠状态（dev/260804/03）+ autoExpandDepth 激活（v1 死配置的偿还，00 §2.3）。
//
// 状态模型（三态 mode，而非直接存 Set）：
//   'auto'        —— 用户从未手动操作过：折叠集每次 render 由 autoExpandDepth + 当前 items
//                    派生（标题增删后新父项也按配置折叠/展开，语义最正）。无 localStorage 键。
//   'all'         —— 工具栏「全部收起」的哨兵（M1 已约定 '__all__'）：全部父项折叠，
//                    保持为模式而非快照 Set，编辑新增的父项也自动收起。
//   Set<string>   —— 显式折叠集（用户手动 toggle 过）。localStorage 存 JSON 数组。
//
// 双层语义（03 §4.3）：localStorage 有值 → 用它；否则 'auto'（首次按配置）。
// rebuild 后状态保持（03 §5.3 难题）：状态在 React state 不在 DOM，天然保持；
// 失效 id 留在 Set 里对显隐推导无影响（deriveHidden 按当前 items 单遍推导），自然失效。
//
// ── 手风琴跟随（03 §6.1 的增强版）──
// active 的祖先链作为「会话 overlay」从基础折叠集中减除：
//   - 全部折叠时滚动正文，只有当前在读的子树展开，其余保持折叠；
//   - activeId 变化时 overlay 整体重算 → 旧链自动回收（重新折叠），不累积；
//   - overlay 不持久化：滚动导致的展开是浏览行为，不是用户的折叠意愿；
//   - 用户手动收起链上某项 → 该 id 移出 overlay（手动意愿赢），到下次 active 变化为止。

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TocItem } from '../types';
import { lsGet, lsSet } from '../lib/storage';
import { allParentIds, ancestorIds, initialCollapsedNodes } from '../lib/tree';

const LS_KEY = 'collapsedNodes';
const ALL_SENTINEL = '__all__';

type CollapsedMode = 'auto' | 'all' | ReadonlySet<string>;

export interface UseCollapsedNodesResult {
  /** 当前生效的折叠父项 id 集（= 基础集 − active 祖先 overlay，供 deriveHidden / toggle 图标用）。 */
  collapsedIds: ReadonlySet<string>;
  /** 仍处于「从未手动操作」态（autoExpandDepth=0 的空态提示条件，03 §6.3）。 */
  isAuto: boolean;
  /** 折叠/展开单个子树（持久化，操作基础集）。 */
  toggleNode: (id: string) => void;
  /** 工具栏「全部展开(false)/收起(true)」（持久化，接管 M1 的哨兵 no-op）。 */
  setAllNodes: (collapse: boolean) => void;
}

export function useCollapsedNodes(
  items: TocItem[],
  autoExpandDepth: number,
  activeId: string | null
): UseCollapsedNodesResult {
  const [mode, setMode] = useState<CollapsedMode>(() => {
    const raw = lsGet(LS_KEY);
    if (raw === null) return 'auto';
    if (raw === ALL_SENTINEL) return 'all';
    try {
      const arr: unknown = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return new Set(arr.filter((x): x is string => typeof x === 'string'));
      }
    } catch {
      /* 损坏的存储值 → 当作没操作过 */
    }
    return 'auto';
  });

  // 基础折叠集 = 用户/配置的折叠意愿（持久层）。
  // items 引用仅在标题签名变化时更新（useToc 签名短路），memo 不会空转。
  const baseCollapsedIds = useMemo<ReadonlySet<string>>(() => {
    if (mode === 'auto') return initialCollapsedNodes(items, autoExpandDepth);
    if (mode === 'all') return allParentIds(items);
    return mode;
  }, [mode, items, autoExpandDepth]);

  // 手风琴 overlay：仅在 activeId（或标题结构）变化时整体重算——
  // 不能做成对 collapsedIds 的 render 期纯减除，否则用户手动收起含 active 的
  // 子树会被立刻弹开（toggle 视觉上失效）。事件驱动 + 可被 toggleNode 减项，
  // 让「滚动跟随」与「手动折叠」互不打架：手动赢到下一次 active 变化。
  const [overlay, setOverlay] = useState<ReadonlySet<string>>(() => new Set());
  useEffect(() => {
    setOverlay(new Set(activeId ? ancestorIds(items, activeId) : []));
  }, [activeId, items]);

  // 生效折叠集 = 基础集 − overlay。
  const collapsedIds = useMemo<ReadonlySet<string>>(() => {
    if (overlay.size === 0) return baseCollapsedIds;
    const s = new Set(baseCollapsedIds);
    for (const id of overlay) s.delete(id);
    return s;
  }, [baseCollapsedIds, overlay]);

  const toggleNode = useCallback(
    (id: string) => {
      // 以「生效状态」判断方向，但修改落在「基础集」上（'auto'/'all' 在首次手动操作
      // 时物化为显式 Set——「配置 = 初始默认，操作 = 个人记忆」的切换点，03 §4.3）。
      const isCollapsed = collapsedIds.has(id);
      const next = new Set(baseCollapsedIds);
      if (isCollapsed) next.delete(id);
      else next.add(id);
      setMode(next);
      lsSet(LS_KEY, JSON.stringify([...next]));
      // 手动收起 overlay 链上的项：从 overlay 移除，否则减除会立刻抵消本次折叠。
      if (!isCollapsed && overlay.has(id)) {
        const o = new Set(overlay);
        o.delete(id);
        setOverlay(o);
      }
    },
    [collapsedIds, baseCollapsedIds, overlay]
  );

  const setAllNodes = useCallback((collapse: boolean) => {
    setMode(collapse ? 'all' : new Set());
    lsSet(LS_KEY, collapse ? ALL_SENTINEL : '[]');
    // 「全部收起」连 active 链一起收（所见即所点）；下次 activeId 变化手风琴自动恢复。
    if (collapse) setOverlay(new Set());
  }, []);

  return { collapsedIds, isAuto: mode === 'auto', toggleNode, setAllNodes };
}
