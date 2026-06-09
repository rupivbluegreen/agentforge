'use client';

import { useEffect, useState } from 'react';
import { api, ApiError, loginHref } from '../../lib/api';
import type { Agent } from '../../lib/types';

const tierColor: Record<string, string> = {
  prohibited: 'bg-red-900 text-red-200',
  high: 'bg-amber-900 text-amber-200',
  limited: 'bg-sky-900 text-sky-200',
  minimal: 'bg-slate-800 text-slate-300',
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Agent[]>('/agents')
      .then(setAgents)
      .catch((e: unknown) => setError(e instanceof ApiError ? `${e.status}` : String(e)));
  }, []);

  if (error === '401') {
    return (
      <p className="text-slate-300">
        Please{' '}
        <a href={loginHref} className="text-indigo-400 underline">
          log in
        </a>{' '}
        to view agents.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Agents</h1>
        <a
          href="/agents/new"
          className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-500"
        >
          New agent
        </a>
      </div>
      {error && error !== '401' && <p className="text-red-400">Error: {error}</p>}
      {!agents ? (
        <p className="text-slate-400">Loading…</p>
      ) : agents.length === 0 ? (
        <p className="text-slate-400">No agents yet. Create one to get started.</p>
      ) : (
        <ul className="divide-y divide-slate-800 rounded border border-slate-800">
          {agents.map((a) => (
            <li key={a.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <a href={`/agents/${a.id}`} className="font-medium text-indigo-300 hover:underline">
                  {a.name}
                </a>
                <p className="text-sm text-slate-400">{a.intendedPurpose || 'No stated purpose'}</p>
              </div>
              <span className={`rounded px-2 py-0.5 text-xs ${tierColor[a.riskTier] ?? ''}`}>
                {a.riskTier}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
