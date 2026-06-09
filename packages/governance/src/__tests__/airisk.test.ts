import { describe, expect, it } from 'vitest';
import { classifyRisk } from '../airisk/classifier.js';

describe('classifyRisk', () => {
  it('returns prohibited when an Art 5 practice matches (even alongside high-risk)', () => {
    const r = classifyRisk({ social_scoring: true, employment: true });
    expect(r.tier).toBe('prohibited');
    expect(r.citations.some((c) => c.includes('Art 5'))).toBe(true);
    expect(r.matched).toContain('social_scoring');
  });

  it('returns high for an Annex III use case', () => {
    const r = classifyRisk({ employment: true, interacts_with_people: true });
    expect(r.tier).toBe('high');
    expect(r.citations.some((c) => c.includes('Annex III'))).toBe(true);
  });

  it('returns limited for Art 50 transparency triggers only', () => {
    expect(classifyRisk({ interacts_with_people: true }).tier).toBe('limited');
  });

  it('returns minimal when nothing matches', () => {
    const r = classifyRisk({});
    expect(r.tier).toBe('minimal');
    expect(r.citations).toEqual([]);
  });

  it('always carries a non-legal-advice disclaimer and ruleset version', () => {
    const r = classifyRisk({});
    expect(r.disclaimer).toMatch(/not legal advice/i);
    expect(r.rulesetVersion).toBeTruthy();
  });
});
