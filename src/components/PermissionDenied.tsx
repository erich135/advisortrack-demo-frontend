import { Link } from 'react-router-dom';
import { ApiError } from '../api/apiClient';
import { EmptyState } from './ui';

export const PERMISSION_DENIED_TITLE = 'You don’t have access to this feature';
export const PERMISSION_DENIED_MESSAGE =
  'Your current role does not have permission to view this area.';

export const AUDIT_PERMISSION_DENIED_TITLE =
  'Audit Trail is available to Regional Managers and Executives';
export const AUDIT_PERMISSION_DENIED_MESSAGE =
  'Your current role does not have access to organisation-wide audit history.';

export function isPermissionDeniedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403;
}

export function PermissionDenied({
  title = PERMISSION_DENIED_TITLE,
  message = PERMISSION_DENIED_MESSAGE,
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="card">
      <EmptyState
        title={title}
        action={
          <Link className="btn primary" to="/">
            Back to Dashboard
          </Link>
        }
      >
        {message}
      </EmptyState>
    </div>
  );
}
