import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ASKABLE_ROLES,
  EXAMPLES,
  EXAMPLE_FRESH,
  EXAMPLE_STUDIED,
  PERIODS,
  STEPS,
  STEP_EXPLAIN,
} from '../data/constants';
import { summariseBudget, money } from '../domain/budget';
import { Icon } from '../components/Icon';
import { useSwarm, type AskResult } from '../store/useSwarm';
import s from './screens.module.css';

const ROLE_FOR_EXAMPLE: Record<string, string> = {
  [EXAMPLE_FRESH]: 'Market regime analyst',
  [EXAMPLE_STUDIED]: 'Market regime analyst',
};

export function Ask() {
  const navigate = useNavigate();
  const submit = useSwarm((st) => st.submitQuestion);
  const free = useSwarm((st) => summariseBudget(st.jobs, st.members).free);
  const [question, setQuestion] = useState('');
  const [role, setRole] = useState<string>(ASKABLE_ROLES[1]);
  const [maxCost, setMaxCost] = useState('1.50');
  const [period, setPeriod] = useState<string>('Last 2 years');
  const [challenge, setChallenge] = useState(false);
  const [dropped, setDropped] = useState(false);
  const [result, setResult] = useState<Exclude<AskResult, { kind: 'created' }> | null>(null);
  const [empty, setEmpty] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      setEmpty(true);
      return;
    }
    const r = submit({
      question,
      role,
      maxCost: Number(maxCost),
      period,
      challenge,
      dropped,
    });
    if (r.kind === 'created') navigate(`/jobs/${r.id}`);
    else setResult(r);
  };

  const pick = (q: string) => {
    setQuestion(q);
    if (ROLE_FOR_EXAMPLE[q]) setRole(ROLE_FOR_EXAMPLE[q]);
    setResult(null);
    setEmpty(false);
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">New research job</span>
          <h1>Ask a question</h1>
          <p className="lede">
            Ask the swarm anything about EURUSD. One member’s AI researches it, a second one checks
            it independently, and a person decides whether it is published.
          </p>
        </div>
      </div>

      <div className="split">
        <form className="panel stack" onSubmit={onSubmit} noValidate aria-label="Ask a question">
          <div className="field">
            <label htmlFor="q">Your question</label>
            <textarea
              id="q"
              className="textarea"
              placeholder="For example: Is EURUSD more volatile on Fridays than on other weekdays?"
              value={question}
              onChange={(e) => {
                setQuestion(e.target.value);
                setResult(null);
                setEmpty(false);
              }}
              aria-invalid={empty}
              aria-describedby={empty ? 'q-err' : undefined}
            />
            {empty && (
              <span id="q-err" className={s.err}>
                Type a question first, or pick one of the examples below.
              </span>
            )}
          </div>

          <div className="field">
            <span className="label">Try an example</span>
            <div className="row" style={{ gap: 8 }}>
              {EXAMPLES.map((q) => (
                <button key={q} type="button" className="chip" onClick={() => pick(q)}>
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="grid-3">
            <div className="field">
              <label htmlFor="role">Kind of specialist</label>
              <select
                id="role"
                className="select"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                {ASKABLE_ROLES.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="cost">Most it may cost</label>
              <div className="input-prefix">
                <span>$</span>
                <input
                  id="cost"
                  className="input"
                  type="number"
                  inputMode="decimal"
                  min="0.1"
                  step="0.1"
                  value={maxCost}
                  onChange={(e) => {
                    setMaxCost(e.target.value);
                    setResult(null);
                  }}
                />
              </div>
              <span className="hint">
                <span className="num">{money(free)}</span> free today
              </span>
            </div>
            <div className="field">
              <label htmlFor="period">Time period</label>
              <select
                id="period"
                className="select"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                {PERIODS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <fieldset className={s.options}>
            <legend className="eyebrow">Demo options</legend>
            <label className="check">
              <input
                type="checkbox"
                checked={challenge}
                onChange={(e) => setChallenge(e.target.checked)}
              />
              <span>
                <strong>Show a challenge.</strong> The re-check disagrees at first, so the job goes
                back to a different member and runs again.
              </span>
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={dropped}
                onChange={(e) => setDropped(e.target.checked)}
              />
              <span>
                <strong>Simulate a dropped connection.</strong> The member’s computer stops checking
                in, its lease runs out, and the job moves to someone else.
              </span>
            </label>
          </fieldset>

          {result?.kind === 'studied' && (
            <div className="banner banner-good" role="status">
              <Icon name="check" />
              <div className="banner-body">
                <strong>Already studied.</strong>
                <span>
                  The swarm answered this in {result.job.id}, so you get that answer for free and
                  nothing new is spent.
                </span>
                <div className="banner-actions">
                  <Link to={`/jobs/${result.job.id}`} className="btn btn-sm">
                    Open {result.job.id}
                  </Link>
                </div>
              </div>
            </div>
          )}
          {result?.kind === 'refused' && (
            <div className="banner banner-bad" role="alert">
              <Icon name="alert" />
              <div className="banner-body">
                <strong>Not started: over budget.</strong>
                <span>{result.reason}</span>
                <span>
                  <strong>How to fix it:</strong> {result.fix}
                </span>
              </div>
            </div>
          )}

          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="footnote">
              We check whether it’s been answered and whether the budget allows it before anything
              is spent.
            </span>
            <button type="submit" className="btn btn-primary btn-lg">
              Send to the swarm <Icon name="arrow" size={16} />
            </button>
          </div>
        </form>

        <aside className="panel" aria-labelledby="next-h">
          <div className="panel-head">
            <h2 id="next-h">What happens next</h2>
          </div>
          <ol className={s.nextSteps}>
            {STEPS.map((name, i) => (
              <li key={name}>
                <span className={`${s.nextN} num`}>{String(i + 1).padStart(2, '0')}</span>
                <span>
                  <strong>{name}</strong>
                  <span className="muted">{STEP_EXPLAIN[i]}</span>
                </span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}
