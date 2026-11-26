import { Link } from 'react-router-dom';
import { DAILY_SWARM_CAP, MEMBER_DAILY_CAP } from '../data/constants';
import { isActive, money, summariseBudget } from '../domain/budget';
import { ColumnChart, HBarChart, SegmentBar } from '../components/Charts';
import { JobPill } from '../components/Pill';
import { useSwarm } from '../store/useSwarm';
import s from './screens.module.css';

/** Made-up totals for the six days before today. */
const PAST_DAYS = [
  { label: 'Fri', value: 17.4 },
  { label: 'Sat', value: 6.2 },
  { label: 'Sun', value: 4.9 },
  { label: 'Mon', value: 21.8 },
  { label: 'Tue', value: 19.35 },
  { label: 'Wed', value: 23.1 },
];

export function Budgets() {
  const jobs = useSwarm((st) => st.jobs);
  const members = useSwarm((st) => st.members);
  const b = summariseBudget(jobs, members);

  // Live spend on running jobs counts against the member doing the work.
  const memberSpend = members.map((m) => ({
    m,
    value:
      m.spentToday +
      jobs
        .filter((j) => isActive(j) && !j.charged && j.agentId === m.id)
        .reduce((t, j) => t + j.spent, 0),
  }));

  const byModel = new Map<string, number>();
  memberSpend.forEach(({ m, value }) => byModel.set(m.model, (byModel.get(m.model) ?? 0) + value));
  const modelRows = [...byModel.entries()]
    .sort((a, b2) => b2[1] - a[1])
    .map(([label, value]) => ({ label, value }));

  const days = [...PAST_DAYS, { label: 'Today', value: b.spent }];
  const expensive = [...jobs]
    .sort((a, c) => Math.max(c.spent, c.reserved) - Math.max(a.spent, a.reserved))
    .slice(0, 6);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Spending</span>
          <h1>Budgets</h1>
          <p className="lede">
            Every job sets aside the most it may cost before it starts. Whatever it doesn’t use goes
            back to the pool when it closes.
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
              <i style={{ background: 'var(--warn-dot)' }} /> Set aside for running jobs
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
          A new job is refused if it would push the total past the daily limit, or past its member’s
          own limit of ${MEMBER_DAILY_CAP} a day.
        </p>
      </section>

      <div className="grid-2">
        <section className="panel" aria-labelledby="mem-h">
          <div className="panel-head">
            <h2 id="mem-h">Spend by member today</h2>
            <p>The tick marks each member’s own limit.</p>
          </div>
          <HBarChart
            ariaLabel="Spend by member today"
            max={MEMBER_DAILY_CAP}
            format={money}
            rows={memberSpend.map(({ m, value }) => ({
              label: m.name,
              sub: m.online ? m.model : `${m.model} · paused`,
              value,
              limit: m.dailyCap,
              muted: !m.online,
            }))}
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

      <section className="panel" aria-labelledby="week-h">
        <div className="panel-head">
          <h2 id="week-h">Last 7 days</h2>
          <p>The dashed line is the ${DAILY_SWARM_CAP} daily limit.</p>
        </div>
        <ColumnChart
          data={days}
          limit={DAILY_SWARM_CAP}
          highlight={days.length - 1}
          format={(n) => `$${n.toFixed(2)}`}
          ariaLabel={`Spend over the last 7 days. ${days.map((d) => `${d.label} ${money(d.value)}`).join(', ')}`}
        />
      </section>

      <section className="panel flush" aria-labelledby="exp-h">
        <div className="panel-head">
          <h2 id="exp-h">Most expensive jobs</h2>
        </div>
        <div className="table-wrap" tabIndex={0} aria-label="Most expensive jobs, scrolls sideways">
          <table className="table" style={{ minWidth: 640 }}>
            <thead>
              <tr>
                <th>Job</th>
                <th>Question</th>
                <th className="r">Spent</th>
                <th className="r">Set aside</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {expensive.map((j) => (
                <tr key={j.id}>
                  <td className="num">
                    <Link to={`/jobs/${j.id}`}>{j.id}</Link>
                  </td>
                  <td>{j.question}</td>
                  <td className="r num">{money(j.spent)}</td>
                  <td className="r num">{money(j.reserved)}</td>
                  <td>
                    <JobPill job={j} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="footnote">
        Costs are estimates worked out from the tokens each AI reports. The $25 swarm limit and $5
        member limit are placeholders for the pilot to confirm.
      </p>
    </div>
  );
}
