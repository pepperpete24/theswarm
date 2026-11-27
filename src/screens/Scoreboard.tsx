import { useState } from 'react';
import { HBarChart } from '../components/Charts';
import {
  SCORES,
  SCORE_MISSIONS,
  SETUP_EXPLAIN,
  costPerFinding,
  total,
  type View,
} from '../data/scoreboard';
import { money } from '../domain/budget';
import s from './screens.module.css';

export function Scoreboard() {
  const [view, setView] = useState<View>('same-budget');
  const rows = SCORES[view];
  const metric = (
    title: string,
    value: (r: (typeof rows)[number]) => number,
    format: (n: number) => string,
    note?: string,
  ) => (
    <section className="panel" aria-label={title}>
      <div className="panel-head">
        <h3>{title}</h3>
        {note && <p>{note}</p>}
      </div>
      <HBarChart
        ariaLabel={`${title}: ${rows.map((r) => `${r.setup} ${format(value(r))}`).join(', ')}`}
        max={Math.max(...rows.map(value)) * 1.15 || 1}
        format={format}
        rows={rows.map((r) => ({
          label: r.setup,
          value: value(r),
          muted: r.setup !== 'Whole swarm',
        }))}
      />
    </section>
  );
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Knowledge</span>
          <h1>Does the swarm earn its keep?</h1>
          <p className="lede">
            The plan’s central question: does a coordinated swarm find better answers than simpler
            set-ups once costs are counted? Four set-ups, the same {SCORE_MISSIONS.length} past
            missions.
          </p>
        </div>
      </div>

      <div
        className={s.segmented}
        role="radiogroup"
        aria-label="Comparison"
        style={{ maxWidth: 520 }}
      >
        {(
          [
            ['same-budget', 'Same budget', 'Each set-up gets the same $120'],
            ['full-capacity', 'Full capacity', 'Each uses what it needs, so extra spend shows'],
          ] as const
        ).map(([k, label, sub]) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={view === k}
            className={s.segBtn}
            onClick={() => setView(k)}
          >
            <strong>{label}</strong>
            <span>{sub}</span>
          </button>
        ))}
      </div>

      <div className="grid-2">
        {metric('Findings that held up on fresh data', total, (n) => String(n))}
        {metric(
          'False wins caught before publishing',
          (r) => r.falseWinsCaught,
          (n) => String(n),
        )}
        {metric('Cost per finding that held up', costPerFinding, money, 'Lower is better')}
        {metric(
          'Best improvement that held up',
          (r) => r.bestHeldUp,
          (n) => `+${n.toFixed(1)} pts`,
        )}
      </div>

      <section className="panel flush" aria-labelledby="tbl-h">
        <div className="panel-head">
          <h2 id="tbl-h">By mission</h2>
          <p>Findings that held up, per mission.</p>
        </div>
        <div className="table-wrap" tabIndex={0} aria-label="Scores by mission, scrolls sideways">
          <table className="table" style={{ minWidth: 820 }}>
            <thead>
              <tr>
                <th>Set-up</th>
                {SCORE_MISSIONS.map((m) => (
                  <th key={m} className="r">
                    {m}
                  </th>
                ))}
                <th className="r">Total</th>
                <th className="r">Cost</th>
                <th className="r">Hours to result</th>
                <th className="r">Later withdrawn</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.setup}>
                  <td>
                    <strong>{r.setup}</strong>
                    <span className={s.cellSub}>{SETUP_EXPLAIN[r.setup]}</span>
                  </td>
                  {r.heldUp.map((v, i) => (
                    <td key={i} className="r num">
                      {v}
                    </td>
                  ))}
                  <td className="r num">
                    <strong>{total(r)}</strong>
                  </td>
                  <td className="r num">{money(r.costUsd)}</td>
                  <td className="r num">{r.hours}</td>
                  <td className="r num">{r.withdrawn}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="footnote">
        Made-up illustrative numbers. Note the honest cases: at the same budget the whole swarm
        beats the small team only narrowly; on M-06 and M-10 the simple baseline or a single agent
        matches it; on M-07 nothing worked. In the real pilot, more agents are added only when the
        next step up shows a measurable benefit.
      </p>
    </div>
  );
}
