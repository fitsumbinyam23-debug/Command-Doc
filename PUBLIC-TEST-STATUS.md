# Public Test Status

Candidate build: `2026.07-runtime-rc.2`
Final source candidate: `ea4bf7ce2223dc1a22db3de18c9f48c1427b155c`

## Candidate status

| Check | Status | Evidence |
| --- | --- | --- |
| Core smoke tests | Passed | 30 passed. |
| Current application tests | Passed | 214 passed. |
| Startup test | Passed | 37 passed. |
| Independent Chromium review | Passed | All 9 profile terminal workflows and representative Cisco, HP, and Aruba Workbench flows passed. |
| Mobile Chromium 390px overflow | Passed | No exercised mobile overflow failures. |
| Candidate deployment | Pending merge | Not yet deployed until the merge step and GitHub Pages publication complete. |
| Microsoft Edge interaction | Blocked | Not executed for this RC. Do not treat as passed. |
| Service-worker offline update transition | Blocked | True update/offline transition is not executed for this RC. Do not treat as passed. |

## Not yet published

| Item | Status |
| --- | --- |
| Public Playwright HTML/JSON report, traces, videos | Not implemented |
| Edge browser execution evidence | Blocked |
| Formal accessibility scan/report | Not implemented |
| One-click public test-state presets | Not implemented |

These are disclosed so an independent reviewer can distinguish verified behaviour from unexecuted coverage.
