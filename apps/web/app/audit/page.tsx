'use client';

import { useEffect, useState } from 'react';
import { api, ApiError, loginHref } from '../../lib/api';
import type { AuditRow, ChainVerification } from '../../lib/types';

export default function AuditPage() {
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [verification, setVerification] = useState<ChainVerification | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api<AuditRow[]>('/audit')
      .then(setRows)
      .catch((e: unknown) => setError(e instanceof ApiError ? `${e.status}` : String(e)));
  }
  useEffect(load, []);

  if (error === '401') {
    return (
      <p className="text-slate-300">
        Please{' '}
        <a href={loginHref} className="text-indigo-400 underline">
          log in
        </a>{' '}
        to view the audit log.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Audit log</h1>
        <button
          type="button"
          onClick={() => api<ChainVerification>('/audit/verify').then(setVerification)}
          className="rounded border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800"
        >
          Verify chain
        </button>
      </div>

      {verification && (
        <p
          className={`rounded px-3 py-2 text-sm ${
            verification.valid ? 'bg-emerald-900 text-emerald-200' : 'bg-red-900 text-red-200'
          }`}
        >
          {verification.valid
            ? `✓ Chain intact (${verification.entries} entries)`
            : `✗ Chain broken at seq ${verification.brokenAtSeq} (${verification.reason})`}
        </p>
      )}

      {!rows ? (
        <p className="text-slate-400">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-slate-400">No audit entries yet.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="text-slate-400">
            <tr className="border-b border-slate-800">
              <th className="py-2 pr-4">#</th>
              <th className="py-2 pr-4">Action</th>
              <th className="py-2 pr-4">Resource</th>
              <th className="py-2 pr-4">Actor</th>
              <th className="py-2 pr-4">Hash</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.seq)} className="border-b border-slate-900">
                <td className="py-2 pr-4 text-slate-500">{String(r.seq)}</td>
                <td className="py-2 pr-4">{r.action}</td>
                <td className="py-2 pr-4 text-slate-400">
                  {r.resourceType}
                  {r.resourceId ? ` ${r.resourceId.slice(0, 8)}` : ''}
                </td>
                <td className="py-2 pr-4 text-slate-400">{r.actor}</td>
                <td className="py-2 pr-4 font-mono text-xs text-slate-500">
                  {r.hash.slice(0, 12)}…
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
