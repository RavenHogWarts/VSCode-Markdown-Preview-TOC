// test/search.test.ts
// 页内搜索纯函数 findMatches 的单元测试（preview/lib/search.ts，v2-M4）。
// DOM 采集与 Highlight 封装依赖浏览器环境，不在 node 测试范围内。

import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { findMatches } from '../preview/lib/search';

test('search: 基本命中与区间', () => {
  assert.deepStrictEqual(findMatches('hello world hello', 'hello'), [
    [0, 5],
    [12, 17],
  ]);
});

test('search: 大小写不敏感', () => {
  assert.deepStrictEqual(findMatches('Hello HELLO hello', 'hello'), [
    [0, 5],
    [6, 11],
    [12, 17],
  ]);
});

test('search: 空 query 不命中', () => {
  assert.deepStrictEqual(findMatches('abc', ''), []);
});

test('search: 无命中返回空数组', () => {
  assert.deepStrictEqual(findMatches('abc', 'xyz'), []);
});

test('search: 命中不重叠（对齐浏览器 find）', () => {
  // 'aa' 在 'aaaa' 中命中 [0,2) 与 [2,4)，而不是 [0,2) [1,3) [2,4)
  assert.deepStrictEqual(findMatches('aaaa', 'aa'), [
    [0, 2],
    [2, 4],
  ]);
});

test('search: CJK 与混排', () => {
  assert.deepStrictEqual(findMatches('目录 Test 目录', '目录'), [
    [0, 2],
    [8, 10],
  ]);
});

test('search: query 与整串等长', () => {
  assert.deepStrictEqual(findMatches('abc', 'abc'), [[0, 3]]);
});
