import { money } from '../domain/budget';
import { Icon } from '../components/Icon';
import { Pill } from '../components/Pill';
import { useSwarm } from '../store/useSwarm';
import s from './screens.module.css';

const rateClass = (r: number) => (r >= 90 ? s.rateGood : r >= 80 ? s.rateMid : s.rateLow);

export function Contributors() {
  const members = useSwarm((st) => st.members);
  const toggle = useSwarm((st) => st.togglePause);
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">The pilot crew</span>
          <h1>Contributors</h1>
          <p className="lede">
            Each member lends their own computer and AI. They choose what it may do, when, and how
            much it may spend, and can pause it at any time.
          </p>
        </div>
      </div>

      <section className="panel flush" aria-labelledby="crew-h">
        <div className="panel-head">
          <h2 id="crew-h">Members</h2>
          <p>
            {members.filter((m) => m.online).length} of {members.length} available for new jobs
          </p>
        </div>
        <div className="table-wrap" tabIndex={0} aria-label="Members, scrolls sideways">
          <table className="table" style={{ minWidth: 1040 }}>
            <thead>
              <tr>
                <th>Member</th>
                <th>Computer</th>
                <th>AI</th>
                <th>Roles</th>
                <th>Hours</th>
                <th className="r">Accepted</th>
                <th className="r">Confirmed by re-check</th>
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
                    <span className={s.memberCell}>
                      <span
                        className={`${s.memberAvatar} ${m.online ? '' : s.memberAvatarOff}`}
                        aria-hidden
                      >
                        {m.name.slice(0, 1)}
                      </span>
                      <strong>{m.name}</strong>
                    </span>
                  </td>
                  <td className="num">{m.device}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{m.model}</td>
                  <td>
                    <span className={s.roleTags}>
                      {m.roles.map((r) => (
                        <span key={r} className={s.roleTag}>
                          {r}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{m.hours}</td>
                  <td className="r num">{m.acceptedFindings}</td>
                  <td className={`r num ${rateClass(m.confirmedRate)}`}>{m.confirmedRate}%</td>
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
            Each member picks the roles their AI may take, the hours it works and a daily spending
            limit. They can pause it from here or from their computer at any time.
          </p>
        </section>
        <section className={`panel ${s.explainer}`}>
          <span className={s.explainerIcon}>
            <Icon name="scale" />
          </span>
          <h3>Fair credit</h3>
          <p>
            Only findings that another member’s AI reproduces count towards credit. Doing lots of
            work isn’t the same as doing good work.
          </p>
        </section>
      </div>
    </div>
  );
}
