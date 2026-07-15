# Learning Integrity Audit

Milestone: v0.3.0-rc.1 planning. This audit records the current learning system without changing source, data, runtime, tests, or generated inventories.

## Data Sources
- data/generated/command-inventory.json
- data/generated/command-inventory-audit.json
- data/generated/curriculum-index.json
- data/generated/curriculum-health.json
- data/generated/route-inventory.json
- data/labs/curriculum_vendor_tracks.json
- data/labs/stages.json and data/labs/sections.json
- data/labs/lessons/*.json and data/labs/quizzes/*.json
- data/labs/scenarios/scenarios.json and data/flows/*.json
- data/switch-profiles.json
- lab.html and src/app-release-21.js for current visible behavior and progress rules.

## Current Counts
- Canonical commands: 163.
- Canonical commands per vendor: cisco_ios: 43, hp_comware: 42, aruba_cx: 33, windows_cmd: 22, linux: 23.
- Active lab lessons: 24; separate lesson-file records: 21; generated module lessons: 44.
- Stages: 3; sections: 14; generated modules: 44.
- Routes: 127; routes per vendor: cisco_ios: 97, hp_comware: 20, windows_cmd: 10.
- Commands with dedicated hand-authored lesson syntax matches: 27.
- Commands covered by generated grouped lessons: 163.
- Commands with practice-route linkage: 41.
- Commands without practice-route linkage: 122.
- Commands without verification under traceability rules: 3 (hp_irf_member_renumber, aruba_vlan_trunk_native, aruba_lacp_system_priority).
- Commands without rollback guidance: 0.
- Review coverage: 0%.
- Overall learning readiness: 38%.

## Vendor Coverage
| Vendor ID | Label | Commands | Generated modules | Routes |
| --- | --- | ---: | ---: | ---: |
| cisco_ios | Cisco IOS | 43 | 13 | 97 |
| hp_comware | HP Comware | 42 | 12 | 20 |
| aruba_cx | ArubaOS-CX | 33 | 10 | 0 |
| windows_cmd | Windows CMD | 22 | 4 | 10 |
| linux | Linux | 23 | 5 | 0 |

## Generated Coverage Metrics
| Metric | Current value |
| --- | ---: |
| Classification coverage | 100% |
| Lesson coverage | 100% |
| Practical exercise coverage | 30% |
| Route coverage | 25% |
| Fully simulated coverage | 6% |
| Verification coverage | 99% |
| Troubleshooting coverage | 9% |
| Review coverage | 0% |
| Overall learning readiness | 38% |

## Integrity Findings
- Duplicate command IDs: aruba_show_spanning_tree, windows_netstat_ano.
- Generated audit missing verification steps: hp_port_trunk_permit, aruba_vlan_trunk_native. The traceability scan is stricter and also counts commands with no command-level or route-level verification policy.
- Broken command references: none.
- Routes containing commands not found in inventory: none.
- Routes without lessons: free-practice.
- Routes with cross-vendor conflicts: none.
- Routes with missing CLI handlers: 72; sample: full-switch-configuration, route-2-5, route-3-1, route-3-2, route-3-5, route-3-8, route-3-9, route-3-10, route-4-1, route-4-2, route-4-3, route-4-4, route-4-5, route-4-6, route-4-7, route-4-8, route-4-9, route-4-10, route-6-2, route-6-3, route-6-4, route-6-5, route-7-1, route-7-2, route-7-3.
- Duplicate learning objectives are not represented as stable objective IDs in the current schema; objective duplication cannot be audited reliably until lesson objectives are normalized.
- Commands in the wrong learning level and modules in the wrong prerequisite order require SME review because current generated levels are topic/order metadata, not prerequisite assertions.

## Current Lesson Completion and Mastery Rules
- Opening a lesson: the current lab view uses active lab curriculum, section/stage progress, vendor selection, and local progress fields; foundation content is available earlier, configuration content is gated by foundation quiz score and selected section completion.
- Completing a standard lab lesson: finishLabLesson compares entered text against accepted_commands and checks a quiz answer. A correct result marks completedLessons, lessonScores, and learnedCommands.
- Passing a quiz: lesson quiz checks can produce a 100/0 lesson score, while the foundation final unlocks configuration when the score is at least 80.
- Entering a practical command: standard lessons can use text comparison; runtime terminal practice uses the runtime path, but legacy lesson completion does not consistently require runtime command events.
- Receiving verification credit: premium lesson verification can mark verification and ticket documentation dimensions based on button/action flow instead of always proving runtime verification policy evidence.
- Receiving ticket-documentation credit: premium completion can create a review record and mark documentation credit; standard lessons do not consistently require a ticket note.
- Earning mastery: mastery records exist but can be updated by lesson completion paths that do not independently prove every dimension.
- Creating review records: review records are currently created through premium lesson completion paths; generated review coverage is 0%.
- Showing progress on Home: Home reads local progress, completed lessons, last lesson/route, and due review-like counts from reviewRoutes/review records rather than a fully normalized review schedule.
- Switching Guided/Assisted/Independent: premium lessons expose modes, but shared attempt state can leak knowledge or answers across modes unless the engine isolates attempts by mode.

## Completion Without Skill Proof
- Text comparison can award lesson completion without command execution through CommandRegistry.
- Quiz success can unlock configuration content without runtime execution proof.
- Premium verification and ticket documentation can be credited without always requiring runtime verification policy, Save, rollback, and route-state evidence.
- Instructor unlock can mark local progress complete and must never be treated as student learning evidence.
- Explanation-only or missing-handler routes can appear in practice contexts; they need explicit support labels before awarding practical execution mastery.

## Runtime Coupling Audit
- Text comparison: present in standard lab lesson practice and some premium command checks.
- Command Registry: authoritative for terminal/runtime execution, not yet universal for lesson completion.
- Actual terminal execution: present in Switch Lab/runtime workspaces, not required for all lesson completion.
- SharedSwitchState: authoritative for simulated switch state, not consistently required by lesson mastery.
- Verification policies: present in command and route data, but not uniformly enforced by lesson completion.
- Save gate: present in runtime milestone, but not uniformly required by current lesson completion.
- Route state: routes exist and are tracked, but 122 commands have no practice route and 72 routes report missing CLI handlers.

## No-Repair Note
Any runtime regression discovered during this audit is intentionally documented only. This milestone does not modify CommandRegistry, SharedSwitchState, CLI parsing, runtime handlers, verification policy, Save, rollback, generated inventories, profiles, JavaScript, CSS, or tests.
