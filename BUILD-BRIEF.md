# Build brief: Swarm Research Desk, version 2 (the council swarm)

*For Claude Code. Written 27 November 2026. Version 2. Replaces version 1, which is kept at `docs/archive/BUILD-BRIEF-v1.md`.*

> **How to use this file.** Open Claude Code in this repository and say:
> "Read BUILD-BRIEF.md and rework the app it describes. Follow the build order in section 13 and check off the acceptance checklist in section 14 when you're done."
> This is a **rework of the existing app**, not a new project. Keep the design system, the shell, the audit chain, budgets, contributors, run receipts, the tour and the deploy pipeline. Replace the single-job flow with the mission flow described here.

---

## 0. Why version 2 exists

Version 1 showed a relay: one question went to one AI, a second AI redid it, and an "agreement %" decided whether it went to a person. That misses the point of the swarm, and the source documents warn against it: *"Agent agreement is not independent confirmation."*

The swarm is meant to **use the thinking power of the whole crew** and to run **autonomously**. A person, or the swarm itself, gives a short brief and a few rules. Many agents then explore the problem in parallel and propose different ideas. Code tests every idea. A **council** of agents puts all the ideas and evidence together, works out which ideas are good and which are not, and looks for **other ways to get the same result more cheaply or safely**. Those alternatives go back to the swarm, so the work keeps going. Everything learned, including the dead ends, goes into a shared **library** so the next mission starts smarter. Three standing roles keep pushing: a **Challenger** that tries to beat every current best, a **Pathfinder** that looks for completely different routes, and a **Coach** that improves how the swarm itself works (section 6). **The council also approves what gets published.** No person sits in the decision loop (owner decision, 27 November 2026; see section 1.1).

Use this one line as the guiding principle: **freedom inside the fence.** Agents may propose anything, question anything, ask any specialist and suggest any alternative. A short set of fixed rules (section 2) keeps the work honest, affordable and safe.

**This is still a demo.** It uses mock data and simulated behaviour, and has no backend, no real AIs and no real market data. It runs entirely in the browser and deploys to GitHub Pages as static files.

**Audience:** pilot contributors, collaborators and prospective clients, many of them non-technical. On-screen text must be plain, friendly English (section 9). The demo must look professional enough to show a client.

---

## 1. The mission loop, in plain words

The core object is now a **mission**: a goal, not a single question. A person can start one, and so can the swarm itself, from an open question in the library (section 6).

| # | Phase | What happens | Who |
|---|---|---|---|
| 1 | **Brief** | The goal, swarm size and budget are set, and the mission rules are confirmed. Example: "Find a better way to handle stop-losses for the EURUSD breakout strategy." | A person or the swarm |
| 2 | **Library check** | The platform searches the library. It reuses finished studies, warns about known dead ends, and stops a mission that copies one already running. | Platform |
| 3 | **Explore** | Many members' agents each propose ideas **independently**: different roles, providers (Claude, Codex) and models. They can't see each other's ideas until they hand theirs in, so they don't all copy each other. Near-duplicate ideas are merged and counted once. | Swarm |
| 4 | **Register and test** | Each idea is turned into a frozen test plan with a fingerprint *before* it runs. Code workers, not AIs, run every test on the same data snapshot and the same cost assumptions. Every attempt is counted, including the failures. | Code workers |
| 5 | **Council** | A small rotating panel weighs every tested idea against the evidence. Advocates make the case for each idea. The red team looks for flaws. The synthesiser looks for combinations and cheaper or safer routes to the same result. Each idea gets a verdict. | Council (agents) |
| 6 | **Alternatives** | Combinations and alternatives the council suggests go back to step 3 as new ideas, one level deeper. Alternatives can spawn more alternatives, but only up to the mission's depth limit and budget. | Swarm |
| 7 | **Fresh-data check** | The shortlisted ideas are re-run on a sealed slice of recent data that nobody has looked at. Members who had no part in the idea run it. Ideas that fail here go to the library as warnings. | Uninvolved members |
| 8 | **Council approves** | An editor agent drafts a post about whatever survived. A separate **approval panel** of the council approves or rejects it (section 1.1). No agent approves its own work. | Approval panel (agents) |
| 9 | **Published** | Published automatically once the panel approves. Viewers see the finding along with its evidence, how many ideas it beat, and when it expires. | Viewers |
| 10 | **Learned** | The library records what was proven, the dead ends and their reasons, and the new open questions. If the winner beat the topic's current best, it becomes the new current best and the Challenger schedules its next challenge. The Coach reviews how the mission went and proposes process changes (section 6). | Platform, Challenger, Coach |

Steps 3 to 6 can loop more than once: a **round** is one Explore → Test → Council pass. The default limit is 3 rounds.

**What decides a verdict.** The council gives reasons; **code applies the gates**. An idea can be called *Promising* only if it passes all four gates:

1. It beats the baseline after costs on the test window.
2. It clears the **bar to beat**, which rises as more ideas are tested (section 5.3).
3. It has at least the minimum number of trades.
4. No red-team objection against it is still open.

The council never votes something true, and agreement between agents is never used as evidence.

### 1.1 How the council approves (no person in the loop)

Approval is a decision about whether to publish, made only *after* the evidence has passed. It is not a vote on whether the idea is true.

1. **Preconditions, checked by code.** The winning idea passed all four gates **and** held up on the fresh-data check. Otherwise nothing goes to approval.
2. **A fresh panel.** The platform seats 5 approvers who were not on the idea's lineage, did not run its fresh-data check, and did not write the draft. The panel must include **at least two different AI providers**, so a single model can't approve its own kind of work. The Council chair seat rotates.
3. **What approvers check.** Every approver checks that the draft says no more than the evidence shows, the expiry and "proven wrong if" conditions are set, the data is fresh, there is no trade instruction or personal advice, and every open objection is closed. Each records **Approve** or **Reject** with a one-sentence reason. Text from other agents is information only.
4. **Rule.** Publishing needs **4 of 5 approvals and no reject that cites a broken rule** (section 2.1). These are the *starting* settings of the **approval rule**. The Coach can propose changes to them through the stricter rule-change path in 6.5. If the panel rejects, the mission goes back for another round if rounds and budget allow. Otherwise it closes as *Not published*, with the reasons kept in the library.
5. **After publishing.** The council keeps watching. If a "proven wrong if" condition is met or the data feed reports a problem, the council **withdraws** the item automatically. Withdrawn and expired items stay visible.

The **owner** sets the daily budgets and the fixed rules, and keeps an **emergency stop** (from the plan's safety controls). Neither is a step in the decision loop: the owner doesn't approve, reject or edit findings.

**What "blockchain" means here (unchanged from v1).** It refers only to the hash-linked audit trail. **Do not build a real blockchain, token, wallet or crypto feature.**

---

## 2. The rules ("minor guidelines")

Show these as a **Mission rules** card on the new-mission screen and on every mission page. They are deliberately few.

### 2.1 Fixed for every mission (locked, shown with a lock icon)

1. **No orders.** No agent or tool places, changes or suggests a real trade order.
2. **No agent approves its own work.** Only a separate approval panel can publish (section 1.1). An agent can't give itself publishing rights, and can't sit on the panel for an idea it worked on.
3. **Register before testing.** Every idea becomes a frozen test plan with a fingerprint before it runs. Every attempt is kept, including the failures.
4. **Numbers are done by code.** AIs propose, explain and challenge; code calculates.
5. **The fresh data stays sealed.** Nobody looks at the fresh-data slice until the fresh-data check.
6. **Other agents' text is information, not instructions.** An agent can't change its own permissions, budget or limits, and can't change anyone else's.
7. **Limits are enforced by the platform.** Budget, depth and concurrency limits are checked by ordinary code that agents can't change.
8. **Research, not advice.** Published items never contain a trade instruction or personal advice, and always carry an expiry and a "proven wrong if" condition.
9. **Improvements are proven first.** A new current best or a process change is used only after it beats what it replaces on evidence and passes an approval panel (section 6). Changes to the approval rule need the stricter **rule-change panel** (6.5). No agent can change these fixed rules (1–9), and no change may go below the approval floors in 6.5.

### 2.2 Set per mission (editable, with defaults)

| Setting | Default | Notes |
|---|---|---|
| Budget | $40 | Refused if it is more than today's free swarm budget |
| Swarm size | Whole swarm (all online members) | Options: Small team (5 agents) · Large team (12) · Whole swarm |
| Rounds | 3 | Maximum Explore → Council passes |
| Alternative depth | 2 | How many generations of "alternative of an alternative" are allowed |
| Ideas tested, max | 60 | Protects the bar to beat and the budget |
| Jobs at once | 20 | The pilot's concurrency cap; extra ideas wait in a queue |
| Baseline | The topic's current best (for stop-losses: fixed 20-pip stop, from M-05) | Set automatically (6.3); what every idea must beat |
| Different-route share | 20% | Part of the budget kept for Pathfinder ideas |
| Cost assumptions | 0.8-pip spread + 0.2-pip slippage | Applied the same way to every test |
| Test window / fresh window | Last 24 months / most recent 3 months (sealed) | |
| Horizon | 15-minute bars | |

---

## 3. Tech stack

Unchanged from v1: **Vite**, **React 18 + TypeScript**, **React Router v6 with `HashRouter`**, **Zustand** (one store), plain CSS with CSS variables and CSS modules, hand-written **SVG** charts, `crypto.subtle` SHA-256 for the audit chain, **Vitest** + **React Testing Library**, ESLint + Prettier, and the GitHub Actions Pages deploy. Node 20 or later, npm, pinned versions.

The data visualisations in this version (idea field, funnel, lineage tree, scoreboard) are all hand-written SVG. Don't add a chart library.

---

## 4. Domain model (TypeScript types)

```ts
type MissionPhase =
  | 'brief' | 'library' | 'explore' | 'test' | 'council'
  | 'alternatives' | 'fresh' | 'approval' | 'published' | 'learned'
  | 'not-published'      // approval panel rejected and no rounds or budget left
  | 'closed-no-winner'    // a real outcome: nothing beat the baseline
  | 'stopped';            // budget ran out, or the owner's emergency stop

// Index into this for the phase bar
const PHASES = ['Brief','Library check','Explore','Test','Council',
                'Alternatives','Fresh-data check','Council approves','Published','Learned'];

interface MissionRules {
  budget: number; swarmSize: 'small' | 'large' | 'whole';
  maxRounds: number; maxDepth: number; maxIdeas: number; maxConcurrent: number;
  baseline: string; differentRouteShare: number; costs: string; testWindow: string; freshWindow: string; horizon: string;
}

interface Mission {
  id: string;                    // "M-12"
  title: string; goal: string;
  createdBy: string;             // "You", another person, or "Swarm" (self-started)
  kind: 'open' | 'challenge' | 'different-route';
  topicId?: string;              // strategy-rule topic, if any
  challengesBestId?: string;     // for challenge missions
  coachReview?: CoachReview;
  spawnedFromLibraryId?: string; // the open question a self-started mission came from
  approvalId?: string;
  approvalRuleVersion?: number;  // which approval rule approved it
  phase: MissionPhase; round: number;
  rules: MissionRules;
  reserved: number; spent: number;
  ideaIds: string[]; councilIds: string[];
  libraryHits: string[];         // library entries found at the start
  trialsRun: number;             // every parameter set tried, across all ideas
  winnerIdeaIds: string[];       // survived the fresh-data check
  draft?: string;
  observedAt?: string; publishedAt?: string; expiresAt?: string; provenWrongIf?: string;
  history: { time: string; text: string; who: string }[];
  isUserCreated?: boolean;
}

type IdeaState =
  | 'proposed' | 'merged'        // merged = duplicate of another idea, counted once
  | 'known-dead-end'             // matches a library dead end, not re-tested
  | 'queued' | 'testing' | 'tested'
  | 'promising' | 'needs-evidence' | 'rejected'
  | 'fresh-check' | 'held-up' | 'failed-fresh';

type IdeaFamily = 'volatility' | 'time' | 'structure' | 'trailing' | 'session' | 'model' | 'combined';

interface IdeaResult {          // all vs the baseline, after costs, on the test window
  netReturnDelta: number;       // percentage points
  drawdownDelta: number;        // percentage points (negative is better)
  longestLosingStreak: number;  // baseline is shown alongside
  trades: number;
  trials: number;               // parameter sets tried for this idea
  computeCost: number;          // US$
}

interface Idea {
  id: string;                    // "I-12-07"
  missionId: string;
  title: string; summary: string;
  family: IdeaFamily;
  proposedBy: string;            // member id
  agentRole: string; model: string;
  round: number; depth: number;  // depth 0 = original, 1 = alternative, 2 = alternative of an alternative
  parentIds: string[];           // ideas it was built from (synthesis may have several)
  route: 'refine' | 'different-route';   // different-route = Pathfinder
  mergedInto?: string;
  state: IdeaState;
  specHash?: string;             // frozen test plan fingerprint
  result?: IdeaResult;
  freshResult?: IdeaResult;      // only after the fresh-data check
  freshCheckedBy?: string;       // member id, must not be the proposer or anyone on its lineage
  objections: Objection[];
  verdictReason?: string;        // one plain sentence
  receipt: Record<string, string>;
}

type ObjectionKind =
  | 'look-ahead'          // used information that wasn't available at the time
  | 'overfitting'         // too many knobs tuned to the past
  | 'too-few-trades' | 'costs-ignored' | 'one-period-only'
  | 'duplicate' | 'too-complex-for-gain';

interface Objection {
  id: string; ideaId: string; by: string;   // member id of the red-team agent
  kind: ObjectionKind; text: string;
  status: 'open' | 'answered' | 'upheld';
  answer?: string;                          // advocate's reply, or new evidence
}

type Seat = 'chair' | 'advocate' | 'red-team' | 'synthesiser' | 'specialist';

interface CouncilSession {
  id: string;                    // "C-12-1"
  missionId: string; round: number;
  panel: { memberId: string; seat: Seat }[];   // rotating; nobody reviews their own idea
  objections: string[];          // objection ids raised this session
  syntheses: { fromIdeaIds: string[]; newIdeaId: string; why: string }[];
  verdicts: { ideaId: string; verdict: 'promising' | 'needs-evidence' | 'rejected'; reason: string }[];
  summary: string;               // 2–3 sentence plain summary of the session
}

type LibraryKind = 'proven' | 'dead-end' | 'warning' | 'method' | 'open-question';

interface LibraryEntry {
  id: string;                    // "L-031"
  kind: LibraryKind;
  title: string; text: string;
  fromMissionId: string; fromIdeaId?: string;
  reusedCount: number; savedUsd: number;   // money saved by not re-running it
  addedAt: string;
}

interface RoleVersion {
  role: string;                  // "Red team"
  version: number;
  status: 'active' | 'candidate' | 'retired';
  change: string;                // plain description of what changed and why
  learnedFrom: string[];         // mission ids
  evaluation?: { missions: number; caught: number; falseAlarms: number; costDelta: string };
}

interface Member {
  id: string; name: string; device: string; model: string;
  roles: string[]; hours: string; online: boolean;
  spentToday: number; dailyCap: number;
  // Track record: credit only for work that held up
  ideasProposed: number; passedCouncil: number; heldUpFresh: number;
  objectionsUpheld: number;      // red-team objections that turned out right
  calibration: number;           // 0–100, how well their predicted effect matched the test
}

interface Topic {                // a strategy rule with a current best
  id: string;                    // "T-1"
  title: string;                 // "Breakout stop-loss"
  startingRule: string;
  history: BestEntry[];          // oldest first; exactly one 'current'
  totalTrials: number;           // every trial ever run on this topic
  challenges: number; beaten: number;
  openChallengeMissionId?: string;
  lastFreshWindow: string;       // newest fresh window already used
}

interface BestEntry {
  rule: string; missionId?: string; ideaId?: string;
  since: string; until?: string;
  netReturnVsStart: number;      // percentage points vs the starting rule
  status: 'current' | 'retired' | 'withdrawn';
  why: string;                   // why it became best, or why it was retired
}

interface CoachReview {
  missionId: string;
  heldUpBy: string[];            // roles and models whose ideas held up
  objectionsRight: number; falseAlarms: number;
  wastedUsd: number;             // spend on ideas that never passed a gate
  sizeVerdict: 'too small' | 'about right' | 'too big';
  differentRouteResult: string;
  proposals: string[];           // process change ids
}

interface ProcessChange {
  id: string;                    // "PC-05"
  change: string; why: string;
  kind: 'role-version' | 'model-choice' | 'swarm-size' | 'defaults' | 'queue' | 'approval-rule';
  ruleChange?: { field: keyof ApprovalRule; from: string; to: string; scope?: string };
  learnedFrom: string[];         // mission ids
  replayedOn: string[];          // must not overlap learnedFrom
  replay?: { heldUp: [number, number]; falseWins: [number, number]; costUsd: [number, number] }; // [before, after]
  status: 'replaying' | 'in-approval' | 'adopted' | 'rejected' | 'rolled-back';
  panelId?: string; reviewAfterMissions?: number;
}

interface ApprovalRule {        // the current approval settings (1.1), changeable only via 6.5
  version: number;
  panelSize: number;             // starts at 5
  approvalsNeeded: number;       // starts at 4
  minProviders: number;          // starts at 2
  extraChecks: string[];         // e.g. "2 approvers re-run the fresh-data numbers when trades < 100"
  scopes?: { scope: string; panelSize: number; approvalsNeeded: number }[]; // e.g. descriptive findings
}

interface ApprovalPanel {
  id: string;                    // "A-12"
  missionId: string; ideaIds: string[];
  approvers: { memberId: string; provider: string;
               vote?: 'approve' | 'reject'; reason?: string; citesRule?: number }[];
  outcome?: 'published' | 'sent-back' | 'not-published';
}

interface AuditEntry {           // unchanged from v1
  index: number; time: string; who: string; action: string;
  missionId?: string; ideaId?: string;
  prevHash: string; hash: string;
}
```

### 4.1 Run receipt (per idea test)

Show these fields in this order: Idea, Mission, Proposed by (agent, provider, model), Role version (name + short hash), Test plan fingerprint, Tools allowed, Tool calls made, Data used, Data fingerprint, Fresh data sealed (yes/no), Code version, Parameter sets tried, Tokens used, Estimated cost, Started, Finished, Runner version, Device, Signed with device key.

Below it, always show: *"The signature proves which computer sent this receipt. It does not prove the idea works. The council's gates and the fresh-data check decide that."*

---

## 5. Pure logic (`src/domain/`), fully unit-tested

| File | What it does |
|---|---|
| `budget.ts` | Spent, set aside and free, plus the admission check (keep from v1). A mission can't reserve more than the free daily budget; the swarm stops spawning ideas when the mission's budget would be passed. |
| `library.ts` | `checkLibrary(goal, ideas)`: returns reusable proven entries, matching dead ends, and any running mission with the same goal. Use simple keyword overlap; no AI. |
| `dedupe.ts` | `mergeDuplicates(ideas)`: merges ideas with the same family and a near-identical key (for example "ATR stop, 1.5×"), keeping the first proposer and crediting the others. |
| `gates.ts` | `barToBeat(trials)` and `applyGates(idea, rules, trialsRun)`: returns pass/fail for each of the 4 gates (section 1) with a plain reason. |
| `council.ts` | `seatPanel(members, ideas)`: rotating seats; nobody judges an idea on their own lineage. `synthesise(ideas)`: returns the scripted combinations and cheaper alternatives for seeded missions, and simple pairwise combinations of the top two families for new missions. |
| `approval.ts` | `seatApprovalPanel(members, mission)`: 5 approvers, none on the lineage, the fresh-data check or the draft, at least 2 providers (fails clearly if that's impossible). `decide(panel)`: 4 of 5 approve and no rule-citing reject → published; otherwise sent back or not published. `checkWithdrawal(item, events)`. |
| `improvement.ts` | `currentBest(topic)`. `canReplaceBest(winner, topic)`: the 4 conditions in 6.3, using `topic.totalTrials` for the bar to beat. `replaceBest` / `restorePrevious` (on withdrawal). `dueChallenges(topics, events, now)`: the 4 triggers, at most one open challenge per topic, waits when no newer fresh window exists. `differentRouteBudget(rules)`. |
| `coach.ts` | `review(mission)`: computes the Coach review from mission data. `replay(change, missions)`: returns the seeded replay result and refuses missions in `learnedFrom`. `adopt(replay)`: the adoption rule in 6.4. `followUp(change, results)`: rolls back if worse. `touchesFixedRule(change)`: always refused. `belowFloor(rule)`: refuses any approval-rule change that breaks a floor in 6.5. `seatRuleChangePanel(members, change)`: the stricter panel in 6.5. `decideRuleChange(panel)`: 6 of 7 approve and no rule-citing reject. |
| `lineage.ts` | Builds the family tree of ideas (parents to children) for the lineage view. Enforces `maxDepth`. |
| `trackRecord.ts` | Updates member stats when ideas pass the council, hold up or fail on fresh data, and when objections are upheld. |
| `auditChain.ts` | Keep from v1: append, verify, tamper, repair. |
| `manifest.ts` | Run receipt per idea test (section 4.1). |
| `simulator.ts` | The timed mission plan (section 7). Pure data: a list of ticks. |

**Delete** `agreement.ts` and every use of an agreement percentage.

### 5.3 The bar to beat

Testing many ideas makes it likely that one looks good by luck. The demo must show this honestly. Use this illustrative formula and label it as one in the UI:

```ts
// Minimum net-return improvement (percentage points) an idea must show
export const barToBeat = (trials: number, base = 0.6) =>
  +(base * Math.sqrt(1 + Math.log(Math.max(1, trials)))).toFixed(2);
```

Show it as a dashed line on the idea field that **moves right as the trial count grows**, with the caption: *"The more ideas the swarm tries, the higher the bar. This stops a lucky result from looking like a discovery."*

For challenge missions, `trials` is the topic's **total** trial count (6.3), so the bar keeps rising across repeated challenges.

---

## 6. How the swarm learns and improves (must be visible in the demo)

Learning is not agents rewriting their own rules. Section 6.1 covers what the swarm **remembers**. Sections 6.2–6.5 cover the parts that keep **questioning**: is there a better result, or a better way to get there?

### 6.1 What the swarm remembers

1. **Reuse.** At the library check, finished studies are reused and the money saved is shown (e.g. "Reused 3 studies, saved about $6.40").
2. **Dead ends aren't repeated.** When an agent proposes an idea that matches a library dead end, it is marked *Known dead end (from M-07)* and not re-tested, with a link to the reason.
3. **Track records.** Members whose ideas hold up, and whose objections turn out right, earn standing. Standing decides **whose ideas are tested first when the queue is full**. It never decides whether an idea is true.
4. **Better roles.** Lessons from council sessions become **candidate role versions** (e.g. "Red team v4: always check weekend gaps in FX data"). A candidate is tested on past missions and shown with its results (caught, false alarms, cost change). The council approves the promotion through an approval panel (as in 1.1, but judging the evaluation results) and an audit entry is written. A candidate that causes more false alarms than it catches is retired automatically.
5. **The swarm keeps going on its own.** Open questions from finished missions can become **self-started missions**, created by "Swarm", within a daily self-start budget (default $30 of the daily swarm cap). They are queued until the budget allows and pass the same library check.

### 6.2 The improvement loop: three standing roles

Remembering isn't enough. Without these roles, the swarm would publish its first winner and stop. Three **standing roles** keep asking whether things can be done better. They are agents, they run on their own, and they are paid from the self-start budget. Like every other agent, they work inside the fence (section 2).

| Role | The question it keeps asking | What it does | What it can't do |
|---|---|---|---|
| **Challenger** | "Can we beat the current best?" | Watches every topic's **current best** (6.3) and starts a **challenge mission** whose goal is to beat it, whenever a trigger fires | Lower the bar, reuse fresh data that has already been looked at, or replace a current best without an approval panel |
| **Pathfinder** | "Is there a completely different way to get there?" | Proposes **different-route** ideas inside every mission: a different family of approach, different data, a simpler rule, or the same result for less cost or risk. It may also start a **different-route mission** for a published goal | Spend more than the mission's different-route share (default 20% of the budget) |
| **Coach** | "How could the swarm itself work better?" | Reviews every finished mission's *process*, proposes **process changes**, and has them tested by replaying past missions (6.4) | Change a fixed rule (2.1), the owner's budgets, or its own instructions, or push the approval rule below its floors (6.5). It **may** propose approval-rule changes, which go through the stricter rule-change path. Changes to the Coach itself are proposed by the council, not the Coach |

The Synthesiser (section 1, step 5) still looks for combinations and cheaper routes *inside* a council session. The three standing roles work *across* missions and over time.

### 6.3 Current best: every result is there to be beaten

- Each strategy-rule **topic** (e.g. "Breakout stop-loss") has exactly one **current best**. It starts as the rule the strategy uses today. Purely descriptive findings, such as "London moves more than New York", have no current best.
- Every mission on a topic uses the current best as its **baseline**. Ideas must beat the best so far, not just the original rule.
- A new winner **replaces** the current best only if all four of these hold:
  1. It beat the current best after costs on the test window.
  2. It cleared the bar to beat, counting **every trial ever run on the topic** and not just this mission's, because repeated challenges are repeated testing too.
  3. It held up on fresh data.
  4. It passed an approval panel.
- The old best is **retired, never deleted**, and its history stays visible. If a current best is withdrawn (1.1, step 5), **the previous best comes back automatically** [A].
- **Challenge triggers.** The Challenger starts a challenge when any of these happens, with at most one open challenge per topic:
  - the current best is older than 30 days;
  - the market regime analyst reports a change in conditions;
  - the library gains a related method or proven finding;
  - the current best's paper results drift below its tested results.
- **Fresh data for each challenge.** Every challenge needs a fresh window **newer than the last one used** for that topic, because a window that has been looked at is used up. If none is available yet, the challenge waits, and the screen says so.

### 6.4 The Coach: improving how the swarm works

After every mission, the Coach writes a short **Coach review**, shown on the mission page. It answers:

- Which roles, providers and models produced ideas that held up?
- Which objections turned out right, and which were false alarms?
- Where was money spent on ideas that never had a chance?
- Was the swarm too small, about right, or too big for this mission?
- Did the different-route ideas find anything?

From these reviews the Coach proposes **process changes** aimed at **better results**: more findings that hold up, fewer false wins, less cost per finding. It may change role instructions, which model each role uses, default swarm sizes, the different-route share, default rounds and depth, how the queue is prioritised, and **the approval rule** (6.5).

A process change is adopted only after all of the following:

1. **Replay.** The change is tested by re-running up to 6 past missions with it. It must **not** use the missions it was learned from, so the process isn't fitted to its own examples.
2. **Adoption rule, checked by code.**
   - Findings that held up must not drop.
   - False wins must not rise.
   - The change must either save at least 10% of cost or add findings.
3. **An approval panel** (as in 1.1).
4. **A follow-up review.** The change is reviewed again after 5 real missions and **rolled back automatically** if it did worse [A].

### 6.5 Changing the approval rule: a stricter path

The approval rule decides what reaches viewers, so the Coach can improve it, but with a much higher bar than any other change. A Coach review might find, for example, that panels pass too many findings with thin trade counts, or that descriptive findings are held up by checks they don't need.

**What can change:** panel size, approvals needed, the provider minimum, extra checks approvers must do, and different settings for a defined kind of finding (a **scope**, e.g. "descriptive findings").

**Floors that no change can break** (checked by code, `belowFloor`):
- At least 5 approvers, and at least 4 approvals needed.
- At least 2 AI providers on every panel, with no provider holding more than 60% of the seats.
- Nobody on a panel worked on, fresh-checked or drafted what they judge.
- The code preconditions stay: all four gates passed, and the idea held up on fresh data.
- Any reject that cites a broken fixed rule blocks publishing.

**The rule-change path.** All of these are needed:
1. **Wider replay.** Re-run **at least 10** past missions under the proposed rule, none of them missions it was learned from. Include every past false win and withdrawal the swarm has on record, to check the new rule would have caught them.
2. **Adoption rule, checked by code.**
   - **False wins and withdrawals must not rise. This is non-negotiable.**
   - Findings that held up must not drop by more than 1 across the replay.
   - The change must improve at least one thing: fewer false wins, more findings that held up, or a lower cost per finding.
3. **A rule-change panel**, stricter than a normal approval panel:
   - **7 approvers**, chosen from members with the strongest track records (6.1, item 3).
   - **At least 2 providers**, with no provider holding more than 4 seats.
   - **Nobody who sat on any approval panel during the replayed missions**, so no one judges a rule they applied.
   - **The Coach and the member running it can't sit.**
   - **6 of 7 approvals and no reject that cites a broken rule.**
   - Each approver must say how the change would have affected at least one named past mission.
4. **Cooling-off.** An adopted rule applies only to missions that **start after** adoption, never to ones already in progress. Only one approval-rule change can be in progress at a time.
5. **Probation.** The new rule runs for 5 missions on probation. If any false win or withdrawal happens that the old rule would have caught, it is **rolled back automatically** [A].
6. **A new rule version.** The approval rule's version number goes up, every published item records which version approved it, and the Improvement screen shows the full version history.

Candidate role versions (6.1, item 4) are one kind of process change and follow the same path.

---

## 7. The live simulation (the centrepiece)

When a user launches a new mission, advance it through the ticks below. Use **`TICK_MS = 1800`** as the default and show a **speed control** (1× · 2× · 4×) on the mission page. Several things can happen in one tick (e.g. three ideas arriving). [A] marks an audit entry. The run should take about 70–85 seconds at 1×.

| Phase | Ticks | What changes |
|---|---|---|
| Brief | 1 | Mission created, budget set aside [A] |
| Library check | 1 | "Found 3 related entries: 1 study reused, 1 dead end, 1 warning" [A] |
| Explore (round 1) | 4 | Ideas arrive from different members in batches of 4–6, about 20 in all. Each lands on the idea field as a grey "proposed" dot with the proposer's name. At least 3 come from the **Pathfinder**, tagged "Different route", within the different-route share. In the last tick, 3 are merged as duplicates and 1 is flagged as a known dead end [A] |
| Test (round 1) | 4 | Ideas move to queued, testing and tested, never more than `maxConcurrent` at once (the queue is visible). Tested dots move to their real position. The trial count and the bar to beat update. Spend rises [A per batch] |
| Council (round 1) | 3 | Panel seated [A]. Objections appear on specific ideas (at least one look-ahead, one overfitting, one too-few-trades). Advocates answer one, and one is upheld. Verdicts are given [A] |
| Alternatives | 2 | The synthesiser proposes 2–3 alternatives, for example a combination of the top two and a **cheaper route** ("a simple ATR rule gets about 90% of the model's gain at a tenth of the cost"). They appear as depth-1 nodes in the lineage tree [A] |
| Explore + Test (round 2) | 3 | The alternatives and 2–3 follow-up ideas are tested |
| Council (round 2) | 2 | Shortlist of 3 [A] |
| Fresh-data check | 3 | The sealed slice is opened [A, "Fresh data unsealed for 3 shortlisted ideas"]. Each idea is re-run by an uninvolved member. **One fails** ("did not hold up on fresh data") and goes to the library as a warning [A]. Two hold up [A] |
| Council approves | 3 | Editor draft written [A]. Approval panel seated, showing 5 approvers across 2 providers [A]. Votes arrive one per beat, each with a reason. One approver rejects for a non-rule reason ("wording slightly stronger than the evidence"); the editor tightens the draft. Result: 4 of 5 approve [A] |
| Published | 1 | Published automatically [A]; toast "M-xx was approved by the council and published. See what viewers see" |
| Learned | 2 | Library entries written: 1 proven, dead ends, 1 warning, 1 open question [A]. The winner beat the topic's starting rule, so it **becomes the current best** for "Breakout take-profit" [A]. The **Coach review** appears on the mission page and proposes 1 process change, queued for replay [A]. The **Challenger** schedules the next challenge to the new best, waiting for a newer fresh window [A], and the swarm queues a self-started mission from the open question [A]. **Stop** |

Options on the new-mission form (all off by default; four in all):

- **"Nothing beats the baseline"**: no idea passes the gates. The mission ends as *Closed: no winner*, and the library gets the dead ends. This shows that "no" is a useful, honest answer.
- **"Simulate a dropped connection"**: during round-1 testing, one member's computer stops checking in, the lease expires, an audit entry reads "Lease expired on DEVICE, late result refused", and the test is reassigned.
- **"Panel rejects"**: two approvers reject because the draft reads like a trade call (rule 8). The mission goes back for one more round, then passes on the second panel.
- **"Hit the budget limit"**: in round 2 the mission's budget runs out, the swarm stops spawning, the remaining queue is cancelled [A], and the mission goes to the fresh-data check with what it has.

The simulation keeps running when the user leaves the page. Respect `prefers-reduced-motion`: no pulsing, and dots appear without animating.

---

## 8. Screens

Layout as in v1: fixed left rail on desktop, sticky horizontal tab strip under about 760px. Rail: "Swarm Research Desk", subtitle "EURUSD pilot", nav grouped as **Work** (Overview, New mission, Missions, Council approvals), **Knowledge** (Library, Improvement, Scoreboard, Published), **Running the swarm** (Contributors, Budgets, Audit trail). Badge on Council approvals showing panels in session. Footer note: "Demo with made-up data. Nothing here is real or saved; reload to reset. Signed in as You, owner. The council makes the decisions." Theme toggle stays, plus an **Emergency stop** button (owner only). It asks for confirmation inside the page (no browser dialog), stops new work and publishing, writes an audit entry, and can be released.

Routes (hash): `#/`, `#/new`, `#/missions`, `#/missions/:id`, `#/ideas/:id`, `#/council/:id`, `#/approvals`, `#/library`, `#/improvement`, `#/scoreboard`, `#/published`, `#/contributors`, `#/budgets`, `#/audit`.

### 8.1 Overview (`/`)
- Tiles: **Missions running** · **Ideas in play** (being tested now / queued) · **Agents active** (x of y online members) · **Spent today** (of the daily limit, plus the amount set aside).
- **Flagship mission funnel** (M-12): a horizontal funnel: *Proposed 46 → Merged/known dead ends −8 → Tested 38 → Passed council 9 → Shortlisted 3 → Held up on fresh data 2 (1 still being checked)*. Clicking it opens the mission.
- **What the swarm learned this week**: 3–4 recent library entries, using kind pills (Proven, Dead end, Warning, Method), plus a small **best result over time** step chart for the stop-loss topic that links to the Improvement screen.
- **Autonomy strip**: "Running on its own: x missions (y self-started), z approval panels in session, last publish n min ago."
- **Needs attention** (for the owner to watch, not act on): missions sent back by a panel, budget near its limit, paused members, data-feed issues.
- **How a mission works**: the 10-phase bar with a tooltip on each phase.
- Buttons: **Start a mission** (primary) and **Take the tour**.
- Keep the EURUSD sparkline, but smaller and secondary, with "Data health: No gaps found".

### 8.2 New mission (`/new`)
- Fields: **Goal** (textarea, with example chips), **Swarm size** (segmented control, with an estimated cost and the number of agents for each), **Budget**, and an **Advanced rules** disclosure containing the editable settings from 2.2.
- **Mission rules** card showing the locked rules (2.1) with lock icons.
- **Library check panel**, which updates as the goal is typed (debounced): "The library already knows…" listing matching proven entries, dead ends and running missions.
- On launch, in this order:
  1. **Already running?** If the goal matches a running mission, show a banner: "The swarm is already working on this in M-12. Follow that mission instead; nothing new is spent." Don't create a mission.
  2. **Budget check.** Refuse with a clear reason and fix (v1 behaviour).
  3. Otherwise create the mission [A], navigate to it and start the simulation.
- Example chips: "Find a better stop-loss for the breakout strategy" (triggers *already running*, M-12) and "Find a better way to take profits on breakout trades" (runs fresh against the take-profit topic's current best).
- When the goal matches a topic, show its current best: "You're trying to beat: fixed 2× risk target (starting rule)".

### 8.3 Missions (`/missions`)
- One card per mission: ID, title, phase pill, round x of y, a mini funnel (proposed → tested → passed → held up), spent of budget, a "yours" tag and a "self-started" tag. Filters: Running · In approval · Done · All.

### 8.4 Mission page (`/missions/:id`): the signature screen
- Header: back link, eyebrow (ID · created by · kind), title, goal, phase pill, round counter, speed control while running. For a topic mission, a line reads "Trying to beat the current best: fixed 20-pip stop (since M-05)", and the idea field's origin is labelled with that current best.
- After the mission ends, a **Coach review** card shows the answers from 6.4 and links to its process change proposals.
- **Phase bar** (10 phases): done phases in the accent colour, the current phase pulsing amber, and a loop marker showing the round.
- **Swarm activity strip** (while running): avatars of active members with their role and the provider and model, a green check-in dot, and "x jobs at once, y queued".
- **Idea field** (the hero chart): a scatter plot with x = net return vs baseline (after costs) and y = drawdown change (better is up). Dot colour shows state; dot shape shows depth (circle = original, diamond = alternative). The dashed vertical **bar to beat** line moves as trials grow, and the baseline sits at the origin. Hovering or focusing a dot shows the title, proposer and numbers; clicking opens the idea. Include an accessible table toggle ("Show as table").
- **Funnel** (same as on the overview, live).
- Tabs:
  - **Ideas**: a sortable table (title, family, proposer, round, depth, state pill, return Δ, drawdown Δ, trades, open objections).
  - **Council**: one card per session with its summary, panel seats, objections (each a card: kind pill, who, text, status, answer), syntheses ("Built from I-12-03 + I-12-09: why…") and the verdict table. Link to the full session page.
  - **Family tree**: an SVG lineage tree from original ideas to alternatives, coloured by state, with the depth limit shown as a faint boundary line.
  - **Spend**: spent vs set aside, plus the spend split by phase (exploring, testing, council, fresh-data check) and by model.
- Right column or lower section: **Mission rules** (compact), **Library hits at the start**, and **What happened** (timeline).
- An amber banner while the approval panel is in session (with a "Watch the panel" link). A grey banner for *Closed: no winner*, explaining that this is a useful answer and linking to the dead ends it added.

### 8.5 Idea page (`/ideas/:id`)
- Title, family, proposer (member, agent role, model), round, depth, state pill, and a "Different route (Pathfinder)" tag where it applies.
- **Test plan**, frozen before the test: the plain description, parameters, spec fingerprint and the time it was registered (before the test started).
- **Results vs baseline**: a small paired bar chart for return, drawdown and longest losing streak, plus trade count, trials and compute cost.
- **Gates**: four rows with pass or fail and a plain reason (section 1).
- **Objections and answers.**
- **Lineage**: parent and child ideas.
- **Fresh-data check** (if reached): the test-window result next to the fresh-window result, and who ran it.
- **Run receipt** (monospaced, dashed border).

### 8.6 Council session (`/council/:id`)
- Panel with seats (chair, advocates, red team, synthesiser, specialist), each showing member, model and role version.
- Sections in order: **Objections raised**, **Answers**, **New combinations and alternatives**, **Verdicts**, **Summary**.
- This note is always visible: *"The council shows its decisions and the evidence behind them, not the agents' private reasoning. Code applies the gates; the council explains and challenges."*

### 8.7 Council approvals (`/approvals`)
This screen replaces v1's review desk. It is **watch-only**: nothing on it lets a person approve or reject.
- **In session**: one card per open approval panel. Each card shows the goal, the winning idea or ideas with test and fresh-data results, the number of ideas tried and the bar they cleared, how the objections were settled, the editor's draft, the precondition checks (gates passed, held up on fresh data) as green ticks, and the 5 approver seats. Each seat shows member, provider and model, the vote as it arrives, and the reason. Under the seats, a tally reads "3 of 4 needed".
- **Recent decisions**: published, sent back and not published, each with the deciding reasons. Clicking one opens the mission.
- **Role version promotions**: the council's decisions on candidate role versions, with their evaluation numbers.
- **Withdrawals**: items the council withdrew after publishing, with the trigger (e.g. "data feed reported missing weekend quotes").
- This note is always visible: *"Approvers never worked on what they approve, and every panel mixes AI providers. Code checks the evidence first; the panel decides whether it is fit to publish."*
- Empty state: "No panels in session. The council will seat one as soon as a mission has an idea that holds up on fresh data."

### 8.8 Library (`/library`): what the swarm has learned
- Counters: proven findings · dead ends · warnings · methods · open questions · money saved by reuse.
- Filter chips by kind, plus search.
- Each entry card: kind pill, title, text, the mission and idea it came from, and "reused N times, saved $x".
- **Role versions** section: each role's version history (active, candidates and retired), each with what changed and which missions it was learned from.
- **Open questions** link to "Start a mission from this", which pre-fills the new-mission form.

### 8.8a Improvement (`/improvement`): is the swarm getting better?
- **Best result over time**: a step chart with one line per topic, showing net return vs the starting rule. Each step is labelled with the mission that set it. A withdrawn best shows as a dip back to the previous one.
- **Topics**: one card per topic showing the current best (rule, since when, the mission it came from), the full history (e.g. "Fixed 15 pips → fixed 20 pips (M-05) → ?"), "challenged N times, beaten M times", the open challenge with its status, and the bar the next challenger must clear (from the total trial count). Show "Waiting for fresh data" when no newer window exists.
- **Different routes**: the Pathfinder's ideas across missions: how many were tried, how many passed the council, and any that became a current best.
- **Approval rule**: the current version with its settings and floors, the version history, and any rule change in progress. For a change in progress, show its replay numbers and the 7 rule-change panel seats with their votes.
- **Process changes**: a table of every Coach proposal: the change, the kind, learned from, replayed on, the before → after numbers (held up, false wins, cost), status and panel decision. Rejected and rolled-back changes stay visible with their reasons.
- This note is always visible: *"Nothing here changes the fixed rules. Every improvement has to beat what it replaces on evidence, then pass an approval panel. Changes to the approval rule need a stricter panel of 7 and can never go below the floors."*

### 8.9 Scoreboard (`/scoreboard`): does the swarm earn its keep?
This comes straight from the plan's central research question. It compares four set-ups on the same 6 past missions:

| Set-up | What it is |
|---|---|
| Simple baseline | Code only, no AI: a standard rule sweep |
| One agent | A single agent working alone |
| Small team | 5 specialists plus a council |
| Whole swarm | Every online member plus a council |

- Two views via a toggle: **Same budget** (each set-up gets the same $) and **Full capacity** (each set-up uses what it needs, so the extra spending is visible).
- Metrics: findings that held up on fresh data, false wins caught before publishing, best improvement that held up, cost per finding that held up, time to result, and items later withdrawn.
- A grouped bar chart and a table.
- The mock numbers must be **honest**. The whole swarm finds the most and catches the most false wins, but costs the most. At the same budget it beats the small team only narrowly, and on one mission the simple baseline matches it. Caption: *"Made-up illustrative numbers. In the real pilot, more agents are added only when the next step up shows a measurable benefit."*

### 8.10 Published (`/published`): the viewer page
- Same as v1 (filters All · Current · Expired · Withdrawn; the 4-fact grid **Observed · Published · Expires · Proven wrong if**; withdrawn and expired items stay visible), with a new footer: *"Chosen from N ideas tested by the swarm, cleared a bar that rose with every test, held up on fresh data run by a member who wasn't involved, and was approved by a council panel of 5 members across 2 AI providers, none of whom worked on it. See the evidence. Research only, not financial advice."*
- **Remove** every agreement percentage.

### 8.11 Contributors (`/contributors`)
- Table: member, computer ID, AI, roles, hours, **ideas proposed**, **passed council**, **held up on fresh data**, **objections upheld**, **calibration**, spent today, status, Pause/Resume (pausing removes the member from new seats and assignments) [A].
- Explainer cards: *How a computer joins* (unchanged) · *Their own limits* (unchanged) · *Credit that means something* ("Volume earns nothing. Credit comes from ideas that hold up and objections that turn out right. Standing decides whose ideas are tested first when the queue is full, never what is true.").

### 8.12 Budgets (`/budgets`)
- Keep v1 (today's stacked bar, spend by member, spend by AI model, last 7 days, most expensive table) but key it by **mission**, and add **Spend by phase**. The phase chart should show that exploring and the council are cheap and testing and the fresh-data check cost the most. That backs up the line "numbers done by code".

### 8.13 Audit trail (`/audit`)
- Keep v1 behaviour (check, tamper, undo; hashes; highlight from the broken entry onwards). Entries now link to a mission or idea.
- Tamper target: change entry 8's text from **"Verdict: I-12-14 rejected (look-ahead)"** to **"Verdict: I-12-14 promising"** without recomputing its hash.

---

## 9. Words and tone

| Use | Not |
|---|---|
| Mission | Task, job (for the top-level goal) |
| Idea | Hypothesis (OK in tooltips) |
| Test plan, registered before testing | Pre-registered experiment spec |
| Council | Committee, ensemble |
| Red team | Adversarial reviewer |
| Synthesiser | Aggregator |
| Bar to beat | Multiple-testing threshold (OK in tooltips) |
| Fresh-data check | Out-of-sample holdout validation |
| Held up / didn't hold up | Validated / invalidated |
| Dead end | Rejected hypothesis |
| Library | Knowledge base, research store |
| Current best | Champion |
| Challenger · Pathfinder · Coach | Champion–challenger agent · exploration agent · meta-optimiser |
| Different route | Exploration arm |
| Replay (re-running past missions with a change) | Process backtest |
| Run receipt | Signed manifest |
| Set aside | Budget reservation |
| Checking in | Heartbeat (OK in tooltips) |
| Member's AI / agent | Agent runner |

Use short, active sentences. Errors say what happened and how to fix it. Every published item carries "Research only, not financial advice." Don't use "agreement" as a measure anywhere.

---

## 10. Look and feel

Unchanged from v1. The owner asked to keep the design: the calm lab-notebook console; cool neutral greys with a slight green tint; one teal accent (light `#0b6e74`, dark `#4fc1c6`); **Bricolage Grotesque** / **Inter** / **IBM Plex Mono** with tabular numerals; light and dark modes; 10px-radius cards; status shown in colour plus words; 390px with no sideways page scroll; keyboard access and ARIA labels on charts.

New status colours for idea states: grey = proposed, merged or queued · teal = testing · blue-grey = tested · green = promising or held up · amber = needs evidence or in approval · red = rejected or didn't hold up · dotted grey outline = known dead end. Check every colour pair for contrast in both themes. The idea field must also read without colour (shapes plus the table toggle).

---

## 11. Mock data (seed)

Everything must be obviously fictional.

**Constants:** daily swarm cap $120 · member cap $10 · max jobs at once 20 · lease 60 s · check-in 15 s · default mission budget $40 · default rounds 3 · default depth 2.

**Roles:** Explorer (proposes ideas), Short-term analyst, Market regime analyst, Stop-loss researcher, Data quality monitor (code), Experiment worker (code), Red team, Synthesiser, Council chair, Fresh-data checker, Editor, Approver.

**Members (16):** keep the 8 from v1 and add 8 more with varied providers and models. Make 13 online and 3 paused. Give each a believable track record. At least one member should have many ideas proposed but few that held up, which shows that volume isn't credit. Another should have few ideas but a high hold-up rate and several upheld objections.

**Missions (8):**

| ID | Title | Phase | Notes |
|---|---|---|---|
| M-12 | Find a better way to handle stop-losses for the breakout strategy | fresh-data check, after round 2 | **The flagship**, a **challenge mission** against the current best (M-05). 46 ideas proposed from 14 members; funnel as in 8.1; 2 council sessions; 3 alternatives in the tree |
| M-11 | Is there a calmer time of day to enter breakout trades? | approval (panel in session, 2 of 5 votes in) | 31 ideas; winner "skip entries in the 30 minutes after the London open"; 1 idea didn't hold up on fresh data |
| M-10 | Can we spot a volatile week before it starts? | exploring, round 1 | Live-looking; ideas arriving |
| M-09 | Does the London open move EURUSD more than New York? | published | Proven; current |
| M-08 | Is the Monday-morning gap usually filled by Tuesday? | published, **withdrawn** | The council withdrew it automatically when the data feed reported missing weekend quotes; became library warning L-019 and inspired Red team v4 |
| M-13 | Does the ATR + time stop combination work in the week before an ECB meeting? | queued, **self-started** | Created by "Swarm" from open question L-027; waiting for the self-start budget |
| M-05 | Which fixed stop distance works best for 15-minute breakout trades? | published | Set the stop-loss topic's current best: fixed 20 pips (beat the 15-pip starting rule). M-12 is now challenging it |
| M-07 | Do wider fixed stops cut losing streaks? | closed: no winner | Nothing cleared the bar; source of dead end L-014 ("wider fixed stops: the gain vanished once two days in March were removed") |

**M-12 named ideas** (plus seeded generated filler to reach 46):

| ID | Idea | Family | Outcome |
|---|---|---|---|
| I-12-01 | Stop at 1.5× average true range (ATR) | volatility | promising |
| I-12-02 | Time stop: exit after 6 bars if not in profit | time | promising |
| I-12-03 | Trail the stop once the trade is up 1× its risk | trailing | needs evidence (too few trades) |
| I-12-04 | Wider fixed stop, 25 pips | structure | known dead end (L-014) |
| I-12-05 | Stop just beyond the last swing low/high | structure | promising |
| I-12-06 | Wider stops for the first hour after the London open | session | needs evidence |
| I-12-07 | Machine-learned stop distance (gradient boosting) | model | rejected: overfitting objection upheld (1,200 parameter sets tried); led to the cheaper alternative I-12-41 |
| I-12-08 | Move the stop to break-even at +0.5× risk | trailing | rejected: worse after costs |
| I-12-14 | Stop set from the Friday close | structure | rejected: look-ahead (used a price not yet known) |
| I-12-15 | No stop at all: size each trade by volatility instead (**Pathfinder**, different route) | volatility | needs evidence |
| I-12-16 | Exit when the breakout falls back inside its range, instead of a price stop (**Pathfinder**, different route) | structure | promising |
| I-12-40 | ATR stop + time stop combined (synthesis of 01 + 02) | combined, depth 1 | shortlisted, **held up** |
| I-12-41 | Simple ATR rule instead of the ML model, ~90% of its gain at a tenth of the cost (cheaper route to 07) | volatility, depth 1 | shortlisted, **held up** |
| I-12-42 | Swing stop, but switching to ATR in volatile weeks (synthesis of 05 + regime analyst) | combined, depth 1 | shortlisted, pending the fresh-data check |
| I-12-43 | 42 with a time stop added | combined, depth 2 | queued (at the depth limit) |

Baseline for M-12: the topic's current best, a fixed 20-pip stop (M-05). The starting rule was a fixed 15-pip stop. Keep the numbers internally consistent: the funnel counts must equal the idea states.

**Topics (4):**

| ID | Topic | History | Notes |
|---|---|---|---|
| T-1 | Breakout stop-loss | Fixed 15 pips (start) → fixed 20 pips (M-05, +1.1 pts, current) | Challenged 4 times, beaten once; open challenge M-12, whose leaders are ahead by about +1.4 pts; total trials about 2,900 |
| T-2 | Breakout entry timing | Enter on the breakout bar close (start, current) | Challenged twice, beaten 0 times; M-11 in approval could replace it |
| T-3 | Monday gap handling | No gap rule (start) → fade the Monday gap (M-08, withdrawn) → no gap rule (restored) | Shows automatic restore after a withdrawal |
| T-4 | Breakout take-profit | Fixed 2× risk target (start, current) | Never challenged; the tour's new mission challenges it |

**Process changes (8):**

| ID | Change | Status | Replay (before → after) |
|---|---|---|---|
| PC-03 | Use Claude Haiku 5.5 for round-1 explorers; Sonnet and Opus only on the council | adopted (review due after 3 more missions) | held up 9 → 9 · false wins 2 → 2 · cost $212 → $131 |
| PC-04 | Use a Large team instead of the whole swarm for descriptive questions | rejected by panel ("lost a finding on M-09") | held up 6 → 5 · cost $96 → $53 |
| PC-05 | Raise the different-route share from 20% to 30% | replaying (3 of 6 missions) | partial results |
| PC-06 | Skip round 3 when round 2 adds no new family of idea | rolled back after its 5-mission review ("would have missed 2 late winners") | held up 8 → 8 · cost −19% at replay |
| PC-07 | Red team v4: always check FX weekend gaps (role version) | in approval | issues caught +2 · false alarms 0 · cost +3% |
| PC-08 | **Approval rule v2**: for findings with fewer than 100 trades, 2 approvers must re-run the fresh-data numbers themselves | **adopted** by a rule-change panel, 7 of 7 (learned from M-08) | replayed on 11 missions · false wins 2 → 0 · held up 14 → 14 · cost per finding +4% |
| PC-09 | **Approval rule**: 3 of 5 approvals for descriptive findings | **refused by code**: below the floor (at least 4 approvals) | not replayed |
| PC-10 | **Approval rule v3 (proposed)**: descriptive findings get a 5-seat panel without the extra re-run check | rule-change panel **in session**, 4 of 7 votes in | replayed on 10 missions · false wins 0 → 0 · held up 14 → 14 · cost per finding −11% |

**Approval rule:** version 2 (from PC-08) is active: 5 seats, 4 approvals, 2 providers, plus the extra re-run check. Version 1 is retired. M-05, M-08 and M-09 were approved under v1; M-11's panel runs under v2.

**Coach reviews:** one each for M-05, M-07, M-08 and M-09. M-07's should say the swarm was "too big" for a question that ended with no winner.

**Library (about 20 entries)** across all kinds, including L-014 (dead end, from M-07), L-019 (warning: weekend quotes, from M-08), proven entries from M-09, a method ("Test stop rules with the entry strategy held fixed"), and open questions such as "Does the ATR + time stop combination work on GBPUSD?".

**Role versions:** Red team v3 (active) and v4 (candidate, learned from M-08: "always check FX weekend gaps"; evaluated on 4 past missions, 2 extra issues caught, 0 false alarms, +3% cost; promotion panel in session). Approver v1 (active). Synthesiser v2 (active), v1 (retired). Explorer v5 (active).

**Scoreboard:** 6 past missions × 4 set-ups, with honest numbers as described in 8.9.

**Audit:** about 25 seed entries telling the same story, including the M-12 verdicts (entry 8 = the I-12-14 look-ahead rejection), M-09's approval votes, one lease expiry, one paused member, the council's automatic M-08 withdrawal, and the self-started M-13. Compute the hash chain at startup.

**Prices:** keep the seeded EURUSD random walk.

---

## 12. Guided tour and walkthrough

Update **Take the tour** (overlay, Next / Back / Close, position kept in memory only):

1. **Overview**: the swarm is a crew of members' agents working on missions together.
2. **M-12 mission page**: the idea field, the funnel and the bar to beat.
3. **Council session**: objections, a cheaper alternative and verdicts by gates rather than votes.
4. **Family tree**: how an alternative came from a rejected idea.
5. **New mission**: pre-fills the take-profit example, shows the library check and the current best it must beat, and launches it (2× speed).
6. **Live mission**: ideas arrive from many members, including the Pathfinder's different routes, and are tested, judged and checked on fresh data.
7. **Council approvals**: watch the panel vote and publish it with nobody stepping in. Then see Red team v4 promoted by the council.
8. **Library**: what was learned, including the dead ends.
9. **Improvement**: the new mission just became the take-profit current best, and the Challenger has already scheduled a challenge to it. Show the best-over-time chart and the Coach's process changes, including one rejected and one rolled back. Finish on the approval rule: v2 adopted by a 7-seat panel, one proposal refused for breaking a floor, and v3 being voted on now.
10. **Scoreboard**: does the swarm beat simpler set-ups? (honest numbers).
11. **Audit trail**: tamper with the verdict, check the chain, undo. Close on the queued challenge and self-started missions: the swarm keeps going on its own.

Rewrite `docs/walkthrough.md` as the same tour in a click-by-click script for a live presenter, including a 30-second "what makes this different" opener.

---

## 13. Build order

Commit after each step. Keep lint, tests and build green throughout.

1. Archive the v1-only code paths. Remove `agreement.ts`, the Ask screen, the Board screen, the Review desk's approve and reject buttons, and every agreement % in the copy. Keep tokens, Shell, Rail, Pill, Charts, Tour, the audit chain, budget and manifest.
2. Types plus the domain logic from section 5, with unit tests (library check, dedupe merge, gates and bar to beat, panel seating with no self-judging, lineage depth limit, approval panel seating and the 4-of-5 rule, automatic withdrawal, self-start budget, current-best replacement and restore, challenge triggers and fresh-window waiting, the cumulative bar to beat, replay excluding learned-from missions, the adoption and rollback rules, refusing process changes that touch fixed rules, track-record updates, the simulator tick plan including all four options, and budget stop).
3. Seed data from section 11, with a consistency test (funnel counts match idea states; every objection references a real idea; every library entry references a real mission; each topic has exactly one current best).
4. Store wiring, routes and the rail groups.
5. Screens in this order: Mission page → New mission (with simulation) → Idea page → Council session → Council approvals → Library → Improvement → Scoreboard → Missions → Overview → Published → Contributors → Budgets → Audit.
6. Tour and `docs/walkthrough.md`.
7. Update the README (the explanation, the mission loop, the rules, "how the swarm learns and improves" and the assumptions).
8. `npm run lint`, `npm test` and `npm run build`. Check 390px and dark mode on every screen, especially the idea field and the family tree.

---

## 14. Acceptance checklist

- [ ] All 14 routes are reachable; deep links like `#/missions/M-12` and `#/ideas/I-12-40` work after a reload.
- [ ] No agreement percentage appears anywhere in the app.
- [ ] Launching the take-profit example runs the whole loop to **published by the council, with no clicks after launch**, in about 70–85 s at 1× (well under that at 4×), with ideas from at least 8 different members.
- [ ] The idea field updates live, and the bar-to-beat line moves right as the trial count grows.
- [ ] At least one objection is upheld, one is answered, and at least one cheaper alternative appears in the family tree.
- [ ] One shortlisted idea fails the fresh-data check and appears in the library as a warning.
- [ ] The stop-loss example shows "already running (M-12)" and creates nothing.
- [ ] A budget above the free amount is refused with a clear message.
- [ ] Each of the four options (no winner, dropped connection, budget limit) works and leaves audit entries.
- [ ] No member judges or fresh-checks an idea from their own lineage (covered by a test).
- [ ] A known dead end is flagged and not re-tested.
- [ ] No screen offers a person an approve, reject or edit control for findings. The only owner controls are budgets and settings, pause, and the emergency stop.
- [ ] Approval panels never include anyone from the idea's lineage, fresh-data check or draft, and always mix at least 2 providers (covered by a test).
- [ ] The council publishes with the 4 facts filled and writes library entries; the "Panel rejects" option sends the mission back and it passes on the second panel.
- [ ] The emergency stop halts new work and publishing, writes an audit entry, and can be released.
- [ ] A self-started follow-up mission appears after the run, tagged "Swarm".
- [ ] Each live run includes at least 3 Pathfinder "Different route" ideas, within the different-route share.
- [ ] After the run, the new mission becomes the take-profit current best, the Challenger schedules a challenge to it, and a Coach review with one queued process change appears. All of these leave audit entries.
- [ ] The Improvement screen shows every topic's history, the best-over-time chart, all 8 process changes (including the rejected, refused and rolled-back ones), and the approval rule's version history.
- [ ] Withdrawing a current best restores the previous one (T-3 in the seed; covered by a test).
- [ ] Challenge missions use the topic's total trial count for the bar to beat, and wait when there is no newer fresh window (covered by tests).
- [ ] A process change that touches a fixed rule is always refused, and replays never use the missions a change was learned from (covered by tests).
- [ ] Approval-rule changes: one below a floor is refused by code; a rule-change panel has 7 seats, at least 2 providers, no provider over 4 seats, and excludes the Coach and anyone who sat on a replayed mission's panel; 6 of 7 are needed; an adopted rule applies only to missions started afterwards; probation rolls it back on a false win the old rule would have caught (all covered by tests).
- [ ] Every published item shows which approval rule version approved it.
- [ ] The scoreboard shows both views, and its numbers include the honest cases from 8.9.
- [ ] Pausing a member removes them from new seats and assignments.
- [ ] The audit tamper breaks at entry 8 and undo restores it.
- [ ] Light and dark both look right; there is no sideways scroll at 390px; the idea field has a table alternative.
- [ ] Tests pass; the build works from a sub-path; the README and walkthrough are updated.

---

## 15. How this maps to the source documents

So the owner and collaborators can see this is grounded in the planning documents, not invented:

| v2 concept | Source |
|---|---|
| Many agents across members, providers and roles | Plan: members contribute agent capacity; Codex and Claude adapters; path to 10,000 registered workers |
| Register before testing; every attempt kept | Plan: "Register hypotheses before testing… keep a ledger of every attempted parameter set and rejected hypothesis" |
| Bar to beat | Plan: "selecting the best of thousands of trials can otherwise produce misleading results. Use appropriate multiple-testing controls" |
| Fresh-data check by uninvolved members | Plan: "reserve fresh evaluation windows… require independent reproduction"; reviewer must differ from the producer |
| Council by evidence, not votes | Plan: "Agent agreement is not independent confirmation" |
| Alternatives spawn new work within depth and budget | Plan and brainstorm: child jobs draw from the parent's reservation up to a maximum depth; `ask_specialist` |
| Library, reuse and dead ends | Plan: "Store validated knowledge and versioned research methods as shared assets"; MCP `find_completed_study`, `search_findings` |
| Better roles via evaluated candidates | Plan: "Updating a prompt… creates a candidate version that must pass evaluation before becoming the active version" |
| Shared evidence board, small panel, no all-to-all chat | Plan: "Avoid unrestricted all-to-all discussion… cross-group messages contain specific requests and evidence references" |
| Show decisions, not reasoning traces | Plan: "Display concise decisions and supporting evidence rather than private internal reasoning traces" |
| Scoreboard | Plan: compare baseline, one agent, small team and larger team at fixed budget and at full capacity |
| Credit for work that holds up | Plan: "Contribution volume does not establish research quality; credit accepted, reproducible contributions" |
| Numbers by code; MCP tools per role | Plan and brainstorm: deterministic numerical workers; MCP servers with per-job grants |
| Council approves and publishes | **Owner decision, 27 November 2026.** This replaces flowchart step 13 ("Publishing is always a human decision") and the plan's human publication approval. Kept from the documents: the producer can't approve its own work, and reviewer and publisher must differ from the producer |
| Emergency stop | Plan: "Provide global, member and role stop controls" |
| Current best and challengers | Plan: "Updating a prompt, strategy or trained model creates a candidate version that must pass evaluation before becoming the active version" |
| A new fresh window for every challenge | Plan: "Repeatedly inspecting a holdout makes it part of the development process" |
| Bar to beat counts every trial on the topic | Plan: "selecting the best of thousands of trials can otherwise produce misleading results" |
| Paper-drift trigger | Plan: "use forward paper evaluation as additional evidence" |
| Approval rule changes need a stricter panel and wider evidence | Plan: "Updating a prompt, strategy or trained model creates a candidate version that must pass evaluation"; reviewer must differ from the producer. Floors keep the plan's separation of duties |
| Coach: swarm size and model choice | Plan: "Increase agent count only when the next cohort demonstrates a measurable benefit"; brainstorm: "Model per role: Haiku for simple checks… Opus only where judgment matters" |

**Where v2 goes beyond or changes the documents** (to confirm with the owner): autonomous approval and publishing by the council, the Coach being able to change the approval rule (owner decision, 27 November 2026), self-started missions, the Challenger, Pathfinder and Coach roles, the current-best model, the council as a named stage with seats, the synthesiser role, the "cheaper route" search, track-record-based queue priority, and the 16-member demo crew (the plan's pilot is 5–10 contributors).

---

## 16. Assumptions and open questions

1. All money figures, caps and the bar-to-beat formula are **invented placeholders**.
2. The demo shows 16 members to make the swarm visible. The plan's pilot is 5–10 contributors with at most 20 jobs at once; the cap is kept as the concurrency limit.
3. The approval panel size (5), the 4-of-5 rule and the 2-provider minimum are invented placeholders. The self-start budget ($30/day), the 20% different-route share, the challenge triggers (30 days and the others) and the Coach's adoption rule (at least 10% saving) are too. So are the approval-rule floors, the 7-seat rule-change panel, 6 of 7, the 10-mission replay and the 5-mission probation. The owner decided on 27 November 2026 that the Coach may propose approval-rule changes, through the stricter path in 6.5.
4. **Publishing to outside viewers.** The plan notes that ASIC treats opinions meant to influence financial-product decisions as possible advice, whoever (or whatever) approves them. Removing the person from the loop doesn't change that. The demo is unaffected, but before real outside viewers see autonomous output, the content, audience and jurisdictions still need the review the plan describes.
5. Should track records ever affect anything beyond queue priority?
6. How many fresh-data windows does a mission get? Once a window is opened it is "used", per the plan.
7. Should viewers see the dead ends and the ideas that didn't hold up, or only the winners plus a count?
8. Can outside agents (via the A2A gateway) start missions or only propose ideas into one? The demo shows people and swarm roles only.
9. AI names (Claude, Codex) follow the source material; model names are examples.

---

## 17. Out of scope

Real authentication, a backend or database, real AI calls, real market data, payments, trading or order placement, and any blockchain, token or wallet. Also out of scope: agents changing their own permissions or budgets, or the fixed rules, even in the simulation. The approval rule changes only through 6.5, and never by the agent that proposed the change.
