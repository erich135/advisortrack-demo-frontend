import { apiRequest } from './apiClient';
import type { AuthUser } from './authApi';

export type DemoPublicRole = 'executive' | 'regional_manager' | 'team_leader';

export type DemoSessionInfo = {
  id: string;
  companyId: string | null;
  selectedRole: DemoPublicRole | null;
  status: 'active' | 'expired' | 'archived';
  createdAt: string;
  expiresAt: string;
};

export type DemoAuthResult = {
  token: string;
  session: DemoSessionInfo;
  user: AuthUser;
};

export async function enterDemo(selectedRole: DemoPublicRole): Promise<DemoAuthResult> {
  return apiRequest<DemoAuthResult>('/demo/enter', {
    method: 'POST',
    auth: false,
    body: { selectedRole },
  });
}

export async function switchDemoRole(selectedRole: DemoPublicRole): Promise<DemoAuthResult> {
  return apiRequest<DemoAuthResult>('/demo/switch-role', {
    method: 'POST',
    body: { selectedRole },
  });
}

export async function getDemoSession(): Promise<{ session: DemoSessionInfo; user: AuthUser }> {
  return apiRequest('/demo/session');
}

export async function resetDemo(): Promise<DemoAuthResult> {
  return apiRequest<DemoAuthResult>('/demo/reset', { method: 'POST' });
}
