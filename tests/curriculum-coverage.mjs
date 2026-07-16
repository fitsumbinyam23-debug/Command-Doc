import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFile(path.join(root, file), "utf8");
const readJson = async (file) => JSON.parse(await read(file));
const errors = [];
const check = (condition, message) => {
  if (!condition) errors.push(message);
};

const expectedPhases = [
  ["phase_01", 1, "ABSOLUTE BEGINNER", ["level_00", "level_01", "level_02", "level_03", "level_04"]],
  ["phase_02", 2, "SWITCHING FOUNDATIONS", ["level_05", "level_06", "level_07", "level_08", "level_09"]],
  ["phase_03", 3, "ROUTING AND NETWORK SERVICES", ["level_10", "level_11", "level_12", "level_13"]],
  ["phase_04", 4, "WIRELESS AND VOICE", ["level_14", "level_15"]],
  ["phase_05", 5, "SECURITY", ["level_16", "level_17", "level_18"]],
  ["phase_06", 6, "RESILIENCE AND ENTERPRISE SWITCHING", ["level_19", "level_20", "level_21"]],
  ["phase_07", 7, "MONITORING AND TROUBLESHOOTING", ["level_22", "level_23", "level_24", "level_25", "level_26"]],
  ["phase_08", 8, "REAL OPERATIONAL WORK", ["level_27", "level_28", "level_29", "level_30"]],
  ["phase_09", 9, "HOSPITALITY AND BUSINESS SCENARIOS", ["level_31", "level_32", "level_33"]],
  ["phase_10", 10, "ADVANCED NETWORKING", ["level_34", "level_35", "level_36", "level_37", "level_38", "level_39"]]
];

const expectedLevelTitles = [
  "Welcome to Networking",
  "Network Devices and Connections",
  "How Data Moves",
  "IP Addressing",
  "Subnetting",
  "Ethernet Switching",
  "VLAN Fundamentals",
  "Trunks and VLAN Transport",
  "Spanning Tree",
  "Link Aggregation",
  "Inter-VLAN Routing",
  "Routing Fundamentals",
  "Dynamic Routing",
  "Essential Network Services",
  "Wireless Networking",
  "Voice and Real-Time Traffic",
  "Network Security Foundations",
  "Switch-Port Security",
  "Access Control and Authentication",
  "High Availability",
  "Stacking and Virtual Chassis",
  "Network Architecture",
  "Monitoring and Performance",
  "Troubleshooting Methodology",
  "Physical and Cabling Troubleshooting",
  "Layer 2 Troubleshooting",
  "Layer 3 Troubleshooting",
  "Change Management",
  "Device Deployment",
  "Software, Recovery and Replacement",
  "Documentation and Communication",
  "Hospitality Network Foundations",
  "Hospitality Troubleshooting Scenarios",
  "Incident and Service Restoration",
  "Advanced Switching",
  "Advanced Routing",
  "Multicast and Media Networks",
  "Quality of Service",
  "Network Automation",
  "Advanced Network Operations"
];

const expectedSpecializations = [
  "Switching and Campus Networks",
  "Routing and WAN",
  "Wireless",
  "Network Security",
  "Hospitality Networking",
  "Windows and Linux Network Diagnostics",
  "Monitoring and Operations",
  "Network Automation"
];

const blueprintTopics = new Map([
  [0, ["What is a network?", "Why devices communicate", "LAN, WAN and the internet", "What a network technician does", "Real devices versus Command Doctor simulation", "Safe learning rules", "Beginner glossary", "Level checkpoint"]],
  [1, ["endpoints and clients", "servers", "switches", "routers and firewalls", "access points", "IP phones, printers and connected devices", "patch panels and racks", "copper and fibre", "SFPs and transceivers", "port numbers and link lights"]],
  [4, ["binary foundations", "network and host portions", "CIDR", "network, broadcast and usable addresses", "subnet sizes", "VLSM", "address planning", "subnetting drills"]],
  [20, ["Cisco StackWise", "HP Comware IRF", "Aruba VSF and VSX", "member numbering", "priority and election", "stack links", "split-brain concepts", "adding and replacing members", "failure troubleshooting", "reboot and verification"]],
  [31, ["guest-room networks", "back-of-house", "corporate networks", "guest and staff Wi-Fi", "IPTV", "VoIP", "POS", "CCTV", "door locks", "GRMS", "digital signage", "building systems"]],
  [36, ["multicast concepts", "IGMP", "IGMP Snooping", "PIM awareness", "IPTV multicast", "multicast flooding", "querier behaviour", "multicast troubleshooting"]]
]);

const phaseRequired = ["phase_id", "phase_number", "title", "purpose", "target_student", "prerequisite_phase_ids", "level_ids", "estimated_learning_hours", "completion_rule", "status"];
const levelRequired = ["level_id", "level_number", "phase_id", "title", "plain_language_summary", "why_it_matters", "target_student", "learning_outcomes", "prerequisite_level_ids", "prerequisite_concepts", "modules", "vendor_scope", "command_ids", "related_command_ids", "practice_types", "scenario_types", "required_evidence_types", "mastery_dimensions", "estimated_learning_hours", "difficulty", "content_status", "practice_status", "review_status", "specialization_links"];
const moduleRequired = ["module_id", "title", "purpose", "objectives", "concept_ids", "command_ids", "lesson_ids", "prerequisite_module_ids", "practice_adapter", "scenario_ids", "estimated_minutes", "status"];

const [catalog, curriculum, commandMapFile, specializations, coverage, schema] = await Promise.all([
  readJson("data/generated/learning-command-catalog.json"),
  readJson("data/curriculum/complete-networking-curriculum.json"),
  readJson("data/curriculum/curriculum-command-map.json"),
  readJson("data/curriculum/curriculum-specializations.json"),
  readJson("reports/curriculum-command-coverage.json"),
  readJson("data/curriculum/complete-networking-curriculum.schema.json")
]);

const catalogCommands = catalog.commands || [];
const commandMap = commandMapFile.commands || [];
const levels = curriculum.levels || [];
const phases = curriculum.phases || [];
const levelById = new Map(levels.map((level) => [level.level_id, level]));
const commandById = new Map(catalogCommands.map((command) => [command.canonical_command_id, command]));
const mappedById = new Map(commandMap.map((record) => [record.canonical_command_id, record]));

check(phases.length === expectedPhases.length, "approved phase count must be 10");
for (const [phaseId, phaseNumber, title, levelIds] of expectedPhases) {
  const phase = phases.find((item) => item.phase_id === phaseId || item.phase_number === phaseNumber);
  check(Boolean(phase), `missing approved phase ${phaseNumber}: ${title}`);
  if (!phase) continue;
  check(phase.phase_id === phaseId, `phase ${phaseNumber} id mismatch`);
  check(phase.phase_number === phaseNumber, `phase ${phaseNumber} number mismatch`);
  check(phase.title === title, `phase ${phaseNumber} title mismatch`);
  check(JSON.stringify(phase.level_ids) === JSON.stringify(levelIds), `phase ${phaseNumber} level membership mismatch`);
  for (const field of phaseRequired) check(Object.hasOwn(phase, field), `phase ${phase.phase_id} missing field ${field}`);
}

check(levels.length === expectedLevelTitles.length, "approved level count must be 40");
for (let index = 0; index < expectedLevelTitles.length; index += 1) {
  const id = `level_${String(index).padStart(2, "0")}`;
  const level = levelById.get(id);
  check(Boolean(level), `missing approved level ${id}`);
  if (!level) continue;
  check(level.level_number === index, `${id} number mismatch`);
  check(level.title === expectedLevelTitles[index], `${id} title mismatch`);
  for (const field of levelRequired) check(Object.hasOwn(level, field), `${id} missing field ${field}`);
  for (const module of level.modules || []) for (const field of moduleRequired) check(Object.hasOwn(module, field), `${module.module_id || "(missing module id)"} missing field ${field}`);
}

for (const [levelNumber, topics] of blueprintTopics) {
  const level = levelById.get(`level_${String(levelNumber).padStart(2, "0")}`);
  const text = JSON.stringify(level?.modules || []);
  for (const topic of topics) check(text.includes(topic), `level ${levelNumber} missing blueprint topic: ${topic}`);
}

const specializationTitles = (specializations.specializations || []).map((item) => item.title);
check(JSON.stringify(specializationTitles) === JSON.stringify(expectedSpecializations), "approved specialization titles mismatch");

check(schema.definitions || schema.$defs, "schema must define nested definitions");
const defs = schema.$defs || schema.definitions || {};
check(JSON.stringify(defs.phase?.required || []).includes("phase_number"), "schema phase definition must require phase_number");
check(JSON.stringify(defs.level?.required || []).includes("plain_language_summary"), "schema level definition must require plain_language_summary");
check(JSON.stringify(defs.module?.required || []).includes("practice_adapter"), "schema module definition must require practice_adapter");
check(defs.level?.additionalProperties === false, "schema level should reject unknown properties");
check((defs.level?.required || []).length >= levelRequired.length, "schema must reject a level missing required fields");

let placementFile = null;
try {
  placementFile = await readJson("data/curriculum/curriculum-command-placement.json");
} catch {
  errors.push("missing curated curriculum-command-placement.json");
}
const placement = placementFile?.placements || [];
const placementById = new Map(placement.map((record) => [record.canonical_command_id, record]));
check(placement.length === catalogCommands.length, "curated placement must cover every current command");

for (const command of catalogCommands) {
  const record = mappedById.get(command.canonical_command_id);
  const placementRecord = placementById.get(command.canonical_command_id);
  check(Boolean(record), `missing command map record for ${command.canonical_command_id}`);
  check(Boolean(placementRecord), `missing curated placement record for ${command.canonical_command_id}`);
  if (!record) continue;
  check(record.learning_identity === command.canonical_command_id, `${command.canonical_command_id} must keep stable learning identity`);
  check(record.vendor_id === command.vendor_id, `${command.canonical_command_id} must preserve vendor scope`);
  check(record.operating_system_family_id === command.operating_system_family_id, `${command.canonical_command_id} must preserve operating-system scope`);
  check(record.learning_objectives?.length, `${command.canonical_command_id} missing objectives`);
  check(record.lesson_status, `${command.canonical_command_id} missing lesson status`);
  check(record.practice_status, `${command.canonical_command_id} missing practice status`);
  check(record.verification_status, `${command.canonical_command_id} missing verification status`);
  check(record.rollback_status, `${command.canonical_command_id} missing rollback status`);
  check(record.mastery_policy, `${command.canonical_command_id} missing mastery policy`);
  check(record.review_eligibility, `${command.canonical_command_id} missing review eligibility`);
  check(record.migration_status, `${command.canonical_command_id} missing migration status`);
  if (!placementRecord) continue;
  check(placementRecord.placement_rationale, `${command.canonical_command_id} missing placement rationale`);
  check(Array.isArray(placementRecord.reviewed_by_domain) && placementRecord.reviewed_by_domain.length, `${command.canonical_command_id} missing SME review domain`);
  check(record.level_id === placementRecord.primary_level_id, `${command.canonical_command_id} command map must use curated primary level`);
}

const arubaConfigure = mappedById.get("aruba_configure_terminal");
check(arubaConfigure?.level_id !== "level_21", "aruba_configure_terminal must not map into Cisco IOS Operations");

const semanticRules = [
  [/vlan/i, ["level_06", "level_07"], "VLAN command outside VLAN/trunk primary home"],
  [/spanning|stp/i, ["level_08"], "STP command outside Level 8 primary home"],
  [/lacp|etherchannel|port-channel|aggregation/i, ["level_09"], "LACP/EtherChannel command outside Level 9 primary home"],
  [/stack|irf|vsf|vsx/i, ["level_20"], "stack/IRF/VSF/VSX command outside Level 20 primary home"],
  [/multicast|igmp|pim/i, ["level_36"], "multicast command outside Level 36 primary home"],
  [/qos|queue|priority/i, ["level_37"], "QoS command outside Level 37 primary home"],
  [/api|json|yaml|python|ansible|automation/i, ["level_38"], "automation command outside Level 38 primary home"]
];
for (const [pattern, allowedLevels, message] of semanticRules) {
  for (const record of placement) {
    const command = commandById.get(record.canonical_command_id);
    const text = `${command?.source_command?.syntax || ""} ${command?.topic_id || ""} ${record.placement_rationale || ""}`;
    if (pattern.test(text) && !allowedLevels.includes(record.primary_level_id)) {
      check(Boolean(record.placement_rationale?.match(/related|secondary|endpoint|troubleshooting/i)), `${message}: ${record.canonical_command_id}`);
    }
  }
}

check(coverage.authoritative_command_count === catalogCommands.length, "coverage report uses current authoritative count");
check(coverage.commands_mapped === catalogCommands.length, "coverage report maps every command");
check(coverage.commands_omitted?.length === 0, "coverage report omits no commands");

let deterministic = null;
try {
  deterministic = await import(pathToFileURL(path.join(root, "tools", "curriculum-determinism.mjs")).href);
} catch {
  errors.push("missing executable LF/CRLF deterministic comparison helper");
}
if (deterministic?.normalizeForDeterministicCompare) {
  check(deterministic.normalizeForDeterministicCompare("a\nb\n") === deterministic.normalizeForDeterministicCompare("a\r\nb\r\n"), "LF and CRLF outputs must compare equal after normalization");
}

if (errors.length) {
  console.error(JSON.stringify({ status: "failed", errors }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: "passed",
  authoritative_command_count: catalogCommands.length,
  commands_mapped: commandMap.length,
  phases: phases.length,
  levels: levels.length,
  specializations: specializationTitles
}, null, 2));
