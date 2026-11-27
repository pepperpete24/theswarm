import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FIXED_RULES, SWARM_SIZES } from '../data/constants';
import { SEAT_LABEL } from '../domain/council';
import { money } from '../domain/budget';
import type { CoachReview, CouncilSession, Member, MissionRules, Objection } from '../domain/types';
import { Icon } from './Icon';
import { MemberChip } from './Parts';
import { Pill } from './Pill';
import s from './MissionBits.module.css';

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: { key: T; label: string; count?: number }[];
  value: T;
  onChange: (t: T) => void;
  label: string;
}) {
  return (
    <div className={s.tabs} role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={value === t.key}
          className={s.tab}
          onClick={() => onChange(t.key)}
        >
          {t.label}
          {t.count !== undefined && <span className={s.tabCount}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** The mission rules: the locked ones, then this mission's settings. */
export function RulesCard({ rules, compact }: { rules: MissionRules; compact?: boolean }) {
  const [open, setOpen] = useState(!compact);
  const rows: [string, string][] = [
    ['Budget', money(rules.budget)],
    ['Swarm size', SWARM_SIZES[rules.swarmSize].label],
    ['Rounds', `Up to ${rules.maxRounds}`],
    ['Alternative depth', `Up to ${rules.maxDepth}`],
    ['Ideas tested, max', String(rules.maxIdeas)],
    ['Jobs at once', String(rules.maxConcurrent)],
    ['Baseline', rules.baseline],
    ['Different-route share', `${Math.round(rules.differentRouteShare * 100)}% of the budget`],
    ['Costs', rules.costs],
    ['Test / fresh window', `${rules.testWindow} / ${rules.freshWindow}`],
    ['Horizon', rules.horizon],
  ];
  return (
    <div className={s.rules}>
      <button
        type="button"
        className={s.rulesToggle}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Icon name="lock" size={15} /> {FIXED_RULES.length} fixed rules, same for every mission
        <Icon name={open ? 'back' : 'forward'} size={14} className={s.chev} />
      </button>
      {open && (
        <ol className={s.fixed}>
          {FIXED_RULES.map((r, i) => (
            <li key={r.title}>
              <span className={s.ruleN}>{i + 1}</span>
              <span>
                <strong>{r.title}.</strong> {r.text}
              </span>
            </li>
          ))}
        </ol>
      )}
      <dl className={s.settings}>
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const KIND_LABEL: Record<Objection['kind'], string> = {
  'look-ahead': 'Look-ahead',
  overfitting: 'Overfitting',
  'too-few-trades': 'Too few trades',
  'costs-ignored': 'Costs',
  'one-period-only': 'One period only',
  duplicate: 'Duplicate',
  'too-complex-for-gain': 'Too complex for the gain',
};

export function ObjectionCard({
  o,
  members,
  showIdea,
}: {
  o: Objection;
  members: Member[];
  showIdea?: boolean;
}) {
  const by = members.find((m) => m.id === o.by);
  const answeredBy = members.find((m) => m.id === o.answeredBy);
  const tone = o.status === 'upheld' ? 'bad' : o.status === 'answered' ? 'good' : 'warn';
  return (
    <article className={s.objection}>
      <div className={s.objHead}>
        <Pill tone="grey">{KIND_LABEL[o.kind]}</Pill>
        <Pill tone={tone}>
          {o.status === 'upheld' ? 'Upheld' : o.status === 'answered' ? 'Answered' : 'Still open'}
        </Pill>
        {showIdea && (
          <Link to={`/ideas/${o.ideaId}`} className="num small">
            {o.ideaId}
          </Link>
        )}
      </div>
      <p>{o.text}</p>
      <span className={s.objBy}>Raised by {by?.name ?? '—'}’s agent (red team)</span>
      {o.answer && (
        <div className={s.answer}>
          <p>{o.answer}</p>
          <span className={s.objBy}>Answered by {answeredBy?.name ?? 'an advocate'}’s agent</span>
        </div>
      )}
    </article>
  );
}

export function SeatList({
  panel,
  members,
}: {
  panel: CouncilSession['panel'];
  members: Member[];
}) {
  return (
    <ul className={s.seats}>
      {panel.map((p) => (
        <li key={p.memberId}>
          <span className={s.seatName}>{SEAT_LABEL[p.seat]}</span>
          <MemberChip member={members.find((m) => m.id === p.memberId)} />
        </li>
      ))}
    </ul>
  );
}

export function CoachReviewCard({ review, coach }: { review: CoachReview; coach?: Member }) {
  return (
    <section className={`panel ${s.coach}`} aria-labelledby="coach-h">
      <div className="panel-head">
        <h2 id="coach-h">Coach review</h2>
        <span className="eyebrow">How the mission went, not what it found</span>
      </div>
      <p className="muted small">
        Written by {coach?.name ?? 'the Coach'}’s agent after the mission ended.
      </p>
      <dl className="kv">
        <div>
          <dt>Ideas that held up came from</dt>
          <dd>{review.heldUpBy.length ? review.heldUpBy.join('; ') : 'Nobody this time'}</dd>
        </div>
        <div>
          <dt>Objections that were right / false alarms</dt>
          <dd className="num">
            {review.objectionsRight} / {review.falseAlarms}
          </dd>
        </div>
        <div>
          <dt>Spent on ideas that never had a chance</dt>
          <dd className="num">{money(review.wastedUsd)}</dd>
        </div>
        <div>
          <dt>Swarm size for this mission</dt>
          <dd>{review.sizeVerdict.charAt(0).toUpperCase() + review.sizeVerdict.slice(1)}</dd>
        </div>
        <div>
          <dt>Different routes</dt>
          <dd>{review.differentRouteResult}</dd>
        </div>
        <div>
          <dt>Proposed process changes</dt>
          <dd>
            {review.proposals.map((p) => (
              <Link key={p} to="/improvement" className="num">
                {p}{' '}
              </Link>
            ))}
          </dd>
        </div>
      </dl>
    </section>
  );
}
