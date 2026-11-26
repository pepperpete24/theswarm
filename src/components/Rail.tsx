import { NavLink } from 'react-router-dom';
import { useSwarm, type Theme } from '../store/useSwarm';
import { Icon, type IconName } from './Icon';
import s from './Rail.module.css';

const NAV: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/', label: 'Overview', icon: 'overview', end: true },
  { to: '/ask', label: 'Ask a question', icon: 'ask' },
  { to: '/board', label: 'Work board', icon: 'board' },
  { to: '/review', label: 'Review desk', icon: 'review' },
  { to: '/published', label: 'Published findings', icon: 'published' },
  { to: '/budgets', label: 'Budgets', icon: 'budget' },
  { to: '/contributors', label: 'Contributors', icon: 'people' },
  { to: '/audit', label: 'Audit trail', icon: 'chain' },
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

export function Rail() {
  const waiting = useSwarm((st) => st.jobs.filter((j) => j.state === 'human').length);
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
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) => `${s.link} ${isActive ? s.active : ''}`}
          >
            <Icon name={n.icon} size={17} />
            <span>{n.label}</span>
            {n.to === '/review' && waiting > 0 && (
              <span className={s.badge} aria-label={`${waiting} waiting`}>
                {waiting}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className={s.foot}>
        <div className={s.signed}>
          <span className={s.youAvatar} aria-hidden>
            Y
          </span>
          <span>
            <strong>You</strong>
            <span className="muted"> · publisher</span>
          </span>
        </div>
        <p className={s.note}>
          Demo with made-up data. Nothing here is real or saved; reload to reset. Signed in as You,
          publisher.
        </p>
        <ThemeToggle />
      </div>
    </aside>
  );
}
