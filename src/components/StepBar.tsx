import { STEPS, STEP_EXPLAIN } from '../data/constants';
import type { JobState } from '../domain/types';
import s from './StepBar.module.css';

/**
 * Ten segments. Done steps in the accent colour, the current step pulsing amber,
 * red when the job is challenged, rejected or withdrawn.
 * With no state it is the explainer version used on the Overview.
 */
export function StepBar({
  step,
  state,
  showLabels = true,
}: {
  step?: number;
  state?: JobState;
  showLabels?: boolean;
}) {
  const failed = state === 'challenged' || state === 'rejected' || state === 'withdrawn';
  const finished = state === 'published';
  return (
    <ol
      className={s.bar}
      aria-label={step === undefined ? 'The ten steps' : `Step ${step + 1} of 10: ${STEPS[step]}`}
    >
      {STEPS.map((name, i) => {
        let cls = s.todo;
        if (step === undefined) cls = s.plain;
        else if (i < step || (finished && i <= step)) cls = s.done;
        else if (i === step) cls = failed ? s.failed : s.current;
        return (
          <li
            key={name}
            className={`${s.seg} ${cls}`}
            title={`${i + 1}. ${name}: ${STEP_EXPLAIN[i]}`}
            tabIndex={0}
          >
            <span className={s.track} />
            {showLabels && (
              <span className={s.label}>
                <span className={s.n}>{String(i + 1).padStart(2, '0')}</span>
                <span className={s.name}>{name}</span>
              </span>
            )}
            <span className={s.tip} role="tooltip">
              <strong>
                {i + 1}. {name}
              </strong>
              {STEP_EXPLAIN[i]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
