import type { ApiError } from './types';

let authToken: string | null = null;
let _onUnauthorizedCallback: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

/** Register a callback to be called on 401 (used by auth store) */
export function setOnUnauthorizedCallback(cb: () => void) {
  _onUnauthorizedCallback = cb;
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  /** If true, skip sending Authorization header (e.g. for public endpoints) */
  skipAuth?: boolean;
  /** If true, send body as FormData (multipart) instead of JSON */
  multipart?: boolean;
}

export async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/$/, '');
  let url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  if (options.params) {
    const searchParams = new URLSearchParams();
    for (const [key, val] of Object.entries(options.params)) {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');

  let body: BodyInit | undefined;

  if (options.multipart && options.body instanceof FormData) {
    // Let browser set Content-Type with boundary automatically
    body = options.body;
  } else if (options.body !== undefined && options.body !== null) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.body);
  }

  if (authToken && !options.skipAuth) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  const { body: _rawBody, params: _params, skipAuth: _skip, multipart: _multi, ...restOptions } = options;
  const fetchOptions: RequestInit = {
    ...restOptions,
    headers,
  };
  if (body !== undefined) {
    fetchOptions.body = body;
  }

  try {
    const response = await fetch(url, fetchOptions);

    if (response.status === 204) {
      return undefined as T;
    }

    // ── 401 Unauthorized ──────────────────────────────────────────────────
    if (response.status === 401) {
      if (_onUnauthorizedCallback) {
        _onUnauthorizedCallback();
      }
      const apiErr: ApiError = {
        status: 401,
        code: 'UNAUTHORIZED',
        message: 'Session expired. Please sign in again.',
      };
      throw apiErr;
    }

    // ── 403 Forbidden ─────────────────────────────────────────────────────
    if (response.status === 403) {
      let forbiddenMsg = 'Access denied. Contact an administrator to request access.';
      try {
        const body = await response.clone().json();
        if (body?.error) forbiddenMsg = body.error;
      } catch { /* ignore */ }
      const apiErr: ApiError = {
        status: 403,
        code: 'FORBIDDEN',
        message: forbiddenMsg,
      };
      throw apiErr;
    }

    let responseData: unknown = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json().catch(() => null);
    } else {
      const text = await response.text().catch(() => '');
      responseData = { message: text };
    }

    if (!response.ok) {
      const apiErr: ApiError = {
        status: response.status,
        code:
          typeof responseData === 'object' && responseData && 'code' in responseData
            ? String((responseData as { code: unknown }).code)
            : `HTTP_${response.status}`,
        message:
          typeof responseData === 'object' && responseData && 'message' in responseData
            ? String((responseData as { message: unknown }).message)
            : response.statusText || `Request failed with status ${response.status}`,
      };
      if (
        typeof responseData === 'object' &&
        responseData &&
        'fieldErrors' in responseData &&
        (responseData as { fieldErrors?: Record<string, string> }).fieldErrors
      ) {
        apiErr.fieldErrors = (responseData as { fieldErrors: Record<string, string> }).fieldErrors;
      }
      throw apiErr;
    }

    return responseData as T;
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'status' in err && 'code' in err && 'message' in err) {
      throw err;
    }
    const networkErr: ApiError = {
      status: 0,
      code: 'NETWORK_ERROR',
      message: err instanceof Error ? err.message : 'Network error or unreachable server',
    };
    throw networkErr;
  }
}

export interface BlobResponse {
  blob: Blob;
  fileName: string;
}

/** POST a JSON body and return the raw binary response (file downloads: PDF/XLSX exports). */
async function postBlob(endpoint: string, body: unknown): Promise<BlobResponse> {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/$/, '');
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (authToken) headers.set('Authorization', `Bearer ${authToken}`);

  const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });

  if (!response.ok) {
    let message = response.statusText || `Request failed with status ${response.status}`;
    try {
      const errBody = await response.clone().json();
      if (errBody?.message) message = errBody.message;
    } catch { /* ignore */ }
    const apiErr: ApiError = { status: response.status, code: `HTTP_${response.status}`, message };
    throw apiErr;
  }

  const disposition = response.headers.get('content-disposition') ?? '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const fileName = match?.[1] ?? 'download';

  return { blob: await response.blob(), fileName };
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'POST', body }),
  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'PUT', body }),
  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
  /** POST multipart/form-data — for file uploads (receipt scan, etc.) */
  postForm: <T>(endpoint: string, formData: FormData, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'POST', body: formData, multipart: true }),
  /** POST JSON, receive a binary file (PDF/XLSX exports). */
  postBlob,
};
