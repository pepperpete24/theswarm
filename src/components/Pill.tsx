import { LIBRARY_KIND, ideaStatus, missionStatus, type Tone } from '../domain/status';
import type { IdeaState, LibraryKind, Mission } from '../domain/types';
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

export function MissionPill({ mission }: { mission: Mission }) {
  const { label, tone } = missionStatus(mission);
  return (
    <Pill tone={tone} pulse={tone === 'run' || tone === 'warn'}>
      {label}
    </Pill>
  );
}

export function IdeaPill({ state }: { state: IdeaState }) {
  const { label, tone } = ideaStatus(state);
  return (
    <Pill tone={tone} pulse={state === 'testing' || state === 'fresh-check'}>
      {label}
    </Pill>
  );
}

export function KindPill({ kind }: { kind: LibraryKind }) {
  const [label, tone] = LIBRARY_KIND[kind];
  return <Pill tone={tone}>{label}</Pill>;
}
