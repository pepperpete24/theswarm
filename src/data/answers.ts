import { normaliseQuestion } from '../domain/dedupe';
import type { ResultRow } from '../domain/types';
import { EXAMPLE_FRESH } from './constants';

/** Made-up answers the simulated AIs give to new questions. */
export interface CannedAnswer {
  finding: string;
  recheck: string;
  /** Used when the re-check disagrees (the "Show a challenge" option). */
  challengeRecheck: string;
  draft: string;
  provenWrongIf: string;
  resultTable?: ResultRow[];
  recheckTable?: ResultRow[];
}

const library: Record<string, CannedAnswer> = {
  [normaliseQuestion(EXAMPLE_FRESH)]: {
    finding:
      'Yes. Over the last 2 years, the average hourly range on Fridays was 11% wider than on Monday to Thursday. Most of the extra movement comes after 13:30 UTC, when US data is released.',
    recheck:
      'Yes. Re-ran it from scratch: Friday hourly ranges were 10% wider than other weekdays, with the gap mostly in the US afternoon.',
    challengeRecheck:
      'Not clearly. Friday ranges were 4% wider, but the difference disappears once the 8 US jobs-report Fridays are removed. The first answer may be measuring the jobs report, not Fridays.',
    draft:
      'EURUSD tends to move more on Fridays. Over the past two years, Friday’s average hourly price range was about 10% wider than on other weekdays, mostly in the afternoon when US economic data comes out. Two AIs reached this answer independently.',
    provenWrongIf:
      'Over the next 8 weeks, Friday ranges are no wider than the Monday-to-Thursday average.',
    resultTable: [
      ['Mon–Thu', '18.2 pips', 'baseline'],
      ['Friday', '20.2 pips', '+11%'],
      ['Fri after 13:30', '24.9 pips', '+37%'],
    ],
    recheckTable: [
      ['Mon–Thu', '18.3 pips', 'baseline'],
      ['Friday', '20.1 pips', '+10%'],
      ['Fri after 13:30', '24.6 pips', '+34%'],
    ],
  },
};

export function answerFor(question: string, role: string, period: string): CannedAnswer {
  const known = library[normaliseQuestion(question)];
  if (known) return known;
  const q = question.trim().replace(/\?$/, '');
  return {
    finding: `Using ${period.toLowerCase()} of shared EURUSD data, the ${role.toLowerCase()} found a modest but consistent pattern for “${q}”. The effect is small, so it is reported with its limits and an expiry.`,
    recheck: `Re-ran the same question on the same data snapshot without seeing the first answer. Found the same pattern with a slightly smaller effect.`,
    challengeRecheck: `Re-ran it on the same data and could not find the same pattern once the three busiest news days were removed. The first answer may depend on a handful of days.`,
    draft: `Two AIs looked independently at ${period.toLowerCase()} of EURUSD data for “${q}” and found the same modest pattern. The effect is small, so treat it as a starting point for more research, not a rule.`,
    provenWrongIf: 'A fresh run on next month’s data gives a different answer.',
  };
}
