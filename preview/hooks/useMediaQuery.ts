// preview/hooks/useMediaQuery.ts
// 用 matchMedia 驱动的响应式 hook（替代 v1 的 applyNarrow + matchMedia 监听）。
// 用 matchMedia 而非 resize 事件，避免高频回调（v1 同款理由）。

import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches); // 订阅时对齐一次，防止挂载间隙状态漂移

    // 兼容老 Webview（Safari 14 前只有 addListener）。
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    }
    const legacy = mql as unknown as {
      addListener: (h: (e: MediaQueryListEvent) => void) => void;
      removeListener: (h: (e: MediaQueryListEvent) => void) => void;
    };
    legacy.addListener(handler);
    return () => legacy.removeListener(handler);
  }, [query]);

  return matches;
}
