// preview/components/StarlightRail.tsx
// starlight 风格的「蛇形轨道线」：一条 SVG 路径沿各项缩进走位（层级变化处圆角拐弯），
// 正文视口内（visibleIds）对应的段落整段点亮，高亮段末端画圆点（仿 Fumadocs/Starlight TOC）。
//
// 为什么用 SVG 而非 per-item CSS 竖线：拐弯必须知道相邻两项的缩进差，CSS 伪元素
// 无法跨项连续作画；Fumadocs 同样是测量后生成 path。
//
// 测量时机：useLayoutEffect（paint 前），依赖 items/collapsedIds/visibleIds 变化重算；
// 另挂 ResizeObserver 兜底字体加载/宽度变化引起的行高变动。
// 坐标系：相对 #mdtoc-list（nav 需 position:relative，见 toc.css §3）。

import { useLayoutEffect, useState, type RefObject } from 'react';
import type { TocItem } from '../types';

interface StarlightRailProps {
  navRef: RefObject<HTMLElement | null>;
  items: TocItem[];
  collapsedIds: ReadonlySet<string>;
  visibleIds: ReadonlySet<string>;
  activeId: string | null;
}

/** 单个条目的轨道段：x 为竖线横坐标，top/bottom 为条目上下缘（nav 坐标系）。 */
interface Seg {
  x: number;
  top: number;
  bottom: number;
  inView: boolean;
}

/** 圆角拐弯半径。行高约 26px，半径过大相邻拐弯会打架。 */
const CORNER_R = 6;

/** 由连续段生成蛇形 path：同缩进直落，缩进变化处在段边界做「竖-横-竖」圆角肘弯。 */
function buildPath(segs: Seg[]): string {
  if (segs.length === 0) return '';
  let d = `M ${segs[0].x} ${segs[0].top}`;
  for (let i = 0; i < segs.length; i++) {
    const cur = segs[i];
    const next = segs[i + 1];
    if (!next || next.x === cur.x) {
      d += ` V ${cur.bottom}`;
      continue;
    }
    // 拐弯：在两项边界 y 处从 cur.x 肘到 next.x（Q 二次贝塞尔做圆角）。
    const y = cur.bottom;
    const dir = next.x > cur.x ? 1 : -1;
    d += ` V ${y - CORNER_R}`;
    d += ` Q ${cur.x} ${y} ${cur.x + dir * CORNER_R} ${y}`;
    d += ` H ${next.x - dir * CORNER_R}`;
    d += ` Q ${next.x} ${y} ${next.x} ${y + CORNER_R}`;
  }
  return d;
}

export function StarlightRail({ navRef, items, collapsedIds, visibleIds, activeId }: StarlightRailProps) {
  const [geom, setGeom] = useState<{ track: string; active: string; dot: { x: number; y: number } | null; height: number } | null>(null);
  // ResizeObserver 触发的重测信号（行高/宽度变化时几何过期）。
  const [resizeTick, setResizeTick] = useState(0);

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const els = Array.from(nav.querySelectorAll<HTMLElement>('.mdtoc-item'));
    if (els.length === 0) {
      setGeom(null);
      return;
    }

    let activeIdx = -1;
    const segs: Seg[] = els.map((el, i) => {
      // 竖线画在缩进档左侧（item 的 inline paddingLeft = 12 + rel*16，见 TocItem）。
      const pad = parseInt(el.style.paddingLeft, 10) || 12;
      if (el.dataset.target === activeId) activeIdx = i;
      return {
        x: pad - 5,
        top: el.offsetTop,
        bottom: el.offsetTop + el.offsetHeight,
        inView: visibleIds.has(el.dataset.target ?? ''),
      };
    });

    // 高亮段：取「包含 active 项的那一段连续 in-view 区间」——只按首末 in-view 项取切片
    // 会把中间不可见的项也连进来（折叠/过滤可能造成集合不连续），视觉上一大条失真。
    // active 不在任何 in-view 段时（如刚点击跳转的过渡帧），退化为首个 in-view 段。
    let first = -1;
    let last = -1;
    for (let i = 0; i < segs.length; i++) {
      if (!segs[i].inView) continue;
      let j = i;
      while (j + 1 < segs.length && segs[j + 1].inView) j++;
      if (first === -1 || (activeIdx >= i && activeIdx <= j)) {
        first = i;
        last = j;
        if (activeIdx >= i && activeIdx <= j) break;
      }
      i = j;
    }
    const activeSegs = first === -1 ? [] : segs.slice(first, last + 1);

    setGeom({
      track: buildPath(segs),
      active: buildPath(activeSegs),
      // 圆点标在高亮段末端（仿截图：橙线底部收一个点）。
      dot: activeSegs.length > 0
        ? { x: activeSegs[activeSegs.length - 1].x, y: activeSegs[activeSegs.length - 1].bottom }
        : null,
      height: nav.scrollHeight,
    });
  }, [navRef, items, collapsedIds, visibleIds, activeId, resizeTick]);

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setResizeTick((t) => t + 1));
    ro.observe(nav);
    return () => ro.disconnect();
  }, [navRef]);

  if (!geom) return null;

  return (
    <svg className="mdtoc-rail" style={{ height: geom.height }} aria-hidden>
      <path className="mdtoc-rail-track" d={geom.track} />
      {geom.active && <path className="mdtoc-rail-active" d={geom.active} />}
      {geom.dot && <circle className="mdtoc-rail-dot" cx={geom.dot.x} cy={geom.dot.y} r={3.5} />}
    </svg>
  );
}
