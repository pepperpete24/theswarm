import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Job } from '../domain/types';
import { Icon } from '../components/Icon';
import { JobPill } from '../components/Pill';
import { useSwarm } from '../store/useSwarm';
import s from './screens.module.css';

type Filter = 'all' | 'current' | 'expired' | 'withdrawn';

const FILTERS: { key: Filter; label: string; test: (j: Job) => boolean }[] = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'current', label: 'Current', test: (j) => j.state === 'published' && !j.expired },
  { key: 'expired', label: 'Expired', test: (j) => j.state === 'published' && !!j.expired },
  { key: 'withdrawn', label: 'Withdrawn', test: (j) => j.state === 'withdrawn' },
];

function Post({ job }: { job: Job }) {
  const withdrawn = job.state === 'withdrawn';
  return (
    <article className={`panel ${s.post}`} aria-labelledby={`p-${job.id}`}>
      <div className={s.postHead}>
        <div>
          <span className="eyebrow">EURUSD · {job.role}</span>
          <h2 id={`p-${job.id}`}>{job.question}</h2>
        </div>
        <JobPill job={job} />
      </div>
      <p
        className={`${s.postText} ${withdrawn || job.expired ? s.faded : ''} ${withdrawn ? s.struck : ''}`}
      >
        {job.draft}
      </p>
      {withdrawn && job.withdrawnNote && (
        <div className="banner banner-bad">
          <Icon name="alert" />
          <div className="banner-body">
            <strong>Withdrawn</strong>
            <span>{job.withdrawnNote}</span>
          </div>
        </div>
      )}
      <dl className="kv">
        <div>
          <dt>Observed</dt>
          <dd className="num">{job.observedAt ?? '—'}</dd>
        </div>
        <div>
          <dt>Published</dt>
          <dd className="num">{job.publishedAt ?? '—'}</dd>
        </div>
        <div>
          <dt>Expires</dt>
          <dd className="num">
            {job.expiresAt ?? '—'}
            {job.expired && <span className="muted"> (expired)</span>}
          </dd>
        </div>
        <div>
          <dt>Proven wrong if</dt>
          <dd>{job.provenWrongIf ?? '—'}</dd>
        </div>
      </dl>
      <p className={s.postFoot}>
        <span className={s.seal}>
          <Icon name="check" size={15} /> Checked by two independent AIs ({job.agreement}%
          agreement)
        </span>
        <span>and approved by a person.</span>
        <Link to={`/jobs/${job.id}`}>See the evidence</Link>
        <span className="muted">· Research only, not financial advice.</span>
      </p>
    </article>
  );
}

export function Published() {
  const jobs = useSwarm((st) => st.jobs);
  const all = jobs.filter((j) => j.state === 'published' || j.state === 'withdrawn');
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
            Every post here was checked by two AIs and approved by a person. Expired and withdrawn
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
        list.map((j) => <Post key={j.id} job={j} />)
      )}
      <p className="footnote">
        Research only, not financial advice. Nothing on this page is a trading signal or a
        recommendation to buy or sell.
      </p>
    </div>
  );
}
