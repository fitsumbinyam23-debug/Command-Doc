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
const serviceWorker = await read("sw.js");
assert(indexHtml.includes('location.replace("lab.html")'), "root redirects to lab.html");
const activeScripts = references(labHtml, /<script[^>]+\bsrc=["']([^"']+)["']/gi);
const activeStyles = references(labHtml, /<link[^>]+\bhref=["']([^"']+)["']/gi);
assert(activeScripts.length > 0, "lab.html has active scripts");
for (const asset of [...activeScripts, ...activeStyles]) {
  await fs.access(path.join(root, asset));
}
assert(!serviceWorker.includes("lab-29") && serviceWorker.includes("command-doctor-2026-07-runtime-rc"), "service worker uses the current RC cache identity");
for (const asset of ["src/lab-engine.js", "src/diagnostics-engine.js", "src/topology-workspace.js", "src/curriculum-services.js", "src/switch-runtime.js", "src/app-release-21.js", "data/platforms/switch-profiles.json", "data/generated/command-inventory.json", "data/generated/route-inventory.json"]) {
  assert(serviceWorker.includes(asset), `service worker includes current offline asset ${asset}`);
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
assert(registry.catalog.some((command) => command.available_modes?.includes("config") || command.available_modes?.includes("interface")), "profile registry retains commands outside EXEC mode for help and completion");
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
const normalizedSupportLevels = new Set(["full_state_simulation", "simplified_state_simulation", "output_simulation", "explanation_only", "unsupported_for_profile"]);
for (const candidateProfile of profiles) {
  const candidateRegistry = new Runtime.CommandRegistry(inventoryFile.commands, candidateProfile);
  assert(candidateRegistry.catalog.every((command) => normalizedSupportLevels.has(command.simulator_support)), `support levels normalize for ${candidateProfile.profile_id}`);
  const modeBoundCommand = candidateRegistry.catalog.find((command) => command.available_modes?.length);
  if (modeBoundCommand) assert(candidateRegistry.resolve(substitute(modeBoundCommand.canonical_command, candidateProfile), { mode: "exec", privilege: "privileged" }).status === "wrong_mode", `wrong mode remains explicit for ${candidateProfile.profile_id}`);
}
assert((await read("src/app-release-21.js")).includes('const ACTIVE_BUILD_VERSION = "2026.07-runtime-rc"'), "runtime reports the current RC build identity");
for (const route of routeFile.routes) {
  if (!["cisco_ios", "hp_comware", "aruba_cx"].includes(route.vendor)) continue;
  const compatible = profiles.filter((candidateProfile) => candidateProfile.vendor === route.vendor && (!route.supported_model_profiles?.length || route.supported_model_profiles.includes(candidateProfile.profile_id)));
  assert(compatible.length > 0, `switch route ${route.route_id} has a compatible profile`);
}
for (const candidateProfile of profiles) {
  const engineDevice = candidateProfile.vendor === "hp_comware" ? "irf" : candidateProfile.vendor === "aruba_cx" ? "aruba" : "access";
  const engine = new sandbox.CommandDoctorLabEngine.SimulatedDeviceEngine(engineDevice);
  const interfaceName = candidateProfile.interface_naming.replace("{port}", "1");
  engine.setTrainingProfile({ hostname: "RC-TEST", interface: interfaceName, endpoint: "PC-1", currentVlan: "1", targetVlan: "20" });
  const workflow = candidateProfile.vendor === "hp_comware"
    ? ["system-view", `interface ${interfaceName}`, "description RC test", "return"]
    : ["configure terminal", `interface ${interfaceName}`, "description RC test", "end"];
  assert(workflow.every((command) => engine.execute(command).ok), `active vendor Workbench description sequence completes for ${candidateProfile.profile_id}`);
  const rollback = candidateProfile.vendor === "hp_comware"
    ? ["system-view", `interface ${interfaceName}`, "undo description", "return"]
    : ["configure terminal", `interface ${interfaceName}`, "no description", "end"];
  assert(rollback.every((command) => engine.execute(command).ok) && !engine.state.interfaces[interfaceName].description, `displayed rollback syntax executes for ${candidateProfile.profile_id}`);
}

for (const candidateProfile of profiles) {
  const candidateState = new Runtime.SharedSwitchState(candidateProfile, null, { command_catalog_version: "test", profile_catalog_version: "test", active_build_version: "test" });
  const candidatePort = Object.keys(candidateState.running.interfaces)[0];
  const candidateRegistry = new Runtime.CommandRegistry(inventoryFile.commands, candidateProfile);
  const saveAliases = [...new Set(candidateRegistry.catalog.flatMap((command) => [command.canonical_command, ...(command.aliases || [])]).filter((syntax) => /^(write memory|wr mem|write mem|copy running-config startup-config|save|save force)$/i.test(syntax)))];
  assert(saveAliases.length > 0, `active save aliases exist for ${candidateProfile.profile_id}`);
  candidateState.updateInterface(candidatePort, { description: "Save gate test" }, "save-gate-test");
  const startupBeforeSave = candidateState.startup.interfaces[candidatePort].description;
  for (const alias of saveAliases) {
    const rejected = candidateState.save(alias);
    assert(!rejected.ok && candidateState.startup.interfaces[candidatePort].description === startupBeforeSave && candidateState.changes().length === 1, `save alias ${alias} uses the authoritative rejection gate for ${candidateProfile.profile_id}`);
  }
  const verificationCommand = candidateProfile.vendor === "hp_comware" ? `display current-configuration interface ${candidatePort}` : `show running-config interface ${candidatePort}`;
  assert(candidateState.verifyInterfaceDescription(candidatePort, verificationCommand, `interface ${candidatePort}\n description Save gate test`), `field-scoped verification works for ${candidateProfile.profile_id}`);
  assert(candidateState.save(saveAliases[0]).ok && candidateState.startup.interfaces[candidatePort].description === "Save gate test", `verified save alias succeeds for ${candidateProfile.profile_id}`);
}
const activeAppSource = await read("src/app-release-21.js");
assert(activeAppSource.includes("const isSaveRequest") && activeAppSource.includes("const saved = shared.save(commandId)"), "terminal save aliases invoke the shared authoritative save gate");

const state = new Runtime.SharedSwitchState(profile, null, { command_catalog_version: "test", profile_catalog_version: "test", active_build_version: "test" });
const port = Object.keys(state.running.interfaces)[0];
const secondPort = Object.keys(state.running.interfaces).find((name) => name !== port);
const beforeStartup = state.startup.interfaces[port].description;
assert(state.updateInterface(port, { description: "Current app smoke" }, "test-change"), "supported state change applies");
assert(state.changes().length === 1 && state.startup.interfaces[port].description === beforeStartup, "running and startup remain separate with pending change");
const rejectedSave = state.save("test-save-rejected");
assert(!rejectedSave.ok && state.changes().length === 1 && state.startup.interfaces[port].description === beforeStartup, "authoritative save gate rejects an unverified pending change without mutating startup");
assert(state.eventLog.at(-1).save_result === "rejected" && state.eventLog.at(-1).failure_type === "verification_required", "rejected save records one compact authoritative event");
assert(state.verifyInterfaceDescription(port, `show running-config interface ${port}`, `interface ${port}\n description Current app smoke`), "field-scoped description verification succeeds");
assert(state.save("test-save").ok && state.changes().length === 0 && state.startup.interfaces[port].description === "Current app smoke", "fully verified save copies clean running state to startup");
state.updateInterface(port, { description: "Unsaved" }, "test-unsaved");
state.rollbackUnsaved();
assert(state.running.interfaces[port].description === "Current app smoke" && state.changes().length === 0, "unsaved rollback restores startup");
state.updateInterface(port, { description: "First change", vlan: 20 }, "test-same-interface-fields");
assert(state.verifyInterfaceDescription(port, `show running-config interface ${port}`, `interface ${port}\n description First change`), "description policy verifies its exact field");
const descriptionChange = state.changes().find((change) => change.field === `interfaces.${port}.description`);
const vlanChange = state.changes().find((change) => change.field === `interfaces.${port}.vlan`);
const descriptionRecord = state.verification(port);
assert(descriptionRecord.covered_change_ids.length === 1 && descriptionRecord.covered_change_ids.includes(descriptionChange.change_id) && !descriptionRecord.covered_change_ids.includes(vlanChange.change_id), "description evidence never covers an unrelated field on the same interface");
assert(!state.save("test-same-interface-reject").ok && state.canSave().uncovered_fields.includes(vlanChange.field), "same-interface unverified VLAN blocks save");
assert(state.rollbackChange(state.changes().findIndex((change) => change.change_id === vlanChange.change_id)), "one-change rollback succeeds");
assert(state.canSave().ok, "rolling back the unrelated field preserves valid description coverage");
assert(state.save("test-description-save").ok, "remaining verified description saves successfully");
state.updateInterface(port, { description: "Port A" }, "test-port-a");
state.updateInterface(secondPort, { description: "Port B" }, "test-port-b");
assert(state.verifyInterfaceDescription(secondPort, `show running-config interface ${secondPort}`, `interface ${secondPort}\n description Port B`), "second-interface description verification succeeds");
assert(!state.canSave().ok, "verification of interface B cannot authorize interface A");
assert(state.verifyInterfaceDescription(port, `show running-config interface ${port}`, `interface ${port}\n description Port A`), "first-interface description verification succeeds");
assert(state.canSave().ok && state.save("test-multi-interface-save").ok, "every required pending change must be verified before save");
state.updateInterface(port, { description: "Stale evidence" }, "test-stale-evidence");
assert(state.verifyInterfaceDescription(port, `show running-config interface ${port}`, `interface ${port}\n description Stale evidence`), "fresh evidence records exact current value");
state.updateInterface(port, { description: "Changed again" }, "test-stale-evidence-change");
assert(!state.canSave().ok, "changing the proved field invalidates only its prior verification");
assert(state.verifyInterfaceDescription(port, `show running-config interface ${port}`, `interface ${port}\n description Changed again`) && state.save("test-reverified-save").ok, "reverification enables save after a same-field change");
for (let index = 0; index < 150; index += 1) {
  state.record({ command_id: "read-only-test", canonical_command: "show version", entered_text: "show version", success: true, state_before: { giant: "x".repeat(10000) }, state_after: { giant: "x".repeat(10000) } });
}
assert(!state.eventLog.some((event) => "state_before" in event || "state_after" in event), "event log stores compact records rather than full state snapshots");
state.storeTerminal(Array.from({ length: 150 }, (_, index) => `line ${index} ${"x".repeat(1000)}`), Array.from({ length: 150 }, (_, index) => `show version ${index}`));
assert(state.terminalHistory().length === 120 && JSON.stringify(state.snapshot()).length < 800000, "terminal persistence remains within a compact local-storage budget");
const restored = new Runtime.SharedSwitchState(profile, JSON.parse(store.get(Runtime.STORAGE_KEY)), { command_catalog_version: "test", profile_catalog_version: "test", active_build_version: "test" });
assert(restored.running.interfaces[port].description === "Changed again" && restored.verificationRecords().length > 0, "runtime snapshot persists field-scoped verification records");
const legacySnapshot = JSON.parse(JSON.stringify(state.snapshot()));
legacySnapshot.running.unsaved_changes = [{ field: `${port}.description`, before: "Changed again", after: "Migrated", command_id: "legacy-change" }];
const migrated = new Runtime.SharedSwitchState(profile, legacySnapshot, { command_catalog_version: "test", profile_catalog_version: "test", active_build_version: "test" });
assert(migrated.changes()[0].field === `interfaces.${port}.description` && migrated.changes()[0].verification_required && migrated.changes()[0].verification_status === "required", "legacy pending changes migrate to complete root-scoped verification metadata");

console.log(JSON.stringify({
  suite: "current application",
  active_scripts: activeScripts.length,
  active_styles: activeStyles.length,
  canonical_commands: inventoryFile.commands.length,
  routes: routeFile.routes.length,
  passed: 38
}));
