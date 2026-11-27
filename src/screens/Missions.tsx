import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { MissionPill } from '../components/Pill';
import { money } from '../domain/budget';
import { missionFunnel } from '../domain/funnel';
import { isRunning } from '../domain/library';
import type { Mission } from '../domain/types';
import { useSwarm } from '../store/useSwarm';
import { ideasOf, useWorld } from './hooks';
import s from './screens.module.css';

type Filter = 'running' | 'approval' | 'done' | 'all';

const FILTERS: { key: Filter; label: string; test: (m: Mission) => boolean }[] = [
  { key: 'running', label: 'Running', test: (m) => isRunning(m) && m.phase !== 'approval' },
  { key: 'approval', label: 'In approval', test: (m) => m.phase === 'approval' },
  { key: 'done', label: 'Done', test: (m) => !isRunning(m) && m.phase !== 'queued' },
  { key: 'all', label: 'All', test: () => true },
];

export function Missions() {
  const w = useWorld();
  const live = useSwarm((st) => st.live);
  const [filter, setFilter] = useState<Filter>('all');
  const f = FILTERS.find((x) => x.key === filter)!;
  const list = w.missions.filter(f.test);
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Work</span>
          <h1>Missions</h1>
          <p className="lede">
            Every mission the swarm is working on or has finished, including those it started itself
            and those that ended with no winner.
          </p>
        </div>
        <Link to="/new" className="btn btn-primary">
          Start a mission <Icon name="arrow" size={15} />
        </Link>
      </div>
      <div className="row" role="group" aria-label="Filter missions" style={{ gap: 8 }}>
        {FILTERS.map((x) => (
          <button
            key={x.key}
            type="button"
            className="chip"
            aria-pressed={filter === x.key}
            onClick={() => setFilter(x.key)}
          >
            {x.label} <span className="count">{w.missions.filter(x.test).length}</span>
          </button>
        ))}
      </div>
      <div className={s.missionGrid}>
        {list.map((m) => {
          const fu = missionFunnel(ideasOf(m, w.ideas));
          return (
            <Link key={m.id} to={`/missions/${m.id}`} className={`panel ${s.missionCard}`}>
              <div className={s.cardTop}>
                <span className="num">{m.id}</span>
                {m.isUserCreated && <span className={s.yours}>yours</span>}
                {m.createdBy === 'Swarm' && <span className={s.yours}>self-started</span>}
                {live.includes(m.id) && (
                  <span className={s.cardLive}>
                    <span className={s.live} aria-hidden /> live
                  </span>
                )}
                <span style={{ marginLeft: 'auto' }}>
                  <MissionPill mission={m} />
                </span>
              </div>
              <span className={s.cardQ}>{m.title}</span>
              <span
                className={s.mini}
                aria-label={`${fu.proposed} proposed, ${fu.tested} tested, ${fu.passed} passed, ${fu.heldUp} held up`}
              >
                <span>
                  <b className="num">{fu.proposed}</b> proposed
                </span>
                <span>
                  <b className="num">{fu.tested}</b> tested
                </span>
                <span>
                  <b className="num">{fu.passed}</b> passed
                </span>
                <span>
                  <b className="num">{fu.heldUp}</b> held up
                </span>
              </span>
              <span className={s.cardMeta}>
                <span>
                  {m.round > 0 ? `Round ${m.round} of ${m.rules.maxRounds}` : m.waitingFor}
                </span>
                {m.reserved > 0 && (
                  <span className="num">
                    {money(m.spent)} / {money(m.reserved)}
                  </span>
                )}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
