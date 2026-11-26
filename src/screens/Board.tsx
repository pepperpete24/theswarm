import { Link } from 'react-router-dom';
import { money } from '../domain/budget';
import { BOARD_COLUMNS, boardColumn } from '../domain/status';
import { JobPill } from '../components/Pill';
import { useSwarm } from '../store/useSwarm';
import s from './screens.module.css';

export function Board() {
  const jobs = useSwarm((st) => st.jobs);
  const members = useSwarm((st) => st.members);
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Live</span>
          <h1>Work board</h1>
          <p className="lede">
            Every job the swarm is working on, from the moment it is asked to the moment it is done.
            Click a card to see its answers, history and run receipt.
          </p>
        </div>
        <Link to="/ask" className="btn btn-primary">
          Ask a question
        </Link>
      </div>
      <div className={s.boardScroll} tabIndex={0} aria-label="Work board, scrolls sideways">
        <div className={s.board}>
          {BOARD_COLUMNS.map((col) => {
            const cards = jobs.filter((j) => boardColumn(j.state) === col.key);
            return (
              <section key={col.key} className={s.column} aria-labelledby={`col-${col.key}`}>
                <div className={s.colHead}>
                  <h2 id={`col-${col.key}`}>{col.title}</h2>
                  <span className={s.colCount}>{cards.length}</span>
                </div>
                {cards.map((j) => {
                  const m = members.find((x) => x.id === j.agentId);
                  const live = j.reserved > 0 ? (j.spent / j.reserved) * 100 : 0;
                  return (
                    <Link key={j.id} to={`/jobs/${j.id}`} className={s.card}>
                      <div className={s.cardTop}>
                        <span className={s.cardId}>
                          {j.id}
                          {j.isUserCreated && <span className={s.yours}>yours</span>}
                        </span>
                      </div>
                      <span className={s.cardQ}>{j.question}</span>
                      <div className={s.cardMeta}>
                        <span>{m ? `${m.name}’s AI` : 'Unassigned'}</span>
                        <span className="num">
                          {money(j.spent)} / {money(j.reserved)}
                        </span>
                      </div>
                      {col.key !== 'done' && j.reserved > 0 && (
                        <span className={s.cardLive} aria-hidden>
                          <span style={{ width: `${live}%` }} />
                        </span>
                      )}
                      <div>
                        <JobPill job={j} />
                      </div>
                    </Link>
                  );
                })}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
