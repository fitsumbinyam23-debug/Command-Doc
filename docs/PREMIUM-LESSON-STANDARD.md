# Premium Lesson Standard

A complete premium lesson declares which stages are required, conditional, or unavailable, and explains why. Stage availability must match current simulator support and must not imply runtime capabilities that do not exist.

## Lesson Stages
| # | Stage | Required status | Why |
| ---: | --- | --- | --- |
| 1 | Technician ticket or mission | Required | Gives every lesson a job-shaped reason to exist. |
| 2 | Learning objective | Required | Defines exactly what skill is being assessed. |
| 3 | Prerequisites | Required | Prevents hidden prerequisite failure. |
| 4 | Command purpose | Required | Explains what the command is for. |
| 5 | Required CLI mode | Required | Separates user, privileged, global config, and interface contexts. |
| 6 | Syntax breakdown | Required | Teaches structure instead of memorizing strings. |
| 7 | Aliases and abbreviations | Conditional | Required when the catalog has aliases. |
| 8 | Worked example | Required for Guided | Shows the expert path before practice. |
| 9 | Prediction before output | Required | Checks mental model before revealing output. |
| 10 | Healthy output | Required for read/verify commands | Defines expected evidence. |
| 11 | Fault output | Conditional | Required for troubleshooting or comparison lessons. |
| 12 | Evidence identification | Required | Student marks the exact field or line that matters. |
| 13 | Evidence interpretation | Required | Student explains what the evidence means. |
| 14 | Choose the next command | Required | Assesses command selection, not just recall. |
| 15 | Command execution through the real runtime | Required when simulator support exists | Uses the runtime path instead of text-only matching. |
| 16 | Guided practice | Required for first premium lesson in a module | Provides hints and reasoning feedback. |
| 17 | Assisted practice | Required | Fades hints and delays solution reveal. |
| 18 | Independent troubleshooting | Required for mastery | Requires solving from ticket and symptoms. |
| 19 | Verification through runtime policy | Required when verification exists | Awards verification only from accepted evidence. |
| 20 | Save or rollback | Required for config/safety lessons | Forces safe change control. |
| 21 | Ticket note | Required for completion | Connects command work to technician documentation. |
| 22 | Knowledge check | Required | Assesses concept and interpretation separately from execution. |
| 23 | Confidence rating | Required | Feeds review scheduling without replacing performance. |
| 24 | Multidimensional mastery | Required | Stores independent skill dimensions. |
| 25 | Review scheduling | Required | Creates a real due review record. |
| 26 | Related commands | Conditional | Required when catalog relationships exist. |
| 27 | Equivalent vendor concepts | Conditional | Required when a cross-vendor equivalent exists and must not mix command syntax. |

## Lesson Modes
### GUIDED
- Full explanation, worked examples, evidence highlighting, suggested commands, progressive hints, and immediate reasoning feedback.
- Command execution may be demonstrated before student assessment.
- Hints reduce relevant mastery dimensions but never block learning access.

### ASSISTED
- Mission and objective are visible, hints are limited, the student chooses commands, evidence help is delayed, and the full solution is hidden until completion or failure threshold.
- Feedback explains reasoning after the student commits an answer or command.

### INDEPENDENT
- Ticket and symptoms only, raw terminal or selected workspace, hidden fault, no suggestions, no answer reveal before submission, required verification, required ticket note, and final result after completion.
- Independent mode is the default source for full mastery claims.

## Isolated Attempt-State Rules
- Attempt state is keyed by lesson_id + vendor_id + canonical_command_id + mode + attempt_id.
- Switching mode creates or resumes only that mode-specific attempt; it must not expose command history, answers, hints, evidence selections, verification results, or ticket notes from another mode.
- A student may review completed Guided work only from an explicit review action, never by switching into Assisted or Independent mode.
- Scoring records the mode that produced each dimension score.

## Mastery Model
- Mastery key: vendor_id + canonical_command_id.
- Aliases and abbreviations update the same canonical command record.
- Independent dimensions: concept, syntax, prediction, output interpretation, command selection, practical execution, troubleshooting, verification, safety, documentation.
- Completion threshold: required lesson stages complete, no unresolved critical failure, and minimum score for declared required dimensions.
- Mastery threshold: repeated satisfactory performance across required dimensions, including Independent mode where supported.
- Critical failures: unsafe command choice, wrong vendor syntax, unverified configuration claim, skipped Save/rollback decision where required, or false ticket note.
- Status transitions: not_started -> introduced -> understood -> practised -> verified -> mastered -> needs_review.
- Needs-review rules: due review date reached, weak dimension below threshold, low confidence, repeated hints, failed independent attempt, or stale mastery interval.
- Confidence handling: confidence affects review interval and weak-skill prioritization, but cannot raise a score by itself.
- Hint handling: hints reduce command selection, troubleshooting, and independent execution credit according to timing and specificity.
- Unsupported simulation: unavailable runtime dimensions are marked not_supported and cannot be counted as mastered; the lesson can still award concept, syntax, prediction, and interpretation credit when declared.

## Spaced Review Record
A real review record contains command ID, vendor, profile where relevant, mastery status, weak skill, confidence, last attempt, next review date, interval, attempt history, question history, and last result.

Review types:
- recall syntax
- select command
- interpret output
- identify evidence
- correct an error
- choose verification
- complete a short ticket
- perform a short runtime task

Home must count actual due review records. A route flag, completed lesson, or lookup history is not a review record.

## Schema Expectations
- lesson_id, vendor_id, canonical_command_id, module_id, level, prerequisites, required stages, mode support, runtime support, verification policy, completion thresholds, mastery dimensions, review plan, and migration status are required fields.
- Each required stage names the evidence source that can satisfy it.
- Each conditional stage names the condition, such as configuration command, read-only command, troubleshooting objective, available runtime support, or equivalent vendor concept.
