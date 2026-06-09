'use client';

import { useEffect, useState } from 'react';
import { api, loginHref } from '../lib/api';
import type { Me } from '../lib/types';

export function Nav() {
  const [me, setMe] = useState<Me | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api<Me>('/auth/me')
      .then(setMe)
      .catch(() => setMe(null))
      .finally(() => setLoaded(true));
  }, []);

  return (
    <header className="border-b border-slate-800 bg-slate-900">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-5">
          <a href="/" className="font-semibold text-slate-100">
            agentforge
          </a>
          <a href="/agents" className="text-sm text-slate-300 hover:text-white">
            Agents
          </a>
          <a href="/audit" className="text-sm text-slate-300 hover:text-white">
            Audit log
          </a>
        </div>
        <div className="text-sm">
          {!loaded ? null : me ? (
            <span className="text-slate-300">
              {me.email ?? me.sub} ·{' '}
              <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-200">
                {me.tenantSlug}
              </span>{' '}
              <button
                type="button"
                onClick={async () => {
                  await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
                  window.location.href = '/';
                }}
                className="ml-2 text-slate-400 hover:text-white"
              >
                (logout)
              </button>
            </span>
          ) : (
            <a
              href={loginHref}
              className="rounded bg-indigo-600 px-3 py-1.5 text-white hover:bg-indigo-500"
            >
              Log in
            </a>
          )}
        </div>
      </nav>
    </header>
  );
}
