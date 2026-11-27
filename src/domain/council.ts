import { lineageMembers } from './lineage';
import type { CouncilSession, Idea, Member, Seat } from './types';

type ById = Record<string, Idea>;

const SEATS: { seat: Seat; role: string; n: number }[] = [
  { seat: 'chair', role: 'Council chair', n: 1 },
  { seat: 'red-team', role: 'Red team', n: 2 },
  { seat: 'synthesiser', role: 'Synthesiser', n: 1 },
  { seat: 'advocate', role: 'Explorer', n: 2 },
  { seat: 'specialist', role: 'Market regime analyst', n: 1 },
];

/**
 * Seat a rotating council from online members. `turn` rotates who sits,
 * so the same people don't hold every seat.
 */
export function seatCouncil(members: Member[], turn = 0): CouncilSession['panel'] {
  const online = members.filter((m) => m.online);
  const used = new Set<string>();
  const panel: CouncilSession['panel'] = [];
  for (const s of SEATS) {
    const pool = online.filter((m) => m.roles.includes(s.role) && !used.has(m.id));
    const rotated = pool.map((_, i) => pool[(i + turn) % pool.length]);
    for (const m of rotated.slice(0, s.n)) {
      used.add(m.id);
      panel.push({ memberId: m.id, seat: s.seat });
    }
  }
  return panel;
}

/** Panel members who may judge this idea: nobody on its own lineage. */
export function judgesFor(ideaId: string, panel: CouncilSession['panel'], byId: ById) {
  const lineage = lineageMembers(ideaId, byId);
  return panel.filter((p) => !lineage.has(p.memberId));
}

/** The red-team seat that raises an objection on this idea (never one on its lineage). */
export function redTeamFor(ideaId: string, panel: CouncilSession['panel'], byId: ById, n = 0) {
  const ok = judgesFor(ideaId, panel, byId);
  const red = ok.filter((p) => p.seat === 'red-team');
  const list = red.length ? red : ok;
  return list.length ? list[n % list.length].memberId : undefined;
}

export const SEAT_LABEL: Record<Seat, string> = {
  chair: 'Chair',
  advocate: 'Advocate',
  'red-team': 'Red team',
  synthesiser: 'Synthesiser',
  specialist: 'Specialist',
};
