import { DEMO_START } from '../data/constants';

let origin = Date.now();

/** Restart the demo clock (used by tests). */
export function resetClock(now = Date.now()) {
  origin = now;
}

/** Seconds since 00:00 on the demo clock. */
export function demoSeconds(now = Date.now()): number {
  const base = DEMO_START.h * 3600 + DEMO_START.m * 60 + DEMO_START.s;
  return base + Math.floor((now - origin) / 1000);
}

export function fmtClock(totalSeconds: number, withSeconds = true): string {
  const t = ((totalSeconds % 86400) + 86400) % 86400;
  const h = String(Math.floor(t / 3600)).padStart(2, '0');
  const m = String(Math.floor((t % 3600) / 60)).padStart(2, '0');
  const s = String(t % 60).padStart(2, '0');
  return withSeconds ? `${h}:${m}:${s}` : `${h}:${m}`;
}

export function demoTime(): string {
  return fmtClock(demoSeconds());
}
