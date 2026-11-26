import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ASKABLE_ROLES, EXAMPLE_FRESH } from '../data/constants';
import { useSwarm } from '../store/useSwarm';
import { Icon } from './Icon';
import s from './Tour.module.css';

interface Step {
  title: string;
  body: string;
  route: (jobId: string | null) => string;
}

const STEPS: Step[] = [
  {
    title: 'What the swarm is',
    body: 'A research club. Members lend their own computer and AI (Claude or Codex) to a shared pool that studies one market: EURUSD. Every finding is checked twice by AIs and once by a person.',
    route: () => '/',
  },
  {
    title: 'Ask a question',
    body: 'Anyone can ask. Press “Ask for me” and the tour fills in the Friday example and sends it. The platform first checks it hasn’t been answered already and that the budget allows it.',
    route: () => '/ask',
  },
  {
    title: 'Watch the job run',
    body: 'One member’s AI takes the job and checks in every 15 seconds. When it hands in, a different member’s AI redoes the work on its own. Watch the agreement score in the middle.',
    route: (id) => (id ? `/jobs/${id}` : '/board'),
  },
  {
    title: 'A person decides',
    body: 'When both AIs agree, the editor AI writes a draft and the job waits here. No AI can publish. Once your job arrives (about 23 seconds after you asked), approve it.',
    route: () => '/review',
  },
  {
    title: 'What viewers see',
    body: 'Approved posts appear with when the data was seen, when it was published, when it expires and what would prove it wrong. Expired and withdrawn posts are never hidden.',
    route: () => '/published',
  },
  {
    title: 'Where the money went',
    body: 'Each job sets aside the most it may cost before it starts. A job is refused if it would pass the $25 daily limit or the member’s own $5 limit.',
    route: () => '/budgets',
  },
  {
    title: 'Members stay in control',
    body: 'Members choose their roles, hours and limits, and can pause at any time. A paused member’s AI gets no new jobs. Try pausing someone.',
    route: () => '/contributors',
  },
  {
    title: 'A record that can’t be changed quietly',
    body: 'Each entry carries a fingerprint of the one before it. Press “Try changing an old entry”, then “Check the chain”: it breaks at entry 8. Then undo the change and check again.',
    route: () => '/audit',
  },
];

export function Tour() {
  const step = useSwarm((st) => st.tourStep);
  const setStep = useSwarm((st) => st.setTourStep);
  const speed = useSwarm((st) => st.speed);
  const setSpeed = useSwarm((st) => st.setSpeed);
  const jobs = useSwarm((st) => st.jobs);
  const submit = useSwarm((st) => st.submitQuestion);
  const approve = useSwarm((st) => st.approve);
  const tamperOld = useSwarm((st) => st.tamperOld);
  const checkChain = useSwarm((st) => st.checkChain);
  const tamper = useSwarm((st) => st.tamper);
  const chainCheck = useSwarm((st) => st.chainCheck);
  const undoTamper = useSwarm((st) => st.undoTamper);
  const togglePause = useSwarm((st) => st.togglePause);
  const members = useSwarm((st) => st.members);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // The tour remembers its own job only in memory.
  const jobId = useRef<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (step === null) return;
    const target = STEPS[step].route(jobId.current);
    if (pathname !== target) navigate(target);
    cardRef.current?.focus();
    // navigate only when the step changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (step === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setStep(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, setStep]);

  if (step === null) return null;
  const cur = STEPS[step];
  const tourJob = jobs.find((j) => j.id === jobId.current);

  const askForMe = () => {
    const r = submit({
      question: EXAMPLE_FRESH,
      role: ASKABLE_ROLES[1],
      maxCost: 1.5,
      period: 'Last 2 years',
    });
    if (r.kind === 'created') {
      jobId.current = r.id;
      setStep(2);
    }
  };

  const gustavo = members.find((m) => m.id === 'gustavo');

  let action: React.ReactNode = null;
  if (step === 1) {
    action = tourJob ? (
      <span className={s.done}>
        <Icon name="check" size={14} /> Sent as {tourJob.id}
      </span>
    ) : (
      <button type="button" className="btn btn-primary btn-sm" onClick={askForMe}>
        Ask for me
      </button>
    );
  } else if (step === 3) {
    if (!tourJob) action = <span className="muted small">Go back a step and ask first.</span>;
    else if (tourJob.state === 'human')
      action = (
        <button type="button" className="btn btn-good btn-sm" onClick={() => approve(tourJob.id)}>
          Approve {tourJob.id} for me
        </button>
      );
    else if (tourJob.state === 'published')
      action = (
        <span className={s.done}>
          <Icon name="check" size={14} /> {tourJob.id} published
        </span>
      );
    else
      action = (
        <span className="muted small">
          {tourJob.id} is still running, step {tourJob.step + 1} of 10…
        </span>
      );
  } else if (step === 6 && gustavo) {
    action = (
      <button type="button" className="btn btn-sm" onClick={() => togglePause('gustavo')}>
        {gustavo.online ? 'Pause Gustavo R. for me' : 'Resume Gustavo R.'}
      </button>
    );
  } else if (step === 7) {
    if (!tamper && chainCheck?.ok)
      action = (
        <>
          <span className={s.done}>
            <Icon name="check" size={14} /> Chain intact again
          </span>
          <button type="button" className="btn btn-sm btn-ghost" onClick={tamperOld}>
            Try again
          </button>
        </>
      );
    else if (!tamper)
      action = (
        <button type="button" className="btn btn-sm" onClick={tamperOld}>
          Change entry 8
        </button>
      );
    else if (!chainCheck)
      action = (
        <button type="button" className="btn btn-primary btn-sm" onClick={() => checkChain()}>
          Check the chain
        </button>
      );
    else
      action = (
        <button type="button" className="btn btn-bad btn-sm" onClick={() => undoTamper()}>
          Undo the change
        </button>
      );
  }

  return (
    <div
      className={s.card}
      role="dialog"
      aria-modal="false"
      aria-labelledby="tour-title"
      tabIndex={-1}
      ref={cardRef}
    >
      <div className={s.top}>
        <span className={s.count}>
          Tour · {step + 1} of {STEPS.length}
        </span>
        <button
          type="button"
          className={s.close}
          onClick={() => setStep(null)}
          aria-label="Close the tour"
        >
          <Icon name="x" size={16} />
        </button>
      </div>
      <div className={s.progress} aria-hidden>
        {STEPS.map((_, i) => (
          <span key={i} className={i <= step ? s.on : undefined} />
        ))}
      </div>
      <h2 id="tour-title" className={s.title}>
        {cur.title}
      </h2>
      <p className={s.body}>{cur.body}</p>
      {action && <div className={s.action}>{action}</div>}
      <div className={s.foot}>
        <label className={s.speed}>
          <input
            type="checkbox"
            checked={speed > 1}
            onChange={(e) => setSpeed(e.target.checked ? 3 : 1)}
          />
          Fast simulation
        </label>
        <div className={s.nav}>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            disabled={step === 0}
            onClick={() => setStep(step - 1)}
          >
            <Icon name="back" size={14} /> Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => setStep(step + 1)}
            >
              Next <Icon name="forward" size={14} />
            </button>
          ) : (
            <button type="button" className="btn btn-sm btn-primary" onClick={() => setStep(null)}>
              Finish
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
