import type { Job } from './types';

/** Case-insensitive, ignores extra spaces and trailing punctuation. */
export function normaliseQuestion(q: string): string {
  return q
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[?.!\s]+$/, '')
    .toLowerCase();
}

/** "Already studied?" A question matches a job that is published or waiting for a person. */
export function findStudied(question: string, jobs: Job[]): Job | undefined {
  const key = normaliseQuestion(question);
  if (!key) return undefined;
  return jobs.find(
    (j) =>
      (j.state === 'published' || j.state === 'human') && normaliseQuestion(j.question) === key,
  );
}
