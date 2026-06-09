'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, ApiError } from '../../../lib/api';
import type { Agent, RunOutcome } from '../../../lib/types';

export default function AgentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [agent, setAgent] = useState<Agent | null>(null);
  const [input, setInput] = useState('quarterly compliance review');
  const [result, setResult] = useState<RunOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Agent>(`/agents/${id}`)
      .then(setAgent)
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : String(e)));
  }, [id]);

  async function run() {
    setError(null);
    setBusy(true);
    setResult(null);
    try {
      setResult(
        await api<RunOutcome>(`/agents/${id}/run`, {
          method: 'POST',
          body: JSON.stringify({ input }),
        }),
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (error && !agent) return <p className="text-red-400">Error: {error}</p>;
  if (!agent) return <p className="text-slate-400">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <a href="/agents" className="text-sm text-slate-400 hover:text-white">
          ← Agents
        </a>
        <h1 className="mt-1 text-xl font-semibold">{agent.name}</h1>
        <p className="text-sm text-slate-400">{agent.intendedPurpose || 'No stated purpose'}</p>
        <p className="mt-1 text-xs text-slate-500">
          Risk tier: <span className="text-slate-300">{agent.riskTier}</span> · version{' '}
          {agent.currentVersion}
        </p>
      </div>

      <div className="space-y-2 rounded border border-slate-800 p-4">
        <h2 className="font-medium">Run</h2>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={3}
          className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
        />
        <button
          type="button"
          disabled={busy}
          onClick={run}
          className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {busy ? 'Running…' : 'Run agent'}
        </button>
      </div>

      {error && agent && <p className="text-red-400">Error: {error}</p>}

      {result && (
        <div className="space-y-3 rounded border border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <span
              className={`rounded px-2 py-0.5 text-xs ${
                result.status === 'succeeded'
                  ? 'bg-emerald-900 text-emerald-200'
                  : 'bg-red-900 text-red-200'
              }`}
            >
              {result.status}
            </span>
            <span className="text-xs text-slate-500">
              run {result.runId.slice(0, 8)} · trace {result.traceId?.slice(0, 12) ?? '—'}
              {result.usage && ` · ${result.usage.inputTokens}/${result.usage.outputTokens} tok`}
            </span>
          </div>
          {result.error && <p className="text-red-400">{result.error}</p>}
          {result.output !== undefined && (
            <div>
              <div className="text-sm text-slate-400">Output</div>
              <pre className="mt-1 overflow-x-auto rounded bg-slate-900 p-3 text-sm text-slate-200">
                {typeof result.output === 'string'
                  ? result.output
                  : JSON.stringify(result.output, null, 2)}
              </pre>
            </div>
          )}
          {result.steps && (
            <div>
              <div className="text-sm text-slate-400">Steps</div>
              <ol className="mt-1 list-decimal space-y-1 pl-6 text-sm text-slate-300">
                {result.steps.map((s, i) => (
                  <li key={i}>
                    <span className="text-slate-400">{s.type}</span> · {s.nodeId}
                  </li>
                ))}
              </ol>
            </div>
          )}
          <p className="text-xs text-slate-500">
            This run was recorded in the{' '}
            <a href="/audit" className="underline">
              audit log
            </a>
            .
          </p>
        </div>
      )}
    </div>
  );
}
