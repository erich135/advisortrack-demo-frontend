import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import Layout from './components/Layout';
import AdvisorLayout from './components/AdvisorLayout';
import AdvisorCasePage from './pages/advisor/AdvisorCasePage';
import AdvisorPipelinePage from './pages/advisor/AdvisorPipelinePage';
import AdvisorActivitiesPage from './pages/advisor/AdvisorActivitiesPage';
import AdvisorContactsPage from './pages/advisor/AdvisorContactsPage';
import AdvisorHomePage from './pages/advisor/AdvisorHomePage';
import AdvisorPlanningPage from './pages/advisor/AdvisorPlanningPage';
import AdvisorProductionPage from './pages/advisor/AdvisorProductionPage';
import AdvisorProfilePage from './pages/advisor/AdvisorProfilePage';
import AdvisorSettingsPage from './pages/advisor/AdvisorSettingsPage';
import AdvisorSetupGate from './pages/advisor/AdvisorSetupGate';
import AdvisorSetupPage from './pages/advisor/AdvisorSetupPage';
import AdvisorSubscriptionPage from './pages/advisor/AdvisorSubscriptionPage';
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

export default function App() {
  return (
    <>
      <PostLoginRedirect />
      <Routes>
        <Route
          element={
            <RequireAdvisorWorkspace>
              <AdvisorSetupGate>
                <AdvisorLayout />
              </AdvisorSetupGate>
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
          <Route path="/advisor/planning" element={<AdvisorPlanningPage />} />
          <Route path="/advisor/profile" element={<AdvisorProfilePage />} />
          <Route path="/advisor/settings" element={<AdvisorSettingsPage />} />
          <Route path="/advisor/subscription" element={<AdvisorSubscriptionPage />} />
          <Route path="/advisor/setup" element={<AdvisorSetupPage />} />
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
