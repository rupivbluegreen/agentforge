'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '../../../lib/api';
import type { Agent, Meta } from '../../../lib/types';

const SAMPLE_GRAPH = `{
  "entry": "draft",
  "nodes": [
    { "id": "draft", "type": "llm", "provider": "mock", "model": "demo",
      "prompt": "Write a one-line note about: {{input}}", "outputKey": "draft", "next": "shout" },
    { "id": "shout", "type": "tool", "tool": "uppercase",
      "input": { "text": "{{draft}}" }, "outputKey": "shouted", "next": "final" },
    { "id": "final", "type": "llm", "provider": "mock", "model": "demo",
      "prompt": "Summarize for a log entry: {{shouted.text}}", "outputKey": "output" }
  ]
}`;

export default function NewAgentPage() {
  const router = useRouter();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [name, setName] = useState('Demo agent');
  const [purpose, setPurpose] = useState('Demonstrate the LLM → tool → LLM walking skeleton.');
  const [riskTier, setRiskTier] = useState('minimal');
  const [definition, setDefinition] = useState(SAMPLE_GRAPH);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Meta>('/meta')
      .then(setMeta)
      .catch(() => undefined);
  }, []);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const graph = JSON.parse(definition) as unknown;
      const agent = await api<Agent>('/agents', {
        method: 'POST',
        body: JSON.stringify({ name, intendedPurpose: purpose, riskTier, definition: graph }),
      });
      router.push(`/agents/${agent.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-5">
      <h1 className="text-xl font-semibold">New agent</h1>

      <label className="block">
        <span className="text-sm text-slate-300">Name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
        />
      </label>

      <label className="block">
        <span className="text-sm text-slate-300">Intended purpose (EU AI Act)</span>
        <input
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
        />
      </label>

      <label className="block">
        <span className="text-sm text-slate-300">AI risk tier</span>
        <select
          value={riskTier}
          onChange={(e) => setRiskTier(e.target.value)}
          className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
        >
          {(meta?.riskTiers ?? ['minimal']).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm text-slate-300">
          Definition (graph JSON){' '}
          {meta && (
            <span className="text-slate-500">
              — providers: {meta.providers.join(', ')} · tools: {meta.tools.join(', ')}
            </span>
          )}
        </span>
        <textarea
          value={definition}
          onChange={(e) => setDefinition(e.target.value)}
          rows={14}
          spellCheck={false}
          className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs"
        />
      </label>

      {error && <p className="whitespace-pre-wrap text-red-400">Error: {error}</p>}

      <button
        type="button"
        disabled={busy}
        onClick={submit}
        className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500 disabled:opacity-50"
      >
        {busy ? 'Creating…' : 'Create agent'}
      </button>
    </div>
  );
}
