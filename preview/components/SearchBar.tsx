// preview/components/SearchBar.tsx
// 页内搜索栏：关键词输入 + 命中计数 + 上一个/下一个/关闭。
//
// 挂载：经 createPortal 渲染进 body 下的 #mdtoc-searchbar 容器（见 toc.tsx），
//   定位/层级样式全在 toc.css 的 #mdtoc-searchbar 规则上，与 Fab 同一模式。
// 交互对齐浏览器 find：输入即搜、Enter 下一个、Shift+Enter 上一个、Esc 关闭、翻页环形。
// 无障碍：role="search" 包组，输入框 aria-label，按钮原生 <button>。

import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface SearchBarProps {
  query: string;
  matchCount: number;
  /** 0 起始；-1 表示无命中。 */
  activeIndex: number;
  onQuery: (q: string) => void;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

const ICON_SIZE = 14;

export function SearchBar({
  query,
  matchCount,
  activeIndex,
  onQuery,
  onNext,
  onPrev,
  onClose,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // 仅在打开时挂载（toc.tsx 按 open 条件渲染），挂载即聚焦并全选上次关键词——
  // 对齐浏览器 find「重开选中旧词、直接输入即替换」的习惯。
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const noResult = query.length > 0 && matchCount === 0;

  return (
    <div className="mdtoc-searchbar-inner" role="search" aria-label="页内搜索">
      <input
        ref={inputRef}
        type="text"
        className={`mdtoc-searchbar-input${noResult ? ' mdtoc-searchbar-noresult' : ''}`}
        placeholder="在页面中查找"
        aria-label="在页面中查找"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) onPrev();
            else onNext();
          }
          // Esc 由 useSearch 的全局监听处理（输入框外聚焦也能关）。
        }}
      />
      <span className="mdtoc-searchbar-count" aria-live="polite">
        {query ? (noResult ? '无结果' : `${activeIndex + 1}/${matchCount}`) : ''}
      </span>
      {/* mousedown 拦默认行为：点按钮不抢输入框焦点，可连续翻页 */}
      <button
        type="button"
        className="mdtoc-tbtn"
        title="上一个（Shift+Enter）"
        aria-label="上一个匹配"
        disabled={matchCount === 0}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onPrev}
      >
        <ChevronUp size={ICON_SIZE} aria-hidden />
      </button>
      <button
        type="button"
        className="mdtoc-tbtn"
        title="下一个（Enter）"
        aria-label="下一个匹配"
        disabled={matchCount === 0}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onNext}
      >
        <ChevronDown size={ICON_SIZE} aria-hidden />
      </button>
      <button
        type="button"
        className="mdtoc-tbtn"
        title="关闭（Esc）"
        aria-label="关闭搜索"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClose}
      >
        <X size={ICON_SIZE} aria-hidden />
      </button>
    </div>
  );
}
