import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { MemberChip } from '../components/Parts';
import { Pill } from '../components/Pill';
import { BestSteps } from '../components/Viz';
import { APPROVAL_FLOORS, RULE_CHANGE_PANEL } from '../data/constants';
import { tally } from '../domain/approval';
import { currentBest, topicBar } from '../domain/improvement';
import { PASSED } from '../domain/funnel';
import type { ProcessChange } from '../domain/types';
import { useWorld } from './hooks';
import s from './screens.module.css';

const STATUS: Record<ProcessChange['status'], [string, 'good' | 'warn' | 'bad' | 'grey' | 'run']> =
  {
    replaying: ['Replaying', 'run'],
    'in-approval': ['In approval', 'warn'],
    adopted: ['Adopted', 'good'],
    rejected: ['Rejected', 'bad'],
    refused: ['Refused by code', 'bad'],
    'rolled-back': ['Rolled back', 'grey'],
  };

const KIND: Record<ProcessChange['kind'], string> = {
  'role-version': 'Role version',
  'model-choice': 'Model choice',
  'swarm-size': 'Swarm size',
  defaults: 'Defaults',
  queue: 'Queue',
  'approval-rule': 'Approval rule',
};

export function Improvement() {
  const w = useWorld();
  const standing = w.members.filter((m) => m.standing);
  const different = Object.values(w.ideas).filter((i) => i.route === 'different-route');
  const diffPassed = different.filter((i) => PASSED.includes(i.state));
  const diffFed = Object.values(w.ideas).filter(
    (i) =>
      i.state === 'held-up' && i.parentIds.some((p) => w.ideas[p]?.route === 'different-route'),
  );
  const active = w.rules.find((r) => r.status === 'active')!;
  const proposed = w.rules.find((r) => r.status === 'proposed');
  const rcPanel = proposed
    ? Object.values(w.panels).find((p) => p.subjectId === proposed.fromChange)
    : undefined;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Knowledge</span>
          <h1>Improvement</h1>
          <p className="lede">
            Is the swarm getting better? Every result is there to be beaten, every route can be
            questioned, and the way the swarm works is reviewed after every mission.
          </p>
        </div>
      </div>
      <div className="banner banner-info" role="note">
        <Icon name="lock" />
        <div className="banner-body">
          <span>
            Nothing here changes the fixed rules. Every improvement has to beat what it replaces on
            evidence, then pass an approval panel. Changes to the approval rule need a stricter
            panel of {RULE_CHANGE_PANEL.size} and can never go below the floors.
          </span>
        </div>
      </div>

      <div className="grid-3">
        {standing.map((m) => (
          <section key={m.id} className={`panel ${s.explainer}`}>
            <span className={s.explainerIcon}>
              <Icon
                name={
                  m.standing === 'Challenger'
                    ? 'trend'
                    : m.standing === 'Pathfinder'
                      ? 'spark'
                      : 'people'
                }
              />
            </span>
            <h3>{m.standing}</h3>
            <p className="small">
              {m.standing === 'Challenger'
                ? '“Can we beat the current best?” Starts a challenge mission when a best is 30 days old, conditions change, the library learns something related, or paper results drift.'
                : m.standing === 'Pathfinder'
                  ? '“Is there a completely different way?” Adds different-route ideas to every mission, within 20% of its budget.'
                  : '“How could the swarm itself work better?” Reviews each mission’s process and proposes changes, tested by replaying past missions.'}
            </p>
            <MemberChip member={m} sub={`Run by this member’s agent · ${m.model}`} />
          </section>
        ))}
      </div>

      <section aria-labelledby="best-h" className="stack">
        <h2 id="best-h">Best result over time</h2>
        <div className="grid-2">
          {w.topics.map((t) => {
            const best = currentBest(t);
            const open = t.openChallengeMissionId
              ? w.missions.find((m) => m.id === t.openChallengeMissionId)
              : undefined;
            return (
              <article key={t.id} className="panel" aria-labelledby={`t-${t.id}`}>
                <div className="panel-head">
                  <h3 id={`t-${t.id}`}>
                    <span className="num muted">{t.id}</span> {t.title}
                  </h3>
                  <span className="num small muted">
                    challenged {t.challenges}× · beaten {t.beaten}×
                  </span>
                </div>
                <BestSteps
                  history={t.history}
                  label={`${t.title}: ${t.history.map((h) => `${h.rule} from ${h.since}, ${h.netReturnVsStart} points vs the starting rule${h.status === 'withdrawn' ? ', withdrawn' : ''}`).join('; ')}`}
                />
                <p className="small">
                  <strong>Current best:</strong> {best.rule}{' '}
                  <span className="muted">
                    (since {best.since}
                    {best.missionId ? `, from ${best.missionId}` : ', the starting rule'})
                  </span>
                </p>
                <p className={s.historyLine}>
                  {t.history.map((h, i) => (
                    <span key={i}>
                      {i > 0 && ' → '}
                      <span className={h.status === 'withdrawn' ? s.struck : undefined}>
                        {h.rule}
                      </span>
                      {h.missionId && <span className="muted"> ({h.missionId})</span>}
                    </span>
                  ))}
                </p>
                <p className="small">
                  {open ? (
                    <>
                      <Pill tone={open.phase === 'queued' ? 'grey' : 'run'}>
                        {open.phase === 'queued' ? 'Challenge queued' : 'Being challenged'}
                      </Pill>{' '}
                      <Link to={`/missions/${open.id}`}>{open.id}</Link>
                      {open.waitingFor ? <span className="muted"> · {open.waitingFor}</span> : null}
                    </>
                  ) : (
                    <span className="muted">No open challenge.</span>
                  )}
                </p>
                <p className="small muted num">
                  Next challenger must clear {topicBar(t)} pts (
                  {t.totalTrials.toLocaleString('en-GB')} trials on this topic so far).{' '}
                  {t.nextFreshWindow
                    ? `Next fresh window: ${t.nextFreshWindow}.`
                    : 'Waiting for fresh data newer than ' + t.lastFreshWindow + '.'}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel" aria-labelledby="dr-h">
        <div className="panel-head">
          <h2 id="dr-h">Different routes</h2>
          <p>The Pathfinder’s ideas across every mission.</p>
        </div>
        <div className={s.counters}>
          <div className={s.counter}>
            <b className="num">{different.length}</b>
            <span>Tried</span>
          </div>
          <div className={s.counter}>
            <b className="num">{diffPassed.length}</b>
            <span>Passed the council</span>
          </div>
          <div className={s.counter}>
            <b className="num">{diffFed.length}</b>
            <span>Fed a winner that held up</span>
          </div>
        </div>
      </section>

      <section className="panel" aria-labelledby="ar-h">
        <div className="panel-head">
          <h2 id="ar-h">Approval rule</h2>
          <span className="eyebrow">Version {active.version} active</span>
        </div>
        <div className="grid-2">
          <div className="stack" style={{ gap: 8 }}>
            <dl className="kv">
              <div>
                <dt>Panel</dt>
                <dd className="num">
                  {active.panelSize} approvers, {active.approvalsNeeded} needed
                </dd>
              </div>
              <div>
                <dt>Providers</dt>
                <dd>
                  At least {active.minProviders}, none over {active.maxProviderShare * 100}% of
                  seats
                </dd>
              </div>
              <div>
                <dt>Extra checks</dt>
                <dd>{active.extraChecks.length ? active.extraChecks.join(' ') : 'None'}</dd>
              </div>
              {active.scopes?.map((sc) => (
                <div key={sc.scope}>
                  <dt>{sc.scope}</dt>
                  <dd>
                    {sc.panelSize} approvers, {sc.approvalsNeeded} needed
                    {sc.skipsExtraChecks ? ', no extra re-run check' : ''}
                  </dd>
                </div>
              ))}
            </dl>
            <div className={s.floors}>
              <strong>
                <Icon name="lock" size={14} /> Floors no change can break
              </strong>
              <ul>
                <li>
                  At least {APPROVAL_FLOORS.minPanel} approvers and {APPROVAL_FLOORS.minApprovals}{' '}
                  approvals
                </li>
                <li>
                  At least {APPROVAL_FLOORS.minProviders} providers, none over{' '}
                  {APPROVAL_FLOORS.maxProviderShare * 100}% of seats
                </li>
                <li>Nobody judges what they worked on, fresh-checked or drafted</li>
                <li>All four gates and the fresh-data check come first</li>
                <li>A reject citing a broken fixed rule blocks publishing</li>
              </ul>
            </div>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <h3>Version history</h3>
            <ol className={s.versions}>
              {[...w.rules]
                .sort((a, b) => b.version - a.version)
                .map((r) => (
                  <li key={r.version}>
                    <span className="num">v{r.version}</span>
                    <Pill
                      tone={
                        r.status === 'active' ? 'good' : r.status === 'proposed' ? 'warn' : 'grey'
                      }
                    >
                      {r.status === 'active'
                        ? 'Active'
                        : r.status === 'proposed'
                          ? 'Proposed'
                          : 'Retired'}
                    </Pill>
                    <span className="small">
                      {r.fromChange ? `From ${r.fromChange}. ` : 'First version. '}
                      {r.adoptedAt ? `Adopted ${r.adoptedAt}.` : ''}
                    </span>
                  </li>
                ))}
            </ol>
            {proposed && rcPanel && (
              <p className="small">
                <strong>In progress:</strong> v{proposed.version} is in front of rule-change panel{' '}
                <Link to="/approvals">{rcPanel.id}</Link>,{' '}
                <span className="num">
                  {tally(rcPanel).approvals} of {RULE_CHANGE_PANEL.needed} approvals needed so far
                </span>
                . If adopted it applies only to missions that start afterwards, and is on probation
                for 5 missions.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="panel flush" aria-labelledby="pc-h">
        <div className="panel-head">
          <h2 id="pc-h">Process changes</h2>
          <p>Every Coach proposal. Rejected, refused and rolled-back changes stay visible.</p>
        </div>
        <div className="table-wrap" tabIndex={0} aria-label="Process changes, scrolls sideways">
          <table className="table" style={{ minWidth: 1000 }}>
            <thead>
              <tr>
                <th>Change</th>
                <th>Kind</th>
                <th>Learned from</th>
                <th>Replayed on</th>
                <th>Held up</th>
                <th>False wins</th>
                <th>Cost</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {w.changes.map((c) => (
                <tr key={c.id}>
                  <td>
                    <span className="num muted">{c.id}</span> {c.change}
                    <span className={s.cellSub}>{c.outcome ?? c.why}</span>
                  </td>
                  <td>{KIND[c.kind]}</td>
                  <td className="num">{c.learnedFrom.join(', ')}</td>
                  <td className="num">
                    {c.replayedOn.length}
                    {c.replayTarget ? ` of ${c.replayTarget}` : ''} missions
                  </td>
                  <td className="num">
                    {c.replay ? `${c.replay.heldUp[0]} → ${c.replay.heldUp[1]}` : '—'}
                  </td>
                  <td className="num">
                    {c.replay ? `${c.replay.falseWins[0]} → ${c.replay.falseWins[1]}` : '—'}
                  </td>
                  <td className="num">
                    {c.replay ? `$${c.replay.costUsd[0]} → $${c.replay.costUsd[1]}` : '—'}
                  </td>
                  <td>
                    <Pill tone={STATUS[c.status][1]}>{STATUS[c.status][0]}</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
