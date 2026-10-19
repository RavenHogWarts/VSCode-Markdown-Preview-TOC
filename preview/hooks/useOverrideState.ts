// preview/hooks/useOverrideState.ts
// 双层状态模型（dev/260804/00 §3.2）的 React 落地——v2 所有「工具栏即时切换」状态的核心基建。
//
//   默认层（base）：markdownToc.* 配置经 <meta> 注入（useConfig 读取），改配置触发预览刷新。
//   即时层（override）：工具栏操作，写 localStorage 跨刷新记忆。
//   初值优先级：localStorage > base > （base 自身已含 fallback）。
//
// 覆盖值过期（issue #6 后续）：override 里存写入时的 base 快照，读回时快照 ≠ 当前 base
// （用户改了 settings.json 的对应配置）→ 视为写于旧配置之下，作废、采用新 base。
// 没有这层，localStorage 会永久压过配置——sidebarPosition 等改了永远不生效。
// 旧版本存的是裸字符串（无快照包裹），JSON 形状校验不过 → 一次性作废，属预期迁移。
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

/** 存储形状：b = 写入时的 base 快照（serialize 后），v = 覆盖值（serialize 后）。 */
interface StoredOverride {
  b?: unknown;
  v?: unknown;
}

export function useOverrideState<T>(
  key: string,
  base: T,
  codec: OverrideCodec<T>
): [T, (value: T) => void] {
  // 惰性初始化：只在首次挂载读一次 localStorage。
  // 预览刷新（改配置等）会重跑脚本 → 重新挂载 → 重新走这里。
  const [value, setValue] = useState<T>(() => {
    const raw = lsGet(key);
    if (raw !== null) {
      try {
        const stored = JSON.parse(raw) as StoredOverride;
        if (
          stored &&
          typeof stored.b === 'string' &&
          typeof stored.v === 'string' &&
          stored.b === codec.serialize(base) // base 已变 → 覆盖作废，走下方回退
        ) {
          const parsed = codec.parse(stored.v);
          if (parsed !== null) return parsed;
        }
      } catch {
        /* 旧版裸字符串格式或损坏值 → 当作无覆盖 */
      }
    }
    return base;
  });

  const set = useCallback(
    (next: T) => {
      setValue(next);
      lsSet(key, JSON.stringify({ b: codec.serialize(base), v: codec.serialize(next) }));
    },
    [key, codec, base]
  );

  return [value, set];
}
