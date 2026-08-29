import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import Layout from './components/Layout';
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
import {
  AUDIT_PERMISSION_DENIED_MESSAGE,
  AUDIT_PERMISSION_DENIED_TITLE,
  PermissionDenied,
} from './components/PermissionDenied';
import { useAuth } from './lib/useAuth';
import { isPublicDemo } from './lib/publicDemo';
import {
  hasLeadershipPortalAccess,
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

export default function App() {
  return (
    <Layout>
      <Routes>
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
            <RequireExecutive>
              <InvoicesPage />
            </RequireExecutive>
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
            <RequireLeadership>
              <UsersPage />
            </RequireLeadership>
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
      </Routes>
    </Layout>
  );
}
