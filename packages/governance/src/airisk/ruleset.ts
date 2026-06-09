/**
 * EU AI Act risk-classification ruleset. Modeled as a CONFIGURABLE, VERSIONED template
 * with citations to the source-of-truth — not hardcoded magic. The legal text and its
 * implementing acts evolve; verify each item against the current text, and treat the
 * output as a scaffold for qualified review, never as legal advice.
 */
export type RiskTier = 'prohibited' | 'high' | 'limited' | 'minimal';

export interface RiskQuestion {
  id: string;
  text: string;
  /** Tier this question, when answered "yes", contributes. */
  tier: Exclude<RiskTier, 'minimal'>;
  citation: string;
}

export interface RiskRuleset {
  version: string;
  source: string;
  questions: RiskQuestion[];
}

export const RISK_RULESET_V1: RiskRuleset = {
  version: '2024-1689-v1',
  source: 'Regulation (EU) 2024/1689 (EU AI Act). Verify against the current consolidated text.',
  questions: [
    // Art 5 — prohibited practices (any "yes" => prohibited).
    {
      id: 'manipulation',
      text: 'Does it use subliminal, manipulative, or deceptive techniques to materially distort behaviour in a way likely to cause harm?',
      tier: 'prohibited',
      citation: 'EU AI Act Art 5(1)(a)',
    },
    {
      id: 'exploits_vulnerabilities',
      text: 'Does it exploit vulnerabilities of a specific group (age, disability, social/economic situation) to distort behaviour?',
      tier: 'prohibited',
      citation: 'EU AI Act Art 5(1)(b)',
    },
    {
      id: 'social_scoring',
      text: 'Does it evaluate or classify people based on social behaviour or personal characteristics leading to detrimental or unjustified treatment?',
      tier: 'prohibited',
      citation: 'EU AI Act Art 5(1)(c)',
    },
    {
      id: 'biometric_sensitive_inference',
      text: 'Does it categorize individuals using biometric data to infer sensitive attributes (e.g., race, political opinions, religion, sexual orientation)?',
      tier: 'prohibited',
      citation: 'EU AI Act Art 5(1)(g)',
    },
    {
      id: 'realtime_biometric_public_le',
      text: 'Does it perform real-time remote biometric identification in publicly accessible spaces for law-enforcement purposes (outside narrow exceptions)?',
      tier: 'prohibited',
      citation: 'EU AI Act Art 5(1)(h)',
    },
    // Annex III — high-risk (any "yes", absent a prohibited match => high).
    {
      id: 'biometrics',
      text: 'Does it perform (non-prohibited) biometric identification or categorization, or emotion recognition?',
      tier: 'high',
      citation: 'EU AI Act Art 6(2) + Annex III(1)',
    },
    {
      id: 'critical_infrastructure',
      text: 'Is it a safety component in the management/operation of critical infrastructure (e.g., utilities, traffic)?',
      tier: 'high',
      citation: 'EU AI Act Annex III(2)',
    },
    {
      id: 'education',
      text: 'Does it determine access to education or evaluate learning outcomes / proctor exams?',
      tier: 'high',
      citation: 'EU AI Act Annex III(3)',
    },
    {
      id: 'employment',
      text: 'Is it used for recruitment, hiring, task allocation, or evaluating/promoting workers?',
      tier: 'high',
      citation: 'EU AI Act Annex III(4)',
    },
    {
      id: 'essential_services',
      text: 'Does it determine eligibility for essential public/private services, creditworthiness, or insurance pricing?',
      tier: 'high',
      citation: 'EU AI Act Annex III(5)',
    },
    {
      id: 'law_enforcement',
      text: 'Is it used by or for law enforcement to assess risks, evaluate evidence, or profile individuals?',
      tier: 'high',
      citation: 'EU AI Act Annex III(6)',
    },
    // Art 50 — limited-risk transparency obligations.
    {
      id: 'interacts_with_people',
      text: 'Does it interact directly with natural persons (e.g., a chatbot or assistant)?',
      tier: 'limited',
      citation: 'EU AI Act Art 50(1)',
    },
    {
      id: 'generates_synthetic_content',
      text: 'Does it generate synthetic audio, image, video, or text content?',
      tier: 'limited',
      citation: 'EU AI Act Art 50(2)',
    },
  ],
};
