// preview/lib/tree.ts
// 子树折叠的纯函数集（dev/260804/03）。不碰 DOM、不依赖 React——
// 显隐/初始折叠全部在 render 期由这些函数推导（提案的 applyNodeCollapse 命令式
// DOM 遍历在 React 下退休，见 dev/260804/06 §2），并可直接单测（test/tree.test.ts）。
//
// TOC 保持扁平数组（不建嵌套树）：一个项是「父」当且仅当其后紧邻存在 level 更大的项；
// 折叠父项 P = 隐藏 P 之后、直到下一个 level ≤ P.level 的项之前的所有项（提案 §2.2）。

import type { TocItem } from '../types';

/**
 * 标记每项的 hasChildren（O(n) 单遍栈，提案 §2.1）。原地修改 items。
 * 跨级父子（h2 直接跟 h4）天然成立：level 递增即为父子。
 */
export function markTree(items: TocItem[]): void {
  const stack: number[] = []; // 待闭合祖先的 index
  for (let i = 0; i < items.length; i++) {
    while (stack.length && items[stack[stack.length - 1]].level >= items[i].level) {
      stack.pop();
    }
    if (stack.length) {
      items[stack[stack.length - 1]].hasChildren = true;
    }
    stack.push(i);
  }
}

/** 所有可折叠父项的 id 集合（工具栏「全部收起」的目标域）。 */
export function allParentIds(items: TocItem[]): Set<string> {
  const ids = new Set<string>();
  for (const it of items) {
    if (it.hasChildren) ids.add(it.id);
  }
  return ids;
}

/**
 * 按 autoExpandDepth 推导初始折叠集（提案 §4.2）。
 * 语义（提案 §4.1 表）：N = 展开到第 N 层 → 相对深度 > N 的父项折叠。
 *   N=0 全部父项折叠（只见顶层）；N=1 顶层展开（顶层+直接子层可见）；N=6 全展开。
 * 相对深度 = level - min(level) + 1。
 *
 * 与提案 §4.2 示例代码的两处修正（回填见 03 §8）：
 *   1. 示例的 `relDepth >= autoExpandDepth` 与其自身注释/语义表差一层，按注释
 *      「第 N+1 层及更深的父项都折叠」实现为 `> autoExpandDepth`（N=0 分支随之合并）。
 *   2. 基准层用全体最小 level 而非 items[0].level——首项比后文更深（h3 先于 h2 出现）时
 *      items[0] 不是顶层，会算错相对深度。
 */
export function initialCollapsedNodes(items: TocItem[], autoExpandDepth: number): Set<string> {
  const collapsed = new Set<string>();
  if (items.length === 0) return collapsed;
  let min = items[0].level;
  for (const it of items) {
    if (it.level < min) min = it.level;
  }
  for (const it of items) {
    if (it.hasChildren && it.level - min + 1 > autoExpandDepth) collapsed.add(it.id);
  }
  return collapsed;
}

/**
 * 某项的全部祖先父项 id（由近及远）。用于「active 在折叠子树内 → 自动展开祖先」（提案 §6.1）。
 * 向前扫：每遇到一个 level 更小的项即为下一层祖先，并收紧门槛。
 */
export function ancestorIds(items: TocItem[], id: string): string[] {
  const idx = items.findIndex((it) => it.id === id);
  if (idx < 0) return [];
  const out: string[] = [];
  let level = items[idx].level;
  for (let i = idx - 1; i >= 0 && level > 1; i--) {
    if (items[i].level < level) {
      out.push(items[i].id);
      level = items[i].level;
    }
  }
  return out;
}

/**
 * 推导每项是否被折叠隐藏（O(n) 单遍，提案 §3.3 的纯函数版）。
 * hideUntil = 正在生效的折叠父项 level：其后 level 更大的项全部隐藏，
 * 遇到 level ≤ hideUntil 的项退出隐藏区（该项可能自己又是折叠父项，继续接力）。
 */
export function deriveHidden(items: TocItem[], collapsedIds: ReadonlySet<string>): boolean[] {
  const hidden = new Array<boolean>(items.length).fill(false);
  let hideUntil: number | null = null;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (hideUntil !== null && it.level > hideUntil) {
      hidden[i] = true;
      continue;
    }
    hideUntil = it.hasChildren && collapsedIds.has(it.id) ? it.level : null;
  }
  return hidden;
}
