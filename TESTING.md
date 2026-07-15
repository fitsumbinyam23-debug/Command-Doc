# Command Doctor Independent Testing

## Review candidate

- Candidate branch: `repair/runtime-integrity-and-verification`
- Application build: `2026.07-runtime-rc.2`
- Final source candidate: `ea4bf7ce2223dc1a22db3de18c9f48c1427b155c`
- Application commit: https://github.com/fitsumbinyam23-debug/Command-Doc/commit/ea4bf7ce2223dc1a22db3de18c9f48c1427b155c
- Build record: `BUILD-MANIFEST.json`

This candidate was independently reviewed before merge. Before the release merge and GitHub Pages publication complete, use the independent review ZIP or the draft branch; do not treat the GitHub Pages URL as candidate evidence.

## Verified RC evidence

- Core tests: 30 passed.
- Current application tests: 214 passed.
- Startup test: 37 passed.
- Independent Chromium review: all 9 profile terminal workflows passed.
- Representative Cisco, HP, and Aruba Workbench workflows passed.
- Exact terminal diffs, one audit event per entered command, Save gate, and field-scoped verification passed.
- Mobile Chromium 390px overflow check passed.

## First-time reset

1. Open the public URL.
2. To remove old offline files from a prior release, open `refresh.html` at the same public URL once, then return to the application.
3. In **Library**, open **Instructor Mode** and use **Reset Lab Progress** for a clean training progression.
4. Browser storage is intentionally local. To erase all local Command Doctor data, use the browser's site-data control for `fitsumbinyam23-debug.github.io`, reload, and open the public URL again.

## Main paths

- **Home**: choose Diagnose Output, Learn Commands, or Practise on a Switch.
- **Diagnose**: search a command or paste command output, choose a vendor if needed, then select **Explain Command** or **Diagnose**.
- **Learn**: select a vendor track, open a module, and enter the requested command in the simulated practice area.
- **Switch Lab**: use the route selector or Guided CLI to practise on the browser-local simulated switch. Use **Open focused terminal** for a larger terminal session.
- **Library**: search the command catalog, filter the Practice Library, review saved reports, or open Instructor Mode.

## Workbench test

1. In Switch Lab select a profile and a route or free practice.
2. Choose an interface, inspect the recommended safe command, and run it in the terminal.
3. Make a supported configuration change through the terminal or Inspector.
4. Check the pending-change and configuration-difference panels.
5. Verify with a supported show/display command.
6. Save or roll back as appropriate.
7. Refresh the browser and confirm browser-local state restores.

## Known limits

- Every workflow is an offline simulation; it never reaches a real switch, router, endpoint, SSH, Telnet, or API.
- Browser data is per browser profile and is not shared between devices.
- Microsoft Edge interaction remains blocked for this RC. Treat it as unavailable rather than passed.
- True service-worker update/offline transition remains blocked for this RC. Treat it as unavailable rather than passed.
- Public test reset presets, a public Playwright artifact bundle, and formal accessibility audit artifacts are not yet published. Treat them as unavailable rather than passed.
