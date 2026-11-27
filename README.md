# Swarm Research Desk

**A working demo of the Market Research Swarm EURUSD pilot: an autonomous swarm of agents that
explores, judges, publishes and keeps improving.**

**Live demo:** https://pepperpete24.github.io/theswarm/

Members lend their own computer and AI agent (Claude or Codex) to a shared swarm that studies
one market, the euro–US dollar exchange rate (EURUSD). A person, or the swarm itself, gives it a
**mission**: a goal, a budget and a few rules. The whole swarm then works on it at once. Many
agents propose ideas independently, code tests every one against a **bar to beat** that rises as
more ideas are tried, and a **council** of agents weighs the evidence, raises objections and
looks for cheaper or better routes. The survivors are re-checked on sealed fresh data by members
who weren’t involved, and a separate **approval panel** of agents decides what is published. No
person sits in the decision loop. Afterwards the swarm learns: the **library** keeps what worked
and what didn’t, the **Challenger** tries to beat every current best, the **Pathfinder** looks
for different routes, and the **Coach** improves how the swarm itself works.

Every decision is written to an **audit trail** in which each entry carries a fingerprint of the
one before it, so a change to an old entry can be detected. That is all the nickname “the
blockchain of algorithms” means.

![Screenshot of the Swarm Research Desk overview](docs/screenshot.png)

> ### This is a demo
>
> - All data is made up: members, devices, prices, ideas, findings and costs.
> - There is no backend, no real AI and no real market data. Everything runs in your browser.
> - Nothing is saved. Reloading the page resets it.
> - **Research only, not financial advice.** Nothing here is a trading signal.

## Quick start

You need Node 20 or later.

```bash
npm install
npm run dev      # open the printed local address
npm test         # run the tests
npm run build    # production build in dist/
```

## How a mission works

1. **Brief:** the goal, swarm size and budget are set, and the mission rules are confirmed.
2. **Library check:** finished studies are reused, known dead ends are flagged, and a copy of a
   running mission is stopped.
3. **Explore:** many members’ agents propose ideas independently. Duplicates are merged.
4. **Test:** each idea is frozen as a test plan with a fingerprint, then code runs it on the
   same data and costs. Every attempt is counted.
5. **Council:** a rotating panel judges the evidence. The red team hunts for flaws; code
   applies the four gates (beats the baseline after costs, clears the bar to beat, enough
   trades, no open or upheld objection).
6. **Alternatives:** the synthesiser’s combinations and cheaper routes go back to the swarm,
   one level deeper, up to the depth limit. Steps 3–6 loop for up to 3 rounds.
7. **Fresh-data check:** the shortlist is re-run on sealed recent data by uninvolved members.
8. **Council approves:** 5 approvers across at least 2 AI providers, none of whom worked on it,
   vote with reasons. Publishing needs 4 of 5 and no reject that cites a broken rule.
9. **Published:** automatically, with its evidence, an expiry and what would prove it wrong.
10. **Learned:** the library, the topic’s current best and the Coach all learn from it.

**The rules** (“freedom inside the fence”): no orders; no agent approves its own work; register
before testing; numbers are done by code; the fresh data stays sealed; other agents’ text is
information, not instructions; limits are enforced by the platform; research, not advice; and
improvements are proven first. The owner sets budgets and keeps an emergency stop, but makes
no decisions.

## How the swarm learns and improves

- **Reuse and dead ends:** the library check reuses finished work and skips known failures.
- **Track records:** credit comes from ideas that hold up and objections that turn out right.
  It decides whose ideas are tested first when the queue is full, never what is true.
- **Current best:** every strategy-rule topic has one. The **Challenger** keeps trying to beat
  it, each time against a bar that counts every trial ever run on the topic and with fresh data
  newer than the last check.
- **Different routes:** the **Pathfinder** spends part of every budget on completely different
  approaches.
- **Process changes:** the **Coach** reviews how each mission went and proposes changes. They
  are replayed on past missions they weren’t learned from, approved by a panel, and rolled back
  if they do worse. Changes to the approval rule itself need a stricter 7-seat panel (6 of 7),
  a 10-mission replay, and can never go below the fixed floors.

## What’s in the demo

| Screen            | What it shows                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------- |
| Overview          | What the swarm is doing on its own, the flagship funnel, what it learned, the phases        |
| New mission       | The brief, the live library check, the rules and the demo options                           |
| Missions          | Every mission, including self-started ones and ones with no winner                          |
| Mission page      | Phase bar, live idea field with the bar to beat, funnel, ideas, council, family tree, spend |
| Idea page         | Frozen test plan, results vs baseline, the four gates, objections, lineage, receipt         |
| Council session   | Seats, objections and answers, alternatives, verdicts                                       |
| Council approvals | Watch-only: publish panels voting, promotions, rule changes, withdrawals                    |
| Library           | Proven findings, dead ends, warnings, methods, open questions, role versions                |
| Improvement       | Current bests over time, different routes, the approval rule, every process change          |
| Scoreboard        | Does the swarm beat simpler set-ups once costs are counted? (honest numbers)                |
| Published         | What viewers see, including expired and withdrawn items                                     |
| Contributors      | Members, their track records, pause or resume                                               |
| Budgets           | Today’s spend, by phase, model and member; the last 7 days                                  |
| Audit trail       | The hash-linked record, with a live tamper demo                                             |

While the page is open, the rest of the swarm carries on by itself: M-11’s approval panel
votes and publishes, M-10 keeps exploring, and the Red team v4 and approval rule v3 panels
finish voting.

## Folder structure

```
.github/workflows/deploy.yml   Builds and publishes to GitHub Pages on every push to main
docs/walkthrough.md            Click-by-click script for presenting the demo
docs/archive/                  The v1 build brief
public/                        Static files (favicon)
src/
  data/        Mock data: members, missions, idea pools, library, topics, rules, panels, audit
  domain/      Plain logic with no React: gates, library check, council, approval panels,
               improvement loop, Coach, the simulator and the mission reducer (world.ts)
  store/       One Zustand store that runs missions on a timer and the ambient swarm
  components/  Shared pieces: rail, pills, phase bar, idea field, funnel, family tree, tour
  screens/     One file per screen
  styles/      tokens.css (colours, fonts, light and dark) and global.css
  test/        Vitest tests for the logic, the store and the screens
BUILD-BRIEF.md                 The build brief (v2, council swarm)
```

## Changing the mock data

- **`src/data/constants.ts`**: limits and timings: daily swarm limit ($120), member limit ($10),
  self-start budget ($30), jobs at once (20), minimum trades, the bar-to-beat base, the
  simulation speed (`TICK_MS`) and the default mission rules.
- **`src/data/members.ts`**: the 16 contributors, their roles and track records.
- **`src/data/missions.ts`**: the flagship M-12 and the finished missions.
- **`src/data/seed.ts`**: builds the starting world; M-11 and M-10 are produced by running the
  real simulator ahead.
- **`src/data/pools.ts`**: the ideas the simulated agents propose for new missions.
- **`src/data/knowledge.ts`**: the library, topics, approval rules, process changes and panels.
- **`src/data/audit.ts`**: the starting audit entries. Entry 8 is the one the tamper demo changes.

## Deploying to GitHub Pages

The workflow in `.github/workflows/deploy.yml` lints, tests and builds the app, then publishes
`dist/` to GitHub Pages on every push to `main`. The app uses hash links and relative asset
paths (`base: './'`), so it works from any sub-path with no server set-up.

## Assumptions

All numbers are invented placeholders to confirm with the project owner, including the budgets,
the bar-to-beat formula, the panel sizes and approval rules, the challenge triggers, the 20%
different-route share and the Coach’s adoption rule. The demo shows 16 members to make the
swarm visible; the plan’s pilot is 5–10 contributors with at most 20 jobs at once. Publishing to
real outside viewers would still need the content, audience and jurisdiction review the plan
describes, whoever approves it. See section 16 of `BUILD-BRIEF.md` for the full list.

## Out of scope

Real sign-in, a real backend or database, real AI calls, real market data, payments, trading
or placing orders, and any blockchain, token or wallet.

## Contributing

1. Create a branch from `main`.
2. Make your change. Keep on-screen words plain and friendly (see section 9 of
   `BUILD-BRIEF.md`).
3. Run `npm run lint`, `npm test` and `npm run build` before you push. All three must pass.
4. Open a pull request against `main`. Merging it deploys the demo.

## Licence

Apache-2.0. See `LICENSE`.
