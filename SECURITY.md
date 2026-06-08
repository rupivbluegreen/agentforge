# Security Policy

agentforge is security- and compliance-critical software. We take vulnerabilities
seriously and follow a coordinated disclosure process.

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues,
discussions, or pull requests.**

Instead, report privately via one of:

- GitHub's **private vulnerability reporting** ("Report a vulnerability" under the
  repository's *Security* tab), or
- email **security@agentforge.example** (replace with the project's real address
  before public release) with the details below.

Include, where possible:

- A description of the vulnerability and its impact.
- Affected component(s), version(s) / commit, and configuration.
- Step-by-step reproduction or a proof-of-concept.
- Any known mitigations or workarounds.

You may encrypt your report; request our PGP key in an initial low-detail message.

## Our commitments (coordinated disclosure)

| Stage                     | Target                                             |
| ------------------------- | -------------------------------------------------- |
| Acknowledge receipt       | within **3 business days**                         |
| Initial assessment        | within **10 business days**                        |
| Status updates            | at least every **10 business days** until resolved |
| Fix & coordinated release | severity-dependent; we agree a disclosure date with you |

We will credit reporters who wish to be named, after a fix is released. We ask that
you give us a reasonable window to remediate before any public disclosure, and that
you avoid privacy violations, data destruction, and service degradation while
researching.

## Scope

In scope: code in this repository and the default `docker compose` / Helm
deployment configurations. Out of scope: third-party dependencies (report upstream;
we track them via SBOM + vulnerability scanning in CI), and findings that require a
misconfiguration explicitly warned against in our docs.

## Supply-chain & disclosure tooling

- Every build publishes an **SBOM** (Syft) and is scanned for vulnerabilities
  (Trivy/Grype).
- Dependencies are kept current via Renovate.
- Confirmed vulnerabilities are tracked to remediation and surfaced in the
  platform's incident/vulnerability-handling workflow (build plan Phase 4).
