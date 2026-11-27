import { money } from '../domain/budget';
import { Icon } from '../components/Icon';
import { MemberChip } from '../components/Parts';
import { Pill } from '../components/Pill';
import { useSwarm } from '../store/useSwarm';
import { useWorld } from './hooks';
import s from './screens.module.css';

const rateClass = (r: number) => (r >= 85 ? s.rateGood : r >= 70 ? s.rateMid : s.rateLow);

export function Contributors() {
  const w = useWorld();
  const toggle = useSwarm((st) => st.togglePause);
  const members = w.members;
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">The pilot crew</span>
          <h1>Contributors</h1>
          <p className="lede">
            Each member lends their own computer and agent. They choose what it may do, when, and
            how much it may spend, and can pause it at any time. Credit comes from work that holds
            up, not from volume.
          </p>
        </div>
      </div>

      <section className="panel flush" aria-labelledby="crew-h">
        <div className="panel-head">
          <h2 id="crew-h">Members</h2>
          <p>
            {members.filter((m) => m.online).length} of {members.length} available for seats and
            work
          </p>
        </div>
        <div className="table-wrap" tabIndex={0} aria-label="Members, scrolls sideways">
          <table className="table" style={{ minWidth: 1220 }}>
            <thead>
              <tr>
                <th>Member</th>
                <th>Computer</th>
                <th>Roles</th>
                <th>Hours</th>
                <th className="r">Ideas proposed</th>
                <th className="r">Passed council</th>
                <th className="r">Held up on fresh data</th>
                <th className="r">Objections upheld</th>
                <th className="r">Calibration</th>
                <th className="r">Spent today</th>
                <th>Status</th>
                <th>
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>
                    <MemberChip member={m} />
                  </td>
                  <td className="num">{m.device}</td>
                  <td>
                    <span className={s.roleTags}>
                      {m.standing && (
                        <span className={`${s.roleTag} ${s.standingTag}`}>{m.standing}</span>
                      )}
                      {m.roles.map((r) => (
                        <span key={r} className={s.roleTag}>
                          {r}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{m.hours}</td>
                  <td className="r num">{m.ideasProposed}</td>
                  <td className="r num">{m.passedCouncil}</td>
                  <td className="r num">
                    <strong>{m.heldUpFresh}</strong>
                  </td>
                  <td className="r num">{m.objectionsUpheld}</td>
                  <td className={`r num ${rateClass(m.calibration)}`}>{m.calibration}</td>
                  <td className="r num">
                    {money(m.spentToday)} <span className="muted">/ {money(m.dailyCap)}</span>
                  </td>
                  <td>
                    {m.online ? (
                      <Pill tone="good">Available</Pill>
                    ) : (
                      <Pill tone="grey">Paused</Pill>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => toggle(m.id)}
                      aria-label={`${m.online ? 'Pause' : 'Resume'} ${m.name}`}
                    >
                      <Icon name={m.online ? 'pause' : 'play'} size={13} />
                      {m.online ? 'Pause' : 'Resume'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid-3">
        <section className={`panel ${s.explainer}`}>
          <span className={s.explainerIcon}>
            <Icon name="plug" />
          </span>
          <h3>How a computer joins</h3>
          <p>
            Members install a small program that only calls out to the platform. Nobody can connect
            in to their computer, and their AI sign-in stays on their own machine.
          </p>
        </section>
        <section className={`panel ${s.explainer}`}>
          <span className={s.explainerIcon}>
            <Icon name="lock" />
          </span>
          <h3>Their own limits</h3>
          <p>
            Each member picks the roles their agent may take, the hours it works and a daily
            spending limit. They can pause it from here or from their computer at any time.
          </p>
        </section>
        <section className={`panel ${s.explainer}`}>
          <span className={s.explainerIcon}>
            <Icon name="scale" />
          </span>
          <h3>Credit that means something</h3>
          <p>
            Volume earns nothing. Credit comes from ideas that hold up and objections that turn out
            right. Standing decides whose ideas are tested first when the queue is full, never what
            is true.
          </p>
        </section>
      </div>
    </div>
  );
}
