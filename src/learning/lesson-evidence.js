"use strict";

import { deepClone } from "./lesson-definition.js";

export const TRUSTED_EVIDENCE_SCHEMA_VERSION = "trusted-lesson-evidence.v1";

export function createTrustedEvidenceEnvelope(input, deps = {}) {
  const now = deps.clock ? deps.clock() : new Date().toISOString();
  const evidenceId = input.evidence_id || (deps.evidenceIdGenerator ? deps.evidenceIdGenerator() : `evidence-${now}`);
  return {
    schema_version: TRUSTED_EVIDENCE_SCHEMA_VERSION,
    evidence_id: evidenceId,
    provider_id: input.provider_id,
    evidence_type: input.evidence_type,
    attempt_id: input.attempt_id,
    lesson_id: input.lesson_id,
    vendor_id: input.vendor_id,
    canonical_command_id: input.canonical_command_id,
    stage_id: input.stage_id,
    timestamp: input.timestamp || now,
    payload: deepClone(input.payload || {}),
    source_event_id: input.source_event_id || null,
    verification_policy_id: input.verification_policy_id || null,
    verification_record_id: input.verification_record_id || null,
    integrity_result: input.integrity_result || "unverified"
  };
}

export function validateTrustedEvidenceEnvelope(envelope, context, provider) {
  const errors = [];
  if (!envelope || typeof envelope !== "object") return { accepted: false, errors: ["missing_evidence_envelope"] };
  if ("verified" in envelope) errors.push("plain_verified_flag_rejected");
  if (envelope.schema_version !== TRUSTED_EVIDENCE_SCHEMA_VERSION) errors.push("unsupported_evidence_schema");
  for (const field of ["evidence_id", "provider_id", "evidence_type", "attempt_id", "lesson_id", "vendor_id", "canonical_command_id", "stage_id", "timestamp", "integrity_result"]) {
    if (!envelope[field]) errors.push(`missing_${field}`);
  }
  for (const field of ["attempt_id", "lesson_id", "vendor_id", "canonical_command_id", "stage_id"]) {
    if (context?.[field] && envelope[field] !== context[field]) errors.push(`mismatched_${field}`);
  }
  if (envelope.integrity_result !== "passed") errors.push("unverified_external_evidence");
  if (!provider || typeof provider.verify !== "function") errors.push("missing_evidence_provider");
  const providerResult = provider?.verify ? provider.verify(envelope, context) : { accepted: false, errors: ["missing_evidence_provider"] };
  if (!providerResult?.accepted) errors.push(...(providerResult?.errors || ["provider_rejected_evidence"]));
  return { accepted: errors.length === 0, errors, envelope: deepClone(envelope) };
}

