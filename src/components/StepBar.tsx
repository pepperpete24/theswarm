import { PHASES, PHASE_EXPLAIN } from '../data/constants';
import { phaseIndex } from '../domain/status';
import type { Mission } from '../domain/types';
import s from './StepBar.module.css';

/**
 * Ten phases. Done phases in the accent colour, the current one pulsing amber,
 * red when the mission was withdrawn or not published. With no mission it is the
 * explainer version used on the Overview.
 */
export function PhaseBar({
  mission,
  showLabels = true,
}: {
  mission?: Mission;
  showLabels?: boolean;
}) {
  const step = mission ? phaseIndex(mission.phase) : undefined;
  const failed = mission && ['withdrawn', 'not-published', 'stopped'].includes(mission.phase);
  const closed = mission?.phase === 'closed-no-winner';
  const finished = mission?.phase === 'learned';
  return (
    <ol
      className={s.bar}
      aria-label={
        step === undefined
          ? 'The ten phases of a mission'
          : step < 0
            ? 'Queued, not started yet'
            : `Phase ${step + 1} of 10: ${PHASES[step]}${mission && mission.round > 1 ? `, round ${mission.round}` : ''}`
      }
    >
      {PHASES.map((name, i) => {
        let cls = s.todo;
        if (step === undefined) cls = s.plain;
        else if (i < step || (finished && i <= step)) cls = s.done;
        else if (i === step) cls = failed ? s.failed : closed ? s.closed : s.current;
        const loop =
          mission && i >= 2 && i <= 5 && mission.round > 1 && step !== undefined && step >= 2;
        return (
          <li
            key={name}
            className={`${s.seg} ${cls}`}
            title={`${i + 1}. ${name}: ${PHASE_EXPLAIN[i]}`}
            tabIndex={0}
          >
            <span className={`${s.track} ${loop ? s.loop : ''}`} />
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
              {PHASE_EXPLAIN[i]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
