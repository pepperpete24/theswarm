import { AGREEMENT_BAR, HEARTBEAT_SECONDS, LEASE_SECONDS } from '../data/constants';
import { verdict } from '../domain/agreement';
import { money } from '../domain/budget';
import { MANIFEST_FIELDS } from '../domain/manifest';
import type { HistoryLine, Job, Member, ResultRow } from '../domain/types';
import s from './JobParts.module.css';

function ResultTable({ rows, caption }: { rows: ResultRow[]; caption: string }) {
  return (
    <div className="table-wrap">
      <table className={s.results}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th>Setting</th>
            <th className="r">Result</th>
            <th className="r">Winners / note</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]}>
              <td>{r[0]}</td>
              <td className="r num">{r[1]}</td>
              <td className="r num">{r[2]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Side({
  label,
  member,
  text,
  table,
  waiting,
}: {
  label: string;
  member?: Member;
  text?: string;
  table?: ResultRow[];
  waiting: string;
}) {
  return (
    <div className={s.side}>
      <div className={s.sideHead}>
        <span className="eyebrow">{label}</span>
        {member ? (
          <div className={s.who}>
            <span className={s.avatar} aria-hidden>
              {member.name.slice(0, 1)}
            </span>
            <span>
              <strong>{member.name}’s AI</strong>
              <span className={s.model}>{member.model}</span>
            </span>
          </div>
        ) : (
          <div className={s.who}>
            <span className={`${s.avatar} ${s.avatarEmpty}`} aria-hidden>
              ?
            </span>
            <span className="muted">Not assigned yet</span>
          </div>
        )}
      </div>
      {text ? (
        <p className={s.answer}>{text}</p>
      ) : (
        <p className={s.waiting}>
          <span className={s.dots} aria-hidden>
            <i />
            <i />
            <i />
          </span>
          {waiting}
        </p>
      )}
      {text && table && <ResultTable rows={table} caption={`${label} results`} />}
    </div>
  );
}

/** The signature visual: first answer, agreement %, independent re-check. */
export function AnswerCompare({ job, members }: { job: Job; members: Member[] }) {
  const agent = members.find((m) => m.id === job.agentId);
  const reviewer = members.find((m) => m.id === job.reviewerId);
  const v = verdict(job.agreement);
  return (
    <div className={s.compare}>
      <Side
        label="First answer"
        member={agent}
        text={job.finding}
        table={job.resultTable}
        waiting={agent ? 'Researching…' : 'Waiting for a member’s AI to take the job'}
      />
      <div className={`${s.meter} ${s[v]}`} aria-live="polite">
        <span className={s.line} aria-hidden />
        <div className={s.dial}>
          <span className={s.pct}>
            {job.agreement === undefined ? '…' : job.agreement}
            {job.agreement !== undefined && <small>%</small>}
          </span>
          <span className={s.alike}>
            {v === 'running'
              ? 'comparing'
              : v === 'agreed'
                ? 'alike · agreed'
                : 'alike · challenged'}
          </span>
        </div>
        <span className={s.bar}>bar: {AGREEMENT_BAR}%</span>
        <span className={s.line} aria-hidden />
      </div>
      <Side
        label="Independent re-check"
        member={reviewer}
        text={job.recheck}
        table={job.recheckTable}
        waiting={
          job.reviewerId
            ? 'Redoing the work without seeing the first answer…'
            : 'Starts once the first answer is handed in'
        }
      />
    </div>
  );
}

export function Heartbeat() {
  return (
    <span className={s.heartbeat}>
      <span className={s.beat} aria-hidden />
      Checking in every {HEARTBEAT_SECONDS} s · lease renews every {LEASE_SECONDS} s
    </span>
  );
}

export function Timeline({ items }: { items: HistoryLine[] }) {
  return (
    <ol className={s.timeline}>
      {items.map((h, i) => (
        <li key={i} className={i === items.length - 1 ? s.latest : undefined}>
          <span className={`${s.time} num`}>{h.time}</span>
          <span className={s.node} aria-hidden />
          <span className={s.event}>
            {h.text}
            <span className={s.by}>{h.who}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export function CostBar({ spent, reserved }: { spent: number; reserved: number }) {
  const pct = reserved > 0 ? Math.min(100, (spent / reserved) * 100) : 0;
  return (
    <div className={s.cost}>
      <div className={s.costNums}>
        <span>
          <span className={`${s.big} num`}>{money(spent)}</span>
          <span className="muted"> spent</span>
        </span>
        <span className="muted num">of {money(reserved)} set aside</span>
      </div>
      <div
        className={s.costTrack}
        role="img"
        aria-label={`Spent ${money(spent)} of ${money(reserved)} set aside`}
      >
        <span className={s.costFill} style={{ width: `${pct}%` }} />
      </div>
      <div className="legend">
        <span>
          <i style={{ background: 'var(--accent)' }} /> Spent
        </span>
        <span>
          <i style={{ background: 'var(--warn-soft)', border: '1px solid var(--warn-line)' }} /> Set
          aside, not used
        </span>
      </div>
      <p className="footnote">
        Anything not spent goes back to the daily budget when the job closes.
      </p>
    </div>
  );
}

export function RunReceipt({ manifest }: { manifest: Record<string, string> }) {
  return (
    <div className={s.receipt}>
      <dl>
        {MANIFEST_FIELDS.map((k) => (
          <div key={k} className={s.receiptRow}>
            <dt>{k}</dt>
            <dd className={manifest[k] === 'Waiting' ? 'muted' : undefined}>{manifest[k]}</dd>
          </div>
        ))}
      </dl>
      <p className={s.receiptNote}>
        The signature proves which computer sent this receipt. It does not prove the answer is
        right; the independent re-check does that.
      </p>
    </div>
  );
}
