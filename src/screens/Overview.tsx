import { Link } from 'react-router-dom';
import {
  DAILY_SWARM_CAP,
  DEMO_DATE_LABEL,
  MAX_ACTIVE_JOBS,
  TOTAL_MEMBERS,
} from '../data/constants';
import { prices } from '../data/prices';
import { isActive, money, summariseBudget } from '../domain/budget';
import { fmtClock } from '../domain/clock';
import { Sparkline } from '../components/Charts';
import { Icon } from '../components/Icon';
import { JobPill, Pill } from '../components/Pill';
import { StepBar } from '../components/StepBar';
import { useSwarm } from '../store/useSwarm';
import s from './screens.module.css';

/** Prices are 15 minutes apart and end at 14:15 on the demo day. */
const LAST_PRICE_SECONDS = 14 * 3600 + 15 * 60;
const priceTime = (i: number) => {
  const t = LAST_PRICE_SECONDS - (prices.length - 1 - i) * 900;
  return `${t < 0 ? '25 Nov' : '26 Nov'} ${fmtClock(t, false)} UTC`;
};

export function Overview() {
  const jobs = useSwarm((st) => st.jobs);
  const members = useSwarm((st) => st.members);
  const setTour = useSwarm((st) => st.setTourStep);
  const budget = summariseBudget(jobs, members);
  const active = jobs.filter(isActive);
  const challenged = jobs.filter((j) => j.state === 'challenged').length;
  const waiting = jobs.filter((j) => j.state === 'human');
  const online = members.filter((m) => m.online).length;
  const paused = members.filter((m) => !m.online);

  const first = prices[0];
  const last = prices[prices.length - 1];
  const change = ((last - first) / first) * 100;
  const up = change >= 0;

  const attention = [
    ...waiting.map((j) => ({ job: j, kind: 'Waiting for a person' as const })),
    ...jobs
      .filter((j) => j.state === 'challenged')
      .map((j) => ({ job: j, kind: 'Challenged' as const })),
  ];

  return (
    <div className="page">
      <section className={s.hero} aria-labelledby="hero-h">
        <div className={s.heroText}>
          <span className="eyebrow">Market Research Swarm · EURUSD pilot</span>
          <h1 id="hero-h">
            Research you can <em>check</em>, not just trust.
          </h1>
          <p>
            Members lend their own computer and AI to a shared research pool. Every finding is
            redone by a second, independent AI, approved by a person, and written to an audit trail
            that can’t be changed quietly.
          </p>
          <div className="row" style={{ marginTop: 6 }}>
            <Link to="/ask" className="btn btn-primary btn-lg">
              Ask a question <Icon name="arrow" size={16} />
            </Link>
            <button type="button" className="btn btn-lg" onClick={() => setTour(0)}>
              <Icon name="tour" size={16} /> Take the tour
            </button>
          </div>
        </div>
        <div className={s.heroSide}>
          <span className={s.clock}>
            <span className={s.live} aria-hidden /> Swarm running · {DEMO_DATE_LABEL}
          </span>
          <div className={s.pillars}>
            <span className={s.pillar}>
              <Icon name="people" size={14} /> Two independent AIs
            </span>
            <span className={s.pillar}>
              <Icon name="review" size={14} /> A person signs off
            </span>
            <span className={s.pillar}>
              <Icon name="chain" size={14} /> Tamper-evident trail
            </span>
          </div>
        </div>
      </section>

      <div className="grid-4">
        <Link to="/board" className={s.tile}>
          <span className={s.tileLabel}>Jobs in progress</span>
          <span className={s.tileValue}>
            {active.length}
            <small>/ {MAX_ACTIVE_JOBS} max</small>
          </span>
          <span className={s.tileSub}>
            {challenged ? <Pill tone="bad">{challenged} challenged</Pill> : 'None challenged'}
          </span>
        </Link>
        <Link to="/review" className={s.tile}>
          <span className={s.tileLabel}>
            Waiting for a person <Icon name="arrow" size={14} />
          </span>
          <span className={s.tileValue}>{waiting.length}</span>
          <span className={s.tileSub}>
            {waiting.length ? 'Open the review desk' : 'Nothing waiting'}
          </span>
        </Link>
        <Link to="/budgets" className={s.tile}>
          <span className={s.tileLabel}>Spent today</span>
          <span className={s.tileValue}>
            {money(budget.spent)}
            <small>of ${DAILY_SWARM_CAP}</small>
          </span>
          <span className={s.tileMeter} aria-hidden>
            <span
              style={{
                width: `${(budget.spent / budget.cap) * 100}%`,
                background: 'var(--accent)',
              }}
            />
            <span
              style={{
                width: `${(budget.setAside / budget.cap) * 100}%`,
                background: 'var(--warn-dot)',
              }}
            />
          </span>
          <span className={s.tileSub}>
            plus <span className="num">{money(budget.setAside)}</span> set aside for running jobs
          </span>
        </Link>
        <Link to="/contributors" className={s.tile}>
          <span className={s.tileLabel}>Contributors online</span>
          <span className={s.tileValue}>
            {online}
            <small>/ {TOTAL_MEMBERS}</small>
          </span>
          <span className={s.tileSub}>{paused.length} paused by their owner</span>
        </Link>
      </div>

      <div className="split">
        <section className="panel" aria-labelledby="px-h">
          <div className="panel-head">
            <h2 id="px-h">EURUSD, last 24 hours</h2>
            <span className="eyebrow">15-minute prices · made up</span>
          </div>
          <div className={s.priceHead}>
            <span className={s.price}>{last.toFixed(4)}</span>
            <span className={up ? s.up : s.down}>
              {up ? '▲' : '▼'} {up ? '+' : ''}
              {change.toFixed(2)}%
            </span>
            <span className="muted small">since 14:15 yesterday</span>
          </div>
          <div style={{ marginTop: 12 }}>
            <Sparkline
              values={prices}
              labelFor={priceTime}
              ariaLabel={`EURUSD over the last 24 hours, from ${first.toFixed(4)} to ${last.toFixed(4)}, ${up ? 'up' : 'down'} ${Math.abs(change).toFixed(2)}%`}
            />
            <div className={s.axis} aria-hidden>
              <span>14:15 yesterday</span>
              <span>02:15</span>
              <span>14:15 today</span>
            </div>
          </div>
          <p className={s.health}>
            <Icon name="check" size={15} /> Data health: No gaps found
            <span className="muted">· checked by J-1044 every 6 hours</span>
          </p>
        </section>

        <section className="panel" aria-labelledby="attn-h">
          <div className="panel-head">
            <h2 id="attn-h">Needs attention</h2>
            <span className="eyebrow">{attention.length + paused.length} items</span>
          </div>
          <ul className={s.attention}>
            {attention.map(({ job }) => (
              <li key={job.id}>
                <Link to={job.state === 'human' ? '/review' : `/jobs/${job.id}`}>
                  <span className={s.attnText}>
                    <span>{job.question}</span>
                    <span className="num">
                      {job.id} · {job.agreement}% agreement
                    </span>
                  </span>
                  <JobPill job={job} />
                </Link>
              </li>
            ))}
            {paused.map((m) => (
              <li key={m.id}>
                <Link to="/contributors">
                  <span className={s.attnText}>
                    <span>{m.name} is paused</span>
                    <span className="num">{m.device} · gets no new jobs</span>
                  </span>
                  <Pill tone="grey">Paused</Pill>
                </Link>
              </li>
            ))}
            {attention.length + paused.length === 0 && (
              <li>
                <span className={s.attnRow}>All clear. Nothing needs you right now.</span>
              </li>
            )}
          </ul>
        </section>
      </div>

      <section className="panel" aria-labelledby="flow-h">
        <div className="panel-head">
          <h2 id="flow-h">How one question becomes a published finding</h2>
          <p>Hover or tab to a step for a plain explanation.</p>
        </div>
        <div style={{ paddingTop: 8 }}>
          <StepBar />
        </div>
        <p className={s.stepExplain}>
          One member’s AI researches, a different member’s AI redoes the work on its own, an editor
          AI drafts a post, and a person decides. Every step is written to the audit trail.
        </p>
      </section>
    </div>
  );
}
