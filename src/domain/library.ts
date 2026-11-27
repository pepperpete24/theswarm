import { overlap, tokens } from './text';
import type { LibraryEntry, Mission, Topic } from './types';

export const RUNNING_PHASES = [
  'brief',
  'library',
  'explore',
  'test',
  'council',
  'alternatives',
  'fresh',
  'approval',
] as const;

export const isRunning = (m: Mission) => (RUNNING_PHASES as readonly string[]).includes(m.phase);

export interface LibraryCheck {
  reuse: LibraryEntry[];
  deadEnds: LibraryEntry[];
  warnings: LibraryEntry[];
  running?: Mission;
  topic?: Topic;
  savedUsd: number;
}

const textOf = (e: LibraryEntry) => `${e.title} ${e.text}`;

/** Keyword search of the library and running missions. No AI involved. */
export function checkLibrary(
  goal: string,
  library: LibraryEntry[],
  missions: Mission[],
  topics: Topic[] = [],
): LibraryCheck {
  const g = tokens(goal);
  const hits = (kind: LibraryEntry['kind'][]) =>
    library
      .filter((e) => kind.includes(e.kind) && overlap(g, tokens(textOf(e))) >= 2)
      .sort((a, b) => overlap(g, tokens(textOf(b))) - overlap(g, tokens(textOf(a))))
      .slice(0, 3);
  const reuse = hits(['proven', 'method']);
  const deadEnds = hits(['dead-end']);
  const warnings = hits(['warning']);
  const running = missions.find((m) => {
    if (!isRunning(m) && m.phase !== 'queued') return false;
    const t = tokens(`${m.title} ${m.goal}`);
    const n = overlap(g, t);
    return n >= 3 && n >= 0.6 * Math.min(g.size, t.size);
  });
  return {
    reuse,
    deadEnds,
    warnings,
    running,
    topic: topicFor(goal, topics),
    savedUsd: +reuse
      .reduce((s, e) => s + Math.min(e.savedUsd / Math.max(1, e.reusedCount), 2.4), 0)
      .toFixed(2),
  };
}

/** The strategy-rule topic a goal belongs to, if any. */
export function topicFor(goal: string, topics: Topic[]): Topic | undefined {
  const g = tokens(goal);
  let best: Topic | undefined;
  let score = 0;
  for (const t of topics) {
    const n = overlap(g, new Set(t.keywords));
    if (n > score) {
      best = t;
      score = n;
    }
  }
  return score >= 1 ? best : undefined;
}
