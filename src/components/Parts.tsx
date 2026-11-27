import { HEARTBEAT_SECONDS, LEASE_SECONDS } from '../data/constants';
import { providerOf } from '../domain/approval';
import { money } from '../domain/budget';
import { RECEIPT_FIELDS } from '../domain/manifest';
import type { HistoryLine, Member } from '../domain/types';
import s from './Parts.module.css';

/** A member's agent: initial, name, provider and model. */
export function MemberChip({
  member,
  sub,
  compact,
}: {
  member?: Member;
  sub?: string;
  compact?: boolean;
}) {
  if (!member)
    return (
      <span className={s.who}>
        <span className={`${s.avatar} ${s.off}`} aria-hidden>
          ?
        </span>
        <span className="muted">Not assigned</span>
      </span>
    );
  const openai = providerOf(member.model) === 'OpenAI';
  return (
    <span className={s.who}>
      <span
        className={`${s.avatar} ${openai ? s.openai : ''} ${member.online ? '' : s.off}`}
        aria-hidden
      >
        {member.name.slice(0, 1)}
      </span>
      <span>
        <strong>{member.name}</strong>
        {!compact && <span className={s.model}>{sub ?? member.model}</span>}
      </span>
    </span>
  );
}

export function Heartbeat({ text }: { text?: string }) {
  return (
    <span className={s.heartbeat}>
      <span className={s.beat} aria-hidden />
      {text ?? `Checking in every ${HEARTBEAT_SECONDS} s · lease renews every ${LEASE_SECONDS} s`}
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
        Anything not spent goes back to the daily budget when the mission closes.
      </p>
    </div>
  );
}

export function RunReceipt({ receipt }: { receipt: Record<string, string> }) {
  return (
    <div className={s.receipt}>
      <dl>
        {RECEIPT_FIELDS.map((k) => (
          <div key={k} className={s.receiptRow}>
            <dt>{k}</dt>
            <dd className={!receipt[k] || receipt[k] === 'Waiting' ? 'muted' : undefined}>
              {receipt[k] ?? 'Waiting'}
            </dd>
          </div>
        ))}
      </dl>
      <p className={s.receiptNote}>
        The signature proves which computer sent this receipt. It does not prove the idea works. The
        council’s gates and the fresh-data check decide that.
      </p>
    </div>
  );
}
