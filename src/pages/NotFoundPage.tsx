import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui';

export default function NotFoundPage() {
  return (
    <div className="card">
      <EmptyState
        title="Page not found"
        action={
          <Link className="btn primary" to="/">
            Back to Dashboard
          </Link>
        }
      >
        This address is not part of the AdvisorTrack Management Portal.
      </EmptyState>
    </div>
  );
}
