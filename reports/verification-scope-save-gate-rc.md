# Verification-Scope and Authoritative Save-Gate RC Evidence

## Candidate

- Base: `620e8c4c83d817835cefe1bd7a21f63166f6af4d`
- Previous runtime candidate: `d952da745bc9080970bd64f7973945e654a7b79d`
- Repair candidate: `73ec0a36ea5cee292e5145de83eb800655ec5b9c`
- Branch: `repair/runtime-integrity-and-verification`
- Scope: field-scoped verification and authoritative local save gate only. No merge or deployment.

## Root Cause and Repair

- Description evidence was tied to an interface prefix and could cover unrelated pending interface fields.
- `SharedSwitchState.save()` copied running state into startup state without enforcing verification coverage.
- Repeated changes to one field could leave an older pending record that a new verification could not satisfy.
- The active graphical, terminal, and route-start save paths did not consistently surface the same state-level rejection result.

The runtime now stores explicit verification policy records. The current policy authorizes only `interfaces.<interface>.description` from exact interface configuration evidence. Pending changes carry root-scoped fields, stable IDs, transaction metadata, and verification status. `SharedSwitchState.save()` is the sole startup-write authority and rejects uncovered state without modifying startup, baseline, pending changes, or verification records.

## Automated Validation

| Matrix | Result | Evidence |
| --- | --- | --- |
| Core smoke | Passed | 30 checks. |
| Current application smoke | Passed | 38 checks. |
| Full active profile matrix | Passed | Every current profile has normalized support levels, local save aliases, rejected-save preservation, and verified-save success coverage. |
| Field scope | Passed | Description verification covers exactly one description change; a VLAN change on the same interface remains uncovered. |
| Interface isolation | Passed | Interface B evidence cannot authorize an Interface A pending change. |
| Stale evidence and re-verification | Passed | Same-field change invalidates only that proof; re-verification authorizes the consolidated pending change. |
| One-change rollback | Passed | The exact root-scoped pending change is removed without creating a replacement entry. |
| Legacy migration | Passed | Rootless legacy pending fields migrate to `interfaces.<interface>.*` with complete verification metadata. |
| Terminal integration | Passed statically | Active Lab code identifies save aliases and calls `shared.save(commandId)` before transcript output. |
| Graphical and route-start integration | Passed statically | Both call `SharedSwitchState.save()` and stop on its rejection result. |
| Build | Passed | `npm run build`. |
| Startup | Passed | 37 checks. |
| Whitespace | Passed | `git diff --check`. |

## Save-Gate Behavior

Rejected save result includes `ok`, `saved`, `uncovered_change_ids`, `uncovered_fields`, `required_policy_ids`, and `message`. A rejection records one `save_rejected` event and leaves running/startup separation and all pending data intact. A successful save copies the verified running configuration into local startup and clears pending changes.

## Limitations

- Chrome, Edge, responsive interaction, and offline service-worker-update evidence could not be run in this session because browser automation is unavailable. These are blocked, not passed.
- The current runtime has one full field-scoped verification policy: interface description. Other current pending fields are intentionally blocked until the app has real field-specific verification evidence.

## Release Decision

**Do not merge. Do not deploy.** This candidate is ready for source-level independent review only.
