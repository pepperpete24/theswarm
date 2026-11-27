import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { KindPill, Pill } from '../components/Pill';
import { money } from '../domain/budget';
import { LIBRARY_KIND } from '../domain/status';
import { tokens } from '../domain/text';
import type { LibraryKind } from '../domain/types';
import { useSwarm } from '../store/useSwarm';
import { useWorld } from './hooks';
import s from './screens.module.css';

const KINDS: LibraryKind[] = ['proven', 'dead-end', 'warning', 'method', 'open-question'];

export function Library() {
  const w = useWorld();
  const launch = useSwarm((st) => st.launch);
  const navigate = useNavigate();
  const [kind, setKind] = useState<LibraryKind | 'all'>('all');
  const [q, setQ] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const qt = tokens(q);
  const list = w.library.filter(
    (e) =>
      (kind === 'all' || e.kind === kind) &&
      (!qt.size || [...qt].every((t) => `${e.title} ${e.text}`.toLowerCase().includes(t))),
  );
  const saved = w.library.reduce((t, e) => t + e.savedUsd, 0);
  const roles = [...new Set(w.roleVersions.map((r) => r.role))];

  const startFrom = (title: string) => {
    const r = launch({ goal: title, budget: 30, swarmSize: 'large' });
    if (r.kind === 'created') navigate(`/missions/${r.id}`);
    else if (r.kind === 'running') navigate(`/missions/${r.mission.id}`);
    else setNote(`${r.reason} ${r.fix}`);
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Knowledge</span>
          <h1>Library</h1>
          <p className="lede">
            What the swarm has learned, including the dead ends. Every mission starts by searching
            here, so the next one starts smarter and doesn’t repeat what failed.
          </p>
        </div>
      </div>

      <div className={s.counters}>
        {KINDS.map((k) => (
          <div key={k} className={s.counter}>
            <b className="num">{w.library.filter((e) => e.kind === k).length}</b>
            <span>{LIBRARY_KIND[k][0]}</span>
          </div>
        ))}
        <div className={s.counter}>
          <b className="num">{money(saved)}</b>
          <span>Saved by reuse</span>
        </div>
      </div>

      <div className="row" style={{ gap: 8 }}>
        <div className="row" role="group" aria-label="Filter by kind" style={{ gap: 6 }}>
          <button
            type="button"
            className="chip"
            aria-pressed={kind === 'all'}
            onClick={() => setKind('all')}
          >
            All <span className="count">{w.library.length}</span>
          </button>
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              className="chip"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
            >
              {LIBRARY_KIND[k][0]}
            </button>
          ))}
        </div>
        <input
          className="input"
          style={{ maxWidth: 260 }}
          placeholder="Search the library"
          aria-label="Search the library"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {note && (
        <div className="banner banner-bad" role="alert">
          <Icon name="alert" />
          <div className="banner-body">{note}</div>
        </div>
      )}

      <div className={s.libGrid}>
        {list.map((e) => (
          <article key={e.id} className={`panel ${s.libCard}`}>
            <div className={s.libTop}>
              <KindPill kind={e.kind} />
              <span className="num muted small">{e.id}</span>
            </div>
            <h3>{e.title}</h3>
            <p className="small">{e.text}</p>
            <p className={s.libFoot}>
              From <Link to={`/missions/${e.fromMissionId}`}>{e.fromMissionId}</Link>
              {e.fromIdeaId && (
                <>
                  {' '}
                  · <Link to={`/ideas/${e.fromIdeaId}`}>{e.fromIdeaId}</Link>
                </>
              )}{' '}
              · {e.addedAt}
              {e.reusedCount > 0 && (
                <>
                  {' '}
                  · reused {e.reusedCount}× · saved {money(e.savedUsd)}
                </>
              )}
            </p>
            {e.kind === 'open-question' && (
              <button type="button" className="btn btn-sm" onClick={() => startFrom(e.title)}>
                Start a mission from this <Icon name="arrow" size={14} />
              </button>
            )}
          </article>
        ))}
        {!list.length && <p className="muted">Nothing matches.</p>}
      </div>

      <section className="panel" aria-labelledby="rv-h">
        <div className="panel-head">
          <h2 id="rv-h">Role versions</h2>
          <p>
            Lessons become candidate instructions. The council promotes them only after they pass
            evaluation on past missions.
          </p>
        </div>
        <div className="grid-2">
          {roles.map((role) => (
            <div key={role} className={s.roleBox}>
              <h3>{role}</h3>
              <ol className={s.versions}>
                {w.roleVersions
                  .filter((r) => r.role === role)
                  .sort((a, b) => b.version - a.version)
                  .map((r) => (
                    <li key={r.version}>
                      <span className="num">v{r.version}</span>
                      <Pill
                        tone={
                          r.status === 'active'
                            ? 'good'
                            : r.status === 'candidate'
                              ? 'warn'
                              : 'grey'
                        }
                      >
                        {r.status === 'active'
                          ? 'Active'
                          : r.status === 'candidate'
                            ? 'Candidate'
                            : 'Retired'}
                      </Pill>
                      <span className="small">
                        {r.change}
                        {r.learnedFrom.length > 0 && (
                          <span className="muted"> Learned from {r.learnedFrom.join(', ')}.</span>
                        )}
                        {r.evaluation && (
                          <span className="muted num">
                            {' '}
                            Evaluated on {r.evaluation.missions} missions: {r.evaluation.caught}{' '}
                            extra issues caught, {r.evaluation.falseAlarms} false alarms, cost{' '}
                            {r.evaluation.costDelta}.
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
              </ol>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
