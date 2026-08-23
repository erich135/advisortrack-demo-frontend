import { Link } from 'react-router-dom';
import { Building2, Users, Briefcase } from 'lucide-react';
import { ApiError } from '../api/apiClient';
import { getCompanyMe, getCompanyMembers } from '../api/companyApi';
import { getPlatformCompanies, type PlatformCompany } from '../api/platformApi';
import { useAsync } from '../lib/useAsync';
import { useAuth } from '../lib/useAuth';
import { Pill, Progress, StatCard, SkeletonRows, PageIntro } from '../components/ui';
import { formatDate } from '../lib/format';

type CompanyCardModel = {
  id: string;
  name: string;
  memberCount: number | null;
  seatLimit: number | null;
  isPlatform?: boolean;
  isActive?: boolean;
  createdAt?: string;
};

function seatCapacityLabel(seatLimit: number | null | undefined): string {
  if (seatLimit == null) return 'Unlimited';
  return String(seatLimit);
}

function utilisationPercent(memberCount: number | null, seatLimit: number | null | undefined): number | null {
  if (seatLimit == null || seatLimit <= 0) return null;
  if (memberCount == null) return null;
  return Math.min(100, (memberCount / seatLimit) * 100);
}

function toCardFromPlatform(c: PlatformCompany): CompanyCardModel {
  return {
    id: c.id,
    name: c.name,
    memberCount: typeof c.memberCount === 'number' ? c.memberCount : null,
    seatLimit: c.seatLimit === undefined ? null : c.seatLimit,
    isPlatform: c.isPlatform,
    isActive: c.isActive,
    createdAt: c.createdAt,
  };
}

type CompaniesPageData = {
  mode: 'platform' | 'own';
  companies: CompanyCardModel[];
};

async function loadCompaniesPage(isPlatformAdmin: boolean): Promise<CompaniesPageData> {
  if (isPlatformAdmin) {
    const list = await getPlatformCompanies();
    return {
      mode: 'platform',
      companies: list.map(toCardFromPlatform),
    };
  }

  const me = await getCompanyMe();
  let memberCount: number | null = null;
  try {
    const members = await getCompanyMembers();
    memberCount = members.length;
  } catch {
    // Member list may be forbidden for some roles — company card still works.
  }

  return {
    mode: 'own',
    companies: [
      {
        id: me.company.id,
        name: me.company.name,
        memberCount,
        seatLimit: me.company.seatLimit === undefined ? null : me.company.seatLimit ?? null,
        isPlatform: me.company.isPlatform,
      },
    ],
  };
}

function CompanyCard({ c }: { c: CompanyCardModel }) {
  const util = utilisationPercent(c.memberCount, c.seatLimit);
  const membersLabel = c.memberCount == null ? '—' : String(c.memberCount);
  const capacityLabel = seatCapacityLabel(c.seatLimit);
  const content = (
    <div className="card card-pad">
      <div className="row between" style={{ marginBottom: 12 }}>
        <div className="row" style={{ gap: 10 }}>
          <span className="avatar" style={{ width: 38, height: 38, background: 'var(--brand)', borderRadius: 9, display: 'grid', placeItems: 'center' }}>
            <Building2 size={18} color="#fff" />
          </span>
          <div>
            <div style={{ fontWeight: 600 }}>{c.name}</div>
            <div className="sm muted" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
              {c.isPlatform ? <Pill tone="purple">Platform</Pill> : null}
              {c.isActive === true ? <Pill tone="green">Active</Pill> : null}
              {c.isActive === false ? <Pill tone="grey">Inactive</Pill> : null}
            </div>
          </div>
        </div>
        {util != null ? (
          <Pill tone={util > 90 ? 'amber' : 'green'}>{Math.round(util)}% occupied</Pill>
        ) : (
          <Pill tone="grey">Capacity {capacityLabel}</Pill>
        )}
      </div>

      <div className="stack" style={{ gap: 6, marginBottom: 12 }}>
        <div className="row between subtle" style={{ fontSize: 12 }}>
          <span>Members / seat capacity</span>
          <span>{membersLabel} / {capacityLabel}</span>
        </div>
        {util != null ? (
          <Progress value={util} color={util > 90 ? 'var(--amber)' : undefined} />
        ) : (
          <div className="subtle" style={{ fontSize: 12 }}>
            Seat limits are not enforced by the API yet. Member count is occupancy only.
          </div>
        )}
      </div>

      <div className="row between" style={{ borderTop: '1px solid var(--border-muted)', paddingTop: 10, fontSize: 13 }}>
        <div className="stack" style={{ gap: 1 }}>
          <span className="subtle" style={{ fontSize: 12 }}>Members</span>
          <span style={{ fontWeight: 600 }}>{membersLabel}</span>
        </div>
        <div className="stack" style={{ gap: 1, textAlign: 'right' }}>
          <span className="subtle" style={{ fontSize: 12 }}>
            {c.createdAt ? 'Created' : 'Seat capacity'}
          </span>
          <span style={{ fontWeight: 600 }}>
            {c.createdAt ? formatDate(c.createdAt) : capacityLabel}
          </span>
        </div>
      </div>
    </div>
  );

  if (!c.isPlatform) {
    return (
      <Link to={`/companies/${c.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
        {content}
      </Link>
    );
  }
  return content;
}

export default function CompaniesPage() {
  const { session } = useAuth();
  const isPlatformAdmin = Boolean(session?.isPlatformAdmin);
  const loaded = useAsync(() => loadCompaniesPage(isPlatformAdmin), [isPlatformAdmin]);

  if (loaded.loading && !loaded.data) {
    return <SkeletonRows rows={5} cols={4} />;
  }

  if (loaded.error && !loaded.data) {
    const err = loaded.error;
    const message =
      err instanceof ApiError
        ? err.status === 403
          ? 'You do not have permission to view this companies list.'
          : err.message
        : 'Unable to load companies. Please try again.';
    return (
      <>
        <PageIntro>
          Organisations on AdvisorTrack. Seat capacity is shown where available; limits are not enforced yet.
        </PageIntro>
        <div className="card">
          <div className="empty" style={{ color: 'var(--red)' }}>{message}</div>
        </div>
      </>
    );
  }

  const mode = loaded.data!.mode;
  const companies = loaded.data!.companies;

  const totalMembers = companies.reduce((sum, c) => sum + (c.memberCount ?? 0), 0);
  const finiteSeatCapacity = companies.reduce((sum, c) => {
    if (typeof c.seatLimit === 'number' && c.seatLimit > 0) return sum + c.seatLimit;
    return sum;
  }, 0);
  const hasAnyUnlimited = companies.some((c) => c.seatLimit == null);
  const activeCompanies = companies.filter((c) => c.isActive !== false).length;

  return (
    <>
      <PageIntro>
        {mode === 'platform'
          ? 'All organisations on the platform. Open a customer to see users, subscription, licences and invoices together.'
          : 'Your organisation. Member counts are occupancy; seat capacity is informational only.'}
      </PageIntro>

      <div className="grid grid-3">
        {mode === 'platform' ? (
          <>
            <StatCard
              label="Companies"
              value={companies.length}
              icon={<Building2 size={18} />}
              iconBg="var(--brand-soft)"
              iconColor="var(--brand)"
            />
            <StatCard
              label="Members"
              value={totalMembers}
              icon={<Users size={18} />}
              iconBg="var(--purple-soft)"
              iconColor="var(--purple)"
            />
            {finiteSeatCapacity > 0 && !hasAnyUnlimited ? (
              <StatCard
                label="Seat capacity"
                value={finiteSeatCapacity}
                icon={<Briefcase size={18} />}
                iconBg="var(--green-soft)"
                iconColor="var(--green)"
              />
            ) : (
              <StatCard
                label="Active companies"
                value={activeCompanies}
                icon={<Briefcase size={18} />}
                iconBg="var(--green-soft)"
                iconColor="var(--green)"
              />
            )}
          </>
        ) : (
          <>
            <StatCard
              label="Company"
              value={companies.length}
              icon={<Building2 size={18} />}
              iconBg="var(--brand-soft)"
              iconColor="var(--brand)"
            />
            <StatCard
              label="Members"
              value={companies[0]?.memberCount ?? '—'}
              icon={<Users size={18} />}
              iconBg="var(--purple-soft)"
              iconColor="var(--purple)"
            />
            <StatCard
              label="Seat capacity"
              value={seatCapacityLabel(companies[0]?.seatLimit)}
              icon={<Briefcase size={18} />}
              iconBg="var(--green-soft)"
              iconColor="var(--green)"
            />
          </>
        )}
      </div>

      <div className="grid grid-3" style={{ marginTop: 16 }}>
        {companies.map((c) => (
          <CompanyCard key={c.id} c={c} />
        ))}
        {companies.length === 0 && (
          <div className="card card-pad" style={{ gridColumn: '1 / -1' }}>
            <div className="empty">No companies to show.</div>
          </div>
        )}
      </div>
    </>
  );
}
