// preview/hooks/useOverrideState.ts
// 双层状态模型（dev/260804/00 §3.2）的 React 落地——v2 所有「工具栏即时切换」状态的核心基建。
//
//   默认层（base）：markdownToc.* 配置经 <meta> 注入（useConfig 读取），改配置触发预览刷新。
//   即时层（override）：工具栏操作，写 localStorage 跨刷新记忆。
//   初值优先级：localStorage > base > （base 自身已含 fallback）。
//
// 与提案（01 §3.2/§3.3）的差异：提案是命令式写法，状态真相源 = body class + localStorage，
// 靠 updateToolbarState() 手动同步按钮态。React 下真相源 = 本 hook 的 state：
//   - body class 是 toc.tsx 里 useLayoutEffect 的派生副作用；
//   - aria-pressed 由 state 派生，随渲染自动正确，无需手动同步。
//
// codec 必须是模块级常量（引用稳定），否则 setter 的 useCallback 会每次渲染失效。

import { useCallback, useState } from 'react';
import { lsGet, lsSet } from '../lib/storage';

export interface OverrideCodec<T> {
  /** localStorage 原始字符串 → 值；非法/过期值返回 null（回退 base）。 */
  parse: (raw: string) => T | null;
  serialize: (value: T) => string;
}

export function useOverrideState<T>(
  key: string,
  base: T,
  codec: OverrideCodec<T>
): [T, (value: T) => void] {
  // 惰性初始化：只在首次挂载读一次 localStorage。
  // 预览刷新（改配置等）会重跑脚本 → 重新挂载 → 重新走这里，即时层天然覆盖新 base。
  const [value, setValue] = useState<T>(() => {
    const raw = lsGet(key);
    if (raw !== null) {
      const parsed = codec.parse(raw);
      if (parsed !== null) return parsed;
    }
    return base;
  });

  const set = useCallback(
    (next: T) => {
      setValue(next);
      lsSet(key, codec.serialize(next));
    },
    [key, codec]
  );

  return [value, set];
}
