type CompanyContextBannerProps = {
  name: string | null | undefined;
  testId?: string;
  kicker?: string;
};

/** Read-only tenant name. Never a company switcher. */
export function CompanyContextBanner({
  name,
  testId = 'company-context',
  kicker = 'Company',
}: CompanyContextBannerProps) {
  const label = name?.trim();
  if (!label) return null;
  return (
    <div className="company-context-banner" data-testid={testId}>
      <span className="company-context-kicker">{kicker}</span>
      <span className="company-context-name">{label}</span>
    </div>
  );
}

export function CompanyContextMark({
  name,
  plan,
  testId = 'portal-company-context',
}: {
  name: string | null | undefined;
  plan?: string | null;
  testId?: string;
}) {
  const label = name?.trim();
  const planLabel = plan?.trim();
  if (!label) return null;
  return (
    <div
      className="company-context-mark"
      data-testid={testId}
      title={planLabel ? `${label} · ${planLabel}` : label}
    >
      <span className="company-context-mark-name">{label}</span>
      {planLabel ? <span className="company-context-mark-plan">{planLabel}</span> : null}
    </div>
  );
}

export function CompanyContextField({ name }: { name: string | null | undefined }) {
  const label = name?.trim() || '—';
  return (
    <div className="field span-2">
      <label className="field-label" htmlFor="company-context-readonly">
        Company
      </label>
      <input
        id="company-context-readonly"
        className="input"
        value={label}
        readOnly
        disabled
        data-testid="company-context-field"
      />
    </div>
  );
}
