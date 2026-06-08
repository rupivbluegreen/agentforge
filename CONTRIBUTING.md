# Contributing to agentforge

Thanks for your interest in contributing. agentforge is a compliance-first agent
platform; contributions are held to a high bar on security, testing, and
documentation because the controls here have to actually enforce — not pretend to.

## License & Developer Certificate of Origin (DCO)

This project is licensed under **Apache-2.0**. We **do not** use a CLA. Instead, we
require a **DCO sign-off** on every commit. The DCO is a lightweight statement that
you have the right to submit your contribution under the project's license. Read the
full text at <https://developercertificate.org/>.

Sign off by adding a `Signed-off-by` trailer to each commit. Git does this for you:

```bash
git commit -s -m "feat(db): add tenant-scoped base schema"
```

This appends, using your `user.name` / `user.email`:

```
Signed-off-by: Your Name <you@example.com>
```

Commits without a valid sign-off will be rejected by CI. To retro-fix the last
commit: `git commit --amend -s --no-edit`.

## Commit conventions

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>
```

Common types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`, `build`,
`perf`, `security`. Scope is usually the package or app (`db`, `api`, `policy`, …).

## Branches & PRs

- Branch per slice: `phase-N/<topic>` (e.g. `phase-0/tenant-scoping`).
- Open a PR per slice; squash-merge to `main`.
- `main` must always be deployable: it builds, tests pass, and `docker compose up`
  yields a healthy stack.

## Definition of Done for compliance/security features

A compliance or security feature is **not done** until it (see the build plan §9):

1. **Enforces** the control (blocks/redacts/routes/labels — not advisory).
2. **Logs** to the immutable audit trail.
3. **Emits evidence** consumable by the evidence generator.
4. **Has a mapping entry** in `/compliance/mappings`.
5. **Is tested**, including the **negative path** (the forbidden thing is actually
   forbidden, and the denial is logged).
6. **Is documented** with its scope and limits — never overclaim compliance.

## Tests

- Unit + integration via **Vitest**; e2e via **Playwright**.
- New code ships with tests. Compliance features ship with negative-path tests.
- Run locally: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`.

## Security issues

Do **not** open public issues for vulnerabilities. Follow the coordinated
disclosure process in [`SECURITY.md`](./SECURITY.md).
