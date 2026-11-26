import { Link } from 'react-router-dom';

export function NotFound({ what = 'page' }: { what?: string }) {
  return (
    <div className="page">
      <div className="panel stack" style={{ alignItems: 'flex-start' }}>
        <span className="eyebrow">Not found</span>
        <h1>We couldn’t find that {what}.</h1>
        <p className="muted">
          The link may be wrong, or it may point at something made before the last reload. Nothing
          in this demo is saved, so reloading resets it.
        </p>
        <Link to="/" className="btn btn-primary">
          Go to the overview
        </Link>
      </div>
    </div>
  );
}
