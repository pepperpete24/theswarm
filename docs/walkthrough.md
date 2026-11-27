# Presenting the Swarm Research Desk demo

A click-by-click script for showing the demo live. It follows the same 11 stops as the in-app
**Take the tour** button, so you can click along with the tour card or drive it yourself. Allow
about 10 minutes. Reload the page first so everything starts fresh.

## The 30-second opener: what makes this different

> “Most AI research tools are one model answering one question. This is a swarm. Members lend
> their own agents, and give it a goal and a few rules. The whole swarm explores at once, code
> tests every idea, a council of agents tears the ideas apart and looks for better routes, and
> another panel of agents decides what gets published. Nobody has to click approve. Then it
> keeps trying to beat its own best answer, and it learns from its failures as much as its
> wins.”

## 1. Overview: a swarm, not a relay

- Point at the green **Running on its own** strip: missions running, some started by the swarm
  itself, panels in session.
- The **M-12 funnel**: 47 ideas from 11 members, down to 2 that held up on fresh data.
- **What the swarm learned this week**: proven findings and dead ends side by side.
- Press **Take the tour**.

## 2. M-12: one mission, 47 ideas

- Each dot in the **idea field** is an idea from a member’s agent. Right means more return than
  the current best; up means smaller drawdown. Diamonds are alternatives, rings are the
  Pathfinder’s different routes.
- The dashed line is the **bar to beat**. Say: “The more ideas you try, the more likely one looks
  good by luck. So the bar rises with every trial.”
- Note the red dots far to the right: good-looking ideas the council rejected anyway.

## 3. The council (C-12-1)

- **Objections raised**: the red team upheld two. The machine-learned stop was overfitted after
  1,200 tries; the Friday-close stop used a price that wasn’t known yet.
- **New combinations and alternatives**: the synthesiser turned the overfitted model into a
  _cheaper route_, a simple rule that gets about 90% of the gain.
- Say: “Verdicts come from code-checked gates, not votes. Agreement between agents is never
  evidence.”

## 4. The family tree

- On the M-12 **Family tree** tab, follow I-12-07 (rejected) to I-12-41 (held up): a rejected
  idea led to a winner.
- The red dashed line is the **depth limit**: alternatives of alternatives stop there.

## 5. Start a mission

- On **New mission**, press **Launch for me** on the tour card (or pick the take-profit example
  chip and press **Launch the mission**).
- Before it launches, show **The library already knows…**: a dead end it won’t repeat, a method
  it will reuse, and the current best it must beat.
- Optional: tick a demo option such as **Panel rejects** to show a panel sending a draft back.

## 6. Watch the whole swarm work

- On the live mission page (2× or 4× speed), ideas arrive from many members, including the
  Pathfinder. Grey dots wait in the strip at the top and move into place once tested.
- The **jobs at once** line shows the shared 20-job limit; extra ideas queue.
- The council seats, objections appear, alternatives arrive as diamonds, and the shortlist goes
  to the fresh-data check. One idea won’t hold up: that’s expected and honest.

## 7. The council approves

- On **Council approvals**, watch five approvers across two providers vote, each with a reason.
  One asks for softer wording and the editor tightens the draft.
- Say: “Nobody here worked on it, and there are no approve buttons on this page. Even the owner
  can’t publish.”
- Lower down: the **Red team v4** promotion and the **approval rule v3** rule-change panel (7
  seats, 6 of 7 needed) are voting too.

## 8. Library: it remembers, including the failures

- New entries from your mission: what was proven, the overfitting dead end, the warning from
  the idea that didn’t hold up, and an open question.
- **Start a mission from this** on an open question shows how the swarm keeps going.

## 9. Improvement: every result is there to be beaten

- **Breakout take-profit** now has a new current best from your mission, and the Challenger has
  already queued a challenge to it, waiting for fresh data.
- **Approval rule**: v2 was adopted by a 7-seat panel; one proposal was refused by code for going
  below the floor; v3 is being voted on now.
- **Process changes**: point at the rejected and rolled-back ones. “Failures stay visible.”

## 10. Scoreboard: does it earn its keep?

- Toggle **Same budget** and **Full capacity**. The whole swarm finds the most and catches the
  most false wins, but costs the most; at the same budget it only narrowly beats a small team.
- Say: “We show the honest numbers. More agents are only added when they measurably help.”

## 11. Audit trail

- Press **Try changing an old entry** (it changes entry 8, a council verdict, from “rejected” to
  “promising” without updating its fingerprint), then **Check the chain**: it breaks at entry 8.
- Press **Undo the change**: intact again.
- Close: “While we talked, the swarm queued its next missions by itself.” Open **Missions** to
  show the self-started ones.

## If something goes wrong

- Reload the page to reset everything.
- The **Emergency stop** at the bottom of the side bar pauses all work and publishing; press
  **Release the stop** to carry on.
