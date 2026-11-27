import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { RulesCard } from '../components/MissionBits';
import { KindPill } from '../components/Pill';
import { DEFAULT_RULES, EXAMPLES, SWARM_SIZES } from '../data/constants';
import { money, summariseBudget } from '../domain/budget';
import { checkLibrary } from '../domain/library';
import { currentBest } from '../domain/improvement';
import type { MissionRules, SwarmSize } from '../domain/types';
import { useSwarm, type LaunchResult } from '../store/useSwarm';
import { useWorld } from './hooks';
import s from './screens.module.css';

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function NewMission() {
  const w = useWorld();
  const launch = useSwarm((st) => st.launch);
  const navigate = useNavigate();
  const [goal, setGoal] = useState('');
  const [size, setSize] = useState<SwarmSize>('whole');
  const [budget, setBudget] = useState('40');
  const [rounds, setRounds] = useState(DEFAULT_RULES.maxRounds);
  const [depth, setDepth] = useState(DEFAULT_RULES.maxDepth);
  const [share, setShare] = useState(Math.round(DEFAULT_RULES.differentRouteShare * 100));
  const [opts, setOpts] = useState({
    noWinner: false,
    dropped: false,
    panelRejects: false,
    budgetLimit: false,
  });
  const [result, setResult] = useState<LaunchResult | null>(null);
  const debounced = useDebounced(goal);
  const lib =
    debounced.trim().length > 6 ? checkLibrary(debounced, w.library, w.missions, w.topics) : null;
  const free = summariseBudget(w.missions, w.members).free;
  const online = w.members.filter((m) => m.online).length;
  const best = lib?.topic ? currentBest(lib.topic) : undefined;

  const rules: MissionRules = {
    ...DEFAULT_RULES,
    budget: Number(budget) || 0,
    swarmSize: size,
    maxRounds: rounds,
    maxDepth: depth,
    differentRouteShare: share / 100,
    baseline: best?.rule ?? 'The strategy as it trades today',
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim()) return;
    const r = launch({
      goal,
      budget: Number(budget),
      swarmSize: size,
      rules: { maxRounds: rounds, maxDepth: depth, differentRouteShare: share / 100 },
      options: opts,
    });
    setResult(r);
    if (r.kind === 'created') navigate(`/missions/${r.id}`);
  };

  const opt = (k: keyof typeof opts, title: string, text: string) => (
    <label className="check">
      <input
        type="checkbox"
        checked={opts[k]}
        onChange={(e) => setOpts({ ...opts, [k]: e.target.checked })}
      />
      <span>
        <strong>{title}</strong> {text}
      </span>
    </label>
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Brief</span>
          <h1>Start a mission</h1>
          <p className="lede">
            Give the swarm a goal and a budget. Many agents explore it in parallel, code tests every
            idea, the council judges them and looks for better routes, and an approval panel decides
            what is published. You don’t need to do anything after this.
          </p>
        </div>
      </div>

      <div className="split">
        <form className="panel stack" onSubmit={submit} aria-label="New mission">
          <div className="field">
            <label htmlFor="goal">Goal</label>
            <textarea
              id="goal"
              className="textarea"
              value={goal}
              placeholder="For example: find a better way to take profits on breakout trades"
              onChange={(e) => {
                setGoal(e.target.value);
                setResult(null);
              }}
            />
            <div className="row" style={{ gap: 6 }} role="group" aria-label="Example goals">
              {EXAMPLES.map((x) => (
                <button
                  key={x}
                  type="button"
                  className="chip"
                  onClick={() => {
                    setGoal(x);
                    setResult(null);
                  }}
                >
                  {x}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span className="label" id="size-l">
              Swarm size
            </span>
            <div className={s.segmented} role="radiogroup" aria-labelledby="size-l">
              {(Object.keys(SWARM_SIZES) as SwarmSize[]).map((k) => {
                const z = SWARM_SIZES[k];
                return (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={size === k}
                    className={s.segBtn}
                    onClick={() => {
                      setSize(k);
                      setBudget(String(z.estimate + 2));
                    }}
                  >
                    <strong>{z.label}</strong>
                    <span>
                      {z.agents || online} agents · about {money(z.estimate)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="field" style={{ maxWidth: 240 }}>
            <label htmlFor="budget">Budget</label>
            <div className="input-prefix">
              <span>$</span>
              <input
                id="budget"
                className="input"
                type="number"
                inputMode="decimal"
                min="1"
                step="1"
                value={budget}
                onChange={(e) => {
                  setBudget(e.target.value);
                  setResult(null);
                }}
              />
            </div>
            <span className="hint">
              <span className="num">{money(free)}</span> free today
            </span>
          </div>

          <details className={s.advanced}>
            <summary>Advanced rules</summary>
            <div className="grid-3" style={{ marginTop: 12 }}>
              <div className="field">
                <label htmlFor="rounds">Rounds</label>
                <select
                  id="rounds"
                  className="select"
                  value={rounds}
                  onChange={(e) => setRounds(Number(e.target.value))}
                >
                  {[2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      Up to {n}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="depth">Alternative depth</label>
                <select
                  id="depth"
                  className="select"
                  value={depth}
                  onChange={(e) => setDepth(Number(e.target.value))}
                >
                  {[1, 2, 3].map((n) => (
                    <option key={n} value={n}>
                      Up to {n}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="share">Different-route share</label>
                <select
                  id="share"
                  className="select"
                  value={share}
                  onChange={(e) => setShare(Number(e.target.value))}
                >
                  {[10, 20, 30].map((n) => (
                    <option key={n} value={n}>
                      {n}% of the budget
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </details>

          <fieldset className={s.options}>
            <legend className="eyebrow">Demo options</legend>
            {opt(
              'noWinner',
              'Nothing beats the baseline.',
              'No idea passes the gates, so the mission closes with no winner, which is a useful answer.',
            )}
            {opt(
              'dropped',
              'Simulate a dropped connection.',
              'A member’s computer stops checking in during testing; its lease runs out and the test moves to someone else.',
            )}
            {opt(
              'panelRejects',
              'Panel rejects.',
              'Two approvers reject the first draft because it reads like a trade call. The mission goes back, then passes a second panel.',
            )}
            {opt(
              'budgetLimit',
              'Hit the budget limit.',
              'In round 2 the budget runs out, the swarm stops spawning, and it carries on with what it has.',
            )}
          </fieldset>

          {result?.kind === 'running' && (
            <div className="banner banner-good" role="status">
              <Icon name="check" />
              <div className="banner-body">
                <strong>Already running.</strong>
                <span>
                  The swarm is already working on this in {result.mission.id}. Follow that mission
                  instead; nothing new is spent.
                </span>
                <div className="banner-actions">
                  <Link to={`/missions/${result.mission.id}`} className="btn btn-sm">
                    Open {result.mission.id}
                  </Link>
                </div>
              </div>
            </div>
          )}
          {result?.kind === 'refused' && (
            <div className="banner banner-bad" role="alert">
              <Icon name="alert" />
              <div className="banner-body">
                <strong>Not started.</strong>
                <span>{result.reason}</span>
                <span>
                  <strong>How to fix it:</strong> {result.fix}
                </span>
              </div>
            </div>
          )}

          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="footnote">
              The library is checked and the budget is reserved before anything is spent.
            </span>
            <button type="submit" className="btn btn-primary btn-lg" disabled={!goal.trim()}>
              Launch the mission <Icon name="arrow" size={16} />
            </button>
          </div>
        </form>

        <div className="stack">
          <aside className="panel" aria-labelledby="lib-h" aria-live="polite">
            <div className="panel-head">
              <h2 id="lib-h">The library already knows…</h2>
            </div>
            {!lib ? (
              <p className="muted small">Type a goal and the library is searched as you go.</p>
            ) : (
              <div className="stack" style={{ gap: 10 }}>
                {best && lib.topic && (
                  <p className={s.beat}>
                    <Icon name="trend" size={15} /> You’re trying to beat:{' '}
                    <strong>{best.rule}</strong>{' '}
                    <span className="muted">
                      ({lib.topic.title}
                      {best.missionId ? `, from ${best.missionId}` : ', starting rule'})
                    </span>
                  </p>
                )}
                {lib.running && (
                  <p className="small">
                    <strong>Running now:</strong>{' '}
                    <Link to={`/missions/${lib.running.id}`}>
                      {lib.running.id}, {lib.running.title}
                    </Link>
                  </p>
                )}
                {[...lib.reuse, ...lib.deadEnds, ...lib.warnings].map((e) => (
                  <div key={e.id} className={s.libHit}>
                    <KindPill kind={e.kind} />
                    <span>
                      <span className="num muted">{e.id}</span> {e.title}
                    </span>
                  </div>
                ))}
                {!lib.running &&
                  !lib.reuse.length &&
                  !lib.deadEnds.length &&
                  !lib.warnings.length && (
                    <p className="muted small">Nothing related yet. This will be new ground.</p>
                  )}
              </div>
            )}
          </aside>
          <aside className="panel" aria-labelledby="rules-h">
            <div className="panel-head">
              <h2 id="rules-h">Mission rules</h2>
              <p>Freedom inside the fence.</p>
            </div>
            <RulesCard rules={rules} />
          </aside>
        </div>
      </div>
    </div>
  );
}
