import type { Idea } from './types';

type ById = Record<string, Idea>;

/** Every idea this one was built from, all the way back. */
export function ancestors(id: string, byId: ById): Set<string> {
  const out = new Set<string>();
  const walk = (x: string) => {
    for (const p of byId[x]?.parentIds ?? []) {
      if (!out.has(p)) {
        out.add(p);
        walk(p);
      }
    }
  };
  walk(id);
  return out;
}

/** Members who proposed this idea or anything on its lineage. They may not judge it. */
export function lineageMembers(id: string, byId: ById): Set<string> {
  const out = new Set<string>();
  const self = byId[id];
  if (self) out.add(self.proposedBy);
  for (const a of ancestors(id, byId)) if (byId[a]) out.add(byId[a].proposedBy);
  return out;
}

/** Alternatives may be spawned only up to the mission's depth limit. */
export const canSpawn = (parentDepth: number, maxDepth: number) => parentDepth + 1 <= maxDepth;

export interface TreeNode {
  idea: Idea;
  col: number;
  row: number;
}

/**
 * The family tree: originals that have children, plus every alternative,
 * laid out in columns by depth.
 */
export function buildTree(ideas: Idea[]): { nodes: TreeNode[]; edges: [string, string][] } {
  const byId: ById = Object.fromEntries(ideas.map((i) => [i.id, i]));
  const parentsUsed = new Set(ideas.flatMap((i) => i.parentIds));
  const shown = ideas.filter((i) => i.depth > 0 || parentsUsed.has(i.id));
  const cols = new Map<number, Idea[]>();
  for (const i of shown) cols.set(i.depth, [...(cols.get(i.depth) ?? []), i]);
  const nodes: TreeNode[] = [];
  for (const [col, list] of [...cols.entries()].sort((a, b) => a[0] - b[0])) {
    list.forEach((idea, row) => nodes.push({ idea, col, row }));
  }
  const edges: [string, string][] = [];
  for (const i of shown) for (const p of i.parentIds) if (byId[p]) edges.push([p, i.id]);
  return { nodes, edges };
}
