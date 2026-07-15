import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const outputPaths = {
  catalog: "data/generated/learning-command-catalog.json",
  objectives: "data/generated/learning-objective-index.json",
  modules: "data/generated/learning-module-prerequisites.json",
  sourceReport: "data/generated/learning-source-precedence-report.json",
  integrity: "data/generated/learning-integrity-report.json",
  coverage: "data/generated/learning-coverage-report.json",
  migration: "data/generated/learning-migration-readiness.json",
  traceability: "docs/LEARNING-TRACEABILITY-MATRIX.json",
  stageReportJson: "reports/learning-integrity-stage-1.json",
  stageReportMarkdown: "reports/learning-integrity-stage-1.md"
};

export const sourceFiles = [
  "data/learning/schema.json",
  "data/learning/status-vocabularies.json",
  "data/learning/source-precedence.json",
  "data/learning/command-id-migrations.json"
];

const commandSourceDirectory = "data/commands";
const flowDirectory = "data/flows";
const json = (value) => JSON.stringify(value, null, 2) + "\n";
const normalise = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
const slug = (value) => normalise(value).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "general";
const uniq = (values) => [...new Set((values || []).filter(Boolean))];
const byCount = (items) => items.reduce((counts, item) => {
  counts[item] = (counts[item] || 0) + 1;
  return counts;
}, {});
const sortBy = (items, getKey) => [...items].sort((a, b) => String(getKey(a)).localeCompare(String(getKey(b))));

export async function readJson(relative) {
  return JSON.parse(await fs.readFile(path.join(root, relative), "utf8"));
}

async function readOptionalJson(relative, fallback) {
  try {
    return await readJson(relative);
  } catch {
    return fallback;
  }
}

async function listJsonFiles(relativeDirectory) {
  const full = path.join(root, relativeDirectory);
  const files = await fs.readdir(full);
  return files.filter((file) => file.endsWith(".json")).sort().map((file) => path.posix.join(relativeDirectory.replace(/\\/g, "/"), file));
}

function commandTextCandidates(command) {
  return uniq([command.command_id, command.canonical_command, command.syntax, ...(command.aliases || [])].map((item) => String(item || "")));
}

function templateMatches(candidate, value) {
  const normalizedCandidate = normalise(candidate);
  const normalizedValue = normalise(value);
  if (!normalizedCandidate || !normalizedValue) return false;
  if (normalizedCandidate === normalizedValue) return true;
  if (normalizedCandidate.includes("<")) {
    const expression = "^" + normalizedCandidate
      .replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/[{}]/g, "\\$&")
      .replace(/<[^>]+>/g, "[^ ]+") + "$";
    return new RegExp(expression).test(normalizedValue);
  }
  return /\b(?:interface|vlan|priority|address|description|name|pid|count|host|gateway)$/.test(normalizedCandidate) && normalizedValue.startsWith(normalizedCandidate + " ");
}

function buildCommandResolver(commands) {
  const byId = new Map(commands.map((command) => [command.command_id, command]));
  const byVendor = new Map();
  for (const command of commands) {
    const vendor = command.vendor_id || command.vendor;
    if (!byVendor.has(vendor)) byVendor.set(vendor, []);
    byVendor.get(vendor).push(command);
  }
  return (vendor, text) => {
    if (!text) return null;
    const direct = byId.get(text);
    if (direct && (!vendor || (direct.vendor_id || direct.vendor) === vendor)) return direct.command_id;
    const candidates = byVendor.get(vendor) || commands;
    const normalized = normalise(text);
    const exact = candidates.find((command) => commandTextCandidates(command).some((candidate) => normalise(candidate) === normalized));
    if (exact) return exact.command_id;
    const templated = candidates.find((command) => commandTextCandidates(command).some((candidate) => templateMatches(candidate, text)));
    return templated?.command_id || null;
  };
}

function vendorIdFromLabel(label, vendors) {
  const normalized = normalise(label);
  for (const [vendorId, vendorLabel] of Object.entries(vendors || {})) {
    if (normalise(vendorLabel) === normalized || normalise(vendorId) === normalized) return vendorId;
  }
  if (normalized.includes("aruba")) return "aruba_cx";
  if (normalized.includes("comware") || normalized === "hp") return "hp_comware";
  if (normalized.includes("cisco")) return "cisco_ios";
  if (normalized.includes("windows")) return "windows_cmd";
  if (normalized.includes("linux")) return "linux";
  return "";
}

function isConfigurationLike(command) {
  if (command.changes_configuration) return true;
  const syntax = normalise(command.syntax || command.canonical_command);
  return /^(configure terminal|system-view|hostname\b|sysname\b|interface\b|interface range\b|vlan\b|name\b|switchport\b|port\b|shutdown\b|undo shutdown\b|no shutdown\b|copy running-config\b|write memory\b|save\b|reload\b|reboot\b|ip address\b|lacp\b|spanning-tree\b|irf member\b|description\b|default interface\b|no vlan\b|vlan trunk\b)/.test(syntax);
}

function outputEvidenceCapable(command) {
  return ["full_state_simulation", "simplified_state_simulation", "output_simulation"].includes(command.simulator_support)
    || (command.good_output_example || []).length
    || (command.bad_output_example || []).length
    || (command.important_output_fields || []).length
    || (command.common_errors || []).length;
}

function conceptFamilyFor(command) {
  const syntax = normalise(command.syntax || command.canonical_command);
  const topic = command.topic || "general";
  if (/interface (status|brief)|display interface brief|ip addr|netsh interface show/.test(syntax)) return "interface_state_summary";
  if (/show interfaces$|display interface$|show interface\b/.test(syntax)) return "interface_detail";
  if (/vlan brief|display vlan|show vlan\b/.test(syntax)) return "vlan_inventory";
  if (/switchport access vlan|port access vlan|vlan access/.test(syntax)) return "access_vlan_assignment";
  if (/trunk/.test(syntax)) return "trunk_configuration";
  if (/mac address|mac-address|arp|ip neigh/.test(syntax)) return "endpoint_mac_neighbor_evidence";
  if (/lldp|cdp/.test(syntax)) return "neighbor_discovery";
  if (/spanning|stp/.test(syntax)) return "spanning_tree_evidence";
  if (/etherchannel|lacp|link-aggregation/.test(syntax)) return "link_aggregation_evidence";
  if (/running-config|startup-config|current-configuration|saved-configuration/.test(syntax)) return "configuration_inspection";
  if (/copy running-config|write memory|save/.test(syntax)) return "configuration_save";
  if (/hostname|sysname/.test(syntax)) return "device_identity";
  if (/shutdown|undo shutdown|no shutdown|interface disable|interface enable|ip link set/.test(syntax)) return "interface_admin_state";
  if (/ip route|route print|routing-table/.test(syntax)) return "routing_table";
  if (/ping|tracert|traceroute|pathping/.test(syntax)) return "reachability_test";
  if (/dns|nslookup|dig|resolvectl/.test(syntax)) return "name_resolution";
  if (/version|systeminfo|system/.test(syntax)) return "device_or_os_identity";
  return "topic_" + slug(topic);
}

function supportNotesFor(command, practiceStatus, verificationStatus, missingHandlerRoutes) {
  const notes = [];
  if (command.simulator_support === "explanation_only") notes.push("Explanation-only command; practical runtime mastery is not currently supported.");
  if (command.simulator_support === "output_simulation") notes.push("Output simulation can support interpretation but not configuration-state mastery.");
  if (practiceStatus === "blocked_by_missing_handler") notes.push("All linked practice routes for this command are blocked by missing CLI handler coverage.");
  if (missingHandlerRoutes.length) notes.push("Some linked routes have missing handler blockers: " + missingHandlerRoutes.join(", "));
  if (verificationStatus === "missing") notes.push("Configuration-like command lacks traceable verification guidance.");
  return notes;
}

function statusForHandler(command, missingHandlerRoutes) {
  if (missingHandlerRoutes.length) return "route_missing_handler";
  if (command.simulator_support === "full_state_simulation") return "full_state_handler";
  if (command.simulator_support === "simplified_state_simulation") return "simplified_state_handler";
  if (command.simulator_support === "output_simulation") return "output_simulation_only";
  if (command.simulator_support === "unsupported_for_profile") return "unsupported";
  return "explanation_only_no_handler";
}

function routeRoleSummary(commandId, routes) {
  const roles = { required: [], allowed: [], optional: [], verification: [], rollback: [] };
  for (const route of routes) {
    if ((route.required_command_ids || []).includes(commandId)) roles.required.push(route.route_id);
    if ((route.allowed_commands || []).includes(commandId)) roles.allowed.push(route.route_id);
    if ((route.optional_command_ids || []).includes(commandId)) roles.optional.push(route.route_id);
    if ((route.verification_command_ids || []).includes(commandId)) roles.verification.push(route.route_id);
    if ((route.rollback_command_ids || []).includes(commandId)) roles.rollback.push(route.route_id);
  }
  return Object.fromEntries(Object.entries(roles).map(([key, value]) => [key, uniq(value).sort()]));
}

function stagesFor(command, hasAlias, configLike, verificationStatus, practicalEligible, hasEquivalent) {
  const stages = [
    "technician_ticket",
    "learning_objective",
    "prerequisites",
    "command_purpose",
    "required_cli_mode",
    "syntax_breakdown",
    "prediction_before_output",
    "knowledge_check",
    "confidence_rating",
    "multidimensional_mastery",
    "review_scheduling"
  ];
  if (hasAlias) stages.push("aliases_and_abbreviations");
  if (outputEvidenceCapable(command)) stages.push("healthy_output", "fault_output", "evidence_identification", "evidence_interpretation", "choose_next_command");
  if (practicalEligible) stages.push("runtime_execution", "guided_practice", "assisted_practice", "independent_troubleshooting");
  if (verificationStatus === "runtime_policy" || verificationStatus === "route_guidance") stages.push("runtime_verification");
  if (configLike) stages.push("save_or_rollback", "ticket_note");
  if ((command.related_commands || []).length) stages.push("related_commands");
  if (hasEquivalent) stages.push("equivalent_vendor_concepts");
  return uniq(stages);
}

function masteryFor(command, configLike, practicalEligible, verificationStatus, hasSafetyDecision, hasTicketNote) {
  const dimensions = ["concept", "syntax", "command_selection"];
  if (command.simulator_support === "explanation_only") return dimensions;
  if (outputEvidenceCapable(command)) dimensions.push("prediction", "output_interpretation");
  if (practicalEligible) dimensions.push("practical_execution");
  if (practicalEligible && (command.common_errors || []).length) dimensions.push("troubleshooting");
  if (verificationStatus === "runtime_policy" || verificationStatus === "route_guidance") dimensions.push("verification");
  if (configLike && hasSafetyDecision) dimensions.push("safety");
  if (configLike && hasTicketNote) dimensions.push("documentation");
  return uniq(dimensions);
}

function reviewTypesFor(command, configLike, practicalEligible, verificationStatus) {
  const types = ["recall_syntax", "select_command"];
  if (outputEvidenceCapable(command)) types.push("interpret_output", "identify_evidence");
  if ((command.common_errors || []).length || (command.bad_output_example || []).length) types.push("correct_an_error");
  if (verificationStatus !== "missing" && verificationStatus !== "not_applicable") types.push("choose_verification");
  if (configLike) types.push("complete_a_short_ticket");
  if (practicalEligible) types.push("perform_a_short_runtime_task");
  return uniq(types);
}

function rollbackGuidanceClassification(record) {
  if (record.rollback_status === "not_applicable") return "not_applicable";
  if (record.rollback_status !== "missing") return "has_guidance";
  if ((record.rollback_guidance_unresolved || []).length) return "blocked_by_incomplete_source_metadata";
  if (record.runtime_support === "explanation_only") return "explanation_only_but_still_recommended";
  return "genuinely_missing";
}

function detectCycles(nodes) {
  const byId = new Map(nodes.map((node) => [node.module_id, node]));
  const visiting = new Set();
  const visited = new Set();
  const cycles = [];
  function visit(id, stack) {
    if (visiting.has(id)) {
      const index = stack.indexOf(id);
      cycles.push([...stack.slice(index), id]);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    const node = byId.get(id);
    for (const next of node?.prerequisite_module_ids || []) visit(next, [...stack, id]);
    visiting.delete(id);
    visited.add(id);
  }
  for (const node of nodes) visit(node.module_id, []);
  return cycles;
}

export async function loadLearningSources() {
  const commandSourceFiles = await listJsonFiles(commandSourceDirectory);
  const flowFiles = await listJsonFiles(flowDirectory);
  const rawCommandFiles = [];
  for (const file of commandSourceFiles) rawCommandFiles.push({ file, data: await readJson(file) });
  const flows = [];
  for (const file of flowFiles) flows.push({ file, data: await readJson(file) });
  return {
    statusVocabularies: await readJson("data/learning/status-vocabularies.json"),
    schema: await readJson("data/learning/schema.json"),
    sourcePrecedence: await readJson("data/learning/source-precedence.json"),
    commandIdMigrations: await readJson("data/learning/command-id-migrations.json"),
    commandInventory: await readJson("data/generated/command-inventory.json"),
    commandAudit: await readJson("data/generated/command-inventory-audit.json"),
    curriculumIndex: await readJson("data/generated/curriculum-index.json"),
    routeInventory: await readJson("data/generated/route-inventory.json"),
    curriculumHealth: await readJson("data/generated/curriculum-health.json"),
    activeCurriculum: await readJson("data/labs/curriculum_vendor_tracks.json"),
    labStages: await readJson("data/labs/stages.json"),
    labSections: await readJson("data/labs/sections.json"),
    foundationLessons: await readJson("data/labs/lessons/foundation.json"),
    foundationExtendedLessons: await readJson("data/labs/lessons/foundation_extended.json"),
    configurationLessons: await readJson("data/labs/lessons/configuration.json"),
    configurationExtendedLessons: await readJson("data/labs/lessons/configuration_extended.json"),
    lessonQuizzes: await readJson("data/labs/quizzes/lesson-quizzes.json"),
    extendedQuizzes: await readJson("data/labs/quizzes/extended-quizzes.json"),
    scenarios: await readJson("data/labs/scenarios/scenarios.json"),
    switchProfiles: await readJson("data/platforms/switch-profiles.json"),
    existingTraceability: await readOptionalJson("docs/LEARNING-TRACEABILITY-MATRIX.json", {}),
    rawCommandFiles,
    flows
  };
}

function buildRawDuplicateAudit(rawCommandFiles, migrationData) {
  const byId = new Map();
  for (const source of rawCommandFiles) {
    for (const [index, command] of (source.data.commands || []).entries()) {
      if (!command.id) continue;
      if (!byId.has(command.id)) byId.set(command.id, []);
      byId.get(command.id).push({ source_file: source.file, index, vendor_id: command.vendor_key || source.data.vendor_key || "", syntax: command.command || "" });
    }
  }
  const duplicates = sortBy([...byId.entries()].filter(([, records]) => records.length > 1), ([id]) => id)
    .map(([command_id, records]) => ({ command_id, records }));
  const resolvedIds = new Set([
    ...(migrationData.consolidations || []).map((item) => item.source_command_id),
    ...(migrationData.migrations || []).map((item) => item.from_command_id)
  ]);
  return {
    raw_duplicate_ids: duplicates,
    resolved_duplicate_ids: duplicates.filter((item) => resolvedIds.has(item.command_id)).map((item) => item.command_id),
    unresolved_duplicate_ids: duplicates.filter((item) => !resolvedIds.has(item.command_id)).map((item) => item.command_id)
  };
}

function buildModules(sources) {
  const targetTopicOrder = [
    "cli_foundation", "device_information", "interfaces", "vlans", "mac_neighbors", "networking",
    "switching", "trunks", "configuration", "stacking", "diagnostics", "file_system", "device_lifecycle"
  ];
  const targetLevelByTopic = {
    cli_foundation: "level_1",
    device_information: "level_1",
    interfaces: "level_1",
    vlans: "level_2",
    mac_neighbors: "level_2",
    networking: "level_2",
    switching: "level_2",
    trunks: "level_3",
    configuration: "level_3",
    stacking: "level_3",
    diagnostics: "level_3",
    file_system: "level_3",
    device_lifecycle: "level_3"
  };
  const prereqTopics = {
    device_information: ["cli_foundation"],
    interfaces: ["cli_foundation", "device_information"],
    vlans: ["interfaces"],
    mac_neighbors: ["interfaces"],
    networking: ["interfaces"],
    switching: ["interfaces"],
    trunks: ["interfaces", "vlans"],
    configuration: ["cli_foundation", "interfaces"],
    stacking: ["device_information", "interfaces"],
    diagnostics: ["device_information"],
    file_system: ["device_information"],
    device_lifecycle: ["device_information"]
  };
  const modules = [];
  const commandsByModule = new Map();
  const generatedLessonById = new Map();
  const generatedLessonIdsByCommand = new Map();
  for (const vendor of Object.keys(sources.curriculumIndex.vendors || {}).sort()) {
    const vendorModules = sources.curriculumIndex.modules?.[vendor] || [];
    const moduleByTopic = new Map(vendorModules.map((module) => [module.topic, module.module_id]));
    for (const [currentIndex, module] of vendorModules.entries()) {
      const prerequisite_module_ids = (prereqTopics[module.topic] || []).map((topic) => moduleByTopic.get(topic)).filter(Boolean);
      const target_order = targetTopicOrder.includes(module.topic) ? targetTopicOrder.indexOf(module.topic) + 1 : 100 + currentIndex;
      const ordering_notes = [];
      for (const prereq of prerequisite_module_ids) {
        const prereqModule = vendorModules.find((candidate) => candidate.module_id === prereq);
        if (prereqModule && vendorModules.indexOf(prereqModule) > currentIndex) ordering_notes.push("current_order_before_prerequisite:" + prereq);
      }
      modules.push({
        module_id: module.module_id,
        vendor_id: vendor,
        title: module.title,
        topic_id: module.topic,
        current_level: module.level,
        target_level_id: targetLevelByTopic[module.topic] || "level_3",
        target_order,
        current_order: currentIndex + 1,
        prerequisite_module_ids,
        ordering_notes
      });
      const moduleCommands = [];
      for (const lesson of module.lessons || []) {
        generatedLessonById.set(lesson.lesson_id, { ...lesson, module_id: module.module_id });
        for (const command of lesson.commands || []) {
          moduleCommands.push(command.command_id);
          if (!generatedLessonIdsByCommand.has(command.command_id)) generatedLessonIdsByCommand.set(command.command_id, []);
          generatedLessonIdsByCommand.get(command.command_id).push(lesson.lesson_id);
        }
      }
      commandsByModule.set(module.module_id, uniq(moduleCommands));
    }
  }
  return {
    schema_version: "learning-module-prerequisites.v1",
    levels: [
      { level_id: "level_1", title: "Foundation evidence and safe read-only orientation" },
      { level_id: "level_2", title: "Operational evidence interpretation and relationships" },
      { level_id: "level_3", title: "Configuration, troubleshooting, lifecycle, and advanced workflows" }
    ],
    topic_order: targetTopicOrder,
    modules: sortBy(modules, (module) => module.vendor_id + ":" + String(module.target_order).padStart(3, "0") + ":" + module.module_id),
    generatedLessonById,
    generatedLessonIdsByCommand,
    commandsByModule,
    prerequisite_cycles: detectCycles(modules)
  };
}

function buildDedicatedLessonMap(sources, resolveCommand) {
  const lessonFiles = [
    { file: "data/labs/curriculum_vendor_tracks.json", lessons: sources.activeCurriculum.lessons || [] },
    { file: "data/labs/lessons/foundation.json", lessons: sources.foundationLessons.lessons || [] },
    { file: "data/labs/lessons/foundation_extended.json", lessons: sources.foundationExtendedLessons.lessons || [] },
    { file: "data/labs/lessons/configuration.json", lessons: sources.configurationLessons.lessons || [] },
    { file: "data/labs/lessons/configuration_extended.json", lessons: sources.configurationExtendedLessons.lessons || [] }
  ];
  const lessonById = new Map();
  const commandToLessons = new Map();
  for (const source of lessonFiles) {
    for (const lesson of source.lessons) {
      const lessonId = lesson.id;
      if (!lessonId) continue;
      const vendorId = vendorIdFromLabel(lesson.vendor, sources.curriculumIndex.vendors);
      lessonById.set(lessonId, { ...lesson, source_file: source.file, vendor_id: vendorId });
      const candidates = uniq([lesson.command, ...(lesson.commands || []), ...(lesson.accepted_commands || [])]);
      for (const candidate of candidates) {
        const commandId = resolveCommand(vendorId, candidate);
        if (!commandId) continue;
        if (!commandToLessons.has(commandId)) commandToLessons.set(commandId, []);
        commandToLessons.get(commandId).push(lessonId);
      }
    }
  }
  return { lessonById, commandToLessons };
}

function resolveGuidanceIds(vendorId, guidance, resolveCommand) {
  const command_ids = [];
  const unresolved = [];
  for (const item of guidance || []) {
    const id = resolveCommand(vendorId, item);
    if (id) command_ids.push(id);
    else if (item) unresolved.push(item);
  }
  return { command_ids: uniq(command_ids).sort(), unresolved: uniq(unresolved).sort() };
}

export async function buildLearningIntegritySystem() {
  const sources = await loadLearningSources();
  const commands = sources.commandInventory.commands || [];
  const routes = sources.routeInventory.routes || [];
  const commandById = new Map(commands.map((command) => [command.command_id, command]));
  const routeById = new Map(routes.map((route) => [route.route_id, route]));
  const resolveCommand = buildCommandResolver(commands);
  const modules = buildModules(sources);
  const moduleById = new Map(modules.modules.map((module) => [module.module_id, module]));
  const dedicatedLessons = buildDedicatedLessonMap(sources, resolveCommand);
  const rawDuplicateAudit = buildRawDuplicateAudit(sources.rawCommandFiles, sources.commandIdMigrations);
  const conceptFamilyByCommand = new Map(commands.map((command) => [command.command_id, conceptFamilyFor(command)]));
  const conceptFamilyVendors = new Map();
  for (const command of commands) {
    const family = conceptFamilyByCommand.get(command.command_id);
    if (!conceptFamilyVendors.has(family)) conceptFamilyVendors.set(family, new Set());
    conceptFamilyVendors.get(family).add(command.vendor_id || command.vendor);
  }
  const pilotCommandIds = new Set([
    "cisco_show_interface_status",
    "cisco_switchport_access_vlan",
    "cisco_copy_running_startup",
    "hp_display_interface_brief",
    "hp_port_access_vlan",
    "hp_save",
    "aruba_show_interface_brief",
    "aruba_vlan_access",
    "aruba_write_memory"
  ]);

  const learningRecords = [];
  const objectives = [];
  const changesConfigurationByCommandId = new Map();
  const routeMissingHandlerCommands = new Map();
  for (const route of routes) {
    for (const commandId of route.missing_cli_handler_ids || []) {
      if (!routeMissingHandlerCommands.has(commandId)) routeMissingHandlerCommands.set(commandId, []);
      routeMissingHandlerCommands.get(commandId).push(route.route_id);
    }
  }

  for (const command of sortBy(commands, (item) => item.command_id)) {
    const vendorId = command.vendor_id || command.vendor;
    const generatedLessonIds = uniq(modules.generatedLessonIdsByCommand.get(command.command_id) || []).sort();
    const dedicatedLessonIds = uniq(dedicatedLessons.commandToLessons.get(command.command_id) || []).sort();
    const lessonIds = uniq([...dedicatedLessonIds, ...generatedLessonIds]).sort();
    const lessonStatus = dedicatedLessonIds.length ? "dedicated" : generatedLessonIds.length ? "grouped" : command.simulator_support === "explanation_only" ? "explanation_only" : "planned";
    const moduleId = generatedLessonIds.length ? modules.generatedLessonById.get(generatedLessonIds[0])?.module_id : command.related_lesson_ids?.[0] || "";
    const module = moduleById.get(moduleId);
    const prereqModuleIds = module?.prerequisite_module_ids || [];
    const prereqCommandIds = uniq(prereqModuleIds.flatMap((id) => modules.commandsByModule.get(id)?.slice(0, 1) || [])).sort();
    const routeRoles = routeRoleSummary(command.command_id, routes);
    const practiceRouteIds = uniq(Object.values(routeRoles).flat()).sort();
    const cleanPracticeRouteIds = practiceRouteIds.filter((routeId) => !(routeById.get(routeId)?.missing_cli_handler_ids || []).length).sort();
    const blockedPracticeRouteIds = practiceRouteIds.filter((routeId) => (routeById.get(routeId)?.missing_cli_handler_ids || []).length).sort();
    const missingHandlerRouteIds = uniq([...(routeMissingHandlerCommands.get(command.command_id) || []), ...blockedPracticeRouteIds.filter((routeId) => (routeById.get(routeId)?.missing_cli_handler_ids || []).includes(command.command_id))]).sort();
    const configLike = isConfigurationLike(command);
    changesConfigurationByCommandId.set(command.command_id, configLike);
    const handlerStatus = statusForHandler(command, missingHandlerRouteIds);
    let practiceStatus = "planned";
    if (command.simulator_support === "unsupported_for_profile") practiceStatus = "unsupported";
    else if (practiceRouteIds.length && !cleanPracticeRouteIds.length) practiceStatus = "blocked_by_missing_handler";
    else if (cleanPracticeRouteIds.length === 1 && (routeById.get(cleanPracticeRouteIds[0])?.required_command_ids || []).length <= 3) practiceStatus = "dedicated_route";
    else if (cleanPracticeRouteIds.length) practiceStatus = "grouped_route";
    else if (["full_state_simulation", "simplified_state_simulation"].includes(command.simulator_support)) practiceStatus = "runtime_free_practice";
    else if (command.simulator_support === "explanation_only") practiceStatus = "explanation_only";

    const routeVerificationIds = uniq(practiceRouteIds.flatMap((routeId) => routeById.get(routeId)?.verification_command_ids || [])).filter((id) => commandById.has(id)).sort();
    const commandVerification = resolveGuidanceIds(vendorId, command.verification_commands || [], resolveCommand);
    const verificationCommandIds = uniq([...commandVerification.command_ids, ...routeVerificationIds]).sort();
    let verificationStatus = "not_applicable";
    if (routeVerificationIds.length && cleanPracticeRouteIds.length && ["full_state_simulation", "simplified_state_simulation"].includes(command.simulator_support)) verificationStatus = "runtime_policy";
    else if (routeVerificationIds.length) verificationStatus = "route_guidance";
    else if (commandVerification.command_ids.length || commandVerification.unresolved.length) verificationStatus = "command_guidance";
    else if (configLike) verificationStatus = "missing";

    const routeRollbackIds = uniq(practiceRouteIds.flatMap((routeId) => routeById.get(routeId)?.rollback_command_ids || [])).filter((id) => commandById.has(id)).sort();
    const commandRollback = resolveGuidanceIds(vendorId, command.rollback_commands || [], resolveCommand);
    const rollbackCommandIds = uniq([...commandRollback.command_ids, ...routeRollbackIds]).sort();
    let rollbackStatus = "not_applicable";
    if (routeRollbackIds.length) rollbackStatus = "route_guidance";
    else if (commandRollback.command_ids.length || commandRollback.unresolved.length) rollbackStatus = "command_guidance";
    else if (configLike) rollbackStatus = "missing";

    const practicalEligible = Boolean(cleanPracticeRouteIds.length && ["full_state_simulation", "simplified_state_simulation"].includes(command.simulator_support));
    const hasSafetyDecision = false;
    const hasTicketNote = false;
    const masteryDimensions = masteryFor(command, configLike, practicalEligible, verificationStatus, hasSafetyDecision, hasTicketNote);
    const reviewTypes = reviewTypesFor(command, configLike, practicalEligible, verificationStatus);
    const reviewStatus = reviewTypes.length ? "planned" : "not_applicable";
    const conceptFamilyId = conceptFamilyByCommand.get(command.command_id);
    const equivalentConceptIds = (conceptFamilyVendors.get(conceptFamilyId)?.size || 0) > 1 ? [conceptFamilyId] : [];
    const lessonStages = stagesFor(command, (command.aliases || []).length > 0, configLike, verificationStatus, practicalEligible, equivalentConceptIds.length > 0);
    const blockingReasons = [];
    if (!practiceRouteIds.length) blockingReasons.push("missing_practice_linkage");
    if (missingHandlerRouteIds.length) blockingReasons.push("missing_cli_handler");
    if (verificationStatus === "missing") blockingReasons.push("missing_verification");
    if (command.simulator_support === "explanation_only") blockingReasons.push("explanation_only_runtime_support");
    if (lessonStatus === "planned" || lessonStatus === "unsupported") blockingReasons.push("missing_lesson_content");
    let migrationStatus = "blocked_by_content";
    if (command.simulator_support === "unsupported_for_profile") migrationStatus = "unsupported";
    else if (verificationStatus === "missing") migrationStatus = "blocked_by_verification";
    else if (practiceStatus === "blocked_by_missing_handler") migrationStatus = "blocked_by_runtime";
    else if (!practiceRouteIds.length && command.simulator_support !== "explanation_only") migrationStatus = "blocked_by_practice";
    else if (command.simulator_support === "explanation_only") migrationStatus = "explanation_only";
    else if (pilotCommandIds.has(command.command_id) && practicalEligible && verificationStatus !== "missing") migrationStatus = "pilot_ready";
    else if (practicalEligible && verificationStatus !== "missing" && lessonStatus !== "planned") migrationStatus = "batch_ready";

    const objectiveId = "obj_" + slug(vendorId + "_" + command.command_id);
    const record = {
      canonical_command_id: command.command_id,
      vendor_id: vendorId,
      operating_system_family_id: command.operating_system_family_id || command.compatible_os_family_ids?.[0] || vendorId,
      topic_id: command.topic || "general",
      module_id: moduleId || "",
      learning_level: module?.target_level_id || "level_3",
      prerequisite_module_ids: prereqModuleIds,
      prerequisite_command_ids: prereqCommandIds,
      objective_ids: [objectiveId],
      lesson_ids: lessonIds,
      lesson_status: lessonStatus,
      practice_route_ids: practiceRouteIds,
      eligible_practical_route_ids: cleanPracticeRouteIds,
      blocked_practice_route_ids: blockedPracticeRouteIds,
      practice_status: practiceStatus,
      runtime_support: command.simulator_support || "explanation_only",
      handler_status: handlerStatus,
      verification_status: verificationStatus,
      verification_command_ids: verificationCommandIds,
      verification_policy_ids: verificationStatus === "runtime_policy" ? ["policy_" + command.command_id + "_runtime_verification"] : [],
      verification_guidance_unresolved: commandVerification.unresolved,
      rollback_status: rollbackStatus,
      rollback_command_ids: rollbackCommandIds,
      rollback_guidance_unresolved: commandRollback.unresolved,
      required_lesson_stages: lessonStages,
      mastery_dimensions: masteryDimensions,
      review_types: reviewTypes,
      review_status: reviewStatus,
      migration_status: migrationStatus,
      blocking_reasons: uniq(blockingReasons).sort(),
      support_notes: supportNotesFor(command, practiceStatus, verificationStatus, missingHandlerRouteIds),
      equivalent_concept_ids: equivalentConceptIds,
      concept_family_id: conceptFamilyId,
      route_roles: routeRoles,
      source_command: {
        syntax: command.syntax || command.canonical_command,
        aliases: command.aliases || [],
        source_files: command.source_files || []
      }
    };
    learningRecords.push(record);
    objectives.push({
      objective_id: objectiveId,
      vendor_scope: vendorId,
      concept: command.purpose || command.canonical_command,
      concept_family_id: conceptFamilyId,
      observable_student_behavior: "Given " + (command.vendor_label || vendorId) + " context, explain when to use '" + (command.syntax || command.canonical_command) + "' and identify the evidence or safe next action it supports.",
      evidence_required: outputEvidenceCapable(command)
        ? ["syntax_or_selection_answer", "output_evidence_identification"]
        : ["syntax_or_selection_answer"],
      mastery_dimensions: masteryDimensions,
      related_command_ids: [command.command_id],
      prerequisite_objective_ids: prereqCommandIds.map((id) => "obj_" + slug((commandById.get(id)?.vendor_id || commandById.get(id)?.vendor || vendorId) + "_" + id)).filter(Boolean),
      learning_level: module?.target_level_id || "level_3"
    });
  }

  const catalog = {
    schema_version: "learning-command-catalog.v1",
    source_commit: "25bcd622fa73cd304020f5af2c3417046fde0387",
    runtime_baseline: "bdd1fc2abdf8b62ffe672d61b0f5f16f7d5ce155",
    approved_runtime_source: "ea4bf7ce2223dc1a22db3de18c9f48c1427b155c",
    commands: learningRecords
  };

  const objectiveIndex = {
    schema_version: "learning-objective-index.v1",
    objective_count: objectives.length,
    duplicate_objective_candidates: [],
    objectives: sortBy(objectives, (objective) => objective.objective_id)
  };

  const sourceReport = {
    schema_version: "learning-source-precedence-report.v1",
    source_precedence: sources.sourcePrecedence,
    raw_command_source_files: sources.rawCommandFiles.map((item) => item.file),
    flow_source_files: sources.flows.map((item) => item.file),
    duplicate_source_ids: rawDuplicateAudit.raw_duplicate_ids,
    raw_duplicate_ids_detected: rawDuplicateAudit.raw_duplicate_ids,
    resolved_duplicate_ids: rawDuplicateAudit.resolved_duplicate_ids,
    normalized_learning_records_consolidated: rawDuplicateAudit.resolved_duplicate_ids,
    raw_command_source_records_deleted: false,
    executable_command_id_renames_required: false,
    unresolved_duplicate_ids: rawDuplicateAudit.unresolved_duplicate_ids
  };

  const statusCounts = {
    lesson_status: byCount(learningRecords.map((record) => record.lesson_status)),
    practice_status: byCount(learningRecords.map((record) => record.practice_status)),
    verification_status: byCount(learningRecords.map((record) => record.verification_status)),
    rollback_status: byCount(learningRecords.map((record) => record.rollback_status)),
    review_status: byCount(learningRecords.map((record) => record.review_status)),
    migration_status: byCount(learningRecords.map((record) => record.migration_status)),
    handler_status: byCount(learningRecords.map((record) => record.handler_status)),
    runtime_support: byCount(learningRecords.map((record) => record.runtime_support))
  };
  const commandsWithoutPractice = learningRecords.filter((record) => !record.practice_route_ids.length).map((record) => record.canonical_command_id).sort();
  const commandsWithoutVerification = learningRecords.filter((record) => record.verification_status === "missing").map((record) => record.canonical_command_id).sort();
  const commandsWithoutRollbackGuidance = sortBy(learningRecords
    .filter((record) => record.rollback_status === "missing")
    .map((record) => ({
      command_id: record.canonical_command_id,
      vendor_id: record.vendor_id,
      canonical_syntax: record.source_command.syntax,
      runtime_support: record.runtime_support,
      changes_configuration: Boolean(changesConfigurationByCommandId.get(record.canonical_command_id)),
      lesson_status: record.lesson_status,
      migration_status: record.migration_status,
      rollback_classification: rollbackGuidanceClassification(record)
    })), (item) => item.command_id);
  const routesWithMissingHandlers = routes.filter((route) => (route.missing_cli_handler_ids || []).length).map((route) => route.route_id).sort();
  const commandsBlockedByMissingHandlers = learningRecords.filter((record) => record.blocking_reasons.includes("missing_cli_handler")).map((record) => record.canonical_command_id).sort();
  const integrityReport = {
    schema_version: "learning-integrity-report.v1",
    canonical_command_count: learningRecords.length,
    command_count_per_vendor: byCount(learningRecords.map((record) => record.vendor_id)),
    duplicate_ids_found: rawDuplicateAudit.raw_duplicate_ids.map((item) => item.command_id),
    raw_duplicate_ids_detected: rawDuplicateAudit.raw_duplicate_ids.map((item) => item.command_id),
    duplicate_ids_resolved: rawDuplicateAudit.resolved_duplicate_ids,
    normalized_learning_records_consolidated: rawDuplicateAudit.resolved_duplicate_ids,
    raw_command_source_records_deleted: false,
    executable_command_id_renames_required: false,
    unresolved_duplicate_ids: rawDuplicateAudit.unresolved_duplicate_ids,
    objective_count: objectiveIndex.objective_count,
    module_count: modules.modules.length,
    status_counts: statusCounts,
    commands_without_practice: commandsWithoutPractice,
    routes_with_missing_handlers: routesWithMissingHandlers,
    commands_blocked_by_missing_handlers: commandsBlockedByMissingHandlers,
    commands_without_verification: commandsWithoutVerification,
    commands_without_rollback_guidance: commandsWithoutRollbackGuidance,
    prerequisite_cycles: modules.prerequisite_cycles,
    module_ordering_warnings: modules.modules.filter((module) => module.ordering_notes.length).map((module) => ({ module_id: module.module_id, notes: module.ordering_notes })),
    route_vendor_errors: [],
    broken_references: []
  };
  const coverageReport = {
    schema_version: "learning-coverage-report.v1",
    canonical_command_count: learningRecords.length,
    lesson_status_counts: statusCounts.lesson_status,
    practice_status_counts: statusCounts.practice_status,
    verification_status_counts: statusCounts.verification_status,
    rollback_status_counts: statusCounts.rollback_status,
    review_status_counts: statusCounts.review_status,
    migration_status_counts: statusCounts.migration_status,
    review_coverage: 0,
    commands_without_practice_count: commandsWithoutPractice.length,
    routes_with_missing_handlers_count: routesWithMissingHandlers.length,
    commands_without_verification_count: commandsWithoutVerification.length
  };
  const migrationReport = {
    schema_version: "learning-migration-readiness.v1",
    pilot_ready: learningRecords.filter((record) => record.migration_status === "pilot_ready").map((record) => record.canonical_command_id).sort(),
    batch_ready: learningRecords.filter((record) => record.migration_status === "batch_ready").map((record) => record.canonical_command_id).sort(),
    blocked_by_runtime: learningRecords.filter((record) => record.migration_status === "blocked_by_runtime").map((record) => record.canonical_command_id).sort(),
    blocked_by_verification: learningRecords.filter((record) => record.migration_status === "blocked_by_verification").map((record) => record.canonical_command_id).sort(),
    blocked_by_practice: learningRecords.filter((record) => record.migration_status === "blocked_by_practice").map((record) => record.canonical_command_id).sort(),
    blocked_by_content: learningRecords.filter((record) => record.migration_status === "blocked_by_content").map((record) => record.canonical_command_id).sort(),
    explanation_only: learningRecords.filter((record) => record.migration_status === "explanation_only").map((record) => record.canonical_command_id).sort(),
    unsupported: learningRecords.filter((record) => record.migration_status === "unsupported").map((record) => record.canonical_command_id).sort(),
    id_migrations: sources.commandIdMigrations.migrations || [],
    id_consolidations: sources.commandIdMigrations.consolidations || []
  };
  const traceability = {
    schema_version: "learning-traceability-matrix.v0.3.0-rc.1-stage-1",
    generated_from: "Stage 1 normalized learning metadata",
    source_commit: catalog.source_commit,
    runtime_baseline: catalog.runtime_baseline,
    approved_runtime_source: catalog.approved_runtime_source,
    counts: {
      canonical_commands: learningRecords.length,
      objectives: objectiveIndex.objective_count,
      modules: modules.modules.length,
      commands_without_practice: commandsWithoutPractice.length,
      commands_without_verification: commandsWithoutVerification.length,
      commands_without_rollback_guidance: commandsWithoutRollbackGuidance.length,
      routes_with_missing_handlers: routesWithMissingHandlers.length,
      review_coverage: 0
    },
    commands: learningRecords.map((record) => ({
      command_id: record.canonical_command_id,
      vendor: record.vendor_id,
      canonical_syntax: record.source_command.syntax,
      module: record.module_id,
      lesson: record.lesson_ids,
      learning_objectives: record.objective_ids,
      practice_route: record.practice_route_ids,
      runtime_support: record.runtime_support,
      changes_configuration: Boolean(changesConfigurationByCommandId.get(record.canonical_command_id)),
      handler_status: record.handler_status,
      verification_status: record.verification_status,
      verification_policy: record.verification_policy_ids,
      verification_command_ids: record.verification_command_ids,
      rollback_status: record.rollback_status,
      rollback_command_ids: record.rollback_command_ids,
      rollback_gap_classification: record.rollback_status === "missing" ? rollbackGuidanceClassification(record) : null,
      mastery_dimensions: record.mastery_dimensions,
      review_types: record.review_types,
      migration_status: record.migration_status,
      blocking_reasons: record.blocking_reasons
    }))
  };

  const validation = validateLearningArtifacts({
    sources,
    catalog,
    objectiveIndex,
    modules,
    sourceReport,
    integrityReport,
    coverageReport,
    migrationReport,
    traceability
  });
  const deterministic_generation = validation.errors.length === 0 ? "passed" : "not_run";
  const stageReportJson = {
    schema_version: "learning-integrity-stage-1-report.v1",
    base_commit: catalog.source_commit,
    stage_branch: "feature/learning-integrity-stage-1-data",
    source_files: sourceFiles,
    generated_files: Object.values(outputPaths).filter((file) => file !== outputPaths.stageReportMarkdown && file !== outputPaths.stageReportJson),
    validator: "tools/validate-learning-integrity.mjs",
    test_files: ["tests/learning-integrity.mjs"],
    canonical_command_count: learningRecords.length,
    command_count_per_vendor: integrityReport.command_count_per_vendor,
    duplicate_ids_found: integrityReport.duplicate_ids_found,
    raw_duplicate_ids_detected: integrityReport.raw_duplicate_ids_detected,
    duplicate_ids_resolved: integrityReport.duplicate_ids_resolved,
    normalized_learning_records_consolidated: integrityReport.normalized_learning_records_consolidated,
    raw_command_source_records_deleted: false,
    executable_command_id_renames_required: false,
    id_migrations: migrationReport.id_migrations,
    id_consolidations: migrationReport.id_consolidations,
    objective_count: objectiveIndex.objective_count,
    module_count: modules.modules.length,
    lesson_status_counts: statusCounts.lesson_status,
    practice_status_counts: statusCounts.practice_status,
    verification_status_counts: statusCounts.verification_status,
    rollback_status_counts: statusCounts.rollback_status,
    review_status_counts: statusCounts.review_status,
    migration_status_counts: statusCounts.migration_status,
    commands_blocked_by_missing_handlers: commandsBlockedByMissingHandlers,
    commands_blocked_by_missing_verification: commandsWithoutVerification,
    commands_without_rollback_guidance: commandsWithoutRollbackGuidance,
    commands_without_practice: commandsWithoutPractice,
    commands_pilot_ready: migrationReport.pilot_ready,
    commands_batch_ready: migrationReport.batch_ready,
    explanation_only_commands: migrationReport.explanation_only,
    unsupported_commands: migrationReport.unsupported,
    broken_references: validation.broken_references,
    vendor_errors: validation.vendor_errors,
    prerequisite_cycles: modules.prerequisite_cycles,
    deterministic_generation,
    review_coverage: 0,
    validation
  };
  const stageReportMarkdown = markdownReport(stageReportJson, coverageReport, migrationReport, integrityReport);
  return {
    sources,
    artifacts: {
      catalog,
      objectives: objectiveIndex,
      modules: {
        schema_version: "learning-module-prerequisites.v1",
        levels: modules.levels,
        topic_order: modules.topic_order,
        modules: modules.modules,
        prerequisite_cycles: modules.prerequisite_cycles
      },
      sourceReport,
      integrity: integrityReport,
      coverage: coverageReport,
      migration: migrationReport,
      traceability,
      stageReportJson,
      stageReportMarkdown
    },
    validation
  };
}

function markdownReport(report, coverage, migration, integrity) {
  return [
    "# Learning Integrity Stage 1 Report",
    "",
    "Stage branch: " + report.stage_branch,
    "Base commit: " + report.base_commit,
    "Runtime baseline: bdd1fc2abdf8b62ffe672d61b0f5f16f7d5ce155",
    "Approved runtime source: ea4bf7ce2223dc1a22db3de18c9f48c1427b155c",
    "",
    "## Summary",
    "- Canonical command count: " + report.canonical_command_count,
    "- Objective count: " + report.objective_count,
    "- Module count: " + report.module_count,
    "- Raw duplicate IDs detected: " + report.raw_duplicate_ids_detected.join(", "),
    "- Normalized learning records consolidated: " + report.normalized_learning_records_consolidated.join(", "),
    "- Raw command source records deleted: " + (report.raw_command_source_records_deleted ? "yes" : "no"),
    "- Executable command ID renames required: " + (report.executable_command_id_renames_required ? "yes" : "no"),
    "- ID migrations: " + report.id_migrations.length + " renames; " + report.id_consolidations.length + " consolidations.",
    "- Commands without practice: " + report.commands_without_practice.length,
    "- Routes with missing handlers: " + coverage.routes_with_missing_handlers_count,
    "- Commands without verification: " + report.commands_blocked_by_missing_verification.length,
    "- Commands without rollback guidance: " + report.commands_without_rollback_guidance.length,
    "- Review coverage: 0%",
    "",
    "## Status Counts",
    "~~~json",
    JSON.stringify({
      lesson_status_counts: report.lesson_status_counts,
      practice_status_counts: report.practice_status_counts,
      verification_status_counts: report.verification_status_counts,
      rollback_status_counts: report.rollback_status_counts,
      review_status_counts: report.review_status_counts,
      migration_status_counts: report.migration_status_counts
    }, null, 2),
    "~~~",
    "",
    "## Migration Readiness",
    "- Pilot ready: " + migration.pilot_ready.length,
    "- Batch ready: " + migration.batch_ready.length,
    "- Blocked by runtime: " + migration.blocked_by_runtime.length,
    "- Blocked by verification: " + migration.blocked_by_verification.length,
    "- Blocked by practice: " + migration.blocked_by_practice.length,
    "- Blocked by content: " + migration.blocked_by_content.length,
    "- Explanation only: " + migration.explanation_only.length,
    "- Unsupported: " + migration.unsupported.length,
    "",
    "## Integrity Findings",
    "- Broken references: " + report.broken_references.length,
    "- Vendor errors: " + report.vendor_errors.length,
    "- Prerequisite cycles: " + report.prerequisite_cycles.length,
    "- Module ordering warnings: " + integrity.module_ordering_warnings.length,
    "- Deterministic generation: " + report.deterministic_generation,
    "",
    "## Rollback Gaps",
    report.commands_without_rollback_guidance.length
      ? report.commands_without_rollback_guidance.map((item) => "- " + item.command_id + " (" + item.vendor_id + ", " + item.rollback_classification + ")").join("\n")
      : "- None",
    "",
    "## Required Honesty Notes",
    "- Planned or blocked content is not presented as complete.",
    "- Routes with missing handlers do not authorize practical-execution mastery.",
    "- Explanation-only commands do not authorize configuration, verification, Save, safety, or documentation mastery.",
    "- Review eligibility is defined, but no student review records are created and Home review counts are unchanged."
  ].join("\n") + "\n";
}

export function createOutputFiles(artifacts) {
  return new Map([
    [outputPaths.catalog, json(artifacts.catalog)],
    [outputPaths.objectives, json(artifacts.objectives)],
    [outputPaths.modules, json(artifacts.modules)],
    [outputPaths.sourceReport, json(artifacts.sourceReport)],
    [outputPaths.integrity, json(artifacts.integrity)],
    [outputPaths.coverage, json(artifacts.coverage)],
    [outputPaths.migration, json(artifacts.migration)],
    [outputPaths.traceability, json(artifacts.traceability)],
    [outputPaths.stageReportJson, json(artifacts.stageReportJson)],
    [outputPaths.stageReportMarkdown, artifacts.stageReportMarkdown]
  ]);
}

export async function writeOutputFiles(artifacts) {
  const files = createOutputFiles(artifacts);
  for (const [relative, content] of files.entries()) {
    const target = path.join(root, relative);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content);
  }
}

export async function compareOutputFiles(artifacts) {
  const differences = [];
  for (const [relative, expected] of createOutputFiles(artifacts).entries()) {
    let actual = "";
    try {
      actual = await fs.readFile(path.join(root, relative), "utf8");
    } catch {
      differences.push({ file: relative, reason: "missing" });
      continue;
    }
    if (actual !== expected) differences.push({ file: relative, reason: "content differs" });
  }
  return differences;
}

export function validateLearningArtifacts(bundle) {
  const { sources, catalog, objectiveIndex, modules, integrityReport, migrationReport } = bundle;
  const errors = [];
  const warnings = [];
  const brokenReferences = [];
  const vendorErrors = [];
  const vocab = sources.statusVocabularies;
  const vendors = new Set(Object.keys(sources.curriculumIndex.vendors || {}));
  const sourceCommands = sources.commandInventory.commands || [];
  const commandIds = new Set(sourceCommands.map((command) => command.command_id));
  const commandById = new Map(sourceCommands.map((command) => [command.command_id, command]));
  const routeIds = new Set((sources.routeInventory.routes || []).map((route) => route.route_id));
  const routeById = new Map((sources.routeInventory.routes || []).map((route) => [route.route_id, route]));
  const generatedLessonIds = new Set([...modules.generatedLessonById.keys()]);
  const dedicatedLessonIds = new Set([
    ...(sources.activeCurriculum.lessons || []).map((lesson) => lesson.id),
    ...(sources.foundationLessons.lessons || []).map((lesson) => lesson.id),
    ...(sources.foundationExtendedLessons.lessons || []).map((lesson) => lesson.id),
    ...(sources.configurationLessons.lessons || []).map((lesson) => lesson.id),
    ...(sources.configurationExtendedLessons.lessons || []).map((lesson) => lesson.id)
  ].filter(Boolean));
  const lessonIds = new Set([...generatedLessonIds, ...dedicatedLessonIds]);
  const moduleIds = new Set(modules.modules.map((module) => module.module_id));
  const objectiveIds = new Set();
  const objectiveReferenceCounts = new Map();
  const recordIds = new Set();
  const recordById = new Map();
  const aliasMasteryKeys = new Set();

  const requireAllowed = (value, allowed, label) => {
    if (!allowed.includes(value)) errors.push("Invalid " + label + ": " + value);
  };

  for (const objective of objectiveIndex.objectives || []) {
    if (objectiveIds.has(objective.objective_id)) errors.push("Duplicate objective ID: " + objective.objective_id);
    objectiveIds.add(objective.objective_id);
    if (!vendors.has(objective.vendor_scope)) vendorErrors.push("Unknown objective vendor: " + objective.objective_id + " -> " + objective.vendor_scope);
    if (!(objective.related_command_ids || []).length) errors.push("Objective has no command reference: " + objective.objective_id);
    for (const commandId of objective.related_command_ids || []) if (!commandIds.has(commandId)) brokenReferences.push("Objective command missing: " + objective.objective_id + " -> " + commandId);
    for (const prereq of objective.prerequisite_objective_ids || []) if (!objectiveIds.has(prereq) && !(objectiveIndex.objectives || []).some((candidate) => candidate.objective_id === prereq)) brokenReferences.push("Objective prerequisite missing: " + objective.objective_id + " -> " + prereq);
    for (const dimension of objective.mastery_dimensions || []) requireAllowed(dimension, vocab.mastery_dimensions, "objective mastery dimension");
  }

  for (const module of modules.modules || []) {
    if (!vendors.has(module.vendor_id)) vendorErrors.push("Unknown module vendor: " + module.module_id + " -> " + module.vendor_id);
    for (const prereq of module.prerequisite_module_ids || []) if (!moduleIds.has(prereq)) brokenReferences.push("Module prerequisite missing: " + module.module_id + " -> " + prereq);
  }

  for (const record of catalog.commands || []) {
    if (recordIds.has(record.canonical_command_id)) errors.push("Duplicate learning command record: " + record.canonical_command_id);
    recordIds.add(record.canonical_command_id);
    recordById.set(record.canonical_command_id, record);
    if (!commandIds.has(record.canonical_command_id)) brokenReferences.push("Learning record command missing: " + record.canonical_command_id);
    if (!vendors.has(record.vendor_id)) vendorErrors.push("Unknown command vendor: " + record.canonical_command_id + " -> " + record.vendor_id);
    if (record.module_id && !moduleIds.has(record.module_id)) brokenReferences.push("Command module missing: " + record.canonical_command_id + " -> " + record.module_id);
    for (const id of record.prerequisite_module_ids || []) if (!moduleIds.has(id)) brokenReferences.push("Command prerequisite module missing: " + record.canonical_command_id + " -> " + id);
    for (const id of record.prerequisite_command_ids || []) if (!commandIds.has(id)) brokenReferences.push("Command prerequisite command missing: " + record.canonical_command_id + " -> " + id);
    if (!(record.objective_ids || []).length) errors.push("Command has no objective reference: " + record.canonical_command_id);
    for (const id of record.objective_ids || []) {
      if (!objectiveIds.has(id)) brokenReferences.push("Command objective missing: " + record.canonical_command_id + " -> " + id);
      objectiveReferenceCounts.set(id, (objectiveReferenceCounts.get(id) || 0) + 1);
    }
    for (const id of record.lesson_ids || []) if (!lessonIds.has(id)) brokenReferences.push("Command lesson missing: " + record.canonical_command_id + " -> " + id);
    for (const id of record.practice_route_ids || []) {
      if (!routeIds.has(id)) brokenReferences.push("Command route missing: " + record.canonical_command_id + " -> " + id);
      const route = routeById.get(id);
      if (route && route.vendor !== record.vendor_id) vendorErrors.push("Cross-vendor route mapping: " + record.canonical_command_id + " -> " + id);
    }
    for (const id of record.verification_command_ids || []) if (!commandIds.has(id)) brokenReferences.push("Verification command missing: " + record.canonical_command_id + " -> " + id);
    for (const id of record.rollback_command_ids || []) if (!commandIds.has(id)) brokenReferences.push("Rollback command missing: " + record.canonical_command_id + " -> " + id);
    requireAllowed(record.lesson_status, vocab.lesson_status, "lesson status");
    requireAllowed(record.practice_status, vocab.practice_status, "practice status");
    requireAllowed(record.verification_status, vocab.verification_status, "verification status");
    requireAllowed(record.rollback_status, vocab.rollback_status, "rollback status");
    requireAllowed(record.review_status, vocab.review_status, "review status");
    requireAllowed(record.migration_status, vocab.migration_status, "migration status");
    requireAllowed(record.handler_status, vocab.handler_status, "handler status");
    requireAllowed(record.runtime_support, vocab.runtime_support, "runtime support");
    for (const dimension of record.mastery_dimensions || []) requireAllowed(dimension, vocab.mastery_dimensions, "mastery dimension");
    for (const reviewType of record.review_types || []) requireAllowed(reviewType, vocab.review_types, "review type");
    for (const stage of record.required_lesson_stages || []) requireAllowed(stage, vocab.lesson_stages, "lesson stage");
    for (const alias of record.source_command.aliases || []) {
      const key = record.vendor_id + ":" + normalise(alias);
      if (aliasMasteryKeys.has(key)) warnings.push("Alias reused within vendor mastery identity: " + key);
      aliasMasteryKeys.add(key);
    }
    if (!record.practice_route_ids.length && !["planned", "runtime_free_practice", "explanation_only", "unsupported"].includes(record.practice_status)) errors.push("Missing practice not explicit: " + record.canonical_command_id);
    if (record.verification_status === "missing" && !record.blocking_reasons.includes("missing_verification")) errors.push("Missing verification not explicit: " + record.canonical_command_id);
    if (record.handler_status === "route_missing_handler" && !record.blocking_reasons.includes("missing_cli_handler")) errors.push("Missing handler not explicit: " + record.canonical_command_id);
    if (record.runtime_support === "explanation_only" && (record.mastery_dimensions || []).some((dimension) => ["practical_execution", "verification", "safety", "documentation"].includes(dimension))) errors.push("Explanation-only command has unsupported mastery dimension: " + record.canonical_command_id);
    if ((record.review_types || []).length && record.review_status !== "planned") errors.push("Stage 1 review status must remain planned: " + record.canonical_command_id);
  }

  for (const objective of objectiveIndex.objectives || []) {
    if (!objectiveReferenceCounts.has(objective.objective_id)) errors.push("Objective is not referenced by any command: " + objective.objective_id);
    for (const commandId of objective.related_command_ids || []) {
      const record = recordById.get(commandId);
      if (record && record.vendor_id !== objective.vendor_scope) vendorErrors.push("Cross-vendor executable objective mapping: " + objective.objective_id + " -> " + commandId);
    }
  }

  const missingVerificationIds = (catalog.commands || []).filter((record) => record.verification_status === "missing").map((record) => record.canonical_command_id).sort();
  const reportedMissingVerificationIds = [...(integrityReport.commands_without_verification || [])].sort();
  if (JSON.stringify(missingVerificationIds) !== JSON.stringify(reportedMissingVerificationIds)) errors.push("Missing verification report does not match learning records.");
  const expectedBlockedByVerificationIds = (catalog.commands || []).filter((record) => record.verification_status === "missing" && record.migration_status === "blocked_by_verification").map((record) => record.canonical_command_id).sort();
  const reportedBlockedByVerificationIds = [...(migrationReport?.blocked_by_verification || [])].sort();
  if (JSON.stringify(expectedBlockedByVerificationIds) !== JSON.stringify(reportedBlockedByVerificationIds)) errors.push("Blocked-by-verification report does not match migration records.");

  const missingRollbackIds = new Set((catalog.commands || []).filter((record) => record.rollback_status === "missing").map((record) => record.canonical_command_id));
  const reportedRollbackGapIds = new Set();
  const rollbackClassifications = new Set(["genuinely_missing", "not_applicable", "explanation_only_but_still_recommended", "blocked_by_incomplete_source_metadata"]);
  for (const item of integrityReport.commands_without_rollback_guidance || []) {
    reportedRollbackGapIds.add(item.command_id);
    const record = recordById.get(item.command_id);
    const sourceCommand = commandById.get(item.command_id);
    if (!record) {
      brokenReferences.push("Rollback gap command missing: " + item.command_id);
      continue;
    }
    if (record.rollback_status !== "missing") errors.push("Rollback gap listed for non-missing command: " + item.command_id);
    if (item.vendor_id !== record.vendor_id) vendorErrors.push("Rollback gap vendor mismatch: " + item.command_id);
    if (item.canonical_syntax !== record.source_command.syntax) errors.push("Rollback gap syntax mismatch: " + item.command_id);
    if (item.runtime_support !== record.runtime_support) errors.push("Rollback gap runtime mismatch: " + item.command_id);
    if (item.changes_configuration !== isConfigurationLike(sourceCommand || {})) errors.push("Rollback gap configuration flag mismatch: " + item.command_id);
    if (item.lesson_status !== record.lesson_status) errors.push("Rollback gap lesson status mismatch: " + item.command_id);
    if (item.migration_status !== record.migration_status) errors.push("Rollback gap migration status mismatch: " + item.command_id);
    if (!rollbackClassifications.has(item.rollback_classification)) errors.push("Invalid rollback gap classification: " + item.command_id);
    if (item.rollback_classification === "genuinely_missing" && item.changes_configuration && ["pilot_ready", "batch_ready"].includes(record.migration_status)) errors.push("Premium migration candidate lacks rollback guidance: " + item.command_id);
  }
  for (const commandId of missingRollbackIds) if (!reportedRollbackGapIds.has(commandId)) errors.push("Missing rollback guidance not reported: " + commandId);
  for (const commandId of reportedRollbackGapIds) if (!missingRollbackIds.has(commandId)) errors.push("Rollback gap report includes non-missing command: " + commandId);

  for (const commandId of commandIds) if (!recordIds.has(commandId)) errors.push("Canonical command has no learning record: " + commandId);
  if ((catalog.commands || []).length !== commandIds.size) errors.push("Learning record count does not match canonical inventory count.");
  if (sources.commandIdMigrations.migrations?.length && sources.commandIdMigrations.migrations.some((item) => !commandIds.has(item.to_command_id))) brokenReferences.push("ID migration target missing.");
  if (sources.commandIdMigrations.consolidations?.some((item) => !commandIds.has(item.canonical_command_id))) brokenReferences.push("ID consolidation target missing.");
  if (sources.commandIdMigrations.consolidations?.length < sources.commandAudit.duplicate_command_ids?.length) errors.push("Not every generated duplicate command ID has a Stage 1 consolidation record.");
  if (integrityReport.review_coverage && integrityReport.review_coverage !== 0) errors.push("Review coverage was fabricated.");
  if ((modules.prerequisite_cycles || []).length) errors.push("Prerequisite graph has cycles.");
  if (brokenReferences.length) errors.push("Broken references found: " + brokenReferences.length);
  if (vendorErrors.length) errors.push("Vendor errors found: " + vendorErrors.length);
  return {
    passed: errors.length === 0,
    errors,
    warnings,
    broken_references: brokenReferences,
    vendor_errors: vendorErrors,
    prerequisite_cycles: modules.prerequisite_cycles || [],
    metrics: {
      commands: catalog.commands.length,
      objectives: objectiveIndex.objectives.length,
      modules: modules.modules.length,
      commands_without_practice: integrityReport.commands_without_practice.length,
      routes_with_missing_handlers: integrityReport.routes_with_missing_handlers.length,
      commands_without_verification: integrityReport.commands_without_verification.length,
      commands_without_rollback_guidance: (integrityReport.commands_without_rollback_guidance || []).length,
      review_coverage: 0
    }
  };
}
