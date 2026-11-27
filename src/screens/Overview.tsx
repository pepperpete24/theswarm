import { Link } from 'react-router-dom';
import { Sparkline } from '../components/Charts';
import { Icon } from '../components/Icon';
import { KindPill, MissionPill, Pill } from '../components/Pill';
import { PhaseBar } from '../components/StepBar';
import { BestSteps, FunnelBars } from '../components/Viz';
import { DAILY_SWARM_CAP, DEMO_DATE_LABEL } from '../data/constants';
import { prices } from '../data/prices';
import { money, summariseBudget } from '../domain/budget';
import { fmtClock } from '../domain/clock';
import { missionFunnel } from '../domain/funnel';
import { isRunning } from '../domain/library';
import { OTHER_JOBS } from '../domain/world';
import { useSwarm } from '../store/useSwarm';
import { ideasOf, useWorld } from './hooks';
import s from './screens.module.css';

const LAST_PRICE_SECONDS = 14 * 3600 + 15 * 60;
const priceTime = (i: number) => {
  const t = LAST_PRICE_SECONDS - (prices.length - 1 - i) * 900;
  return `${t < 0 ? '26 Nov' : '27 Nov'} ${fmtClock(t, false)} UTC`;
};

export function Overview() {
  const w = useWorld();
  const setTour = useSwarm((st) => st.setTourStep);
  const budget = summariseBudget(w.missions, w.members);
  const running = w.missions.filter(isRunning);
  const bySwarm = (m: (typeof running)[number]) =>
    m.createdBy === 'Swarm' || m.createdBy.includes('Challenger');
  const runningSelf = running.filter(bySwarm).length;
  const queuedSelf = w.missions.filter((m) => m.phase === 'queued').length;
  const ideas = Object.values(w.ideas);
  const testing = ideas.filter((i) => i.state === 'testing').length;
  const queued = ideas.filter((i) => i.state === 'queued' || i.state === 'proposed').length;
  const online = w.members.filter((m) => m.online);
  const flagship = w.missions.find((m) => m.id === 'M-12')!;
  const ff = missionFunnel(ideasOf(flagship, w.ideas));
  const openPanels = Object.values(w.panels).filter((p) => !p.outcome);
  const lastPublished = w.missions.find(
    (m) => m.publishedAt && (m.phase === 'published' || m.phase === 'learned'),
  );
  const recent = w.library.slice(0, 4);
  const stopTopic = w.topics.find((t) => t.id === 'T-1')!;
  const sentBack = w.missions.filter((m) => m.phase === 'council' && m.round > 2);
  const paused = w.members.filter((m) => !m.online);
  const near = budget.free < 25;

  const first = prices[0];
  const last = prices[prices.length - 1];
  const change = ((last - first) / first) * 100;
  const up = change >= 0;

  return (
    <div className="page">
      <section className={s.hero} aria-labelledby="hero-h">
        <div className={s.heroText}>
          <span className="eyebrow">Market Research Swarm · EURUSD pilot</span>
          <h1 id="hero-h">
            A whole crew of agents, <em>thinking together</em>.
          </h1>
          <p>
            Members lend their agents to a shared swarm. Give it a goal and a few rules: many agents
            explore in parallel, code tests every idea, a council weighs the evidence and looks for
            better routes, and the council approves what is published. Then it keeps trying to beat
            its own best.
          </p>
          <div className="row" style={{ marginTop: 6 }}>
            <Link to="/new" className="btn btn-primary btn-lg">
              Start a mission <Icon name="arrow" size={16} />
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
              <Icon name="people" size={14} /> The whole swarm explores
            </span>
            <span className={s.pillar}>
              <Icon name="council" size={14} /> A council judges and approves
            </span>
            <span className={s.pillar}>
              <Icon name="trend" size={14} /> Every result is there to be beaten
            </span>
            <span className={s.pillar}>
              <Icon name="chain" size={14} /> Tamper-evident trail
            </span>
          </div>
        </div>
      </section>

      <div className={s.autonomy} role="status">
        <Icon name="spark" size={16} />
        <span>
          <strong>Running on its own:</strong> {running.length} missions running ({runningSelf}{' '}
          started by the swarm itself), {queuedSelf} more queued by the swarm, {openPanels.length}{' '}
          panels in session
          {lastPublished ? `, last publish ${lastPublished.publishedAt}` : ''}.
        </span>
      </div>

      <div className="grid-4">
        <Link to="/missions" className={s.tile}>
          <span className={s.tileLabel}>Missions running</span>
          <span className={s.tileValue}>{running.length}</span>
          <span className={s.tileSub}>
            {w.missions.filter((m) => m.phase === 'queued').length} more queued
          </span>
        </Link>
        <Link to="/missions/M-12" className={s.tile}>
          <span className={s.tileLabel}>Ideas in play</span>
          <span className={s.tileValue}>
            {testing + OTHER_JOBS}
            <small>being tested</small>
          </span>
          <span className={s.tileSub}>{queued} waiting in the queue</span>
        </Link>
        <Link to="/contributors" className={s.tile}>
          <span className={s.tileLabel}>Agents active</span>
          <span className={s.tileValue}>
            {online.length}
            <small>/ {w.members.length} members</small>
          </span>
          <span className={s.tileSub}>{paused.length} paused by their owner</span>
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
            plus <span className="num">{money(budget.setAside)}</span> set aside
          </span>
        </Link>
      </div>

      <div className="split">
        <section className="panel" aria-labelledby="flag-h">
          <div className="panel-head">
            <h2 id="flag-h">
              <Link to="/missions/M-12">M-12: {flagship.title}</Link>
            </h2>
            <MissionPill mission={flagship} />
          </div>
          <FunnelBars f={ff} compact />
          <p className="footnote">
            {ff.proposed} ideas from{' '}
            {new Set(ideasOf(flagship, w.ideas).map((i) => i.proposedBy)).size} members, each tested
            by code and judged by the council against a bar that rose with every test.
          </p>
        </section>
        <section className="panel" aria-labelledby="learn-h">
          <div className="panel-head">
            <h2 id="learn-h">What the swarm learned this week</h2>
            <Link to="/library" className="small">
              Library
            </Link>
          </div>
          <ul className={s.attention}>
            {recent.map((e) => (
              <li key={e.id}>
                <Link to="/library">
                  <span className={s.attnText}>
                    <span>{e.title}</span>
                    <span className="num">
                      {e.id} · from {e.fromMissionId}
                    </span>
                  </span>
                  <KindPill kind={e.kind} />
                </Link>
              </li>
            ))}
          </ul>
          <div style={{ marginTop: 14 }}>
            <span className="eyebrow">Best stop-loss result over time</span>
            <Link to="/improvement" aria-label="Open the Improvement screen">
              <BestSteps
                history={stopTopic.history}
                height={110}
                label={`Breakout stop-loss best over time: ${stopTopic.history.map((h) => `${h.rule} +${h.netReturnVsStart}`).join(', ')}`}
              />
            </Link>
          </div>
        </section>
      </div>

      <div className="split">
        <section className="panel" aria-labelledby="attn-h">
          <div className="panel-head">
            <h2 id="attn-h">Worth watching</h2>
            <span className="eyebrow">nothing needs you</span>
          </div>
          <ul className={s.attention}>
            {openPanels.map((p) => (
              <li key={p.id}>
                <Link to="/approvals">
                  <span className={s.attnText}>
                    <span>
                      {p.purpose === 'publish'
                        ? `Approval panel on ${p.subjectId}`
                        : p.purpose === 'rule-change'
                          ? `Rule-change panel on ${p.subjectId}`
                          : `Promotion panel on ${p.subjectId}`}
                    </span>
                    <span className="num">
                      {p.approvers.filter((a) => a.vote).length} of {p.approvers.length} votes in
                    </span>
                  </span>
                  <Pill tone="warn" pulse>
                    In session
                  </Pill>
                </Link>
              </li>
            ))}
            {sentBack.map((m) => (
              <li key={m.id}>
                <Link to={`/missions/${m.id}`}>
                  <span className={s.attnText}>
                    <span>{m.id} was sent back by a panel</span>
                  </span>
                  <Pill tone="warn">Sent back</Pill>
                </Link>
              </li>
            ))}
            {near && (
              <li>
                <Link to="/budgets">
                  <span className={s.attnText}>
                    <span>Today’s budget is nearly used</span>
                    <span className="num">{money(budget.free)} free</span>
                  </span>
                  <Pill tone="warn">Budget</Pill>
                </Link>
              </li>
            )}
            {paused.map((m) => (
              <li key={m.id}>
                <Link to="/contributors">
                  <span className={s.attnText}>
                    <span>{m.name} is paused</span>
                    <span className="num">{m.device} · gets no seats or work</span>
                  </span>
                  <Pill tone="grey">Paused</Pill>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="panel" aria-labelledby="px-h">
          <div className="panel-head">
            <h2 id="px-h">EURUSD, last 24 hours</h2>
            <span className="eyebrow">made up</span>
          </div>
          <div className={s.priceHead}>
            <span className={s.price}>{last.toFixed(4)}</span>
            <span className={up ? s.up : s.down}>
              {up ? '▲' : '▼'} {up ? '+' : ''}
              {change.toFixed(2)}%
            </span>
          </div>
          <Sparkline
            values={prices}
            labelFor={priceTime}
            height={110}
            ariaLabel={`EURUSD over the last 24 hours, from ${first.toFixed(4)} to ${last.toFixed(4)}`}
          />
          <p className={s.health}>
            <Icon name="check" size={15} /> Data health: No gaps found
          </p>
        </section>
      </div>

      <section className="panel" aria-labelledby="flow-h">
        <div className="panel-head">
          <h2 id="flow-h">How a mission works</h2>
          <p>Hover or tab to a phase for a plain explanation.</p>
        </div>
        <div style={{ paddingTop: 8 }}>
          <PhaseBar />
        </div>
        <p className={s.stepExplain}>
          Explore, test, council and alternatives loop for up to three rounds. Then the shortlist is
          checked on sealed fresh data, an approval panel decides, and the swarm learns: the
          library, the current best and the Coach all improve.
        </p>
      </section>
    </div>
  );
}
