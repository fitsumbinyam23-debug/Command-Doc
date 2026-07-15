# Lesson Attempt Engine

Stage 2 adds a reusable learning attempt engine for Command Doctor. It is not wired into the visible app, the switch runtime, mastery persistence, or review scheduling.

## Module Responsibilities

- `src/learning/lesson-definition.js` defines controlled vocabularies, lesson-definition validation, command-target lookup, support-level dimension rules, and safe lesson projections.
- `src/learning/lesson-evaluators.js` evaluates controlled stage responses without executable lesson code.
- `src/learning/lesson-evidence.js` defines trusted external-evidence envelopes and provider validation.
- `src/learning/lesson-attempt-engine.js` creates, restores, progresses, scores, finalizes, serializes, and redacts isolated lesson attempts.
- `src/learning/catalog-compatibility-audit.js` maps every command in `data/generated/learning-command-catalog.json` to an engine compatibility row without changing migration readiness or review coverage.

## Definition Contract

Lesson definitions use schema version `lesson-definition.v1`.

Required identity fields:

```js
lesson_id
vendor_id
operating_system_family_id
command_targets[].canonical_command_id
```

Attempt identity is always:

```text
lesson_id:vendor_id:canonical_command_id:mode:attempt_id
```

Lesson title and display syntax are never identity. Grouped lessons may share stages, but each target keeps separate objectives, required stages, completion thresholds, blocking reasons, and mastery dimensions.

Definitions contain only declarative evaluator data. They must not store JavaScript functions, `eval`, or dynamic `Function` bodies.

## Attempt Contract

Attempt states use schema version `lesson-attempt-state.v1` and serialize as JSON. The engine rejects unknown future attempt schemas instead of silently migrating them.

An attempt records:

- identity and mode
- controlled attempt status
- controlled stage states
- submitted trusted-evidence summaries
- hint and failure history
- critical failures
- dimension result candidates
- completion result
- definition version

## Engine API

The `LessonAttemptEngine` class exposes operations for:

- `validateDefinition(definition)`
- `createAttempt(definition, options)`
- `restoreAttempt(serialized, definition)`
- `serializeAttempt(attempt)`
- `getPublicLessonView(definition, mode, options)`
- `getPublicAttemptView(attempt)`
- `getCurrentStage(attempt, definition)`
- `markStageViewed(attempt, definition, stageId)`
- `submitStudentResponse(attempt, definition, stageId, response)`
- `requestHint(attempt, definition, stageId)`
- `ingestTrustedExternalEvidence(attempt, definition, stageId, envelope)`
- `recordSafetyDecision(...)`
- `recordSaveOrRollbackDecision(...)`
- `submitTicketNote(...)`
- `submitConfidence(...)`
- `evaluateCompletion(attempt, definition)`
- `finalizeAttempt(attempt, definition)`
- `produceMasteryCandidates(attempt, definition)`

Small example:

```js
const engine = new LessonAttemptEngine({
  catalog,
  clock,
  idGenerator,
  evidenceProvider
});

const validation = engine.validateDefinition(definition);
if (!validation.valid) throw new Error(validation.errors.join("; "));

const attempt = engine.createAttempt(definition, {
  mode: "INDEPENDENT",
  canonical_command_id: "cisco_interface_config"
});

engine.submitTicketNote(attempt, definition, "technician_ticket", "Student ticket note");
engine.submitStudentResponse(attempt, definition, "prediction_before_output", "evidence present");
engine.submitStudentResponse(attempt, definition, "choose_next_command", "interface Gi1/0/1");
engine.ingestTrustedExternalEvidence(attempt, definition, "runtime_execution", envelope);
engine.ingestTrustedExternalEvidence(attempt, definition, "runtime_verification", verificationEnvelope);
engine.recordSaveOrRollbackDecision(attempt, definition, "save_or_rollback", "rollback");

const result = engine.finalizeAttempt(attempt, definition);
```

## Stage State Machine

Stages use controlled statuses:

```text
locked
available
in_progress
submitted
passed
failed
not_applicable
not_supported
blocked
```

Dependencies unlock only after their prerequisite stages pass or are honestly classified as not applicable or not supported. Required unsupported stages invalidate a lesson definition. Optional unsupported stages remain represented as `not_supported` with a reason.

Stage dependencies must be a directed acyclic graph. The validator rejects self-cycles, two-stage cycles, and longer cycles before an attempt can be created.

If a target-required stage is unavailable in a supported mode, the target must declare a machine-readable `mode_stage_exceptions[stage_id][mode]` record with a controlled status and reason. Hidden required stages cannot disappear from completion by filtering.

## Learning Modes

`GUIDED` allows worked examples, progressive hints, and immediate reasoning feedback. It still requires assessed stages and records hint penalties only against relevant dimensions.

`ASSISTED` limits hints and delays solution reveal until submission or declared failure conditions.

`INDEPENDENT` exposes no hints and no solution reveal before finalization. It is the default mode for full mastery claims where support exists.

Each mode has a separate attempt identity. Guided answers, hints, evidence, and scores do not populate Assisted or Independent attempts.

An empty `mode_availability` array means the stage applies to all supported learning modes. The same mode-availability helper is used by validation, stage initialization, required-stage calculation, public projection, answer visibility, and navigation.

## Prediction Gate

Assessed output stages remain locked until the declared prediction stage is submitted when the active mode requires that stage. Mode-specific `not_required` exceptions remove the prediction stage from stage initialization, prediction-gate state, completion blockers, current-stage navigation, and public projection. Guided demonstration content must be represented separately from assessed output. A prediction-gate violation is recorded as a critical failure and blocks completion.

## Answer Redaction

Public projections omit:

- answer keys before permitted reveal
- accepted command lists
- evaluator criteria
- trusted-provider internals
- hidden evidence payloads
- another mode's state
- complete Independent-mode solutions before finalization

Answer visibility uses the controlled values `never`, `demonstration_only`, `after_submission`, `after_submission_or_failure`, and `after_finalization`. `before_submission` is not valid for assessed content. A single visibility helper is shared by public lesson projection, direct stage reveal, and review projection, so lesson data cannot weaken the active mode policy.

Guided demonstration content is visible only when the stage is marked `content_role: "demonstration"` and the mode policy permits worked examples. Demonstration content is not assessed evidence. Independent attempts never reveal assessed answers before successful completion, and failed Independent attempts do not automatically unlock every answer.

The full attempt object may be serialized for trusted storage, but UI adapters should use public projections.

## Evidence Provider Contract

Trusted evidence uses schema version `trusted-lesson-evidence.v1`.

Required identity fields include:

```text
evidence_id
provider_id
attempt_id
lesson_id
vendor_id
canonical_command_id
stage_id
integrity_result
```

The engine rejects a plain `verified: true` flag, mismatched attempt/vendor/command/stage identity, unverified envelopes, missing provider verification, and reused evidence IDs.

Trusted execution and verification stages are ingest-only. `submitStudentResponse()` rejects `runtime_execution`, `runtime_verification`, and trusted-evidence evaluator stages with `trusted_evidence_ingest_required`, even when the payload looks like a complete trusted envelope. Only `ingestTrustedExternalEvidence()` can create trusted stage credit.

Stage 2 includes only the contract and fixture provider. The production runtime adapter belongs to Stage 4.

## Scoring Contract

The engine emits mastery candidates, not persisted mastery records.

Candidate dimensions:

```text
concept
syntax
prediction
output_interpretation
command_selection
practical_execution
troubleshooting
verification
safety
documentation
```

Support-level rules come from the normalized learning command record. Explanation-only and output-simulation commands cannot receive practical configuration mastery merely because a lesson says so. Confidence never increases a score. Administrative unlocks never create mastery evidence.

Output-simulation commands may award concept, syntax, prediction, output interpretation, command selection, and declared troubleshooting only. They do not award runtime verification, configuration safety, practical execution, Save, or rollback mastery.

Completion results separate:

```text
completed
eligible_for_limited_credit
eligible_for_full_mastery
```

Guided and Assisted attempts may complete and emit limited candidates, but they do not produce full mastery eligibility. Independent attempts are full-mastery eligible only when completion succeeds, the mode policy allows full mastery, all required mastery dimensions are supported, trusted evidence requirements are satisfied, and no unresolved critical failure remains.

## Critical Failures

Critical failures have stable codes, stage identity, remediation flags, and final-result visibility. Examples include wrong-vendor syntax, unsafe command choice, mismatched trusted evidence, reused evidence, Save before required verification, and answer leakage.

Unresolved critical failures block completion.

Critical failures cannot be cleared by code string alone. Resolution requires a passed affected-stage retry, a passed designated remediation stage, or matching provider-validated trusted evidence already submitted for the same attempt, vendor, command, and stage. Resolution history is included in final results.

## Restore Consistency

`restoreAttempt(serialized, definition)` recomputes `attempt_key`, validates identity fields, rejects unknown or mismatched stage-state IDs when a definition is supplied, rejects malformed dimension-result identities, and refuses serialized completion claims that do not match `evaluateCompletion()`.

When a definition is supplied, restore also rebuilds the expected stage availability from the definition, target, mode, and attempt identity. Passed student stages must carry permitted student-response provenance, a valid result shape, and submission timestamps. Passed trusted runtime stages must reference matching submitted evidence records with provider, identity, timestamp, and integrity metadata. Dimension results and prediction-gate state are reconstructed from validated stage provenance instead of trusted from serialized scores.

## Catalog Compatibility

`reports/learning-integrity-stage-2.json` and `.md` are generated from the current authoritative learning command catalog. Every command receives one row. The audit does not mark production lesson content complete, upgrade migration status, or change review coverage.

## Deliberate Stage 2 Limits

Stage 2 does not:

- integrate with `lab.html` or current Learn screens
- connect to `SharedSwitchState`, `CommandRegistry`, terminal execution, or runtime verification
- create production pilot lessons
- persist mastery
- schedule review
- change Practice Library behavior
- change runtime command data or route data

Stage 3 should add visible pilot lessons using this engine.

Stage 4 should add the trusted runtime evidence adapter.

Stage 4 must also preserve the universal terminal/runtime adapter requirement: every canonical command and approved alias should eventually produce one accurate vendor/profile-aware terminal result. Known commands must not fall through to generic unknown-command output merely because a detailed handler is missing.

Stage 5 should persist mastery and review records.
