import { Building2, MapPinned, Users } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import type { DemoPublicRole } from '../api/demoApi';

const ROLES: {
  id: DemoPublicRole;
  title: string;
  description: string;
  icon: typeof Building2;
}[] = [
  {
    id: 'executive',
    title: 'Executive',
    description: 'Organisation-wide leadership visibility.',
    icon: Building2,
  },
  {
    id: 'regional_manager',
    title: 'Regional Manager',
    description: 'Regional/team leadership visibility.',
    icon: MapPinned,
  },
  {
    id: 'team_leader',
    title: 'Team Leader',
    description: 'Team and Advisor visibility.',
    icon: Users,
  },
];

type DemoEntryPageProps = {
  onSelectRole: (role: DemoPublicRole) => Promise<{ ok: true } | { ok: false; error: string }>;
  submittingRole: DemoPublicRole | null;
  error: string | null;
};

export default function DemoEntryPage({ onSelectRole, submittingRole, error }: DemoEntryPageProps) {
  const busy = Boolean(submittingRole);

  return (
    <div className="auth-screen demo-entry-screen">
      <div className="demo-entry-panel">
        <div className="auth-brand">
          <BrandLogo variant="on-light" className="auth-logo" />
        </div>

        <div className="demo-entry-intro">
          <p className="demo-entry-kicker">AdvisorTrack Demo</p>
          <h1>Choose a management perspective</h1>
          <p>Explore the Management Portal as one of three leadership roles. You can switch later without leaving this organisation.</p>
        </div>

        {error ? <div className="auth-error demo-entry-error">{error}</div> : null}

        <div className="demo-role-grid">
          {ROLES.map((role) => {
            const Icon = role.icon;
            const selected = submittingRole === role.id;
            return (
              <button
                key={role.id}
                type="button"
                className={`demo-role-card${selected ? ' is-busy' : ''}`}
                disabled={busy}
                onClick={() => {
                  void onSelectRole(role.id);
                }}
              >
                <span className="demo-role-icon">
                  <Icon size={20} />
                </span>
                <span className="demo-role-title">{role.title}</span>
                <span className="demo-role-copy">{role.description}</span>
                <span className="demo-role-action">{selected ? 'Opening…' : 'Enter demo'}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
