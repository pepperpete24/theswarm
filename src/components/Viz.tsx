import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fmtPts } from '../domain/gates';
import type { Funnel as FunnelData } from '../domain/funnel';
import { buildTree } from '../domain/lineage';
import { ideaStatus } from '../domain/status';
import type { BestEntry, Idea, IdeaState, Member } from '../domain/types';
import s from './Viz.module.css';

function useWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(300, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** State colour, from the reserved status tokens. Never the only cue: shapes, legend and table back it up. */
const STATE_FILL: Record<IdeaState, string> = {
  proposed: 'var(--grey)',
  merged: 'var(--grey)',
  'known-dead-end': 'transparent',
  queued: 'var(--grey)',
  testing: 'var(--accent)',
  tested: 'var(--info)',
  promising: 'var(--good)',
  'needs-evidence': 'var(--warn-dot)',
  rejected: 'var(--bad)',
  'fresh-check': 'var(--warn-dot)',
  'held-up': 'var(--good)',
  'failed-fresh': 'var(--bad)',
  cancelled: 'var(--grey)',
};

const LEGEND_STATES: IdeaState[] = [
  'testing',
  'tested',
  'promising',
  'needs-evidence',
  'rejected',
  'fresh-check',
  'held-up',
  'failed-fresh',
];

/* ------------------------------------------------------------------------ */
/* The idea field: every tested idea against the baseline, with the bar.    */

export function IdeaField({
  ideas,
  bar,
  baseline,
  members,
}: {
  ideas: Idea[];
  bar: number;
  baseline: string;
  members: Member[];
}) {
  const [wrap, W] = useWidth<HTMLDivElement>(720);
  const navigate = useNavigate();
  const [hover, setHover] = useState<string | null>(null);
  const H = 360;
  const stripH = 44;
  const padL = 40;
  const padR = 16;
  const padT = stripH + 22;
  const padB = 34;
  const tested = ideas.filter((i) => i.result);
  const waiting = ideas.filter((i) => ['proposed', 'queued', 'testing'].includes(i.state));
  const xs = tested.map((i) => i.result!.netReturnDelta);
  const ys = tested.map((i) => -i.result!.drawdownDelta);
  const xMin = Math.min(-1, ...xs, 0) - 0.3;
  const xMax = Math.max(bar + 0.6, ...xs) + 0.3;
  const yMin = Math.min(-1, ...ys) - 0.3;
  const yMax = Math.max(1.5, ...ys) + 0.3;
  const x = (v: number) => padL + ((v - xMin) / (xMax - xMin)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - (v - yMin) / (yMax - yMin)) * (H - padT - padB);
  const xTicks = ticks(xMin, xMax);
  const yTicks = ticks(yMin, yMax);
  const pos = (i: Idea) => {
    if (i.result) return { cx: x(i.result.netReturnDelta), cy: y(-i.result.drawdownDelta) };
    const k = waiting.indexOf(i);
    const per = Math.max(1, Math.floor((W - padL - padR) / 18));
    return { cx: padL + 10 + (k % per) * 18, cy: 22 + Math.floor(k / per) * 14 };
  };
  const shown = [...waiting, ...tested];
  const hovered = shown.find((i) => i.id === hover);
  const hp = hovered ? pos(hovered) : null;
  const byId = (id: string) => members.find((m) => m.id === id)?.name ?? '—';
  const states = LEGEND_STATES.filter((st) => shown.some((i) => i.state === st));

  return (
    <div className={s.fieldWrap} ref={wrap}>
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className={s.field}
        role="group"
        aria-label={`Idea field: ${tested.length} tested ideas plotted by return against the baseline and drawdown change; ${waiting.length} waiting. The bar to beat is ${bar} points.`}
      >
        <rect
          x={padL - 10}
          y={4}
          width={W - padL - padR + 10}
          height={stripH - 8}
          rx={6}
          className={s.strip}
        />
        <text x={padL - 2} y={stripH + 8} className={s.axisLabel}>
          {waiting.length
            ? `Waiting to be tested (${waiting.length})`
            : 'Nothing waiting to be tested'}
        </text>
        {yTicks.map((t) => (
          <g key={`y${t}`}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} className={s.grid} />
            <text x={padL - 6} y={y(t) + 4} className={s.tick} textAnchor="end">
              {t > 0 ? `+${t}` : t}
            </text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={`x${t}`} x={x(t)} y={H - padB + 16} className={s.tick} textAnchor="middle">
            {t > 0 ? `+${t}` : t}
          </text>
        ))}
        <line x1={x(0)} x2={x(0)} y1={padT - 6} y2={H - padB} className={s.base} />
        <line x1={padL} x2={W - padR} y1={y(0)} y2={y(0)} className={s.base} />
        <text x={x(0) + 6} y={padT + 4} className={s.axisLabel}>
          Baseline: {baseline}
        </text>
        <line x1={x(bar)} x2={x(bar)} y1={padT - 6} y2={H - padB} className={s.bar} />
        <text x={x(bar) + 6} y={H - padB - 8} className={s.barLabel}>
          Bar to beat {fmtPts(bar)}
        </text>
        <text x={W - padR} y={H - 4} className={s.axisLabel} textAnchor="end">
          Net return vs baseline, after costs →
        </text>
        <text x={12} y={padT - 6} className={s.axisLabel}>
          ↑ Smaller drawdown
        </text>
        {shown.map((i) => {
          const p = pos(i);
          const fill = STATE_FILL[i.state];
          const r = i.result ? 6.5 : 4.5;
          const label = `${i.id}: ${i.title}. ${ideaStatus(i.state).label}.${i.result ? ` Return ${i.result.netReturnDelta > 0 ? '+' : ''}${i.result.netReturnDelta} pts, drawdown ${i.result.drawdownDelta > 0 ? '+' : ''}${i.result.drawdownDelta} pts.` : ''}`;
          return (
            <g
              key={i.id}
              className={s.dot}
              style={{ transform: `translate(${p.cx}px, ${p.cy}px)` }}
              tabIndex={0}
              role="link"
              aria-label={label}
              onPointerEnter={() => setHover(i.id)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(i.id)}
              onBlur={() => setHover(null)}
              onClick={() => navigate(`/ideas/${i.id}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') navigate(`/ideas/${i.id}`);
              }}
            >
              <circle r={14} fill="transparent" />
              {i.route === 'different-route' && <circle r={r + 4} className={s.ring} />}
              {i.depth > 0 ? (
                <rect
                  x={-r}
                  y={-r}
                  width={r * 2}
                  height={r * 2}
                  rx={1.5}
                  transform="rotate(45)"
                  fill={fill}
                  className={s.mark}
                />
              ) : (
                <circle r={r} fill={fill} className={s.mark} />
              )}
            </g>
          );
        })}
      </svg>
      {hovered && hp && (
        <div
          className={s.tip}
          style={{ left: Math.min(Math.max(hp.cx, 120), W - 120), top: hp.cy }}
          role="tooltip"
        >
          <strong>{hovered.title}</strong>
          <span className="num">
            {hovered.id} · {byId(hovered.proposedBy)} · {ideaStatus(hovered.state).label}
          </span>
          {hovered.result && (
            <span className="num">
              {hovered.result.netReturnDelta > 0 ? '+' : ''}
              {hovered.result.netReturnDelta} pts return · drawdown{' '}
              {hovered.result.drawdownDelta > 0 ? '+' : ''}
              {hovered.result.drawdownDelta} · {hovered.result.trades} trades
            </span>
          )}
        </div>
      )}
      <div className="legend" aria-label="Legend">
        {states.map((st) => (
          <span key={st}>
            <i style={{ background: STATE_FILL[st], borderRadius: '50%' }} /> {ideaStatus(st).label}
          </span>
        ))}
        <span>
          <i className={s.legendDiamond} /> Alternative (diamond)
        </span>
        <span>
          <i className={s.legendRing} /> Different route (ring)
        </span>
      </div>
    </div>
  );
}

function ticks(min: number, max: number) {
  const out: number[] = [];
  for (let t = Math.ceil(min); t <= Math.floor(max); t++) out.push(t);
  return out;
}

/* ------------------------------------------------------------------------ */

export function FunnelBars({ f, compact }: { f: FunnelData; compact?: boolean }) {
  const rows = [
    { label: 'Proposed', value: f.proposed, sub: '' },
    { label: 'Merged or known dead ends', value: -f.removed, sub: 'counted once or not re-tested' },
    { label: 'Tested', value: f.tested, sub: f.waiting ? `${f.waiting} still waiting` : '' },
    { label: 'Passed the council', value: f.passed, sub: 'all four gates' },
    { label: 'Shortlisted', value: f.shortlisted, sub: 'for the fresh-data check' },
    {
      label: 'Held up on fresh data',
      value: f.heldUp,
      sub: f.checking ? `${f.checking} still being checked` : '',
    },
  ];
  const max = Math.max(1, f.proposed);
  return (
    <ol className={`${s.funnel} ${compact ? s.funnelCompact : ''}`} aria-label="Mission funnel">
      {rows.map((r) => (
        <li key={r.label} className={r.value < 0 ? s.funnelOut : undefined}>
          <span className={s.funnelLabel}>
            {r.label}
            {!compact && r.sub && <span className={s.funnelSub}>{r.sub}</span>}
          </span>
          <span className={s.funnelTrack} aria-hidden>
            <span style={{ width: `${(Math.abs(r.value) / max) * 100}%` }} />
          </span>
          <span className={`${s.funnelVal} num`}>{r.value < 0 ? `−${-r.value}` : r.value}</span>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------------------ */
/* Family tree: originals that had children, and every alternative.         */

export function FamilyTree({ ideas, maxDepth }: { ideas: Idea[]; maxDepth: number }) {
  const { nodes, edges } = buildTree(ideas);
  const cols = Math.max(maxDepth + 1, ...nodes.map((n) => n.col + 1), 2);
  const colW = 230;
  const gap = 64;
  const rowH = 64;
  const W = cols * colW + (cols - 1) * gap + gap / 2 + 110;
  const rows = Math.max(1, ...nodes.map((n) => n.row + 1));
  const H = rows * rowH + 34;
  const at = (id: string) => nodes.find((n) => n.idea.id === id)!;
  const nx = (c: number) => c * (colW + gap);
  const ny = (r: number) => 30 + r * rowH;
  if (!nodes.length)
    return (
      <p className="muted">
        No alternatives yet. The tree grows when the synthesiser suggests some.
      </p>
    );
  return (
    <div className={s.treeScroll} tabIndex={0} aria-label="Family tree, scrolls sideways">
      <div className={s.tree} style={{ width: W, height: H }}>
        <svg width={W} height={H} className={s.treeSvg} aria-hidden>
          {Array.from({ length: cols }, (_, c) => (
            <text key={c} x={nx(c)} y={14} className={s.axisLabel}>
              {c === 0 ? 'Original ideas' : c === 1 ? 'Alternatives' : `Depth ${c}`}
            </text>
          ))}
          <line
            x1={nx(maxDepth) + colW + gap / 2}
            x2={nx(maxDepth) + colW + gap / 2}
            y1={22}
            y2={H}
            className={s.limit}
          />
          {edges.map(([a, b]) => {
            const A = at(a);
            const B = at(b);
            const x1 = nx(A.col) + colW;
            const y1 = ny(A.row) + 23;
            const x2 = nx(B.col);
            const y2 = ny(B.row) + 23;
            const mid = (x1 + x2) / 2;
            return (
              <path
                key={`${a}-${b}`}
                d={`M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`}
                className={s.edge}
              />
            );
          })}
        </svg>
        <span className={s.limitLabel} style={{ left: nx(maxDepth) + colW + gap / 2 + 6 }}>
          Depth limit ({maxDepth})
        </span>
        {nodes.map((n) => {
          const st = ideaStatus(n.idea.state);
          return (
            <Link
              key={n.idea.id}
              to={`/ideas/${n.idea.id}`}
              className={`${s.node} ${s[`tone_${st.tone}`]}`}
              style={{ left: nx(n.col), top: ny(n.row), width: colW }}
            >
              <span className={s.nodeTop}>
                <span className="num">{n.idea.id}</span>
                <span>{st.label}</span>
              </span>
              <span className={s.nodeTitle}>{n.idea.title}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Current-best step chart for one topic (small multiples on Improvement).  */

export function BestSteps({
  history,
  today = '2026-11-27',
  height = 150,
  label,
}: {
  history: BestEntry[];
  today?: string;
  height?: number;
  label: string;
}) {
  const [wrap, W] = useWidth<HTMLDivElement>(420);
  const [hover, setHover] = useState<number | null>(null);
  const H = height;
  const padL = 34;
  const padR = 14;
  const padT = 16;
  const padB = 22;
  const t = (d: string) => Date.parse(d);
  const t0 = t(history[0].sinceDate);
  const t1 = t(today);
  const vMax = Math.max(1, ...history.map((h) => h.netReturnVsStart)) * 1.25;
  const x = (d: string) => padL + ((t(d) - t0) / Math.max(1, t1 - t0)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - v / vMax) * (H - padT - padB);
  // Only entries that were (or are) the best in sequence; withdrawn ones show as a dip.
  const pts = history.map((h, i) => ({
    h,
    i,
    x0: x(h.sinceDate),
    x1: i < history.length - 1 ? x(history[i + 1].sinceDate) : x(today),
  }));
  return (
    <div className={s.bestWrap} ref={wrap}>
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={label}
        className={s.best}
      >
        <line x1={padL} x2={W - padR} y1={y(0)} y2={y(0)} className={s.base} />
        <text x={padL - 6} y={y(0) + 4} className={s.tick} textAnchor="end">
          0
        </text>
        <text x={padL - 6} y={y(vMax / 1.25) + 4} className={s.tick} textAnchor="end">
          +{(vMax / 1.25).toFixed(1)}
        </text>
        {pts.map(({ h, i, x0, x1 }) => (
          <g key={i} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
            <rect
              x={x0}
              y={padT}
              width={Math.max(4, x1 - x0)}
              height={H - padT - padB}
              fill="transparent"
            />
            <line
              x1={x0}
              x2={x1}
              y1={y(h.netReturnVsStart)}
              y2={y(h.netReturnVsStart)}
              className={h.status === 'withdrawn' ? s.stepWithdrawn : s.step}
            />
            {i > 0 && (
              <line
                x1={x0}
                x2={x0}
                y1={y(history[i - 1].netReturnVsStart)}
                y2={y(h.netReturnVsStart)}
                className={s.stepRiser}
              />
            )}
            <circle
              cx={x0}
              cy={y(h.netReturnVsStart)}
              r={4}
              className={h.status === 'current' ? s.stepDotNow : s.stepDot}
            />
            {h.missionId && (
              <text x={x0 + 5} y={y(h.netReturnVsStart) - 7} className={s.stepLabel}>
                {h.missionId}
              </text>
            )}
          </g>
        ))}
        <text x={padL} y={H - 5} className={s.tick}>
          {history[0].since}
        </text>
        <text x={W - padR} y={H - 5} className={s.tick} textAnchor="end">
          Today
        </text>
      </svg>
      {hover !== null && (
        <div
          className={s.tip}
          style={{
            left: Math.min(Math.max(pts[hover].x0, 110), W - 110),
            top: y(history[hover].netReturnVsStart),
          }}
          role="tooltip"
        >
          <strong>{history[hover].rule}</strong>
          <span className="num">
            {history[hover].since}
            {history[hover].until ? ` – ${history[hover].until}` : ' – now'} · +
            {history[hover].netReturnVsStart} pts vs start
          </span>
          <span>{history[hover].why}</span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Paired bars: test window vs fresh window, for one idea.                  */

export function PairedBars({
  rows,
}: {
  rows: { label: string; a: number; b?: number; unit: string; betterLow?: boolean }[];
}) {
  const max = Math.max(1, ...rows.flatMap((r) => [Math.abs(r.a), Math.abs(r.b ?? 0)]));
  const showB = rows.some((r) => r.b !== undefined);
  const fmt = (v: number, unit: string) =>
    `${v > 0 && unit === 'pts' ? '+' : ''}${v}${unit === 'pts' ? ' pts' : ` ${unit}`}`;
  return (
    <div className={s.paired}>
      {rows.map((r) => (
        <div key={r.label} className={s.pairRow}>
          <span className={s.pairLabel}>{r.label}</span>
          <span className={s.pairBars}>
            <span className={s.pairLine}>
              <span className={s.pairTrack}>
                <span className={s.pairA} style={{ width: `${(Math.abs(r.a) / max) * 100}%` }} />
              </span>
              <span className="num">{fmt(r.a, r.unit)}</span>
            </span>
            {r.b !== undefined && (
              <span className={s.pairLine}>
                <span className={s.pairTrack}>
                  <span className={s.pairB} style={{ width: `${(Math.abs(r.b) / max) * 100}%` }} />
                </span>
                <span className="num">{fmt(r.b, r.unit)}</span>
              </span>
            )}
          </span>
        </div>
      ))}
      {showB && (
        <div className="legend">
          <span>
            <i style={{ background: 'var(--accent)' }} /> Test window (24 months)
          </span>
          <span>
            <i style={{ background: 'var(--info)' }} /> Fresh window (sealed 3 months)
          </span>
        </div>
      )}
    </div>
  );
}
