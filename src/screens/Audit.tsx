import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useSwarm } from '../store/useSwarm';
import s from './screens.module.css';

export function Audit() {
  const audit = useSwarm((st) => st.audit);
  const ready = useSwarm((st) => st.auditReady);
  const tamper = useSwarm((st) => st.tamper);
  const check = useSwarm((st) => st.chainCheck);
  const checkChain = useSwarm((st) => st.checkChain);
  const tamperOld = useSwarm((st) => st.tamperOld);
  const undo = useSwarm((st) => st.undoTamper);
  const jobs = useSwarm((st) => st.jobs);
  const [busy, setBusy] = useState(false);

  const brokenAt = check && !check.ok ? check.brokenAt : null;
  const newestFirst = [...audit].reverse();

  const run = async () => {
    setBusy(true);
    await checkChain();
    setBusy(false);
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Record</span>
          <h1>Audit trail</h1>
          <p className="lede">
            Every decision and hand-over is written here. Each entry carries a fingerprint of the
            entry before it, so changing any old entry breaks the chain from that point on. This is
            the ‘blockchain’ part of the swarm.
          </p>
        </div>
      </div>

      <div className="row">
        <button type="button" className="btn btn-primary" onClick={run} disabled={!ready || busy}>
          <Icon name="chain" size={16} /> Check the chain
        </button>
        <button type="button" className="btn" onClick={tamperOld} disabled={!ready || !!tamper}>
          <Icon name="pen" size={16} /> Try changing an old entry
        </button>
        {brokenAt !== null && tamper && (
          <button type="button" className="btn btn-bad" onClick={() => undo()}>
            <Icon name="undo" size={16} /> Undo the change
          </button>
        )}
      </div>

      {check?.ok && (
        <div className="banner banner-good" role="status">
          <Icon name="check" />
          <div className="banner-body">
            <strong>Chain intact.</strong>
            <span>All {check.count} entries match their fingerprints.</span>
          </div>
        </div>
      )}
      {brokenAt !== null && (
        <div className="banner banner-bad" role="alert">
          <Icon name="alert" />
          <div className="banner-body">
            <strong>Chain broken at entry {brokenAt}.</strong>
            <span>
              Someone changed it after it was written, so every entry after it no longer lines up.
            </span>
          </div>
        </div>
      )}
      {tamper && !check && (
        <div className="banner banner-warn" role="status">
          <Icon name="pen" />
          <div className="banner-body">
            <strong>Entry {tamper.index} was changed quietly.</strong>
            <span>
              It now says “{tamper.changed}”. Its fingerprint was not updated. Press{' '}
              <strong>Check the chain</strong> to see whether anyone could tell.
            </span>
          </div>
        </div>
      )}

      <section className="panel flush" aria-labelledby="entries-h">
        <div className="panel-head" style={{ paddingBottom: 16 }}>
          <h2 id="entries-h">Entries, newest first</h2>
          <span className="eyebrow">{audit.length} entries · SHA-256</span>
        </div>
        {!ready ? (
          <p className="muted" style={{ padding: 24 }}>
            Working out fingerprints…
          </p>
        ) : (
          <ol className={s.chainList} aria-label="Audit entries">
            {newestFirst.map((e) => {
              const broken = brokenAt !== null && e.index >= brokenAt;
              return (
                <li
                  key={e.index}
                  className={`${s.entry} ${broken ? s.broken : ''} ${e.index === brokenAt ? s.brokenFirst : ''}`}
                >
                  <span className={s.entryIndex}>#{e.index}</span>
                  <span className={s.entryTime}>{e.time}</span>
                  <span className={s.entryBody}>
                    <span>
                      <strong>{e.who}</strong> · {e.action}
                      {tamper?.index === e.index && <span className={s.changedTag}>changed</span>}
                    </span>
                    <span className={s.hashes}>
                      <span>
                        #{e.index} <code>{e.hash.slice(0, 16)}</code>
                      </span>
                      <span>
                        after <code>{e.prevHash.slice(0, 16)}</code>
                      </span>
                    </span>
                  </span>
                  <span className={`${s.entryJob} small`}>
                    {e.jobId &&
                      (jobs.some((j) => j.id === e.jobId) ? (
                        <Link to={`/jobs/${e.jobId}`} className="num">
                          {e.jobId}
                        </Link>
                      ) : (
                        <span className="num muted">{e.jobId}</span>
                      ))}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>
      <p className="footnote">
        The fingerprints are real SHA-256 hashes worked out in your browser. There is no real
        blockchain, token or wallet: just a record that shows when it has been changed.
      </p>
    </div>
  );
}
