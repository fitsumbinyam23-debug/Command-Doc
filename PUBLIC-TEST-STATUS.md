# Public Test Status

Released build: `2026.07-runtime-rc.3`
Release tag: `v0.2.0-rc.2`
Functional source: `084b11789304fa326f7275e3279d6bf7c0847134`

## Release status

| Check | Status | Evidence |
| --- | --- | --- |
| Core smoke tests | Passed | 30 passed. |
| Current application tests | Passed | 246 passed, including the Practice Library visible-filter matrix. |
| Startup test | Passed | 37 passed. |
| Practice Library visible-filter hotfix | Passed | All visible filters clear returns the complete current route inventory, which is dynamically derived as 127 routes. Cisco, HP, and Windows filtering works. ArubaOS-CX and Linux have honest zero-route states. |
| Route-scoped progress and launch alignment | Passed | Route-vendor progress is isolated correctly and route launch vendor/profile alignment is preserved. |
| Runtime behaviour, route data, and learning data | Unchanged | Release preparation updates build identity, active asset versions, service-worker cache identity, active documentation, and identity tests only. |
| Independent Chromium review | Passed | Approved functional hotfix review completed for the Practice Library filters, route launch, mobile layout, and console checks. |
| Mobile Chromium 390px overflow | Passed | No exercised mobile overflow failures. |
| Practice Library hotfix merge | Complete | The approved Practice Library hotfix is merged to `main`. |
| GitHub Pages publication | Release target | Official public release target: `https://fitsumbinyam23-debug.github.io/Command-Doc/`. |
| Microsoft Edge interaction | Blocked | Not executed for this RC. Do not treat as passed. |
| Service-worker offline update transition | Blocked | True update/offline transition is not executed for this RC. Do not treat as passed. |

## Release limits

| Item | Status |
| --- | --- |
| Edge browser execution evidence | Blocked |
| True service-worker offline-update transition evidence | Blocked |
| Public Playwright HTML/JSON report, traces, videos | Not implemented |
| Formal accessibility scan/report | Not implemented |
| One-click public test-state presets | Not implemented |

These are disclosed so an independent reviewer can distinguish verified behaviour from unexecuted coverage.
