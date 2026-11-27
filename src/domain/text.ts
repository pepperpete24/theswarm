const STOP = new Set(
  'a an the and or of for to in on at by with from is are be can we our it its this that there way better find best handle how does do did any more most than into over under about which what when who why using use usual usually'.split(
    ' ',
  ),
);

/** Lower-case meaningful words, with simple plurals removed ("stop-losses" -> "stop-loss"). */
export function tokens(text: string): Set<string> {
  const out = new Set<string>();
  for (const raw of text.toLowerCase().split(/[^a-z0-9-]+/)) {
    let w = raw.replace(/^-+|-+$/g, '');
    if (w.length < 2 || STOP.has(w)) continue;
    if (w.endsWith('ses')) w = w.slice(0, -2);
    else if (w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
    if (!STOP.has(w)) out.add(w);
  }
  return out;
}

export function overlap(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const w of a) if (b.has(w)) n++;
  return n;
}
