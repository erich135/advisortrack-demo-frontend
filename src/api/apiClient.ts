/// <reference types="vite/client" />

const isDemoBuild = import.meta.env.VITE_ADVISORTRACK_MODE === 'demo';

export const API_BASE_URL = (
  isDemoBuild
    ? ((import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || '/api/v1')
    : ((import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ||
        'https://api.advisortrack.co.za/api/v1')
).replace(/\/$/, '');

if (isDemoBuild && /^https?:\/\//i.test(API_BASE_URL)) {
  throw new Error('Demo frontend must not call an absolute API URL.');
}

const TOKEN_KEY = 'at_jwt';

export type ApiErrorBody = {
  message?: string;
  code?: string;
  details?: unknown;
};

export type ApiSuccessEnvelope<T> = {
  success: true;
  data: T;
};

export type ApiErrorEnvelope = {
  success: false;
  error: ApiErrorBody;
};

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, message: string, code = 'UNKNOWN', details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type UnauthorizedHandler = () => void;

let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler;
}

export function getStoredToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore storage failures (private mode, quota, etc.).
  }
}

export function clearStoredToken() {
  setStoredToken(null);
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, signal } = options;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (auth) {
    const token = getStoredToken();
    if (!token) {
      throw new ApiError(401, 'You are not signed in.', 'UNAUTHORIZED');
    }
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch {
    throw new ApiError(0, 'Unable to reach AdvisorTrack. Check your connection and try again.', 'NETWORK_ERROR');
  }

  let payload: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const envelope = payload as ApiErrorEnvelope | null;
    const message =
      envelope?.error?.message ||
      (response.status === 401
        ? 'Your session has expired. Please sign in again.'
        : `Request failed (${response.status}).`);
    const code = envelope?.error?.code || (response.status === 401 ? 'UNAUTHORIZED' : 'HTTP_ERROR');
    const error = new ApiError(response.status, message, code, envelope?.error?.details);

    if (auth && (response.status === 401 || code === 'UNAUTHORIZED' || code === 'TOKEN_EXPIRED' || code === 'INVALID_TOKEN' || code === 'DEMO_SESSION_EXPIRED' || code === 'DEMO_SESSION_REQUIRED')) {
      onUnauthorized?.();
    }

    throw error;
  }

  const envelope = payload as ApiSuccessEnvelope<T> | null;
  if (!envelope || envelope.success !== true) {
    throw new ApiError(response.status, 'Unexpected response from AdvisorTrack.', 'BAD_RESPONSE');
  }

  return envelope.data;
}

/** Authenticated binary download for invoice PDFs (not a JSON envelope). */
export async function apiDownload(path: string): Promise<{ blob: Blob; filename: string }> {
  const headers: Record<string, string> = { Accept: 'application/pdf' };
  const token = getStoredToken();
  if (!token) {
    throw new ApiError(401, 'You are not signed in.', 'UNAUTHORIZED');
  }
  headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`, {
      method: 'GET',
      headers,
    });
  } catch {
    throw new ApiError(0, 'Unable to reach AdvisorTrack. Check your connection and try again.', 'NETWORK_ERROR');
  }

  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    let code = response.status === 401 ? 'UNAUTHORIZED' : 'HTTP_ERROR';
    try {
      const payload = (await response.json()) as ApiErrorEnvelope;
      message = payload.error?.message || message;
      code = payload.error?.code || code;
    } catch {
      // Non-JSON error body.
    }
    const error = new ApiError(response.status, message, code);
    if (response.status === 401 || code === 'UNAUTHORIZED' || code === 'TOKEN_EXPIRED' || code === 'INVALID_TOKEN') {
      onUnauthorized?.();
    }
    throw error;
  }

  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="([^"]+)"/i);
  return { blob, filename: match?.[1] || 'invoice.pdf' };
}
