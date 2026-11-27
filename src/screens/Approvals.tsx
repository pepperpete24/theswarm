import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { MemberChip } from '../components/Parts';
import { Pill } from '../components/Pill';
import { tally } from '../domain/approval';
import { barToBeat } from '../domain/gates';
import type { ApprovalPanel } from '../domain/types';
import { findMember, useWorld } from './hooks';
import s from './screens.module.css';

function Seats({ panel }: { panel: ApprovalPanel }) {
  const w = useWorld();
  const t = tally(panel);
  return (
    <>
      <ul className={s.voteSeats}>
        {panel.approvers.map((a) => (
          <li
            key={a.memberId}
            className={
              a.vote === 'approve' ? s.voteYes : a.vote === 'reject' ? s.voteNo : s.votePending
            }
          >
            <div className={s.voteTop}>
              <MemberChip member={findMember(w.members, a.memberId)} sub={a.provider} />
              {a.vote ? (
                <Pill tone={a.vote === 'approve' ? 'good' : 'bad'}>
                  {a.vote === 'approve'
                    ? 'Approve'
                    : a.citesRule
                      ? `Reject · rule ${a.citesRule}`
                      : 'Reject'}
                </Pill>
              ) : (
                <Pill tone="grey" pulse>
                  Voting
                </Pill>
              )}
            </div>
            {a.reason && <p className="small">{a.reason}</p>}
          </li>
        ))}
      </ul>
      <p className={s.tally}>
        <span className="num">
          {t.approvals} of {panel.needed} needed
        </span>
        {t.ruleReject && (
          <span className={s.bad}> · a reject cites a broken rule, which blocks publishing</span>
        )}
      </p>
    </>
  );
}

export function Approvals() {
  const w = useWorld();
  const panels = Object.values(w.panels);
  const open = panels.filter((p) => !p.outcome);
  const publish = open.filter((p) => p.purpose === 'publish');
  const decided = panels.filter((p) => p.outcome && p.purpose === 'publish');
  const governance = panels.filter((p) => p.purpose !== 'publish');
  const withdrawn = w.missions.filter((m) => m.phase === 'withdrawn');

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Watch-only</span>
          <h1>Council approvals</h1>
          <p className="lede">
            Every publish decision, role promotion and approval-rule change is made here by panels
            of agents. Nothing on this page lets a person approve or reject.
          </p>
        </div>
      </div>
      <div className="banner banner-info" role="note">
        <Icon name="council" />
        <div className="banner-body">
          <span>
            Approvers never worked on what they approve, and every panel mixes AI providers. Code
            checks the evidence first; the panel decides whether it is fit to publish.
          </span>
        </div>
      </div>

      <section aria-labelledby="sess-h" className="stack">
        <h2 id="sess-h">In session</h2>
        {publish.length === 0 && (
          <div className={`panel ${s.empty}`}>
            <p className="muted">
              No panels in session. The council will seat one as soon as a mission has an idea that
              holds up on fresh data.
            </p>
          </div>
        )}
        {publish.map((p) => {
          const m = w.missions.find((x) => x.id === p.subjectId);
          if (!m) return null;
          const winners = m.winnerIdeaIds.map((id) => w.ideas[id]).filter(Boolean);
          const all = m.ideaIds.map((id) => w.ideas[id]).filter(Boolean);
          const objections = all.flatMap((i) => i.objections);
          return (
            <article key={p.id} className="panel" aria-labelledby={`ap-${p.id}`}>
              <div className={s.reviewHead}>
                <div>
                  <span className="eyebrow">
                    {p.id} · {m.id} · approval rule v{p.ruleVersion}
                  </span>
                  <h3 id={`ap-${p.id}`}>
                    <Link to={`/missions/${m.id}`}>{m.title}</Link>
                  </h3>
                </div>
                <Pill tone="warn" pulse>
                  In session
                </Pill>
              </div>
              <ul className={s.checks}>
                <li>
                  <Icon name="check" size={15} /> All four gates passed
                </li>
                <li>
                  <Icon name="check" size={15} /> Held up on fresh data
                </li>
                <li>
                  <Icon name="check" size={15} /> Chosen from {all.filter((i) => i.result).length}{' '}
                  tested ideas; cleared a bar of {barToBeat(m.trialsRun)} pts
                </li>
                <li>
                  <Icon name="check" size={15} />{' '}
                  {objections.filter((o) => o.status === 'upheld').length} objections upheld,{' '}
                  {objections.filter((o) => o.status === 'answered').length} answered
                </li>
              </ul>
              <div className="grid-2">
                <div className="stack" style={{ gap: 8 }}>
                  {winners.map((i) => (
                    <div key={i.id} className={s.winner}>
                      <Link to={`/ideas/${i.id}`}>
                        <span className="num">{i.id}</span> {i.title}
                      </Link>
                      <span className="num small muted">
                        test +{i.result?.netReturnDelta} pts · fresh +
                        {i.freshResult?.netReturnDelta} pts
                      </span>
                    </div>
                  ))}
                  <div className={s.draft}>
                    <span className="eyebrow">Editor’s draft</span>
                    <p>{m.draft}</p>
                  </div>
                </div>
                <div>
                  <Seats panel={p} />
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="panel" aria-labelledby="gov-h">
        <div className="panel-head">
          <h2 id="gov-h">Role promotions and approval-rule changes</h2>
          <p>Rule changes need a stricter panel of 7, with 6 of 7 approving.</p>
        </div>
        <div className="stack">
          {governance.map((p) => {
            const c = w.changes.find((x) => x.id === p.subjectId);
            const t = tally(p);
            return (
              <article key={p.id} className={s.govCard}>
                <div className={s.reviewHead}>
                  <div>
                    <span className="eyebrow">
                      {p.id} ·{' '}
                      {p.purpose === 'rule-change'
                        ? 'Rule-change panel (7 seats)'
                        : 'Promotion panel'}{' '}
                      · {c?.id}
                    </span>
                    <h3>{c?.change}</h3>
                  </div>
                  {p.outcome ? (
                    <Pill tone={p.outcome === 'adopted' ? 'good' : 'bad'}>
                      {p.outcome === 'adopted' ? 'Adopted' : 'Rejected'} · {t.approvals} of{' '}
                      {p.approvers.length}
                    </Pill>
                  ) : (
                    <Pill tone="warn" pulse>
                      In session · {t.approvals + t.rejects} of {p.approvers.length} votes
                    </Pill>
                  )}
                </div>
                {c?.replay && (
                  <p className="small num">
                    Replay on {c.replayedOn.length} missions: held up {c.replay.heldUp[0]} →{' '}
                    {c.replay.heldUp[1]} · false wins {c.replay.falseWins[0]} →{' '}
                    {c.replay.falseWins[1]} · cost ${c.replay.costUsd[0]} → ${c.replay.costUsd[1]}
                  </p>
                )}
                <Seats panel={p} />
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel flush" aria-labelledby="dec-h">
        <div className="panel-head">
          <h2 id="dec-h">Recent publish decisions</h2>
        </div>
        <div className="table-wrap" tabIndex={0} aria-label="Recent decisions, scrolls sideways">
          <table className="table" style={{ minWidth: 640 }}>
            <thead>
              <tr>
                <th>Mission</th>
                <th>Outcome</th>
                <th>Votes</th>
                <th>Rule</th>
                <th>Decided</th>
              </tr>
            </thead>
            <tbody>
              {decided.map((p) => {
                const m = w.missions.find((x) => x.id === p.subjectId);
                const t = tally(p);
                return (
                  <tr key={p.id}>
                    <td>
                      <Link to={`/missions/${p.subjectId}`} className="num">
                        {p.subjectId}
                      </Link>{' '}
                      {m?.title}
                    </td>
                    <td>
                      <Pill tone={p.outcome === 'published' ? 'good' : 'warn'}>
                        {p.outcome === 'published'
                          ? 'Published'
                          : p.outcome === 'sent-back'
                            ? 'Sent back'
                            : 'Not published'}
                      </Pill>
                    </td>
                    <td className="num">
                      {t.approvals} approve · {t.rejects} reject
                    </td>
                    <td className="num">v{p.ruleVersion}</td>
                    <td className="num">{p.decidedAt}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel" aria-labelledby="wd-h">
        <div className="panel-head">
          <h2 id="wd-h">Withdrawals</h2>
          <p>After publishing, the council keeps watching and withdraws items automatically.</p>
        </div>
        {withdrawn.map((m) => (
          <div key={m.id} className="banner banner-bad">
            <Icon name="alert" />
            <div className="banner-body">
              <strong>
                <Link to={`/missions/${m.id}`}>{m.id}</Link>: {m.title}
              </strong>
              <span>{m.withdrawnNote}</span>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
