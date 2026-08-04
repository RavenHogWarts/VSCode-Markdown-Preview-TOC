// preview/lib/config.ts
// 从 <meta id="mdtoc-config" data-config="..."> 读取宿主注入的配置。
// 逻辑与 v1 readConfig() 一致，仅抽成独立模块供 useConfig 复用。

import type { MdtocConfig } from '../types';

export const FALLBACK_CONFIG: MdtocConfig = {
  enabled: true,
  width: 260,
  position: 'left',
  defaultCollapsed: false,
  minDepth: 2,
  maxDepth: 6,
  highlightOnScroll: true,
  autoExpandDepth: 3,
};

export function readConfig(): MdtocConfig {
  const raw = document.getElementById('mdtoc-config')?.getAttribute('data-config');
  if (!raw) return FALLBACK_CONFIG;
  try {
    return { ...FALLBACK_CONFIG, ...JSON.parse(raw) };
  } catch {
    return FALLBACK_CONFIG;
  }
}
