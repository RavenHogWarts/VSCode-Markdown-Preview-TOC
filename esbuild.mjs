// esbuild.mjs
// 构建两个 bundle：
//   1. 扩展宿主：src/extension.ts -> dist/extension.js (cjs/node, external: vscode)
//   2. 预览脚本：preview/toc.ts  -> media/toc.js       (iife/browser)
//
// 详见 dev/260803/07-project-structure-and-build.md §4。
import * as esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');
const minify = !isWatch && process.env.NODE_ENV === 'production';

const targets = [
  {
    entryPoints: ['src/extension.ts'],
    outfile: 'dist/extension.js',
    bundle: true,
    format: 'cjs',
    platform: 'node',
    target: 'node18',
    external: ['vscode'],
    sourcemap: true,
    minify,
  },
  {
    entryPoints: ['preview/toc.tsx'],
    outfile: 'media/toc.js',
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['es2022'],
    jsx: 'automatic', // React 17+ 自动运行时：JSX 免手动 import React
    // React 源码含 `process.env.NODE_ENV` 分支；浏览器无 process，构建期必须替换，
    // 否则运行时 ReferenceError: process is not defined。
    // 生产走 'production'（精简 + 去 dev 警告，体积更小）；开发保留警告便于 DevTools 调试。
    define: { 'process.env.NODE_ENV': JSON.stringify(minify ? 'production' : 'development') },
    sourcemap: !minify, // 开发期开 sourcemap，方便 DevTools 对应 tsx 源码
    minify,
  },
];

if (isWatch) {
  await Promise.all(targets.map((t) => esbuild.context(t).then((c) => c.watch())));
  console.log('[esbuild] watching...');
} else {
  await Promise.all(targets.map((t) => esbuild.build(t)));
  console.log('[esbuild] build done');
}
