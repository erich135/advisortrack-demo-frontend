import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import Layout from './components/Layout';
import AdvisorLayout from './components/AdvisorLayout';
import { AdvisorComingSoonPage } from './pages/advisor/AdvisorComingSoonPage';
import AdvisorCasePage from './pages/advisor/AdvisorCasePage';
import AdvisorPipelinePage from './pages/advisor/AdvisorPipelinePage';
import AdvisorActivitiesPage from './pages/advisor/AdvisorActivitiesPage';
import AdvisorContactsPage from './pages/advisor/AdvisorContactsPage';
import AdvisorHomePage from './pages/advisor/AdvisorHomePage';
import AdvisorProductionPage from './pages/advisor/AdvisorProductionPage';
import DashboardPage from './pages/DashboardPage';
import AdvisorsPage from './pages/AdvisorsPage';
import AdvisorDetailPage from './pages/AdvisorDetailPage';
import ProductionPage from './pages/ProductionPage';
import TeamPipelinePage from './pages/TeamPipelinePage';
import TeamPipelineDemoPage from './pages/TeamPipelineDemoPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import CompaniesPage from './pages/CompaniesPage';
import CustomerAccountPage from './pages/CustomerAccountPage';
import AuditPage from './pages/AuditPage';
import InvoicesPage from './pages/InvoicesPage';
import SupportPage from './pages/SupportPage';
import PerformancePage from './pages/PerformancePage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';
import LicencesPage from './pages/LicencesPage';
import CompanySubscriptionPage from './pages/CompanySubscriptionPage';
import BulkImportPage from './pages/BulkImportPage';
import {
  AUDIT_PERMISSION_DENIED_MESSAGE,
  AUDIT_PERMISSION_DENIED_TITLE,
  PermissionDenied,
} from './components/PermissionDenied';
import { useAuth } from './lib/useAuth';
import { isPublicDemo } from './lib/publicDemo';
import {
  canUseAdvisorWorkspace,
  isAdvisorWorkspacePath,
  isLeadershipReportingPath,
  isOrganisationWorkspacePath,
} from './lib/workspace';
import {
  canBulkImportMembers,
  canViewCompanyInvoices,
  canViewCompanySubscription,
  hasLeadershipPortalAccess,
  hasOrganisationAdminAccess,
  isCustomerAuditViewer,
  isCustomerExecutive,
} from './lib/portalAccess';

function RequireLeadership({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  if (!hasLeadershipPortalAccess(session)) {
    return <PermissionDenied />;
  }
  return children;
}

function RequireOrganisation({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  if (!hasOrganisationAdminAccess(session)) {
    return <PermissionDenied />;
  }
  return children;
}

function RequireCompanyInvoices({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  if (!canViewCompanyInvoices(session)) {
    return <PermissionDenied />;
  }
  return children;
}

function RequireCompanySubscription({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  if (!canViewCompanySubscription(session)) {
    return <PermissionDenied />;
  }
  return children;
}

function RequireBulkImport({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  if (!canBulkImportMembers(session)) {
    return <PermissionDenied />;
  }
  return children;
}

function RequirePlatform({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  if (isPublicDemo || !session?.isPlatformAdmin) {
    return <PermissionDenied />;
  }
  return children;
}

function RequireExecutive({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const allowed = isPublicDemo
    ? isCustomerExecutive(session)
    : Boolean(session?.isPlatformAdmin || isCustomerExecutive(session));
  if (!allowed) {
    return <PermissionDenied />;
  }
  return children;
}

function RequireAuditViewer({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const allowed = isPublicDemo
    ? isCustomerAuditViewer(session)
    : Boolean(session?.isPlatformAdmin || isCustomerAuditViewer(session));
  if (!allowed) {
    return (
      <PermissionDenied
        title={AUDIT_PERMISSION_DENIED_TITLE}
        message={AUDIT_PERMISSION_DENIED_MESSAGE}
      />
    );
  }
  return children;
}

function RequireAdvisorWorkspace({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  if (!canUseAdvisorWorkspace(session)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function PostLoginRedirect() {
  const { pathname } = useLocation();
  const { session } = useAuth();
  if (canUseAdvisorWorkspace(session)) {
    if (isAdvisorWorkspacePath(pathname) || isOrganisationWorkspacePath(pathname)) {
      return null;
    }
    if (pathname === '/' || isLeadershipReportingPath(pathname)) {
      return <Navigate to="/advisor" replace />;
    }
  } else if (isAdvisorWorkspacePath(pathname)) {
    return <Navigate to="/" replace />;
  }
  return null;
}

const ADVISOR_COMING_SOON: Record<string, { title: string; description: string }> = {
  '/advisor/planning': {
    title: 'Planning & Targets',
    description: 'Planning values for your book will open here in the next phase.',
  },
  '/advisor/profile': {
    title: 'Profile',
    description: 'Your advisor profile will open here in the next phase.',
  },
  '/advisor/settings': {
    title: 'General Settings',
    description: 'Your general settings will open here in the next phase.',
  },
  '/advisor/subscription': {
    title: 'Subscription / Plan',
    description: 'Your plan details will open here in the next phase.',
  },
  '/advisor/setup': {
    title: 'Setup',
    description: 'Advisor setup will open here in the next phase.',
  },
};

export default function App() {
  return (
    <>
      <PostLoginRedirect />
      <Routes>
        <Route
          element={
            <RequireAdvisorWorkspace>
              <AdvisorLayout />
            </RequireAdvisorWorkspace>
          }
        >
          <Route path="/advisor" element={<AdvisorHomePage />} />
          <Route path="/advisor/contacts" element={<AdvisorContactsPage />} />
          <Route path="/advisor/contacts/:contactId" element={<AdvisorContactsPage />} />
          <Route path="/advisor/cases/:caseId" element={<AdvisorCasePage />} />
          <Route path="/advisor/activities" element={<AdvisorActivitiesPage />} />
          <Route path="/advisor/activities/:activityId" element={<AdvisorActivitiesPage />} />
          <Route path="/advisor/pipeline" element={<AdvisorPipelinePage />} />
          <Route path="/advisor/production" element={<AdvisorProductionPage />} />
          <Route path="/advisor/planning" element={<AdvisorComingSoonPage {...ADVISOR_COMING_SOON['/advisor/planning']} />} />
          <Route path="/advisor/profile" element={<AdvisorComingSoonPage {...ADVISOR_COMING_SOON['/advisor/profile']} />} />
          <Route path="/advisor/settings" element={<AdvisorComingSoonPage {...ADVISOR_COMING_SOON['/advisor/settings']} />} />
          <Route path="/advisor/subscription" element={<AdvisorComingSoonPage {...ADVISOR_COMING_SOON['/advisor/subscription']} />} />
          <Route path="/advisor/setup" element={<AdvisorComingSoonPage {...ADVISOR_COMING_SOON['/advisor/setup']} />} />
        </Route>
        <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route
          path="/advisors"
          element={
            <RequireLeadership>
              <AdvisorsPage />
            </RequireLeadership>
          }
        />
        <Route
          path="/team-pipeline"
          element={
            <RequireLeadership>
              <TeamPipelinePage />
            </RequireLeadership>
          }
        />
        {isPublicDemo ? null : <Route path="/team-pipeline-demo" element={<TeamPipelineDemoPage />} />}
        <Route
          path="/advisors/:id"
          element={
            <RequireLeadership>
              <AdvisorDetailPage />
            </RequireLeadership>
          }
        />
        <Route
          path="/production"
          element={
            <RequireLeadership>
              <ProductionPage />
            </RequireLeadership>
          }
        />
        <Route
          path="/subscriptions"
          element={
            <RequireExecutive>
              <SubscriptionsPage />
            </RequireExecutive>
          }
        />
        <Route
          path="/companies"
          element={
            <RequireExecutive>
              <CompaniesPage />
            </RequireExecutive>
          }
        />
        <Route
          path="/companies/:companyId"
          element={
            <RequirePlatform>
              <CustomerAccountPage />
            </RequirePlatform>
          }
        />
        <Route
          path="/invoices"
          element={
            <RequireCompanyInvoices>
              <InvoicesPage />
            </RequireCompanyInvoices>
          }
        />
        <Route
          path="/audit"
          element={
            <RequireAuditViewer>
              <AuditPage />
            </RequireAuditViewer>
          }
        />
        <Route
          path="/support"
          element={
            <RequirePlatform>
              <SupportPage />
            </RequirePlatform>
          }
        />
        <Route
          path="/performance"
          element={
            <RequireLeadership>
              <PerformancePage />
            </RequireLeadership>
          }
        />
        <Route path="/reports" element={<Navigate to="/performance" replace />} />
        <Route
          path="/users"
          element={
            <RequireOrganisation>
              <UsersPage />
            </RequireOrganisation>
          }
        />
        <Route
          path="/licences"
          element={
            <RequireOrganisation>
              <LicencesPage />
            </RequireOrganisation>
          }
        />
        <Route
          path="/subscription"
          element={
            <RequireCompanySubscription>
              <CompanySubscriptionPage />
            </RequireCompanySubscription>
          }
        />
        <Route
          path="/bulk-import"
          element={
            <RequireBulkImport>
              <BulkImportPage />
            </RequireBulkImport>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireExecutive>
              <SettingsPage />
            </RequireExecutive>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  );
}
