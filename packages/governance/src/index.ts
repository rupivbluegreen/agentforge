export {
  AuditLog,
  type AuditEvent,
  type AuditEntry,
  type ChainVerification,
} from './audit/audit-log.js';
export { GENESIS_HASH, canonicalize, computeEntryHash, type HashableEntry } from './audit/hash.js';
export { verifyAllChains } from './cli/verify-audit.js';
export { classifyRisk, type RiskAnswers, type RiskClassification } from './airisk/classifier.js';
export {
  RISK_RULESET_V1,
  type RiskRuleset,
  type RiskQuestion,
  type RiskTier,
} from './airisk/ruleset.js';
