import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useSwarm, type Theme } from '../store/useSwarm';
import { Icon, type IconName } from './Icon';
import s from './Rail.module.css';

type NavItem = { to: string; label: string; icon: IconName; end?: boolean };

const GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Work',
    items: [
      { to: '/', label: 'Overview', icon: 'overview', end: true },
      { to: '/new', label: 'New mission', icon: 'target' },
      { to: '/missions', label: 'Missions', icon: 'missions' },
      { to: '/approvals', label: 'Council approvals', icon: 'council' },
    ],
  },
  {
    title: 'Knowledge',
    items: [
      { to: '/library', label: 'Library', icon: 'book' },
      { to: '/improvement', label: 'Improvement', icon: 'trend' },
      { to: '/scoreboard', label: 'Scoreboard', icon: 'scale' },
      { to: '/published', label: 'Published', icon: 'published' },
    ],
  },
  {
    title: 'Running the swarm',
    items: [
      { to: '/contributors', label: 'Contributors', icon: 'people' },
      { to: '/budgets', label: 'Budgets', icon: 'budget' },
      { to: '/audit', label: 'Audit trail', icon: 'chain' },
    ],
  },
];

export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className={s.logo}>
      <rect width="32" height="32" rx="8" className={s.logoBg} />
      <g fill="none" strokeWidth="1.8" strokeLinecap="round" className={s.logoInk}>
        <path d="M10 11 L16 7.5 L22 11 L22 18 L16 21.5 L10 18 Z" />
        <path d="M16 21.5 V25" />
      </g>
      <circle cx="16" cy="14.5" r="2.4" className={s.logoDot} />
    </svg>
  );
}

function ThemeToggle() {
  const theme = useSwarm((st) => st.theme);
  const setTheme = useSwarm((st) => st.setTheme);
  const opts: { v: Theme; label: string; icon: IconName }[] = [
    { v: null, label: 'Match my device', icon: 'auto' },
    { v: 'light', label: 'Light', icon: 'sun' },
    { v: 'dark', label: 'Dark', icon: 'moon' },
  ];
  return (
    <div className={s.theme} role="radiogroup" aria-label="Colour theme">
      {opts.map((o) => (
        <button
          key={o.label}
          type="button"
          role="radio"
          aria-checked={theme === o.v}
          className={s.themeBtn}
          onClick={() => setTheme(o.v)}
          title={o.label}
        >
          <Icon name={o.icon} size={15} />
          <span className="sr-only">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/** The owner's one safety control. Confirms inside the page, never with a browser dialog. */
function EmergencyStop() {
  const stopped = useSwarm((st) => st.stopped);
  const stop = useSwarm((st) => st.emergencyStop);
  const release = useSwarm((st) => st.releaseStop);
  const [confirm, setConfirm] = useState(false);
  if (stopped)
    return (
      <div className={s.stopOn} role="status">
        <strong>
          <Icon name="stop" size={15} /> Emergency stop is on
        </strong>
        <span>No new work, no publishing.</span>
        <button type="button" className="btn btn-sm" onClick={release}>
          Release the stop
        </button>
      </div>
    );
  if (confirm)
    return (
      <div className={s.stopConfirm}>
        <span>Stop all new work and publishing?</span>
        <div className="row" style={{ gap: 6 }}>
          <button
            type="button"
            className="btn btn-sm btn-bad"
            onClick={() => {
              stop();
              setConfirm(false);
            }}
          >
            Yes, stop
          </button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirm(false)}>
            Cancel
          </button>
        </div>
      </div>
    );
  return (
    <button type="button" className={s.stopBtn} onClick={() => setConfirm(true)}>
      <Icon name="stop" size={15} /> Emergency stop
    </button>
  );
}

export function Rail() {
  const inSession = useSwarm(
    (st) => Object.values(st.world.panels).filter((p) => !p.outcome).length,
  );
  return (
    <aside className={s.rail}>
      <div className={s.brand}>
        <Logo />
        <div>
          <div className={s.name}>Swarm Research Desk</div>
          <div className={s.sub}>EURUSD pilot</div>
        </div>
        <div className={s.mobileTheme}>
          <ThemeToggle />
        </div>
      </div>
      <nav aria-label="Main" className={s.nav}>
        {GROUPS.map((g) => (
          <div key={g.title} className={s.group}>
            <span className={s.groupTitle}>{g.title}</span>
            {g.items.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) => `${s.link} ${isActive ? s.active : ''}`}
              >
                <Icon name={n.icon} size={17} />
                <span>{n.label}</span>
                {n.to === '/approvals' && inSession > 0 && (
                  <span className={s.badge} aria-label={`${inSession} panels in session`}>
                    {inSession}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className={s.foot}>
        <div className={s.signed}>
          <span className={s.youAvatar} aria-hidden>
            Y
          </span>
          <span>
            <strong>You</strong>
            <span className="muted"> · owner</span>
          </span>
        </div>
        <p className={s.note}>
          Demo with made-up data. Nothing here is real or saved; reload to reset. Signed in as You,
          owner. The council makes the decisions.
        </p>
        <EmergencyStop />
        <ThemeToggle />
      </div>
    </aside>
  );
}
