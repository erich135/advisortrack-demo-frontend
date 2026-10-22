import { useEffect, useState } from 'react';
import {
  getAdvisorSubscriptionMe,
  listAdvisorSubscriptionPackages,
  type AdvisorSubscriptionMe,
  type AdvisorSubscriptionPackage,
} from '../../api/advisorApi';
import { formatZAR } from '../../lib/format';
import { configErrorMessage } from './configWorkflow';

const FEATURE_LABELS: Record<string, string> = {
  live_preview: 'Live Preview (up to 3 real clients)',
  pipeline_case: 'Client pipeline cases',
  basic_income: 'Basic income summary',
  weekly_points: 'Weekly activity points & targets',
  pipeline_analytics: 'Pipeline conversion analytics',
  upcoming_events: 'Upcoming events on dashboard',
  adaptive_ratios: 'Adaptive planning ratios',
  bulk_import: 'Bulk contact import',
  priority_support: 'Priority support',
  advanced_reporting: 'Advanced reporting',
};

function packageName(me: AdvisorSubscriptionMe): string {
  return me.packageName || me.name || me.packageSlug || me.slug || 'Current plan';
}

export default function AdvisorSubscriptionPage() {
  const [me, setMe] = useState<AdvisorSubscriptionMe | null>(null);
  const [packages, setPackages] = useState<AdvisorSubscriptionPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([getAdvisorSubscriptionMe(), listAdvisorSubscriptionPackages()])
      .then(([nextMe, nextPackages]) => {
        if (cancelled) return;
        setMe(nextMe);
        setPackages(nextPackages);
      })
      .catch((caught) => {
        if (!cancelled) setError(configErrorMessage(caught, 'Your plan could not be loaded.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const quota = me?.entitlements?.contacts;
  const features = me?.features ?? [];

  return (
    <div className="advisor-config" data-testid="advisor-subscription">
      <header className="advisor-pipeline-head">
        <div>
          <p className="advisor-coming-soon-kicker">Subscription / Plan</p>
          <h2>Your personal AdvisorTrack plan</h2>
          <p className="advisor-home-muted">
            This is GET /subscription/me, not organisation licence seats or company billing.
          </p>
        </div>
      </header>
      {loading ? <p className="advisor-home-muted">Loading plan…</p> : null}
      {error ? <p className="advisor-config-error">{error}</p> : null}

      {me ? (
        <section className="advisor-config-card">
          <h3>Your current plan</h3>
          <p className="advisor-config-hero">{packageName(me)}</p>
          <p className="advisor-home-muted">
            Status {me.status ?? 'active'}
            {me.isTrialing ? ' · trial' : ''}
            {me.currentPeriodEnd ? ` · period ends ${me.currentPeriodEnd.slice(0, 10)}` : ''}
          </p>
          {quota ? (
            <dl className="advisor-production-stats">
              <div>
                <dt>Active real contacts</dt>
                <dd>
                  {quota.activeRealCount} / {quota.maxActiveRealContacts}
                </dd>
              </div>
              <div>
                <dt>Practice contacts</dt>
                <dd>{quota.practiceCount}</dd>
              </div>
              <div>
                <dt>Live Preview</dt>
                <dd>{quota.livePreviewEnabled ? 'On' : 'Off'}</dd>
              </div>
            </dl>
          ) : null}
          {features.length > 0 ? (
            <ul className="advisor-config-features">
              {features.map((feature) => (
                <li key={feature}>{FEATURE_LABELS[feature] ?? feature}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <section className="advisor-config-card">
        <h3>Live Preview</h3>
        <p>
          Live Preview allows up to 3 active real contacts. Practice contacts are excluded from that cap.
          Enabling it may rotate or archive an existing real contact according to the current backend rules. It
          is not a company licence seat.
        </p>
      </section>

      <section className="advisor-config-card">
        <h3>Features included</h3>
        <div className="advisor-config-packages">
          {packages.map((item) => (
            <article key={item.id}>
              <h4>
                {item.name}
                {item.badgeLabel ? <span>{item.badgeLabel}</span> : null}
              </h4>
              <p>{item.tagline || item.description}</p>
              <p>
                {item.priceCents === 0
                  ? 'Free'
                  : `${formatZAR(item.priceCents / 100)}${item.billingInterval ? ` / ${item.billingInterval}` : ''}`}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="advisor-config-card">
        <h3>Manage or upgrade</h3>
        <p>
          Manage or upgrade your subscription in the AdvisorTrack mobile app. There is no browser checkout for
          personal plans.
        </p>
      </section>
    </div>
  );
}
