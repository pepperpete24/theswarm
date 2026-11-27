import { Link } from 'react-router-dom';
import { DAILY_SWARM_CAP, MEMBER_DAILY_CAP, SELF_START_BUDGET } from '../data/constants';
import { money, summariseBudget } from '../domain/budget';
import { ColumnChart, HBarChart, SegmentBar } from '../components/Charts';
import { MissionPill } from '../components/Pill';
import { useWorld } from './hooks';
import s from './screens.module.css';

/** Made-up totals for the six days before today. */
const PAST_DAYS = [
  { label: 'Sat', value: 41.2 },
  { label: 'Sun', value: 18.6 },
  { label: 'Mon', value: 96.4 },
  { label: 'Tue', value: 104.1 },
  { label: 'Wed', value: 88.7 },
  { label: 'Thu', value: 112.3 },
];

export function Budgets() {
  const w = useWorld();
  const b = summariseBudget(w.missions, w.members);
  const byModel = new Map<string, number>();
  w.members.forEach((m) => byModel.set(m.model, (byModel.get(m.model) ?? 0) + m.spentToday));
  const modelRows = [...byModel.entries()]
    .sort((a, c) => c[1] - a[1])
    .map(([label, value]) => ({ label, value }));
  const phase = { explore: 0, test: 0, council: 0, fresh: 0, approval: 0 };
  for (const m of w.missions)
    for (const k of Object.keys(phase) as (keyof typeof phase)[]) phase[k] += m.spendByPhase[k];
  const phaseRows = [
    { label: 'Exploring', value: phase.explore },
    { label: 'Testing', value: phase.test },
    { label: 'Council', value: phase.council },
    { label: 'Fresh-data check', value: phase.fresh },
    { label: 'Approval', value: phase.approval },
  ];
  const days = [...PAST_DAYS, { label: 'Today', value: b.spent }];
  const expensive = [...w.missions]
    .filter((m) => m.spent > 0)
    .sort((a, c) => c.spent - a.spent)
    .slice(0, 7);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Spending</span>
          <h1>Budgets</h1>
          <p className="lede">
            Every mission sets aside its budget before it starts. Whatever it doesn’t use goes back
            to the pool when it closes. The owner sets these limits; agents can’t change them.
          </p>
        </div>
      </div>

      <section className="panel" aria-labelledby="today-h">
        <div className="panel-head">
          <h2 id="today-h">Today</h2>
          <span className="eyebrow">Daily limit ${DAILY_SWARM_CAP}.00</span>
        </div>
        <div className={s.budgetNums}>
          <div className={s.budgetNum}>
            <b>{money(b.spent)}</b>
            <span>
              <i style={{ background: 'var(--accent)' }} /> Spent
            </span>
          </div>
          <div className={s.budgetNum}>
            <b>{money(b.setAside)}</b>
            <span>
              <i style={{ background: 'var(--warn-dot)' }} /> Set aside for running missions
            </span>
          </div>
          <div className={s.budgetNum}>
            <b>{money(b.free)}</b>
            <span>
              <i
                style={{ background: 'var(--surface-3)', border: '1px solid var(--line-strong)' }}
              />{' '}
              Free
            </span>
          </div>
        </div>
        <SegmentBar
          total={b.cap}
          ariaLabel={`Today: ${money(b.spent)} spent, ${money(b.setAside)} set aside, ${money(b.free)} free of the $${b.cap} limit`}
          parts={[
            { label: 'Spent', value: b.spent, color: 'var(--accent)' },
            { label: 'Set aside', value: b.setAside, color: 'var(--warn-dot)' },
            { label: 'Free', value: b.free, color: '', texture: true },
          ]}
        />
        <p className="footnote" style={{ marginTop: 12 }}>
          A new mission is refused if it would push the total past the daily limit. No member is
          charged more than ${MEMBER_DAILY_CAP} a day. Missions the swarm starts itself come out of
          a ${SELF_START_BUDGET} self-start budget.
        </p>
      </section>

      <div className="grid-2">
        <section className="panel" aria-labelledby="phase-h">
          <div className="panel-head">
            <h2 id="phase-h">Spend by phase, all missions</h2>
            <p>Exploring and the council are cheap; the numbers are done by code.</p>
          </div>
          <HBarChart
            ariaLabel="Spend by phase"
            max={Math.max(...phaseRows.map((r) => r.value)) * 1.1}
            format={money}
            rows={phaseRows}
          />
        </section>
        <section className="panel" aria-labelledby="model-h">
          <div className="panel-head">
            <h2 id="model-h">Spend by AI model today</h2>
          </div>
          <HBarChart
            ariaLabel="Spend by AI model today"
            max={Math.max(...modelRows.map((r) => r.value)) * 1.1}
            format={money}
            rows={modelRows}
          />
        </section>
      </div>

      <section className="panel" aria-labelledby="mem-h">
        <div className="panel-head">
          <h2 id="mem-h">Spend by member today</h2>
          <p>The tick marks each member’s own limit.</p>
        </div>
        <HBarChart
          ariaLabel="Spend by member today"
          max={MEMBER_DAILY_CAP}
          format={money}
          rows={w.members.map((m) => ({
            label: m.name,
            sub: m.online ? m.model : `${m.model} · paused`,
            value: m.spentToday,
            limit: m.dailyCap,
            muted: !m.online,
          }))}
        />
      </section>

      <section className="panel" aria-labelledby="week-h">
        <div className="panel-head">
          <h2 id="week-h">Last 7 days</h2>
          <p>The dashed line is the ${DAILY_SWARM_CAP} daily limit.</p>
        </div>
        <ColumnChart
          data={days}
          limit={DAILY_SWARM_CAP}
          highlight={days.length - 1}
          format={(n) => `$${n.toFixed(0)}`}
          ariaLabel={`Spend over the last 7 days. ${days.map((d) => `${d.label} ${money(d.value)}`).join(', ')}`}
        />
      </section>

      <section className="panel flush" aria-labelledby="exp-h">
        <div className="panel-head">
          <h2 id="exp-h">Missions by spend</h2>
        </div>
        <div className="table-wrap" tabIndex={0} aria-label="Missions by spend, scrolls sideways">
          <table className="table" style={{ minWidth: 640 }}>
            <thead>
              <tr>
                <th>Mission</th>
                <th>Goal</th>
                <th className="r">Spent</th>
                <th className="r">Set aside</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {expensive.map((m) => (
                <tr key={m.id}>
                  <td className="num">
                    <Link to={`/missions/${m.id}`}>{m.id}</Link>
                  </td>
                  <td>{m.title}</td>
                  <td className="r num">{money(m.spent)}</td>
                  <td className="r num">{money(m.reserved)}</td>
                  <td>
                    <MissionPill mission={m} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="footnote">
        Costs are estimates worked out from the tokens each agent reports. All limits are
        placeholders for the pilot to confirm.
      </p>
    </div>
  );
}
