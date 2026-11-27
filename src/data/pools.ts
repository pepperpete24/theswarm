import type { IdeaFamily } from '../domain/types';

/**
 * Idea pools the simulator draws from. Every pool has the same shape so the
 * same outcome profile (src/domain/simulator.ts) fits any of them:
 * 14 originals (slot 13 is always a known dead end), 3 Pathfinder ideas,
 * 3 alternatives from the synthesiser and 3 follow-ups.
 */
export interface PoolIdea {
  title: string;
  summary: string;
  family: IdeaFamily;
  key: string;
}

export interface Pool {
  id: string;
  originals: PoolIdea[];
  pathfinder: PoolIdea[];
  alternatives: (PoolIdea & {
    parents: string[];
    kind: 'combination' | 'cheaper-route';
    why: string;
  })[];
  followups: (PoolIdea & { parent: string })[];
  objections: {
    costs: { text: string; answer: string };
    overfitting: string;
    lookAhead: string;
    fewTrades: string;
  };
  /** {gain} {fresh} {alt} {altGain} are filled in from the results. */
  draft: { call: string; v1: string; v2: string };
  provenWrongIf: string;
  openQuestion: string;
  deadEndLesson: string;
  warningLesson: string;
}

export const TAKE_PROFIT: Pool = {
  id: 'take-profit',
  originals: [
    {
      title: 'Target at 2× average true range (ATR)',
      summary:
        'Set the profit target from recent volatility instead of a fixed multiple of the risk.',
      family: 'volatility',
      key: 'tp-atr-2',
    },
    {
      title: 'Take half at 1× risk, trail the rest',
      summary:
        'Bank half the position once it is up by its risk, then let the rest run with a trailing stop.',
      family: 'trailing',
      key: 'tp-partial-trail',
    },
    {
      title: 'Time exit: close after 12 bars',
      summary: 'If the target hasn’t been hit within three hours, close the trade.',
      family: 'time',
      key: 'tp-time-12',
    },
    {
      title: 'Wider targets in volatile weeks',
      summary: 'Use a 3× risk target when the week is volatile and 2× when it is calm.',
      family: 'volatility',
      key: 'tp-vol-regime',
    },
    {
      title: 'Machine-learned target distance',
      summary: 'A gradient-boosting model picks the target for each trade from 40 inputs.',
      family: 'model',
      key: 'tp-ml',
    },
    {
      title: 'Exit at the previous day’s high or low',
      summary: 'Target the prior day’s extreme in the direction of the trade.',
      family: 'structure',
      key: 'tp-prev-day',
    },
    {
      title: 'Trail a stop at 1× ATR once in profit',
      summary: 'No fixed target: trail a volatility-based stop after the trade moves into profit.',
      family: 'trailing',
      key: 'tp-atr-trail',
    },
    {
      title: 'Close before the New York session ends',
      summary: 'Exit every open trade 30 minutes before the New York close.',
      family: 'session',
      key: 'tp-session-ny',
    },
    {
      title: 'Smaller target: 1.5× risk',
      summary: 'Take profits sooner, at 1.5 times the risk.',
      family: 'target',
      key: 'tp-fixed-1.5r',
    },
    {
      title: 'Exit at the next round number',
      summary: 'Target the next price ending in 00 or 50.',
      family: 'structure',
      key: 'tp-round-number',
    },
    {
      title: 'Exit when momentum fades',
      summary: 'Close when the 14-bar momentum reading turns against the trade.',
      family: 'model',
      key: 'tp-momentum',
    },
    {
      title: 'Target the far edge of the breakout range',
      summary: 'Use the height of the range the price broke out of as the target.',
      family: 'structure',
      key: 'tp-range-edge',
    },
    {
      title: 'Scale the target with the breakout bar’s size',
      summary: 'Bigger breakout bars get bigger targets.',
      family: 'volatility',
      key: 'tp-bar-size',
    },
    {
      title: 'Fixed 3× risk target',
      summary: 'Aim for three times the risk on every trade.',
      family: 'target',
      key: 'tp-fixed-3r',
    },
  ],
  pathfinder: [
    {
      title: 'No target: exit when the breakout fails back inside its range',
      summary: 'A different route: hold until the price falls back into the range it broke out of.',
      family: 'structure',
      key: 'tp-pf-fail-exit',
    },
    {
      title: 'Skip the target; trade smaller and let a time exit do the work',
      summary: 'A different route: halve the size, drop the target and close after a fixed time.',
      family: 'time',
      key: 'tp-pf-size-time',
    },
    {
      title: 'Use the day’s expected move as the target',
      summary: 'A different route: set the target from the typical daily range for that weekday.',
      family: 'volatility',
      key: 'tp-pf-daily-range',
    },
  ],
  alternatives: [
    {
      title: 'ATR target with a partial exit at 1× risk',
      summary: 'Combines the ATR target with banking half at 1× risk.',
      family: 'combined',
      key: 'tp-alt-atr-partial',
      parents: ['o0', 'o1'],
      kind: 'combination',
      why: 'The two strongest ideas fix different weaknesses: the ATR target adapts to volatility, the partial exit protects gains when the move stalls.',
    },
    {
      title: 'Simple rule instead of the model: 2× ATR in volatile weeks, 1.5× in calm ones',
      summary: 'A cheaper route to what the machine-learned target was finding.',
      family: 'volatility',
      key: 'tp-alt-simple-rule',
      parents: ['o4', 'o3'],
      kind: 'cheaper-route',
      why: 'Most of the model’s gain came from one input, the week’s volatility. A two-line rule gets about 90% of the gain at a tenth of the cost, with nothing to overfit.',
    },
    {
      title: 'Breakout-failure exit plus a 12-bar time exit',
      summary: 'The Pathfinder’s exit, with a time limit so trades don’t drift.',
      family: 'combined',
      key: 'tp-alt-fail-time',
      parents: ['p0', 'o2'],
      kind: 'combination',
      why: 'The failure exit kept winners running but left some trades open for days; the time exit caps that.',
    },
  ],
  followups: [
    {
      title: 'ATR target, partial exit and a 10-bar time exit',
      summary: 'Adds a time exit to the strongest combination.',
      family: 'combined',
      key: 'tp-fu-atr-partial-time',
      parent: 'a0',
    },
    {
      title: 'Partial exit at 1.5× risk instead of 1×',
      summary: 'Banks half a little later.',
      family: 'trailing',
      key: 'tp-fu-partial-1.5',
      parent: 'o1',
    },
    {
      title: 'Volatile-week targets measured on 1-hour bars',
      summary: 'Same rule, slower volatility measure.',
      family: 'volatility',
      key: 'tp-fu-vol-1h',
      parent: 'o3',
    },
  ],
  objections: {
    costs: {
      text: 'Were costs counted on the partial exits? Two exits per trade means two spreads.',
      answer:
        'Yes: the test plan charges the spread and slippage on both exits. The result is after costs.',
    },
    overfitting:
      'The model tried 600 parameter sets on 40 inputs. A result this good after that much tuning is likely fitted to the past.',
    lookAhead:
      'The previous day’s high is used before the day has finished in about a fifth of trades: that price wasn’t known yet.',
    fewTrades:
      'Only 84 trades reached the trailing stage. That is too few to tell skill from luck.',
  },
  draft: {
    call: 'Set your profit target at 2× ATR and take half off at 1× risk on every EURUSD breakout. It beats the fixed 2× target by {gain} points.',
    v1: 'On 15-minute EURUSD breakout trades, a profit target of 2× the average true range with half taken off at 1× risk beat the current fixed 2× risk target by {gain} percentage points after costs over the last 24 months, and by {fresh} points on the sealed most recent 3 months. A cheaper variant ({alt}) did nearly as well ({altGain} points). This is research on past data, not a trade instruction.',
    v2: 'On 15-minute EURUSD breakout trades, a profit target of 2× the average true range with half taken off at 1× risk did better than the current fixed 2× risk target by {gain} percentage points after costs over the last 24 months, and by {fresh} points on the sealed most recent 3 months. A cheaper variant ({alt}) did nearly as well ({altGain} points). Results may differ in other market conditions. This is research on past data, not a trade instruction.',
  },
  provenWrongIf:
    'Over the next 3 months of paper results it does no better than the fixed 2× target after costs.',
  openQuestion: 'Does the ATR target with a partial exit work on GBPUSD breakouts?',
  deadEndLesson:
    'Machine-learned target distance: the gain came from overfitting 600 parameter sets.',
  warningLesson:
    'Adding a 10-bar time exit to the ATR + partial combination was fitted to the test window and didn’t hold up on fresh data.',
};

export const ENTRY_TIMING: Pool = {
  id: 'entry-timing',
  originals: [
    {
      title: 'Skip entries in the 30 minutes after the London open',
      summary: 'The opening burst produces false breakouts; wait it out.',
      family: 'session',
      key: 'et-skip-london-30',
    },
    {
      title: 'Enter on a retest of the breakout level',
      summary: 'Wait for the price to come back and touch the level before entering.',
      family: 'structure',
      key: 'et-retest',
    },
    {
      title: 'Only enter when the 1-hour trend agrees',
      summary: 'Filter out breakouts against the hourly trend.',
      family: 'structure',
      key: 'et-hourly-trend',
    },
    {
      title: 'Enter only in the London–New York overlap',
      summary: 'Trade breakouts only between 13:00 and 16:00 UTC.',
      family: 'session',
      key: 'et-overlap',
    },
    {
      title: 'Model-picked entry windows',
      summary: 'A model scores each 15-minute slot of the week for breakout quality.',
      family: 'model',
      key: 'et-ml-window',
    },
    {
      title: 'Enter at the close of the day’s first hour',
      summary: 'Uses the first hour’s range to set entries.',
      family: 'structure',
      key: 'et-first-hour',
    },
    {
      title: 'Wait for a second breakout bar',
      summary: 'Enter only if the next bar also closes beyond the level.',
      family: 'time',
      key: 'et-second-bar',
    },
    {
      title: 'Skip Mondays',
      summary: 'No new breakout trades on Monday.',
      family: 'time',
      key: 'et-skip-monday',
    },
    {
      title: 'Avoid the hour before the New York close',
      summary: 'Liquidity thins out; skip late entries.',
      family: 'session',
      key: 'et-skip-late',
    },
    {
      title: 'Enter only after a quiet hour',
      summary: 'Breakouts from a narrow hour are cleaner.',
      family: 'volatility',
      key: 'et-quiet-hour',
    },
    {
      title: 'Enter on round-number breaks only',
      summary: 'Breakouts through 00 and 50 levels only.',
      family: 'structure',
      key: 'et-round',
    },
    {
      title: 'Stagger the entry over three bars',
      summary: 'Enter a third of the size on each of three bars.',
      family: 'time',
      key: 'et-stagger',
    },
    {
      title: 'Only enter when spread is below 0.6 pips',
      summary: 'Skip entries when trading costs are high.',
      family: 'volatility',
      key: 'et-spread',
    },
    {
      title: 'Enter at the Asian session open',
      summary: 'Trade the first breakout after 23:00 UTC.',
      family: 'session',
      key: 'et-asia',
    },
  ],
  pathfinder: [
    {
      title: 'Don’t time entries: halve the size in risky hours instead',
      summary: 'A different route: always trade, but smaller when breakouts usually fail.',
      family: 'session',
      key: 'et-pf-size',
    },
    {
      title: 'Enter on the pullback after a failed opposite breakout',
      summary: 'A different route: trade the failure of the other side.',
      family: 'structure',
      key: 'et-pf-opposite',
    },
    {
      title: 'Let the regime analyst switch entries on or off by week',
      summary: 'A different route: decide weekly, not trade by trade.',
      family: 'volatility',
      key: 'et-pf-weekly',
    },
  ],
  alternatives: [
    {
      title: 'Skip the London-open burst and require the hourly trend to agree',
      summary: 'Combines the two strongest filters.',
      family: 'combined',
      key: 'et-alt-london-trend',
      parents: ['o0', 'o2'],
      kind: 'combination',
      why: 'They remove different false breakouts: the opening burst, and moves against the bigger trend.',
    },
    {
      title: 'Simple rule instead of the model: skip the first 30 minutes of each session',
      summary: 'A cheaper route to what the model was finding.',
      family: 'session',
      key: 'et-alt-simple',
      parents: ['o4', 'o0'],
      kind: 'cheaper-route',
      why: 'The model’s best windows were simply “not the first half hour of a session”. One rule gets most of the gain.',
    },
    {
      title: 'Retest entries in the overlap only',
      summary: 'The retest entry, limited to the busiest hours.',
      family: 'combined',
      key: 'et-alt-retest-overlap',
      parents: ['o1', 'o3'],
      kind: 'combination',
      why: 'Retests are slow outside the overlap; inside it they fill quickly.',
    },
  ],
  followups: [
    {
      title: 'London skip, hourly trend and a quiet-hour filter',
      summary: 'Adds a third filter to the strongest combination.',
      family: 'combined',
      key: 'et-fu-three',
      parent: 'a0',
    },
    {
      title: 'Skip 45 minutes after the London open',
      summary: 'A longer skip.',
      family: 'session',
      key: 'et-fu-45',
      parent: 'o0',
    },
    {
      title: 'Hourly trend measured on 4-hour bars',
      summary: 'A slower trend filter.',
      family: 'structure',
      key: 'et-fu-4h',
      parent: 'o2',
    },
  ],
  objections: {
    costs: {
      text: 'Does skipping the open push entries into wider spreads later?',
      answer:
        'No: spreads after 08:30 UTC are lower than at the open in this data, and they are charged in full.',
    },
    overfitting: 'The model scored 672 time slots. Some will look good by chance.',
    lookAhead: 'The first hour’s close is used to enter inside the first hour in some trades.',
    fewTrades: 'Only 96 trades staggered over three bars: too few to judge.',
  },
  draft: {
    call: 'Don’t enter EURUSD breakouts in the first 30 minutes after London opens, and only trade with the hourly trend.',
    v1: 'On 15-minute EURUSD breakout trades, skipping entries in the 30 minutes after the London open and requiring the hourly trend to agree did better than entering on every breakout by {gain} percentage points after costs over the last 24 months, and by {fresh} points on the sealed recent 3 months. A cheaper variant ({alt}) did nearly as well ({altGain} points). Research on past data, not a trade instruction.',
    v2: 'On 15-minute EURUSD breakout trades, skipping entries in the 30 minutes after the London open and requiring the hourly trend to agree did better than entering on every breakout by {gain} percentage points after costs over the last 24 months, and by {fresh} points on the sealed recent 3 months. A cheaper variant ({alt}) did nearly as well ({altGain} points). Results may differ in other conditions. Research on past data, not a trade instruction.',
  },
  provenWrongIf:
    'Over the next 3 months of paper results it does no better than entering on every breakout.',
  openQuestion: 'Does the London-open skip work for GBPUSD breakouts?',
  deadEndLesson:
    'Model-picked entry windows: the gain came from scoring 672 slots, most of it luck.',
  warningLesson:
    'Adding a quiet-hour filter to the London skip + trend combination didn’t hold up on fresh data.',
};

export const GENERIC: Pool = {
  id: 'generic',
  originals: [
    {
      title: 'Volatility filter: skip trades when ATR is in its top 10%',
      summary: 'Stand aside when the market is unusually wild.',
      family: 'volatility',
      key: 'g-vol-filter',
    },
    {
      title: 'Trend filter: trade only with the 4-hour trend',
      summary: 'Ignore signals against the bigger trend.',
      family: 'structure',
      key: 'g-trend',
    },
    {
      title: 'Time filter: skip the first hour of each session',
      summary: 'Session opens are noisy.',
      family: 'session',
      key: 'g-session-skip',
    },
    {
      title: 'Calendar filter: skip the hour before scheduled news',
      summary: 'Stand aside before scheduled events.',
      family: 'time',
      key: 'g-news-skip',
    },
    {
      title: 'Model-scored trade quality',
      summary: 'A model scores every signal and skips the weakest third.',
      family: 'model',
      key: 'g-ml-score',
    },
    {
      title: 'Use the day’s close to confirm',
      summary: 'Confirm signals with the daily close.',
      family: 'structure',
      key: 'g-daily-close',
    },
    {
      title: 'Scale in over two bars',
      summary: 'Half the size now, half on the next bar if it agrees.',
      family: 'time',
      key: 'g-scale-in',
    },
    {
      title: 'Skip Friday afternoons',
      summary: 'No new trades after 12:00 UTC on Friday.',
      family: 'time',
      key: 'g-skip-friday',
    },
    {
      title: 'Smaller size after two losses',
      summary: 'Halve the size after two losing trades.',
      family: 'trailing',
      key: 'g-size-losses',
    },
    {
      title: 'Round-number filter',
      summary: 'Skip signals within 5 pips of a round number.',
      family: 'structure',
      key: 'g-round',
    },
    {
      title: 'Momentum confirmation',
      summary: 'Require momentum to agree with the signal.',
      family: 'model',
      key: 'g-momentum',
    },
    {
      title: 'Range filter: only trade after a narrow range',
      summary: 'Narrow ranges lead to cleaner moves.',
      family: 'volatility',
      key: 'g-narrow',
    },
    {
      title: 'Spread filter',
      summary: 'Skip signals when the spread is above 0.8 pips.',
      family: 'volatility',
      key: 'g-spread',
    },
    {
      title: 'Trade every signal with a fixed 3× target',
      summary: 'Keep everything, aim higher.',
      family: 'target',
      key: 'tp-fixed-3r',
    },
  ],
  pathfinder: [
    {
      title: 'Don’t filter: size every trade by recent volatility instead',
      summary: 'A different route: keep every signal, change the size.',
      family: 'volatility',
      key: 'g-pf-size',
    },
    {
      title: 'Trade the opposite of failed signals',
      summary: 'A different route: the failure is the signal.',
      family: 'structure',
      key: 'g-pf-opposite',
    },
    {
      title: 'Decide weekly with the regime analyst',
      summary: 'A different route: switch the strategy on or off each week.',
      family: 'volatility',
      key: 'g-pf-weekly',
    },
  ],
  alternatives: [
    {
      title: 'Volatility filter plus trend filter',
      summary: 'Combines the two strongest filters.',
      family: 'combined',
      key: 'g-alt-vol-trend',
      parents: ['o0', 'o1'],
      kind: 'combination',
      why: 'They remove different bad trades: wild markets, and moves against the trend.',
    },
    {
      title:
        'Simple rule instead of the model: skip signals in the top ATR decile and against the trend',
      summary: 'A cheaper route to what the model was finding.',
      family: 'volatility',
      key: 'g-alt-simple',
      parents: ['o4', 'o3'],
      kind: 'cheaper-route',
      why: 'The model leaned on two inputs. A two-line rule gets most of the gain with nothing to overfit.',
    },
    {
      title: 'Weekly switch with a session filter',
      summary: 'The Pathfinder’s weekly switch, plus the session skip.',
      family: 'combined',
      key: 'g-alt-weekly-session',
      parents: ['p2', 'o2'],
      kind: 'combination',
      why: 'The weekly switch removes bad weeks; the session skip removes bad hours.',
    },
  ],
  followups: [
    {
      title: 'Volatility, trend and news filters together',
      summary: 'Adds the news filter to the strongest combination.',
      family: 'combined',
      key: 'g-fu-three',
      parent: 'a0',
    },
    {
      title: 'Trend filter on 1-hour bars',
      summary: 'A faster trend measure.',
      family: 'structure',
      key: 'g-fu-1h',
      parent: 'o1',
    },
    {
      title: 'Volatility filter at the top 20%',
      summary: 'A looser volatility filter.',
      family: 'volatility',
      key: 'g-fu-20',
      parent: 'o0',
    },
  ],
  objections: {
    costs: {
      text: 'Are the skipped trades’ costs being saved twice?',
      answer: 'No: costs are only charged on trades taken, once each, in the test plan.',
    },
    overfitting:
      'The model tried 600 parameter sets. A result this good is probably fitted to the past.',
    lookAhead: 'The daily close is used before the day is over in some trades.',
    fewTrades: 'Only 84 trades were scaled in: too few to judge.',
  },
  draft: {
    call: 'Only take EURUSD breakout trades when volatility is normal and the 4-hour trend agrees.',
    v1: 'On 15-minute EURUSD breakout trades, skipping signals when volatility is in its top 10% and taking only those with the 4-hour trend did better than taking every signal by {gain} percentage points after costs over the last 24 months, and by {fresh} points on the sealed recent 3 months. A cheaper variant ({alt}) did nearly as well ({altGain} points). Research on past data, not a trade instruction.',
    v2: 'On 15-minute EURUSD breakout trades, skipping signals when volatility is in its top 10% and taking only those with the 4-hour trend did better than taking every signal by {gain} percentage points after costs over the last 24 months, and by {fresh} points on the sealed recent 3 months. A cheaper variant ({alt}) did nearly as well ({altGain} points). Results may differ in other conditions. Research on past data, not a trade instruction.',
  },
  provenWrongIf:
    'Over the next 3 months of paper results it does no better than taking every signal.',
  openQuestion: 'Do the same two filters help GBPUSD breakouts?',
  deadEndLesson: 'Model-scored trade quality: the gain came from overfitting 600 parameter sets.',
  warningLesson:
    'Adding a news filter to the volatility + trend combination didn’t hold up on fresh data.',
};

export function poolFor(topicId?: string): Pool {
  if (topicId === 'T-4') return TAKE_PROFIT;
  if (topicId === 'T-2') return ENTRY_TIMING;
  return GENERIC;
}
