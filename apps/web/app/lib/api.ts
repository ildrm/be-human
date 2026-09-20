export type ApiError = { message?: string; error?: string; statusCode?: number };

function csrfToken(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  return document.cookie.split('; ').find((part) => part.startsWith('bh_csrf='))?.split('=').slice(1).join('=');
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  if (init.method && !['GET', 'HEAD'].includes(init.method.toUpperCase())) {
    const token = csrfToken();
    if (token) headers.set('x-csrf-token', decodeURIComponent(token));
  }
  const response = await fetch(`/api/backend/${path.replace(/^\//, '')}`, { ...init, headers, credentials: 'include', cache: 'no-store' });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as ApiError;
    throw new Error(body.message ?? body.error ?? `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
