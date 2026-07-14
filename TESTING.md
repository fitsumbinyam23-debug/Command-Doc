# Command Doctor Independent Testing

## Review candidate

- Candidate branch: `repair/runtime-integrity-and-verification`
- Application build: `2026.07-runtime-rc.2`
- Application commit: https://github.com/fitsumbinyam23-debug/Command-Doc/commit/7becdc28471fe64df8dc773d563de94081a8fd65
- Build record: `BUILD-MANIFEST.json`

This candidate is not merged or deployed. Use the independent review ZIP or the draft branch; do not treat the GitHub Pages URL as candidate evidence.

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
- Public test reset presets, a public Playwright artifact bundle, Edge validation, and formal accessibility audit artifacts are not yet published. Treat them as unavailable rather than passed.
