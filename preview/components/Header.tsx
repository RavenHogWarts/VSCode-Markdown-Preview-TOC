// preview/components/Header.tsx
// TOC 头部：可点击标题（整栏折叠）+ 工具栏（经 children 传入，Header 不关心按钮细节）。
//
// v2 改造（dev/260804/01 §7）：折叠监听从整个 header 收窄到 .mdtoc-title——
// header 里现在有工具栏按钮，点按钮不应误触发整栏折叠；「点标题折叠」保留 v1 肌肉记忆。
// 标题加 role="button" + tabIndex + Enter/Space，键盘可达（提案 §6）。
// v1 的 ChevronDown 折叠指示箭头移除：折叠态改由工具栏按钮的 aria-pressed + FAB 表达。

import type { ReactNode } from 'react';

interface HeaderProps {
  onToggle: () => void;
  children?: ReactNode;
}

export function Header({ onToggle, children }: HeaderProps) {
  return (
    <div id="mdtoc-header">
      <span
        className="mdtoc-title"
        id="mdtoc-title-text"
        role="button"
        tabIndex={0}
        title="折叠目录"
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        目录
      </span>
      {children}
    </div>
  );
}
