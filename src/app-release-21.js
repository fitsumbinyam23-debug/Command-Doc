Exit code: 0
Wall time: 3.7 seconds
Total output lines: 5203
Output:
"use strict";

const COMMAND_FILES = [
  "data/commands/cisco_ios.json",
  "data/commands/hp_comware.json",
  "data/commands/aruba_cx.json",
  "data/commands/windows_cmd.json",
  "data/commands/linux.json",
  "data/commands/admin_commands.json",
  "data/commands/platform_commands.json",
  "data/commands/network_commands_extended.json",
  "data/commands/vendor_learning_extended.json",
  "data/commands/switch_configuration_extended.json"
];

const FLOW_FILES = [
  "data/flows/interface_troubleshooting.json",
  "data/flows/vlan_troubleshooting.json",
  "data/flows/stack_troubleshooting.json",
  "data/flows/dns_troubleshooting.json",
  "data/flows/gateway_troubleshooting.json"
];

const LAB_FILES = {
  stages: "data/labs/stages.json",
  sections: "data/labs/sections.json",
  curriculum: "data/labs/curriculum_vendor_tracks.json",
  scenarios: "data/labs/scenarios/scenarios.json"
};

const GENERATED_CURRICULUM_FILES = {
  inventory: "data/generated/command-inventory.json",
  audit: "data/generated/command-inventory-audit.json",
  routes: "data/generated/route-inventory.json",
  index: "data/generated/curriculum-index.json",
  health: "data/generated/curriculum-health.json"
};

const LAB_PROGRESS_KEY = "commandDoctorLabProgress";
const VENDOR_PROGRESS_KEY = "commandDoctorVendorProgress";
const VISUAL_NETWORK_STORAGE_KEY = "command-doctor.visual-network";
const VISUAL_NETWORK_SCHEMA_VERSION = 3;

const SIMULATOR_MISSIONS = [
  { id: "first-check", device: "access", phase: "Foundation", title: "Read an Access Port", description: "Use a safe read-only command to understand the simulated endpoint state.", command: "show interface status" },
  { id: "access-vlan", device: "access", phase: "Configuration", title: "Correct an Access VLAN", description: "Diagnose and repair a simulated access port with a controlled VLAN change.", command: "show interface status" },
  { id: "port-recovery", device: "disabled", phase: "Configuration", title: "Recover a Disabled Port", description: "Identify a simulated administratively down port, enable it, then verify the result.", command: "show interface status" },
  { id: "switch-verification", device: "access", phase: "Verification", title: "Verify Before Saving", description: "Read simulated interface configuration and choose save or rollback based on evidence.", command: "show running-config interface <ACCESS_PORT>" },
  { id: "irf-investigation", device: "irf", phase: "Stacking", title: "Investigate an IRF Link", description: "Collect simulated IRF topology and port evidence without changing stack state.", command: "display irf topology" },
  { id: "lacp-investigation", device: "aruba", phase: "Troubleshooting", title: "Investigate an LACP Member", description: "Read simulated member state before proposing an approved correction.", command: "show interface brief" }
];

const CONFIGURATION_DRILLS = [
  { title: "Rename a Simulated Switch", device: "access", purpose: "Set and verify the simulated device hostname.", commands: ["configure terminal", "hostname <SWITCH_NAME>", "end", "show running-config"] },
  { title: "Create and Name a VLAN", device: "access", purpose: "Create and name an approved simulated VLAN.", commands: ["configure terminal", "vlan <VLAN_ID>", "name <VLAN_NAME>", "end", "show vlan brief"] },
  { title: "Configure an Access Port", device: "access", purpose: "Set the simulated access port, then verify before saving.", commands: ["configure terminal", "interface <ACCESS_PORT>", "switchport mode access", "switchport access vlan <VLAN_ID>", "no shutdown", "end", "show running-config interface <ACCESS_PORT>"] },
  { title: "Configure a Trunk Port", device: "trunk", purpose: "Practice a simulated trunk workflow and verify allowed VLANs.", commands: ["configure terminal", "interface <TRUNK_PORT>", "switchport mode trunk", "switchport trunk allowed vlan <VLAN_ID>", "end", "show interfaces trunk"] },
  { title: "Set Cisco Stack Priority", device: "access", purpose: "Practice the simulated stack-member priority command and verify member roles.", commands: ["configure terminal", "switch <STACK_MEMBER_ID> priority <PRIORITY>", "end", "show switch"] },
  { title: "Set HP IRF Member Priority", device: "irf", purpose: "Practice simulated Comware IRF priority and verify the configuration.", commands: ["system-view", "irf member <STACK_MEMBER_ID> priority <PRIORITY>", "return", "display irf configuration"] }
];

const VENDOR_LABELS = {
  cisco_ios: "Cisco IOS",
  hp_comware: "HP Comware",
  aruba_cx: "ArubaOS-CX",
  windows_cmd: "Windows CMD",
  linux: "Linux",
  unknown: "Unknown"
};

const STATUS_SCORE = {
  Critical: 50,
  Warning: 40,
  Passed: 30,
  Info: 20,
  Unknown: 10
};

const FLOW_CATEGORY_MAP = {
  endpoint: "gateway",
  connectivity: "gateway",
  configuration: "interface",
  neighbors: "interface",
  switching: "interface",
  logs: "interface"
};

const OUTPUT_EVIDENCE_HINTS = [
  "Status",
  "VLAN",
  "Ports",
  "Interface",
  "Protocol",
  "Current state",
  "Line protocol",
  "MemberID",
  "IRF-Port",
  "Role",
  "Priority",
  "Windows IP Configuration",
  "IPv4 Address",
  "Default Gateway",
  "DNS Servers",
  "Reply from",
  "Request timed out",
  "packet loss",
  "bytes from",
  "state UP",
  "state DOWN",
  "NO-CARRIER",
  "ANSWER SECTION"
];

const COMMAND_ALIASES = {
  cisco_show_version: ["sh version", "sh ver"],
  cisco_show_interface_status: ["sh interface status", "sh interfaces status", "sh int status"],
  cisco_show_interfaces: ["sh interfaces", "sh interface", "sh int"],
  cisco_show_vlan_brief: ["sh vlan brief", "sh vlan br"],
  cisco_show_mac_address_table: ["sh mac address-table", "sh mac add", "sh mac-address-table"],
  cisco_show_cdp_neighbors: ["sh cdp neighbors", "sh cdp neigh"],
  cisco_show_lldp_neighbors: ["sh lldp neighbors", "sh lldp neigh"],
  cisco_show_ip_arp: ["sh ip arp"],
  cisco_show_spanning_tree: ["sh spanning-tree", "sh span"],
  cisco_show_etherchannel_summary: ["sh etherchannel summary", "sh ether sum"],
  cisco_show_running_config_interface: [
    "sh running-config interface",
    "sh run interface",
    "sh run int"
  ],
  cisco_configure_terminal: ["conf t", "config terminal"],
  cisco_interface_config: ["int <interface>"],
  cisco_no_shutdown: ["no shut"],
  cisco_switchport_access_vlan: ["switchport access vlan <vlan>"],
  cisco_copy_running_startup: ["copy run start", "write memory", "wr mem"],
  cisco_show_diagnostic_result: ["sh diagnostic result", "sh diag result", "show diag result"],
  cisco_dir_flash: ["dir flash"],
  cisco_show_file_systems: ["sh file systems"],
  cisco_show_boot: ["sh boot"],
  cisco_show_inventory: ["sh inventory", "sh inv"],
  cisco_show_logging: ["sh logging", "sh log"],
  cisco_show_ip_interface_brief: ["sh ip interface brief", "sh ip int brief", "sh ip int br"],
  cisco_show_ip_route: ["sh ip route"],
  cisco_show_running_config: ["sh running-config", "sh run"],
  cisco_show_startup_config: ["sh startup-config", "sh start"],
  aruba_configure_terminal: ["conf t", "config terminal"],
  aruba_interface_config: ["int <interface>"],
  aruba_no_shutdown: ["no shut"],
  aruba_write_memory: ["write mem", "copy running-config startup-config"],
  windows_netsh_set_static_ip: ["netsh interface ipv4 set address"],
  windows_netsh_interface_disable: ["netsh interface set interface <name> disabled"],
  windows_netsh_interface_enable: ["netsh interface set interface <name> enabled"],
  linux_ip_link_down: ["ip link set <interface> down"],
  linux_ip_link_up: ["ip link set <interface> up"],
  linux_dhclient_release: ["dhclient -r <interface>"],
  linux_dhclient_renew: ["dhclient <interface>"],
  linux_restart_networkmanager: ["systemctl restart NetworkManager"],
  linux_restart_networking: ["systemctl restart networking"]
};

const COMWARE_ALIASES = {
  hp_display_version: ["dis version", "dis ver"],
  hp_display_interface_brief: ["dis interface brief", "dis int brief"],
  hp_display_interface: ["dis interface", "dis int"],
  hp_display_vlan: ["dis vlan"],
  hp_display_mac_address: ["dis mac-address", "dis mac"],
  hp_display_lldp_neighbor: ["dis lldp neighbor-information", "dis lldp neighbor"],
  hp_display_device: ["dis device"],
  hp_display_irf: ["dis irf"],
  hp_display_irf_topology: ["dis irf topology"],
  hp_display_irf_port: ["dis irf-port"],
  hp_display_irf_port_configuration: ["dis irf-port configuration"],
  hp_display_irf_configuration: ["dis irf configuration"],
  hp_display_current_configuration_interface: [
    "dis current-configuration interface",
    "dis current int"
  ],
  hp_display_logbuffer: ["dis logbuffer"],
  hp_display_diagnostic_information: ["dis diagnostic-information", "dis diag"],
  hp_display_current_configuration: ["dis current-configuration", "dis current"],
  hp_display_ip_interface_brief: ["dis ip interface brief", "dis ip int brief", "dis ip int br"],
  hp_display_ip_routing_table: ["dis ip routing-table", "dis ip route"],
  hp_display_arp: ["dis arp"],
  hp_display_stp_brief: ["dis stp brief", "dis stp br"],
  hp_display_link_aggregation_verbose: ["dis link-aggregation verbose", "dis link agg verbose"],
  hp_display_saved_configuration: ["dis saved-configuration", "dis saved"],
  hp_system_view: ["sys", "system-view"],
  hp_interface_config: ["int <interface>", "interface <interface>"],
  hp_undo_shutdown: ["undo shut"],
  hp_port_access_vlan: ["port access vlan <vlan>"],
  hp_save: ["save force"]
};

const VENDOR_DETECTORS = [
  {
    key: "cisco_ios",
    label: "Cisco IOS",
    markers: [
      { pattern: "Cisco IOS", weight: 7, name: "Cisco IOS" },
      { pattern: "\\b(?:Gi|Fa|Te|Twe|Hu)\\d+\\/\\d+(?:\\/\\d+)?\\b", weight: 5, name: "Cisco short interface" },
      { pattern: "\\b(?:GigabitEthernet|FastEthernet|TenGigabitEthernet|Port-channel)\\d", weight: 4, name: "Cisco interface format" },
      { pattern: "show\\s+(?:interface|vlan|mac address-table|cdp|lldp|spanning-tree|etherchannel)", weight: 4, name: "Cisco show command" },
      { pattern: "\\bsh\\s+(?:int|interface|vlan|mac|cdp|lldp|ip\\s+arp|span|spanning-tree|etherchannel|ether\\s+sum|run)", weight: 4, name: "Cisco shorthand command" },
      { pattern: "\\berr-disabled\\b|\\bnotconnect\\b", weight: 5, name: "Cisco status keyword" }
    ]
  },
  {
    key: "hp_comware",
    label: "HP Comware",
    markers: [
      { pattern: "Comware|HPE Comware", weight: 7, name: "Comware software" },
      { pattern: "display\\s+(?:interface|vlan|mac-address|irf|current-configuration|logbuffer)", weight: 5, name: "Comware display command" },
      { pattern: "\\b(?:Ten-GigabitEthernet|GigabitEthernet)\\d+\\/\\d+\\/\\d+\\b", weight: 5, name: "Comware interface format" },
      { pattern: "\\bIRF\\b|MemberID|display\\s+device", weight: 4, name: "IRF or device marker" }
    ]
  },
  {
    key: "aruba_cx",
    label: "ArubaOS-CX",
    markers: [
      { pattern: "ArubaOS-CX", weight: 8, name: "ArubaOS-CX" },
      { pattern: "show\\s+interface\\s+brief[\\s\\S]*\\b\\d+\\/\\d+\\/\\d+\\b", weight: 8, name: "Aruba interface brief format" },
      { pattern: "show\\s+lldp\\s+neighbor-info", weight: 5, name: "Aruba LLDP command" },
      { pattern: "show\\s+running-config\\s+interface\\s+\\d+\\/\\d+\\/\\d+", weight: 5, name: "Aruba interface command" },
      { pattern: "^\\s*\\d+\\/\\d+\\/\\d+\\s+", weight: 4, name: "Aruba interface format" },
      { pattern: "AOS-CX|Aruba\\s+CX", weight: 5, name: "Aruba CX marker" }
    ]
  },
  {
    key: "windows_cmd",
    label: "Windows CMD",
    markers: [
      { pattern: "Windows IP Configuration", weight: 8, name: "Windows IP Configuration" },
      { pattern: "Ethernet adapter|Wireless LAN adapter", weight: 6, name: "Windows adapter header" },
      { pattern: "Default Gateway|DNS Servers|IPv4 Address", weight: 4, name: "Windows network field" },
      { pattern: "Pinging\\s+.+\\s+with\\s+\\d+\\s+bytes", weight: 4, name: "Windows ping" },
      { pattern: "nslookup|DNS request timed out|Non-authoritative answer|Server:\\s+", weight: 10, name: "Windows DNS tool output" },
      { pattern: "Tracing route|route\\s+print|netsh\\s+interface", weight: 4, name: "Windows command output" }
    ]
  },
  {
    key: "linux",
    label: "Linux",
    markers: [
      { pattern: "^\\d+:\\s+\\S+:", weight: 6, name: "Linux ip addr interface" },
      { pattern: "\\binet\\s+\\d+\\.\\d+\\.\\d+\\.\\d+", weight: 4, name: "Linux inet address" },
      { pattern: "default\\s+via\\s+\\d+\\.\\d+\\.\\d+\\.\\d+", weight: 6, name: "Linux default route" },
      { pattern: "\\b(?:eth\\d+|ens\\d+|eno\\d+|enp\\w+|wlan\\d+)\\b", weight: 4, name: "Linux interface name" },
      { pattern: "PING\\s+.+\\(.+\\)|packets transmitted|;\\s*<<>>\\s*DiG", weight: 4, name: "Linux network command" }
    ]
  }
];

const SAMPLE_CASES = [
  {
    id: "cisco_notconnect",
    label: "Cisco port not connected",
    vendor: "auto",
    output: `Switch# show interface status

Port      Name               Status       Vlan       Duplex  Speed Type
Gi1/0/24  Lobby-AP           notconnect   30         auto    auto  10/100/1000BaseTX`
  },
  {
    id: "cisco_err_disabled",
    label: "Cisco err-disabled port",
    vendor: "auto",
    output: `Switch# show interface status

Port      Name               Status       Vlan       Duplex  Speed Type
Gi1/0/23  FrontDesk-Printer  connected    20         a-full a-1000 10/100/1000BaseTX
Gi1/0/25  Camera-Uplink      err-disabled 40         auto   auto   10/100/1000BaseTX`
  },
  {
    id: "cisco_command_only_vlan",
    label: "Cisco command only: sh vlan brief",
    vendor: "auto",
    output: "Switch# sh vlan brief"
  },
  {
    id: "hp_interface_down",
    label: "HP Comware interface down",
    vendor: "auto",
    output: `<HP> display interface brief
Brief information on interface(s) under route mode:
Interface            Link Protocol Main IP         Description
GigabitEthernet1/0/24 DOWN DOWN     --              Lobby AP`
  },
  {
    id: "hp_irf_port_down",
    label: "HP Comware IRF port down",
    vendor: "auto",
    output: `<HP> display irf-port
MemberID  IRF-Port1                 IRF-Port2
1         Ten-GigabitEthernet1/0/49 DOWN`
  },
  {
    id: "aruba_interface_down",
    label: "ArubaOS-CX interface down",
    vendor: "auto",
    output: `switch# show interface brief

Interface  Status  Speed  Duplex
1/1/24     down    auto   auto
1/1/25     up      1G     full`
  },
  {
    id: "windows_apipa",
    label: "Windows APIPA address",
    vendor: "auto",
    output: `Windows IP Configuration

Ethernet adapter Ethernet:
   Description . . . . . . . . . . . : Intel(R) Ethernet Connection
   Physical Address. . . . . . . . . : 00-11-22-33-44-55
   DHCP Enabled. . . . . . . . . . . : Yes
   Autoconfiguration IPv4 Address. . : 169.254.12.44(Preferred)
   Subnet Mask . . . . . . . . . . . : 255.255.0.0
   Default Gateway . . . . . . . . . :
   DNS Servers . . . . . . . . . . . : 10.1.1.10`
  },
  {
    id: "windows_dns_timeout",
    label: "Windows DNS timeout",
    vendor: "auto",
    output: `> nslookup intranet.example.local
Server:  dns01.example.local
Address:  10.1.1.10

DNS request timed out.
    timeout was 2 seconds.
*** Request to dns01.example.local timed-out`
  },
  {
    id: "linux_no_carrier",
    label: "Linux no carrier",
    vendor: "auto",
    output: `2: enp3s0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc fq_codel state DOWN mode DEFAULT group default qlen 1000
    link/ether 00:11:22:33:44:55 brd ff:ff:ff:ff:ff:ff
    inet 192.168.10.55/24 brd 192.168.10.255 scope global enp3s0`
  },
  {
    id: "cisco_shutdown_config",
    label: "Cisco shutdown warning",
    vendor: "auto",
    output: `Switch# show running-config interface Gi1/0/24
interface Gi1/0/24
 description Test Port
 switchport mode access
 switchport access vlan 20
 shutdown`
  }
];

const state = {
  commands: [],
  commandFiles: [],
  flows: [],
  safety: { commands: [], warning_message: "" },
  sources: null,
  curriculum: { inventory: [], audit: null, routes: [], index: null, health: null },
  history: [],
  currentReport: null,
  lookupSource: "search",
  lab: {
    stages: [],
    sections: [],
    lessons: [],
    quizzes: {},
    foundationFinalQuiz: [],
    scenarios: [],
    progress: null,
    screen: "dashboard",
    activeStageId: "foundation",
    diagnosticsMode: false,
    activeSectionId: "",
    playgroundTaskId: "free-practice",
    visualNetwork: null,
    switchProfiles: [],
    activeSwitchProfileId: window.localStorage?.getItem("command-doctor.active-switch-profile") || "cisco-catalyst-3750",
    switchRuntime: null,
    activeLessonId: "",
    practiceInput: "",
    practicePassed: false,
    quizSelection: null,
    scenarioScore: 0,
    vendorTrack: "all",
    learnPanel: "overview",
    activeGeneratedModuleId: "",
    activePremiumCommandId: "",
    premiumLesson: { mode: "guided", prediction: "", evidence: "", entered: "", hintLevel: 0, confidence: "", verified: false },
    libraryTab: "lookup",
    libraryFilters: { search: "", vendor: "", operatingSystem: "", platform: "", modelFamily: "", topic: "", difficulty: "", routeType: "", support: "", status: "" },
    vendorProgress: {},
    console: {
      device: "access",
      missionId: "access-vlan",
      mode: "exec",
      activeInterface: "GigabitEthernet1/0/1",
      vlan: "1",
      description: "PC-1",
      transcript: [],
      engine: null
    }
  }
};

const els = {};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else if (document.readyState) {
  init();
}

async function init() {
  cacheElements();
  bindEvents();
  loadHistory();
  await loadKnowledge();
  renderKnowledge();
  renderHistory();
  state.lab.diagnosticsMode = new URLSearchParams(window.location.search).get("advanced") === "diagnostics";
  if (state.lab.diagnosticsMode) {
    els.navTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.view === "lab"));
    els.views.forEach((view) => view.classList.toggle("active", view.id === "labView"));
  }
  renderLab();
  renderHome();
  renderLearn();
  renderLibrary();
  if (state.lab.diagnosticsMode) {
    window.setTimeout(() => {
      const workspace = document.querySelector(".topology-workspace");
      workspace?.classList.add("diagnostics-focus");
      workspace?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }
  registerServiceWorker();
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || window.location.protocol === "file:") {
    return;
  }
  navigator.serviceWorker.register("./sw.js").catch(() => {
    // The app remains fully usable online when browser policy blocks caching.
  });
}

function cacheElements() {
  for (const id of [
    "kbVersion",
    "cliOutput",
    "commandSearch",
    "lookupResults",
    "pasteSuggestions",
    "pasteSuggestionList",
    "lookupDetailPanel",
    "explainCommandBtn",
    "vendorSelect",
    "diagnoseBtn",
    "clearBtn",
    "loadSampleBtn",
    "exampleSelect",
    "analyzeExampleBtn",
    "resultsGrid",
    "resultsToolbar",
    "copyCommandsBtn",
    "copyTicketBtn",
    "copyReportBtn",
    "detectedVendor",
    "detectedCommand",
    "detectedStatus",
    "historyList",
    "clearHistoryBtn",
    "knowledgeGrid",
    "adminRoot",
    "labRoot",
    "homeRoot",
    "learnRoot",
    "libraryRoot",
    "toast"
  ]) {
    els[id] = document.getElementById(id);
  }
  els.navTabs = Array.from(document.querySelectorAll(".nav-tab"));
  els.views = Array.from(document.querySelectorAll(".view"));
}

function bindEvents() {
  els.diagnoseBtn.addEventListener("click", runDiagnosis);
  els.clearBtn.addEventListener("click", clearInput);
  els.loadSampleBtn.addEventListener("click", loadSample);
  els.analyzeExampleBtn.addEventListener("click", diagnoseSample);
  els.commandSearch.addEventListener("input", () => {
    state.lookupSource = "search";
    renderCommandLookup();
  });
  els.cliOutput.addEventListener("input", () => {
    state.lookupSource = "pa…55229 tokens truncated…];
    const card = labCreate("article", "library-card");
    card.append(labCreate("div", "lab-card-kicker", module.vendor ? state.curriculum.index?.vendors?.[module.vendor] || module.vendor : "Local curriculum"), labCreate("h3", "", module.title), labCreate("p", "", `${commands.length} commands | Level ${module.level} | ${module.topic.replace(/_/g, " ")}`));
    card.append(labButton("Open module", "primary", () => { state.lab.activeGeneratedModuleId = module.module_id; state.lab.learnPanel = "module"; renderLearn(); }));
    grid.append(card);
  });
  els.learnRoot.append(grid);
}

function renderGeneratedModule() {
  const module = generatedModulesForTrack().find((item) => item.module_id === state.lab.activeGeneratedModuleId) || generatedModulesForTrack()[0];
  if (!module) { state.lab.learnPanel = "overview"; renderLearn(); return; }
  const panel = labCreate("section", "learn-track-panel");
  panel.append(labButton("Back to Modules", "secondary", () => { state.lab.learnPanel = "modules"; renderLearn(); }));
  panel.append(labCreate("div", "lab-card-kicker", state.curriculum.index?.vendors?.[module.vendor] || module.vendor));
  panel.append(labCreate("h3", "", module.title));
  panel.append(labCreate("p", "", "Understand the command, read healthy and faulty output, practise it in the local CLI where supported, then verify before marking it learned."));
  els.learnRoot.append(panel);
  const commands = module.lessons?.flatMap((lesson) => lesson.commands || []) || [];
  const inventory = new Map((state.curriculum?.inventory || []).map((command) => [command.command_id, command]));
  const grid = labCreate("div", "library-grid");
  commands.forEach((lessonCommand) => {
    const command = inventory.get(lessonCommand.command_id) || lessonCommand;
    const card = labCreate("article", "library-card");
    card.append(labCreate("h3", "", command.canonical_command || command.command));
    card.append(labCreate("p", "", command.purpose || "Local command guidance."));
    if (command.aliases?.length) card.append(labCreate("p", "", `Aliases: ${command.aliases.join(", ")}`));
    card.append(labCreate("p", "", `Mode: ${command.command_mode || "See vendor prompt"} | Safety: ${command.safety_level || "See local guidance"} | Support: ${(command.simulator_support || "output_simulation").replace(/_/g, " ")}`));
    const details = labCreate("p", "", `Verify: ${(command.verification_commands || []).join("; ") || "Review output before continuing"}${command.rollback_commands?.length ? ` | Rollback: ${command.rollback_commands.join("; ")}` : ""}`);
    card.append(details);
    if (PREMIUM_INTERFACE_LESSONS[command.command_id]) {
      card.append(labButton("Start premium lesson", "primary", () => { resetPremiumLesson(command.command_id); state.lab.learnPanel = "premium"; renderLearn(); }));
    }
    card.append(labButton("Open in Command Lookup", "secondary", () => { els.commandSearch.value = command.canonical_command || command.command; state.lookupSource = "search"; switchView("diagnose"); renderCommandLookup(); }));
    grid.append(card);
  });
  els.learnRoot.append(grid);
}

function renderCommandCoverage() {
  const track = activeTrack();
  const progress = trackProgress(track);
  const commands = commandsForTrack(track);
  const states = commands.map((command) => commandLearningState(command, progress));
  const panel = labCreate("section", "learn-track-panel");
  panel.append(labButton("Back to Learn", "secondary", () => { state.lab.learnPanel = "overview"; renderLearn(); }));
  panel.append(labCreate("div", "lab-card-kicker", "Command coverage"));
  panel.append(labCreate("h3", "", `${track === "all" ? "All Tracks" : track} command coverage`));
  const metrics = labCreate("div", "learn-summary");
  const support = (value) => commands.filter((command) => command.simulator_support === value).length;
  const status = (value) => commands.filter((command) => command.learning_status === value).length;
  [["Canonical commands", commands.length], ["Aliases", commands.reduce((total, command) => total + (command.aliases || []).length, 0)], ["Learned", states.filter((state) => state === "Passed").length], ["Grouped lessons", status("grouped_lesson")], ["Planned lessons", status("planned_lesson")], ["Full state", support("full_state_simulation")], ["Simplified state", support("simplified_state_simulation")], ["Output simulation", support("output_simulation")], ["Explanation only", support("explanation_only")], ["Needs review", Object.keys(progress.reviewRoutes).length]].forEach(([label, value]) => metrics.append(labCreate("span", "badge", `${label}: ${value}`)));
  panel.append(metrics);
  const auditMetrics = state.curriculum.audit?.coverage_metrics || state.curriculum.health?.coverage_metrics;
  if (auditMetrics) {
    const readiness = labCreate("section", "lab-detail-field");
    readiness.append(labCreate("strong", "", `Learning readiness: ${auditMetrics.overall_learning_readiness}%`));
    readiness.append(labCreate("p", "", "This is an honest readiness calculation. It measures lesson assignment, practical exercise availability, route coverage, simulation depth, verification, troubleshooting, and review rather than treating classification alone as completion."));
    const readinessMetrics = labCreate("div", "learn-summary");
    [["Lessons", auditMetrics.lesson_coverage], ["Practical", auditMetrics.practical_exercise_coverage], ["Routes", auditMetrics.route_coverage], ["Fully simulated", auditMetrics.fully_simulated_coverage], ["Verification", auditMetrics.verification_coverage], ["Troubleshooting", auditMetrics.troubleshooting_coverage], ["Review", auditMetrics.review_coverage]].forEach(([label, value]) => readinessMetrics.append(labCreate("span", "badge", `${label}: ${value}%`)));
    readiness.append(readinessMetrics);
    panel.append(readiness);
  }
  const list = labCreate("div", "library-grid");
  commands.forEach((command) => {
    const card = labCreate("article", "library-card");
    const status = commandLearningState(command, progress);
    card.append(labCreate("div", "lab-card-kicker", command.vendor_label || command.vendor || "Local command"), labCreate("h3", "", command.canonical_command || command.command), labCreate("p", "", `${command.topic || command.category || "General"} | ${status} | ${command.simulator_support?.replace(/_/g, " ") || command.safety_level || "Explanation only"}`));
    card.append(labButton("Open in Command Lookup", "secondary", () => { els.commandSearch.value = command.command; state.lookupSource = "search"; switchView("diagnose"); renderCommandLookup(); }));
    list.append(card);
  });
  els.learnRoot.append(panel, list);
}

function renderLibrary() {
  if (!els.libraryRoot) return;
  els.libraryRoot.replaceChildren();
  const intro = labCreate("section", "library-intro");
  intro.append(labCreate("div", "lab-card-kicker", "Reference and review"));
  intro.append(labCreate("h3", "", "Find commands, repeat practice routes, review saved reports, or open instructor controls."));
  els.libraryRoot.append(intro);
  const tabs = [
    ["lookup", "Command Lookup"], ["practice", "Practice Library"], ["knowledge", "Knowledge Base"], ["reports", "Saved Reports"], ["instructor", "Instructor Mode"]
  ];
  const bar = labCreate("div", "library-tabs");
  tabs.forEach(([id, label]) => bar.append(labButton(label, `secondary ${state.lab.libraryTab === id ? "is-active" : ""}`, () => { state.lab.libraryTab = id; renderLibrary(); })));
  els.libraryRoot.append(bar);
  const body = labCreate("section", "library-tab-body");
  if (state.lab.libraryTab === "practice") renderPracticeLibrary(body);
  else if (state.lab.libraryTab === "knowledge") renderLibraryLaunch(body, "Knowledge Base", "Browse the offline command catalog used by Command Lookup.", "Open Knowledge Base", () => switchView("knowledge"));
  else if (state.lab.libraryTab === "reports") renderLibraryLaunch(body, "Saved Reports", `${state.history.length} report${state.history.length === 1 ? "" : "s"} are stored only in this browser.`, "Open Saved Reports", () => switchView("history"));
  else if (state.lab.libraryTab === "instructor") renderLibraryLaunch(body, "Instructor Mode", "Local course controls are kept here, away from normal student navigation.", "Open Instructor Mode", () => switchView("admin"));
  else renderLibraryLaunch(body, "Command Lookup", "Search the local knowledge base or paste exact command output for an explanation and diagnosis.", "Open Command Lookup", () => switchView("diagnose"));
  els.libraryRoot.append(body);
}

function renderLibraryLaunch(parent, title, copy, label, action) {
  const card = labCreate("article", "library-card");
  card.append(labCreate("h3", "", title), labCreate("p", "", copy), labButton(label, "primary", action));
  parent.append(card);
}

function startPracticeRoute(routeId) {
  const route = runtimeTrainingRoutes().find((item) => item.id === routeId);
  if (!route) return;
  state.lab.playgroundTaskId = route.id;
  state.lab.screen = "guided-cli";
  recordTrackActivity(route.vendor, { lastLabRouteId: route.id });
  switchView("lab");
  startFreshTrainingSwitch();
}

function renderPracticeLibrary(parent) {
  const filters = state.lab.libraryFilters;
  const track = activeTrack();
  const normalizedRoutes = runtimeTrainingRoutes().map((route) => {
    const generated = state.curriculum?.routes?.find((item) => item.route_id === route.id);
    return generated ? { ...route, ...generated, vendor: generated.vendor_label, operatingSystem: generated.operating_system, modelFamily: generated.platform, routeType: generated.route_type, support: generated.support_level.replace(/_/g, " "), estimatedMinutes: route.estimatedMinutes || 10 } : route;
  });
  const filterPanel = labCreate("section", "library-filter-panel");
  filterPanel.append(labCreate("strong", "lab-card-kicker", `${normalizedRoutes.length} local practice routes`));
  const search = document.createElement("input");
  search.placeholder = "Search routes";
  search.value = filters.search;
  search.setAttribute("aria-label", "Search practice routes");
  search.addEventListener("input", () => { filters.search = search.value; renderLibrary(); });
  filterPanel.append(search);
  const definitions = [
    ["vendor", "Vendor", [...new Set(normalizedRoutes.map((route) => route.vendor))]],
    ["operatingSystem", "Operating system", [...new Set(normalizedRoutes.map((route) => route.operatingSystem).filter(Boolean))]],
    ["platform", "Platform", [...new Set(normalizedRoutes.map((route) => route.platform))]],
    ["modelFamily", "Model family", [...new Set(normalizedRoutes.map((route) => route.modelFamily).filter(Boolean))]],
    ["topic", "Topic", [...new Set(normalizedRoutes.map((route) => route.topic))]],
    ["difficulty", "Difficulty", [...new Set(normalizedRoutes.map((route) => route.difficulty))]],
    ["routeType", "Route type", [...new Set(normalizedRoutes.map((route) => route.routeType))]],
    ["support", "Support level", [...new Set(normalizedRoutes.map((route) => route.support))]],
    ["status", "Learning status", ["Learned", "Not learned", "Needs review"]]
  ];
  definitions.forEach(([key, label, values]) => {
    const select = document.createElement("select");
    select.setAttribute("aria-label", label);
    select.append(new Option(`All ${label.toLowerCase()}`, ""));
    values.forEach((value) => select.append(new Option(value, value)));
    select.value = filters[key];
    select.addEventListener("change", () => { filters[key] = select.value; renderLibrary(); });
    filterPanel.append(select);
  });
  filterPanel.append(labButton("Clear filters", "secondary", () => {
    Object.assign(filters, { search: "", vendor: "", operatingSystem: "", platform: "", modelFamily: "", topic: "", difficulty: "", routeType: "", support: "", status: "" });
    renderLibrary();
  }));
  parent.append(filterPanel);
  const progress = trackProgress(track);
  const routes = normalizedRoutes.filter((route) => {
    const searched = !filters.search || `${route.label} ${route.topic} ${route.vendor}`.toLowerCase().includes(filters.search.toLowerCase());
    const activeVendor = track === "all" || route.vendor === track;
    const fieldsMatch = ["vendor", "operatingSystem", "platform", "modelFamily", "topic", "difficulty", "routeType", "support"].every((key) => !filters[key] || route[key] === filters[key]);
    const learned = Boolean(progress.practisedRoutes[route.id]);
    const review = Boolean(progress.reviewRoutes[route.id]);
    const statusMatch = !filters.status || (filters.status === "Learned" && learned) || (filters.status === "Not learned" && !learned) || (filters.status === "Needs review" && review);
    return searched && activeVendor && fieldsMatch && statusMatch;
  });
  const count = labCreate("p", "", `${routes.length} route${routes.length === 1 ? "" : "s"} match the current filters.`);
  parent.append(count);
  const grid = labCreate("div", "practice-route-grid");
  routes.forEach((route) => {
    const lesson = relatedLessonForRoute(route);
    const card = labCreate("article", "practice-route-card");
    card.dataset.routeId = route.id;
    card.append(labCreate("div", "lab-card-kicker", `${route.vendor} | ${route.platform}`), labCreate("h3", "", route.label), labCreate("p", "", `${route.topic} | ${route.difficulty}`));
    const facts = labCreate("div", "route-facts");
    [route.routeType, route.support, `${route.estimatedMinutes} min`, `Lesson: ${lesson?.title || "Planned command group"}`].forEach((fact) => facts.append(labCreate("span", "badge", fact)));
    card.append(facts, labButton("Start route", "primary", () => startPracticeRoute(route.id)));
    grid.append(card);
  });
  parent.append(grid);
}

function switchView(viewName, options = {}) {
  els.navTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.view === viewName));
  els.views.forEach((view) => view.classList.toggle("active", view.id === `${viewName}View`));
  if (viewName === "lab") {
    if (options.resetLab) state.lab.screen = "dashboard";
    renderLab();
  }
  if (viewName === "home") renderHome();
  if (viewName === "learn") renderLearn();
  if (viewName === "library") renderLibrary();
  if (viewName === "admin") renderAdmin();
}

function renderAdmin() {
  if (!els.adminRoot) return;
  els.adminRoot.replaceChildren();
  const panel = labCreate("section", "admin-panel");
  panel.append(labCreate("strong", "lab-card-kicker", "Course administration"));
  panel.append(labCreate("p", "", "These controls affect only this browser. They never connect to, configure, or run commands on a device."));
  const lessonCount = state.lab.lessons.length;
  const completed = Object.keys(state.lab.progress?.completedLessons || {}).length;
  panel.append(labCreate("p", "admin-metric", `${completed} of ${lessonCount} lessons marked complete`));
  panel.append(labButton("Unlock All Lab Content", "primary", () => {
    state.lab.lessons.forEach((lesson) => {
      state.lab.progress.completedLessons[lesson.id] = true;
      state.lab.progress.lessonScores[lesson.id] = 100;
    });
    state.lab.progress.foundationFinalScore = 100;
    state.lab.progress.configurationCompleted = true;
    saveLabProgress();
    renderAdmin();
    showToast("All simulated Lab Mode content is unlocked on this browser.");
  }));
  panel.append(labButton("Reset Lab Progress", "secondary", () => {
    state.lab.progress = defaultLabProgress();
    saveLabProgress();
    renderAdmin();
    showToast("Local Lab Mode progress was reset.");
  }));
  panel.append(labButton("Open Command Catalog", "secondary", () => switchView("knowledge")));
  els.adminRoot.append(panel);

  const catalog = labCreate("section", "admin-panel");
  catalog.append(labCreate("strong", "lab-card-kicker", "Offline command coverage"));
  const vendorCounts = state.commands.reduce((counts, command) => {
    const label = command.vendor_label || command.vendor || "Other";
    counts[label] = (counts[label] || 0) + 1;
    return counts;
  }, {});
  catalog.append(labCreate("p", "admin-metric", `${state.commands.length} practical commands loaded locally`));
  const list = labCreate("ul", "admin-vendor-list");
  Object.entries(vendorCounts).sort(([a], [b]) => a.localeCompare(b)).forEach(([vendor, count]) => list.append(labCreate("li", "", `${vendor}: ${count}`)));
  catalog.append(list);
  els.adminRoot.append(catalog);

  if (state.curriculum?.audit) {
    const audit = state.curriculum.audit;
    const health = state.curriculum.health || {};
    const inventory = labCreate("section", "admin-panel");
    inventory.append(labCreate("strong", "lab-card-kicker", "Generated curriculum audit"));
    inventory.append(labCreate("p", "admin-metric", `${audit.total_normalized_canonical_commands} canonical commands from ${audit.total_raw_command_records} raw records; ${audit.total_aliases} aliases; ${state.curriculum.routes.length} normalized routes.`));
    if (audit.routes_successfully_mapped !== undefined) inventory.append(labCreate("p", "", `Route mapping: ${audit.routes_successfully_mapped} mapped, ${audit.routes_unmapped || 0} unmapped, ${audit.routes_with_cross_vendor_conflicts?.length || 0} cross-vendor conflicts.`));
    inventory.append(labCreate("p", "", `Curriculum health: ${health.status || "Unavailable"}. Classification coverage: ${health.coverage_percentage ?? 0}%.`));
    const auditList = labCreate("ul", "admin-vendor-list");
    Object.entries(audit.commands_per_vendor || {}).forEach(([vendor, count]) => auditList.append(labCreate("li", "", `${state.curriculum.index?.vendors?.[vendor] || vendor}: ${count} commands`)));
    (health.warnings || []).forEach((warning) => auditList.append(labCreate("li", "", `Warning: ${warning}`)));
    inventory.append(auditList);
    els.adminRoot.append(inventory);
  }
}

function clearInput() {
  els.cliOutput.value = "";
  els.commandSearch.value = "";
  state.lookupSource = "search";
  state.currentReport = null;
  els.resultsToolbar.hidden = true;
  els.resultsGrid.replaceChildren();
  const empty = document.createElement("div");
  empty.className = "empty-state";
  const title = document.createElement("h3");
  title.textContent = "No analysis yet";
  const p = document.createElement("p");
  p.textContent = "Command Doctor is ready.";
  empty.append(title, p);
  els.resultsGrid.append(empty);
  updateMetrics({
    vendor: "-",
    vendorConfidence: "",
    command: "-",
    status: "-"
  });
  renderCommandLookup();
}

function loadSample() {
  loadSelectedSample(false);
}

function diagnoseSample() {
  loadSelectedSample(true);
}

function populateExamples() {
  els.exampleSelect.replaceChildren();
  SAMPLE_CASES.forEach((sample) => {
    const option = document.createElement("option");
    option.value = sample.id;
    option.textContent = sample.label;
    els.exampleSelect.append(option);
  });
}

function loadSelectedSample(shouldDiagnose) {
  const sample = SAMPLE_CASES.find((item) => item.id === els.exampleSelect.value) || SAMPLE_CASES[0];
  els.cliOutput.value = sample.output;
  state.lookupSource = "paste";
  els.vendorSelect.value = sample.vendor || "auto";
  renderCommandLookup();
  if (shouldDiagnose) {
    runDiagnosis();
    return;
  }
  showToast("Example loaded.");
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    els.toast.classList.remove("show");
  }, 2200);
}

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value));
  } catch (_error) {
    return value;
  }
}

function createId() {
  if (crypto?.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

