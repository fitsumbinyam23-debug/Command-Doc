# Public Test Status

Build: `2026.07-lab.49`  
Application commit: `6712a9111fe5014130c59dc95490c84c7fe26fcd`

## Verified in the public browser

| Check | Status | Evidence |
| --- | --- | --- |
| Root public URL | Working | Root redirects to `lab.html`; current Home renders. |
| Current app assets | Working | Current Lab 49 app, runtime, and page assets load after cache refresh. |
| Command and curriculum JSON availability | Working | Required command, flow, lab, generated-curriculum, and profile JSON endpoints returned HTTP 200. |
| Public console | Working | No browser errors or warnings observed during public entry smoke test. |

## Not yet published

| Item | Status |
| --- | --- |
| Public Playwright HTML/JSON report, traces, videos | Not implemented |
| Edge browser execution evidence | Not implemented |
| Mobile device execution evidence | Not implemented |
| Formal accessibility scan/report | Not implemented |
| One-click public test-state presets | Not implemented |

These are disclosed so an independent reviewer can distinguish verified behaviour from unexecuted coverage.
