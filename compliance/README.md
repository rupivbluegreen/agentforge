# compliance/

Compliance-as-code lives here. The platform builds each **control once** and maps it
to **many** regulatory clauses (build plan §7), so this directory is the source of
truth the compliance dashboard and evidence generator read from.

| Directory     | Contents                                                                                  |
| ------------- | ----------------------------------------------------------------------------------------- |
| `controls/`   | Control definitions as code: `id`, owner, enforcement mechanism, evidence output.         |
| `mappings/`   | Crosswalk: control → GDPR / DORA / NIS2 / EU AI Act clauses (and zero-trust principle).   |
| `templates/`  | Evidence templates: RoPA, DPIA scaffold, FRIA scaffold, AI Act Annex IV tech-doc, incident report, ICT register. |

> **Versioned, not hardcoded.** Regulatory thresholds and effective dates (DORA / NIS2 /
> EU AI Act incident deadlines, AI Act phase-in) are modeled as configurable, versioned
> templates with a citation to the source-of-truth — never as hardcoded magic numbers.
> Verify exact figures against the current legal text at implementation time.
