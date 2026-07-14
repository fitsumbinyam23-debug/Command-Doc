# Independent RC Review Remediation Evidence

## Candidate

- Base main commit: `620e8c4c83d817835cefe1bd7a21f63166f6af4d`
- Previous rejected repair candidate: `73ec0a36ea5cee292e5145de83eb800655ec5b9c`
- Replacement source candidate: `7becdc28471fe64df8dc773d563de94081a8fd65`
- Branch: `repair/runtime-integrity-and-verification`
- Build identity: `2026.07-runtime-rc.2`, runtime schema `5`

## Remediated Findings

1. Runtime route objects now retain `vendor_id` for logic and `vendor_label` for display. Profile activation and vendor progress use the ID.
2. `CommandRegistry` deduplicates a matching vendor/canonical/mode signature, allowing a runtime handler to replace generated metadata without creating an ambiguous Aruba command.
3. Verification targets are policy-driven. Cisco and Aruba use `show running-config interface <interface>`; HP Comware uses `display current-configuration interface <interface>`. Terminal and Workbench output is generated from shared state using the active profile syntax.
4. Terminal save feedback always uses the authoritative `SharedSwitchState.save()` message, on both accepted and rejected saves.
5. Context help now recognizes partial final keywords such as `i?` in configuration mode.
6. Verification records are capped at 200 while records covering current pending changes are protected.
7. The manifest, cache identity, and review documentation name this replacement candidate instead of the rejected RC.

## Automated Evidence

| Check | Result |
| --- | --- |
| Core smoke | Passed: 30 checks |
| Current application smoke | Passed: 47 checks |
| Aruba injected-command resolution | Passed for all Aruba profiles |
| HP policy target recognition | Passed for all HP profiles |
| Save aliases and field-scoped evidence | Passed for all current switch profiles |
| Prefix help | Passed for all current switch profiles |
| Verification history retention | Passed: at most 200 records |
| Build | Passed |
| Startup | Passed: 37 checks |

## Limits

- Browser-driven Chrome and Edge workflow screenshots, traces, and service-worker update evidence remain unavailable in this session and are not marked passed.
- This source candidate is not merged or deployed. Draft PR #3 must remain draft pending independent browser review.
