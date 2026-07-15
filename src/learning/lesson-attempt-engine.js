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
  canRevealStageAnswer,
  deepClone,
  findCatalogCommand,
  modeStageException,
  publicLessonDefinition,
  requiredStageIdsForMode,
  stageAppliesToMode,
  targetByCommand,
  validateLessonDefinition
} from "./lesson-definition.js";
import { evaluateStage } from "./lesson-evaluators.js";
import { validateTrustedEvidenceEnvelope } from "./lesson-evidence.js";

const ASSESSED_OUTPUT_STAGES = new Set(["healthy_output", "fault_output", "evidence_interpretation"]);
const TRUSTED_STAGE_TYPES = new Set(["runtime_execution", "runtime_verification"]);
const TRUSTED_EVALUATOR_TYPES = new Set(["trusted_external_evidence", "trusted_verification_evidence"]);

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

function isTrustedEvidenceStage(stage) {
  return TRUSTED_STAGE_TYPES.has(stage?.stage_type) || TRUSTED_EVALUATOR_TYPES.has(stage?.evaluator?.type);
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
  return requiredStageIdsForMode(target, definition, mode);
}

function hasPassed(attempt, stageId) {
  return attempt.stage_states?.[stageId]?.status === "passed";
}

function unresolvedCriticalFailures(attempt) {
  return asArray(attempt.critical_failures).filter((failure) => !failure.resolved);
}

function trustedEvidenceRequirementsSatisfied(attempt, requiredStageIds, definition) {
  const stages = stageMap(definition);
  const evidence = asArray(attempt.submitted_evidence);
  return requiredStageIds.every((stageId) => {
    const stage = stages.get(stageId);
    if (!stage || !isTrustedEvidenceStage(stage)) return true;
    const resultIds = asArray(attempt.stage_states?.[stageId]?.last_result?.evidence_ids);
    if (!resultIds.length) return false;
    return resultIds.every((evidenceId) => evidence.some((record) => (
      record.evidence_id === evidenceId &&
      record.stage_id === stageId &&
      record.integrity_result === "passed"
    )));
  });
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
    const modeRequiredStageIds = activeRequiredStageIds(target, definition, mode);
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
        eligible_for_limited_credit: false,
        eligible_for_full_mastery: false,
        blockers: ["attempt_not_finalized"],
        finalized_at: null
      },
      prediction_gate: {
        required: modeRequiredStageIds.includes("prediction_before_output"),
        prediction_submitted_at: null,
        assessed_output_revealed_at: null,
        violation: false
      },
      administrative_unlocks: [],
      confidence: null,
      resolution_history: [],
      definition_version: definition.definition_version || definition.schema_version
    };
    attempt.current_stage_id = this.#firstAvailableStageId(attempt, target);
    return attempt;
  }

  restoreAttempt(serialized, definition = null) {
    const attempt = typeof serialized === "string" ? JSON.parse(serialized) : deepClone(serialized);
    if (attempt?.schema_version !== ATTEMPT_STATE_SCHEMA_VERSION) {
      throw safeError("unsupported_attempt_schema", `unsupported attempt schema_version ${attempt?.schema_version || "<missing>"}`);
    }
    requireControlled(attempt.status, ATTEMPT_STATUSES, "attempt status");
    requireControlled(attempt.mode, LEARNING_MODES, "mode");
    const recomputedKey = attemptKey({
      lesson_id: attempt.lesson_id,
      vendor_id: attempt.vendor_id,
      canonical_command_id: attempt.canonical_command_id,
      mode: attempt.mode,
      attempt_id: attempt.attempt_id
    });
    if (attempt.attempt_key !== recomputedKey) {
      throw safeError("attempt_key_mismatch", "attempt_key does not match attempt identity fields");
    }
    const stageStateEntries = Object.entries(attempt.stage_states || {});
    const stageIds = new Set();
    const definitionStages = definition ? stageMap(definition) : null;
    for (const [stageId, state] of stageStateEntries) {
      if (stageIds.has(stageId)) throw safeError("duplicate_stage_state", `duplicate stage state ${stageId}`);
      stageIds.add(stageId);
      if (state.stage_id !== stageId) throw safeError("stage_state_identity_mismatch", `stage state key ${stageId} does not match ${state.stage_id}`);
      if (definitionStages && !definitionStages.has(stageId)) throw safeError("unknown_stage_state", `attempt has unknown stage state ${stageId}`);
      requireControlled(state.status, STAGE_STATUSES, `stage ${state.stage_id} status`);
    }
    if (definitionStages) {
      for (const stageId of definitionStages.keys()) {
        if (!stageIds.has(stageId)) throw safeError("missing_stage_state", `attempt is missing stage state ${stageId}`);
      }
    }
    const dimensionIds = new Set();
    for (const [dimension, result] of Object.entries(attempt.dimension_results || {})) {
      if (!MASTERY_DIMENSIONS.includes(dimension)) throw safeError("unknown_dimension_result", `unknown dimension result ${dimension}`);
      if (dimensionIds.has(dimension)) throw safeError("duplicate_dimension_result", `duplicate dimension result ${dimension}`);
      dimensionIds.add(dimension);
      if (result?.dimension !== dimension) throw safeError("dimension_result_identity_mismatch", `dimension result key ${dimension} does not match ${result?.dimension}`);
      if (result?.source_mode && result.source_mode !== attempt.mode) throw safeError("dimension_result_mode_mismatch", `dimension result ${dimension} has mode ${result.source_mode}`);
    }
    if (definition) {
      if (definition.lesson_id !== attempt.lesson_id) throw safeError("lesson_identity_mismatch", "attempt lesson_id does not match definition");
      const target = targetByCommand(definition, attempt.canonical_command_id);
      if (!target) throw safeError("unknown_command_target", `lesson does not target ${attempt.canonical_command_id}`);
      if (target.vendor_id !== attempt.vendor_id) throw safeError("vendor_identity_mismatch", "attempt vendor does not match definition target");
      this.#validateRestoredStageAvailability(attempt, definition, target);
      this.#validateSubmittedEvidenceForRestore(attempt, definition);
      this.#validateStageProvenanceForRestore(attempt, definition);
      attempt.dimension_results = this.#reconstructDimensionResults(attempt, definition, target);
      attempt.prediction_gate = this.#reconstructPredictionGate(attempt, definition, target);
      const actualCompletion = this.evaluateCompletion(attempt, definition);
      actualCompletion.finalized_at = attempt.completion_result?.finalized_at || null;
      const serializedClaimedCompletion = Boolean(attempt.status === "completed" || attempt.completion_result?.completed || attempt.completion_result?.eligible_for_full_mastery || attempt.completion_result?.eligible_for_mastery);
      if (serializedClaimedCompletion && !actualCompletion.completed) {
        throw safeError("inconsistent_serialized_completion", "serialized completion_result does not match evaluated completion");
      }
      attempt.completion_result = actualCompletion;
    }
    for (const evidence of asArray(attempt.submitted_evidence)) {
      if (evidence.evidence_id) this.usedEvidenceIds.add(evidence.evidence_id);
    }
    return attempt;
  }

  serializeAttempt(attempt) {
    return JSON.stringify(attempt, null, 2);
  }

  getPublicLessonView(definition, mode, options = {}) {
    return publicLessonDefinition(definition, mode, options);
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
        resolved_at: failure.resolved_at || null,
        resolution_type: failure.resolution_type || null,
        resolution_stage_id: failure.resolution_stage_id || null,
        resolution_evidence_ids: asArray(failure.resolution_evidence_ids),
        timestamp: failure.timestamp
      })),
      resolution_history: deepClone(attempt.resolution_history || []),
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
      lesson: publicLessonDefinition(definition, attempt.mode, { attempt, review: true, canonical_command_id: attempt.canonical_command_id }),
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
    if (attempt.status !== "active") throw safeError("attempt_not_active", `attempt ${attempt.attempt_id} is not active`);
    if (state.status === "locked") throw safeError("stage_locked", `stage ${stageId} is locked`);
    if (state.status === "not_applicable") throw safeError("stage_not_applicable", `stage ${stageId} is not applicable`);
    if (state.status === "not_supported") throw safeError("stage_not_supported", `stage ${stageId} is not supported`);
    if (state.status === "blocked") throw safeError("stage_blocked", `stage ${stageId} is blocked`);
    if (state.status === "available") state.status = "in_progress";
    state.viewed_at = nowFrom(this.clock);
    attempt.updated_at = state.viewed_at;
    attempt.current_stage_id = stageId;
    return { stage_id: stage.stage_id, status: state.status };
  }

  revealStageContent(attempt, definition, stageId) {
    const stage = stageById(definition, stageId);
    const state = this.#stageState(attempt, stageId);
    if (attempt.status !== "active") throw safeError("attempt_not_active", `attempt ${attempt.attempt_id} is not active`);
    if (state.status === "locked") throw safeError("stage_locked", `stage ${stageId} is locked`);
    if (state.status === "not_applicable") throw safeError("stage_not_applicable", `stage ${stageId} is not applicable`);
    if (state.status === "not_supported") throw safeError("stage_not_supported", `stage ${stageId} is not supported`);
    if (state.status === "blocked") throw safeError("stage_blocked", `stage ${stageId} is blocked`);
    if (stage.content_role === "assessed" && ASSESSED_OUTPUT_STAGES.has(stage.stage_type) && attempt.prediction_gate.required && !attempt.prediction_gate.prediction_submitted_at) {
      throw safeError("prediction_required_before_assessed_output", `stage ${stageId} requires a prediction first`);
    }
    const policy = getModePolicy(definition, attempt.mode);
    const solutionVisible = canRevealStageAnswer(stage, attempt.mode, {
      modePolicy: policy,
      stageState: state,
      attemptStatus: attempt.status
    });
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
    if (isTrustedEvidenceStage(stage)) {
      throw safeError("trusted_evidence_ingest_required", `stage ${stageId} requires provider-validated trusted evidence ingest`);
    }
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
    if (attempt.status !== "active") {
      return { allowed: false, reason: "attempt_not_active" };
    }
    if (!["available", "in_progress"].includes(state.status)) {
      return { allowed: false, reason: `hint_stage_${state.status}` };
    }
    if (!policy.hints_allowed) {
      return { allowed: false, reason: "hint_not_allowed" };
    }
    const alreadyUsed = asArray(attempt.hint_history).filter((hint) => hint.stage_id === stageId).length;
    if (policy.hint_limit !== null && alreadyUsed >= policy.hint_limit) {
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
      attempt_id: sanitizedEnvelope.attempt_id,
      lesson_id: sanitizedEnvelope.lesson_id,
      vendor_id: sanitizedEnvelope.vendor_id,
      canonical_command_id: sanitizedEnvelope.canonical_command_id,
      stage_id: sanitizedEnvelope.stage_id,
      timestamp: sanitizedEnvelope.timestamp,
      source_event_id: sanitizedEnvelope.source_event_id,
      verification_policy_id: sanitizedEnvelope.verification_policy_id,
      verification_record_id: sanitizedEnvelope.verification_record_id,
      integrity_result: sanitizedEnvelope.integrity_result
    });
    const result = evaluateStage(stage, { trusted_evidence: sanitizedEnvelope }, this.#evaluationContext(attempt, definition, stage, { trustedEvidenceValidated: true }));
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
    const requiredStageIds = activeRequiredStageIds(target, definition, attempt.mode);
    for (const stageId of requiredStageIds) {
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
    if (requiredStageIds.includes("ticket_note") && !hasPassed(attempt, "ticket_note")) {
      blockers.push("ticket_note_missing");
    }
    if (requiredStageIds.includes("runtime_verification") && !hasPassed(attempt, "runtime_verification")) {
      blockers.push("verification_missing");
    }
    if (requiredStageIds.includes("save_or_rollback") && !hasPassed(attempt, "save_or_rollback")) {
      blockers.push("save_or_rollback_missing");
    }
    const candidates = this.produceMasteryCandidates(attempt, definition);
    const thresholds = target.completion_thresholds || definition.completion_policy?.completion_thresholds || {};
    const requiredDimensions = asArray(thresholds.required_dimensions);
    const minimumScore = Number(thresholds.minimum_score ?? definition.completion_policy?.minimum_score ?? 1);
    const unsupportedRequiredDimensions = [];
    for (const dimension of requiredDimensions) {
      const candidate = candidates[dimension];
      if (!candidate?.support_eligibility) {
        blockers.push(`dimension_not_supported:${dimension}`);
        unsupportedRequiredDimensions.push(dimension);
      } else if (candidate.score < minimumScore) {
        blockers.push(`dimension_below_threshold:${dimension}`);
      }
    }
    const completed = blockers.length === 0;
    const modePolicy = getModePolicy(definition, attempt.mode);
    const trustedRequirementsSatisfied = trustedEvidenceRequirementsSatisfied(attempt, requiredStageIds, definition);
    const eligibleForFullMastery = Boolean(
      completed &&
      modePolicy.can_produce_full_mastery &&
      unsupportedRequiredDimensions.length === 0 &&
      trustedRequirementsSatisfied &&
      unresolvedCriticalFailures(attempt).length === 0
    );
    return {
      completed,
      eligible_for_limited_credit: completed,
      eligible_for_full_mastery: eligibleForFullMastery,
      blockers,
      finalized_at: attempt.completion_result?.finalized_at || null,
      critical_failures: deepClone(attempt.critical_failures || []),
      resolution_history: deepClone(attempt.resolution_history || []),
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

  resolveCriticalFailure(attempt, definition, code, stageId, resolution = {}) {
    if (!definition || typeof definition === "string") {
      return { resolved: false, reason: "resolution_evidence_required" };
    }
    const failure = asArray(attempt.critical_failures).find((candidate) => (
      candidate.code === code &&
      candidate.stage_id === stageId &&
      !candidate.resolved
    ));
    if (!failure) return { resolved: false, reason: "failure_not_found" };
    if (!failure.remediation_possible) return { resolved: false, reason: "failure_not_remediable" };

    const resolutionType = resolution.type || "stage_retry";
    const resolutionStageId = resolution.stage_id || stageId;
    const resolutionStage = stageById(definition, resolutionStageId);
    const stageState = attempt.stage_states?.[resolutionStageId];
    const remediates = asArray(resolutionStage.remediates_critical_failures);
    const stageCanRemediate = resolutionStageId === stageId || remediates.includes(code);
    const evidenceIds = asArray(resolution.evidence_ids || (resolution.evidence_id ? [resolution.evidence_id] : []));

    if (!["stage_retry", "remediation_stage", "trusted_evidence"].includes(resolutionType)) {
      return { resolved: false, reason: "unknown_resolution_type" };
    }
    if (!stageCanRemediate) {
      return { resolved: false, reason: "stage_does_not_remediate_failure" };
    }
    if (["stage_retry", "remediation_stage"].includes(resolutionType) && stageState?.status !== "passed") {
      return { resolved: false, reason: "resolution_stage_not_passed" };
    }
    if (resolutionType === "stage_retry" && resolutionStageId !== stageId) {
      return { resolved: false, reason: "stage_retry_must_use_affected_stage" };
    }
    if (resolutionType === "trusted_evidence") {
      if (!evidenceIds.length) return { resolved: false, reason: "resolution_evidence_required" };
      const submitted = asArray(attempt.submitted_evidence);
      const allEvidenceMatches = evidenceIds.every((evidenceId) => submitted.some((evidence) => (
        evidence.evidence_id === evidenceId &&
        evidence.stage_id === resolutionStageId &&
        evidence.integrity_result === "passed"
      )));
      if (!allEvidenceMatches) return { resolved: false, reason: "resolution_evidence_not_matched_to_attempt" };
    }

    const timestamp = nowFrom(this.clock);
    failure.resolved = true;
    failure.resolved_at = timestamp;
    failure.resolution_type = resolutionType;
    failure.resolution_stage_id = resolutionStageId;
    failure.resolution_evidence_ids = evidenceIds;
    const record = {
      failure_code: code,
      affected_stage_id: stageId,
      resolved_at: timestamp,
      resolution_type: resolutionType,
      resolution_stage_id: resolutionStageId,
      resolution_evidence_ids: evidenceIds
    };
    attempt.resolution_history = [...asArray(attempt.resolution_history), record];
    attempt.updated_at = timestamp;
    attempt.completion_result = this.evaluateCompletion(attempt, definition);
    return { resolved: true, resolution: deepClone(record) };
  }

  #validateSubmittedEvidenceForRestore(attempt, definition) {
    const stages = stageMap(definition);
    const evidenceIds = new Set();
    for (const evidence of asArray(attempt.submitted_evidence)) {
      if (!evidence?.evidence_id) throw safeError("malformed_submitted_evidence", "submitted evidence requires evidence_id");
      for (const field of ["provider_id", "evidence_type", "timestamp", "source_event_id", "verification_policy_id", "verification_record_id"]) {
        if (typeof evidence[field] !== "string" || !evidence[field].trim()) throw safeError("malformed_submitted_evidence", `submitted evidence ${evidence.evidence_id} requires ${field}`);
      }
      if (!Number.isFinite(Date.parse(evidence.timestamp))) throw safeError("malformed_submitted_evidence", `submitted evidence ${evidence.evidence_id} has invalid timestamp`);
      if (evidenceIds.has(evidence.evidence_id)) throw safeError("duplicate_submitted_evidence", `duplicate submitted evidence ${evidence.evidence_id}`);
      evidenceIds.add(evidence.evidence_id);
      const stage = stages.get(evidence.stage_id);
      if (!stage) throw safeError("unknown_evidence_stage", `submitted evidence references unknown stage ${evidence.stage_id}`);
      if (!isTrustedEvidenceStage(stage)) throw safeError("evidence_for_non_trusted_stage", `submitted evidence references non-trusted stage ${evidence.stage_id}`);
      if (evidence.integrity_result !== "passed") throw safeError("untrusted_submitted_evidence", `submitted evidence ${evidence.evidence_id} is not integrity-passed`);
      if (evidence.attempt_id && evidence.attempt_id !== attempt.attempt_id) throw safeError("evidence_attempt_mismatch", `submitted evidence ${evidence.evidence_id} has mismatched attempt_id`);
      if (evidence.lesson_id && evidence.lesson_id !== attempt.lesson_id) throw safeError("evidence_lesson_mismatch", `submitted evidence ${evidence.evidence_id} has mismatched lesson_id`);
      if (evidence.vendor_id && evidence.vendor_id !== attempt.vendor_id) throw safeError("evidence_vendor_mismatch", `submitted evidence ${evidence.evidence_id} has mismatched vendor_id`);
      if (evidence.canonical_command_id && evidence.canonical_command_id !== attempt.canonical_command_id) throw safeError("evidence_command_mismatch", `submitted evidence ${evidence.evidence_id} has mismatched canonical_command_id`);
    }
  }

  #validateRestoredStageAvailability(attempt, definition, target) {
    const expectedStates = this.#initialStageStates(definition, target, attempt.mode, attempt.created_at);
    for (const [stageId, expected] of Object.entries(expectedStates)) {
      const state = attempt.stage_states?.[stageId];
      if (!state) throw safeError("missing_stage_state", `attempt is missing stage state ${stageId}`);
      if (["not_applicable", "not_supported", "blocked"].includes(expected.status) && state.status !== expected.status) {
        throw safeError("stage_availability_mismatch", `stage ${stageId} cannot restore from ${expected.status} to ${state.status}`);
      }
      if (expected.reason && ["not_applicable", "not_supported", "blocked"].includes(expected.status) && state.reason !== expected.reason) {
        throw safeError("stage_availability_reason_mismatch", `stage ${stageId} reason does not match definition`);
      }
    }
  }

  #validateStageProvenanceForRestore(attempt, definition) {
    const stages = stageMap(definition);
    const submittedEvidence = asArray(attempt.submitted_evidence);
    const createdAt = Date.parse(attempt.created_at);
    const updatedAt = Date.parse(attempt.updated_at);
    if (!Number.isFinite(createdAt) || !Number.isFinite(updatedAt)) throw safeError("invalid_attempt_timestamps", "attempt timestamps are invalid");

    for (const [stageId, state] of Object.entries(attempt.stage_states || {})) {
      const stage = stages.get(stageId);
      if (!stage) throw safeError("unknown_stage_state", `attempt has unknown stage state ${stageId}`);
      if (["passed", "failed"].includes(state.status)) {
        if (!state.last_result || typeof state.last_result !== "object") throw safeError("missing_stage_result", `stage ${stageId} is ${state.status} without last_result`);
        if (typeof state.last_result.passed !== "boolean") throw safeError("malformed_stage_result", `stage ${stageId} has malformed result passed flag`);
        if (typeof state.last_result.score !== "number") throw safeError("malformed_stage_result", `stage ${stageId} has malformed result score`);
        if (typeof state.last_result.feedback_code !== "string") throw safeError("malformed_stage_result", `stage ${stageId} has malformed feedback_code`);
        if (state.status === "passed" && !state.last_result.passed) throw safeError("stage_result_status_mismatch", `stage ${stageId} passed status does not match last_result`);
        if (state.status === "failed" && state.last_result.passed) throw safeError("stage_result_status_mismatch", `stage ${stageId} failed status does not match last_result`);
      }
      for (const field of ["submitted_at", "passed_at", "failed_at", "viewed_at", "revealed_at"]) {
        if (!state[field]) continue;
        const timestamp = Date.parse(state[field]);
        if (!Number.isFinite(timestamp) || timestamp < createdAt || timestamp > updatedAt) throw safeError("invalid_stage_timestamp", `stage ${stageId} has invalid ${field}`);
      }
      if (state.status !== "passed") continue;

      if (isTrustedEvidenceStage(stage)) {
        if (state.response_kind !== "trusted_evidence") throw safeError("trusted_stage_missing_trusted_response", `trusted stage ${stageId} was not passed by trusted evidence`);
        const evidenceIds = asArray(state.last_result?.evidence_ids);
        if (!evidenceIds.length) throw safeError("trusted_stage_missing_evidence", `trusted stage ${stageId} passed without evidence ids`);
        for (const evidenceId of evidenceIds) {
          const evidence = submittedEvidence.find((record) => record.evidence_id === evidenceId);
          if (!evidence) throw safeError("trusted_stage_missing_evidence", `trusted stage ${stageId} references missing evidence ${evidenceId}`);
          if (evidence.stage_id !== stageId) throw safeError("trusted_stage_evidence_mismatch", `trusted stage ${stageId} references evidence for ${evidence.stage_id}`);
          if (evidence.integrity_result !== "passed") throw safeError("trusted_stage_evidence_untrusted", `trusted stage ${stageId} references untrusted evidence ${evidenceId}`);
        }
      } else if (state.response_kind === "save_or_rollback_decision") {
        if (stage.evaluator?.type !== "save_or_rollback_decision") throw safeError("stage_response_kind_mismatch", `stage ${stageId} cannot use save_or_rollback response kind`);
      } else if (state.response_kind === "student_response") {
        if (!state.student_response_submitted) throw safeError("student_stage_missing_submission", `stage ${stageId} passed without student submission provenance`);
      } else {
        throw safeError("stage_response_kind_mismatch", `stage ${stageId} has unsupported response_kind ${state.response_kind || "<missing>"}`);
      }
    }
  }

  #reconstructDimensionResults(attempt, definition, target) {
    const catalogRecord = findCatalogCommand(this.catalog, attempt.canonical_command_id);
    const reconstructed = this.#initialDimensionResults(target, catalogRecord, attempt.mode, attempt.attempt_id);
    const stages = stageMap(definition);
    for (const [stageId, state] of Object.entries(attempt.stage_states || {})) {
      if (state.status !== "passed" || !state.last_result?.passed) continue;
      const stage = stages.get(stageId);
      if (!stage) continue;
      for (const dimension of asArray(stage.eligible_dimensions)) {
        const current = reconstructed[dimension];
        if (!current) continue;
        current.score = Math.max(current.score, Number(state.last_result.score || 0));
        current.status = current.support_eligibility ? "candidate" : "not_supported";
        current.stage_ids = [...new Set([...asArray(current.stage_ids), stageId])];
        current.evidence_ids = [...new Set([...asArray(current.evidence_ids), ...asArray(state.last_result.evidence_ids)])];
        current.attempt_count = (current.attempt_count || 0) + 1;
      }
    }
    for (const hint of asArray(attempt.hint_history)) {
      const stage = stages.get(hint.stage_id);
      if (!stage) continue;
      for (const dimension of asArray(stage.eligible_dimensions)) {
        if (reconstructed[dimension]) {
          reconstructed[dimension].hint_penalty = Number((reconstructed[dimension].hint_penalty + Number(stage.hint_penalty ?? 0.1)).toFixed(4));
        }
      }
    }
    return reconstructed;
  }

  #reconstructPredictionGate(attempt, definition, target) {
    const requiredStageIds = activeRequiredStageIds(target, definition, attempt.mode);
    const predictionState = attempt.stage_states?.prediction_before_output;
    const assessedRevealTimes = Object.entries(attempt.stage_states || {})
      .filter(([stageId, state]) => {
        const stage = stageMap(definition).get(stageId);
        return state.revealed_at && stage?.content_role === "assessed" && ASSESSED_OUTPUT_STAGES.has(stage.stage_type);
      })
      .map(([, state]) => state.revealed_at)
      .sort();
    return {
      required: requiredStageIds.includes("prediction_before_output"),
      prediction_submitted_at: predictionState?.status === "passed" ? predictionState.passed_at || predictionState.submitted_at || null : null,
      assessed_output_revealed_at: assessedRevealTimes[0] || null,
      violation: Boolean(requiredStageIds.includes("prediction_before_output") && assessedRevealTimes[0] && !(predictionState?.status === "passed"))
    };
  }

  #initialStageStates(definition, target, mode, timestamp) {
    const states = {};
    for (const stage of asArray(definition.stages)) {
      const targetRequires = isStageRequiredForTarget(target, stage);
      const modeException = modeStageException(target, stage.stage_id, mode);
      let status = "available";
      let reason = stage.reason || null;
      if (targetRequires && modeException?.status === "not_required") {
        status = "not_applicable";
        reason = modeException.reason;
      } else if (!stageAppliesToMode(stage, mode)) {
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
    if (state.status === "blocked") throw safeError("stage_blocked", `stage ${stage.stage_id} is blocked`);
    if (attempt.status !== "active") throw safeError("attempt_not_active", `attempt ${attempt.attempt_id} is not active`);
    return state;
  }

  #evaluationContext(attempt, definition, stage, overrides = {}) {
    const target = targetByCommand(definition, attempt.canonical_command_id);
    const requiredStageIds = activeRequiredStageIds(target, definition, attempt.mode);
    return {
      attempt,
      target,
      verificationRequired: requiredStageIds.includes("runtime_verification"),
      verificationSatisfied: hasPassed(attempt, "runtime_verification"),
      stage_id: stage.stage_id,
      ...overrides
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
    if (stage.content_role === "assessed" && ASSESSED_OUTPUT_STAGES.has(stage.stage_type) && attempt.prediction_gate.required && !attempt.prediction_gate.prediction_submitted_at) {
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
