import { getCompanySubscription } from '../api/companyApi';
import type { CompanySubscription } from '../api/platformApi';
import { ApiError } from '../api/apiClient';
import { CompanySubscriptionSummary } from '../components/CompanySubscriptionSummary';
import { isPermissionDeniedError, PermissionDenied } from '../components/PermissionDenied';
import { SkeletonRows } from '../components/ui';
import { useAsync } from '../lib/useAsync';
import { useAuth } from '../lib/useAuth';
import type { CustomerSubscriptionSummary } from '../lib/enterpriseContract';

function toCustomerSummary(
  data: CompanySubscription | null | undefined
): CustomerSubscriptionSummary | null {
  if (!data) return null;
  if (data.enterprise) return data.enterprise;
  const flat = data as CompanySubscription & Partial<CustomerSubscriptionSummary>;
  if (typeof flat.planName === 'string' && flat.company?.name) {
    return flat as CustomerSubscriptionSummary;
  }
  return null;
}

export default function CompanySubscriptionPage() {
  const { session } = useAuth();
  const loaded = useAsync(async () => {
    const data = await getCompanySubscription();
    return toCustomerSummary(data);
  }, [session?.user.id]);

  if (isPermissionDeniedError(loaded.error)) {
    return <PermissionDenied />;
  }

  if (loaded.loading && !loaded.data) {
    return <SkeletonRows rows={8} cols={2} />;
  }

  if (loaded.error && !loaded.data) {
    return (
      <div className="card">
        <div className="empty" style={{ color: 'var(--red)' }}>
          {loaded.error instanceof ApiError ? loaded.error.message : 'Unable to load subscription.'}
        </div>
      </div>
    );
  }

  if (!loaded.data) {
    return (
      <div className="card">
        <div className="empty">No enterprise contract is on file for this company.</div>
      </div>
    );
  }

  return <CompanySubscriptionSummary summary={loaded.data} />;
}
