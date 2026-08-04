// preview/components/Header.tsx
// TOC 头部：标题 + 折叠指示箭头。点击整个 header 切换整栏折叠（= v1 header 交互）。
//
// 图标：v1 用 Unicode `▾`；这里换 lucide-react 的 <ChevronDown>。
// 颜色自动跟随主题——lucide 默认 stroke="currentColor"，继承 CSS 里 #mdtoc-header 的 color；
// 折叠态旋转沿用 media/toc.css 的 `.mdtoc-fold-btn { transform: rotate(-90deg) }`（对 svg 同样生效）。

import { ChevronDown } from 'lucide-react';

interface HeaderProps {
  onToggle: () => void;
}

export function Header({ onToggle }: HeaderProps) {
  return (
    <div id="mdtoc-header" onClick={onToggle}>
      <span className="mdtoc-title" id="mdtoc-title-text">目录</span>
      <ChevronDown className="mdtoc-fold-btn" size={16} aria-hidden />
    </div>
  );
}
