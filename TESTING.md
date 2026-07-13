# Command Doctor Independent Testing

## Public build

- Application: https://fitsumbinyam23-debug.github.io/Command-Doc/
- Application build: `2026.07-lab.49`
- Application commit: https://github.com/fitsumbinyam23-debug/Command-Doc/commit/6712a9111fe5014130c59dc95490c84c7fe26fcd
- Build record: `BUILD-MANIFEST.json`

Use the public URL in a private/incognito window. It does not require a login, VPN, local server, or real network device.

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
