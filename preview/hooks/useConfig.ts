// preview/hooks/useConfig.ts
// 读取宿主注入的配置（一次性，引用稳定）。
//
// 为什么 useMemo 空依赖：配置在渲染期由 extendMarkdownIt 注入 <meta>，一个预览会话内不变；
// 改配置会触发 markdown.preview.refresh（宿主 onDidChangeConfiguration），走的是整页重渲染 +
// 脚本重跑（bootstrap 重新执行），而非本 hook 内部更新。稳定引用让下游 useToc 的 effect 不误重建。

import { useMemo } from 'react';
import type { MdtocConfig } from '../types';
import { readConfig } from '../lib/config';

export function useConfig(): MdtocConfig {
  return useMemo(() => readConfig(), []);
}
