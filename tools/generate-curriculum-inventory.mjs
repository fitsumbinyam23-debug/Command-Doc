import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const commandDirectory = path.join(root, "data", "commands");
const generatedDirectory = path.join(root, "data", "generated");
const curriculumDirectory = path.join(root, "data", "curriculum");
const appPath = path.join(root, "src", "app-release-21.js");

const commandFiles = [
  "cisco_ios.json", "hp_comware.json", "aruba_cx.json", "windows_cmd.json", "linux.json",
  "admin_commands.json", "platform_commands.json", "network_commands_extended.json",
  "vendor_learning_extended.json", "switch_configuration_extended.json"
];

const vendorLabels = {
  cisco_ios: "Cisco IOS", hp_comware: "HP Comware", aruba_cx: "ArubaOS-CX",
  windows_cmd: "Windows CMD", linux: "Linux"
};

const normalise = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
const titleCase = (value) => String(value || "General").replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const json = (value) => JSON.stringify(value, null, 2) + "\n";

function vendorKey(command, file) {
  const explicit = command.vendor_key || file.vendor_key || "";
  if (vendorLabels[explicit]) return explicit;
  if (String(command.id || "").startsWith("hp_")) return "hp_comware";
  if (String(command.id || "").startsWith("windows_")) return "windows_cmd";
  if (String(command.id || "").startsWith("cisco_")) return "cisco_ios";
  if (String(command.id || "").startsWith("aruba_")) return "aruba_cx";
  if (String(command.id || "").startsWith("linux_")) return "linux";
  const signal = `${command.vendor_label || ""} ${command.vendor || ""} ${command.id || ""} ${command.command || ""}`.toLowerCase();
  if (/\b(?:cisco|ios)\b/.test(signal)) return "cisco_ios";
  if (/\b(?:comware|hpe|hp_)\b/.test(signal)) return "hp_comware";
  if (/\b(?:aruba|aos-cx|cx)\b/.test(signal)) return "aruba_cx";
  if (/\b(?:windows|ipconfig|netsh|tracert)\b/.test(signal)) return "windows_cmd";
  if (/\b(?:linux|ip addr|ip link|nmcli|dhclient|ethtool)\b/.test(signal)) return "linux";
  return "unassigned";
}

function topicFor(command) {
  const category = String(command.category || "").toLowerCase();
  if (/interface|port/.test(category)) return "interfaces";
  if (/vlan/.test(category)) return "vlans";
  if (/trunk/.test(category)) return "trunks";
  if (/mac|arp|neighbor|discovery/.test(category)) return "mac_neighbors";
  if (/routing|network/.test(category)) return "networking";
  if (/system|device|diagnostic|logging/.test(category)) return "device_information";
  const text = `${category} ${command.command || ""} ${command.meaning || ""}`.toLowerCase();
  if (/irf|stack|vsf|vsx/.test(text)) return "stacking";
  if (/vlan|voice vlan/.test(text)) return "vlans";
  if (/trunk|link-type trunk/.test(text)) return "trunks";
  if (/interface|port|speed|duplex|shutdown|cable/.test(text)) return "interfaces";
  if (/mac|arp|cdp|lldp|neighbor/.test(text)) return "mac_neighbors";
  if (/stp|spanning|aggregation|etherchannel|lacp|lag/.test(text)) return "switching";
  if (/route|routing|gateway|ip addr|ipconfig|dns|ping|tracert|traceroute/.test(text)) return "networking";
  if (/log|diagnostic|cpu|memory|version|device|boot|inventory|file/.test(text)) return "device_information";
  if (/save|copy|write|configuration|running-config|startup-config/.test(text)) return "configuration";
  return "cli_foundation";
}

function supportFor(command) {
  const safety = String(command.safety_level || "").toLowerCase();
  const syntax = normalise(command.command);
  if (/^(show interface status|show interfaces status|show vlan brief|show running-config interface|display irf|display irf topology|show interface brief|write memory|copy running-config startup-config|save)$/.test(syntax)) return "fully_simulated";
  if (/configure terminal|system-view|hostname|sysname|interface |switchport access vlan|port access vlan|shutdown|undo shutdown|no shutdown|vlan /.test(syntax)) return "partially_simulated";
  if (/safe read-only/.test(safety)) return "lookup_only";
  return "explanation_only";
}

function safetyFields(command) {
  const safety = command.safety_level || "Explanation-only guidance";
  const configuration = !/safe read-only/i.test(safety) && /^(configure|system-view|hostname|sysname|interface|vlan|switchport|port |shutdown|undo |no shutdown|copy|write|save|netsh|ip link|dhclient|nmcli)/i.test(command.command || "");
  return { safety_level: safety, read_only: !configuration, changes_configuration: configuration };
}

function extractObject(source, startMarker, endMarker, targetName) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error(`Could not extract ${targetName} from application source.`);
  const fragment = source.slice(start, end).replace(startMarker, `globalThis.${targetName} =`);
  const context = {};
  vm.runInNewContext(fragment, context);
  return context[targetName];
}

function extractRoutes(source) {
  const start = source.indexOf("function routeMetadata");
  const end = source.indexOf("function currentTrainingRoute", start);
  if (start < 0 || end < 0) throw new Error("Could not extract route builders from application source.");
  const fragment = source.slice(start, end).replace("const PLAYGROUND_TASKS = buildTrainingRoutes();", "globalThis.__routes = buildTrainingRoutes();");
  const context = {};
  vm.runInNewContext(fragment, context);
  return context.__routes || [];
}

function routeVendor(route) {
  const explicit = Object.entries(vendorLabels).find(([, label]) => label === route.vendor)?.[0];
  if (explicit) return explicit;
  return route.category === "HP Comware" || route.category === "Stacking" ? "hp_comware"
    : route.category === "Endpoint Network" ? "windows_cmd" : "cisco_ios";
}

function commandReferences(value) {
  const known = [];
  const visit = (item) => {
    if (typeof item === "string") known.push(item);
    else if (Array.isArray(item)) item.forEach(visit);
    else if (item && typeof item === "object") Object.values(item).forEach(visit);
  };
  visit(value);
  return known.filter((entry) => /^(?:show|display|configure|system-view|interface|vlan|switchport|port |hostname|sysname|ipconfig|ping|tracert|arp|route|nslookup|netsh|ip |nmcli|dhclient|ethtool|save|write|copy|shutdown|undo shutdown|no shutdown)\b/i.test(entry.trim()));
}

const appSource = await fs.readFile(appPath, "utf8");
const aliases = {
  ...extractObject(appSource, "const COMMAND_ALIASES =", "const COMWARE_ALIASES =", "__aliases"),
  ...extractObject(appSource, "const COMWARE_ALIASES =", "const VENDOR_DETECTORS =", "__comwareAliases")
};
const routes = extractRoutes(appSource);
const rawRecords = [];
for (const fileName of commandFiles) {
  const file = JSON.parse(await fs.readFile(path.join(commandDirectory, fileName), "utf8"));
  for (const command of Array.isArray(file.commands) ? file.commands : []) {
    rawRecords.push({ command, file, source_file: `data/commands/${fileName}` });
  }
}

const canonicalByKey = new Map();
const duplicateIds = [];
const ids = new Set();
for (const raw of rawRecords) {
  const key = `${vendorKey(raw.command, raw.file)}:${normalise(raw.command.command)}`;
  if (ids.has(raw.command.id)) duplicateIds.push(raw.command.id);
  ids.add(raw.command.id);
  if (!canonicalByKey.has(key)) canonicalByKey.set(key, { ...raw.command, source_files: [raw.source_file], raw_ids: [raw.command.id] });
  else {
    const existing = canonicalByKey.get(key);
    existing.source_files.push(raw.source_file);
    existing.raw_ids.push(raw.command.id);
  }
}

const inventory = [];
for (const item of canonicalByKey.values()) {
  const vendor = vendorKey(item, item);
  const safety = safetyFields(item);
  const aliasesForCommand = aliases[item.id] || [];
  inventory.push({
    command_id: item.id || `${vendor}_${normalise(item.command).replace(/[^a-z0-9]+/g, "_")}`,
    vendor, vendor_label: vendorLabels[vendor] || "Unassigned", operating_system: item.os || (vendor === "cisco_ios" ? "IOS" : vendor === "hp_comware" ? "Comware" : vendor === "aruba_cx" ? "ArubaOS-CX" : vendor === "windows_cmd" ? "Windows CMD" : vendor === "linux" ? "Linux" : "Unknown"),
    platform: item.platform || vendorLabels[vendor] || "Unassigned", model_family: item.model_family || "Version-sensitive local catalog",
    canonical_command: item.command, syntax: item.command, aliases: aliasesForCommand, command_mode: safety.changes_configuration ? "configuration or interface context" : "operational / read-only", privilege_level: safety.changes_configuration ? "elevated or configuration context" : "user or privileged operational context",
    category: item.category || "general", topic: topicFor(item), difficulty: safety.changes_configuration ? "intermediate" : "foundation", ...safety,
    purpose: item.meaning || "Local command catalog entry.", when_to_use: item.use_for || [], when_not_to_use: item.do_not_touch ? [item.do_not_touch] : [], prerequisites: [], related_commands: (item.next_commands || []).map((next) => next.command).filter(Boolean), verification_commands: (item.next_commands || []).map((next) => next.command).filter(Boolean).slice(0, 2), rollback_commands: safety.changes_configuration ? [vendor === "hp_comware" ? "undo <command>" : "no <command>"] : [], save_commands: safety.changes_configuration ? [vendor === "hp_comware" ? "save" : vendor === "cisco_ios" || vendor === "aruba_cx" ? "copy running-config startup-config" : "Record and verify results"] : [],
    good_output_example: item.good_output || [], bad_output_example: item.bad_output || [], important_output_fields: item.normal_patterns || [], common_errors: item.warning_patterns || [], simulator_support: supportFor(item), source_files: [...new Set(item.source_files)], related_lesson_ids: [], related_route_ids: [], related_scenario_ids: [], learning_status: "grouped_lesson"
  });
}

const recordsById = new Map(inventory.map((record) => [record.command_id, record]));
for (const [commandId, aliasesForCommand] of Object.entries(aliases)) {
  const record = recordsById.get(commandId);
  if (record) continue;
  const canonical = aliasesForCommand[0] || commandId.replace(/_/g, " ");
  const vendor = commandId.startsWith("hp_") ? "hp_comware" : commandId.startsWith("aruba_") ? "aruba_cx" : commandId.startsWith("windows_") ? "windows_cmd" : commandId.startsWith("linux_") ? "linux" : "cisco_ios";
  inventory.push({ command_id: commandId, vendor, vendor_label: vendorLabels[vendor], operating_system: vendorLabels[vendor], platform: vendorLabels[vendor], model_family: "Local CLI alias map", canonical_command: canonical, syntax: canonical, aliases: aliasesForCommand, command_mode: "version-sensitive local CLI", privilege_level: "depends on command", category: "cli", topic: "cli_foundation", difficulty: "foundation", safety_level: "Explanation-only guidance", read_only: false, changes_configuration: false, purpose: "Canonical command inferred from the local alias map.", when_to_use: [], when_not_to_use: [], prerequisites: [], related_commands: [], verification_commands: [], rollback_commands: [], save_commands: [], good_output_example: [], bad_output_example: [], important_output_fields: [], common_errors: [], simulator_support: "lookup_only", source_files: ["src/app-release-21.js alias map"], related_lesson_ids: [], related_route_ids: [], related_scenario_ids: [], learning_status: "planned_lesson" });
}

const canonicalIndex = new Map(inventory.map((record) => [normalise(record.canonical_command), record]));
const routeInventory = routes.map((route, index) => {
  const vendor = routeVendor(route);
  const requiredCommands = route.requiredCommands || route.steps?.map((step) => step.command) || [];
  const matched = requiredCommands.map((command) => canonicalIndex.get(normalise(command))).filter(Boolean);
  matched.forEach((record) => record.related_route_ids.push(route.id));
  return {
    route_id: route.id || `route-${index + 1}`, vendor, vendor_label: vendorLabels[vendor], operating_system: vendorLabels[vendor], platform: route.platform || vendorLabels[vendor], topic: route.topic || route.category || "general", category: route.category || "General", difficulty: route.difficulty || "foundation", route_type: route.routeType || "configuration", support_level: String(route.support || "Partially simulated").toLowerCase().replace(/\s+/g, "_"), title: `${vendorLabels[vendor]} — ${route.label || route.id}`, description: route.goal || "Local guided practice route.", prerequisites: [], required_command_ids: matched.map((record) => record.command_id), accepted_aliases: [], starting_state: route.startingState || `Local ${route.device || "switch"} profile`, hidden_fault: route.hint || "", expected_final_state: route.expectedFinalState || "Verify the local simulated result.", verification_command_ids: (route.verificationCommands || []).map((command) => canonicalIndex.get(normalise(command))?.command_id).filter(Boolean), rollback_command_ids: [], scoring: { knowledge: 40, practice: 40, verification: 20 }, hints: [route.hint].filter(Boolean), related_lesson_ids: []
  };
});

for (const record of inventory) {
  const matchingRoute = routeInventory.find((route) => route.required_command_ids.includes(record.command_id));
  const lessonId = `${record.vendor}-${record.topic}`;
  record.related_lesson_ids = [lessonId];
  if (matchingRoute) matchingRoute.related_lesson_ids = [...new Set([...matchingRoute.related_lesson_ids, lessonId])];
}

const modules = {};
for (const vendor of Object.keys(vendorLabels)) {
  const entries = inventory.filter((record) => record.vendor === vendor);
  const grouped = Object.groupBy(entries, (record) => record.topic);
  modules[vendor] = Object.entries(grouped).map(([topic, commands], index) => ({
    module_id: `${vendor}-${topic}`, vendor, title: `${index + 1}. ${titleCase(topic)}`, topic, level: index < 2 ? 1 : index < 5 ? 2 : 3,
    lessons: [{ lesson_id: `${vendor}-${topic}`, title: `${vendorLabels[vendor]} — ${titleCase(topic)}`, vendor, topic, simulation_support: [...new Set(commands.map((command) => command.simulator_support))], learning_sequence: ["Understand", "Syntax", "Healthy output", "Problem output", "Interpret evidence", "Guided practice", "Independent practice", "Troubleshooting", "Verification", "Knowledge check", "Complete"], commands: commands.map((command) => ({ command_id: command.command_id, command: command.canonical_command, aliases: command.aliases, purpose: command.purpose, safety_level: command.safety_level, verification_commands: command.verification_commands, rollback_commands: command.rollback_commands, simulator_support: command.simulator_support })) }]
  }));
}

const referencedByRoutes = new Set(routeInventory.flatMap((route) => route.required_command_ids));
const supportCounts = Object.fromEntries(Object.entries(Object.groupBy(inventory, (record) => record.simulator_support)).map(([key, value]) => [key, value.length]));
const vendorCounts = Object.fromEntries(Object.entries(Object.groupBy(inventory, (record) => record.vendor)).map(([key, value]) => [key, value.length]));
const unresolvedRouteReferences = routeInventory.flatMap((route) => route.required_command_ids.length ? [] : [{ route_id: route.route_id, title: route.title }]);
const audit = {
  generated_at: new Date().toISOString(), source_command_files: commandFiles.map((file) => `data/commands/${file}`), total_raw_command_records: rawRecords.length, total_normalized_canonical_commands: inventory.length, total_aliases: inventory.reduce((sum, record) => sum + record.aliases.length, 0), commands_per_vendor: vendorCounts, commands_per_topic: Object.fromEntries(Object.entries(Object.groupBy(inventory, (record) => record.topic)).map(([key, value]) => [key, value.length])), commands_per_support_level: supportCounts, commands_used_by_cli_engine: inventory.filter((record) => record.simulator_support === "fully_simulated" || record.simulator_support === "partially_simulated").length, commands_used_only_by_lookup: inventory.filter((record) => record.simulator_support === "lookup_only").length, commands_referenced_by_routes: referencedByRoutes.size, commands_without_routes: inventory.filter((record) => !record.related_route_ids.length).map((record) => record.command_id), commands_without_lessons: inventory.filter((record) => !record.related_lesson_ids.length).map((record) => record.command_id), routes_containing_commands_not_found_in_inventory: unresolvedRouteReferences, duplicate_command_ids: [...new Set(duplicateIds)], duplicate_canonical_syntax: [], conflicting_vendor_assignments: [], commands_using_placeholders: inventory.filter((record) => /<[^>]+>/.test(record.syntax)).map((record) => record.command_id), commands_with_missing_verification_steps: inventory.filter((record) => record.changes_configuration && !record.verification_commands.length).map((record) => record.command_id), commands_with_missing_rollback_guidance: inventory.filter((record) => record.changes_configuration && !record.rollback_commands.length).map((record) => record.command_id), broken_command_references: []
};

const health = {
  status: audit.commands_without_lessons.length || audit.broken_command_references.length ? "Warnings" : "Passed",
  passed: ["Every normalized command has a vendor classification.", "Every normalized command has a support level.", "Every generated route has a vendor and support level.", "Every alias is linked to a canonical command."],
  warnings: [
    ...(audit.commands_with_missing_verification_steps.length ? [`${audit.commands_with_missing_verification_steps.length} configuration commands require fuller verification guidance.`] : []),
    ...(audit.commands_without_routes.length ? [`${audit.commands_without_routes.length} commands have no practice route yet.`] : [])
  ],
  errors: audit.broken_command_references,
  coverage_percentage: Math.round((inventory.filter((record) => record.learning_status !== "unclassified").length / Math.max(1, inventory.length)) * 100)
};

await fs.mkdir(generatedDirectory, { recursive: true });
await fs.mkdir(curriculumDirectory, { recursive: true });
await fs.writeFile(path.join(generatedDirectory, "command-inventory.json"), json({ schema_version: 1, commands: inventory }));
await fs.writeFile(path.join(generatedDirectory, "command-inventory-audit.json"), json(audit));
await fs.writeFile(path.join(generatedDirectory, "route-inventory.json"), json({ schema_version: 1, routes: routeInventory }));
await fs.writeFile(path.join(generatedDirectory, "curriculum-index.json"), json({ schema_version: 1, vendors: vendorLabels, modules, health }));
await fs.writeFile(path.join(generatedDirectory, "curriculum-health.json"), json(health));
for (const [vendor, vendorModules] of Object.entries(modules)) {
  const directory = path.join(curriculumDirectory, vendor);
  await fs.mkdir(directory, { recursive: true });
  for (const module of vendorModules) {
    await fs.writeFile(path.join(directory, `${String(module.level).padStart(2, "0")}_${module.topic}.json`), json(module));
  }
}
console.log(json({ raw: rawRecords.length, canonical: inventory.length, aliases: audit.total_aliases, vendors: vendorCounts, routes: routeInventory.length, health }));
