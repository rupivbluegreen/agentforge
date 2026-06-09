export default function HomePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">agentforge</h1>
      <p className="max-w-2xl text-slate-300">
        A compliance-first platform for building, deploying, and governing AI agents. Define an
        agent as a graph, run it, and every run produces an OpenTelemetry trace and an entry in the
        tamper-evident audit log.
      </p>
      <div className="flex gap-3">
        <a
          href="/agents"
          className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500"
        >
          View agents
        </a>
        <a
          href="/agents/new"
          className="rounded border border-slate-700 px-4 py-2 text-slate-200 hover:bg-slate-800"
        >
          Create an agent
        </a>
      </div>
      <p className="text-sm text-slate-500">
        Not signed in? Use “Log in” (top right) — the demo user is <code>demo</code> /{' '}
        <code>demo</code> (tenant <code>acme</code>).
      </p>
    </div>
  );
}
