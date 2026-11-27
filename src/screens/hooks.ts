import { useSwarm } from '../store/useSwarm';
import type { Idea, Member, Mission } from '../domain/types';

export const useWorld = () => useSwarm((st) => st.world);

export function ideasOf(mission: Mission | undefined, ideas: Record<string, Idea>): Idea[] {
  return mission ? mission.ideaIds.map((id) => ideas[id]).filter(Boolean) : [];
}

export const findMember = (members: Member[], id?: string) => members.find((m) => m.id === id);

export const KIND_LABEL: Record<Mission['kind'], string> = {
  open: 'Open mission',
  challenge: 'Challenge to a current best',
  'different-route': 'Different-route mission',
  descriptive: 'Descriptive question',
};
