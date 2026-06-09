import { RISK_RULESET_V1, type RiskRuleset, type RiskTier } from './ruleset.js';

export type RiskAnswers = Record<string, boolean>;

export interface RiskClassification {
  tier: RiskTier;
  rationale: string;
  citations: string[];
  rulesetVersion: string;
  /** Question ids that drove the classification. */
  matched: string[];
  disclaimer: string;
}

const DISCLAIMER =
  'Automated scaffold based on a versioned questionnaire — not legal advice. Confirm with qualified counsel against the current EU AI Act text.';

/**
 * Classify an agent's EU AI Act risk tier from questionnaire answers. Precedence:
 * prohibited (Art 5) > high (Annex III) > limited (Art 50) > minimal. Prohibited
 * matches are reported even alongside high-risk ones so the deploy block is unambiguous.
 */
export function classifyRisk(
  answers: RiskAnswers,
  ruleset: RiskRuleset = RISK_RULESET_V1,
): RiskClassification {
  const matchedByTier: Record<string, { ids: string[]; citations: string[] }> = {
    prohibited: { ids: [], citations: [] },
    high: { ids: [], citations: [] },
    limited: { ids: [], citations: [] },
  };

  for (const q of ruleset.questions) {
    if (answers[q.id] === true) {
      matchedByTier[q.tier]!.ids.push(q.id);
      matchedByTier[q.tier]!.citations.push(q.citation);
    }
  }

  const pick = (
    tier: 'prohibited' | 'high' | 'limited',
    rationale: string,
  ): RiskClassification => ({
    tier,
    rationale,
    citations: [...new Set(matchedByTier[tier]!.citations)],
    rulesetVersion: ruleset.version,
    matched: matchedByTier[tier]!.ids,
    disclaimer: DISCLAIMER,
  });

  if (matchedByTier.prohibited!.ids.length > 0) {
    return pick('prohibited', 'Matches one or more prohibited practices (EU AI Act Art 5).');
  }
  if (matchedByTier.high!.ids.length > 0) {
    return pick('high', 'Matches one or more Annex III high-risk use cases.');
  }
  if (matchedByTier.limited!.ids.length > 0) {
    return pick('limited', 'Subject to Art 50 transparency obligations.');
  }
  return {
    tier: 'minimal',
    rationale: 'No high-risk, prohibited, or transparency triggers identified.',
    citations: [],
    rulesetVersion: ruleset.version,
    matched: [],
    disclaimer: DISCLAIMER,
  };
}
