# Command Doctor Product Charter

Milestone: Command Doctor v0.3.0-rc.1 - Learning Integrity and Product Experience
Baseline branch: main
Baseline merge commit: bdd1fc2abdf8b62ffe672d61b0f5f16f7d5ce155
Approved runtime source: ea4bf7ce2223dc1a22db3de18c9f48c1427b155c
Release tag: v0.2.0-rc.1
Build: 2026.07-runtime-rc.2

## 1. Product Vision
Command Doctor is an offline, vendor-aware network-learning and troubleshooting platform that teaches technicians and students to understand commands, interpret evidence, make safe changes, verify results, document work, and retain skills.

Core loop: Diagnose -> Understand -> Practise -> Troubleshoot -> Verify -> Document -> Review.

## 2. Product Mission
Help a learner become a safer network technician by connecting command knowledge to evidence, simulated action, verification, rollback, documentation, and retention. A learner should finish a lesson knowing what the command means, when to use it, what healthy and faulty evidence look like, and how to prove the result.

## 3. Product Positioning
Command Doctor is not intended to be only a command-reference website and is not intended to become a generic Packet Tracer clone. Its differentiation is the connection between command knowledge, evidence interpretation, safe practice, verification, rollback, technician documentation, and long-term review.

## 4. Primary User Types
- Beginner networking student learning vendor command families for the first time.
- Working technician who needs safe, offline command rehearsal before a maintenance window.
- Instructor or mentor who wants inspectable learning evidence instead of only quiz scores.
- Product/QA reviewer validating that runtime, curriculum, and progress records agree.

## 5. User Outcomes
- Identify the vendor, command, and relevant output evidence before changing anything.
- Choose the next safe command based on evidence, not guesswork.
- Practise configuration only in the local simulation and verify before Save.
- Roll back or document changes when evidence does not match the goal.
- Retain skills through scheduled command-level review.

## 6. Product Principles
- The product teaches technician judgment, not just syntax recall.
- Every completion claim should be traceable to evidence.
- Read-only learning, configuration learning, troubleshooting, and documentation must remain distinct but connected.
- Reference content supports the journey; it does not replace practice.

## 7. Engineering Principles
- Runtime behavior remains the source of truth for simulated command execution.
- Planning and curriculum work must not silently change CommandRegistry, SharedSwitchState, CLI parsing, verification, Save, rollback, or service-worker runtime behavior.
- Changes should be small, reviewable, reversible, and backed by focused validation.

## 8. Network-Accuracy Principles
- Vendor syntax, CLI modes, output fields, and verification commands must stay vendor-specific.
- Unsupported simulation should be labeled honestly as explanation-only or partial support.
- Configuration lessons must include required privilege/mode, expected state, verification, safety, and rollback when applicable.

## 9. Learning-Design Principles
- Lessons should move from understanding to prediction to evidence interpretation to practice to review.
- Mastery is multidimensional: concept, syntax, prediction, output interpretation, command selection, practical execution, troubleshooting, verification, safety, and documentation.
- A single quiz score must not stand in for command mastery.

## 10. UX and Accessibility Principles
- The first screen should show what Command Doctor is, what to do next, what was last completed, what reviews are due, and what skill needs work.
- Every major workflow must work by keyboard, announce meaningful status/error changes, avoid color-only state, and remain usable on small screens.
- Long lessons must use clear headings, stable controls, and predictable focus movement.

## 11. Offline and Privacy Principles
- Command Doctor is offline-first and should not require a network account to learn or practise.
- Pasted diagnostic output and saved reports can contain sensitive device information; local retention and deletion controls must be obvious.
- No external telemetry or upload should be introduced without explicit product approval.

## 12. Simulation-Support Policy
- Full state simulation can award practical execution and verification when runtime evidence proves the result.
- Simplified state simulation can award practical execution only for supported dimensions and must mark missing dimensions.
- Output simulation can teach interpretation and selection but cannot claim configuration-state mastery.
- Explanation-only commands remain reference/knowledge content until supported by a runtime or validated exercise path.

## 13. Command-Catalog Policy
- Canonical command IDs are the stable learning identity.
- Aliases and abbreviations update the same canonical record.
- Duplicate IDs, missing verification policy, and missing practice links are release blockers for premium migration batches.

## 14. Vendor-Isolation Policy
- Cisco IOS, HP Comware, ArubaOS-CX, Windows CMD, and Linux command identities must not be mixed.
- Cross-vendor comparisons may teach equivalent concepts, but command syntax, runtime support, profiles, and mastery records stay vendor-scoped.

## 15. Runtime Source-of-Truth Policy
- Runtime command execution, command-event identity, SharedSwitchState, verification policy, Save gate, rollback, pending changes, persistence, and topology state are authoritative.
- Lesson text can explain and request actions, but execution credit must come from runtime events whenever simulation support exists.

## 16. Lesson-Completion Policy
- A complete premium lesson must declare required stages and completion evidence.
- Text comparison may support syntax recall but must not by itself complete runtime, verification, safety, or documentation dimensions.
- Configuration completion requires runtime execution, verification, and either Save or rollback decision.

## 17. Mastery Policy
- Mastery is stored by vendor_id + canonical_command_id.
- Aliases update the canonical mastery record.
- Hints, failed attempts, safety failures, missing verification, and low confidence affect the relevant dimensions independently.

## 18. Review and Retention Policy
- Review records are real records, not inferred route flags.
- A review record stores command ID, vendor, profile where relevant, mastery status, weak skill, confidence, last attempt, next review date, interval, attempt history, question history, and last result.
- Review types include recall syntax, select command, interpret output, identify evidence, correct an error, choose verification, complete a short ticket, and perform a short runtime task.

## 19. Quality and Testing Policy
- Validate command IDs, lesson IDs, route IDs, vendor IDs, traceability, JSON parsing, Markdown links, and changed-file scope before commit.
- Runtime tests remain separate from this documentation milestone unless a later implementation stage explicitly requires them.
- Accessibility and responsive validation must include keyboard and small-screen checks before visible redesigns ship.

## 20. Git and Release Policy
- Work on milestone branches, not directly on main.
- Documentation-only planning commits must not merge, deploy, or retag releases.
- Runtime freeze exceptions require a separate bug report and review path.

## 21. Scope-Control Policy
- This milestone starts with charter, audit, traceability, and roadmap only.
- No visible app redesign, new lessons, JavaScript, CSS, generated inventory, route, profile, or runtime change belongs in this commit.
- Each implementation stage must be independently reviewable.

## 22. Definition of Done
- The charter exists and defines the durable product and learning-integrity rules.
- The current student experience and curriculum integrity are audited from actual project data.
- The target experience, premium lesson standard, accessibility audit, roadmap, pilot, and traceability matrix are present.
- Validation confirms no application or runtime source changed.

## 23. Decision-Priority Order
1. Safety and privacy.
2. Vendor and network accuracy.
3. Runtime evidence and learning integrity.
4. Accessibility and usability.
5. Curriculum completeness and retention.
6. Implementation simplicity and reviewability.
7. Visual polish.
