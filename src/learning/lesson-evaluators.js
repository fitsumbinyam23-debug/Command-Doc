"use strict";

import { asArray, normalizeCommandText } from "./lesson-definition.js";

const ok = (overrides = {}) => ({
  passed: true,
  score: 1,
  feedback_code: "passed",
  dimensions: [],
  penalties: [],
  evidence_ids: [],
  critical_failure: null,
  retry_allowed: false,
  ...overrides
});

const fail = (overrides = {}) => ({
  passed: false,
  score: 0,
  feedback_code: "failed",
  dimensions: [],
  penalties: [],
  evidence_ids: [],
  critical_failure: null,
  retry_allowed: true,
  ...overrides
});

const stringValue = (response) => typeof response === "string" ? response : response?.value ?? response?.text ?? response?.command ?? "";

export function evaluateStage(stage, response, context = {}) {
  const evaluator = stage.evaluator || {};
  const criteria = stage.pass_criteria || {};
  const dimensions = asArray(stage.eligible_dimensions);
  const markPassed = (extra = {}) => ok({ dimensions, ...extra });
  const markFailed = (feedback_code, extra = {}) => fail({ feedback_code, dimensions, ...extra });

  switch (evaluator.type) {
    case "exact_text": {
      const expected = String(criteria.expected_text ?? evaluator.expected_text ?? "");
      return String(stringValue(response)) === expected ? markPassed() : markFailed("exact_text_mismatch");
    }
    case "normalized_command": {
      const submitted = normalizeCommandText(stringValue(response));
      const accepted = asArray(criteria.accepted_commands || evaluator.accepted_commands).map(normalizeCommandText);
      const wrongVendor = asArray(criteria.wrong_vendor_commands).map(normalizeCommandText);
      const unsafe = asArray(criteria.unsafe_commands).map(normalizeCommandText);
      if (unsafe.includes(submitted)) {
        return markFailed("unsafe_command", {
          critical_failure: { code: "unsafe_command_choice", remediation_possible: true },
          retry_allowed: false
        });
      }
      if (wrongVendor.includes(submitted)) {
        return markFailed("wrong_vendor_syntax", {
          critical_failure: { code: "wrong_vendor_syntax", remediation_possible: true },
          retry_allowed: false
        });
      }
      return accepted.includes(submitted) ? markPassed() : markFailed("command_mismatch");
    }
    case "one_of": {
      const submitted = String(stringValue(response));
      const accepted = asArray(criteria.accepted_values || evaluator.accepted_values).map(String);
      return accepted.includes(submitted) ? markPassed() : markFailed("value_not_allowed");
    }
    case "ordered_selection": {
      const submitted = asArray(response?.values || response);
      const expected = asArray(criteria.expected_order || evaluator.expected_order);
      return JSON.stringify(submitted) === JSON.stringify(expected) ? markPassed() : markFailed("ordered_selection_mismatch");
    }
    case "evidence_line_selection": {
      const submitted = asArray(response?.evidence_line_ids || response?.values || response);
      const required = asArray(criteria.required_evidence_line_ids || evaluator.required_evidence_line_ids);
      const complete = required.every((id) => submitted.includes(id));
      return complete ? markPassed({ evidence_ids: submitted }) : markFailed("missing_required_evidence_line", { evidence_ids: submitted });
    }
    case "structured_fields": {
      const fields = response?.fields || response || {};
      const required = criteria.required_fields || evaluator.required_fields || {};
      const passed = Object.entries(required).every(([field, expected]) => fields[field] === expected);
      return passed ? markPassed() : markFailed("structured_fields_mismatch");
    }
    case "non_empty_text": {
      return String(stringValue(response)).trim().length >= Number(criteria.min_length || 1) ? markPassed() : markFailed("empty_text");
    }
    case "confidence_selection": {
      const value = Number(response?.confidence ?? response?.value ?? response);
      return Number.isInteger(value) && value >= 1 && value <= 5 ? markPassed({ score: 0, feedback_code: "confidence_recorded" }) : markFailed("invalid_confidence");
    }
    case "trusted_external_evidence":
    case "trusted_verification_evidence": {
      const envelope = response?.trusted_evidence || response;
      if (context.trustedEvidenceValidated === true && envelope?.integrity_result === "passed" && envelope?.evidence_id) {
        return markPassed({ evidence_ids: [envelope.evidence_id], score: 1 });
      }
      return markFailed("trusted_evidence_required", { retry_allowed: false });
    }
    case "save_or_rollback_decision": {
      const decision = response?.decision || response?.value || response;
      if (!["save", "rollback"].includes(decision)) return markFailed("invalid_save_or_rollback_decision");
      if (decision === "save" && context.verificationRequired && !context.verificationSatisfied) {
        return markFailed("save_before_verification", {
          critical_failure: { code: "save_before_required_verification", remediation_possible: true },
          retry_allowed: false
        });
      }
      return markPassed({ feedback_code: `${decision}_decision_recorded` });
    }
    case "safety_decision": {
      const decision = response?.decision || response?.value || response;
      if (decision === criteria.expected_decision || decision === "safe_to_continue" || decision === "rollback") return markPassed();
      return markFailed("unsafe_decision", {
        critical_failure: { code: "unsafe_command_choice", remediation_possible: true },
        retry_allowed: false
      });
    }
    case "composite": {
      const parts = asArray(evaluator.parts || criteria.parts);
      const results = parts.map((part) => evaluateStage({ ...stage, evaluator: part, pass_criteria: part.pass_criteria || {} }, response?.[part.key] ?? response, context));
      return results.every((result) => result.passed)
        ? markPassed({ score: results.reduce((sum, result) => sum + result.score, 0) / Math.max(results.length, 1) })
        : markFailed("composite_failed", { penalties: results.flatMap((result) => result.penalties), critical_failure: results.find((result) => result.critical_failure)?.critical_failure || null });
    }
    default:
      return markFailed("unsupported_evaluator", { retry_allowed: false });
  }
}
