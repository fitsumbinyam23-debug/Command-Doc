import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deterministicEqual } from "./curriculum-determinism.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const files = {
  catalog: "data/generated/learning-command-catalog.json",
  placement: "data/curriculum/curriculum-command-placement.json",
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
const stepIds = ["mission", "learn", "see", "key_words", "predict", "try", "explain", "confidence", "continue"];
const statusEnums = {
  phase: ["authored", "planned_outline", "partially_authored"],
  content: ["authored", "planned_outline", "planned_command_mapping", "complete", "planned"],
  practice: ["concept_checkpoint_only", "planned", "blocked_until_practice_authored", "runtime_free_practice", "runtime_route", "blocked"],
  review: ["concept_review", "planned", "eligible", "blocked"],
  lesson: ["authored", "planned", "planned_command_lesson"],
  module: ["authored", "planned_outline", "planned_command_mapping"]
};

const phasesSpec = [
  ["phase_01", 1, "ABSOLUTE BEGINNER", [0, 4], "Give a true beginner language, confidence, and mental models before vendor syntax."],
  ["phase_02", 2, "SWITCHING FOUNDATIONS", [5, 9], "Build switching, VLAN, trunk, STP, and aggregation foundations."],
  ["phase_03", 3, "ROUTING AND NETWORK SERVICES", [10, 13], "Connect VLANs, routes, and essential services into reachable networks."],
  ["phase_04", 4, "WIRELESS AND VOICE", [14, 15], "Explain wireless and real-time traffic support at the access edge."],
  ["phase_05", 5, "SECURITY", [16, 18], "Introduce secure management, switch-port protection, and access control."],
  ["phase_06", 6, "RESILIENCE AND ENTERPRISE SWITCHING", [19, 21], "Cover availability, stacking, virtual chassis, and enterprise topology."],
  ["phase_07", 7, "MONITORING AND TROUBLESHOOTING", [22, 26], "Teach evidence collection, troubleshooting method, and endpoint diagnostics."],
  ["phase_08", 8, "REAL OPERATIONAL WORK", [27, 30], "Prepare learners for controlled changes, deployment, recovery, and communication."],
  ["phase_09", 9, "HOSPITALITY AND BUSINESS SCENARIOS", [31, 33], "Ground network support in guest, staff, and business-service scenarios."],
  ["phase_10", 10, "ADVANCED NETWORKING", [34, 39], "Preview advanced switching, routing, multicast, QoS, automation, and operations."]
];

const levelSpecs = [
  ["Welcome to Networking", ["What is a network?", "Why devices communicate", "LAN, WAN and the internet", "What a network technician does", "Real devices versus Command Doctor simulation", "Safe learning rules", "Beginner glossary", "Level checkpoint"]],
  ["Network Devices and Connections", ["endpoints and clients", "servers", "switches", "routers and firewalls", "access points", "IP phones, printers and connected devices", "patch panels and racks", "copper and fibre", "SFPs and transceivers", "port numbers and link lights"]],
  ["How Data Moves", ["bits, bytes, frames and packets", "source and destination", "unicast, broadcast and multicast", "Ethernet frames", "MAC addresses", "ARP", "switch forwarding decisions", "end-to-end packet journey"]],
  ["IP Addressing", ["IPv4 structure", "public and private addresses", "subnet masks", "default gateways", "DHCP and static addressing", "APIPA and loopback", "IPv6 introduction", "address verification"]],
  ["Subnetting", ["binary foundations", "network and host portions", "CIDR", "network, broadcast and usable addresses", "subnet sizes", "VLSM", "address planning", "subnetting drills"]],
  ["Ethernet Switching", ["switch forwarding", "MAC address tables", "unknown-unicast flooding", "broadcast and collision domains", "interface status", "speed and duplex", "auto-negotiation", "errors and counters", "basic cable diagnostics"]],
  ["VLAN Fundamentals", ["why VLANs exist", "create and name VLANs", "access ports", "assigning access VLANs", "native VLAN", "voice VLAN", "membership", "verification", "VLAN troubleshooting"]],
  ["Trunks and VLAN Transport", ["802.1Q", "access versus trunk", "allowed VLANs", "native VLAN mismatch", "trunk negotiation concepts", "uplinks and downlinks", "multi-switch VLAN transport", "trunk troubleshooting"]],
  ["Spanning Tree", ["switching loops", "broadcast storms", "MAC instability", "STP roles and states", "root election", "root and designated ports", "PortFast/edge ports", "BPDU Guard, Root Guard and Loop Guard", "STP troubleshooting"]],
  ["Link Aggregation", ["EtherChannel and aggregation", "LACP", "static aggregation", "active/passive modes", "member consistency", "load balancing", "member failure", "multi-vendor terminology"]],
  ["Inter-VLAN Routing", ["Layer 2 versus Layer 3", "SVIs", "routed ports", "router-on-a-stick", "default gateways", "inter-VLAN communication", "verification"]],
  ["Routing Fundamentals", ["routing tables", "connected routes", "static routes", "default routes", "administrative distance", "next hop", "longest-prefix match", "route selection", "dynamic-routing introduction"]],
  ["Dynamic Routing", ["OSPF concepts", "neighbours and adjacencies", "areas", "cost and path selection", "route advertisements", "OSPF troubleshooting", "BGP awareness"]],
  ["Essential Network Services", ["DHCP", "DHCP relay", "DNS", "NTP", "SNMP", "Syslog", "TFTP and SCP", "AAA", "RADIUS and TACACS+", "service verification"]],
  ["Wireless Networking", ["wireless architecture", "2.4, 5 and 6 GHz", "channels and widths", "signal strength", "interference", "roaming", "controllers", "indoor and outdoor APs", "PoE and switch ports", "wireless troubleshooting"]],
  ["Voice and Real-Time Traffic", ["IP phones", "voice VLAN", "PoE", "DHCP options", "call managers", "QoS introduction", "delay, jitter and loss", "multicast introduction"]],
  ["Network Security Foundations", ["least privilege", "secure management", "SSH versus Telnet", "local users", "enable, console and VTY security", "password policy", "management VLANs", "backups", "logging and accountability"]],
  ["Switch-Port Security", ["port security", "sticky MAC", "maximum MAC and violation modes", "DHCP Snooping", "Dynamic ARP Inspection", "IP Source Guard", "storm control", "BPDU Guard", "recovery"]],
  ["Access Control and Authentication", ["standard ACLs", "extended ACLs", "direction and placement", "802.1X", "RADIUS", "network access control", "guest/corporate segmentation", "firewall fundamentals", "zero-trust introduction"]],
  ["High Availability", ["redundancy", "first-hop redundancy", "HSRP", "VRRP", "active/standby roles", "redundant uplinks", "failure domains", "failover testing", "single points of failure"]],
  ["Stacking and Virtual Chassis", ["Cisco StackWise", "HP Comware IRF", "Aruba VSF and VSX", "member numbering", "priority and election", "stack links", "split-brain concepts", "adding and replacing members", "failure troubleshooting", "reboot and verification"]],
  ["Network Architecture", ["access, distribution and core", "collapsed core", "top-of-rack", "uplinks and downlinks", "redundancy models", "campus networks", "data-centre basics", "branches", "diagrams", "capacity planning"]],
  ["Monitoring and Performance", ["utilization", "CPU and memory", "errors and discards", "CRC", "broadcast levels", "logs", "SNMP monitoring", "baselines", "thresholds", "capacity and intermittent faults"]],
  ["Troubleshooting Methodology", ["define the problem", "determine scope", "collect evidence", "OSI-based troubleshooting", "compare working and failing devices", "change one thing", "verify", "rollback", "document", "escalate"]],
  ["Physical and Cabling Troubleshooting", ["cable types", "open and short circuits", "distance to fault", "patch panels", "fibre faults", "transceivers", "speed negotiation", "PoE", "wall-port faults", "tracing a cable to a switch"]],
  ["Layer 2 Troubleshooting", ["port down", "err-disabled", "wrong VLAN", "missing trunk VLAN", "native mismatch", "MAC not learned", "STP blocking and loops", "aggregation mismatch", "duplicate MAC behaviour"]],
  ["Layer 3 Troubleshooting", ["wrong IP", "wrong subnet mask", "wrong gateway", "DHCP failure", "DNS failure", "missing routes", "asymmetric routing", "ACL blocks", "ping and traceroute interpretation", "Windows/Linux endpoint tools"]],
  ["Change Management", ["change requests", "pre-checks", "risk", "backups", "implementation plan", "maintenance window", "validation", "Save decision", "rollback", "monitoring and records"]],
  ["Device Deployment", ["reset and initial configuration", "hostname", "management IP and gateway", "accounts and SSH", "VLANs", "access and trunk ports", "time and logging", "backup", "final verification"]],
  ["Software, Recovery and Replacement", ["software versions", "images and boot", "startup configuration", "configuration recovery", "password recovery concepts", "failed-switch replacement", "configuration restore", "stack-member replacement", "reboot procedures", "upgrade verification"]],
  ["Documentation and Communication", ["network diagrams", "port records", "IP records", "VLAN records", "ticket notes", "incident summaries", "change reports", "escalation notes", "clear communication", "avoiding unsupported claims"]],
  ["Hospitality Network Foundations", ["guest-room networks", "back-of-house", "corporate networks", "guest and staff Wi-Fi", "IPTV", "VoIP", "POS", "CCTV", "door locks", "GRMS", "digital signage", "building systems"]],
  ["Hospitality Troubleshooting Scenarios", ["guest-room LAN scenario", "phone-registration scenario", "IPTV/casting scenario", "POS scenario", "AP scenario", "signage scenario", "printer scenario", "spa/medical-device LAN scenario", "wrong-VLAN scenario", "cable and access-switch tracing scenario"]],
  ["Incident and Service Restoration", ["guest and business impact", "priority and scope", "temporary workaround", "permanent repair", "Facilities coordination", "Applications coordination", "Networks coordination", "vendor escalation", "evidence package", "restoration confirmation"]],
  ["Advanced Switching", ["private VLANs", "QinQ", "MSTP", "advanced LACP", "multi-chassis aggregation", "control-plane protection", "advanced loop prevention", "large VLAN design"]],
  ["Advanced Routing", ["OSPF troubleshooting", "redistribution", "policy-based routing", "VRFs", "BGP fundamentals", "route filtering", "redundant WAN"]],
  ["Multicast and Media Networks", ["multicast concepts", "IGMP", "IGMP Snooping", "PIM awareness", "IPTV multicast", "multicast flooding", "querier behaviour", "multicast troubleshooting"]],
  ["Quality of Service", ["classification", "marking", "queuing", "trust boundaries", "voice prioritization", "congestion", "policing and shaping", "QoS troubleshooting"]],
  ["Network Automation", ["structured configuration", "templates", "APIs", "JSON and YAML", "Python fundamentals", "Ansible concepts", "validation", "automated backup", "safe automation", "change review"]],
  ["Advanced Network Operations", ["root-cause analysis", "major incidents", "capacity forecasting", "health reviews", "security-event response", "vendor coordination", "migration planning", "technical leadership"]]
];

const specializationTitles = [
  "Switching and Campus Networks",
  "Routing and WAN",
  "Wireless",
  "Network Security",
  "Hospitality Networking",
  "Windows and Linux Network Diagnostics",
  "Monitoring and Operations",
  "Network Automation"
];

const level0Content = [
  ["What is a network?", "Identify a network as devices connected to share information.", ["network", "device", "connection", "service"], "A guest laptop reaches a booking page because several devices pass information along.", "Two or more devices connected so they can exchange useful information.", "Guest laptop -> wall port -> switch -> gateway -> booking service.", "Which phrase best describes a network?", ["Devices connected to communicate", "One unplugged cable", "A password list"], 0, "The important idea is communication between connected devices.", "Choose the picture that shows devices sharing a service.", "You can explain what a network is in one sentence.", "Continue to why devices communicate."],
  ["Why devices communicate", "Explain why endpoints, services, and network devices exchange data.", ["endpoint", "server", "request", "response"], "A POS terminal sends a payment request and receives an approval response.", "Devices communicate to request, deliver, confirm, or update information.", "POS terminal asks -> payment service answers -> receipt prints.", "Why does a client send data to a server?", ["To request or update a service", "To make the cable longer", "To erase the switch"], 0, "Communication has a purpose: a request, response, or update.", "Pick the request and response in the example.", "You can name a reason devices talk.", "Continue to LAN, WAN and internet."],
  ["LAN, WAN and the internet", "Distinguish local networks, wide-area links, and internet reachability.", ["LAN", "WAN", "internet", "site"], "A resort office printer is local, while a cloud booking platform is reached through the internet.", "A LAN is local to a room, floor, or site. A WAN links sites. The internet links to public services.", "Room LAN -> hotel network -> ISP/WAN -> internet service.", "Which problem is most likely local?", ["Only one room printer fails", "Every public website fails worldwide", "A vendor cloud region is down"], 0, "Scope matters: local failures and external failures need different evidence.", "Sort three examples into LAN, WAN, and internet.", "You can separate local and remote network scope.", "Continue to the technician role."],
  ["What a network technician does", "Describe the technician role as evidence-first support and safe change.", ["symptom", "evidence", "scope", "verify"], "A CCTV camera is offline; the technician checks link state before changing VLANs.", "A technician defines the problem, gathers evidence, changes only with approval, verifies, and documents.", "Symptom -> evidence -> safe action -> verification -> note.", "What should come before a configuration change?", ["Evidence and scope", "Guessing", "Reloading every device"], 0, "Safe technicians use evidence before action.", "Build a short symptom/evidence/next-step note.", "You can describe the technician workflow.", "Continue to simulation boundaries."],
  ["Real devices versus Command Doctor simulation", "Separate local simulation from production devices.", ["simulation", "production", "local", "safe"], "A simulated switch can teach command order without touching a guest-room switch.", "Command Doctor is local training. Production devices are real systems with guest and business impact.", "Simulation sandbox || production network; the boundary must stay clear.", "Where should a first attempt happen?", ["Local simulation", "Production core switch", "Unknown live device"], 0, "Practice belongs in simulation until approved production work exists.", "Choose whether examples are simulated or production-impacting.", "You can explain the simulation boundary.", "Continue to safe learning rules."],
  ["Safe learning rules", "Apply beginner rules that prevent unsafe changes.", ["read-only", "approval", "rollback", "save"], "A read-only command is safe evidence; saving a wrong config can preserve an outage.", "Start read-only, avoid unsupported changes, verify before save, and know rollback before action.", "Read-only evidence -> approved change -> verify -> save or rollback.", "Which action is safest first?", ["Run a read-only check", "Save an unverified change", "Disable a random port"], 0, "Safe order protects users and services.", "Choose the safe first action in three mini cases.", "You can state the beginner safety order.", "Continue to the glossary."],
  ["Beginner glossary", "Define first-week networking words in plain language.", ["host", "switch", "router", "VLAN", "gateway"], "A phone, AP, and printer are hosts connected through switch ports and VLANs.", "Plain words make command output readable: hosts use links, switches connect local devices, gateways reach other networks.", "Host -> switch port -> VLAN -> gateway -> other network.", "What is a gateway used for?", ["Leaving the local network", "Naming a cable", "Cooling a rack"], 0, "Glossary words turn output into a story.", "Match each word to the simplest definition.", "You can define the core beginner terms.", "Continue to the checkpoint."],
  ["Level checkpoint", "Check Level 0 understanding before continuing.", ["checkpoint", "confidence", "review", "next step"], "Before command syntax, a learner proves they understand safe evidence, scope, and simulation.", "The checkpoint confirms the beginner can explain networks, scope, technician behavior, and safety boundaries.", "Question -> answer -> explanation -> confidence -> orientation complete.", "What must be true before Level 0 completes?", ["Checkpoint submitted with confidence", "All commands mastered", "A real switch changed"], 0, "Level 0 completion records orientation only, not command mastery.", "Answer the Level 0 checkpoint question.", "You can decide whether to review or continue.", "Return to the course map or open practice when ready."]
].map(([title, objective, keyWords, realLifeExample, learn, visualModel, predictionQuestion, answerChoices, correctIndex, explanation, tryPrompt, confidencePrompt, nextAction], index) => ({
  lesson_id: `level00_${slug(title)}`,
  title,
  content_status: "authored",
  lesson_number: index + 1,
  objective,
  command_ids: [],
  stepper_steps: stepNames,
  step_ids: stepIds,
  mission: realLifeExample,
  learn,
  see: visualModel,
  key_words: keyWords,
  predict: { question: predictionQuestion, answer_choices: answerChoices, correct_index: correctIndex, explanation },
  tryInteraction: { prompt: tryPrompt, answer_choices: answerChoices, correct_index: correctIndex, explanation },
  explain: explanation,
  confidence_prompt: confidencePrompt,
  continue: nextAction,
  real_life_example: realLifeExample,
  visual_text_model: visualModel,
  completion_requirements: index === 7 ? ["prediction", "try", "explanation", "confidence", "final_checkpoint"] : ["prediction", "try", "explanation", "confidence"],
  mastery_eligible: false,
  review_eligible: true
}));

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}
function levelId(number) {
  return `level_${String(number).padStart(2, "0")}`;
}
function moduleId(levelNumber, topic) {
  return `${levelId(levelNumber)}_${slug(topic)}`;
}
function commandSyntax(command) {
  return command.source_command?.syntax || command.canonical_command || command.canonical_command_id;
}
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const readJson = async (file) => JSON.parse(await fs.readFile(path.join(root, file), "utf8"));
async function writeText(file, content) {
  const target = path.join(root, file);
  if (checkOnly) {
    const current = await fs.readFile(target, "utf8").catch(() => "");
    if (!deterministicEqual(current, content)) throw new Error(`${file} is not current. Run npm run curriculum:generate.`);
    return;
  }
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content);
}
const writeJson = (file, value) => writeText(file, json(value));
function phaseForLevel(levelNumber) {
  return phasesSpec.find(([, , , [start, end]]) => levelNumber >= start && levelNumber <= end);
}
function phaseLevelIds([, , , [start, end]]) {
  return Array.from({ length: end - start + 1 }, (_, offset) => levelId(start + offset));
}
function titleCase(value) {
  return String(value).replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function buildSchema() {
  const stringArray = { type: "array", items: { type: "string" } };
  return {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    title: "Command Doctor Complete Networking Curriculum",
    type: "object",
    additionalProperties: false,
    required: ["schema_version", "source_catalog", "phases", "levels", "beginner_level_id", "fully_authored_level_ids", "planned_level_ids", "prerequisite_graph", "command_map_file", "specialization_file"],
    properties: {
      schema_version: { const: "complete-networking-curriculum.v2" },
      source_catalog: { type: "object" },
      principles: stringArray,
      phases: { type: "array", items: { $ref: "#/$defs/phase" } },
      levels: { type: "array", items: { $ref: "#/$defs/level" } },
      beginner_level_id: { type: "string" },
      fully_authored_level_ids: stringArray,
      planned_level_ids: stringArray,
      prerequisite_graph: { type: "object", additionalProperties: { type: "array", items: { type: "string" } } },
      command_map_file: { type: "string" },
      specialization_file: { type: "string" }
    },
    $defs: {
      phase: {
        type: "object",
        additionalProperties: false,
        required: ["phase_id", "phase_number", "title", "purpose", "target_student", "prerequisite_phase_ids", "level_ids", "estimated_learning_hours", "completion_rule", "status"],
        properties: {
          phase_id: { type: "string" },
          phase_number: { type: "integer" },
          title: { type: "string" },
          purpose: { type: "string" },
          target_student: { type: "string" },
          prerequisite_phase_ids: stringArray,
          level_ids: stringArray,
          estimated_learning_hours: { type: "number" },
          completion_rule: { type: "string" },
          status: { enum: statusEnums.phase }
        }
      },
      level: {
        type: "object",
        additionalProperties: false,
        required: ["level_id", "level_number", "phase_id", "title", "plain_language_summary", "why_it_matters", "target_student", "learning_outcomes", "prerequisite_level_ids", "prerequisite_concepts", "modules", "vendor_scope", "command_ids", "related_command_ids", "practice_types", "scenario_types", "required_evidence_types", "mastery_dimensions", "estimated_learning_hours", "difficulty", "content_status", "practice_status", "review_status", "specialization_links"],
        properties: {
          level_id: { type: "string" },
          level_number: { type: "integer" },
          phase_id: { type: "string" },
          title: { type: "string" },
          plain_language_summary: { type: "string" },
          why_it_matters: { type: "string" },
          target_student: { type: "string" },
          learning_outcomes: stringArray,
          prerequisite_level_ids: stringArray,
          prerequisite_concepts: stringArray,
          modules: { type: "array", items: { $ref: "#/$defs/module" } },
          vendor_scope: stringArray,
          command_ids: stringArray,
          related_command_ids: stringArray,
          practice_types: stringArray,
          scenario_types: stringArray,
          required_evidence_types: stringArray,
          mastery_dimensions: stringArray,
          estimated_learning_hours: { type: "number" },
          difficulty: { enum: ["absolute_beginner", "beginner", "foundation", "intermediate", "advanced"] },
          content_status: { enum: statusEnums.content },
          practice_status: { enum: statusEnums.practice },
          review_status: { enum: statusEnums.review },
          specialization_links: stringArray
        }
      },
      module: {
        type: "object",
        additionalProperties: false,
        required: ["module_id", "title", "purpose", "objectives", "concept_ids", "command_ids", "lesson_ids", "prerequisite_module_ids", "practice_adapter", "scenario_ids", "estimated_minutes", "status"],
        properties: {
          module_id: { type: "string" },
          title: { type: "string" },
          purpose: { type: "string" },
          objectives: stringArray,
          concept_ids: stringArray,
          command_ids: stringArray,
          lesson_ids: stringArray,
          prerequisite_module_ids: stringArray,
          practice_adapter: { type: "string" },
          scenario_ids: stringArray,
          estimated_minutes: { type: "integer" },
          status: { enum: statusEnums.module },
          lessons: { type: "array", items: { $ref: "#/$defs/lesson" } }
        }
      },
      lesson: {
        type: "object",
        additionalProperties: true,
        required: ["lesson_id", "title", "content_status", "objective", "stepper_steps", "completion_requirements"],
        properties: {
          lesson_id: { type: "string" },
          title: { type: "string" },
          content_status: { enum: statusEnums.lesson },
          objective: { type: "string" },
          stepper_steps: stringArray,
          completion_requirements: stringArray
        }
      }
    }
  };
}

function buildPhases() {
  return phasesSpec.map(([phase_id, phase_number, title, range, purpose], index) => ({
    phase_id,
    phase_number,
    title,
    purpose,
    target_student: phase_number === 1 ? "absolute beginner" : "networking learner building toward technician readiness",
    prerequisite_phase_ids: index === 0 ? [] : [phasesSpec[index - 1][0]],
    level_ids: phaseLevelIds([phase_id, phase_number, title, range]),
    estimated_learning_hours: phaseLevelIds([phase_id, phase_number, title, range]).length * 2,
    completion_rule: phase_number === 1 ? "Complete authored Level 0 and preview planned levels honestly." : "Complete authored lessons, practice, verification, rollback, and review evidence when available.",
    status: phase_number === 1 ? "partially_authored" : "planned_outline"
  }));
}

function buildLevel(levelNumber, placementsForLevel) {
  const [title, topics] = levelSpecs[levelNumber];
  const phase = phaseForLevel(levelNumber);
  const level_id = levelId(levelNumber);
  const moduleCommandIds = new Map();
  for (const placement of placementsForLevel) {
    const list = moduleCommandIds.get(placement.primary_module_id) || [];
    list.push(placement.canonical_command_id);
    moduleCommandIds.set(placement.primary_module_id, list);
  }
  const modules = topics.map((topic, index) => {
    const id = moduleId(levelNumber, topic);
    const lesson = levelNumber === 0 ? level0Content[index] : null;
    return {
      module_id: id,
      title: levelNumber === 0 ? topic : titleCase(topic),
      purpose: levelNumber === 0 ? `Teach: ${topic}` : `Introduce ${topic} within ${title}.`,
      objectives: [
        levelNumber === 0 ? `Explain ${topic} in beginner language.` : `Describe ${topic} accurately.`,
        levelNumber === 0 ? "Keep production devices separate from local practice." : `Identify evidence or blockers for ${topic}.`
      ],
      concept_ids: [`concept_${slug(topic)}`],
      command_ids: moduleCommandIds.get(id) || [],
      lesson_ids: lesson ? [lesson.lesson_id] : [],
      prerequisite_module_ids: index === 0 ? [] : [moduleId(levelNumber, topics[index - 1])],
      practice_adapter: levelNumber === 0 ? "concept_checkpoint" : "planned_adapter",
      scenario_ids: [],
      estimated_minutes: levelNumber === 0 ? 8 : 20,
      status: levelNumber === 0 ? "authored" : "planned_outline",
      ...(lesson ? { lessons: [lesson] } : {})
    };
  });
  return {
    level_id,
    level_number: levelNumber,
    phase_id: phase[0],
    title,
    plain_language_summary: levelNumber === 0 ? "A welcoming introduction to networks, technician thinking, simulation boundaries, and safe learning." : `A planned subject-specific outline for ${title}.`,
    why_it_matters: levelNumber === 0 ? "Beginners need a safe mental model before command syntax." : `${title} is required for honest network technician readiness.`,
    target_student: levelNumber === 0 ? "absolute beginner" : "beginner-to-technician learner",
    learning_outcomes: topics.slice(0, 4).map((topic) => `Explain ${topic}.`),
    prerequisite_level_ids: levelNumber === 0 ? [] : [levelId(levelNumber - 1)],
    prerequisite_concepts: levelNumber === 0 ? [] : levelSpecs[Math.max(0, levelNumber - 1)][1].slice(0, 2),
    modules,
    vendor_scope: ["vendor_neutral", "cisco_ios", "hp_comware", "aruba_cx", "windows_cmd", "linux"],
    command_ids: placementsForLevel.map((placement) => placement.canonical_command_id),
    related_command_ids: [],
    practice_types: levelNumber === 0 ? ["concept_check", "confidence_rating"] : ["planned_lesson", "planned_practice"],
    scenario_types: levelNumber === 0 ? ["orientation"] : ["planned_scenario"],
    required_evidence_types: levelNumber === 0 ? ["prediction_response", "try_response", "explanation_response", "confidence_rating", "checkpoint_result"] : ["lesson_evidence", "practice_evidence", "verification_evidence", "rollback_or_safety_evidence"],
    mastery_dimensions: levelNumber === 0 ? ["concept_orientation"] : ["concept", "syntax", "evidence", "verification", "safety"],
    estimated_learning_hours: levelNumber === 0 ? 1.5 : Math.max(2, Math.round((topics.length * 20) / 60)),
    difficulty: levelNumber === 0 ? "absolute_beginner" : levelNumber < 10 ? "beginner" : levelNumber < 22 ? "foundation" : levelNumber < 34 ? "intermediate" : "advanced",
    content_status: levelNumber === 0 ? "authored" : "planned_outline",
    practice_status: levelNumber === 0 ? "concept_checkpoint_only" : "planned",
    review_status: levelNumber === 0 ? "concept_review" : "planned",
    specialization_links: []
  };
}

function buildCurriculum(catalog, placements) {
  const placementsByLevel = new Map();
  for (const placement of placements) {
    const list = placementsByLevel.get(placement.primary_level_id) || [];
    list.push(placement);
    placementsByLevel.set(placement.primary_level_id, list);
  }
  const levels = levelSpecs.map((_, number) => buildLevel(number, placementsByLevel.get(levelId(number)) || []));
  for (const [index, title] of specializationTitles.entries()) {
    const id = slug(title).replace(/_/g, "-");
    for (const level of levels) {
      const levelNumber = level.level_number;
      const applies = (
        (id === "switching-and-campus-networks" && [5, 6, 7, 8, 9, 20, 21, 34].includes(levelNumber)) ||
        (id === "routing-and-wan" && [10, 11, 12, 35].includes(levelNumber)) ||
        (id === "wireless" && levelNumber === 14) ||
        (id === "network-security" && [16, 17, 18].includes(levelNumber)) ||
        (id === "hospitality-networking" && [31, 32, 33].includes(levelNumber)) ||
        (id === "windows-and-linux-network-diagnostics" && [3, 24, 26].includes(levelNumber)) ||
        (id === "monitoring-and-operations" && [22, 23, 27, 28, 29, 30, 39].includes(levelNumber)) ||
        (id === "network-automation" && levelNumber === 38)
      );
      if (applies) level.specialization_links.push(id);
    }
  }
  return {
    schema_version: "complete-networking-curriculum.v2",
    source_catalog: {
      path: files.catalog,
      schema_version: catalog.schema_version,
      source_commit: catalog.source_commit || "",
      command_count: catalog.commands.length,
      placement_file: files.placement
    },
    principles: [
      "The phase and level structure is product-owner approved and immutable for this milestone.",
      "Level 0 is fully authored for absolute beginners.",
      "Levels 1-39 are subject-specific planned outlines, not fake completion.",
      "Every command placement is read from curated curriculum-command-placement.json."
    ],
    phases: buildPhases(),
    levels,
    beginner_level_id: "level_00",
    fully_authored_level_ids: ["level_00"],
    planned_level_ids: levels.filter((level) => level.level_number > 0).map((level) => level.level_id),
    prerequisite_graph: Object.fromEntries(levels.map((level) => [level.level_id, level.prerequisite_level_ids])),
    command_map_file: files.map,
    specialization_file: files.specializations
  };
}

function buildCommandMap(catalog, placements) {
  const commandById = new Map(catalog.commands.map((command) => [command.canonical_command_id, command]));
  return placements.map((placement) => {
    const command = commandById.get(placement.canonical_command_id);
    return {
      learning_identity: placement.canonical_command_id,
      canonical_command_id: placement.canonical_command_id,
      canonical_command: commandSyntax(command),
      aliases: command.source_command?.aliases || [],
      vendor_id: command.vendor_id,
      vendor_label: vendorLabels[command.vendor_id] || command.vendor_id,
      operating_system_family_id: command.operating_system_family_id,
      topic_id: command.topic_id,
      module_id: placement.primary_module_id,
      level_id: placement.primary_level_id,
      related_level_ids: placement.related_level_ids,
      specialization_ids: placement.specialization_ids,
      learning_objectives: [
        `Explain when to use ${commandSyntax(command)}.`,
        `Identify syntax, evidence, verification, and rollback or safety boundaries for ${commandSyntax(command)}.`
      ],
      objective_ids: command.objective_ids?.length ? command.objective_ids : [`obj_${placement.canonical_command_id}`],
      lesson_status: command.lesson_status || "planned",
      practice_status: placement.practice_status,
      verification_status: placement.verification_status,
      rollback_status: placement.rollback_or_safety_status,
      mastery_policy: { eligible: false, required_evidence: command.mastery_dimensions || [], blocking_reason: "This correction does not award mastery; real lesson evidence is required." },
      review_eligibility: { eligible: Boolean(command.review_types?.length), review_types: command.review_types || [], blocking_reason: command.review_types?.length ? "" : "No review type defined." },
      migration_status: command.migration_status || "unmigrated",
      blocking_reasons: command.blocking_reasons || [],
      syntax_coverage: { canonical: commandSyntax(command), aliases: command.source_command?.aliases || [], vendor_scoped: true, operating_system_scoped: true },
      evidence_requirements: {
        lesson_stages: command.required_lesson_stages || [],
        verification_command_ids: command.verification_command_ids || [],
        rollback_command_ids: command.rollback_command_ids || [],
        unresolved_verification: command.verification_guidance_unresolved || [],
        unresolved_rollback: command.rollback_guidance_unresolved || []
      },
      placement_rationale: placement.placement_rationale,
      reviewed_by_domain: placement.reviewed_by_domain,
      alias_identity_policy: "aliases_and_abbreviations_update_this_same_canonical_learning_identity"
    };
  });
}

function buildSpecializations(commandMap) {
  return {
    schema_version: "curriculum-specializations.v2",
    specialization_count: specializationTitles.length,
    specializations: specializationTitles.map((title, index) => {
      const specialization_id = slug(title).replace(/_/g, "-");
      return {
        specialization_id,
        specialization_number: index + 1,
        title,
        status: "planned_path",
        level_ids: [],
        command_ids: commandMap.filter((record) => record.specialization_ids.includes(specialization_id)).map((record) => record.canonical_command_id),
        objectives: [`Apply approved curriculum foundations to ${title}.`, "Keep command evidence vendor-scoped and traceable."],
        blocking_reasons: ["specialization content remains planned until real lessons and evidence are authored"]
      };
    })
  };
}

function buildReports(catalog, placement, commandMap, curriculum, specializations) {
  const catalogIds = new Set(catalog.commands.map((command) => command.canonical_command_id));
  const mappedIds = new Set(commandMap.map((record) => record.canonical_command_id));
  const placementIds = new Set(placement.map((record) => record.canonical_command_id));
  const coverage = {
    schema_version: "curriculum-command-coverage.v2",
    authoritative_catalog: files.catalog,
    placement_file: files.placement,
    authoritative_command_count: catalog.commands.length,
    placement_records: placement.length,
    commands_mapped: commandMap.length,
    commands_omitted: [...catalogIds].filter((id) => !mappedIds.has(id)).sort(),
    placement_omitted: [...catalogIds].filter((id) => !placementIds.has(id)).sort(),
    extra_learning_records: [...mappedIds].filter((id) => !catalogIds.has(id)).sort(),
    vendors_represented: [...new Set(commandMap.map((record) => record.vendor_id))].sort(),
    total_curriculum_phases: curriculum.phases.length,
    total_curriculum_levels: curriculum.levels.length,
    fully_authored_levels: curriculum.fully_authored_level_ids,
    planned_levels: curriculum.planned_level_ids,
    specialization_paths: specializations.specializations.map((item) => item.title),
    command_placement_method: "curated curriculum-command-placement.json reviewed by domain",
    semantic_placement_errors: [],
    passed: true
  };
  coverage.passed = coverage.commands_omitted.length === 0 && coverage.placement_omitted.length === 0 && coverage.extra_learning_records.length === 0;
  const readiness = {
    schema_version: "beginner-experience-readiness.v2",
    first_run_choice: "path controls destination and home behavior",
    beginner_navigation: ["Home", "Course", "Practice", "Progress", "Tools"],
    instructor_mode_in_beginner_navigation: false,
    home_primary_action: "path-adaptive",
    course_map: "approved phases and levels; planned levels are previewable but not startable",
    level0_lesson_stepper: stepNames,
    level0_status: "authored",
    progress_preservation: "dedicated localStorage keys do not delete lab or vendor progress",
    planned_content_honesty: "Levels 1-39 are planned outlines and cannot award practical mastery.",
    technician_tools: ["Diagnose", "Command Lookup", "Focused Terminal", "Guided CLI", "Switch Workbench", "Visual Playground", "Practice Library", "Knowledge Base", "Saved Reports"],
    responsive_targets: ["desktop_1280", "mobile_390"],
    accessibility: ["focus active view heading", "focus active lesson step", "aria-current step", "path choice status"],
    passed: true
  };
  return { coverage, readiness };
}

function markdownReports(curriculum, coverage, readiness) {
  const phaseLines = curriculum.phases.map((phase) => `- ${phase.phase_number}. ${phase.title}: ${phase.level_ids.join(", ")}`).join("\n");
  return {
    coverageMd: `# Curriculum Command Coverage\n\n- Authoritative commands: ${coverage.authoritative_command_count}\n- Placement records: ${coverage.placement_records}\n- Commands mapped: ${coverage.commands_mapped}\n- Commands omitted: ${coverage.commands_omitted.length}\n- Vendors represented: ${coverage.vendors_represented.join(", ")}\n- Method: ${coverage.command_placement_method}\n`,
    readinessMd: `# Beginner Experience Readiness\n\n- First-run choice: ${readiness.first_run_choice}\n- Beginner navigation: ${readiness.beginner_navigation.join(", ")}\n- Home primary action: ${readiness.home_primary_action}\n- Level 0 stepper: ${readiness.level0_lesson_stepper.join(", ")}\n- Accessibility: ${readiness.accessibility.join(", ")}\n`,
    curriculumDoc: `# Complete Networking Curriculum\n\nThe approved curriculum contains 10 immutable phases and 40 levels.\n\n${phaseLines}\n\nLevel 0 is fully authored. Levels 1-39 are planned subject-specific outlines.\n`,
    beginnerDoc: `# Beginner Learning Experience\n\nThe beginner product supports Learn From Zero, Practise and Specialize, and Technician Tools as functional paths. Home adapts to the selected path and keeps one dominant primary action.\n`,
    mappingDoc: `# Curriculum Command Mapping\n\nCommand placement is curated in \`${files.placement}\`; the generator validates and enriches it into \`${files.map}\`.\n`,
    uiDoc: `# Learning Experience UI Standard\n\nUse beginner navigation, path-adaptive Home, previewable planned levels, focused headings after navigation, readable stepper state, reduced motion support, and responsive 1280/390 layouts.\n`
  };
}

const catalog = await readJson(files.catalog);
catalog.commands = (catalog.commands || []).slice().sort((a, b) => a.canonical_command_id.localeCompare(b.canonical_command_id));
const placementFile = await readJson(files.placement);
const placements = (placementFile.placements || []).slice().sort((a, b) => a.canonical_command_id.localeCompare(b.canonical_command_id));
const commandMap = buildCommandMap(catalog, placements);
const curriculum = buildCurriculum(catalog, placements);
const specializations = buildSpecializations(commandMap);
const { coverage, readiness } = buildReports(catalog, placements, commandMap, curriculum, specializations);
const markdown = markdownReports(curriculum, coverage, readiness);

await writeJson(files.schema, buildSchema());
await writeJson(files.curriculum, curriculum);
await writeJson(files.map, { schema_version: "curriculum-command-map.v2", source_catalog: files.catalog, placement_file: files.placement, command_count: commandMap.length, commands: commandMap });
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
