import { useEffect, useId, useRef, useState } from 'react';

/** Track an element's width so SVG text renders at its real size. */
function useWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}
import s from './Charts.module.css';

/* ------------------------------------------------------------------------ */
/* Sparkline with area fill, 3 dashed price gridlines, last-point dot,
   and a crosshair + tooltip on hover.                                      */

export function Sparkline({
  values,
  labelFor,
  height = 170,
  ariaLabel,
}: {
  values: number[];
  labelFor: (i: number) => string;
  height?: number;
  ariaLabel: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const gid = useId().replace(/:/g, '');
  const W = 720;
  const H = height;
  const padL = 4;
  const padR = 66;
  const padT = 14;
  const padB = 14;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => padL + (i / (values.length - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - (v - min) / span) * (H - padT - padB);
  const line = values
    .map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
    .join('');
  const area = `${line}L${x(values.length - 1)},${H - padB}L${x(0)},${H - padB}Z`;
  const grid = [max, (max + min) / 2, min];
  const last = values.length - 1;
  const up = values[last] >= values[0];

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const fx = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((fx - padL) / (W - padL - padR)) * (values.length - 1));
    setHover(Math.max(0, Math.min(last, i)));
  };

  return (
    <div className={s.sparkWrap}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={s.spark}
        style={{ height }}
        role="img"
        aria-label={ariaLabel}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={`g${gid}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.16" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {grid.map((g) => (
          <g key={g}>
            <line
              x1={padL}
              x2={W - padR + 6}
              y1={y(g)}
              y2={y(g)}
              className={s.gridLine}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}
        <path d={area} fill={`url(#g${gid})`} />
        <path d={line} className={s.sparkLine} vectorEffect="non-scaling-stroke" />
        {hover !== null && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={padT - 6}
            y2={H - padB}
            className={s.cross}
            vectorEffect="non-scaling-stroke"
          />
        )}
        <rect
          x={padL}
          y={0}
          width={W - padL - padR}
          height={H}
          fill="transparent"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        />
      </svg>
      {/* HTML overlays keep text crisp even though the svg stretches */}
      {grid.map((g) => (
        <span key={g} className={`${s.gridLabel} num`} style={{ top: `${(y(g) / H) * 100}%` }}>
          {g.toFixed(4)}
        </span>
      ))}
      <span
        className={`${s.endDot} ${up ? s.upDot : s.downDot}`}
        style={{ left: `${(x(last) / W) * 100}%`, top: `${(y(values[last]) / H) * 100}%` }}
        aria-hidden
      />
      {hover !== null && (
        <>
          <span
            className={s.hoverDot}
            style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(values[hover]) / H) * 100}%` }}
            aria-hidden
          />
          <span
            className={s.tooltip}
            style={{
              left: `${(x(hover) / W) * 100}%`,
              transform: `translateX(${hover > values.length * 0.7 ? '-105%' : '8px'})`,
            }}
          >
            <span className="num">{values[hover].toFixed(5)}</span>
            <span className={s.tipSub}>{labelFor(hover)}</span>
          </span>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Horizontal bars, single series, optional limit tick per row.             */

export interface HBar {
  label: string;
  sub?: string;
  value: number;
  limit?: number;
  muted?: boolean;
}

export function HBarChart({
  rows,
  max,
  format,
  ariaLabel,
}: {
  rows: HBar[];
  max: number;
  format: (n: number) => string;
  ariaLabel: string;
}) {
  return (
    <ul className={s.hbars} aria-label={ariaLabel}>
      {rows.map((r) => {
        const pct = Math.min(100, (r.value / max) * 100);
        return (
          <li key={r.label} className={s.hrow}>
            <span className={s.hlabel}>
              {r.label}
              {r.sub && <span className={s.hsub}>{r.sub}</span>}
            </span>
            <span
              className={s.htrack}
              title={`${r.label}: ${format(r.value)}${r.limit ? ` of ${format(r.limit)} limit` : ''}`}
            >
              <span
                className={`${s.hfill} ${r.muted ? s.hmuted : ''}`}
                style={{ width: `${Math.max(pct, 0.8)}%` }}
              />
              {r.limit !== undefined && (
                <span
                  className={s.hlimit}
                  style={{ left: `${(r.limit / max) * 100}%` }}
                  aria-hidden
                />
              )}
            </span>
            <span className={`${s.hval} num`}>
              {format(r.value)}
              {r.limit !== undefined && <span className="muted"> / {format(r.limit)}</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------------ */
/* Column chart with a dashed limit line, value labels and one highlighted column. */

export function ColumnChart({
  data,
  limit,
  highlight,
  format,
  ariaLabel,
}: {
  data: { label: string; value: number }[];
  limit: number;
  highlight: number;
  format: (n: number) => string;
  ariaLabel: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [wrapRef, W] = useWidth<HTMLDivElement>(640);
  const H = 240;
  const padT = 26;
  const padB = 30;
  const padL = 8;
  const padR = W < 480 ? 8 : 92;
  const top = Math.max(limit * 1.12, ...data.map((d) => d.value));
  const band = (W - padL - padR) / data.length;
  const bw = Math.min(24, band * 0.56);
  const narrow = W < 480;
  const y = (v: number) => padT + (1 - v / top) * (H - padT - padB);
  const base = H - padB;
  return (
    <div className={s.colWrap} ref={wrapRef}>
      <svg viewBox={`0 0 ${W} ${H}`} className={s.cols} role="img" aria-label={ariaLabel}>
        <line x1={padL} x2={W - padR} y1={base} y2={base} className={s.baseLine} />
        <line x1={padL} x2={W - padR} y1={y(limit)} y2={y(limit)} className={s.limitLine} />
        <text
          x={narrow ? W - padR : W - padR + 14}
          y={narrow ? y(limit) - 8 : y(limit) + 4}
          className={s.limitText}
          textAnchor={narrow ? 'end' : 'start'}
        >
          {format(limit)} limit
        </text>
        {data.map((d, i) => {
          const cx = padL + band * i + band / 2;
          const h = base - y(d.value);
          const r = Math.min(4, h);
          const x0 = cx - bw / 2;
          const path = `M${x0},${base}V${base - h + r}Q${x0},${base - h} ${x0 + r},${base - h}H${x0 + bw - r}Q${x0 + bw},${base - h} ${x0 + bw},${base - h + r}V${base}Z`;
          const isHi = i === highlight;
          return (
            <g
              key={d.label}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
              className={s.colGroup}
            >
              <rect
                x={cx - band / 2}
                y={padT - 10}
                width={band}
                height={H - padT}
                fill="transparent"
              />
              <path
                d={path}
                className={`${s.col} ${isHi ? s.colHi : ''} ${hover === i ? s.colHover : ''}`}
              />
              <text
                x={cx}
                y={base - h - 8}
                className={`${s.colVal} ${isHi ? s.colValHi : ''} ${narrow && !isHi ? s.colValHide : ''}`}
              >
                {format(d.value)}
              </text>
              <text x={cx} y={H - 9} className={`${s.colLabel} ${isHi ? s.colValHi : ''}`}>
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <span
          className={s.colTip}
          style={{ left: `${((padL + band * hover + band / 2) / W) * 100}%` }}
        >
          <strong>{data[hover].label}</strong>
          <span className="num">
            {format(data[hover].value)} of {format(limit)}
          </span>
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Segmented bar: one whole split into parts, 2px surface gaps.              */

export function SegmentBar({
  parts,
  total,
  ariaLabel,
}: {
  parts: { label: string; value: number; color: string; texture?: boolean }[];
  total: number;
  ariaLabel: string;
}) {
  return (
    <div className={s.seg} role="img" aria-label={ariaLabel}>
      {parts
        .filter((p) => p.value > 0)
        .map((p) => (
          <span
            key={p.label}
            className={`${s.segPart} ${p.texture ? s.segTexture : ''}`}
            style={{ flexGrow: p.value / total, background: p.texture ? undefined : p.color }}
            title={`${p.label}: $${p.value.toFixed(2)}`}
          />
        ))}
    </div>
  );
}
