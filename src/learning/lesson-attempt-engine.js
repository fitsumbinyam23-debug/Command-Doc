"use strict";

import {
  ATTEMPT_STATE_SCHEMA_VERSION,
  ATTEMPT_STATUSES,
  DEFAULT_MODE_POLICIES,
  LEARNING_MODES,
  MASTERY_DIMENSIONS,
  STAGE_STATUSES,
  allowedDimensionsForSupport,
  asArray,
  attemptKey,
  deepClone,
  findCatalogCommand,
  publicLessonDefinition,
  targetByCommand,
  validateLessonDefinition
} from "./lesson-definition.js";
import { evaluateStage } from "./lesson-evaluators.js";
import { validateTrustedEvidenceEnvelope } from "./lesson-evidence.js";

const ASSESSED_OUTPUT_STAGES = new Set(["healthy_output", "fault_output", "evidence_interpretation"]);
const TRUSTED_STAGE_TYPES = new Set(["runtime_execution", "runtime_verification"]);

function nowFrom(clock) {
  return clock ? clock() : new Date().toISOString();
}

function requireControlled(value, allowed, label) {
  if (!allowed.includes(value)) {
    throw new Error(`${label} ${value || "<missing>"} is not controlled`);
  }
}

function stageMap(definition) {
  return new Map(asArray(definition?.stages).map((stage) => [stage.stage_id, stage]));
}

function stageById(definition, stageId) {
  const stage = stageMap(definition).get(stageId);
  if (!stage) throw new Error(`unknown stage ${stageId}`);
  return stage;
}

function getModePolicy(definition, mode) {
  return {
    ...DEFAULT_MODE_POLICIES[mode],
    ...(definition?.mode_policies?.[mode] || {})
  };
}

function isStageRequiredForTarget(target, stage) {
  return asArray(target?.required_stage_ids).includes(stage.stage_id);
}

function isStageVisibleInMode(stage, mode) {
  const availability = asArray(stage.mode_availability);
  return availability.length === 0 || availability.includes(mode);
}

function defaultDimensionResult(dimension, attempt, supported) {
  return {
    dimension,
    score: 0,
    status: supported ? "not_assessed" : "not_supported",
    source_mode: attempt.mode,
    evidence_ids: [],
    stage_ids: [],
    hint_penalty: 0,
    attempt_count: 0,
    support_eligibility: supported,
    not_supported_reason: supported ? null : "not_allowed_by_learning_record"
  };
}

function targetSupportRecord(target, catalogRecord) {
  return {
    ...(catalogRecord || {}),
    ...target,
    mastery_dimensions: asArray(target?.mastery_dimensions)
  };
}

function activeRequiredStageIds(target, definition, mode) {
  const stages = stageMap(definition);
  return asArray(target.required_stage_ids).filter((stageId) => {
    const stage = stages.get(stageId);
    return stage && isStageVisibleInMode(stage, mode) && stage.requirement_status !== "unsupported" && stage.support_status !== "unsupported";
  });
}

function hasPassed(attempt, stageId) {
  return attempt.stage_states?.[stageId]?.status === "passed";
}

function unresolvedCriticalFailures(attempt) {
  return asArray(attempt.critical_failures).filter((failure) => !failure.resolved);
}

function safeError(code, message = code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export class LessonAttemptEngine {
  constructor(options = {}) {
    this.catalog = options.catalog || { commands: [] };
    this.evidenceProvider = options.evidenceProvider || null;
    this.clock = options.clock || (() => new Date().toISOString());
    this.idGenerator = options.idGenerator || (() => `attempt-${Math.random().toString(36).slice(2)}`);
    this.evidenceIdGenerator = options.evidenceIdGenerator || (() => `evidence-${Math.random().toString(36).slice(2)}`);
    this.usedEvidenceIds = new Set(asArray(options.usedEvidenceIds));
  }

  validateDefinition(definition) {
    return validateLessonDefinition(definition, { catalog: this.catalog });
  }

  createAttempt(definition, options = {}) {
    const validation = this.validateDefinition(definition);
    if (!validation.valid) {
      throw safeError("invalid_definition", validation.errors.join("; "));
    }
    const mode = options.mode || "GUIDED";
    requireControlled(mode, LEARNING_MODES, "mode");
    if (!asArray(definition.supported_modes).includes(mode)) {
      throw safeError("unsupported_mode", `lesson ${definition.lesson_id} does not support ${mode}`);
    }
    const commandId = options.canonical_command_id || definition.command_targets?.[0]?.canonical_command_id;
    const target = targetByCommand(definition, commandId);
    if (!target) throw safeError("unknown_command_target", `lesson does not target ${commandId}`);
    const catalogRecord = findCatalogCommand(this.catalog, commandId);
    if (!catalogRecord) throw safeError("unknown_catalog_command", `catalog does not contain ${commandId}`);
    if (options.vendor_id && options.vendor_id !== target.vendor_id) {
      throw safeError("vendor_mismatch", `attempt vendor ${options.vendor_id} does not match ${target.vendor_id}`);
    }
    const attemptId = options.attempt_id || this.idGenerator();
    const createdAt = nowFrom(this.clock);
    const attempt = {
      schema_version: ATTEMPT_STATE_SCHEMA_VERSION,
      attempt_id: attemptId,
      attempt_key: attemptKey({
        lesson_id: definition.lesson_id,
        vendor_id: target.vendor_id,
        canonical_command_id: target.canonical_command_id,
        mode,
        attempt_id: attemptId
      }),
      lesson_id: definition.lesson_id,
      module_id: definition.module_id,
      vendor_id: target.vendor_id,
      canonical_command_id: target.canonical_command_id,
      mode,
      status: "active",
      created_at: createdAt,
      updated_at: createdAt,
      current_stage_id: null,
      stage_states: this.#initialStageStates(definition, target, mode, createdAt),
      submitted_evidence: [],
      hint_history: [],
      failure_history: [],
      dimension_results: this.#initialDimensionResults(target, catalogRecord, mode, attemptId),
      critical_failures: [],
      completion_result: {
        completed: false,
        eligible_for_mastery: false,
        blockers: ["attempt_not_finalized"],
        finalized_at: null
      },
      prediction_gate: {
        required: asArray(target.required_stage_ids).includes("prediction_before_output"),
        prediction_submitted_at: null,
        assessed_output_revealed_at: null,
        violation: false
      },
      administrative_unlocks: [],
      confidence: null,
      definition_version: definition.definition_version || definition.schema_version
    };
    attempt.current_stage_id = this.#firstAvailableStageId(attempt, target);
    return attempt;
  }

  restoreAttempt(serialized) {
    const attempt = typeof serialized === "string" ? JSON.parse(serialized) : deepClone(serialized);
    if (attempt?.schema_version !== ATTEMPT_STATE_SCHEMA_VERSION) {
      throw safeError("unsupported_attempt_schema", `unsupported attempt schema_version ${attempt?.schema_version || "<missing>"}`);
    }
    requireControlled(attempt.status, ATTEMPT_STATUSES, "attempt status");
    requireControlled(attempt.mode, LEARNING_MODES, "mode");
    for (const state of Object.values(attempt.stage_states || {})) {
      requireControlled(state.status, STAGE_STATUSES, `stage ${state.stage_id} status`);
    }
    for (const evidence of asArray(attempt.submitted_evidence)) {
      if (evidence.evidence_id) this.usedEvidenceIds.add(evidence.evidence_id);
    }
    return attempt;
  }

  serializeAttempt(attempt) {
    return JSON.stringify(attempt, null, 2);
  }

  getPublicLessonView(definition, mode) {
    return publicLessonDefinition(definition, mode);
  }

  getPublicAttemptView(attempt) {
    return {
      schema_version: attempt.schema_version,
      attempt_id: attempt.attempt_id,
      attempt_key: attempt.attempt_key,
      lesson_id: attempt.lesson_id,
      module_id: attempt.module_id,
      vendor_id: attempt.vendor_id,
      canonical_command_id: attempt.canonical_command_id,
      mode: attempt.mode,
      status: attempt.status,
      created_at: attempt.created_at,
      updated_at: attempt.updated_at,
      current_stage_id: attempt.current_stage_id,
      stage_states: Object.fromEntries(Object.entries(attempt.stage_states || {}).map(([stageId, state]) => [stageId, {
        stage_id: state.stage_id,
        stage_type: state.stage_type,
        status: state.status,
        requirement_status: state.requirement_status,
        reason: state.reason || null,
        dependencies: asArray(state.dependencies),
        attempt_count: state.attempt_count || 0,
        hint_count: state.hint_count || 0,
        revealed: Boolean(state.revealed_at),
        passed_at: state.passed_at || null,
        failed_at: state.failed_at || null
      }])),
      submitted_evidence: asArray(attempt.submitted_evidence).map((evidence) => ({
        evidence_id: evidence.evidence_id,
        provider_id: evidence.provider_id,
        evidence_type: evidence.evidence_type,
        stage_id: evidence.stage_id,
        timestamp: evidence.timestamp,
        integrity_result: evidence.integrity_result
      })),
      hint_history: asArray(attempt.hint_history).map((hint) => ({
        stage_id: hint.stage_id,
        mode: hint.mode,
        timestamp: hint.timestamp,
        sequence: hint.sequence
      })),
      failure_history: asArray(attempt.failure_history).map((failure) => ({
        stage_id: failure.stage_id,
        code: failure.code,
        timestamp: failure.timestamp
      })),
      dimension_results: deepClone(attempt.dimension_results),
      critical_failures: asArray(attempt.critical_failures).map((failure) => ({
        code: failure.code,
        stage_id: failure.stage_id,
        remediation_possible: failure.remediation_possible,
        resolved: Boolean(failure.resolved),
        timestamp: failure.timestamp
      })),
      completion_result: deepClone(attempt.completion_result),
      confidence: attempt.confidence ? { value: attempt.confidence.value, submitted_at: attempt.confidence.submitted_at } : null,
      definition_version: attempt.definition_version
    };
  }

  getReviewProjection(attempt, definition) {
    if (attempt.status !== "completed" || definition.review_eligibility === "none") {
      return { available: false, reason: "review_projection_unavailable" };
    }
    return {
      available: true,
      lesson: this.getPublicLessonView(definition, attempt.mode),
      completion_result: deepClone(attempt.completion_result),
      dimension_results: deepClone(attempt.dimension_results),
      critical_failures: deepClone(attempt.critical_failures)
    };
  }

  getCurrentStage(attempt, definition) {
    if (!attempt.current_stage_id) return null;
    return stageById(definition, attempt.current_stage_id);
  }

  markStageViewed(attempt, definition, stageId) {
    const stage = stageById(definition, stageId);
    const state = this.#stageState(attempt, stageId);
    if (state.status === "locked") throw safeError("stage_locked", `stage ${stageId} is locked`);
    if (state.status === "available") state.status = "in_progress";
    state.viewed_at = nowFrom(this.clock);
    attempt.updated_at = state.viewed_at;
    attempt.current_stage_id = stageId;
    return { stage_id: stage.stage_id, status: state.status };
  }

  revealStageContent(attempt, definition, stageId) {
    const stage = stageById(definition, stageId);
    const state = this.#stageState(attempt, stageId);
    if (state.status === "locked") throw safeError("stage_locked", `stage ${stageId} is locked`);
    if (stage.content_role === "assessed" && ASSESSED_OUTPUT_STAGES.has(stage.stage_type) && attempt.prediction_gate.required && !attempt.prediction_gate.prediction_submitted_at) {
      throw safeError("prediction_required_before_assessed_output", `stage ${stageId} requires a prediction first`);
    }
    const policy = getModePolicy(definition, attempt.mode);
    const finalOnly = attempt.mode === "INDEPENDENT" && attempt.status !== "completed";
    const solutionVisible = !finalOnly && (
      stage.answer_visibility_policy === "before_submission" ||
      (policy.solution_reveal === "progressive" && state.status !== "locked") ||
      (policy.solution_reveal === "after_submission_or_failure" && ["submitted", "passed", "failed"].includes(state.status)) ||
      (attempt.status === "completed")
    );
    const timestamp = nowFrom(this.clock);
    state.revealed_at = timestamp;
    if (stage.content_role === "assessed" && ASSESSED_OUTPUT_STAGES.has(stage.stage_type)) {
      attempt.prediction_gate.assessed_output_revealed_at = timestamp;
    }
    attempt.updated_at = timestamp;
    return {
      stage_id: stageId,
      prompt: stage.prompt || null,
      content: stage.public_content || null,
      answer_visible: Boolean(solutionVisible),
      answer: solutionVisible ? stage.public_answer || null : null
    };
  }

  submitStudentResponse(attempt, definition, stageId, response) {
    const stage = stageById(definition, stageId);
    this.#ensureStageCanSubmit(attempt, stage);
    if (stage.content_role === "assessed" && ASSESSED_OUTPUT_STAGES.has(stage.stage_type) && attempt.prediction_gate.required && !attempt.prediction_gate.prediction_submitted_at) {
      throw safeError("prediction_required_before_assessed_output", `stage ${stageId} requires a prediction first`);
    }
    const result = evaluateStage(stage, response, this.#evaluationContext(attempt, definition, stage));
    return this.#applyStageResult(attempt, definition, stage, result, {
      response_kind: "student_response",
      response
    });
  }

  requestHint(attempt, definition, stageId) {
    const stage = stageById(definition, stageId);
    const policy = getModePolicy(definition, attempt.mode);
    const state = this.#stageState(attempt, stageId);
    const timestamp = nowFrom(this.clock);
    if (!policy.hints_allowed) {
      const failure = { stage_id: stageId, code: "hint_not_allowed", timestamp };
      attempt.failure_history.push(failure);
      attempt.updated_at = timestamp;
      return { allowed: false, reason: "hint_not_allowed" };
    }
    const alreadyUsed = asArray(attempt.hint_history).filter((hint) => hint.stage_id === stageId).length;
    if (policy.hint_limit !== null && alreadyUsed >= policy.hint_limit) {
      const failure = { stage_id: stageId, code: "hint_limit_reached", timestamp };
      attempt.failure_history.push(failure);
      attempt.updated_at = timestamp;
      return { allowed: false, reason: "hint_limit_reached" };
    }
    const hints = asArray(stage.hints);
    const hint = hints[Math.min(alreadyUsed, Math.max(hints.length - 1, 0))] || { text: "Review the stated objective and evidence requirements." };
    const record = {
      stage_id: stageId,
      mode: attempt.mode,
      timestamp,
      sequence: alreadyUsed + 1,
      text: hint.text
    };
    attempt.hint_history.push(record);
    state.hint_count = (state.hint_count || 0) + 1;
    for (const dimension of asArray(stage.eligible_dimensions)) {
      if (attempt.dimension_results[dimension]) {
        attempt.dimension_results[dimension].hint_penalty = Number((attempt.dimension_results[dimension].hint_penalty + Number(stage.hint_penalty ?? 0.1)).toFixed(4));
      }
    }
    attempt.updated_at = timestamp;
    return { allowed: true, hint: deepClone(record) };
  }

  ingestTrustedExternalEvidence(attempt, definition, stageId, envelope) {
    const stage = stageById(definition, stageId);
    this.#ensureStageCanSubmit(attempt, stage);
    const context = {
      attempt_id: attempt.attempt_id,
      lesson_id: attempt.lesson_id,
      vendor_id: attempt.vendor_id,
      canonical_command_id: attempt.canonical_command_id,
      stage_id: stageId
    };
    const validation = validateTrustedEvidenceEnvelope(envelope, context, this.evidenceProvider);
    if (validation.accepted && this.usedEvidenceIds.has(envelope.evidence_id)) {
      validation.accepted = false;
      validation.errors.push("reused_evidence");
    }
    if (!validation.accepted) {
      const timestamp = nowFrom(this.clock);
      const failureCode = validation.errors.includes("reused_evidence") ? "cross_attempt_evidence_reuse" : "trusted_evidence_rejected";
      attempt.failure_history.push({ stage_id: stageId, code: failureCode, timestamp, errors: validation.errors });
      if (validation.errors.some((error) => error.startsWith("mismatched_")) || validation.errors.includes("reused_evidence")) {
        this.#recordCriticalFailure(attempt, stageId, validation.errors.includes("reused_evidence") ? "cross_attempt_evidence_reuse" : "mismatched_trusted_evidence", true);
      }
      attempt.updated_at = timestamp;
      return { accepted: false, errors: validation.errors };
    }
    this.usedEvidenceIds.add(envelope.evidence_id);
    const sanitizedEnvelope = validation.envelope;
    attempt.submitted_evidence.push({
      evidence_id: sanitizedEnvelope.evidence_id,
      provider_id: sanitizedEnvelope.provider_id,
      evidence_type: sanitizedEnvelope.evidence_type,
      stage_id: sanitizedEnvelope.stage_id,
      timestamp: sanitizedEnvelope.timestamp,
      source_event_id: sanitizedEnvelope.source_event_id,
      verification_policy_id: sanitizedEnvelope.verification_policy_id,
      verification_record_id: sanitizedEnvelope.verification_record_id,
      integrity_result: sanitizedEnvelope.integrity_result
    });
    const result = evaluateStage(stage, { trusted_evidence: sanitizedEnvelope }, this.#evaluationContext(attempt, definition, stage));
    const applied = this.#applyStageResult(attempt, definition, stage, result, {
      response_kind: "trusted_evidence",
      response: { evidence_id: sanitizedEnvelope.evidence_id }
    });
    return { accepted: true, result: applied };
  }

  recordSafetyDecision(attempt, definition, stageId, decision) {
    return this.submitStudentResponse(attempt, definition, stageId, { decision });
  }

  recordSaveOrRollbackDecision(attempt, definition, stageId, decision) {
    const stage = stageById(definition, stageId);
    this.#ensureStageCanSubmit(attempt, stage);
    const result = evaluateStage(stage, { decision }, this.#evaluationContext(attempt, definition, stage));
    return this.#applyStageResult(attempt, definition, stage, result, {
      response_kind: "save_or_rollback_decision",
      response: { decision }
    });
  }

  submitTicketNote(attempt, definition, stageId, note) {
    return this.submitStudentResponse(attempt, definition, stageId, { text: note });
  }

  submitConfidence(attempt, definition, stageId, confidence) {
    const before = deepClone(attempt.dimension_results);
    const result = this.submitStudentResponse(attempt, definition, stageId, { confidence });
    if (result.passed) {
      attempt.confidence = {
        value: confidence,
        submitted_at: attempt.stage_states[stageId].passed_at
      };
      for (const dimension of Object.keys(attempt.dimension_results)) {
        attempt.dimension_results[dimension].score = before[dimension]?.score ?? attempt.dimension_results[dimension].score;
      }
    }
    return result;
  }

  evaluateCompletion(attempt, definition) {
    const target = targetByCommand(definition, attempt.canonical_command_id);
    if (!target) throw safeError("unknown_command_target", `lesson does not target ${attempt.canonical_command_id}`);
    const blockers = [];
    for (const stageId of activeRequiredStageIds(target, definition, attempt.mode)) {
      if (!hasPassed(attempt, stageId)) blockers.push(`required_stage_not_passed:${stageId}`);
    }
    for (const failure of unresolvedCriticalFailures(attempt)) {
      blockers.push(`critical_failure:${failure.code}`);
    }
    if (attempt.prediction_gate.required && !attempt.prediction_gate.prediction_submitted_at) {
      blockers.push("prediction_missing");
    }
    if (attempt.prediction_gate.violation) {
      blockers.push("prediction_gate_violated");
    }
    if (asArray(target.required_stage_ids).includes("ticket_note") && !hasPassed(attempt, "ticket_note")) {
      blockers.push("ticket_note_missing");
    }
    if (asArray(target.required_stage_ids).includes("runtime_verification") && !hasPassed(attempt, "runtime_verification")) {
      blockers.push("verification_missing");
    }
    if (asArray(target.required_stage_ids).includes("save_or_rollback") && !hasPassed(attempt, "save_or_rollback")) {
      blockers.push("save_or_rollback_missing");
    }
    const candidates = this.produceMasteryCandidates(attempt, definition);
    const thresholds = target.completion_thresholds || definition.completion_policy?.completion_thresholds || {};
    const requiredDimensions = asArray(thresholds.required_dimensions);
    const minimumScore = Number(thresholds.minimum_score ?? definition.completion_policy?.minimum_score ?? 1);
    for (const dimension of requiredDimensions) {
      const candidate = candidates[dimension];
      if (!candidate?.support_eligibility) {
        blockers.push(`dimension_not_supported:${dimension}`);
      } else if (candidate.score < minimumScore) {
        blockers.push(`dimension_below_threshold:${dimension}`);
      }
    }
    return {
      completed: blockers.length === 0,
      eligible_for_mastery: blockers.length === 0,
      blockers,
      finalized_at: attempt.completion_result?.finalized_at || null,
      mastery_candidates: candidates
    };
  }

  finalizeAttempt(attempt, definition) {
    const completion = this.evaluateCompletion(attempt, definition);
    const timestamp = nowFrom(this.clock);
    completion.finalized_at = timestamp;
    attempt.completion_result = completion;
    attempt.status = completion.completed ? "completed" : "failed";
    attempt.updated_at = timestamp;
    return completion;
  }

  produceMasteryCandidates(attempt, definition) {
    const target = targetByCommand(definition, attempt.canonical_command_id);
    const catalogRecord = findCatalogCommand(this.catalog, attempt.canonical_command_id);
    const supportRecord = targetSupportRecord(target, catalogRecord);
    const allowed = new Set(allowedDimensionsForSupport(supportRecord));
    const candidates = {};
    for (const dimension of MASTERY_DIMENSIONS) {
      const result = attempt.dimension_results?.[dimension] || defaultDimensionResult(dimension, attempt, allowed.has(dimension));
      const supported = allowed.has(dimension);
      const adjustedScore = supported ? Math.max(0, Number((result.score - (result.hint_penalty || 0)).toFixed(4))) : 0;
      candidates[dimension] = {
        dimension,
        score: adjustedScore,
        status: supported ? (adjustedScore >= 1 ? "candidate" : "not_assessed") : "not_supported",
        source_mode: attempt.mode,
        evidence_ids: asArray(result.evidence_ids),
        stage_ids: asArray(result.stage_ids),
        hint_penalty: result.hint_penalty || 0,
        attempt_count: result.attempt_count || 0,
        support_eligibility: supported,
        not_supported_reason: supported ? null : result.not_supported_reason || `runtime_support:${supportRecord.runtime_support}`
      };
      if (attempt.mode !== "INDEPENDENT" && ["practical_execution", "verification", "safety"].includes(dimension)) {
        candidates[dimension].status = adjustedScore >= 1 ? "limited_candidate" : candidates[dimension].status;
      }
      if (dimension === "documentation" && !supported) {
        candidates[dimension].not_supported_reason = "documentation_is_completion_evidence_not_catalog_mastery_dimension";
      }
    }
    return candidates;
  }

  resolveCriticalFailure(attempt, code, stageId) {
    const timestamp = nowFrom(this.clock);
    let resolved = false;
    for (const failure of attempt.critical_failures) {
      if (failure.code === code && (!stageId || failure.stage_id === stageId) && failure.remediation_possible) {
        failure.resolved = true;
        failure.resolved_at = timestamp;
        resolved = true;
      }
    }
    if (resolved) attempt.updated_at = timestamp;
    return { resolved };
  }

  #initialStageStates(definition, target, mode, timestamp) {
    const states = {};
    for (const stage of asArray(definition.stages)) {
      const targetRequires = isStageRequiredForTarget(target, stage);
      let status = "available";
      let reason = stage.reason || null;
      if (!isStageVisibleInMode(stage, mode)) {
        status = "not_applicable";
        reason = "not_available_in_mode";
      } else if (stage.requirement_status === "unsupported" || stage.support_status === "unsupported") {
        status = "not_supported";
        reason = stage.reason || "unsupported_for_target";
      } else if (stage.requirement_status === "unavailable") {
        status = "not_applicable";
        reason = stage.reason || "unavailable_for_target";
      } else if (!targetRequires && stage.requirement_status === "conditional") {
        status = "not_applicable";
        reason = stage.reason || "condition_not_active";
      } else if (asArray(stage.dependencies).length) {
        status = "locked";
      }
      states[stage.stage_id] = {
        stage_id: stage.stage_id,
        stage_type: stage.stage_type,
        status,
        requirement_status: stage.requirement_status,
        dependencies: asArray(stage.dependencies),
        reason,
        eligible_dimensions: asArray(stage.eligible_dimensions),
        attempt_count: 0,
        hint_count: 0,
        created_at: timestamp
      };
    }
    return states;
  }

  #initialDimensionResults(target, catalogRecord, mode, attemptId) {
    const attemptRef = { mode, attempt_id: attemptId };
    const supportRecord = targetSupportRecord(target, catalogRecord);
    const allowed = new Set(allowedDimensionsForSupport(supportRecord));
    return Object.fromEntries(MASTERY_DIMENSIONS.map((dimension) => [dimension, defaultDimensionResult(dimension, attemptRef, allowed.has(dimension))]));
  }

  #firstAvailableStageId(attempt, target) {
    const targetStageIds = asArray(target.required_stage_ids);
    return targetStageIds.find((stageId) => attempt.stage_states[stageId]?.status === "available") ||
      Object.values(attempt.stage_states).find((state) => state.status === "available")?.stage_id ||
      null;
  }

  #stageState(attempt, stageId) {
    const state = attempt.stage_states?.[stageId];
    if (!state) throw safeError("unknown_stage_state", `attempt has no state for ${stageId}`);
    return state;
  }

  #ensureStageCanSubmit(attempt, stage) {
    const state = this.#stageState(attempt, stage.stage_id);
    if (state.status === "locked") throw safeError("stage_locked", `stage ${stage.stage_id} is locked`);
    if (state.status === "not_applicable") throw safeError("stage_not_applicable", `stage ${stage.stage_id} is not applicable`);
    if (state.status === "not_supported") throw safeError("stage_not_supported", `stage ${stage.stage_id} is not supported`);
    if (attempt.status !== "active") throw safeError("attempt_not_active", `attempt ${attempt.attempt_id} is not active`);
    return state;
  }

  #evaluationContext(attempt, definition, stage) {
    const target = targetByCommand(definition, attempt.canonical_command_id);
    return {
      attempt,
      target,
      verificationRequired: asArray(target?.required_stage_ids).includes("runtime_verification"),
      verificationSatisfied: hasPassed(attempt, "runtime_verification"),
      stage_id: stage.stage_id
    };
  }

  #applyStageResult(attempt, definition, stage, result, metadata = {}) {
    const timestamp = nowFrom(this.clock);
    const state = this.#stageState(attempt, stage.stage_id);
    state.status = result.passed ? "passed" : "failed";
    state.attempt_count = (state.attempt_count || 0) + 1;
    state.last_result = {
      passed: result.passed,
      score: result.score,
      feedback_code: result.feedback_code,
      evidence_ids: asArray(result.evidence_ids),
      critical_failure: result.critical_failure ? deepClone(result.critical_failure) : null,
      retry_allowed: result.retry_allowed
    };
    state.response_kind = metadata.response_kind || "student_response";
    state.submitted_at = timestamp;
    if (result.passed) state.passed_at = timestamp;
    if (!result.passed) state.failed_at = timestamp;
    if (metadata.response_kind === "student_response") {
      state.student_response_submitted = true;
    }
    if (stage.stage_type === "prediction_before_output" && result.passed) {
      attempt.prediction_gate.prediction_submitted_at = timestamp;
    }
    if (stage.content_role === "assessed" && ASSESSED_OUTPUT_STAGES.has(stage.stage_type) && !attempt.prediction_gate.prediction_submitted_at) {
      attempt.prediction_gate.violation = true;
      this.#recordCriticalFailure(attempt, stage.stage_id, "answer_leakage_violation", true);
    }
    if (result.critical_failure) {
      this.#recordCriticalFailure(attempt, stage.stage_id, result.critical_failure.code, result.critical_failure.remediation_possible);
    }
    if (!result.passed) {
      attempt.failure_history.push({
        stage_id: stage.stage_id,
        code: result.feedback_code,
        timestamp
      });
    }
    this.#applyDimensionResult(attempt, stage, result);
    this.#unlockAvailableStages(attempt, definition);
    const target = targetByCommand(definition, attempt.canonical_command_id);
    attempt.current_stage_id = this.#firstAvailableStageId(attempt, target);
    attempt.updated_at = timestamp;
    attempt.completion_result = this.evaluateCompletion(attempt, definition);
    return deepClone(result);
  }

  #applyDimensionResult(attempt, stage, result) {
    if (!result.passed) return;
    for (const dimension of asArray(result.dimensions)) {
      const current = attempt.dimension_results[dimension];
      if (!current) continue;
      current.score = Math.max(current.score, Number(result.score || 0));
      current.status = current.support_eligibility ? "candidate" : "not_supported";
      current.stage_ids = [...new Set([...asArray(current.stage_ids), stage.stage_id])];
      current.evidence_ids = [...new Set([...asArray(current.evidence_ids), ...asArray(result.evidence_ids)])];
      current.attempt_count = (current.attempt_count || 0) + 1;
    }
  }

  #unlockAvailableStages(attempt, definition) {
    const stages = stageMap(definition);
    let changed = true;
    while (changed) {
      changed = false;
      for (const state of Object.values(attempt.stage_states)) {
        if (state.status !== "locked") continue;
        const dependencies = asArray(stages.get(state.stage_id)?.dependencies);
        if (dependencies.every((stageId) => ["passed", "not_applicable", "not_supported"].includes(attempt.stage_states[stageId]?.status))) {
          state.status = "available";
          changed = true;
        }
      }
    }
  }

  #recordCriticalFailure(attempt, stageId, code, remediationPossible = true) {
    const timestamp = nowFrom(this.clock);
    attempt.critical_failures.push({
      code,
      stage_id: stageId,
      remediation_possible: Boolean(remediationPossible),
      resolved: false,
      timestamp
    });
  }
}

export default LessonAttemptEngine;
