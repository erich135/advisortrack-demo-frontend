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
import { useAuth } from './lib/useAuth';
import { isPublicDemo } from './lib/publicDemo';
import {
  hasLeadershipPortalAccess,
  isCustomerExecutive,
} from './lib/portalAccess';

function RequireLeadership({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  if (!hasLeadershipPortalAccess(session)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function RequirePlatform({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  if (isPublicDemo || !session?.isPlatformAdmin) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function RequireExecutive({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  if (isPublicDemo) {
    return isCustomerExecutive(session) ? children : <Navigate to="/" replace />;
  }
  if (!session?.isPlatformAdmin && !isCustomerExecutive(session)) {
    return <Navigate to="/" replace />;
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
            <RequirePlatform>
              <SubscriptionsPage />
            </RequirePlatform>
          }
        />
        <Route
          path="/companies"
          element={
            <RequirePlatform>
              <CompaniesPage />
            </RequirePlatform>
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
            <RequirePlatform>
              <InvoicesPage />
            </RequirePlatform>
          }
        />
        <Route
          path="/audit"
          element={
            <RequirePlatform>
              <AuditPage />
            </RequirePlatform>
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
            <RequirePlatform>
              <PerformancePage />
            </RequirePlatform>
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
