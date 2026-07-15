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
const runtimeHandlerCommands = [
  { command_id: "runtime_end", canonical_command: "end", vendor_id: "cisco_ios", compatible_os_family_ids: ["cisco_ios"], available_modes: [], required_privilege: "enable", simulator_support: "full_state_simulation" },
  { command_id: "runtime_enter_config_aruba", canonical_command: "configure terminal", aliases: ["conf t"], vendor_id: "aruba_cx", compatible_os_family_ids: ["arubaos_cx"], available_modes: [], required_privilege: "enable", simulator_support: "full_state_simulation" },
  { command_id: "runtime_end_aruba", canonical_command: "end", vendor_id: "aruba_cx", compatible_os_family_ids: ["arubaos_cx"], available_modes: [], required_privilege: "enable", simulator_support: "full_state_simulation" },
  { command_id: "runtime_interface_aruba", canonical_command: "interface <interface>", vendor_id: "aruba_cx", compatible_os_family_ids: ["arubaos_cx"], available_modes: ["config"], required_privilege: "enable", simulator_support: "full_state_simulation" },
  { command_id: "runtime_enter_config_comware", canonical_command: "system-view", vendor_id: "hp_comware", compatible_os_family_ids: ["hp_comware"], available_modes: [], required_privilege: "enable", simulator_support: "full_state_simulation" },
  { command_id: "runtime_return_comware", canonical_command: "return", vendor_id: "hp_comware", compatible_os_family_ids: ["hp_comware"], available_modes: [], required_privilege: "enable", simulator_support: "full_state_simulation" },
  { command_id: "runtime_interface_comware", canonical_command: "interface <interface>", vendor_id: "hp_comware", compatible_os_family_ids: ["hp_comware"], available_modes: ["config"], required_privilege: "enable", simulator_support: "full_state_simulation" },
  { command_id: "runtime_interface_description", canonical_command: "description <free_text>", vendor_id: "cisco_ios", compatible_os_family_ids: ["cisco_ios"], available_modes: ["interface"], required_privilege: "enable", simulator_support: "full_state_simulation" },
  { command_id: "runtime_interface_description_comware", canonical_command: "description <free_text>", vendor_id: "hp_comware", compatible_os_family_ids: ["hp_comware"], available_modes: ["interface"], required_privilege: "enable", simulator_support: "full_state_simulation" },
  { command_id: "runtime_interface_description_aruba", canonical_command: "description <free_text>", vendor_id: "aruba_cx", compatible_os_family_ids: ["arubaos_cx"], available_modes: ["interface"], required_privilege: "enable", simulator_support: "full_state_simulation" },
  { command_id: "runtime_verify_interface_cisco", canonical_command: "show running-config interface <interface>", vendor_id: "cisco_ios", compatible_os_family_ids: ["cisco_ios"], available_modes: [], required_privilege: "enable", simulator_support: "full_state_simulation" },
  { command_id: "runtime_verify_interface_aruba", canonical_command: "show running-config interface <interface>", vendor_id: "aruba_cx", compatible_os_family_ids: ["arubaos_cx"], available_modes: [], required_privilege: "enable", simulator_support: "full_state_simulation" },
  { command_id: "runtime_verify_interface_comware", canonical_command: "display current-configuration interface <interface>", vendor_id: "hp_comware", compatible_os_family_ids: ["hp_comware"], available_modes: [], required_privilege: "enable", simulator_support: "full_state_simulation" }
];
let sharedRuntimeRegistry = null;
const runtimeRegistryFor = (candidateProfile) => {
  if (!sharedRuntimeRegistry) sharedRuntimeRegistry = new Runtime.CommandRegistry([...inventoryFile.commands, ...runtimeHandlerCommands], candidateProfile);
  else sharedRuntimeRegistry.setProfile(candidateProfile);
  return sharedRuntimeRegistry;
};
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
  const candidateRegistry = runtimeRegistryFor(candidateProfile);
  assert(candidateRegistry.catalog.every((command) => normalizedSupportLevels.has(command.simulator_support)), `support levels normalize for ${candidateProfile.profile_id}`);
  const modeBoundCommand = candidateRegistry.catalog.find((command) => command.available_modes?.length);
  if (modeBoundCommand) assert(candidateRegistry.resolve(substitute(modeBoundCommand.canonical_command, candidateProfile), { mode: "exec", privilege: "privileged" }).status === "wrong_mode", `wrong mode remains explicit for ${candidateProfile.profile_id}`);
  const enterConfiguration = candidateProfile.vendor === "hp_comware" ? "system-view" : "configure terminal";
  assert(candidateRegistry.resolve(enterConfiguration, { mode: "exec", privilege: "privileged" }).status === "matched", `configuration entry resolves without ambiguity for ${candidateProfile.profile_id}`);
  const interfaceName = candidateProfile.interface_naming.replace("{port}", "1");
  const interfaceResolution = candidateRegistry.resolve(`interface ${interfaceName}`, { mode: "config", privilege: "privileged" });
  assert(interfaceResolution.status === "matched", `interface navigation resolves once for ${candidateProfile.profile_id}`);
  assert(!String(interfaceResolution.command.command_id).includes("workbench"), `interface navigation never uses a synthetic Workbench command for ${candidateProfile.profile_id}`);
  const prefixHelp = candidateRegistry.help("i", { mode: "config", privilege: "privileged" });
  assert(prefixHelp.some((item) => item.token === "interface"), `keyword-prefix help includes interface for ${candidateProfile.profile_id}`);
}
for (const candidateProfile of profiles) {
  const augmentedRegistry = runtimeRegistryFor(candidateProfile);
  const report = augmentedRegistry.mergeReport;
  assert(report.records_merged >= 0 && Array.isArray(report.handler_chosen), `normalization merge report is available for ${candidateProfile.profile_id}`);
  const exactInterface = augmentedRegistry.commands.filter((command) => command.vendor_id === candidateProfile.vendor && command.canonical_command === "interface <interface>" && command.available_modes.includes("config"));
  assert(exactInterface.length === 1, `normalized effective interface grammar is unique for ${candidateProfile.profile_id}`);
}
assert((await read("src/app-release-21.js")).includes('const ACTIVE_BUILD_VERSION = "2026.07-runtime-rc.2"'), "runtime reports the current RC build identity");
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
  const candidateRegistry = runtimeRegistryFor(candidateProfile);
  const saveAliases = [...new Set(candidateRegistry.catalog.flatMap((command) => [command.canonical_command, ...(command.aliases || [])]).filter((syntax) => /^(write memory|wr mem|write mem|copy running-config startup-config|save|save force)$/i.test(syntax)))];
  assert(saveAliases.length > 0, `active save aliases exist for ${candidateProfile.profile_id}`);
  candidateState.updateInterface(candidatePort, { description: "Save gate test" }, "save-gate-test");
  const startupBeforeSave = candidateState.startup.interfaces[candidatePort].description;
  for (const alias of saveAliases) {
    const rejected = candidateState.save(alias);
    assert(!rejected.ok && candidateState.startup.interfaces[candidatePort].description === startupBeforeSave && candidateState.changes().length === 1, `save alias ${alias} uses the authoritative rejection gate for ${candidateProfile.profile_id}`);
  }
  const verificationCommand = candidateProfile.vendor === "hp_comware" ? `display current-configuration interface ${candidatePort}` : `show running-config interface ${candidatePort}`;
  assert(candidateState.verificationTargetForCommand(verificationCommand)?.interface_name === candidatePort, `verification policy recognizes ${verificationCommand} for ${candidateProfile.profile_id}`);
  const verificationResolution = candidateRegistry.resolve(verificationCommand, { mode: "exec", privilege: "privileged" });
  assert(verificationResolution.status === "matched", `verification command resolves for ${candidateProfile.profile_id}`);
  assert(candidateState.verifyInterfaceDescription(candidatePort, verificationCommand, `interface ${candidatePort}\n description Save gate test`, verificationResolution.command), `field-scoped verification works for ${candidateProfile.profile_id}`);
  assert(candidateState.save(saveAliases[0], { entered_text: saveAliases[0], canonical_command: candidateRegistry.resolve(saveAliases[0], { mode: "exec", privilege: "privileged" }).command.canonical_command }).ok && candidateState.startup.interfaces[candidatePort].description === "Save gate test", `verified save alias succeeds for ${candidateProfile.profile_id}`);
  assert(candidateState.eventLog.at(-1).entered_text === saveAliases[0], `save event retains actual entered text for ${candidateProfile.profile_id}`);
}
const activeAppSource = await read("src/app-release-21.js");
assert(activeAppSource.includes("const isSaveRequest") && activeAppSource.includes("const saved = shared.save(commandId, commandEventMetadata"), "terminal save aliases invoke the shared authoritative save gate");
assert(activeAppSource.includes("vendor_id: route.vendor") && activeAppSource.includes("const routeVendorId = route.vendor_id || route.vendor"), "route vendor IDs remain machine-readable through launch selection");
assert(activeAppSource.includes("output: saved.message") && activeAppSource.includes("verificationTargetForCommand(command)"), "terminal save feedback and verification use authoritative shared-state results");
assert(!activeAppSource.includes("internalSequenceCommand") && !activeAppSource.includes("runtime-workbench-comware"), "Workbench has no parser bypass or synthetic command identity");
assert(activeAppSource.includes("pendingChangePathsSince") && activeAppSource.includes("syncRuntimeFromEngine(engine, commandId, command)"), "terminal event deltas use authoritative shared pending changes");

const state = new Runtime.SharedSwitchState(profile, null, { command_catalog_version: "test", profile_catalog_version: "test", active_build_version: "test" });
assert(state.running.session.verification_records && typeof state.running.session.verification_records === "object" && !Array.isArray(state.running.session.verification_records), "fresh runtime state initializes a usable verification record map");
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
assert(!state.changes().some((change) => change.field === vlanChange.field), "one-change rollback removes exactly the restored pending change without creating another");
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
assert(restored.running.session.verification_records && typeof restored.running.session.verification_records === "object" && !Array.isArray(restored.running.session.verification_records), "restored runtime snapshot preserves a usable verification record map");
assert(restored.running.interfaces[port].description === "Changed again" && restored.verificationRecords().length > 0, "runtime snapshot persists field-scoped verification records");
const legacySnapshot = JSON.parse(JSON.stringify(state.snapshot()));
delete legacySnapshot.running.session.verification_records;
legacySnapshot.running.unsaved_changes = [{ field: `${port}.description`, before: "Changed again", after: "Migrated", command_id: "legacy-change" }];
const migrated = new Runtime.SharedSwitchState(profile, legacySnapshot, { command_catalog_version: "test", profile_catalog_version: "test", active_build_version: "test" });
assert(migrated.running.session.verification_records && typeof migrated.running.session.verification_records === "object" && !Array.isArray(migrated.running.session.verification_records), "migrated legacy snapshot initializes a usable verification record map");
assert(migrated.changes()[0].field === `interfaces.${port}.description` && migrated.changes()[0].verification_required && migrated.changes()[0].verification_status === "required", "legacy pending changes migrate to complete root-scoped verification metadata");
const retentionState = new Runtime.SharedSwitchState(profile, null, { command_catalog_version: "test", profile_catalog_version: "test", active_build_version: "test" });
const retentionPort = Object.keys(retentionState.running.interfaces)[0];
for (let index = 0; index < Runtime.MAX_VERIFICATION_RECORDS + 25; index += 1) {
  retentionState.running.session.verification_records[`retention-${index}`] = { verification_id: `retention-${index}`, timestamp: new Date(2026, 0, 1, 0, 0, index).toISOString(), covered_change_ids: [], result: "passed" };
}
retentionState.compactVerificationRecords();
assert(retentionState.verificationRecords().length <= Runtime.MAX_VERIFICATION_RECORDS, "verification history remains bounded for long-lived local sessions");

let completionChecks = 0;
const completeCheck = (condition, message) => {
  completionChecks += 1;
  assert(condition, message);
};
const commandText = (parts) => parts.filter(Boolean).join(" ");
const profileInterfaceNames = (profile) => Array.from({ length: profile.access_port_count || 0 }, (_, index) => profile.interface_naming.replace("{port}", index + 1));
const tokenCompletionValues = (token, profile) => {
  if (token.type === "literal") return [token.value];
  if (token.type === "choice") return token.values;
  if (token.name === "interface") return profileInterfaceNames(profile);
  return [];
};
const nextCompletionValues = (syntax, value, profile) => {
  const entered = String(value || "").trim().split(/\s+/).filter(Boolean);
  const nodes = Runtime.compileGrammar(syntax).nodes || [];
  let inputIndex = 0;
  for (const token of nodes) {
    const current = entered[inputIndex];
    if (current === undefined) {
      if (token.optional) continue;
      return tokenCompletionValues(token, profile);
    }
    if (token.type === "free_text") return [];
    if (token.type === "literal" && Runtime.normalise(current) !== token.value) return [];
    if (token.type === "choice" && !token.values.includes(Runtime.normalise(current))) return [];
    if (!["literal", "choice"].includes(token.type) && !Runtime.validateParameterDetail(token.type, current, profile).ok) return [];
    inputIndex += token.repeated ? entered.length - inputIndex : 1;
    if (token.repeated) break;
  }
  return inputIndex < entered.length ? [] : [];
};
const completionValues = (registry, value, context) => [...new Set(registry.catalog
  .filter((command) => registry.availability(command, context.mode, context.privilege).available)
  .flatMap((command) => [command.canonical_command, ...(command.aliases || [])].flatMap((syntax) => nextCompletionValues(syntax, value, registry.profile)))
  .map(String)
  .filter(Boolean))];
const commonPrefix = (values) => values.reduce((prefixValue, value) => { let index = 0; while (index < prefixValue.length && index < value.length && prefixValue[index].toLowerCase() === value[index].toLowerCase()) index += 1; return prefixValue.slice(0, index); });
const normalizedIncludes = (values, value) => values.some((candidate) => Runtime.normalise(candidate) === Runtime.normalise(value));
const mentionsCompletion = (completion, value) => typeof completion === "string"
  ? Runtime.normalise(completion).split(/\s+/).includes(Runtime.normalise(value)) || Runtime.normalise(completion).endsWith(Runtime.normalise(value))
  : completion?.candidates?.some((candidate) => Runtime.normalise(candidate) === Runtime.normalise(value));
const assertCleanCompletion = (completion, message) => completeCheck(!String(typeof completion === "string" ? completion : JSON.stringify(completion)).includes("[object Object]"), message);
const findUniqueCase = (registry, base, context, preferredValues = completionValues(registry, base, context)) => {
  const values = completionValues(registry, base, context);
  for (const value of preferredValues) {
    for (let length = 1; length < value.length; length += 1) {
      const prefix = value.slice(0, length);
      const matches = values.filter((candidate) => Runtime.normalise(candidate).startsWith(Runtime.normalise(prefix)));
      if (matches.length === 1) return { input: commandText([base, prefix]), expected: commandText([base, value]), token: value };
    }
  }
  return null;
};
const findSharedPrefixCase = (registry, base, context) => {
  const values = completionValues(registry, base, context);
  for (const value of values) {
    for (let length = 1; length < value.length; length += 1) {
      const prefix = value.slice(0, length);
      const matches = values.filter((candidate) => Runtime.normalise(candidate).startsWith(Runtime.normalise(prefix)));
      const shared = matches.length > 1 ? commonPrefix(matches) : "";
      if (shared.length > prefix.length) return { input: commandText([base, prefix]), expected: commandText([base, shared]), prefix, shared, matches };
    }
  }
  return null;
};
const findNoProgressCase = (registry, base, context) => {
  const values = completionValues(registry, base, context);
  for (const value of values) {
    for (let length = 1; length <= value.length; length += 1) {
      const prefix = value.slice(0, length);
      const matches = values.filter((candidate) => Runtime.normalise(candidate).startsWith(Runtime.normalise(prefix)));
      if (matches.length > 1 && Runtime.normalise(commonPrefix(matches)) === Runtime.normalise(prefix)) return { input: commandText([base, prefix]), prefix, matches };
    }
  }
  return null;
};

let uniqueCompletionCoverage = 0;
let sharedPrefixCoverage = 0;
let noProgressCoverage = 0;
let interfaceCompletionCoverage = 0;
let modeCompletionCoverage = 0;
let profileCompletionCoverage = 0;
let aliasCompletionCoverage = 0;

for (const candidateProfile of profiles) {
  const candidateRegistry = runtimeRegistryFor(candidateProfile);
  const execContext = { mode: "exec", privilege: "privileged" };
  const configContext = { mode: "config", privilege: "privileged" };
  const rootValues = completionValues(candidateRegistry, "", execContext);
  const branchBase = rootValues.find((value) => completionValues(candidateRegistry, value, execContext).length > 1);
  completeCheck(Boolean(branchBase), `completion branch exists for ${candidateProfile.profile_id}`);

  const uniqueCase = findUniqueCase(candidateRegistry, "", execContext);
  if (uniqueCase) {
    uniqueCompletionCoverage += 1;
    completeCheck(candidateRegistry.complete(uniqueCase.input, execContext) === uniqueCase.expected, `unique keyword completion extends input for ${candidateProfile.profile_id}`);
  }

  const sharedCase = findSharedPrefixCase(candidateRegistry, branchBase, execContext);
  if (sharedCase) {
    sharedPrefixCoverage += 1;
    completeCheck(candidateRegistry.complete(sharedCase.input, execContext) === sharedCase.expected, `shared-prefix completion extends only to the common prefix for ${candidateProfile.profile_id}`);
  }

  const noProgressCase = findNoProgressCase(candidateRegistry, branchBase, execContext) || { input: branchBase };
  const noProgress = candidateRegistry.complete(noProgressCase.input, execContext);
  noProgressCoverage += 1;
  completeCheck(noProgress?.status === "ambiguous" && Array.isArray(noProgress.candidates) && noProgress.candidates.every((candidate) => typeof candidate === "string"), `no-progress completion returns readable candidates for ${candidateProfile.profile_id}`);
  completeCheck(noProgress !== noProgressCase.input && !String(noProgress?.common_prefix || "").endsWith(" "), `no-progress completion never returns unchanged input or a trailing space for ${candidateProfile.profile_id}`);

  const firstInterface = candidateProfile.interface_naming.replace("{port}", "1");
  const interfacePrefix = firstInterface.slice(0, 1);
  const interfaceExpected = `interface ${commonPrefix(profileInterfaceNames(candidateProfile).filter((name) => Runtime.normalise(name).startsWith(Runtime.normalise(interfacePrefix))))}`;
  const interfaceCompletion = candidateRegistry.complete(`interface ${interfacePrefix}`, configContext);
  interfaceCompletionCoverage += 1;
  completeCheck(typeof interfaceCompletion === "string" && interfaceCompletion === interfaceExpected, `interface-name completion extends dynamic interface values for ${candidateProfile.profile_id}`);

  const execModeValues = completionValues(candidateRegistry, "", execContext);
  const configModeValues = completionValues(candidateRegistry, "", configContext);
  const configOnlyValues = configModeValues.filter((value) => !normalizedIncludes(execModeValues, value));
  const modeCase = configOnlyValues.map((value) => findUniqueCase(candidateRegistry, "", configContext, [value])).find(Boolean);
  if (modeCase) {
    modeCompletionCoverage += 1;
    const modeCompletion = candidateRegistry.complete(modeCase.input, configContext);
    const wrongModeCompletion = candidateRegistry.complete(modeCase.input, execContext);
    completeCheck(modeCompletion === modeCase.expected && !mentionsCompletion(wrongModeCompletion, modeCase.token), `mode-sensitive completion respects CLI mode for ${candidateProfile.profile_id}`);
  }

  const otherProfile = profiles.find((other) => other.vendor !== candidateProfile.vendor);
  if (otherProfile) {
    const otherRegistry = new Runtime.CommandRegistry([...inventoryFile.commands, ...runtimeHandlerCommands], otherProfile);
    const otherValues = completionValues(otherRegistry, "", execContext);
    const profileOnly = rootValues.find((value) => !normalizedIncludes(otherValues, value));
    const otherOnly = otherValues.find((value) => !normalizedIncludes(rootValues, value));
    const profileRootCompletion = candidateRegistry.complete("", execContext);
    if (profileOnly || otherOnly) {
      profileCompletionCoverage += 1;
      completeCheck(profileRootCompletion?.status === "ambiguous" && profileRootCompletion.candidates.every((candidate) => normalizedIncludes(rootValues, candidate)), `profile-sensitive completion returns active-catalog candidates for ${candidateProfile.profile_id}`);
      if (otherOnly) completeCheck(!profileRootCompletion.candidates.some((candidate) => Runtime.normalise(candidate) === Runtime.normalise(otherOnly)), `profile-sensitive completion excludes other-vendor candidate ${otherOnly} for ${candidateProfile.profile_id}`);
    }
  }

  const aliasCases = candidateRegistry.catalog
    .flatMap((command) => (command.aliases || []).map((alias) => ({ command, alias, context: { mode: command.available_modes[0] || "exec", privilege: "privileged" } })));
  const aliasCase = aliasCases.find(({ alias, context }) => {
    const parts = alias.split(/\s+/).filter(Boolean);
    return parts.some((part, index) => {
      for (let length = 1; length < part.length; length += 1) {
        const input = commandText([...parts.slice(0, index), part.slice(0, length)]);
        const completion = candidateRegistry.complete(input, context);
        if (typeof completion === "string" && Runtime.normalise(completion).startsWith(Runtime.normalise(commandText([...parts.slice(0, index), part])))) return true;
      }
      return false;
    });
  });
  if (aliasCase) {
    aliasCompletionCoverage += 1;
    completeCheck(Boolean(aliasCase), `alias completion works for ${candidateProfile.profile_id}`);
  }

  const noMatch = candidateRegistry.complete("__no_such_command__", execContext);
  completeCheck(noMatch === null || noMatch?.status === "unknown", `no-match completion stays explicit for ${candidateProfile.profile_id}`);
  [uniqueCase && candidateRegistry.complete(uniqueCase.input, execContext), noProgress, interfaceCompletion, noMatch].forEach((completion, index) => assertCleanCompletion(completion, `completion result ${index} avoids object-string insertion for ${candidateProfile.profile_id}`));
}

completeCheck(uniqueCompletionCoverage > 0, "completion matrix includes at least one unique-extension case");
completeCheck(sharedPrefixCoverage > 0, "completion matrix includes at least one shared-prefix case");
completeCheck(noProgressCoverage > 0, "completion matrix includes no-progress ambiguity coverage");
completeCheck(interfaceCompletionCoverage === profiles.length, "completion matrix covers interface-name completion for every active profile");
completeCheck(modeCompletionCoverage > 0, "completion matrix includes mode-sensitive completion coverage");
completeCheck(profileCompletionCoverage > 0, "completion matrix includes profile-sensitive completion coverage");
completeCheck(aliasCompletionCoverage > 0, "completion matrix includes alias completion coverage");

assert(activeAppSource.includes("const fallback = registry ? null") && activeAppSource.includes('completion?.status === "ambiguous"') && activeAppSource.includes("input.focus()"), "terminal Tab ambiguity uses the existing toast path while preserving input and focus");
assert(!activeAppSource.includes("`${completion} `") && !activeAppSource.includes("[object Object]"), "terminal Tab handling never inserts object text into the input");

console.log(JSON.stringify({
  suite: "current application",
  active_scripts: activeScripts.length,
  active_styles: activeStyles.length,
  canonical_commands: inventoryFile.commands.length,
  routes: routeFile.routes.length,
  passed: 73 + completionChecks + 2
}));
