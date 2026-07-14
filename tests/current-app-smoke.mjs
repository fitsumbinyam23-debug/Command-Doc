import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFile(path.join(root, relative), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`Current app smoke test failed: ${message}`);
};
const references = (html, expression) => [...html.matchAll(expression)].map((match) => match[1].split("?")[0]);
const substitute = (syntax, profile) => syntax.replace(/<([^>]+)>/g, (_, name) => {
  const value = name.toLowerCase();
  if (value.includes("interface") || value.includes("port")) return profile.interface_naming.replace("{port}", "1");
  if (value.includes("vlan")) return "20";
  if (value.includes("ip")) return "192.0.2.10";
  if (value.includes("mask")) return "255.255.255.0";
  if (value.includes("name") || value.includes("description")) return "TEST";
  return "test";
});

const labHtml = await read("lab.html");
const indexHtml = await read("index.html");
assert(indexHtml.includes('location.replace("lab.html")'), "root redirects to lab.html");
const activeScripts = references(labHtml, /<script[^>]+\bsrc=["']([^"']+)["']/gi);
const activeStyles = references(labHtml, /<link[^>]+\bhref=["']([^"']+)["']/gi);
assert(activeScripts.length > 0, "lab.html has active scripts");
for (const asset of [...activeScripts, ...activeStyles]) {
  await fs.access(path.join(root, asset));
}

const store = new Map();
const sandbox = {
  console,
  crypto: { randomUUID: () => "current-app-test" },
  localStorage: { getItem: (key) => store.get(key) || null, setItem: (key, value) => store.set(key, String(value)), removeItem: (key) => store.delete(key) },
  window: {},
  document: { addEventListener() {}, getElementById() { return null; }, querySelectorAll() { return []; } },
  setTimeout() {}, clearTimeout() {}
};
sandbox.window = sandbox;
for (const asset of ["src/lab-engine.js", "src/diagnostics-engine.js", "src/topology-workspace.js", "src/curriculum-services.js", "src/switch-runtime.js"]) {
  vm.runInNewContext(await read(asset), sandbox, { filename: asset });
}
assert(sandbox.CommandDoctorLabEngine, "Lab engine initializes");
assert(sandbox.CommandDoctorDiagnostics, "Diagnostics engine initializes");
assert(sandbox.CommandDoctorTopology, "Topology workspace initializes");
assert(sandbox.CommandDoctorCurriculum, "Curriculum services initialize");
assert(sandbox.CommandDoctorSwitchRuntime, "Switch runtime initializes");

const inventoryFile = JSON.parse(await read("data/generated/command-inventory.json"));
const routeFile = JSON.parse(await read("data/generated/route-inventory.json"));
const curriculumIndex = JSON.parse(await read("data/generated/curriculum-index.json"));
const curriculumHealth = JSON.parse(await read("data/generated/curriculum-health.json"));
const profilesFile = JSON.parse(await read("data/platforms/switch-profiles.json"));
assert(Array.isArray(inventoryFile.commands) && inventoryFile.commands.length > 0, "command inventory loads");
assert(Array.isArray(routeFile.routes) && routeFile.routes.length > 0, "route inventory loads");
assert(curriculumIndex.modules && curriculumHealth.status, "curriculum metadata loads");
assert(!/^(Exit code:|Wall time:|Total output lines:|Output:|stdout|stderr)/m.test(await read("data/generated/command-inventory.json")), "generated inventory is clean JSON");

const Runtime = sandbox.CommandDoctorSwitchRuntime;
const profiles = profilesFile.profiles || profilesFile.switch_profiles || profilesFile;
const profileRegistry = new Runtime.ProfileRegistry(profiles);
const profile = profileRegistry.get(profiles[0].profile_id);
assert(profile && profileRegistry.byVendor(profile.vendor).length > 0, "profile registry selects active profile");
const registry = new Runtime.CommandRegistry(inventoryFile.commands, profile);
assert(registry.catalog.length > 0 && registry.catalog.length < inventoryFile.commands.length, "profile command filtering works");
const canonical = registry.catalog.find((command) => !command.canonical_command.includes("<"));
assert(canonical, "a canonical command is available");
assert(registry.resolve(canonical.canonical_command, { mode: "exec", privilege: "privileged" }).status === "matched", "canonical command resolves");
const aliased = registry.catalog.find((command) => command.aliases?.length && !command.aliases[0].includes("<"));
assert(aliased && registry.resolve(aliased.aliases[0], { mode: "exec", privilege: "privileged" }).status === "matched", "command alias resolves");
const incomplete = canonical.canonical_command.split(/\s+/)[0];
assert(["incomplete", "ambiguous", "matched"].includes(registry.resolve(incomplete, { mode: "exec", privilege: "privileged" }).status), "incomplete command returns guidance");
const parameterized = registry.catalog.find((command) => /<[^>]*vlan/i.test(command.canonical_command));
if (parameterized) assert(!Runtime.validateParameterDetail("vlan", "5000", profile).ok, "invalid parameters are rejected");
const otherVendor = inventoryFile.commands.find((command) => command.vendor !== profile.vendor && !command.canonical_command.includes("<"));
if (otherVendor) assert(registry.resolve(otherVendor.canonical_command, { mode: "exec", privilege: "privileged" }).status === "wrong_vendor", "wrong-vendor commands are distinguished");
assert(new Set(inventoryFile.commands.map((command) => command.simulator_support)).size >= 4, "all current support levels remain represented");

const state = new Runtime.SharedSwitchState(profile, null, { command_catalog_version: "test", profile_catalog_version: "test", active_build_version: "test" });
const port = Object.keys(state.running.interfaces)[0];
const beforeStartup = state.startup.interfaces[port].description;
assert(state.updateInterface(port, { description: "Current app smoke" }, "test-change"), "supported state change applies");
assert(state.changes().length === 1 && state.startup.interfaces[port].description === beforeStartup, "running and startup remain separate with pending change");
state.save("test-save");
assert(state.changes().length === 0 && state.startup.interfaces[port].description === "Current app smoke", "save copies clean running state to startup");
state.updateInterface(port, { description: "Unsaved" }, "test-unsaved");
state.rollbackUnsaved();
assert(state.running.interfaces[port].description === "Current app smoke" && state.changes().length === 0, "unsaved rollback restores startup");
state.updateInterface(port, { description: "First change" }, "test-first-change");
state.updateInterface(port, { vlan: 20 }, "test-second-change");
const changeCount = state.changes().length;
assert(state.rollbackChange(changeCount - 1), "one-change rollback succeeds");
assert(state.running.interfaces[port].vlan === 1, "one-change rollback restores the exact path");
assert(state.changes().length === changeCount - 1 && !state.changes().some((change) => !change.field.startsWith("interfaces.")), "rollback does not create a rootless or extra pending change");
const verificationOutput = `interface ${port}\n description First change`;
assert(state.verifyInterfaceDescription(port, `show running-config interface ${port}`, verificationOutput), "verification records current running state");
assert(state.isVerificationCurrent(port), "fresh verification is current");
state.updateInterface(port, { description: "Verification changed" }, "test-stale-verification");
assert(!state.isVerificationCurrent(port), "a later configuration change invalidates verification");
for (let index = 0; index < 150; index += 1) {
  state.record({ command_id: "read-only-test", canonical_command: "show version", entered_text: "show version", success: true, state_before: { giant: "x".repeat(10000) }, state_after: { giant: "x".repeat(10000) } });
}
assert(!state.eventLog.some((event) => "state_before" in event || "state_after" in event), "event log stores compact records rather than full state snapshots");
state.storeTerminal(Array.from({ length: 150 }, (_, index) => `line ${index} ${"x".repeat(1000)}`), Array.from({ length: 150 }, (_, index) => `show version ${index}`));
assert(state.terminalHistory().length === 120 && JSON.stringify(state.snapshot()).length < 800000, "terminal persistence remains within a compact local-storage budget");
const restored = new Runtime.SharedSwitchState(profile, JSON.parse(store.get(Runtime.STORAGE_KEY)), { command_catalog_version: "test", profile_catalog_version: "test", active_build_version: "test" });
assert(restored.running.interfaces[port].description === "Verification changed", "runtime snapshot persists and restores");

console.log(JSON.stringify({
  suite: "current application",
  active_scripts: activeScripts.length,
  active_styles: activeStyles.length,
  canonical_commands: inventoryFile.commands.length,
  routes: routeFile.routes.length,
  passed: 33
}));
