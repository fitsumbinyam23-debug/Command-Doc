# Runtime Integrity Release Candidate Report

## Source

- Branch: `repair/runtime-integrity-and-verification`
- Source and base main commit: `620e8c4c83d817835cefe1bd7a21f63166f6af4d`
- Ahead / behind: `0 / 0`
- Working tree: modified, not committed

## Results

| Test | Status | Actual result |
| --- | --- | --- |
| Core diagnosis | Passed | 30 smoke checks passed. |
| Current runtime | Passed | 33 checks passed: rooted change paths, exact one-change rollback, stale verification, compact events, and bounded terminal persistence. |
| Build | Passed | `npm run build` completed. |
| Startup | Passed | 37 startup checks passed. |
| Profile registry | Passed | Nine profiles load. Catalog counts: Cisco 32, HP 33, Aruba 25. |
| Vendor rejection | Passed | Vendor-exclusive command resolution returns `wrong_vendor`; shared generic syntax matches only where the selected vendor supports it. |
| HP Workbench | Passed | HP 5500 rendered Comware commands, performed a description transaction, and created one rooted pending change. |
| Atomic transaction | Passed | A rejected Workbench sequence restored runtime and terminal state without a partial change. |
| Verification revision | Passed | A later relevant change invalidates verification and blocks save until verification is re-run. |
| Help rendering | Passed | Help no longer renders object text. |
| Workspace navigation | Passed | Workbench Visual Playground navigation opens handled `visual` screen. |
| Browser console | Passed | No error-level messages in exercised local browser flow. |
| Edge / mobile | Blocked | Separate Edge and mobile passes unavailable in this session. |
| All action / rollback paths | Partially working | Interface description transaction and rollback are verified. Equivalent system, VLAN, endpoint, and cable actions are not exposed by the current Workbench. |
| Full per-mode help and long topology quota | Partially working | Registry and active terminal paths checked; exhaustive browser matrix not automated. |

## Confirmed RC repair

The all-profile registry matrix initially threw while ranking a cross-vendor candidate because `rank()` assumed an availability object. The repair treats omitted availability as available only for rank ordering; the matrix now completes.

## Release decision

**Not ready to merge or deploy.** The repair remains uncommitted and lacks complete Edge, mobile, exhaustive profile/mode, topology persistence, and action-matrix evidence.

## Evidence

- Local browser: `http://127.0.0.1:4195/lab.html`
- Network errors: none observed for active local assets.
- Console errors: none observed in the exercised local browser flow.
