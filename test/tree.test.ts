// test/tree.test.ts
// 子树折叠纯函数（preview/lib/tree.ts）的单元测试：markTree / initialCollapsedNodes /
// deriveHidden / ancestorIds / allParentIds。覆盖 dev/260804/03 的关键语义：
//   - 父子推导（含跨级 h2→h4）
//   - autoExpandDepth 相对深度（含 0 全收起 / 6 全展开 / 首项非顶层）
//   - 折叠显隐的「停止条件」与嵌套折叠
//   - active 祖先链（自动展开用）
//
// 运行：pnpm test（esbuild 编译后 node --test）。

import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { TocItem } from '../preview/types';
import {
  allParentIds,
  ancestorIds,
  deriveHidden,
  initialCollapsedNodes,
  markTree,
} from '../preview/lib/tree';

/** 快速构造：['概述:2','安装:3',...] → TocItem[]（已跑 markTree）。 */
function build(specs: string[]): TocItem[] {
  const items: TocItem[] = specs.map((s) => {
    const [id, level] = s.split(':');
    return { id, text: id, level: Number(level), hasChildren: false };
  });
  markTree(items);
  return items;
}

// 提案 03 §2.1 的示例结构
const SAMPLE = ['概述:2', '安装:3', '命令:3', '使用:2', '高级:4', 'FAQ:2'];

test('markTree: 基本父子 + 跨级（h2→h4）', () => {
  const items = build(SAMPLE);
  assert.deepEqual(
    items.map((it) => it.hasChildren),
    [true, false, false, true, false, false] // 概述、使用是父；「使用→高级」跨级成立
  );
});

test('markTree: 无子项 / 空列表', () => {
  assert.deepEqual(build(['a:2', 'b:2']).map((it) => it.hasChildren), [false, false]);
  assert.deepEqual(build([]), []);
});

test('allParentIds: 只含可折叠父项', () => {
  assert.deepEqual([...allParentIds(build(SAMPLE))], ['概述', '使用']);
});

test('initialCollapsedNodes: autoExpandDepth 语义（03 §4.1 表）', () => {
  const items = build(SAMPLE);
  // 0 = 只显示顶层：所有父项折叠
  assert.deepEqual([...initialCollapsedNodes(items, 0)], ['概述', '使用']);
  // 1 = 顶层展开（顶层+直接子层可见）：相对深度 1 的父项不折叠
  assert.deepEqual([...initialCollapsedNodes(items, 1)], []);
  // 6 = 全展开
  assert.deepEqual([...initialCollapsedNodes(items, 6)], []);
});

test('initialCollapsedNodes: 深层父项按相对深度折叠', () => {
  // a(1) > b(2) > c(3) > d(4)：b 相对深度 2、c 相对深度 3
  const items = build(['a:1', 'b:2', 'c:3', 'd:4']);
  assert.deepEqual([...initialCollapsedNodes(items, 1)], ['b', 'c']); // 深度>1 的父项折叠
  assert.deepEqual([...initialCollapsedNodes(items, 2)], ['c']);
  assert.deepEqual([...initialCollapsedNodes(items, 3)], []);
});

test('initialCollapsedNodes: 首项非顶层时用全体最小 level 作基准', () => {
  // h3 先于 h2 出现：基准应是 2（min），而非首项的 3
  const items = build(['早出现:3', '顶层:2', '子:3', '孙:4']);
  // 顶层(2)=深度1、子(3)=深度2；depth=1 → 折叠深度>1 的父项（子）
  assert.deepEqual([...initialCollapsedNodes(items, 1)], ['子']);
});

test('deriveHidden: 折叠隐藏到下一个同级为止（03 §2.2）', () => {
  const items = build(SAMPLE);
  assert.deepEqual(
    deriveHidden(items, new Set(['概述'])),
    [false, true, true, false, false, false] // 安装/命令隐藏，「使用」(同级)停止
  );
});

test('deriveHidden: 跨级子项整段隐藏', () => {
  const items = build(SAMPLE);
  assert.deepEqual(
    deriveHidden(items, new Set(['使用'])),
    [false, false, false, false, true, false] // 高级(4)隐藏，FAQ(2)停止
  );
});

test('deriveHidden: 嵌套折叠（外层优先，内层折叠态不干扰）', () => {
  const items = build(['a:2', 'b:3', 'c:4', 'd:2']);
  // 只折叠内层 b：c 隐藏
  assert.deepEqual(deriveHidden(items, new Set(['b'])), [false, false, true, false]);
  // 内外都折叠：b、c 都隐藏（b 自身被 a 隐藏，其折叠态不产生额外影响）
  assert.deepEqual(deriveHidden(items, new Set(['a', 'b'])), [false, true, true, false]);
});

test('deriveHidden: 失效 id 无影响（rebuild 后自然失效，03 §5.3）', () => {
  const items = build(SAMPLE);
  assert.deepEqual(
    deriveHidden(items, new Set(['已删除的标题'])),
    [false, false, false, false, false, false]
  );
});

test('ancestorIds: 由近及远的祖先链（含跨级）', () => {
  const items = build(['a:1', 'b:2', 'c:4', 'd:5', 'e:2']);
  assert.deepEqual(ancestorIds(items, 'd'), ['c', 'b', 'a']); // 5→4→2→1
  assert.deepEqual(ancestorIds(items, 'e'), ['a']);
  assert.deepEqual(ancestorIds(items, 'a'), []);
  assert.deepEqual(ancestorIds(items, '不存在'), []);
});
