import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { MissionPill } from '../components/Pill';
import { barToBeat } from '../domain/gates';
import type { Mission } from '../domain/types';
import { ideasOf, useWorld } from './hooks';
import s from './screens.module.css';

type Filter = 'all' | 'current' | 'expired' | 'withdrawn';

const isPub = (m: Mission) => m.phase === 'published' || m.phase === 'learned';

const FILTERS: { key: Filter; label: string; test: (m: Mission) => boolean }[] = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'current', label: 'Current', test: (m) => isPub(m) && !m.expired },
  { key: 'expired', label: 'Expired', test: (m) => isPub(m) && !!m.expired },
  { key: 'withdrawn', label: 'Withdrawn', test: (m) => m.phase === 'withdrawn' },
];

function Post({ m }: { m: Mission }) {
  const w = useWorld();
  const withdrawn = m.phase === 'withdrawn';
  const tested = ideasOf(m, w.ideas).filter((i) => i.result).length;
  const panel = m.approvalId ? w.panels[m.approvalId] : undefined;
  const providers = panel ? new Set(panel.approvers.map((a) => a.provider)).size : 2;
  return (
    <article className={`panel ${s.post}`} aria-labelledby={`p-${m.id}`}>
      <div className={s.postHead}>
        <div>
          <span className="eyebrow">EURUSD · {m.id}</span>
          <h2 id={`p-${m.id}`}>{m.title}</h2>
        </div>
        <MissionPill mission={m} />
      </div>
      <p
        className={`${s.postText} ${withdrawn || m.expired ? s.faded : ''} ${withdrawn ? s.struck : ''}`}
      >
        {m.draft}
      </p>
      {withdrawn && m.withdrawnNote && (
        <div className="banner banner-bad">
          <Icon name="alert" />
          <div className="banner-body">
            <strong>Withdrawn by the council</strong>
            <span>{m.withdrawnNote}</span>
          </div>
        </div>
      )}
      <dl className="kv">
        <div>
          <dt>Observed</dt>
          <dd className="num">{m.observedAt ?? '—'}</dd>
        </div>
        <div>
          <dt>Published</dt>
          <dd className="num">{m.publishedAt ?? '—'}</dd>
        </div>
        <div>
          <dt>Expires</dt>
          <dd className="num">
            {m.expiresAt ?? '—'}
            {m.expired && <span className="muted"> (expired)</span>}
          </dd>
        </div>
        <div>
          <dt>Proven wrong if</dt>
          <dd>{m.provenWrongIf ?? '—'}</dd>
        </div>
      </dl>
      <p className={s.postFoot}>
        <span className={s.seal}>
          <Icon name="check" size={15} /> Chosen from {tested} ideas tested by the swarm
        </span>
        <span>
          , cleared a bar that rose with every test ({barToBeat(m.trialsRun)} pts), held up on fresh
          data run by a member who wasn’t involved, and was approved by a council panel of{' '}
          {panel?.approvers.length ?? 5} members across {providers} AI providers, none of whom
          worked on it (approval rule v{m.approvalRuleVersion ?? 1}).
        </span>
        <Link to={`/missions/${m.id}`}>See the evidence</Link>
        <span className="muted">· Research only, not financial advice.</span>
      </p>
    </article>
  );
}

export function Published() {
  const w = useWorld();
  const all = w.missions.filter((m) => isPub(m) || m.phase === 'withdrawn');
  const [filter, setFilter] = useState<Filter>('all');
  const f = FILTERS.find((x) => x.key === filter)!;
  const list = all.filter(f.test);
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">What viewers see</span>
          <h1>Published findings</h1>
          <p className="lede">
            Every post was chosen by the swarm and approved by the council. Expired and withdrawn
            posts stay visible: losing or withdrawn results are never hidden.
          </p>
        </div>
      </div>
      <div className="row" role="group" aria-label="Filter posts" style={{ gap: 8 }}>
        {FILTERS.map((x) => (
          <button
            key={x.key}
            type="button"
            className="chip"
            aria-pressed={filter === x.key}
            onClick={() => setFilter(x.key)}
          >
            {x.label} <span className="count">{all.filter(x.test).length}</span>
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <div className={`panel ${s.empty}`}>
          <p className="muted">Nothing here yet.</p>
        </div>
      ) : (
        list.map((m) => <Post key={m.id} m={m} />)
      )}
      <p className="footnote">
        Research only, not financial advice. Nothing on this page is a trading signal or a
        recommendation to buy or sell.
      </p>
    </div>
  );
}
