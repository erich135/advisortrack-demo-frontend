import { apiRequest } from './apiClient';

export type Organisation = {
  id: string;
  name: string;
  slug?: string;
  seatLimit?: number | null;
  isPlatform?: boolean;
};

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company?: string | null;
  phone?: string | null;
  emailVerifiedAt?: string | null;
  organisation?: Organisation | null;
  [key: string]: unknown;
};

export type LoginResult = {
  token: string;
  user: AuthUser;
};

export async function login(email: string, password: string): Promise<LoginResult> {
  return apiRequest<LoginResult>('/auth/login', {
    method: 'POST',
    auth: false,
    body: { email, password },
  });
}

export async function getMe(): Promise<AuthUser> {
  return apiRequest<AuthUser>('/auth/me');
}
