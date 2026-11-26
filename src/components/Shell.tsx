import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSwarm } from '../store/useSwarm';
import { Icon } from './Icon';
import s from './Shell.module.css';

export function DemoBanner() {
  return (
    <div className={s.demo} role="note">
      <span className={s.demoTag}>Demo</span>
      <span>Made-up data, simulated AIs, nothing saved. Research only, not financial advice.</span>
    </div>
  );
}

function ToastItem({
  id,
  text,
  link,
  tone = 'info',
}: {
  id: number;
  text: string;
  link?: { to: string; label: string };
  tone?: string;
}) {
  const dismiss = useSwarm((st) => st.dismissToast);
  useEffect(() => {
    const t = setTimeout(() => dismiss(id), 7000);
    return () => clearTimeout(t);
  }, [id, dismiss]);
  return (
    <div className={`${s.toast} ${s[tone]}`} role="status">
      <span className={s.toastBar} aria-hidden />
      <div className={s.toastBody}>
        <span>{text}</span>
        {link && (
          <Link to={link.to} className={s.toastLink} onClick={() => dismiss(id)}>
            {link.label} <Icon name="arrow" size={14} />
          </Link>
        )}
      </div>
      <button type="button" className={s.toastX} onClick={() => dismiss(id)} aria-label="Dismiss">
        <Icon name="x" size={14} />
      </button>
    </div>
  );
}

export function Toasts() {
  const toasts = useSwarm((st) => st.toasts);
  return (
    <div className={s.toasts} aria-live="polite">
      {toasts.map((t) => (
        <ToastItem key={t.id} {...t} />
      ))}
    </div>
  );
}
