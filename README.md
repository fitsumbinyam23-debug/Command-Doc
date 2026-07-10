# Command Doctor

Command Doctor is an offline-first CLI command lookup and output diagnosis MVP for IT and network technicians.

It only analyzes typed or pasted text. It does not execute commands, connect to devices, call cloud APIs, or require an AI service.

## Run Locally

From this folder:

```text
python -m http.server 4182 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:4182
```

The app loads its knowledge base from local JSON files under `data/`.

## Try Quickly

Use **Command Lookup** for offline command explanation, or use the **Example Output** selector and click **Diagnose Example**. The app includes sample outputs for Cisco IOS, HP Comware, ArubaOS-CX, Windows CMD, and Linux.

## Test

```text
node tests/smoke-tests.mjs
```

## MVP Scope

- Vendor detection for Cisco IOS, HP Comware, ArubaOS-CX, Windows CMD, and Linux.
- Offline command lookup for read-only and admin/change commands.
- Command detection from pasted output.
- Explanation Mode for command-only input.
- Diagnosis Mode for pasted command output with evidence.
- Confidence level and confidence reason.
- Rule-based diagnosis using local patterns.
- Interface, VLAN, IP, and MAC extraction for placeholder replacement.
- Read-only next command recommendations.
- Admin command explanations with visible risk levels.
- Dangerous command/config keyword warnings.
- Ticket-ready summary generation.
- Local analysis history in browser storage.

## Project Layout

```text
index.html
styles.css
src/app.js
data/commands/*.json
data/flows/*.json
data/safety/dangerous_commands.json
data/sources/sources.json
```

## Safety Boundary

Command Doctor is offline lookup and paste-only diagnosis. It can explain admin/change commands, but it never runs them. Commands are shown for the technician to run manually only after normal approval, backup, scope, and change-control checks.
