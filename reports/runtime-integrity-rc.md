# Runtime Integrity RC Evidence

## Candidate

- Base: `620e8c4c83d817835cefe1bd7a21f63166f6af4d`
- Source candidate: `d952da745bc9080970bd64f7973945e654a7b79d`
- Branch: `repair/runtime-integrity-and-verification`
- Scope: controlled runtime repair only; no merge and no deployment.

## Repaired blockers

- Profile catalog filtering is independent of CLI mode, while context availability remains mode and privilege aware.
- Exact wrong-mode results are no longer overwritten by parser status.
- Tab completion inserts only strings; ambiguous results stay in place and show candidates.
- Mission and route launch retain a selected model within a vendor and align cross-vendor routes before starting the engine.
- Aruba has catalog-backed Workbench navigation definitions; HP, Cisco, and Aruba rollback descriptions execute in the local engine.
- Failed Workbench sequences restore the shared running state and audit-event checkpoint.
- Pending changes now have stable IDs. Saving requires every pending change to be covered by current verification evidence.
- The service worker cache is `command-doctor-2026-07-runtime-rc` and precaches the active runtime, profile, and generated catalog graph.

## Automated validation

| Matrix | Result | Evidence |
| --- | --- | --- |
| Core smoke | Passed | 30 smoke checks. |
| Current app | Passed | 33 baseline checks plus dynamic profile, route compatibility, vendor sequence, rollback, cache, and verification assertions. |
| Profiles | Passed | All 9 current switch profiles are normalized and registry-filtered dynamically. |
| Routes | Passed | All 127 current routes that target a switch vendor resolve at least one compatible current profile. |
| Vendor Workbench | Passed | Every profile completed its current description sequence and its displayed rollback command. |
| Verification coverage | Passed | A second pending interface change blocks save until both changes have current coverage. |
| Mode and completion | Passed | Mode-bound commands return `wrong_mode`; profile catalog includes configuration/interface commands for help/completion. |
| Service worker static graph | Passed | Current cache identity and required runtime/profile/generated catalog assets are asserted. |
| Build | Passed | `npm run build`. |
| Startup | Passed | 37 startup checks. |
| Syntax and diff | Passed | Node syntax checks and `git diff --check`. |

## Blocked / limitations

- Chromium interactive, responsive viewport, service-worker offline-update, and Edge screenshots/traces were not runnable through a browser automation capability in this session. They are **blocked**, not treated as passes.
- The current Workbench exposes an interface-description mutation. The dynamic transaction matrix covers that exposed mutation and does not invent unexposed Workbench actions.
- This report identifies the source candidate. Review metadata is committed separately and does not change the source runtime files.

## Release decision

**Do not merge. Do not deploy.** The source candidate is ready for source-level review, but independent browser and Edge evidence remains required before a release decision.
