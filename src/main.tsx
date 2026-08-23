import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, useLocation } from 'react-router-dom';
import App from './App';
import LoginPage from './pages/LoginPage';
import DemoEntryPage from './pages/DemoEntryPage';
import { ToastProvider } from './components/ui';
import { useAuth } from './lib/useAuth';
import { isPublicDemo } from './lib/publicDemo';
import type { DemoPublicRole } from './api/demoApi';
import './styles/global.css';

function Root() {
  const { status, authed, login, enterDemoRole } = useAuth();
  const location = useLocation();
  const [demoError, setDemoError] = useState<string | null>(null);
  const [submittingRole, setSubmittingRole] = useState<DemoPublicRole | null>(null);

  // Team Pipeline demo stays isolated from real Abel auth.
  if (!isPublicDemo && location.pathname.startsWith('/team-pipeline-demo')) {
    return <App />;
  }

  if (status === 'booting') {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--color-white)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--text-muted)',
          fontFamily: 'inherit',
          fontSize: 14,
        }}
      >
        Checking session…
      </div>
    );
  }

  if (!authed) {
    if (isPublicDemo) {
      if (location.pathname === '/login') {
        return <Navigate to="/" replace />;
      }
      return (
        <DemoEntryPage
          submittingRole={submittingRole}
          error={demoError}
          onSelectRole={async (role) => {
            setSubmittingRole(role);
            setDemoError(null);
            const result = await enterDemoRole(role);
            setSubmittingRole(null);
            if (!result.ok) {
              setDemoError(result.error);
              return result;
            }
            return result;
          }}
        />
      );
    }
    return <LoginPage onLogin={login} />;
  }

  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <Root />
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
