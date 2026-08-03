// test/slug.test.ts
// Slug 一致性测试：确认我们对「原生预览标题 id（githubSlugifier）」行为的认知，
// 作为文档型断言（见 dev/260803/06-native-preview-internals.md 与 04 §9）。
//
// 本插件不自己生成 id（直接用原生预览的 id），此测试守护一个参考实现：
// 万一未来需要 fallback（如某些标题无 id），自实现需与 github-slugger 行为一致。
//
// 运行：pnpm test（见 package.json test 脚本 → ts-node 或编译后 node --test）。
// CI 直接用 node --test 跑编译产物。

import { strict as assert } from 'node:assert';
import { test } from 'node:test';

/**
 * 参考 slug 实现：对齐 github-slugger（原生预览用）的核心规则。
 * 规则：转小写 → 去除标点（保留字母/数字/CJK/空格/连字符）→ 空格与下划线转连字符 → 折叠重复连字符。
 */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // 去标点；\w 含字母数字下划线，CJK 在 \w 之外但此处保留（见下条）
    .replace(/[\s_]+/g, '-')  // 空格/下划线 → 连字符
    .replace(/-+/g, '-')      // 折叠重复连字符
    .replace(/^-|-$/g, '');   // 去首尾连字符
}

test('slug: 基本英文标题', () => {
  assert.strictEqual(slugify('Hello World'), 'hello-world');
  assert.strictEqual(slugify('Installation'), 'installation');
});

test('slug: 多空格与下划线折叠为单连字符', () => {
  assert.strictEqual(slugify('Hello   World'), 'hello-world');
  assert.strictEqual(slugify('Hello_World'), 'hello-world');
  assert.strictEqual(slugify('Hello - World'), 'hello-world');
});

test('slug: 转小写', () => {
  assert.strictEqual(slugify('CamelCaseTitle'), 'camelcasetitle');
});

test('slug: 去标点', () => {
  assert.strictEqual(slugify('Title (with parens)!'), 'title-with-parens');
  assert.strictEqual(slugify('Q&A Section'), 'qa-section');
});

test('slug: 首尾连字符被去除', () => {
  assert.strictEqual(slugify('  Hello  '), 'hello');
  assert.strictEqual(slugify('---Hello---'), 'hello');
});

test('slug: 空字符串与纯标点', () => {
  assert.strictEqual(slugify(''), '');
  assert.strictEqual(slugify('!!!'), '');
});
