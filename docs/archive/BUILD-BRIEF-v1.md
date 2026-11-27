# Build brief: Swarm Research Desk demo app

*For Claude Code. Written 26 November 2026. Version 1.*

> **How to use this file.** Put it in an empty folder that will become the git repository, open Claude Code in that folder and say:
> "Read BUILD-BRIEF.md and build the whole app it describes. Work through the build order in section 12 and check off the acceptance checklist in section 13 when you're done."
> If `swarm-demo.html` is in the same folder, treat it as the visual and behavioural reference. It is a single-file prototype of this exact app.

---

## 1. What we are building, in plain words

The **Market Research Swarm** is a research club in which each member lends their own computer and AI assistant (Claude or Codex) to a shared pool. The pilot studies one market only, the euro–US dollar exchange rate (**EURUSD**).

The life of one question goes like this:

1. Someone asks a research question.
2. The platform hands it to one member's AI, which does the research and hands in a finding along with a signed **run receipt**.
3. A **different** member's AI redoes the work independently.
4. If the two answers agree, an editor AI writes a short post.
5. A **human** approves or rejects that post. No AI can publish.
6. Approved posts appear on a viewer page with their evidence.
7. Every step is written to an **audit trail** in which each entry carries a fingerprint of the one before it, so a change to an old entry can be detected.

The project nickname, "the blockchain of algorithms", means only this: two independent AI checks, a human sign-off, and a record that can't be changed quietly. **Do not build a real blockchain, token, wallet or crypto feature.**

**This app is a demo.** It shows the full functionality with mock data and simulated behaviour. It has no real backend, no real AIs and no real market data. It must run entirely in the browser and deploy to GitHub Pages as static files.

**Audience:** pilot contributors and non-technical stakeholders. All on-screen text must be plain, friendly English (see section 8).

---

## 2. Tech stack

| Concern | Choice | Why |
|---|---|---|
| Build tool | **Vite** | Fast, simple static output for GitHub Pages |
| UI | **React 18 + TypeScript** | Matches the real platform plan (React/TypeScript web app) |
| Routing | **React Router v6, `HashRouter`** | Hash URLs work on GitHub Pages with no server rewrites |
| State | **Zustand** (one store) | Small, readable, easy for contributors |
| Styling | Plain CSS with CSS variables (one `tokens.css` + per-component CSS modules) | No framework lock-in, easy light/dark themes |
| Charts | Hand-written SVG components | Only a sparkline and bar charts are needed |
| Hashing | `crypto.subtle.digest('SHA-256')` for the audit chain | Real hashing makes the tamper demo honest |
| Tests | **Vitest** + **React Testing Library** | Unit tests for store logic, a few screen tests |
| Lint/format | ESLint + Prettier | Standard |
| Deploy | GitHub Actions workflow to GitHub Pages | One push = live demo link |

Node 20 or later. Use npm. Pin dependency versions in `package.json`.

---

## 3. Folder structure

```
swarm-research-desk/
├─ BUILD-BRIEF.md              # this file
├─ README.md
├─ LICENSE                     # MIT unless the owner says otherwise
├─ index.html
├─ package.json
├─ vite.config.ts              # base: './' so it works under /<repo>/ on Pages
├─ tsconfig.json
├─ .github/workflows/deploy.yml
├─ reference/
│  └─ swarm-demo.html          # single-file visual prototype (if provided)
├─ docs/
│  ├─ design-brief.md          # plain-language design brief (if provided)
│  └─ walkthrough.md           # click-by-click demo script (you write this)
├─ public/
│  └─ favicon.svg
└─ src/
   ├─ main.tsx
   ├─ App.tsx                  # layout: side rail + routed main area
   ├─ styles/tokens.css        # colours, fonts, spacing, light + dark
   ├─ styles/global.css
   ├─ data/                    # mock data, all clearly fictional
   │  ├─ members.ts
   │  ├─ jobs.ts
   │  ├─ audit.ts
   │  ├─ prices.ts             # seeded random-walk EURUSD prices
   │  └─ constants.ts          # caps, thresholds, step names, role names
   ├─ domain/                  # pure logic, no React; fully unit-tested
   │  ├─ types.ts
   │  ├─ budget.ts             # spent, set-aside, free, admission check
   │  ├─ dedupe.ts             # "already studied?" check
   │  ├─ agreement.ts          # agreed vs challenged
   │  ├─ auditChain.ts         # append, verify, tamper, repair
   │  ├─ manifest.ts           # build a run receipt for a job
   │  └─ simulator.ts          # timed step plan for a new job
   ├─ store/useSwarm.ts        # Zustand store wiring domain logic to UI
   ├─ components/              # Pill, StepBar, Timeline, AnswerCompare,
   │                           # RunReceipt, CostBar, Sparkline, BarChart,
   │                           # Toast, Panel, DemoBanner, Tour
   ├─ screens/                 # one file per screen (section 5)
   └─ test/                    # Vitest specs
```

---

## 4. Domain model (TypeScript types)

```ts
type JobState =
  | 'queued'       // waiting for a member
  | 'researching'
  | 'rechecking'
  | 'challenged'   // re-check disagreed; running again
  | 'human'        // waiting for a person
  | 'published'
  | 'rejected'
  | 'withdrawn';

// Index 0..9 into STEPS
const STEPS = ['Asked','Checked','Assigned','Researching','Handed in',
               'Re-checked','Agreed','Drafted','Person decides','Published'];

interface Member {
  id: string; name: string; device: string;      // e.g. "DESK-7F2A"
  model: string;                                  // "Claude Sonnet 5.5" | "Codex" | ...
  roles: string[]; hours: string;
  acceptedFindings: number; confirmedRate: number; // % of work confirmed by re-check
  spentToday: number; dailyCap: number; online: boolean;
}

interface Job {
  id: string;                 // "J-1043"
  question: string; role: string;
  state: JobState; step: number;
  agentId?: string; reviewerId?: string;
  reserved: number; spent: number;   // US$
  agreement?: number;                // 0–100
  finding?: string; recheck?: string;
  resultTable?: [string,string,string][]; recheckTable?: [string,string,string][];
  draft?: string;
  observedAt?: string; publishedAt?: string; expiresAt?: string;
  provenWrongIf?: string; expired?: boolean; withdrawnNote?: string;
  history: { time: string; text: string; who: string }[];
  manifest: Record<string,string>;   // run receipt, see 4.1
  isUserCreated?: boolean;
}

interface AuditEntry {
  index: number; time: string; who: string; action: string; jobId?: string;
  prevHash: string; hash: string;    // hash = SHA-256(prevHash + time + who + action + jobId)
}
```

### 4.1 Run receipt (manifest) fields

Show every field, in this order: Job, AI provider and model, Role version (name + short hash), Tools allowed, Tool calls made, Data used, Data fingerprint, Code version, Tokens used, Estimated cost, Started, Finished, Runner version, Device, Signed with device key.

Below it, always show this line: *"The signature proves which computer sent this receipt. It does not prove the answer is right; the independent re-check does that."*

---

## 5. Screens

The layout is a fixed left side rail on desktop, which becomes a sticky, horizontally scrolling tab strip at phone width (under about 760px). The rail shows the app name "Swarm Research Desk", the subtitle "EURUSD pilot", the nav links, a count badge on Review desk, and a footer note: "Demo with made-up data. Nothing here is real or saved; reload to reset. Signed in as You, publisher."

Routes (hash): `#/`, `#/ask`, `#/board`, `#/jobs/:id`, `#/review`, `#/published`, `#/budgets`, `#/contributors`, `#/audit`.

### 5.1 Overview (`/`)
- Four tiles: **Jobs in progress** (x / 20 max, with the number challenged), **Waiting for a person** (link to the review desk), **Spent today** (of the $25 limit, plus the amount set aside), **Contributors online** (x / 8).
- **EURUSD, last 24 hours**: an SVG sparkline with area fill, 3 dashed gridlines labelled with prices, a dot on the last point, and the last price with the % change coloured green or red. Below it: "Data health: No gaps found".
- **Needs attention** list: jobs waiting for a person, challenged jobs, and paused contributors.
- **How one question becomes a published finding**: a 10-segment step bar with a tooltip on each step and a one-line explanation.
- An "Ask a question" primary button.

### 5.2 Ask a question (`/ask`)
- A form with: question (textarea), clickable example chips, kind of specialist (select of roles), most it may cost (US$ number), and time period (select).
- A side panel titled "What happens next" lists all 10 steps with their plain explanations.
- On submit, in this order:
  1. **Already studied?** If the question exactly matches (case-insensitive) a job that is published or waiting for a person, show a green banner: "Already studied. The swarm answered this in J-xxxx, so you get that answer for free and nothing new is spent." Link to that job and do not create a job.
  2. **Budget check.** If the max cost is more than today's free budget, show a red banner explaining why and how to fix it. Do not create a job.
  3. Otherwise create the job, write the audit entry, navigate to its job page and start the **live simulation** (section 6).
- The example chips must include one that triggers the "already studied" path ("How did EURUSD react to the last ECB rate statement?") and one that runs a fresh job ("Is EURUSD more volatile on Fridays than on other weekdays?").

### 5.3 Work board (`/board`)
- Five columns: Waiting for a member · Researching (includes challenged) · Being re-checked · Waiting for a person · Done (published, rejected, withdrawn). Each column header shows a count.
- Each card shows: job ID, a "yours" tag if the user created it, the question, the assigned member (or "Unassigned"), spent / set aside, and a status pill. Clicking a card opens the job page.
- The board scrolls sideways inside its own container on narrow screens.

### 5.4 Job page (`/jobs/:id`)
- Back link, eyebrow (ID · role), the question as the title, and a status pill.
- A **step bar**: done steps in the accent colour, the current step pulsing amber, red if challenged/rejected/withdrawn. Below it, the plain explanation of the current step. While researching, show a green heartbeat dot with "Checking in every 15 s · lease renews every 60 s".
- An amber banner when waiting for a person, with a "Review it" button. A red banner for withdrawn jobs with the reason.
- **The two answers** (signature visual): the first answer on the left, a big agreement % in the middle (green at 90 or more, red below, "…" while running, and a "bar: 90%" note), and the independent re-check on the right. Each side shows the member's name, the AI model and the text, plus an optional small results table (the stop-loss job has one).
- **What happened**: a vertical timeline (time, event, who).
- **Cost**: a bar of spent vs set aside, with a legend and the note "Anything not spent goes back to the daily budget when the job closes."
- **Run receipt** in a monospaced, dashed-border box.

### 5.5 Review desk (`/review`)
- One panel per job in the `human` state: the question, an agreement pill, the two-answer comparison, the editor AI's draft, an optional note input, and the buttons **Approve and publish**, **Reject** and **See full job and receipt**.
- Approve: set the state to published, step to 9, set the published/expiry times, add a history line and an audit entry (including the note), and show the toast "J-xxxx is now published. See what viewers see".
- Reject: set the state to rejected, add history and audit entries, and show a toast.
- Empty state: "All clear. Nothing is waiting for a decision. Ask a new question to see one arrive here."

### 5.6 Published findings (`/published`): the viewer page
- Filter chips: All · Current · Expired · Withdrawn.
- Each post shows: an eyebrow "EURUSD · role", the question, a status pill, the draft text, a withdrawal banner if relevant, a 4-fact grid (**Observed · Published · Expires · Proven wrong if**), and the footer "Checked by two independent AIs (xx% agreement) and approved by a person. See the evidence. Research only, not financial advice."
- Expired and withdrawn items stay visible. Never hide losing or withdrawn results.

### 5.7 Budgets (`/budgets`)
- **Today** stacked bar: spent (accent) + set aside for running jobs (amber) + free, with a legend and the $25 daily limit. Note: "A new job is refused if it would push the total past the daily limit, or past its member's own limit of $5 a day."
- **Spend by member today**: horizontal bars with each member's limit.
- **Spend by AI model today**: horizontal bars.
- **Last 7 days**: an SVG column chart with a dashed $25 limit line and a value label on each column; today is highlighted.
- **Most expensive jobs** table, which scrolls sideways on mobile.
- Footnote: costs are estimates; the limits are placeholders.

### 5.8 Contributors (`/contributors`)
- Table: member, computer ID, AI, roles, hours, accepted findings, % confirmed by re-check (coloured), spent today, status pill, and a **Pause/Resume** button. Toggling writes an audit entry and shows a toast. A paused member gets no new jobs in the simulator.
- Three explainer cards: *How a computer joins* (a small program that only calls out; nobody can connect in; the AI sign-in stays on the member's machine) · *Their own limits* (roles, hours, daily limit, pause any time) · *Fair credit* (only reproduced findings count).

### 5.9 Audit trail (`/audit`)
- Intro: "Every decision and hand-over is written here. Each entry carries a fingerprint of the entry before it, so changing any old entry breaks the chain from that point on. This is the 'blockchain' part of the swarm."
- Buttons: **Check the chain**, **Try changing an old entry**, and **Undo the change** (shown only when the chain is broken).
- Entries are listed newest first: time, who · action, a job link, `#n <hash>` and `after <prevHash>` (show the first 16 hex characters).
- Check result: a green banner "Chain intact. All N entries match their fingerprints." or a red banner "Chain broken at entry N. Someone changed it after it was written, so every entry after it no longer lines up." All entries from N onward are highlighted red.
- Tamper action: change entry 8's text from "agree (96%)" to "agree (99%)" **without** recomputing its hash, then show a toast that says what was changed.

---

## 6. The live simulation (the centrepiece)

When a new job is submitted, advance it through these ticks **every 2.3 seconds** (make the interval a constant so the walkthrough can speed it up or slow it down). Each tick updates the store, the job history and, where marked [A], the audit trail.

| Tick | What changes |
|---|---|
| 1 | step 1 · "Checked: not studied before, within budget" [A] |
| 2 | step 2 · pick a random **online** member (not the reviewer) · set aside the max cost · "set aside, assigned to X's AI" [A "60 s lease to DEVICE"] |
| 3 | step 3 · state researching · heartbeat shows |
| 4 | spent = 35% of max |
| 5 | spent = 62% · step 4 · "Handed in with signed run receipt" [A ×2: handed in; "Receipt valid, lease current"] |
| 6 | step 5 · state rechecking · reviewer = Dana M. [A] |
| 7 | spent = 81% |
| 8 | step 6 · agreement 93% · "Agreed: answers 93% alike" [A] |
| 9 | step 7 · "Draft written by editor AI" [A] |
| 10 | step 8 · state human · charge members' spend · toast "J-xxxx agreed and is waiting for you. Open the review desk" · stop |

- The simulation keeps running if the user navigates away.
- Add a small **"Show a challenge"** option on the Ask form, unticked by default. When it is ticked, tick 8 gives 74%, the job goes to `challenged`, it returns to step 2 with a new member, and the second pass agrees. This demonstrates the "challenged → goes back" loop from the flowchart.
- Add a **"Simulate a dropped connection"** option, unticked by default. When it is ticked, after tick 4 the heartbeat stops, the lease expires, an audit entry reads "Lease expired on DEVICE, late result refused", and the job is reassigned to another member.
- Respect `prefers-reduced-motion`: no pulsing animations.

---

## 7. Mock data (seed)

Everything must be obviously fictional. Use these, or close equivalents.

**Constants:** daily swarm cap $25 · member cap $5 · agreement bar 90% · max active jobs 20 · lease 60 s · heartbeat 15 s.

**Roles:** Stop-loss researcher, Market regime analyst, Short-term analyst, Data quality monitor, Experiment worker, Re-checker, Editor.

**Members (8):** Aroha K. (DESK-7F2A, Claude Sonnet 5.5), Bjørn S. (LAPTOP-21C9, Codex), Chen W. (WS-90B1, Claude Opus 5.5), Dana M. (DESK-4410, Claude Sonnet 5.5, re-checker and editor), Emeka O. (PC-EO-03, Codex), Freya L. (LAPTOP-FL, Claude Haiku 5.5, **paused**), Gustavo R. (DESK-GR2, Claude Sonnet 5.5), Hana T. (WS-HT-11, Codex, **paused**). Give each a spend under $5, accepted findings between 5 and 22, and a confirmed rate between 78 and 100%.

**Jobs (9), one in each state:**

| ID | Question | State | Notes |
|---|---|---|---|
| J-1047 | Short-term direction view for EURUSD over the next 4 hours | queued | asked by an AI role, not a person |
| J-1046 | Do wider stops cut losing streaks for the breakout strategy? | challenged | 71% agreement; the re-check found the result hinged on two days in March |
| J-1045 | Does the London open move EURUSD more than the New York open? | rechecking | first answer: +18% |
| J-1044 | Check the last 24 hours of EURUSD quotes for gaps or bad prices | researching | scheduled every 6 h |
| J-1043 | Which stop-loss distance works best for 15-minute EURUSD trades? | human | 96%; results table 10/15/20/30 pips; 20 pips best, +2.6%, 57% winners |
| J-1042 | Is EURUSD in a calm or a volatile period this week? | human | 92%; calm, swings 22% below average |
| J-1039 | How did EURUSD react to the last ECB rate statement? | published | 94%; fell 0.6%, recovered half |
| J-1036 | Did EURUSD trend up or down over the past 4 hours? | published, **expired** | 91% |
| J-1031 | Is the Monday-morning gap in EURUSD usually filled by Tuesday? | **withdrawn** | the data feed later reported missing weekend quotes |

Each has a believable history timeline and a generated run receipt.

**Audit:** about 17 seed entries that tell the same story as the job histories, including one "Lease expired on WS-HT-11 (job J-1038), late result refused" and "You · Paused member Hana T.". Compute the hash chain at startup.

**Prices:** a seeded random walk of 96 points around 1.0512 (so it is the same every load).

---

## 8. Words and tone

Write for a layperson. Use these words on screen:

| Use | Not |
|---|---|
| Run receipt | Signed manifest |
| Re-check / independent re-check | Independent reproduction |
| Set aside | Budget reservation |
| Checking in | Heartbeat (OK in tooltips) |
| Waiting for a person | Pending human approval |
| Audit trail / chain | Ledger, blockchain (except the one explanatory line) |
| Member's AI | Agent runner |

Use short, active sentences. Errors say what happened and how to fix it. Every published item carries "Research only, not financial advice."

---

## 9. Look and feel

- **Calm lab-notebook console.** Cool neutral greys with a slight green tint, and one teal accent (light `#0b6e74`, dark `#4fc1c6`). Status colours: green = agreed/published, amber = waiting for a person, red = challenged/rejected/withdrawn, grey = expired/paused, teal = running.
- Status is always shown in **colour plus words** (a pill with a dot).
- Fonts (Google Fonts, with system fallbacks): **Bricolage Grotesque** for headings, **Inter** for body text, **IBM Plex Mono** for numbers, IDs, hashes and receipts. Use tabular numerals.
- **Light and dark mode** follow the OS setting, plus a manual toggle in the rail footer.
- Cards: 10px radius, 1px border, no heavy shadows.
- Must work at 390px width with no sideways page scroll. Wide tables and the board scroll inside their own containers.
- Keyboard accessible, with visible focus rings and ARIA labels on charts.
- Match `reference/swarm-demo.html` for layout, spacing and copy wherever this brief is silent.

---

## 10. Guided walkthrough mode

Add a **"Take the tour"** button on the Overview. It opens a small step-by-step overlay (no library needed) that walks through:

1. Overview: what the swarm is.
2. Ask a question: pre-fills the Friday example and submits it.
3. Job page: watch the steps, the heartbeat and the two answers.
4. Review desk: approve the new job.
5. Published: see what viewers see.
6. Budgets: where the money went.
7. Contributors: pause a member.
8. Audit trail: tamper with an entry, check the chain, and undo the change.

The tour has Next / Back / Close buttons and remembers its position only in memory.

Also write `docs/walkthrough.md`: the same tour as a click-by-click script for someone presenting the demo live.

---

## 11. README and GitHub Pages

**README.md** must include:
- One-paragraph plain explanation (section 1), with a screenshot placeholder.
- A **"This is a demo"** notice: mock data, no backend, nothing saved, not financial advice.
- Quick start: `npm install`, `npm run dev`, `npm test`, `npm run build`.
- **Live demo** link placeholder: `https://<user>.github.io/<repo>/`.
- How the job flow works (the 10 steps as a list).
- Folder structure summary.
- How to change the mock data (`src/data/`) and the constants.
- An "Assumptions" section (copy section 14).
- Contributing: branch, PR, run the tests before pushing.

**Deploy:** `.github/workflows/deploy.yml` builds on push to `main` with `actions/setup-node`, `npm ci`, `npm run build`, then `actions/upload-pages-artifact` and `actions/deploy-pages`. In `vite.config.ts` set `base: './'`. In the README, tell the owner to enable Pages under *Settings → Pages → Source: GitHub Actions*.

---

## 12. Build order

1. Scaffold Vite + React + TS, ESLint, Prettier, Vitest. Commit.
2. `domain/` logic + types + mock data, with unit tests (budget admission, dedupe, agreement rule, audit chain verify/tamper/repair, simulator tick plan). Commit.
3. Store, layout, rail, routing, tokens and themes. Commit.
4. Screens in this order: Job page → Ask (with simulation) → Review → Published → Board → Overview → Budgets → Contributors → Audit. Commit after each.
5. Tour + `docs/walkthrough.md`.
6. README, LICENSE, deploy workflow.
7. Run `npm run lint`, `npm test` and `npm run build`; fix everything; check 390px width and dark mode.

---

## 13. Acceptance checklist

- [ ] `npm install && npm run dev` opens the app on the Overview.
- [ ] All 9 screens are reachable from the rail; deep links like `#/jobs/J-1043` work after a reload.
- [ ] Submitting the Friday example creates a job that reaches "Waiting for a person" in about 23 s, with every step visible.
- [ ] Submitting the ECB example shows "Already studied" and creates no job.
- [ ] A max cost above the free budget is refused with a clear message.
- [ ] The "Show a challenge" and "Simulate a dropped connection" options both work and leave audit entries.
- [ ] Approving moves the job to Published with all 4 facts filled; rejecting moves it to Done.
- [ ] Pausing a member removes them from new assignments.
- [ ] The tamper check breaks at entry 8, highlights 8 onward, and the undo button restores "intact".
- [ ] Light and dark both look right; no sideways scroll at 390px.
- [ ] Tests pass; build output works when opened from a sub-path (GitHub Pages).
- [ ] README and `docs/walkthrough.md` exist and use plain language.

---

## 14. Assumptions (placeholders to confirm with the project owner)

1. Pilot numbers come from the plan: 5–10 contributors (the demo shows 8), max 20 active jobs, 60 s lease, 15 s check-in.
2. **$25/day swarm budget and $5/day per member** are invented placeholders.
3. **The 90% agreement bar** is invented; the source material doesn't define how close a re-check must be.
4. There is one human publisher ("You"); the named research lead and reviewer are still open.
5. Viewers are read-only; nothing is a trading signal or advice.
6. AI names (Claude, Codex) follow the source material; the model names are examples.
7. "Blockchain" is shown only as the hash-linked audit trail. There is no real chain or token.
8. Outside AIs can also ask questions in the real design; the demo shows the human form only.

**Open questions:** Should viewers see contributor names or stay anonymous? Should viewers be able to challenge a finding? Is US$ the right currency?

---

## 15. Out of scope

Real authentication, a real backend or database, real AI calls, real market data, payments, trading or order placement, and any blockchain, token or wallet.
