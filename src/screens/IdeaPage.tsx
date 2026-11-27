import { Link, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { ObjectionCard } from '../components/MissionBits';
import { MemberChip, RunReceipt } from '../components/Parts';
import { IdeaPill, Pill } from '../components/Pill';
import { PairedBars } from '../components/Viz';
import { applyGates, heldUp } from '../domain/gates';
import { FAMILY_LABEL } from '../domain/status';
import { findMember, useWorld } from './hooks';
import { NotFound } from './NotFound';
import s from './screens.module.css';

export function IdeaPage() {
  const { id } = useParams();
  const w = useWorld();
  const idea = id ? w.ideas[id] : undefined;
  if (!idea) return <NotFound />;
  const mission = w.missions.find((m) => m.id === idea.missionId);
  const proposer = findMember(w.members, idea.proposedBy);
  const checker = findMember(w.members, idea.freshCheckedBy);
  const parents = idea.parentIds.map((p) => w.ideas[p]).filter(Boolean);
  const children = Object.values(w.ideas).filter((i) => i.parentIds.includes(idea.id));
  const gates = applyGates(idea, mission?.trialsRun ?? 1);
  const r = idea.result;
  const f = idea.freshResult;

  return (
    <div className="page">
      <Link to={`/missions/${idea.missionId}`} className="link-back">
        <Icon name="back" size={15} /> {idea.missionId}
      </Link>
      <div className={s.jobHead}>
        <div>
          <span className="eyebrow">
            {idea.id} · {FAMILY_LABEL[idea.family]} · round {idea.round} · depth {idea.depth}
          </span>
          <h1 className={s.jobTitle}>{idea.title}</h1>
          <p className="lede">{idea.summary}</p>
          <div className="row" style={{ gap: 10, marginTop: 8 }}>
            <MemberChip member={proposer} sub={`${idea.agentRole} · ${idea.model}`} />
            {idea.route === 'different-route' && (
              <Pill tone="info">Different route (Pathfinder)</Pill>
            )}
          </div>
        </div>
        <div className={s.headSide}>
          <IdeaPill state={idea.state} />
        </div>
      </div>

      {idea.state === 'merged' && idea.mergedInto && (
        <div className="banner banner-info">
          <Icon name="info" />
          <div className="banner-body">
            <strong>Merged and counted once.</strong>
            <span>
              Near-identical to <Link to={`/ideas/${idea.mergedInto}`}>{idea.mergedInto}</Link>,
              which was proposed first.
              {proposer ? ` ${proposer.name} is credited for proposing it too.` : ''}
            </span>
          </div>
        </div>
      )}
      {idea.state === 'known-dead-end' && (
        <div className="banner banner-info">
          <Icon name="book" />
          <div className="banner-body">
            <strong>Known dead end, not re-tested.</strong>
            <span>
              The library already shows this doesn’t work ({idea.deadEndFrom}).{' '}
              {w.library.find((e) => e.id === idea.deadEndFrom)?.text}
            </span>
            <div className="banner-actions">
              <Link to="/library" className="btn btn-sm">
                Open the library
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="grid-2">
        <section className="panel" aria-labelledby="plan-h">
          <div className="panel-head">
            <h2 id="plan-h">Test plan, frozen before testing</h2>
          </div>
          <dl className="kv">
            <div>
              <dt>What it tests</dt>
              <dd>{idea.summary}</dd>
            </div>
            <div>
              <dt>Against</dt>
              <dd>{mission?.rules.baseline}</dd>
            </div>
            <div>
              <dt>Costs</dt>
              <dd>{mission?.rules.costs}</dd>
            </div>
            <div>
              <dt>Fingerprint</dt>
              <dd className="num">{idea.specHash ?? 'Not registered yet'}</dd>
            </div>
            <div>
              <dt>Registered</dt>
              <dd className="num">
                {idea.registeredAt ? `${idea.registeredAt}, before the test started` : '—'}
              </dd>
            </div>
            <div>
              <dt>Parameter sets tried</dt>
              <dd className="num">{r ? r.trials.toLocaleString('en-GB') : '—'}</dd>
            </div>
          </dl>
        </section>
        <section className="panel" aria-labelledby="res-h">
          <div className="panel-head">
            <h2 id="res-h">Results vs the baseline</h2>
            <span className="eyebrow">after costs</span>
          </div>
          {r ? (
            <>
              <PairedBars
                rows={[
                  {
                    label: 'Net return change',
                    a: r.netReturnDelta,
                    b: f?.netReturnDelta,
                    unit: 'pts',
                  },
                  {
                    label: 'Drawdown change',
                    a: r.drawdownDelta,
                    b: f?.drawdownDelta,
                    unit: 'pts',
                    betterLow: true,
                  },
                  {
                    label: 'Longest losing streak',
                    a: r.longestLosingStreak,
                    b: f?.longestLosingStreak,
                    unit: 'trades',
                  },
                ]}
              />
              <p className="footnote">
                {r.trades} trades · compute cost ${r.computeCost.toFixed(2)}. Negative drawdown
                change is better.
              </p>
            </>
          ) : (
            <p className="muted">Not tested yet.</p>
          )}
        </section>
      </div>

      <section className="panel" aria-labelledby="gates-h">
        <div className="panel-head">
          <h2 id="gates-h">The four gates</h2>
          <p>
            Code applies these. The council explains and challenges; it never votes something true.
          </p>
        </div>
        <ol className={s.gates}>
          {gates.map((g) => (
            <li key={g.n} className={g.pass ? s.gatePass : s.gateFail}>
              <span className={s.gateIcon} aria-hidden>
                <Icon name={g.pass ? 'check' : 'x'} size={14} />
              </span>
              <span>
                <strong>
                  {g.n}. {g.name}
                </strong>
                <span className="muted"> {g.reason}</span>
              </span>
              <span className="sr-only">{g.pass ? 'Passed' : 'Not passed'}</span>
            </li>
          ))}
        </ol>
        {idea.verdictReason && (
          <p className="small">
            <strong>Council verdict:</strong> {idea.verdictReason}
          </p>
        )}
      </section>

      {idea.objections.length > 0 && (
        <section className="panel" aria-labelledby="obj-h">
          <div className="panel-head">
            <h2 id="obj-h">Objections and answers</h2>
          </div>
          <div className={s.objGrid}>
            {idea.objections.map((o) => (
              <ObjectionCard key={o.id} o={o} members={w.members} />
            ))}
          </div>
        </section>
      )}

      <div className="grid-2">
        <section className="panel" aria-labelledby="lin-h">
          <div className="panel-head">
            <h2 id="lin-h">Lineage</h2>
          </div>
          <dl className="kv">
            <div>
              <dt>Built from</dt>
              <dd>
                {parents.length
                  ? parents.map((p) => (
                      <Link key={p.id} to={`/ideas/${p.id}`} className={s.lineLink}>
                        <span className="num">{p.id}</span> {p.title}
                      </Link>
                    ))
                  : 'An original idea'}
              </dd>
            </div>
            <div>
              <dt>Led to</dt>
              <dd>
                {children.length
                  ? children.map((c) => (
                      <Link key={c.id} to={`/ideas/${c.id}`} className={s.lineLink}>
                        <span className="num">{c.id}</span> {c.title}
                      </Link>
                    ))
                  : 'Nothing yet'}
              </dd>
            </div>
          </dl>
        </section>
        <section className="panel" aria-labelledby="fresh-h">
          <div className="panel-head">
            <h2 id="fresh-h">Fresh-data check</h2>
          </div>
          {idea.freshCheckedBy ? (
            <div className="stack" style={{ gap: 10 }}>
              <MemberChip member={checker} sub="Fresh-data checker · had no part in this idea" />
              {f ? (
                <p>
                  On the sealed recent 3 months it returned{' '}
                  <strong className="num">
                    {f.netReturnDelta > 0 ? '+' : ''}
                    {f.netReturnDelta} pts
                  </strong>{' '}
                  against{' '}
                  <span className="num">
                    {r!.netReturnDelta > 0 ? '+' : ''}
                    {r!.netReturnDelta} pts
                  </span>{' '}
                  on the test window.{' '}
                  {heldUp(idea) ? (
                    <Pill tone="good">Held up</Pill>
                  ) : (
                    <Pill tone="bad">Didn’t hold up</Pill>
                  )}
                </p>
              ) : (
                <p className="muted">Running now…</p>
              )}
            </div>
          ) : (
            <p className="muted">Only shortlisted ideas reach the fresh-data check.</p>
          )}
        </section>
      </div>

      <section className="panel" aria-labelledby="rc-h">
        <div className="panel-head">
          <h2 id="rc-h">Run receipt</h2>
        </div>
        <RunReceipt receipt={idea.receipt} />
      </section>
    </div>
  );
}
