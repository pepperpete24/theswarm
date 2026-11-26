import { useState } from 'react';
import { Link } from 'react-router-dom';
import { isAgreed } from '../domain/agreement';
import type { Job, Member } from '../domain/types';
import { Icon } from '../components/Icon';
import { AnswerCompare } from '../components/JobParts';
import { Pill } from '../components/Pill';
import { useSwarm } from '../store/useSwarm';
import s from './screens.module.css';

function ReviewPanel({ job, members }: { job: Job; members: Member[] }) {
  const approve = useSwarm((st) => st.approve);
  const reject = useSwarm((st) => st.reject);
  const [note, setNote] = useState('');
  const agreed = isAgreed(job.agreement);
  return (
    <article className="panel" aria-labelledby={`r-${job.id}`}>
      <div className={s.reviewHead}>
        <div>
          <span className="eyebrow">
            {job.id} · {job.role}
            {job.isUserCreated && <span className={s.yours}>yours</span>}
          </span>
          <h2 id={`r-${job.id}`}>{job.question}</h2>
        </div>
        <Pill tone={agreed ? 'good' : 'bad'}>{job.agreement}% agreement</Pill>
      </div>
      <AnswerCompare job={job} members={members} />
      {job.draft && (
        <div className={s.draft}>
          <span className="eyebrow">
            <Icon name="pen" size={13} /> Editor AI’s draft: what viewers will read
          </span>
          <p>{job.draft}</p>
        </div>
      )}
      <div className={s.decide}>
        <div className="field">
          <label htmlFor={`note-${job.id}`}>Note (optional)</label>
          <input
            id={`note-${job.id}`}
            className="input"
            placeholder="For example: checked the costs assumption"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <div className={s.decideButtons}>
          <button
            type="button"
            className="btn btn-good"
            onClick={() => approve(job.id, note.trim() || undefined)}
          >
            <Icon name="check" size={16} /> Approve and publish
          </button>
          <button
            type="button"
            className="btn btn-bad"
            onClick={() => reject(job.id, note.trim() || undefined)}
          >
            Reject
          </button>
          <Link to={`/jobs/${job.id}`} className="btn btn-ghost">
            See full job and receipt
          </Link>
        </div>
      </div>
    </article>
  );
}

export function Review() {
  const allJobs = useSwarm((st) => st.jobs);
  const jobs = allJobs.filter((j) => j.state === 'human');
  const members = useSwarm((st) => st.members);
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Publisher</span>
          <h1>Review desk</h1>
          <p className="lede">
            These findings were checked by two independent AIs and drafted by an editor AI. Nothing
            reaches viewers until a person approves it. No AI can publish.
          </p>
        </div>
        <Pill tone={jobs.length ? 'warn' : 'good'}>
          {jobs.length ? `${jobs.length} waiting for you` : 'Nothing waiting'}
        </Pill>
      </div>
      {jobs.length === 0 ? (
        <div className={`panel ${s.empty}`}>
          <span className={s.emptyIcon}>
            <Icon name="check" size={26} />
          </span>
          <h2>All clear.</h2>
          <p className="muted">
            Nothing is waiting for a decision. Ask a new question to see one arrive here.
          </p>
          <Link to="/ask" className="btn btn-primary">
            Ask a question
          </Link>
        </div>
      ) : (
        jobs.map((j) => <ReviewPanel key={j.id} job={j} members={members} />)
      )}
    </div>
  );
}
