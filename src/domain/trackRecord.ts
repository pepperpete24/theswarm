import type { Member } from './types';

type Stat = 'ideasProposed' | 'passedCouncil' | 'heldUpFresh' | 'objectionsUpheld';

/** Credit only for work that held up. Volume alone earns nothing but the count. */
export function credit(members: Member[], ids: string[], stat: Stat, by = 1): Member[] {
  if (!ids.length) return members;
  const counts = new Map<string, number>();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + by);
  return members.map((m) => (counts.has(m.id) ? { ...m, [stat]: m[stat] + counts.get(m.id)! } : m));
}

/** Calibration moves towards how well a member's predicted effect matched the test. */
export function calibrate(members: Member[], id: string, matched: boolean): Member[] {
  return members.map((m) =>
    m.id === id
      ? {
          ...m,
          calibration: Math.max(0, Math.min(100, Math.round(m.calibration + (matched ? 2 : -3)))),
        }
      : m,
  );
}

/** Whose ideas are tested first when the queue is full. Never decides what is true. */
export const standing = (m: Member) =>
  m.heldUpFresh * 3 + m.passedCouncil + m.objectionsUpheld + m.calibration / 25;
