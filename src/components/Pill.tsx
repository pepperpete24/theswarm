import type { Tone } from '../domain/status';
import { jobStatus } from '../domain/status';
import type { Job } from '../domain/types';
import s from './Pill.module.css';

export function Pill({
  tone,
  children,
  pulse,
}: {
  tone: Tone;
  children: React.ReactNode;
  pulse?: boolean;
}) {
  return (
    <span className={`${s.pill} ${s[tone]}`}>
      <span className={`${s.dot} ${pulse ? s.pulse : ''}`} aria-hidden />
      {children}
    </span>
  );
}

export function JobPill({ job }: { job: Job }) {
  const { label, tone } = jobStatus(job);
  return (
    <Pill tone={tone} pulse={tone === 'run' || tone === 'warn'}>
      {label}
    </Pill>
  );
}
