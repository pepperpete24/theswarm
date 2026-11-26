import { Link, useNavigate, useParams } from 'react-router-dom';
import { STEPS, STEP_EXPLAIN } from '../data/constants';
import { Icon } from '../components/Icon';
import { AnswerCompare, CostBar, Heartbeat, RunReceipt, Timeline } from '../components/JobParts';
import { JobPill } from '../components/Pill';
import { StepBar } from '../components/StepBar';
import { useSwarm } from '../store/useSwarm';
import { NotFound } from './NotFound';
import s from './screens.module.css';

export function JobPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const job = useSwarm((st) => st.jobs.find((j) => j.id === id));
  const members = useSwarm((st) => st.members);
  if (!job) return <NotFound what={`job ${id ?? ''}`} />;

  const agent = members.find((m) => m.id === job.agentId);
  const explain =
    job.state === 'challenged'
      ? 'The re-check disagreed, so the job went back to step 3 with a different member. A finding only counts when two AIs agree.'
      : job.state === 'rejected'
        ? 'A person rejected this post, so nothing was published. The job and its evidence stay on record.'
        : job.state === 'withdrawn'
          ? 'This finding was published and later withdrawn. It stays visible so nobody can quietly hide it.'
          : STEP_EXPLAIN[job.step];

  return (
    <div className="page">
      <div>
        <button
          type="button"
          className="link-back"
          onClick={() => navigate(-1)}
          style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer' }}
        >
          <Icon name="back" size={15} /> Back
        </button>
      </div>
      <header className={s.jobHead}>
        <div className={s.jobTitle}>
          <span className="eyebrow">
            {job.id} · {job.role}
            {job.isUserCreated && <span className={s.yours}>yours</span>}
          </span>
          <h1>{job.question}</h1>
          <p className="muted small">
            Asked by {job.askedBy ?? 'You'}
            {job.period ? ` · ${job.period}` : ''}
            {agent ? ` · working on ${agent.device}` : ''}
          </p>
        </div>
        <JobPill job={job} />
      </header>

      <section className="panel" aria-labelledby="steps-h">
        <div className="panel-head">
          <h2 id="steps-h">
            Step {Math.min(job.step + 1, 10)} of 10 · {STEPS[job.step]}
          </h2>
          {job.heartbeat && <Heartbeat />}
        </div>
        <StepBar step={job.step} state={job.state} />
        <p className={s.stepExplain}>{explain}</p>
      </section>

      {job.state === 'human' && (
        <div className="banner banner-warn">
          <Icon name="review" />
          <div className="banner-body">
            <strong>Waiting for a person.</strong>
            <span>
              Both AIs agree and the editor has written a draft. Nothing is published until you
              decide.
            </span>
          </div>
          <Link to="/review" className="btn btn-primary btn-sm">
            Review it
          </Link>
        </div>
      )}
      {job.state === 'withdrawn' && job.withdrawnNote && (
        <div className="banner banner-bad">
          <Icon name="alert" />
          <div className="banner-body">
            <strong>Withdrawn</strong>
            <span>{job.withdrawnNote}</span>
          </div>
        </div>
      )}
      {job.state === 'rejected' && (
        <div className="banner banner-bad">
          <Icon name="x" />
          <div className="banner-body">
            <strong>Rejected by a person</strong>
            <span>Nothing was published. The answers and receipt stay on record below.</span>
          </div>
        </div>
      )}

      <section className="panel" aria-labelledby="answers-h">
        <div className="panel-head">
          <h2 id="answers-h">The two answers</h2>
          <p>Two different members’ AIs work on their own. A finding counts only if they agree.</p>
        </div>
        <AnswerCompare job={job} members={members} />
        {job.draft && (
          <div className={s.draft}>
            <span className="eyebrow">
              <Icon name="pen" size={13} /> Editor AI’s draft
            </span>
            <p>{job.draft}</p>
          </div>
        )}
      </section>

      <div className="split">
        <section className="panel" aria-labelledby="hist-h">
          <div className="panel-head">
            <h2 id="hist-h">What happened</h2>
            <Link to="/audit" className="small">
              See the audit trail
            </Link>
          </div>
          <Timeline items={job.history} />
        </section>
        <div className="stack">
          <section className="panel" aria-labelledby="cost-h">
            <div className="panel-head">
              <h2 id="cost-h">Cost</h2>
            </div>
            <CostBar spent={job.spent} reserved={job.reserved} />
          </section>
        </div>
      </div>

      <section className="panel" aria-labelledby="receipt-h">
        <div className="panel-head">
          <h2 id="receipt-h">
            <Icon name="receipt" size={17} /> Run receipt
          </h2>
          <p>What the member’s AI did, signed by its computer.</p>
        </div>
        <RunReceipt manifest={job.manifest} />
      </section>
    </div>
  );
}
