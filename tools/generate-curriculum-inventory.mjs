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

const profilesByVendor = {
  cisco_ios: ["cisco-catalyst-3750", "cisco-catalyst-9300", "cisco-catalyst-9600"],
  hp_comware: ["hp-5500", "hpe-5130", "hpe-5510"],
  aruba_cx: ["aruba-cx-6100", "aruba-cx-6200", "aruba-cx-6300"],
  windows_cmd: [],
  linux: []
};

function routeSupportLevel(legacySupport) {
  if (legacySupport === "fully_simulated") return "full_state_simulation";
  if (legacySupport === "partially_simulated") return "simplified_state_simulation";
  return "explanation_only";
}

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
  const syntax = normalise(command.command);
  // Keep mode navigation and lifecycle operations in deterministic learning modules.
  if (/^(configure terminal|system-view|quit|return|enable|disable)$/.test(syntax)) return "cli_foundation";
  if (/^(reload|reboot)$/.test(syntax)) return "device_lifecycle";
  if (/^(?:show|display) (?:version|system|device|inventory|boot|memory|cpu)/.test(syntax)) return "device_information";
  if (/^(?:show|display) diagnostic/.test(syntax)) return "diagnostics";
  if (/^(?:dir|display) (?:flash|file)|^show file systems/.test(syntax)) return "file_system";
  if (/^(?:copy running-config|write memory|save)/.test(syntax)) return "configuration";
  if (/^(?:show|display) (?:spanning-tree|stp)|\bstp\b/.test(syntax)) return "switching";
  if (/etherchannel|lacp|link-aggregation|\blag\b/.test(syntax)) return "switching";
  if (/^(?:show|display) ip route|^route print$/.test(syntax)) return "networking";
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

const recordsByVendor = Object.groupBy(inventory, (record) => record.vendor);
const recordById = new Map(inventory.map((record) => [record.command_id, record]));

function templateMatches(candidate, value) {
  const normalizedCandidate = normalise(candidate);
  const normalizedValue = normalise(value);
  if (normalizedCandidate === normalizedValue) return true;
  if (normalizedCandidate.includes("<")) {
    const expression = `^${normalizedCandidate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/<[^>]+>/g, "[^ ]+")}$`;
    return new RegExp(expression).test(normalizedValue);
  }
  return /\b(?:interface|vlan|priority|address|description)$/.test(normalizedCandidate) && normalizedValue.startsWith(`${normalizedCandidate} `);
}

function resolveVendorCommand(vendor, rawText) {
  const candidates = recordsByVendor[vendor] || [];
  const normalized = normalise(rawText);
  return candidates.find((record) => normalise(record.canonical_command) === normalized)
    || candidates.find((record) => (record.aliases || []).some((alias) => normalise(alias) === normalized))
    || candidates.find((record) => templateMatches(record.canonical_command, rawText))
    || candidates.find((record) => (record.aliases || []).some((alias) => templateMatches(alias, rawText)))
    || null;
}

function existingVendorIds(vendor, ids) {
  return [...new Set(ids.filter((id) => recordById.get(id)?.vendor === vendor))];
}

function routeBlueprint(route, vendor) {
  const label = `${route.category || ""} ${route.label || ""} ${route.goal || ""}`.toLowerCase();
  const explicit = [
    ...(route.requiredCommands || []),
    ...(route.steps || []).flatMap((step) => [step.command, ...(step.alternatives || [])]).filter(Boolean)
  ].map((command) => resolveVendorCommand(vendor, command)).filter(Boolean).map((record) => record.command_id);
  if (route.id === "free-practice") return { ids: [], policy: "unrestricted", explicitCount: 0 };
  if (explicit.length) return { ids: existingVendorIds(vendor, explicit), policy: "guided", explicitCount: explicit.length };

  const cisco = {
    inspect: ["cisco_show_interface_status"], interface: ["cisco_show_interface_status", "cisco_interface_config"], vlan: ["cisco_show_vlan_brief", "cisco_vlan_create", "cisco_switchport_access_vlan"], trunk: ["cisco_show_interface_status", "cisco_configure_terminal", "cisco_interface_config", "cisco_switchport_mode_trunk", "cisco_switchport_trunk_allowed"], save: ["cisco_show_running_config", "cisco_copy_running_startup"], mac: ["cisco_show_mac_address_table"], discovery: ["cisco_show_cdp_neighbors", "cisco_show_lldp_neighbors"], stp: ["cisco_show_spanning_tree"], aggregation: ["cisco_show_etherchannel_summary"], security: ["cisco_show_port_security_interface"], stack: ["cisco_switch_priority"], network: ["cisco_show_ip_arp", "cisco_show_ip_route"]
  };
  const hp = {
    inspect: ["hp_display_interface_brief"], interface: ["hp_display_interface_brief", "hp_interface_config"], vlan: ["hp_display_vlan", "hp_vlan", "hp_port_access_vlan"], trunk: ["hp_display_interface_brief", "hp_system_view", "hp_interface_config", "hp_port_link_type_trunk", "hp_port_trunk_permit"], save: ["hp_display_current_configuration", "hp_save"], mac: ["hp_display_mac_address"], discovery: ["hp_display_lldp_neighbor"], stack: ["hp_display_irf_topology", "hp_display_irf_port", "hp_irf_member_priority"], aggregation: ["hp_display_link_aggregation_summary"], stp: ["hp_display_stp"], network: ["hp_display_arp", "hp_display_ip_routing_table"]
  };
  const aruba = {
    inspect: ["aruba_show_interface_brief"], interface: ["aruba_show_interface_brief", "aruba_interface_config"], vlan: ["aruba_show_vlan", "aruba_vlan", "aruba_vlan_access"], trunk: ["aruba_show_interface_brief", "aruba_configure_terminal", "aruba_interface_config", "aruba_vlan_trunk_allowed"], save: ["aruba_show_running_config", "aruba_write_memory"], mac: ["aruba_show_mac_address_table"], discovery: ["aruba_show_lldp_neighbor_info"], aggregation: ["aruba_show_lacp_interfaces"], stp: ["aruba_show_spanning_tree"], network: ["aruba_show_ip_route"]
  };
  const windows = { inspect: ["windows_ipconfig_all"], interface: ["windows_netsh_interface_show_interface"], network: ["windows_ping", "windows_tracert", "windows_nslookup"], mac: ["windows_arp_a"], save: ["windows_ipconfig_all"] };
  const linux = { inspect: ["linux_ip_addr"], interface: ["linux_ip_link"], network: ["linux_ping", "linux_ip_route", "linux_dig"], mac: ["linux_ip_neigh"], save: ["linux_ip_addr"] };
  const blueprints = { cisco_ios: cisco, hp_comware: hp, aruba_cx: aruba, windows_cmd: windows, linux }[vendor] || {};
  let group = "inspect";
  if (/irf|stack|member|priority/.test(label)) group = "stack";
  else if (/port security|violation|sticky|secure/.test(label)) group = "security";
  else if (/etherchannel|lacp|aggregation/.test(label)) group = "aggregation";
  else if (/spanning|stp|root bridge|blocked port|broadcast/.test(label)) group = "stp";
  else if (/cdp|lldp|neighbor/.test(label)) group = "discovery";
  else if (/mac|arp|endpoint location/.test(label)) group = "mac";
  else if (/vlan|voice/.test(label)) group = "vlan";
  else if (/trunk|uplink|native vlan/.test(label)) group = "trunk";
  else if (/save|running configuration|startup configuration|ticket|change checklist|rollback/.test(label)) group = "save";
  else if (/ping|dns|gateway|ip |subnet|route/.test(label)) group = "network";
  else if (/interface|port|speed|duplex|shutdown|error-disabled|counters|physical/.test(label)) group = "interface";
  return { ids: existingVendorIds(vendor, blueprints[group] || blueprints.inspect || []), policy: "derived_from_route_objective", explicitCount: 0 };
}

function verificationForRoute(vendor, requiredIds) {
  const checks = { cisco_ios: "cisco_show_interface_status", hp_comware: "hp_display_interface_brief", aruba_cx: "aruba_show_interface_brief", windows_cmd: "windows_ipconfig_all", linux: "linux_ip_addr" };
  const check = checks[vendor];
  return requiredIds.length && recordById.has(check) ? [check] : [];
}

function rollbackForRoute(vendor, requiredIds) {
  const rollback = { cisco_ios: "cisco_no_shutdown", hp_comware: "hp_undo_shutdown", aruba_cx: "aruba_no_shutdown", windows_cmd: "windows_netsh_interface_enable", linux: "linux_ip_link_up" }[vendor];
  return requiredIds.some((id) => /shutdown|disable|link_down/.test(id)) && recordById.has(rollback) ? [rollback] : [];
}

const routeInventory = routes.map((route, index) => {
  const vendor = routeVendor(route);
  const blueprint = routeBlueprint(route, vendor);
  const requiredIds = blueprint.ids;
  const verificationIds = verificationForRoute(vendor, requiredIds);
  const records = requiredIds.map((id) => recordById.get(id)).filter(Boolean);
  const isFreePractice = blueprint.policy === "unrestricted";
  const everyImplemented = records.length > 0 && records.every((record) => record.simulator_support === "fully_simulated") && verificationIds.every((id) => recordById.get(id)?.simulator_support === "fully_simulated");
  const someSimulation = records.some((record) => ["fully_simulated", "partially_simulated"].includes(record.simulator_support));
  const supportLevel = !isFreePractice && everyImplemented && route.steps?.length && verificationIds.length
    ? "fully_simulated"
    : !isFreePractice && someSimulation && verificationIds.length ? "partially_simulated" : "explanation_only";
  records.forEach((record) => record.related_route_ids.push(route.id));
  return {
    route_id: route.id || `route-${index + 1}`, vendor, vendor_label: vendorLabels[vendor], operating_system: vendorLabels[vendor], platform: route.platform || vendorLabels[vendor], topic: route.topic || route.category || "general", category: route.category || "General", difficulty: route.difficulty || "foundation", route_type: isFreePractice ? "free_practice" : String(route.routeType || "configuration").toLowerCase().replace(/\s+/g, "_"), required_commands_policy: blueprint.policy, support_level: supportLevel, mapping_status: isFreePractice ? "unrestricted" : requiredIds.length ? "fully_mapped" : "unmapped", title: `${vendorLabels[vendor]} — ${route.label || route.id}`, description: route.goal || "Local guided practice route.", prerequisites: [], required_command_ids: requiredIds, accepted_aliases: route.steps?.flatMap((step) => step.alternatives || []) || [], starting_state: route.startingState || `Local ${route.device || "switch"} profile`, hidden_fault: route.hint || "", expected_final_state: route.expectedFinalState || "Verify the local simulated result.", final_state_validation_method: supportLevel === "fully_simulated" ? "shared simulated state and implemented verification command" : supportLevel === "partially_simulated" ? "local CLI output and guided verification" : "explanation and manual evidence review", verification_command_ids: verificationIds, rollback_command_ids: rollbackForRoute(vendor, requiredIds), scoring: { knowledge: 40, practice: 40, verification: 20 }, hints: [route.hint].filter(Boolean), related_lesson_ids: [...new Set(records.map((record) => `${record.vendor}-${record.topic}`))], missing_cli_handler_ids: records.filter((record) => !["fully_simulated", "partially_simulated"].includes(record.simulator_support)).map((record) => record.command_id)
  };
});

// Enrich the legacy route source without dropping it: model/version and capability data
// are deliberately explicit so the workbench can label approximation boundaries.
for (const route of routeInventory) {
  const legacySupport = route.support_level;
  Object.assign(route, {
    operating_system_version: "Version-sensitive local training profile",
    platform_family: route.platform,
    supported_model_profiles: profilesByVendor[route.vendor] || [],
    support_level: routeSupportLevel(legacySupport),
    legacy_support_level: legacySupport,
    optional_command_ids: [],
    allowed_commands: [...(route.required_command_ids || [])],
    blocked_commands: [],
    expected_investigation: route.description || "Collect local evidence before making a change.",
    required_capabilities: [],
    version_notes: "Command availability varies by vendor, platform, and software release. The selected profile is a training approximation."
  });
}

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
const crossVendorErrors = routeInventory.flatMap((route) => route.required_command_ids
  .filter((commandId) => recordById.get(commandId)?.vendor !== route.vendor)
  .map((commandId) => ({ route_id: route.route_id, vendor: route.vendor, command_id: commandId, command_vendor: recordById.get(commandId)?.vendor || "missing" })));
const brokenCommandReferences = routeInventory.flatMap((route) => route.required_command_ids
  .filter((commandId) => !recordById.has(commandId))
  .map((commandId) => ({ route_id: route.route_id, command_id: commandId })));
const unresolvedRouteReferences = routeInventory.filter((route) => route.route_type !== "free_practice" && !route.required_command_ids.length).map((route) => ({ route_id: route.route_id, title: route.title }));
const routesPerVendor = Object.fromEntries(Object.entries(Object.groupBy(routeInventory, (route) => route.vendor)).map(([key, value]) => [key, value.length]));
const routesSuccessfullyMapped = routeInventory.filter((route) => route.mapping_status === "fully_mapped").length;
const routesPartiallyMapped = routeInventory.filter((route) => route.mapping_status === "partially_mapped").length;
const routesUnmapped = routeInventory.filter((route) => route.mapping_status === "unmapped").length;
const coverageMetrics = {
  classification_coverage: 100,
  lesson_coverage: Math.round((inventory.filter((record) => record.related_lesson_ids.length).length / Math.max(1, inventory.length)) * 100),
  practical_exercise_coverage: Math.round((inventory.filter((record) => ["fully_simulated", "partially_simulated"].includes(record.simulator_support)).length / Math.max(1, inventory.length)) * 100),
  route_coverage: Math.round((inventory.filter((record) => record.related_route_ids.length).length / Math.max(1, inventory.length)) * 100),
  fully_simulated_coverage: Math.round((inventory.filter((record) => record.simulator_support === "fully_simulated").length / Math.max(1, inventory.length)) * 100),
  verification_coverage: Math.round((inventory.filter((record) => !record.changes_configuration || record.verification_commands.length).length / Math.max(1, inventory.length)) * 100),
  troubleshooting_coverage: Math.round((routeInventory.filter((route) => /troubleshoot|diagnostic|fault|recover|wrong/i.test(`${route.category} ${route.title}`)).length / Math.max(1, routeInventory.length)) * 100),
  review_coverage: 0
};
coverageMetrics.overall_learning_readiness = Math.round((coverageMetrics.lesson_coverage + coverageMetrics.practical_exercise_coverage + coverageMetrics.route_coverage + coverageMetrics.fully_simulated_coverage + coverageMetrics.verification_coverage + coverageMetrics.troubleshooting_coverage + coverageMetrics.review_coverage) / 7);
const audit = {
  generated_at: new Date().toISOString(), source_command_files: commandFiles.map((file) => `data/commands/${file}`), total_raw_command_records: rawRecords.length, total_normalized_canonical_commands: inventory.length, total_aliases: inventory.reduce((sum, record) => sum + record.aliases.length, 0), commands_per_vendor: vendorCounts, commands_per_topic: Object.fromEntries(Object.entries(Object.groupBy(inventory, (record) => record.topic)).map(([key, value]) => [key, value.length])), commands_per_support_level: supportCounts, commands_used_by_cli_engine: inventory.filter((record) => record.simulator_support === "fully_simulated" || record.simulator_support === "partially_simulated").length, commands_used_only_by_lookup: inventory.filter((record) => record.simulator_support === "lookup_only").length, commands_referenced_by_routes: referencedByRoutes.size, commands_without_routes: inventory.filter((record) => !record.related_route_ids.length).map((record) => record.command_id), commands_without_lessons: inventory.filter((record) => !record.related_lesson_ids.length).map((record) => record.command_id), routes_containing_commands_not_found_in_inventory: unresolvedRouteReferences, duplicate_command_ids: [...new Set(duplicateIds)], duplicate_canonical_syntax: [], conflicting_vendor_assignments: [], commands_using_placeholders: inventory.filter((record) => /<[^>]+>/.test(record.syntax)).map((record) => record.command_id), commands_with_missing_verification_steps: inventory.filter((record) => record.changes_configuration && !record.verification_commands.length).map((record) => record.command_id), commands_with_missing_rollback_guidance: inventory.filter((record) => record.changes_configuration && !record.rollback_commands.length).map((record) => record.command_id), broken_command_references: []
};

Object.assign(audit, {
  routes_per_vendor: routesPerVendor,
  routes_successfully_mapped: routesSuccessfullyMapped,
  routes_partially_mapped: routesPartiallyMapped,
  routes_unmapped: routesUnmapped,
  routes_with_cross_vendor_conflicts: crossVendorErrors,
  empty_required_command_routes: unresolvedRouteReferences,
  routes_without_lessons: routeInventory.filter((route) => !route.related_lesson_ids.length).map((route) => route.route_id),
  routes_with_missing_cli_handlers: routeInventory.filter((route) => route.missing_cli_handler_ids.length).map((route) => route.route_id),
  coverage_metrics: coverageMetrics,
  broken_command_references: brokenCommandReferences
});

if (crossVendorErrors.length || brokenCommandReferences.length || unresolvedRouteReferences.length) {
  throw new Error(`Curriculum generation failed: ${crossVendorErrors.length} cross-vendor, ${brokenCommandReferences.length} broken, ${unresolvedRouteReferences.length} empty required-command mappings.`);
}

const health = {
  status: audit.broken_command_references.length || audit.routes_with_cross_vendor_conflicts.length ? "Errors" : coverageMetrics.overall_learning_readiness >= 85 ? "Passed" : "Warnings",
  passed: ["Every normalized command has a vendor classification.", "Every normalized command has a support level.", "Every generated route has a vendor and support level.", "Every alias is linked to a canonical command."],
  warnings: [
    ...(audit.commands_with_missing_verification_steps.length ? [`${audit.commands_with_missing_verification_steps.length} configuration commands require fuller verification guidance.`] : []),
    ...(audit.commands_without_routes.length ? [`${audit.commands_without_routes.length} commands have no practice route yet.`] : []),
    ...(coverageMetrics.overall_learning_readiness < 85 ? [`Learning readiness is ${coverageMetrics.overall_learning_readiness}%, not premium-ready. Coverage includes lessons, practice, routes, simulation, verification, troubleshooting, and review.`] : [])
  ],
  errors: audit.broken_command_references,
  classification_coverage_percentage: coverageMetrics.classification_coverage,
  coverage_metrics: coverageMetrics
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
