// preview/lib/storage.ts
// localStorage 安全封装（双层状态模型的「即时层」存储，见 dev/260804/00 §3.2）。
//
// 为什么包 try/catch：预览 webview 的 localStorage 在受限场景（隐私模式、storage quota、
// 沙箱策略变化）会抛 SecurityError；读不到就降级回 base 配置、写不进就仅会话内生效，
// 都不报错（dev/260804/00 §8 风险 1）。
// 键一律加 `mdtoc:` 前缀，避免与 VSCode 预览页其他脚本撞键（v1 惯例）。

const PREFIX = 'mdtoc:';

export function lsGet(key: string): string | null {
  try {
    return localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

export function lsSet(key: string, value: string): void {
  try {
    localStorage.setItem(PREFIX + key, value);
  } catch {
    /* 受限环境降级：本次会话内 state 仍生效，只是不跨刷新记忆 */
  }
}
