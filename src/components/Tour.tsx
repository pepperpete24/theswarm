import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { EXAMPLE_FRESH, PHASES } from '../data/constants';
import { phaseIndex } from '../domain/status';
import { useSwarm } from '../store/useSwarm';
import { Icon } from './Icon';
import s from './Tour.module.css';

interface Step {
  title: string;
  body: string;
  route: (missionId: string | null) => string;
}

const STEPS: Step[] = [
  {
    title: 'A swarm, not a relay',
    body: 'Members lend their own agents (Claude or Codex) to a shared swarm studying EURUSD. Many agents work on a goal at once, a council judges the evidence, and the council approves what is published. Nobody needs to click anything.',
    route: () => '/',
  },
  {
    title: 'One mission, 47 ideas',
    body: 'M-12 is trying to beat the current stop-loss best. Every dot is an idea from a member’s agent. The dashed line is the bar to beat: it rises as more ideas are tried, so a lucky result can’t pass as a discovery.',
    route: () => '/missions/M-12',
  },
  {
    title: 'The council',
    body: 'The red team upheld two objections: one idea was overfitted, another used a price that wasn’t known yet. The synthesiser turned the overfitted model into a cheaper, simpler rule. Verdicts come from the gates, not votes.',
    route: () => '/council/C-12-1',
  },
  {
    title: 'Where alternatives come from',
    body: 'The family tree shows how alternatives grew from earlier ideas, including the cheaper route built from the rejected model. Alternatives can spawn alternatives, up to the depth limit.',
    route: () => '/missions/M-12?tab=tree',
  },
  {
    title: 'Start a mission',
    body: 'Press “Launch for me”. The tour fills in the take-profit goal, the library is checked, and it runs at 2× speed. Notice the current best it has to beat.',
    route: () => '/new',
  },
  {
    title: 'Watch the whole swarm work',
    body: 'Ideas arrive from many members, including the Pathfinder’s different routes. Code tests them, the council judges them, alternatives go back to the swarm, and the shortlist is checked on sealed fresh data.',
    route: (id) => (id ? `/missions/${id}` : '/missions'),
  },
  {
    title: 'The council approves',
    body: 'A fresh panel of 5, across two AI providers, none of whom worked on it, votes with reasons. It needs 4 of 5 and no reject citing a broken rule. Then it publishes by itself. The Red team v4 promotion panel is voting too.',
    route: () => '/approvals',
  },
  {
    title: 'It remembers, including the failures',
    body: 'Proven findings, dead ends, warnings and open questions all go into the library, so the next mission starts smarter. Open questions can become missions the swarm starts on its own.',
    route: () => '/library',
  },
  {
    title: 'Every result is there to be beaten',
    body: 'Your mission’s winner became the take-profit current best, and the Challenger has already queued a challenge to it. The Coach reviews how each mission went; changes, even to the approval rule, must beat what they replace.',
    route: () => '/improvement',
  },
  {
    title: 'Does it earn its keep?',
    body: 'The swarm compared against simpler set-ups on the same missions, with costs counted. The numbers are honest: at the same budget it only narrowly beats a small team.',
    route: () => '/scoreboard',
  },
  {
    title: 'A record that can’t be changed quietly',
    body: 'Change entry 8 (a council verdict), then check the chain: it breaks at entry 8. Undo it. Meanwhile the swarm has already queued its next missions by itself.',
    route: () => '/audit',
  },
];

export function Tour() {
  const step = useSwarm((st) => st.tourStep);
  const setStep = useSwarm((st) => st.setTourStep);
  const speed = useSwarm((st) => st.speed);
  const setSpeed = useSwarm((st) => st.setSpeed);
  const missions = useSwarm((st) => st.world.missions);
  const launch = useSwarm((st) => st.launch);
  const tamperOld = useSwarm((st) => st.tamperOld);
  const checkChain = useSwarm((st) => st.checkChain);
  const tamper = useSwarm((st) => st.tamper);
  const chainCheck = useSwarm((st) => st.chainCheck);
  const undoTamper = useSwarm((st) => st.undoTamper);
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const missionId = useRef<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (step === null) return;
    const target = STEPS[step].route(missionId.current);
    if (pathname + search !== target) navigate(target);
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
  const tm = missions.find((m) => m.id === missionId.current);

  const launchForMe = () => {
    setSpeed(2);
    const r = launch({ goal: EXAMPLE_FRESH, budget: 40, swarmSize: 'whole' });
    if (r.kind === 'created') {
      missionId.current = r.id;
      setStep(5);
    }
  };

  let action: React.ReactNode = null;
  if (step === 4) {
    action = tm ? (
      <span className={s.done}>
        <Icon name="check" size={14} /> Launched as {tm.id}
      </span>
    ) : (
      <button type="button" className="btn btn-primary btn-sm" onClick={launchForMe}>
        Launch for me
      </button>
    );
  } else if (step === 5 || step === 6 || step === 8) {
    if (!tm) action = <span className="muted small">Go back to step 5 and launch first.</span>;
    else {
      const i = phaseIndex(tm.phase);
      action = (
        <span className={tm.phase === 'learned' ? s.done : 'muted small'}>
          {tm.phase === 'learned' && <Icon name="check" size={14} />} {tm.id}:{' '}
          {i >= 0 ? `phase ${i + 1} of 10, ${PHASES[i]}` : tm.phase}
          {tm.phase === 'learned' ? ', done' : '…'}
        </span>
      );
    }
  } else if (step === 10) {
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
      <div
        className={s.progress}
        style={{ gridTemplateColumns: `repeat(${STEPS.length}, 1fr)` }}
        aria-hidden
      >
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
            onChange={(e) => setSpeed(e.target.checked ? 2 : 1)}
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
