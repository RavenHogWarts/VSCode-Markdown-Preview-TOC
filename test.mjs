// test.mjs —— 测试入口：自动发现 test/*.test.ts，esbuild 编译到 out/ 后交给 node --test。
// 为什么不用 package.json 里枚举文件：每加一个测试就要改一次 test 脚本，易漏；
// 这里 readdir 自动发现，新增测试文件零配置（与 esbuild.mjs 同级、同风格）。
import { readdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import * as esbuild from 'esbuild';

const entryPoints = readdirSync('test')
  .filter((f) => f.endsWith('.test.ts'))
  .map((f) => `test/${f}`);

if (entryPoints.length === 0) {
  console.error('[test] 未发现 test/*.test.ts');
  process.exit(1);
}

// out/ 仅存测试产物（构建产物在 dist/ 与 media/）：先清空，
// 避免已删除/改名测试的陈旧 .test.js 被 node --test 目录发现捡到。
rmSync('out', { recursive: true, force: true });

await esbuild.build({
  entryPoints,
  bundle: true,
  outdir: 'out',
  format: 'cjs',
  platform: 'node',
});

// node --test 对目录自动发现 *.test.js（Node 18+ 内置 test runner）。
const { status } = spawnSync(process.execPath, ['--test', 'out'], { stdio: 'inherit' });
process.exit(status ?? 1);
