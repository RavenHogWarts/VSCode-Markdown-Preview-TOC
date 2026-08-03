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
    entryPoints: ['preview/toc.ts'],
    outfile: 'media/toc.js',
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['es2022'],
    sourcemap: !minify, // 开发期开 sourcemap，方便 DevTools 对应 toc.ts
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
