import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { HBarChart } from '../components/Charts';
import { Icon } from '../components/Icon';
import {
  CoachReviewCard,
  ObjectionCard,
  RulesCard,
  SeatList,
  Tabs,
} from '../components/MissionBits';
import { CostBar, Heartbeat, MemberChip, Timeline } from '../components/Parts';
import { IdeaPill, KindPill, MissionPill, Pill } from '../components/Pill';
import { PhaseBar } from '../components/StepBar';
import { FamilyTree, FunnelBars, IdeaField } from '../components/Viz';
import { PHASE_EXPLAIN } from '../data/constants';
import { money } from '../domain/budget';
import { missionFunnel } from '../domain/funnel';
import { barToBeat } from '../domain/gates';
import { isRunning } from '../domain/library';
import { FAMILY_LABEL, phaseIndex } from '../domain/status';
import type { Idea } from '../domain/types';
import { OTHER_JOBS } from '../domain/world';
import { useSwarm } from '../store/useSwarm';
import { KIND_LABEL, findMember, ideasOf, useWorld } from './hooks';
import { NotFound } from './NotFound';
import s from './screens.module.css';

type Tab = 'ideas' | 'council' | 'tree' | 'spend';
type SortKey = 'id' | 'net' | 'dd' | 'trades' | 'state';

export function MissionPage() {
  const { id } = useParams();
  const w = useWorld();
  const live = useSwarm((st) => st.live);
  const speed = useSwarm((st) => st.speed);
  const setSpeed = useSwarm((st) => st.setSpeed);
  const [params] = useSearchParams();
  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) || 'ideas');
  useEffect(() => {
    const t = params.get('tab') as Tab | null;
    if (t) setTab(t);
  }, [params]);
  const [asTable, setAsTable] = useState(false);
  const mission = w.missions.find((m) => m.id === id);
  const ideas = useMemo(() => ideasOf(mission, w.ideas), [mission, w.ideas]);
  if (!mission) return <NotFound />;

  const f = missionFunnel(ideas);
  const bar = barToBeat(mission.trialsRun);
  const sessions = mission.councilIds.map((c) => w.councils[c]).filter(Boolean);
  const topic = w.topics.find((t) => t.id === mission.topicId);
  const bestFrom = topic?.history.find((h) => h.rule === mission.challengesBest && h.missionId);
  const running = isRunning(mission);
  const isLive = live.includes(mission.id);
  const testing = ideas.filter((i) => i.state === 'testing').length;
  const queued = ideas.filter((i) => i.state === 'queued').length;
  const crew = [...new Set(ideas.map((i) => i.proposedBy))].map((m) => findMember(w.members, m));
  const panel = mission.approvalId ? w.panels[mission.approvalId] : undefined;
  const coach = w.members.find((m) => m.standing === 'Coach');
  const hits = mission.libraryHits.map((h) => w.library.find((e) => e.id === h)).filter(Boolean);
  const step = phaseIndex(mission.phase);

  return (
    <div className="page">
      <Link to="/missions" className="link-back">
        <Icon name="back" size={15} /> All missions
      </Link>
      <div className={s.jobHead}>
        <div>
          <span className="eyebrow">
            {mission.id} · {KIND_LABEL[mission.kind]} · started by {mission.createdBy}
          </span>
          <h1 className={s.jobTitle}>{mission.title}</h1>
          {mission.challengesBest && (
            <p className={s.beat}>
              <Icon name="trend" size={15} /> Trying to beat the current best:{' '}
              <strong>{mission.challengesBest}</strong>
              {bestFrom?.missionId && (
                <span className="muted">
                  {' '}
                  (since {bestFrom.missionId}, {bestFrom.since})
                </span>
              )}
            </p>
          )}
        </div>
        <div className={s.headSide}>
          <MissionPill mission={mission} />
          {mission.round > 0 && (
            <span className="muted small num">
              Round {mission.round} of {mission.rules.maxRounds}
            </span>
          )}
          {isLive && (
            <div className={s.speed} role="group" aria-label="Simulation speed">
              {[1, 2, 4].map((x) => (
                <button
                  key={x}
                  type="button"
                  className="chip"
                  aria-pressed={speed === x}
                  onClick={() => setSpeed(x)}
                >
                  {x}×
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {mission.phase === 'approval' && panel && (
        <div className="banner banner-warn" role="status">
          <Icon name="council" />
          <div className="banner-body">
            <strong>The approval panel is in session.</strong>
            <span>
              {panel.approvers.filter((a) => a.vote).length} of {panel.approvers.length} votes in.
              Five approvers who never worked on it decide whether it is fit to publish.
            </span>
            <div className="banner-actions">
              <Link to="/approvals" className="btn btn-sm">
                Watch the panel
              </Link>
            </div>
          </div>
        </div>
      )}
      {mission.phase === 'closed-no-winner' && (
        <div className="banner banner-info" role="status">
          <Icon name="info" />
          <div className="banner-body">
            <strong>Closed: no winner.</strong>
            <span>
              Nothing cleared the bar to beat. That is a useful, honest answer: the dead ends it
              found are now in the library, so the next mission won’t repeat them.
            </span>
            <div className="banner-actions">
              <Link to="/library" className="btn btn-sm">
                See the dead ends
              </Link>
            </div>
          </div>
        </div>
      )}
      {mission.phase === 'withdrawn' && (
        <div className="banner banner-bad" role="status">
          <Icon name="alert" />
          <div className="banner-body">
            <strong>Withdrawn by the council.</strong>
            <span>{mission.withdrawnNote}</span>
          </div>
        </div>
      )}
      {mission.phase === 'queued' && (
        <div className="banner banner-info" role="status">
          <Icon name="info" />
          <div className="banner-body">
            <strong>Queued by the swarm.</strong>
            <span>{mission.waitingFor ?? 'Waiting to start.'}</span>
          </div>
        </div>
      )}
      {(mission.phase === 'published' || mission.phase === 'learned') && (
        <div className="banner banner-good" role="status">
          <Icon name="check" />
          <div className="banner-body">
            <strong>Published by the council.</strong>
            <span>
              Approved by a panel under approval rule v{mission.approvalRuleVersion}. No person
              approved or edited it.
            </span>
            <div className="banner-actions">
              <Link to="/published" className="btn btn-sm">
                See what viewers see
              </Link>
            </div>
          </div>
        </div>
      )}

      <section className="panel" aria-labelledby="phase-h">
        <h2 id="phase-h" className="sr-only">
          Phase
        </h2>
        <PhaseBar mission={mission} />
        {step >= 0 && <p className={s.stepExplain}>{PHASE_EXPLAIN[step]}</p>}
        {running && (
          <div className={s.activity}>
            <Heartbeat
              text={`${testing + OTHER_JOBS} jobs at once across the swarm · ${queued} of this mission’s queued`}
            />
            <ul className={s.crew} aria-label="Members whose agents are working on this mission">
              {crew.slice(0, 10).map(
                (m) =>
                  m && (
                    <li key={m.id}>
                      <MemberChip member={m} compact />
                    </li>
                  ),
              )}
              {crew.length > 10 && <li className="muted small">+{crew.length - 10} more</li>}
            </ul>
          </div>
        )}
      </section>

      {ideas.length > 0 && (
        <div className={s.fieldGrid}>
          <section className="panel" aria-labelledby="field-h">
            <div className="panel-head">
              <h2 id="field-h">Idea field</h2>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setAsTable(!asTable)}
              >
                {asTable ? 'Show as chart' : 'Show as table'}
              </button>
            </div>
            {asTable ? (
              <IdeaTable ideas={ideas} />
            ) : (
              <IdeaField
                ideas={ideas}
                bar={bar}
                baseline={mission.rules.baseline}
                members={w.members}
              />
            )}
            <p className="footnote">
              The more ideas the swarm tries, the higher the bar. This stops a lucky result from
              looking like a discovery. ({mission.trialsRun.toLocaleString('en-GB')} trials so far;
              the formula is illustrative.)
            </p>
          </section>
          <section className="panel" aria-labelledby="funnel-h">
            <div className="panel-head">
              <h2 id="funnel-h">Funnel</h2>
            </div>
            <FunnelBars f={f} />
            <p className="footnote">Every attempt is counted, including the ones that failed.</p>
          </section>
        </div>
      )}

      {ideas.length > 0 && (
        <section className="panel" aria-label="Mission details">
          <Tabs
            label="Mission details"
            value={tab}
            onChange={setTab}
            tabs={[
              { key: 'ideas', label: 'Ideas', count: ideas.length },
              { key: 'council', label: 'Council', count: sessions.length },
              { key: 'tree', label: 'Family tree' },
              { key: 'spend', label: 'Spend' },
            ]}
          />
          <div className={s.tabBody}>
            {tab === 'ideas' && <IdeaTable ideas={ideas} sortable />}
            {tab === 'council' &&
              (sessions.length ? (
                sessions.map((c) => (
                  <article key={c.id} className={s.session}>
                    <div className="panel-head">
                      <h3>
                        Round {c.round} · <span className="num">{c.id}</span>
                      </h3>
                      <Link to={`/council/${c.id}`} className="btn btn-sm">
                        Full session
                      </Link>
                    </div>
                    {c.summary && <p>{c.summary}</p>}
                    <SeatList panel={c.panel} members={w.members} />
                    {c.objections.length > 0 && (
                      <div className={s.objGrid}>
                        {ideas
                          .flatMap((i) => i.objections)
                          .filter((o) => c.objections.includes(o.id))
                          .slice(0, 6)
                          .map((o) => (
                            <ObjectionCard key={o.id} o={o} members={w.members} showIdea />
                          ))}
                      </div>
                    )}
                    {c.syntheses.length > 0 && (
                      <ul className={s.synths}>
                        {c.syntheses.map((x) => (
                          <li key={x.newIdeaId}>
                            <Pill tone={x.kind === 'cheaper-route' ? 'good' : 'run'}>
                              {x.kind === 'cheaper-route' ? 'Cheaper route' : 'Combination'}
                            </Pill>
                            <span>
                              Built from{' '}
                              {x.fromIdeaIds.map((p) => (
                                <Link key={p} to={`/ideas/${p}`} className="num">
                                  {p}{' '}
                                </Link>
                              ))}
                              →{' '}
                              <Link to={`/ideas/${x.newIdeaId}`} className="num">
                                {x.newIdeaId}
                              </Link>
                              : {x.why}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                ))
              ) : (
                <p className="muted">The council hasn’t sat yet.</p>
              ))}
            {tab === 'tree' && <FamilyTree ideas={ideas} maxDepth={mission.rules.maxDepth} />}
            {tab === 'spend' && <SpendTab missionId={mission.id} ideas={ideas} />}
          </div>
        </section>
      )}

      {mission.coachReview && <CoachReviewCard review={mission.coachReview} coach={coach} />}

      <div className="split">
        <section className="panel" aria-labelledby="hist-h">
          <div className="panel-head">
            <h2 id="hist-h">What happened</h2>
          </div>
          <Timeline items={mission.history} />
        </section>
        <div className="stack">
          <section className="panel" aria-labelledby="rules-h">
            <div className="panel-head">
              <h2 id="rules-h">Mission rules</h2>
            </div>
            <RulesCard rules={mission.rules} compact />
          </section>
          {hits.length > 0 && (
            <section className="panel" aria-labelledby="hits-h">
              <div className="panel-head">
                <h2 id="hits-h">Library hits at the start</h2>
              </div>
              <ul className={s.hits}>
                {hits.map(
                  (e) =>
                    e && (
                      <li key={e.id}>
                        <KindPill kind={e.kind} />
                        <span>
                          <span className="num muted">{e.id}</span> {e.title}
                        </span>
                      </li>
                    ),
                )}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export function IdeaTable({ ideas, sortable }: { ideas: Idea[]; sortable?: boolean }) {
  const w = useWorld();
  const [key, setKey] = useState<SortKey>('id');
  const [desc, setDesc] = useState(false);
  const val = (i: Idea): number | string => {
    switch (key) {
      case 'net':
        return i.result?.netReturnDelta ?? -99;
      case 'dd':
        return i.result?.drawdownDelta ?? 99;
      case 'trades':
        return i.result?.trades ?? -1;
      case 'state':
        return i.state;
      default:
        return i.id;
    }
  };
  const sorted = [...ideas].sort((a, b) => {
    const x = val(a);
    const y = val(b);
    const c = x < y ? -1 : x > y ? 1 : 0;
    return desc ? -c : c;
  });
  const th = (k: SortKey, label: string, r?: boolean) =>
    sortable ? (
      <th
        className={r ? 'r' : undefined}
        aria-sort={key === k ? (desc ? 'descending' : 'ascending') : 'none'}
      >
        <button
          type="button"
          className={s.sortBtn}
          onClick={() => {
            if (key === k) setDesc(!desc);
            else {
              setKey(k);
              setDesc(k === 'net' || k === 'trades');
            }
          }}
        >
          {label}
          {key === k ? (desc ? ' ↓' : ' ↑') : ''}
        </button>
      </th>
    ) : (
      <th className={r ? 'r' : undefined}>{label}</th>
    );
  return (
    <div className="table-wrap" tabIndex={0} aria-label="Ideas, scrolls sideways">
      <table className="table" style={{ minWidth: 900 }}>
        <thead>
          <tr>
            {th('id', 'Idea')}
            <th>Family</th>
            <th>Proposed by</th>
            <th className="r">Round · depth</th>
            {th('state', 'State')}
            {th('net', 'Return Δ', true)}
            {th('dd', 'Drawdown Δ', true)}
            {th('trades', 'Trades', true)}
            <th className="r">Open objections</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((i) => (
            <tr key={i.id}>
              <td>
                <Link to={`/ideas/${i.id}`} className={s.ideaCell}>
                  <span className="num">{i.id}</span>
                  <span>{i.title}</span>
                  {i.route === 'different-route' && (
                    <span className={s.routeTag}>Different route</span>
                  )}
                </Link>
              </td>
              <td>{FAMILY_LABEL[i.family]}</td>
              <td style={{ whiteSpace: 'nowrap' }}>
                {findMember(w.members, i.proposedBy)?.name ?? '—'}
              </td>
              <td className="r num">
                {i.round} · {i.depth}
              </td>
              <td>
                <IdeaPill state={i.state} />
              </td>
              <td className="r num">
                {i.result
                  ? `${i.result.netReturnDelta > 0 ? '+' : ''}${i.result.netReturnDelta}`
                  : '—'}
              </td>
              <td className="r num">
                {i.result
                  ? `${i.result.drawdownDelta > 0 ? '+' : ''}${i.result.drawdownDelta}`
                  : '—'}
              </td>
              <td className="r num">{i.result?.trades ?? '—'}</td>
              <td className="r num">
                {i.objections.filter((o) => o.status === 'open').length || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SpendTab({ missionId, ideas }: { missionId: string; ideas: Idea[] }) {
  const w = useWorld();
  const m = w.missions.find((x) => x.id === missionId)!;
  const phases = [
    { label: 'Exploring', value: m.spendByPhase.explore },
    { label: 'Testing', value: m.spendByPhase.test },
    { label: 'Council', value: m.spendByPhase.council },
    { label: 'Fresh-data check', value: m.spendByPhase.fresh },
    { label: 'Approval', value: m.spendByPhase.approval },
  ];
  const byModel = new Map<string, number>();
  for (const i of ideas)
    if (i.result) byModel.set(i.model, (byModel.get(i.model) ?? 0) + i.result.computeCost);
  const models = [...byModel.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }));
  return (
    <div className="grid-2">
      <div className="stack">
        <CostBar spent={m.spent} reserved={m.reserved} />
        <h3>Spend by phase</h3>
        <HBarChart
          rows={phases}
          max={Math.max(1, ...phases.map((p) => p.value)) * 1.1}
          format={money}
          ariaLabel={`Spend by phase: ${phases.map((p) => `${p.label} ${money(p.value)}`).join(', ')}`}
        />
        <p className="footnote">
          Exploring and the council are cheap; testing and the fresh-data check cost the most,
          because numbers are done by code.
        </p>
      </div>
      <div className="stack">
        <h3>Test compute by the proposer’s model</h3>
        {models.length ? (
          <HBarChart
            rows={models}
            max={Math.max(...models.map((x) => x.value)) * 1.1}
            format={money}
            ariaLabel={`Test compute by model: ${models.map((x) => `${x.label} ${money(x.value)}`).join(', ')}`}
          />
        ) : (
          <p className="muted">Nothing tested yet.</p>
        )}
      </div>
    </div>
  );
}
