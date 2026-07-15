# Learning Integrity Roadmap

This roadmap breaks v0.3.0-rc.1 into independently reviewable stages. It intentionally does not schedule all stages in one coding task.

| Stage | Primary role | Objective | Allowed files | Prohibited files | Dependencies | Acceptance tests | Definition of done | Review package | Rollback plan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Stage 1 - Data and curriculum integrity | Curriculum designer + QA | Normalize command, module, lesson, route, verification, and review metadata without runtime behavior changes. | docs, schema docs, generated validation scripts in a later coding task | runtime files, generated inventories unless regenerating from an approved script | This planning commit | Traceability validator, JSON parse, duplicate ID report, vendor isolation check | Every command has explicit lesson/practice/review migration state. | Diff of data/schema only plus validation report. | Revert data/schema commit; runtime untouched. |
| Stage 2 - Reusable lesson engine | Senior application engineer | Build one lesson attempt engine with explicit stages, mode isolation, and evidence scoring. | New lesson engine modules and focused tests | CommandRegistry behavior, SharedSwitchState behavior, existing runtime handlers | Stage 1 schemas | Unit tests for stage progression, mode isolation, blocked answer reveal, no cross-mode leakage | Lessons cannot complete without declared required stages. | Engine tests and screenshots of no visible redesign unless needed. | Disable new engine flag or revert engine files. |
| Stage 3 - Pilot premium lessons | Learning-systems engineer + network SME | Author a small representative lesson set for Cisco IOS, HP Comware, and ArubaOS-CX. | Pilot lesson data, lesson fixtures, docs | Catalog-wide migration, runtime internals | Stage 2 engine | Lesson schema validation, command/vendor IDs, objective coverage, accessibility smoke review | Pilot covers read-only, config, verification, Save safety, all modes, mastery, review. | Pilot matrix and per-lesson evidence package. | Remove pilot data; engine remains. |
| Stage 4 - Runtime-connected lesson practice | Runtime-aware application engineer | Connect practice stages to terminal/runtime execution and verification policy without changing runtime semantics. | Lesson/runtime adapter, UI wiring, tests | Runtime command parsing/handlers except bugfixes in separate task | Stages 2-3 | Adapter tests, terminal execution tests, verification/no-credit tests, Save/rollback tests | Execution credit comes only from runtime event evidence. | Trace logs with command IDs, mode, vendor, route/profile. | Feature flag off; revert adapter/UI commit. |
| Stage 5 - Mastery and review | Learning engineer | Persist vendor_id + canonical_command_id mastery records and real spaced review records. | Progress service, local storage migration, review UI tests | Runtime internals, command catalog semantics | Runtime evidence from Stage 4 | Mastery dimension tests, confidence/hint scoring, due-review date tests | Home counts actual due review records, not inferred routes. | Migration report and before/after local-storage fixtures. | Rollback migration with backup and schema version gate. |
| Stage 6 - Home and Learn redesign | UX/product engineer | Refocus Home and Learn around next action, weak skill, due review, and vendor/module path. | HTML/CSS/app view code, screenshots, accessibility tests | Runtime handlers, catalog data changes | Stage 5 review/mastery records | Playwright visual smoke, keyboard navigation, responsive screenshots | Students can tell what to do next in under one screen. | Desktop/mobile screenshots and copy review. | Revert view layer; data remains. |
| Stage 7 - Accessibility and responsive polish | Accessibility designer + frontend engineer | Resolve critical/high accessibility and mobile terminal/workbench issues. | CSS, view templates, focus helpers, tests | Learning logic changes not needed for accessibility fix | Stages 4-6 UI surfaces | Keyboard-only flow, focus trap, live announcements, touch target, reduced motion checks | Critical/high issues closed; medium issues triaged. | Checklist with screenshots and manual screen-reader notes. | Revert visual/focus changes if regression appears. |
| Stage 8 - Catalog-wide migration | Curriculum designer + QA/release | Expand premium standard from pilot to all supported commands in reviewable batches. | Lesson data, generated indexes, tests, docs | Runtime internals unless separate runtime defect ticket exists | Stages 1-7 | Batch validator, traceability diff, no cross-vendor mismatch, lesson engine regression tests | Every command has explicit final migration status and due review path. | Batch-by-batch coverage report and release notes. | Revert affected data batch; leave engine stable. |

## Pilot Recommendation
The pilot should cover the currently supported switch vendors: Cisco IOS, HP Comware, and ArubaOS-CX. Windows CMD and Linux remain important catalog families, but they are operating-system diagnostic tracks rather than switch-vendor runtime profiles in the current route inventory.

| Pilot lesson | Vendor | Why selected | Required coverage |
| --- | --- | --- | --- |
| cisco_show_interface_status | cisco_ios | Existing premium-style command, full_state_simulation, broad route linkage, safe read-only evidence. | Guided, Assisted, Independent, output interpretation, verification, mastery, review. |
| cisco_switchport_access_vlan + cisco_copy_running_startup | cisco_ios | Represents configuration, verification, and authoritative Save safety on the most complete route set. | Runtime execution, verification, Save or rollback, ticket note. |
| hp_display_interface_brief | hp_comware | Existing premium-style command and HP route anchor with simplified_state_simulation. | Read-only learning, Assisted/Independent troubleshooting, verification, mastery, review. |
| hp_port_access_vlan + hp_save | hp_comware | Covers HP configuration syntax, vendor mode differences, verification, and Save semantics. | Configuration, verification, Save safety, documentation, review scheduling. |
| aruba_show_interface_brief | aruba_cx | Existing premium-style command and full_state_simulation, but no current route inventory for Aruba. | Read-only learning and a pilot route gap that must be resolved before claiming practice coverage. |
| aruba_vlan_access + aruba_write_memory | aruba_cx | Covers Aruba configuration, verification, and Save safety while exposing current route/catalog migration gap. | Configuration, verification, Save/rollback, modes, mastery, review. |

## Pilot Acceptance Rules
- The pilot must include one read-only and one configuration lesson for each switch vendor.
- The pilot must exercise Guided, Assisted, and Independent mode without cross-mode answer leakage.
- The pilot must award verification only from runtime policy evidence where support exists.
- The pilot must require Save or rollback for configuration work.
- The pilot must create real mastery records and spaced review records.
- The pilot must include accessibility and mobile checks for lesson, terminal, verification, ticket note, and review queue flows.

## Release Discipline
- Each stage lands in its own reviewable branch/commit set.
- Runtime changes, if required by a discovered bug, are filed and reviewed separately from curriculum/product changes.
- No stage merges until validation confirms vendor isolation, traceability, JSON parse, and changed-file scope.
