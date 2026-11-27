import { Link, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { ObjectionCard, SeatList } from '../components/MissionBits';
import { IdeaPill, Pill } from '../components/Pill';
import { useWorld } from './hooks';
import { NotFound } from './NotFound';
import s from './screens.module.css';

export function CouncilPage() {
  const { id } = useParams();
  const w = useWorld();
  const c = id ? w.councils[id] : undefined;
  if (!c) return <NotFound />;
  const mission = w.missions.find((m) => m.id === c.missionId);
  const objections = Object.values(w.ideas)
    .filter((i) => i.missionId === c.missionId)
    .flatMap((i) => i.objections)
    .filter((o) => c.objections.includes(o.id));
  const raised = objections.filter((o) => o.status !== 'answered');
  const answered = objections.filter((o) => o.status === 'answered');
  const counts = {
    promising: c.verdicts.filter((v) => v.verdict === 'promising').length,
    needs: c.verdicts.filter((v) => v.verdict === 'needs-evidence').length,
    rejected: c.verdicts.filter((v) => v.verdict === 'rejected').length,
  };

  return (
    <div className="page">
      <Link to={`/missions/${c.missionId}`} className="link-back">
        <Icon name="back" size={15} /> {c.missionId}
      </Link>
      <div className="page-head">
        <div>
          <span className="eyebrow">
            Council session {c.id} · round {c.round}
          </span>
          <h1>{mission?.title}</h1>
        </div>
      </div>
      <div className="banner banner-info" role="note">
        <Icon name="info" />
        <div className="banner-body">
          <span>
            The council shows its decisions and the evidence behind them, not the agents’ private
            reasoning. Code applies the gates; the council explains and challenges.
          </span>
        </div>
      </div>

      <section className="panel" aria-labelledby="panel-h">
        <div className="panel-head">
          <h2 id="panel-h">Panel</h2>
          <p>Seats rotate. Nobody judges an idea on their own lineage.</p>
        </div>
        <SeatList panel={c.panel} members={w.members} />
      </section>

      <section className="panel" aria-labelledby="raised-h">
        <div className="panel-head">
          <h2 id="raised-h">Objections raised</h2>
          <span className="eyebrow">{raised.length}</span>
        </div>
        {raised.length ? (
          <div className={s.objGrid}>
            {raised.map((o) => (
              <ObjectionCard key={o.id} o={o} members={w.members} showIdea />
            ))}
          </div>
        ) : (
          <p className="muted">None still standing.</p>
        )}
      </section>

      {answered.length > 0 && (
        <section className="panel" aria-labelledby="ans-h">
          <div className="panel-head">
            <h2 id="ans-h">Answers</h2>
            <p>Objections the advocates answered with evidence.</p>
          </div>
          <div className={s.objGrid}>
            {answered.map((o) => (
              <ObjectionCard key={o.id} o={o} members={w.members} showIdea />
            ))}
          </div>
        </section>
      )}

      <section className="panel" aria-labelledby="syn-h">
        <div className="panel-head">
          <h2 id="syn-h">New combinations and alternatives</h2>
          <p>From the synthesiser. They go back to the swarm as new ideas, one level deeper.</p>
        </div>
        {c.syntheses.length ? (
          <ul className={s.synths}>
            {c.syntheses.map((x) => (
              <li key={x.newIdeaId}>
                <Pill tone={x.kind === 'cheaper-route' ? 'good' : 'run'}>
                  {x.kind === 'cheaper-route' ? 'Cheaper route' : 'Combination'}
                </Pill>
                <span>
                  <Link to={`/ideas/${x.newIdeaId}`}>
                    <strong>{w.ideas[x.newIdeaId]?.title ?? x.newIdeaId}</strong>
                  </Link>{' '}
                  <span className="muted">built from {x.fromIdeaIds.join(' + ')}.</span> {x.why}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">None in this session.</p>
        )}
      </section>

      <section className="panel flush" aria-labelledby="ver-h">
        <div className="panel-head">
          <h2 id="ver-h">Verdicts</h2>
          <p className="num">
            {counts.promising} promising · {counts.needs} need evidence · {counts.rejected} rejected
          </p>
        </div>
        <div className="table-wrap" tabIndex={0} aria-label="Verdicts, scrolls sideways">
          <table className="table" style={{ minWidth: 680 }}>
            <thead>
              <tr>
                <th>Idea</th>
                <th>Verdict</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {c.verdicts.map((v) => (
                <tr key={v.ideaId}>
                  <td>
                    <Link to={`/ideas/${v.ideaId}`} className="num">
                      {v.ideaId}
                    </Link>{' '}
                    {w.ideas[v.ideaId]?.title}
                  </td>
                  <td>
                    <IdeaPill state={v.verdict} />
                  </td>
                  <td className="small">{v.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {c.summary && (
        <section className="panel" aria-labelledby="sum-h">
          <div className="panel-head">
            <h2 id="sum-h">Summary</h2>
          </div>
          <p>{c.summary}</p>
        </section>
      )}
    </div>
  );
}
