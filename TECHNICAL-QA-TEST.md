# Command Doctor Technical QA Checklist

Use the public URL only. For each test record actual result, status, severity, browser, viewport, and notes.

| ID | Area | Preconditions | Actions | Expected result |
| --- | --- | --- | --- | --- |
| PUB-01 | Public entry | Private session | Open root URL | Redirects to current Lab page and Home renders. |
| PUB-02 | Assets | Public app open | Navigate Home, Diagnose, Learn, Switch Lab, Library | No missing visible style or data load failure. |
| NAV-01 | Navigation | Public app open | Use each sidebar action | Correct view renders and focus remains usable. |
| DIA-01 | Command lookup | Diagnose open | Search exact command and choose vendor | Meaning and guidance match selected command. |
| DIA-02 | Pasted output | Diagnose open | Paste supported command output and Diagnose | Evidence and ticket summary reflect pasted content. |
| DIA-03 | Unknown input | Diagnose open | Enter unrecognized command | Unknown/possible match appears; no invented diagnosis. |
| LEARN-01 | Vendor tracks | Learn open | Switch Cisco, HP, Aruba, Windows, Linux tracks | Only relevant visible learning content is shown. |
| LEARN-02 | Lesson practice | Lesson open | Complete its knowledge and command exercise | Completion reflects evidence, not only opening the lesson. |
| LIB-01 | Practice Library | Library open | Use search and each visible filter | Matching route cards update and start action opens selected route. |
| LAB-01 | Terminal | Switch Lab open | Enter multiple supported commands with Enter | Continuous terminal history and current prompt remain available. |
| LAB-02 | Workbench state | Route/profile selected | Select an interface, make supported change | Inspector, running config, pending changes, and diff agree. |
| LAB-03 | Rollback | One pending change | Roll back latest change | Exact field restores and unrelated pending change remains. |
| LAB-04 | Save | Verified change present | Save configuration, refresh | Startup state restores separately from running state. |
| TOP-01 | Topology | Visual playground open | Add/select/move endpoint and switch | Device remains accessible and selected details update. |
| TOP-02 | Cables | Cable tool active | Connect endpoint to switch port, move both | Cable follows and state restores after refresh. |
| PERSIST-01 | Browser storage | Any completed action | Refresh page | Applicable local state restores without duplicates. |
| RESP-01 | Responsive | Public app open | Test desktop, tablet, mobile widths | No critical overlap; primary actions remain reachable. |
| A11Y-01 | Keyboard | Public app open | Tab through visible controls; use terminal keys | Visible focus and usable labels are present. |

## Current published evidence

This release includes a manual public-browser smoke verification of public entry, asset loading, Home rendering, and zero console errors after an offline-cache refresh. A full cross-browser Playwright report, trace archive, video archive, and formal accessibility report are **not yet published** and must be recorded as `Not implemented`, not assumed to pass.
