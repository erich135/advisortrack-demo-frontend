import { apiRequest } from './apiClient';

export type SubscriptionMe = {
  status?: string;
  slug?: string;
  name?: string;
  packageSlug?: string;
  packageName?: string;
  entitlements?: unknown;
  [key: string]: unknown;
};

export async function getSubscriptionMe(): Promise<SubscriptionMe> {
  return apiRequest<SubscriptionMe>('/subscription/me');
}
