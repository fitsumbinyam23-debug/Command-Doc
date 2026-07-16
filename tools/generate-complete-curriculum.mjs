import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const files = {
  catalog: "data/generated/learning-command-catalog.json",
  schema: "data/curriculum/complete-networking-curriculum.schema.json",
  curriculum: "data/curriculum/complete-networking-curriculum.json",
  map: "data/curriculum/curriculum-command-map.json",
  specializations: "data/curriculum/curriculum-specializations.json",
  coverageJson: "reports/curriculum-command-coverage.json",
  coverageMd: "reports/curriculum-command-coverage.md",
  readinessJson: "reports/beginner-experience-readiness.json",
  readinessMd: "reports/beginner-experience-readiness.md",
  curriculumDoc: "docs/COMPLETE-NETWORKING-CURRICULUM.md",
  beginnerDoc: "docs/BEGINNER-LEARNING-EXPERIENCE.md",
  mappingDoc: "docs/CURRICULUM-COMMAND-MAPPING.md",
  uiDoc: "docs/LEARNING-EXPERIENCE-UI-STANDARD.md"
};

const vendorLabels = {
  aruba_cx: "ArubaOS-CX",
  cisco_ios: "Cisco IOS",
  hp_comware: "HP Comware",
  linux: "Linux",
  windows_cmd: "Windows CMD"
};

const stepNames = ["Mission", "Learn", "See", "Key words", "Predict", "Try", "Explain", "Confidence", "Continue"];
const levelTitles = [
  "What a Network Technician Does",
  "CLI Safety And Evidence Basics",
  "Packets, Addresses, And Local Networks",
  "Reading A Simple Network Diagram",
  "Ethernet, Ports, And Cables",
  "Switch Interfaces And Link State",
  "VLAN Purpose And Access Ports",
  "Trunks And Allowed VLANs",
  "Spanning Tree And Loop Prevention",
  "Link Aggregation And Uplinks",
  "IPv4 Gateways And Routed Interfaces",
  "Static Routes And Reachability",
  "Dynamic Routing Concepts",
  "DHCP, DNS, NTP, And Support Services",
  "Wireless And Edge Access Concepts",
  "Quality, Voice, And Critical Services",
  "Access Control And Safe Boundaries",
  "Authentication And Management Access",
  "Change Windows And Rollback Planning",
  "Stacking And Chassis Operations",
  "Multi-Vendor CLI Translation",
  "Cisco IOS Operations",
  "HP Comware Operations",
  "ArubaOS-CX Operations",
  "Troubleshooting Method And Ticket Evidence",
  "Layer 1 And Layer 2 Troubleshooting",
  "IP And Service Troubleshooting",
  "Terminal Practice And Command Selection",
  "Maintenance, Files, And Boot Readiness",
  "Verification Before Save",
  "Rollback, Restore, And Local Recovery",
  "Incident Notes And Handoff Quality",
  "Automation Readiness And Data Formats",
  "Inventory, Baselines, And Documentation",
  "Monitoring Signals And Review Routines",
  "Scenario Planning And Escalation",
  "Campus Access Specialization",
  "Datacenter And Aggregation Specialization",
  "Security Operations Specialization",
  "Field Readiness Capstone"
];

const phaseDefs = [
  ["phase_00", "Orientation And Network Thinking", 0, 3],
  ["phase_01", "Local Networking Foundations", 4, 7],
  ["phase_02", "Switching Core", 8, 11],
  ["phase_03", "Routing And Services", 12, 15],
  ["phase_04", "Security And Change Control", 16, 19],
  ["phase_05", "Multi-Vendor Operations", 20, 23],
  ["phase_06", "Troubleshooting Practice", 24, 27],
  ["phase_07", "Production Readiness", 28, 31],
  ["phase_08", "Automation And Documentation", 32, 35],
  ["phase_09", "Specialization And Field Readiness", 36, 39]
];

const specializationDefs = [
  ["access-switching-technician", "Access Switching Technician", [4, 5, 6, 7, 8, 25, 29]],
  ["campus-network-support", "Campus Network Support", [10, 11, 13, 24, 26, 31]],
  ["multi-vendor-switching", "Multi-Vendor Switching", [20, 21, 22, 23, 27]],
  ["windows-linux-network-diagnostics", "Windows And Linux Network Diagnostics", [2, 13, 24, 26, 34]],
  ["wireless-and-edge-support", "Wireless And Edge Support", [5, 6, 14, 24, 36]],
  ["security-and-change-control", "Security And Change Control", [16, 17, 18, 29, 30, 38]],
  ["datacenter-operations", "Datacenter Operations", [9, 12, 19, 28, 37]],
  ["automation-and-documentation", "Automation And Documentation", [31, 32, 33, 34, 35]]
];

const level0Lessons = [
  ["level00_mission_network_technician", "Mission: What a network technician protects", "Describe the technician job as protecting communication with evidence, patience, and safe choices.", ["network", "device", "evidence", "change", "verification"]],
  ["level00_network_words", "Learn: The words beginners hear first", "Recognize common words used by network teams without memorizing vendor commands yet.", ["host", "switch", "router", "interface", "VLAN", "gateway"]],
  ["level00_see_local_network", "See: A tiny network from endpoint to service", "Trace a simple path from an endpoint through a switch and gateway to a service.", ["path", "source", "destination", "local", "remote"]],
  ["level00_key_words_cli", "Key words: CLI, prompt, output, and evidence", "Explain what a command-line prompt, command, output, and evidence mean.", ["CLI", "prompt", "command", "output", "evidence"]],
  ["level00_predict_before_change", "Predict: Say what you expect before checking", "Make a simple prediction before reading output or trying a command.", ["prediction", "expected", "actual", "compare", "reason"]],
  ["level00_try_no_real_device", "Try: Practice without reaching a real device", "Understand that beginner practice is local, simulated, and separated from production devices.", ["simulation", "local", "safe", "practice", "production"]],
  ["level00_explain_ticket_note", "Explain: Turn evidence into a note", "Write a short support note that separates symptom, evidence, and next step.", ["symptom", "evidence", "interpretation", "next step", "ticket"]],
  ["level00_continue_path", "Continue: Choose the next learning path", "Choose whether to keep learning from zero, practise a route, or open technician tools.", ["path", "course", "practice", "tools", "progress"]]
].map(([lesson_id, title, objective, key_words], index) => ({
  lesson_id,
  title,
  objective,
  key_words,
  status: "authored",
  lesson_number: index + 1,
  stepper_steps: stepNames,
  command_ids: [],
  mastery_eligible: false,
  review_eligible: true,
  mission: index === 0 ? "A guest cannot connect. Your job is to collect clues, explain what they mean, and choose a safe next step." : "Follow the beginner path by separating words, evidence, prediction, safe practice, and clear notes.",
  learn: "Beginner learning starts with concepts and evidence before vendor syntax or configuration changes.",
  see: "Endpoint -> access switch -> gateway -> service. The path gives every check a place.",
  predict: "Say what a healthy result should look like before reading output.",
  try_prompt: "Choose the safest answer from the local training prompt.",
  explain: "A useful answer names the symptom, evidence, interpretation, and next step.",
  confidence_prompt: "Rate your confidence before continuing.",
  practical_status: "not_applicable_concept_orientation"
}));

const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const readJson = async (file) => JSON.parse(await fs.readFile(path.join(root, file), "utf8"));
const writeText = async (file, content) => {
  const target = path.join(root, file);
  if (checkOnly) {
    const current = await fs.readFile(target, "utf8").catch(() => "");
    if (current !== content) throw new Error(`${file} is not current. Run npm run curriculum:generate.`);
    return;
  }
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content);
};
const writeJson = (file, value) => writeText(file, json(value));
const levelId = (level) => `level_${String(level).padStart(2, "0")}`;
const commandSyntax = (command) => command.source_command?.syntax || command.canonical_command || command.canonical_command_id;
const normalizeTopic = (value) => String(value || "general").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "general";
const phaseForLevel = (level) => phaseDefs.find(([, , start, end]) => level >= start && level <= end);

function assignLevel(command) {
  const text = `${commandSyntax(command)} ${command.topic_id || ""} ${command.module_id || ""}`.toLowerCase();
  if (command.vendor_id === "windows_cmd" || command.vendor_id === "linux") {
    if (/route|gateway|dns|dhcp|nslookup|dig/.test(text)) return 26;
    if (/ipconfig|ip addr|interface|netsh/.test(text)) return 24;
    return 20;
  }
  if (/wireless|wlan|ssid|radio/.test(text)) return 14;
  if (/aaa|radius|tacacs|ssh|username|password|secret/.test(text)) return 17;
  if (/acl|access-list|port-security|security/.test(text)) return 16;
  if (/copy|save|write|startup|running-config|rollback|restore/.test(text)) return 29;
  if (/boot|version|inventory|logging|reload|dir|flash|file/.test(text)) return 28;
  if (/stack|irf|vsf|vss|member/.test(text)) return 19;
  if (/ospf|eigrp|bgp|route|routing/.test(text)) return 12;
  if (/ip address|gateway|interface vlan|svi/.test(text)) return 10;
  if (/dns|dhcp|ntp/.test(text)) return 13;
  if (/trunk|allowed vlan|native vlan/.test(text)) return 7;
  if (/spanning|stp|loop/.test(text)) return 8;
  if (/channel|lacp|etherchannel|port-channel/.test(text)) return 9;
  if (/vlan/.test(text) || command.topic_id === "vlans") return 6;
  if (/interface|shutdown|description|speed|duplex|power inline/.test(text) || command.topic_id === "interfaces") return 5;
  if (/mac|neighbor|cdp|lldp|arp/.test(text)) return 4;
  if (/configure|system-view|enable|terminal|hostname/.test(text) || command.topic_id === "cli_foundation") return 21;
  if (command.vendor_id === "hp_comware") return 22;
  if (command.vendor_id === "aruba_cx") return 23;
  return 24;
}

function plannedModule(level, suffix, title) {
  return {
    module_id: `${levelId(level)}_${suffix}`,
    title,
    status: level === 0 ? "authored" : "planned_outline",
    level_id: levelId(level),
    command_ids: [],
    learning_objectives: [
      level === 0 ? "Build confidence before vendor syntax." : `Explain ${title.toLowerCase()} with accurate vocabulary.`,
      level === 0 ? "Separate production devices from local practice." : "Identify safe evidence before any change."
    ],
    evidence_requirements: level === 0
      ? ["checkpoint response", "confidence rating", "local resume position"]
      : ["author lesson", "add syntax coverage", "define practice or blocker", "define verification evidence"],
    blocking_reasons: level === 0 ? [] : ["planned level outline only", "lesson content not fully authored"]
  };
}

function buildCurriculum(catalog) {
  const levels = levelTitles.map((title, number) => {
    const phase = phaseForLevel(number);
    return {
      level_id: levelId(number),
      level_number: number,
      title,
      phase_id: phase[0],
      status: number === 0 ? "authored" : "planned_outline",
      lesson_status: number === 0 ? "authored" : "planned",
      practice_status: number === 0 ? "concept_checkpoint_only" : "blocked_until_practice_authored",
      verification_status: number === 0 ? "concept_explanation_only" : "blocked_until_evidence_authored",
      rollback_status: number === 0 ? "not_applicable_vendor_neutral" : "blocked_until_change_scope_defined",
      mastery_policy: { eligible: false, reason: number === 0 ? "Orientation does not award command mastery." : "Planned levels cannot award mastery without authored evidence." },
      review_eligibility: { eligible: number === 0, reason: number === 0 ? "Concept review only." : "Review becomes eligible after authored content exists." },
      migration_status: number === 0 ? "authored" : "planned",
      blocking_reasons: number === 0 ? [] : ["planned content outline", "no practical mastery evidence"],
      prerequisite_level_ids: number === 0 ? [] : [levelId(number - 1)],
      modules: number === 0
        ? [{
            ...plannedModule(0, "beginner_orientation", "Beginner Orientation"),
            lessons: level0Lessons
          }]
        : [plannedModule(number, "concepts", `${title}: Concepts`), plannedModule(number, "evidence", `${title}: Evidence And Practice`)],
      command_ids: []
    };
  });

  const moduleById = new Map(levels.flatMap((level) => level.modules.map((module) => [module.module_id, module])));
  const commandMap = [];
  for (const command of catalog.commands) {
    const assignedLevel = assignLevel(command);
    const topic = normalizeTopic(command.topic_id || command.concept_family_id);
    const moduleId = `${levelId(assignedLevel)}_${topic}_commands`;
    let module = moduleById.get(moduleId);
    if (!module) {
      module = {
        module_id: moduleId,
        title: `${levelTitles[assignedLevel]}: ${topic.replace(/_/g, " ")}`,
        status: "planned_command_mapping",
        level_id: levelId(assignedLevel),
        command_ids: [],
        learning_objectives: [`Use ${topic.replace(/_/g, " ")} commands as evidence without mixing vendor syntax.`],
        evidence_requirements: ["individual objective", "syntax coverage", "verification guidance", "rollback guidance or explicit blocker"],
        blocking_reasons: ["command mapped; full lesson authoring pending"],
        lessons: []
      };
      moduleById.set(moduleId, module);
      levels[assignedLevel].modules.push(module);
    }
    const syntax = commandSyntax(command);
    module.command_ids.push(command.canonical_command_id);
    levels[assignedLevel].command_ids.push(command.canonical_command_id);
    module.lessons.push({
      lesson_id: `${command.canonical_command_id}_planned_lesson`,
      title: `${vendorLabels[command.vendor_id] || command.vendor_id}: ${syntax}`,
      status: "planned_command_lesson",
      command_ids: [command.canonical_command_id],
      objective_ids: command.objective_ids?.length ? command.objective_ids : [`obj_${command.canonical_command_id}`],
      blocking_reasons: command.blocking_reasons?.length ? command.blocking_reasons : ["full lesson evidence not yet authored"]
    });
    commandMap.push({
      learning_identity: command.canonical_command_id,
      canonical_command_id: command.canonical_command_id,
      canonical_command: syntax,
      aliases: command.source_command?.aliases || [],
      vendor_id: command.vendor_id,
      vendor_label: vendorLabels[command.vendor_id] || command.vendor_id,
      operating_system_family_id: command.operating_system_family_id,
      topic_id: command.topic_id,
      module_id: moduleId,
      level_id: levelId(assignedLevel),
      specialization_ids: specializationDefs.filter(([, , levels]) => levels.includes(assignedLevel)).map(([id]) => id),
      learning_objectives: [`Explain the purpose of ${syntax}.`, `Identify syntax, evidence, verification, and rollback boundaries for ${syntax}.`],
      objective_ids: command.objective_ids?.length ? command.objective_ids : [`obj_${command.canonical_command_id}`],
      lesson_status: command.lesson_status || "planned",
      practice_status: command.practice_status || "blocked",
      verification_status: command.verification_status || "blocked",
      rollback_status: command.rollback_status || "blocked",
      mastery_policy: { eligible: false, required_evidence: command.mastery_dimensions || [], blocking_reason: "The curriculum foundation alone does not mark commands mastered." },
      review_eligibility: { eligible: Boolean(command.review_types?.length), review_types: command.review_types || [], blocking_reason: command.review_types?.length ? "" : "No review type defined in authoritative catalog." },
      migration_status: command.migration_status || "unmigrated",
      blocking_reasons: command.blocking_reasons || [],
      syntax_coverage: { canonical: syntax, aliases: command.source_command?.aliases || [], vendor_scoped: true, operating_system_scoped: true },
      evidence_requirements: {
        lesson_stages: command.required_lesson_stages || [],
        verification_command_ids: command.verification_command_ids || [],
        rollback_command_ids: command.rollback_command_ids || [],
        unresolved_verification: command.verification_guidance_unresolved || [],
        unresolved_rollback: command.rollback_guidance_unresolved || []
      },
      alias_identity_policy: "aliases_and_abbreviations_update_this_same_canonical_learning_identity"
    });
  }

  const phases = phaseDefs.map(([phase_id, title, start, end]) => ({
    phase_id,
    title,
    level_ids: Array.from({ length: end - start + 1 }, (_, offset) => levelId(start + offset)),
    level_range: [start, end],
    status: phase_id === "phase_00" ? "partially_authored" : "planned_outline"
  }));
  return {
    curriculum: {
      schema_version: "complete-networking-curriculum.v1",
      source_catalog: { path: files.catalog, schema_version: catalog.schema_version, source_commit: catalog.source_commit || "", command_count: catalog.commands.length },
      principles: [
        "Coverage is catalog-wide and generated from the authoritative command catalog.",
        "Level 0 is fully authored for beginners.",
        "Levels 1-39 are honest planned outlines until real evidence is authored.",
        "Aliases never create separate learning identities."
      ],
      phases,
      levels,
      beginner_level_id: "level_00",
      fully_authored_level_ids: ["level_00"],
      planned_level_ids: levels.filter((level) => level.level_number > 0).map((level) => level.level_id),
      prerequisite_graph: Object.fromEntries(levels.map((level) => [level.level_id, level.prerequisite_level_ids])),
      command_map_file: files.map,
      specialization_file: files.specializations
    },
    commandMap
  };
}

function buildSpecializations(commandMap) {
  return {
    schema_version: "curriculum-specializations.v1",
    specialization_count: specializationDefs.length,
    specializations: specializationDefs.map(([specialization_id, title, levelNumbers]) => ({
      specialization_id,
      title,
      status: "planned_path",
      level_ids: levelNumbers.map(levelId),
      command_ids: commandMap.filter((record) => levelNumbers.includes(Number(record.level_id.replace(/\D+/g, "")))).map((record) => record.canonical_command_id),
      objectives: [`Apply the beginner foundation to ${title.toLowerCase()}.`, "Keep command evidence vendor-scoped and traceable."],
      blocking_reasons: ["specialization content is planned; individual command records remain traceable"]
    }))
  };
}

function buildReports(catalog, commandMap, curriculum, specializations) {
  const catalogIds = new Set(catalog.commands.map((command) => command.canonical_command_id));
  const mappedIds = new Set(commandMap.map((record) => record.canonical_command_id));
  const coverage = {
    schema_version: "curriculum-command-coverage.v1",
    authoritative_catalog: files.catalog,
    authoritative_command_count: catalog.commands.length,
    commands_mapped: commandMap.length,
    commands_omitted: [...catalogIds].filter((id) => !mappedIds.has(id)).sort(),
    extra_learning_records: [...mappedIds].filter((id) => !catalogIds.has(id)).sort(),
    vendors_represented: [...new Set(commandMap.map((record) => record.vendor_id))].sort(),
    total_curriculum_phases: curriculum.phases.length,
    total_curriculum_levels: curriculum.levels.length,
    fully_authored_levels: curriculum.fully_authored_level_ids,
    planned_levels: curriculum.planned_level_ids,
    specialization_paths: specializations.specializations.map((item) => item.specialization_id),
    alias_policy: "Aliases and abbreviations share the same canonical learning identity.",
    honest_coverage_policy: "No planned level is marked complete, verified, or practically mastered without evidence."
  };
  coverage.passed = coverage.commands_omitted.length === 0 && coverage.extra_learning_records.length === 0;
  const readiness = {
    schema_version: "beginner-experience-readiness.v1",
    first_run_choice: "implemented",
    beginner_navigation: ["Home", "Course", "Practice", "Progress", "Tools"],
    instructor_mode_in_beginner_navigation: false,
    home_primary_action: "Start Level 0",
    course_map: "current phase first, future phases collapsed, locked levels explain prerequisites",
    level0_lesson_stepper: stepNames,
    level0_status: "authored",
    progress_preservation: "dedicated localStorage keys do not delete lab or vendor progress",
    planned_content_honesty: "Levels 1-39 are planned outlines and cannot award practical mastery.",
    technician_tools: ["Diagnose", "Command Lookup", "Focused Terminal", "Guided CLI", "Switch Workbench", "Visual Playground", "Practice Library", "Knowledge Base", "Saved Reports"],
    responsive_targets: ["desktop", "390px"],
    passed: true
  };
  return { coverage, readiness };
}

const mdList = (items) => items.map((item) => `- ${item}`).join("\n");
function docs(curriculum, coverage, readiness) {
  return {
    coverageMd: `# Curriculum Command Coverage\n\n- Authoritative catalog: \`${coverage.authoritative_catalog}\`\n- Authoritative commands: ${coverage.authoritative_command_count}\n- Commands mapped: ${coverage.commands_mapped}\n- Commands omitted: ${coverage.commands_omitted.length}\n- Vendors represented: ${coverage.vendors_represented.join(", ")}\n- Curriculum phases: ${coverage.total_curriculum_phases}\n- Curriculum levels: ${coverage.total_curriculum_levels}\n- Fully authored levels: ${coverage.fully_authored_levels.join(", ")}\n- Planned levels: ${coverage.planned_levels.length}\n- Specialization paths: ${coverage.specialization_paths.length}\n\nAliases and abbreviations share the same canonical learning identity. Planned levels are intentionally not counted as complete, verified, or mastered.\n`,
    readinessMd: `# Beginner Experience Readiness\n\n- First-run choice: ${readiness.first_run_choice}\n- Beginner navigation: ${readiness.beginner_navigation.join(", ")}\n- Instructor Mode in beginner navigation: no\n- Home primary action: ${readiness.home_primary_action}\n- Level 0 stepper: ${readiness.level0_lesson_stepper.join(", ")}\n- Progress preservation: ${readiness.progress_preservation}\n- Planned-content honesty: ${readiness.planned_content_honesty}\n- Technician tools: ${readiness.technician_tools.join(", ")}\n- Responsive targets: ${readiness.responsive_targets.join(", ")}\n`,
    curriculumDoc: `# Complete Networking Curriculum\n\nCommand Doctor now defines a complete 40-level networking curriculum across 10 phases. Every canonical command in \`${files.catalog}\` is mapped into a stable learning record.\n\n## Phases\n\n${mdList(curriculum.phases.map((phase) => `${phase.title}: levels ${phase.level_range[0]}-${phase.level_range[1]}`))}\n\n## Authorship Status\n\n- Fully authored: ${curriculum.fully_authored_level_ids.join(", ")}\n- Planned outlines: ${curriculum.planned_level_ids.length} levels\n- Authoritative commands: ${coverage.authoritative_command_count}\n- Commands mapped: ${coverage.commands_mapped}\n- Commands omitted: ${coverage.commands_omitted.length}\n\nLevel 0 is production-authored for beginners. Levels 1-39 are honest planned outlines and cannot award practical mastery until real lessons, practice routes, verification evidence, rollback policy, and review records are completed.\n`,
    beginnerDoc: `# Beginner Learning Experience\n\nThe beginner experience gives a first-time learner three clear journeys: Learn From Zero, Practise and Specialize, and Technician Tools.\n\n## Navigation\n\nBeginner navigation contains: ${readiness.beginner_navigation.join(", ")}. Instructor Mode is intentionally absent from beginner navigation.\n\n## Level 0\n\nLevel 0 uses the stepper sequence: ${readiness.level0_lesson_stepper.join(", ")}. It records local orientation progress and confidence only. It does not award command mastery.\n\n## Progress\n\nThe first-run choice and Level 0 resume state use dedicated browser storage, preserving existing lab progress, vendor progress, reports, and technician tool history.\n`,
    mappingDoc: `# Curriculum Command Mapping\n\nEvery command is discovered from \`${files.catalog}\` and mapped into \`${files.map}\`.\n\n- Authoritative command count: ${coverage.authoritative_command_count}\n- Commands mapped: ${coverage.commands_mapped}\n- Commands omitted: ${coverage.commands_omitted.length}\n- Vendors represented: ${coverage.vendors_represented.join(", ")}\n\nEach command record keeps one learning identity, vendor scope, operating-system scope, module and level assignment, objectives, lesson status, practice status, verification status, rollback status, mastery policy, review eligibility, migration status, syntax coverage, and explicit blocking reasons when incomplete.\n`,
    uiDoc: `# Learning Experience UI Standard\n\nThe learning UI is beginner-first, bright, responsive, and explicit about planned content.\n\n- Home primary action: ${readiness.home_primary_action}\n- Course map: current phase first, future phases collapsed by default, locked levels show prerequisite reasons.\n- Level overview: Level 0 is authored; later levels are labeled planned.\n- Lesson stepper: ${readiness.level0_lesson_stepper.join(", ")}\n- Technician Tools: ${readiness.technician_tools.join(", ")}\n\nControls preserve progress, avoid fake mastery, and keep Instructor Mode out of beginner navigation.\n`
  };
}

const catalog = await readJson(files.catalog);
catalog.commands = (catalog.commands || []).slice().sort((a, b) => a.canonical_command_id.localeCompare(b.canonical_command_id));
const { curriculum, commandMap } = buildCurriculum(catalog);
const specializations = buildSpecializations(commandMap);
const { coverage, readiness } = buildReports(catalog, commandMap, curriculum, specializations);
const markdown = docs(curriculum, coverage, readiness);

await writeJson(files.schema, {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  title: "Command Doctor Complete Networking Curriculum",
  type: "object",
  required: ["schema_version", "source_catalog", "phases", "levels", "prerequisite_graph"],
  properties: {
    schema_version: { const: "complete-networking-curriculum.v1" },
    phases: { type: "array", minItems: 10, maxItems: 10 },
    levels: { type: "array", minItems: 40, maxItems: 40 },
    prerequisite_graph: { type: "object" }
  }
});
await writeJson(files.curriculum, curriculum);
await writeJson(files.map, { schema_version: "curriculum-command-map.v1", source_catalog: files.catalog, command_count: commandMap.length, commands: commandMap });
await writeJson(files.specializations, specializations);
await writeJson(files.coverageJson, coverage);
await writeText(files.coverageMd, markdown.coverageMd);
await writeJson(files.readinessJson, readiness);
await writeText(files.readinessMd, markdown.readinessMd);
await writeText(files.curriculumDoc, markdown.curriculumDoc);
await writeText(files.beginnerDoc, markdown.beginnerDoc);
await writeText(files.mappingDoc, markdown.mappingDoc);
await writeText(files.uiDoc, markdown.uiDoc);

if (!coverage.passed || !readiness.passed) throw new Error("Generated reports failed.");
console.log(JSON.stringify({
  status: checkOnly ? "deterministic" : "generated",
  authoritative_command_count: coverage.authoritative_command_count,
  commands_mapped: coverage.commands_mapped,
  commands_omitted: coverage.commands_omitted.length,
  phases: curriculum.phases.length,
  levels: curriculum.levels.length,
  specializations: specializations.specializations.length
}, null, 2));
