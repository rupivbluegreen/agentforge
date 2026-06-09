export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Fetch the control-plane API (proxied via /api). Throws ApiError on non-2xx. */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ApiError(body || res.statusText, res.status);
  }
  const contentType = res.headers.get('content-type') ?? '';
  return (contentType.includes('application/json') ? await res.json() : await res.text()) as T;
}

export const loginHref = '/api/auth/login';
