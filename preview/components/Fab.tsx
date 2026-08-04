// preview/components/Fab.tsx
// 折叠态浮动展开按钮（Floating Action Button）。
// sidebar 折叠滑走后点不到，FAB 提供展开入口（= v1 #mdtoc-fab）。
//
// 挂载：本组件经 createPortal 渲染进 body 下的 #mdtoc-fab 容器（见 toc.tsx），
// 所以这里渲染的是 fab 的**内容**（撑满容器的可点击层 + 图标），而非 #mdtoc-fab 本身。
// 图标：v1 用 Unicode `☰`；换 lucide-react 的 <Menu>。

import { Menu } from 'lucide-react';

interface FabProps {
  onExpand: () => void;
}

export function Fab({ onExpand }: FabProps) {
  return (
    <span
      className="mdtoc-fab-inner"
      role="button"
      tabIndex={0}
      title="展开目录"
      aria-label="展开目录"
      onClick={onExpand}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onExpand();
        }
      }}
    >
      <Menu size={16} aria-hidden />
    </span>
  );
}
