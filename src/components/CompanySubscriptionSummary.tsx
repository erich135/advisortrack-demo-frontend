import { CreditCard, KeyRound, Calendar } from 'lucide-react';
import { PageIntro, Pill, StatCard } from './ui';
import { formatDate } from '../lib/format';
import { formatLicenceCount, type CustomerSubscriptionSummary } from '../lib/enterpriseContract';

function formatRange(start: string | null, end: string | null): string {
  if (!start && !end) return '—';
  const left = start ? formatDate(start) : 'Open';
  const right = end ? formatDate(end) : 'Open';
  return `${left} – ${right}`;
}

export function CompanySubscriptionSummary({
  summary,
}: {
  summary: CustomerSubscriptionSummary;
}) {
  return (
    <>
      <PageIntro>
        Read-only AdvisorTrack Enterprise subscription for {summary.company.name}. Commercial terms
        cannot be changed from the customer portal.
      </PageIntro>
      <div className="grid grid-3">
        <StatCard
          label="Plan"
          value={summary.planName}
          icon={<CreditCard size={18} />}
          iconBg="var(--brand-soft)"
          iconColor="var(--brand)"
        />
        <StatCard
          label="Billing"
          value={summary.billingFrequencyLabel}
          icon={<Calendar size={18} />}
          iconBg="var(--green-soft)"
          iconColor="var(--green)"
        />
        <StatCard
          label="Purchased licences"
          value={formatLicenceCount(summary.currentPurchasedLicences)}
          icon={<KeyRound size={18} />}
          iconBg="var(--purple-soft)"
          iconColor="var(--purple)"
        />
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <table className="data">
          <tbody>
            <tr>
              <th>Company</th>
              <td style={{ fontWeight: 600 }}>{summary.company.name}</td>
            </tr>
            <tr>
              <th>Plan</th>
              <td>{summary.planName}</td>
            </tr>
            <tr>
              <th>Contract</th>
              <td>{formatRange(summary.contractStartDate, summary.contractEndDate)}</td>
            </tr>
            <tr>
              <th>Billing</th>
              <td>{summary.billingFrequencyLabel}</td>
            </tr>
            <tr>
              <th>Licences</th>
              <td>
                {formatLicenceCount(summary.committedLicences)} committed
                <div className="subtle" style={{ fontSize: 12, marginTop: 4 }}>
                  {formatLicenceCount(summary.currentPurchasedLicences)} currently purchased
                </div>
              </td>
            </tr>
            <tr>
              <th>Payment terms</th>
              <td>{summary.paymentTermsLabel}</td>
            </tr>
            <tr>
              <th>Amount due</th>
              <td>{summary.amountDueLabel}</td>
            </tr>
            <tr>
              <th>VAT</th>
              <td>
                <Pill tone="grey">{summary.vatLabel}</Pill>
              </td>
            </tr>
            <tr>
              <th>PO / reference</th>
              <td>{summary.poReference || '—'}</td>
            </tr>
            <tr>
              <th>Billing contact</th>
              <td>
                {summary.billingContactName || summary.billingEmail ? (
                  <div>
                    <div>{summary.billingContactName || '—'}</div>
                    {summary.billingEmail ? (
                      <div className="subtle" style={{ fontSize: 12 }}>{summary.billingEmail}</div>
                    ) : null}
                  </div>
                ) : (
                  '—'
                )}
              </td>
            </tr>
            {summary.billingNotes ? (
              <tr>
                <th>Billing notes</th>
                <td>{summary.billingNotes}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
