/** A seeded random walk of made-up EURUSD prices: 96 points, one every 15 minutes. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const PRICE_CENTRE = 1.0512;
export const PRICE_POINTS = 96;

export function makePrices(seed = 20261126, n = PRICE_POINTS): number[] {
  const rand = mulberry32(seed);
  const raw: number[] = [];
  // A little momentum makes the walk look like a real, gently trending market.
  let p = 0;
  let v = 0;
  for (let i = 0; i < n; i++) {
    v = v * 0.72 + (rand() - 0.46) * 0.00016;
    p += v;
    raw.push(p);
  }
  const mean = raw.reduce((s, x) => s + x, 0) / n;
  return raw.map((x) => Math.round((PRICE_CENTRE + x - mean) * 100000) / 100000);
}

export const prices = makePrices();
