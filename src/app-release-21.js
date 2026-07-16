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

const COMPLETE_CURRICULUM_FILES = {
  curriculum: "data/curriculum/complete-networking-curriculum.json",
  commandMap: "data/curriculum/curriculum-command-map.json",
  specializations: "data/curriculum/curriculum-specializations.json",
  visualAssets: "data/curriculum/lesson-visual-assets.json"
};

const LAB_PROGRESS_KEY = "commandDoctorLabProgress";
const VENDOR_PROGRESS_KEY = "commandDoctorVendorProgress";
const VISUAL_NETWORK_STORAGE_KEY = "command-doctor.visual-network";
const VISUAL_NETWORK_SCHEMA_VERSION = 3;
const ACTIVE_BUILD_VERSION = "2026.07-runtime-rc.3";

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
  curriculum: { inventory: [], audit: null, routes: [], index: null, health: null, visualAssets: null },
  learning: { path: "", courseScreen: "map", levelId: "level_00", level0Progress: null, recentTool: "diagnose" },
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
    pendingRouteStartId: "",
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
  loadLearningState();
  state.lab.diagnosticsMode = new URLSearchParams(window.location.search).get("advanced") === "diagnostics";
  await loadKnowledge();
  renderKnowledge();
  renderHistory();
  if (!state.lab.diagnosticsMode) renderBeginnerNavigation();
  if (state.lab.diagnosticsMode) {
    els.navTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.view === "lab"));
    els.views.forEach((view) => view.classList.toggle("active", view.id === "labView"));
  }
  renderLab();
  renderHome();
  renderLearn();
  renderCourse();
  renderPractice();
  renderProgress();
  renderTools();
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
    "courseRoot",
    "practiceRoot",
    "progressRoot",
    "toolsRoot",
    "libraryRoot",
    "pathStatusAnnouncer",
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
    state.lookupSource = "paste";
    renderCommandLookup();
  });
  els.vendorSelect.addEventListener("change", renderCommandLookup);
  els.explainCommandBtn.addEventListener("click", explainLookupCommand);
  els.copyCommandsBtn.addEventListener("click", () => copyCurrent("commands"));
  els.copyTicketBtn.addEventListener("click", () => copyCurrent("ticket"));
  els.copyReportBtn.addEventListener("click", () => copyCurrent("report"));
  els.clearHistoryBtn.addEventListener("click", clearHistory);
  els.navTabs.forEach((tab) => {
    tab.addEventListener("click", () => switchView(tab.dataset.view, { resetLab: tab.dataset.view === "lab" }));
  });
  populateExamples();
}

async function loadKnowledge() {
  setBusy(true);

  const commandResults = await Promise.allSettled(COMMAND_FILES.map(loadJson));
  const loadedFiles = [];
  const commands = [];
  const commandKeys = new Set();

  commandResults.forEach((result, index) => {
    if (result.status !== "fulfilled") {
      return;
    }
    const file = result.value;
    loadedFiles.push({
      path: COMMAND_FILES[index],
      vendor: file.vendor,
      vendor_key: file.vendor_key,
      version: file.knowledge_base_version,
      commandCount: Array.isArray(file.commands) ? file.commands.length : 0
    });
    if (Array.isArray(file.commands)) {
      file.commands.forEach((command) => {
        const commandVendorKey = command.vendor_key || file.vendor_key;
        const commandVendorLabel = command.vendor_label || file.vendor;
        const key = `${commandVendorKey || "unknown"}:${normalizeCommandText(command.command)}`;
        if (commandKeys.has(key)) return;
        commandKeys.add(key);
        commands.push({
          ...command,
          vendor_key: commandVendorKey,
          vendor_label: commandVendorLabel,
          knowledge_base_version: file.knowledge_base_version
        });
      });
    }
  });

  const [safetyResult, sourcesResult, ...flowResults] = await Promise.allSettled([
    loadJson("data/safety/dangerous_commands.json"),
    loadJson("data/sources/sources.json"),
    ...FLOW_FILES.map(loadJson)
  ]);

  state.commands = commands;
  state.commandFiles = loadedFiles;
  state.safety = safetyResult.status === "fulfilled" ? safetyResult.value : state.safety;
  state.sources = sourcesResult.status === "fulfilled" ? sourcesResult.value : null;
  state.flows = flowResults
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);

  const labResults = await Promise.allSettled(Object.values(LAB_FILES).map(loadJson));
  const labData = Object.fromEntries(Object.keys(LAB_FILES).map((key, index) => [
    key,
    labResults[index]?.status === "fulfilled" ? labResults[index].value : null
  ]));
  state.lab.stages = labData.stages?.stages || [];
  state.lab.sections = labData.sections?.sections || [];
  state.lab.lessons = labData.curriculum?.lessons || [];
  state.lab.quizzes = labData.curriculum?.quizzes || {};
  state.lab.foundationFinalQuiz = labData.curriculum?.foundation_final || [];
  state.lab.scenarios = labData.scenarios?.scenarios || [];
  state.lab.progress = loadLabProgress();
  state.lab.vendorProgress = loadVendorProgress();
  migrateLabProgress();

  const generatedResults = await Promise.allSettled(Object.values(GENERATED_CURRICULUM_FILES).map(loadJson));
  const generated = Object.fromEntries(Object.keys(GENERATED_CURRICULUM_FILES).map((key, index) => [
    key,
    generatedResults[index]?.status === "fulfilled" ? generatedResults[index].value : null
  ]));
  const completeResults = await Promise.allSettled(Object.values(COMPLETE_CURRICULUM_FILES).map(loadJson));
  const complete = Object.fromEntries(Object.keys(COMPLETE_CURRICULUM_FILES).map((key, index) => [
    key,
    completeResults[index]?.status === "fulfilled" ? completeResults[index].value : null
  ]));
  state.curriculum = {
    inventory: generated.inventory?.commands || [],
    audit: generated.audit || null,
    routes: generated.routes?.routes || [],
    index: generated.index || null,
    health: generated.health || null,
    complete: complete.curriculum || null,
    commandMap: complete.commandMap?.commands || [],
    specializations: complete.specializations?.specializations || [],
    visualAssets: complete.visualAssets || null,
    metadata: {
      command_catalog_version: `command-inventory@${generated.inventory?.schema_version || "unknown"}:${generated.audit?.generated_at || "local"}`,
      profile_catalog_version: "local",
      active_build_version: ACTIVE_BUILD_VERSION
    }
  };
  const profileResult = await Promise.allSettled([loadJson("data/platforms/switch-profiles.json")]);
  const profileCatalog = profileResult[0]?.status === "fulfilled" ? profileResult[0].value : null;
  state.lab.switchProfiles = profileCatalog?.profiles || [];
  state.curriculum.metadata.profile_catalog_version = `switch-profiles@${profileCatalog?.schema_version || "unknown"}`;
  initializeSwitchRuntime();

  const version = state.sources?.knowledge_base_version || loadedFiles[0]?.version || "local";
  els.kbVersion.textContent = commands.length ? `KB ${version}` : "KB unavailable";
  els.diagnoseBtn.disabled = !commands.length;

  if (!commands.length) {
    renderKnowledgeError();
    showToast("Knowledge files could not be loaded.");
  }

  renderCommandLookup();
  if (document.getElementById("labView")?.classList.contains("active")) {
    renderLab();
  }
  setBusy(false);
}

async function loadJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Could not load ${path}`);
  }
  return response.json();
}

function activeSwitchProfile() {
  return state.lab.switchProfiles.find((profile) => profile.profile_id === state.lab.activeSwitchProfileId) || state.lab.switchProfiles[0] || null;
}

function initializeSwitchRuntime() {
  const runtime = window.CommandDoctorSwitchRuntime;
  const profile = activeSwitchProfile();
  if (!runtime || !profile || !state.curriculum.inventory.length) return;
  const saved = (() => {
    try {
      const value = window.localStorage.getItem(runtime.STORAGE_KEY);
      return value ? JSON.parse(value) : null;
    } catch { return null; }
  })();
  const restore = saved?.profile_id === profile.profile_id ? saved : null;
  // These commands already exist in the local CLI engine. They are registered here so
  // every Workbench action takes the same parser-and-runtime path as typed CLI input.
  const engineCommands = [
    { command_id: "runtime_end", canonical_command: "end", aliases: [], vendor: "cisco_ios", vendor_id: "cisco_ios", compatible_os_family_ids: ["cisco_ios"], available_modes: [], required_privilege: "enable", simulator_support: "full_state_simulation", topic: "CLI navigation" },
    { command_id: "runtime_enter_config_aruba", canonical_command: "configure terminal", aliases: ["conf t"], vendor: "aruba_cx", vendor_id: "aruba_cx", compatible_os_family_ids: ["arubaos_cx"], available_modes: [], required_privilege: "enable", simulator_support: "full_state_simulation", topic: "CLI navigation" },
    { command_id: "runtime_end_aruba", canonical_command: "end", aliases: [], vendor: "aruba_cx", vendor_id: "aruba_cx", compatible_os_family_ids: ["arubaos_cx"], available_modes: [], required_privilege: "enable", simulator_support: "full_state_simulation", topic: "CLI navigation" },
    { command_id: "runtime_interface_aruba", canonical_command: "interface <interface>", aliases: [], vendor: "aruba_cx", vendor_id: "aruba_cx", compatible_os_family_ids: ["arubaos_cx"], available_modes: ["config"], required_privilege: "enable", simulator_support: "full_state_simulation", topic: "Interface configuration" },
    { command_id: "runtime_enter_config_comware", canonical_command: "system-view", aliases: [], vendor: "hp_comware", vendor_id: "hp_comware", compatible_os_family_ids: ["hp_comware"], available_modes: [], required_privilege: "enable", simulator_support: "full_state_simulation", topic: "CLI navigation" },
    { command_id: "runtime_return_comware", canonical_command: "return", aliases: [], vendor: "hp_comware", vendor_id: "hp_comware", compatible_os_family_ids: ["hp_comware"], available_modes: [], required_privilege: "enable", simulator_support: "full_state_simulation", topic: "CLI navigation" },
    { command_id: "runtime_interface_comware", canonical_command: "interface <interface>", aliases: [], vendor: "hp_comware", vendor_id: "hp_comware", compatible_os_family_ids: ["hp_comware"], available_modes: ["config"], required_privilege: "enable", simulator_support: "full_state_simulation", topic: "Interface configuration" },
    { command_id: "runtime_interface_description", canonical_command: "description <free_text>", aliases: [], vendor: "cisco_ios", vendor_id: "cisco_ios", compatible_os_family_ids: ["cisco_ios"], available_modes: ["interface"], required_privilege: "enable", simulator_support: "full_state_simulation", topic: "Interface configuration" },
    { command_id: "runtime_interface_description_comware", canonical_command: "description <free_text>", aliases: [], vendor: "hp_comware", vendor_id: "hp_comware", compatible_os_family_ids: ["hp_comware"], available_modes: ["interface"], required_privilege: "enable", simulator_support: "full_state_simulation", topic: "Interface configuration" },
    { command_id: "runtime_interface_description_aruba", canonical_command: "description <free_text>", aliases: [], vendor: "aruba_cx", vendor_id: "aruba_cx", compatible_os_family_ids: ["arubaos_cx"], available_modes: ["interface"], required_privilege: "enable", simulator_support: "full_state_simulation", topic: "Interface configuration" },
    { command_id: "runtime_verify_interface_cisco", canonical_command: "show running-config interface <interface>", aliases: ["show run interface <interface>", "sh run int <interface>"], vendor: "cisco_ios", vendor_id: "cisco_ios", compatible_os_family_ids: ["cisco_ios"], available_modes: [], required_privilege: "enable", simulator_support: "full_state_simulation", topic: "Verification" },
    { command_id: "runtime_verify_interface_aruba", canonical_command: "show running-config interface <interface>", aliases: ["show run interface <interface>"], vendor: "aruba_cx", vendor_id: "aruba_cx", compatible_os_family_ids: ["arubaos_cx"], available_modes: [], required_privilege: "enable", simulator_support: "full_state_simulation", topic: "Verification" },
    { command_id: "runtime_verify_interface_comware", canonical_command: "display current-configuration interface <interface>", aliases: ["display current-configuration interface <interface>"], vendor: "hp_comware", vendor_id: "hp_comware", compatible_os_family_ids: ["hp_comware"], available_modes: [], required_privilege: "enable", simulator_support: "full_state_simulation", topic: "Verification" }
  ];
  state.lab.switchRuntime = {
    registry: new runtime.CommandRegistry([...state.curriculum.inventory, ...engineCommands], profile),
    state: new runtime.SharedSwitchState(profile, restore, state.curriculum.metadata)
  };
}

function selectSwitchProfile(profileId) {
  activateSwitchProfile(profileId);
  const profile = activeSwitchProfile();
  if (profile) {
    state.lab.vendorTrack = profile.vendor_label;
    startLabMission({ device: profile.vendor === "hp_comware" ? "irf" : profile.vendor === "aruba_cx" ? "aruba" : "access", id: "" });
  }
}

function activateSwitchProfile(profileId) {
  state.lab.activeSwitchProfileId = profileId;
  window.localStorage.setItem("command-doctor.active-switch-profile", profileId);
  initializeSwitchRuntime();
}

function profileForSimulatorDevice(device) {
  const vendor = device === "irf" ? "hp_comware" : device === "aruba" ? "aruba_cx" : "cisco_ios";
  return state.lab.switchProfiles.find((profile) => profile.vendor === vendor) || activeSwitchProfile();
}

function activeCommandRegistry() {
  return state.lab.switchRuntime?.registry || null;
}

function persistSwitchRuntime() {
  state.lab.switchRuntime?.state?.persist();
}

function syncRuntimeFromEngine(engine, commandId = "cli", enteredCommand = "") {
  const shared = state.lab.switchRuntime?.state;
  if (!shared || !engine?.state) return;
  const command = String(enteredCommand || "").trim().toLowerCase();
  const selected = engine.selectedInterface;
  const port = engine.state.interfaces?.[selected];
  // The engine is a presentation adapter. Synchronize only explicit mutations
  // made by this command, never its default fields for every interface.
  if (/^(hostname|sysname)\s+/.test(command) && engine.state.hostname) shared.updateHostname(engine.state.hostname, commandId);
  if (port && /^(description|no description|undo description)\b/.test(command)) shared.updateInterface(selected, { description: port.description || "" }, commandId);
  if (port && /^(switchport mode|port link-type)\b/.test(command)) shared.updateInterface(selected, { mode: port.mode || "access" }, commandId);
  if (port && /^(switchport access vlan|port access vlan|vlan access)\b/.test(command)) shared.updateInterface(selected, { vlan: Number(port.vlan) || port.vlan || 1 }, commandId);
  if (port && /^(switchport trunk allowed vlan|port trunk permit vlan|vlan trunk allowed)\b/.test(command)) shared.updateInterface(selected, { allowed_vlans: port.allowedVlans || "" }, commandId);
  if (port && /^(shutdown|no shutdown|undo shutdown)$/.test(command)) shared.updateInterface(selected, { admin_up: !port.shutdown, operational_up: Boolean(port.connected && !port.shutdown) }, commandId);
  if (engine.selectedVlan && /^name\s+/.test(command)) shared.running.vlans[engine.selectedVlan] = { name: engine.state.vlanNames?.[engine.selectedVlan] || `VLAN-${engine.selectedVlan}` };
  shared.running.logs = [...(engine.logs || [])];
  if (engine.selectedInterface && shared.interface(engine.selectedInterface)) shared.running.session.selected_interface = engine.selectedInterface;
  shared.storeTerminal(engine.transcript || [], engine.commands || []);
  syncVisualFromRuntime();
  persistSwitchRuntime();
}

function pendingChangeConfigSignature(change = {}) {
  return JSON.stringify({ field: change.field || "", before: change.before, after: change.after });
}

function pendingChangeRecordsSince(shared, beforeChanges = []) {
  const before = new Map(beforeChanges.map((change) => [change.change_id, pendingChangeConfigSignature(change)]));
  return shared.changes().filter((change) => before.get(change.change_id) !== pendingChangeConfigSignature(change));
}

function pendingChangePathsSince(shared, beforeChanges = []) {
  return pendingChangeRecordsSince(shared, beforeChanges).map((change) => change.field);
}

function formatAuthoritativeConfigurationDiff(changes = []) {
  return changes.map((change) => `${change.field}: ${change.before ?? "-"} -> ${change.after ?? "-"}`).join("\n");
}

function commandEventMetadata(resolution, command, modeBefore, modeAfter, changedFields = [], result = {}) {
  const matched = resolution?.command || {};
  return {
    command_id: matched.command_id || "unclassified",
    handler_id: matched.handler_id || matched.handler_identity || "",
    canonical_command: matched.canonical_command || command,
    entered_text: command,
    entered_alias: Boolean(resolution?.entered_alias),
    parsed_parameters: resolution?.parsed_parameters || {},
    mode_before: modeBefore,
    mode_after: modeAfter,
    changed_fields: changedFields,
    verification_policy_id: result.verification_policy_id || "",
    verification_record_id: result.verification_record_id || ""
  };
}

function syncVisualFromRuntime() {
  const shared = state.lab.switchRuntime?.state;
  if (!shared) return;
  const network = visualNetwork();
  network.hostname = shared.running.system.hostname;
  Object.entries(shared.running.interfaces || {}).forEach(([name, port]) => {
    const visual = visualPort(network, name);
    if (!visual) return;
    visual.description = port.description || "";
    visual.vlan = String(port.vlan || 1);
    visual.mode = port.mode || "access";
    visual.adminUp = Boolean(port.admin_up);
    visual.allowedVlans = port.allowed_vlans || "";
  });
  network.vlans = Object.fromEntries(Object.entries(shared.running.vlans || {}).map(([id, vlan]) => [id, { name: vlan.name || `VLAN-${id}` }]));
  saveVisualNetwork(network);
}

function hydrateEngineFromRuntime(engine) {
  const shared = state.lab.switchRuntime?.state;
  if (!shared || !engine) return engine;
  engine.state.hostname = shared.running.system.hostname;
  engine.state.interfaces = Object.fromEntries(Object.entries(shared.running.interfaces || {}).map(([name, port]) => [name, {
    description: port.description || "", vlan: String(port.vlan || 1), shutdown: !port.admin_up, connected: Boolean(port.operational_up), mode: port.mode || "access", allowedVlans: port.allowed_vlans || ""
  }]));
  engine.state.vlans = Object.keys(shared.running.vlans || {});
  engine.state.vlanNames = Object.fromEntries(Object.entries(shared.running.vlans || {}).map(([id, vlan]) => [id, vlan.name || `VLAN-${id}`]));
  engine.selectedInterface = shared.selectedInterface() || engine.selectedInterface;
  engine.transcript = [...shared.terminalHistory()];
  engine.commands = [...(shared.running.session.command_history || [])];
  return engine;
}

function setBusy(isBusy) {
  els.diagnoseBtn.disabled = isBusy || !state.commands.length;
  els.diagnoseBtn.textContent = isBusy ? "Loading" : "Diagnose";
}

function runDiagnosis() {
  const text = els.cliOutput.value.trim();
  if (!text) {
    showToast("Paste command output first.");
    return;
  }

  const report = diagnose(text, els.vendorSelect.value);
  state.currentReport = report;
  renderReport(report);
  updateMetrics(report);
  saveHistory(report);
  renderHistory();
}

function diagnose(text, selectedVendor) {
  let vendorDetection = selectedVendor === "auto"
    ? detectVendor(text)
    : manualVendor(selectedVendor);

  let commandDetection = detectCommand(text, vendorDetection.key === "unknown" ? null : vendorDetection.key);

  if (selectedVendor === "auto" && vendorDetection.confidence === "Low") {
    const globalCommandDetection = detectCommand(text, null);
    if (
      globalCommandDetection.command &&
      (!commandDetection.command || globalCommandDetection.score > commandDetection.score)
    ) {
      commandDetection = globalCommandDetection;
      vendorDetection = {
        key: globalCommandDetection.command.vendor_key,
        label: globalCommandDetection.command.vendor_label,
        score: globalCommandDetection.score,
        confidence: "Low",
        matches: ["Inferred from strongest command match"]
      };
    }
  }

  if (vendorDetection.key === "unknown" && commandDetection.command) {
    vendorDetection = {
      key: commandDetection.command.vendor_key,
      label: commandDetection.command.vendor_label,
      score: commandDetection.score,
      confidence: "Low",
      matches: ["Inferred from command knowledge"]
    };
  }

  if (!commandDetection.command && vendorDetection.key !== "unknown") {
    commandDetection = detectCommand(text, vendorDetection.key);
  }

  let entities = extractEntities(text, vendorDetection.key);
  const dangerWarnings = detectDangerous(text);

  if (!commandDetection.command) {
    const suggestions = suggestCommands(text, vendorDetection.key);
    const fallbackStatus = dangerWarnings.length ? "Warning" : "Unknown";
    const report = {
      id: createId(),
      timestamp: new Date().toISOString(),
      pastedOutput: text,
      status: fallbackStatus,
      mode: "Unknown",
      confidence: "Low",
      confidenceReason: vendorDetection.key === "unknown"
        ? "Vendor and command were not confidently detected."
        : "Vendor was detected, but no exact known command or output pattern was confident enough.",
      vendor: vendorDetection.label,
      vendor_key: vendorDetection.key,
      vendorConfidence: vendorDetection.confidence,
      vendorMatches: vendorDetection.matches,
      command: "Unknown command",
      commandId: null,
      safetyLevel: dangerWarnings[0]?.risk || "",
      commandConfidence: "Low",
      commandSuggestions: suggestions,
      diagnosis: "Unknown command",
      evidence: getFirstLines(text),
      meaning: suggestions.length
        ? "This may be similar to a known local command, but Command Doctor will not force a diagnosis without a confident match."
        : "The pasted text may be incomplete, from an unsupported command, or missing recognizable status lines.",
      possibleCauses: [
        "Unsupported command output",
        "Partial output pasted",
        "Vendor or command not yet in the local knowledge base",
        "Manual vendor selection may be needed"
      ],
      useFor: [],
      goodOutput: [],
      badOutput: [],
      troubleshootingFlow: null,
      nextCommands: [],
      doNotTouch: dangerWarnings.length
        ? state.safety.warning_message
        : "Do not make configuration changes based on an unknown diagnosis.",
      dangerWarnings,
      learningNote: "Paste the command line plus its output when possible, or choose the vendor manually and try again.",
      sourceNote: getSourceNote(null),
      entities
    };
    report.ticketSummary = buildTicketSummary(report);
    return report;
  }

  const command = commandDetection.command;
  const commandOnly = isCommandOnlyInput(text, command);
  if (commandOnly) {
    const report = {
      id: createId(),
      timestamp: new Date().toISOString(),
      pastedOutput: text,
      status: "Info",
      mode: "Explanation Mode",
      confidence: "Medium",
      confidenceReason: `${commandDetection.matchDescription || "Command recognized"}, but no command output evidence was pasted.`,
      vendor: command.vendor_label,
      vendor_key: command.vendor_key,
      vendorConfidence: vendorDetection.confidence,
      vendorMatches: vendorDetection.matches,
      command: command.command,
      commandId: command.id,
      safetyLevel: command.safety_level,
      commandConfidence: commandDetection.confidence,
      commandScore: commandDetection.score,
      commandSuggestions: [],
      diagnosis: "Command recognized, but no command output was pasted.",
      evidence: [],
      meaning: command.meaning,
      possibleCauses: [],
      useFor: command.use_for || [],
      goodOutput: command.good_output || [],
      badOutput: command.bad_output || [],
      troubleshootingFlow: findFlow(command.category),
      nextCommands: prepareNextCommands(command.next_commands || [], entities),
      doNotTouch: dangerWarnings.length
        ? state.safety.warning_message
        : isElevatedRisk(command.safety_level)
          ? `${command.safety_level} Confirm approval, scope, backup, and rollback before use.`
          : "No diagnosis was made because no output evidence was provided.",
      dangerWarnings,
      learningNote: command.learning_note,
      sourceNote: getSourceNote(command),
      entities
    };
    report.ticketSummary = "Command recognized, but no output was provided for diagnosis.";
    return report;
  }

  const ruleOutcome = chooseRule(command, text);
  let status = ruleOutcome.status;
  if (dangerWarnings.length && STATUS_SCORE[status] < STATUS_SCORE.Warning) {
    status = "Warning";
  }

  const evidence = ruleOutcome.evidence.length
    ? ruleOutcome.evidence
    : getMatchingLines(text, [
      ...(command.critical_patterns || []),
      ...(command.warning_patterns || []),
      ...(command.normal_patterns || [])
    ]);

  entities = refineEntitiesFromEvidence(entities, evidence.length ? evidence : ruleOutcome.evidence, vendorDetection.key);

  const report = {
    id: createId(),
    timestamp: new Date().toISOString(),
    pastedOutput: text,
    status,
    mode: "Diagnosis Mode",
    confidence: calculateConfidence(commandDetection, evidence),
    confidenceReason: buildConfidenceReason(commandDetection, evidence),
    vendor: command.vendor_label,
    vendor_key: command.vendor_key,
    vendorConfidence: vendorDetection.confidence,
    vendorMatches: vendorDetection.matches,
    command: command.command,
    commandId: command.id,
    safetyLevel: command.safety_level,
    commandConfidence: commandDetection.confidence,
    commandScore: commandDetection.score,
    commandSuggestions: [],
    diagnosis: ruleOutcome.diagnosis,
    evidence: evidence.length ? evidence : getFirstLines(text),
    meaning: ruleOutcome.meaning || command.meaning,
    possibleCauses: ruleOutcome.possibleCauses.length ? ruleOutcome.possibleCauses : ["No specific cause identified from this output alone"],
    useFor: command.use_for || [],
    goodOutput: command.good_output || [],
    badOutput: command.bad_output || [],
    troubleshootingFlow: findFlow(command.category),
    nextCommands: prepareNextCommands(command.next_commands || [], entities),
    doNotTouch: ruleOutcome.doNotTouch || "Do not make changes until the evidence and expected design are confirmed.",
    dangerWarnings,
    learningNote: command.learning_note,
    sourceNote: getSourceNote(command),
    entities
  };
  report.ticketSummary = buildTicketSummary(report);
  return report;
}

function detectVendor(text) {
  const scored = VENDOR_DETECTORS.map((vendor) => {
    const matches = [];
    let score = 0;
    vendor.markers.forEach((marker) => {
      if (patternExists(text, marker.pattern)) {
        score += marker.weight;
        matches.push(marker.name);
      }
    });
    return {
      key: vendor.key,
      label: vendor.label,
      score,
      matches
    };
  }).sort((a, b) => b.score - a.score);

  const top = scored[0];
  if (!top || top.score === 0) {
    return {
      key: "unknown",
      label: "Unknown",
      score: 0,
      confidence: "Low",
      matches: []
    };
  }

  const runnerUp = scored[1]?.score || 0;
  let confidence = "Low";
  if (top.score >= 10 && top.score - runnerUp >= 4) {
    confidence = "High";
  } else if (top.score >= 5) {
    confidence = "Medium";
  }

  return { ...top, confidence };
}

function manualVendor(key) {
  return {
    key,
    label: VENDOR_LABELS[key] || key,
    score: 100,
    confidence: "Manual",
    matches: ["Manual selection"]
  };
}

function detectCommand(text, vendorKey) {
  const candidates = vendorKey
    ? state.commands.filter((command) => command.vendor_key === vendorKey)
    : state.commands;
  const commandOnlyText = looksLikeCommandOnlyText(text);

  const scored = candidates.map((command) => {
    let score = 0;
    const matches = [];
    let matchType = "pattern";
    let matchDescription = "Known output patterns matched";

    if (commandPhraseExists(text, command.command)) {
      score += 100 + Math.min(command.command.length / 8, 4);
      matches.push(command.command);
      matchType = "exact";
      matchDescription = "Exact command matched";
    }

    for (const alias of getCommandAliases(command)) {
      if (commandPhraseExists(text, alias)) {
        score += 95 + Math.min(alias.length / 8, 4);
        matches.push(alias);
        matchType = matchType === "exact" ? matchType : "alias";
        matchDescription = matchType === "exact" ? matchDescription : "Known command alias matched";
      }
    }

    if (commandOnlyText && matchType === "pattern") {
      return { command, score: 0, matches, matchType: "none", matchDescription: "" };
    }

    for (const pattern of command.detection_patterns || []) {
      if (patternExists(text, pattern)) {
        score += 4;
        matches.push(pattern);
      }
    }

    for (const pattern of command.critical_patterns || []) {
      if (patternExists(text, pattern)) {
        score += 2.5;
      }
    }

    for (const pattern of command.warning_patterns || []) {
      if (patternExists(text, pattern)) {
        score += 1.75;
      }
    }

    for (const pattern of command.normal_patterns || []) {
      if (patternExists(text, pattern)) {
        score += 1;
      }
    }

    return { command, score, matches, matchType, matchDescription };
  }).sort((a, b) => b.score - a.score);

  const top = scored[0];
  if (!top || top.score < 3) {
    return {
      command: null,
      score: top?.score || 0,
      confidence: "Low",
      matches: []
    };
  }

  const runnerUp = scored[1]?.score || 0;
  let confidence = "Low";
  if (top.matchType === "exact" || top.matchType === "alias") {
    confidence = top.score >= 95 ? "High" : "Medium";
  } else if (top.score >= 12 && top.score - runnerUp >= 3) {
    confidence = "High";
  } else if (top.score >= 6) {
    confidence = "Medium";
  }

  return { ...top, confidence };
}

function commandPhraseExists(text, command) {
  const normalizedCommand = normalizeLookupQuery(command);
  const commandPattern = normalizedCommand
    .split(" ")
    .filter(Boolean)
    .map((token, index, tokens) => {
      if (!isLookupParameter(token)) {
        return escapeRegex(token);
      }
      return index === tokens.length - 1 && isGreedyLookupParameter(token) ? ".+" : "\\S+";
    })
    .join("\\s+");
  const escaped = commandPattern || escapeRegex(command).replace(/\\ /g, "\\s+");
  return patternExists(text, `(?:^|[\\s>#])${escaped}(?:\\s|$)`);
}

function getCommandAliases(command) {
  return [
    ...(COMMAND_ALIASES[command.id] || []),
    ...(COMWARE_ALIASES[command.id] || [])
  ];
}

function lookupSummary(value, fallback) {
  const text = Array.isArray(value) ? value.join("; ") : value;
  if (!text) {
    return fallback;
  }
  return text.length > 132 ? `${text.slice(0, 129).trim()}...` : text;
}

function compactLookupMatches(matches) {
  const groups = new Map();
  matches.forEach((match) => {
    const key = normalizeLookupGroupKey(match.command);
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        ...match,
        variants: [match],
        score: match.score,
        vendor: match.vendor,
        matchedText: match.matchedText
      });
      return;
    }

    existing.variants.push(match);
    if (match.score > existing.score) {
      Object.assign(existing, {
        ...match,
        variants: existing.variants,
        score: match.score
      });
    }
  });

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      vendor: summarizeLookupVendors(group.variants),
      matchedText: summarizeLookupMatchText(group),
      safetyLevel: highestLookupRisk(group.variants) || group.safetyLevel
    }))
    .sort((a, b) => b.score - a.score || a.command.localeCompare(b.command));
}

function normalizeLookupGroupKey(command) {
  return normalizeLookupQuery(command).replace(/\s+/g, " ");
}

function summarizeLookupVendors(variants) {
  const vendors = uniqueValues(variants.map((variant) => variant.vendor));
  if (vendors.length <= 2) {
    return vendors.join(", ");
  }
  return `${vendors[0]} +${vendors.length - 1} vendors`;
}

function summarizeLookupMatchText(group) {
  const texts = uniqueValues(group.variants.map((variant) => variant.matchedText));
  return texts.length > 1 ? `${texts[0]} +${texts.length - 1} matches` : texts[0];
}

function highestLookupRisk(variants) {
  const rank = { critical: 5, high: 4, medium: 3, low: 2, safe: 1 };
  return variants
    .map((variant) => variant.safetyLevel)
    .filter(Boolean)
    .sort((a, b) => riskRank(b, rank) - riskRank(a, rank))[0] || "";
}

function riskRank(value, rank) {
  const normalized = String(value).toLowerCase();
  if (normalized.includes("critical")) return rank.critical;
  if (normalized.includes("high")) return rank.high;
  if (normalized.includes("medium")) return rank.medium;
  if (normalized.includes("low")) return rank.low;
  if (normalized.includes("safe")) return rank.safe;
  return 0;
}

function uniqueValues(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function renderLookupDetail(match, query) {
  if (!els.lookupDetailPanel) {
    return;
  }
  els.lookupDetailPanel.replaceChildren();

  if (!query) {
    const empty = document.createElement("div");
    empty.className = "lookup-detail-empty";
    empty.textContent = "Command details";
    els.lookupDetailPanel.append(empty);
    return;
  }

  if (!match) {
    const empty = document.createElement("div");
    empty.className = "lookup-detail-empty";
    empty.textContent = `No local command match for "${query}".`;
    els.lookupDetailPanel.append(empty);
    return;
  }

  const allVariants = match.variants || [match];
  const primary = resolveLookupVariant(match);
  const variants = els.vendorSelect.value === "auto" ? allVariants : [primary];
  const riskText = els.vendorSelect.value === "auto" ? match.safetyLevel : primary.safetyLevel;
  const exactCommandIds = new Set(findExactLookupCommands(query).map((entry) => entry.commandId));
  const isExactMatch = allVariants.some((variant) => exactCommandIds.has(variant.commandId));
  const head = document.createElement("div");
  head.className = "lookup-detail-head";

  const titleWrap = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = isExactMatch ? "Command Details" : "Possible Command Match";
  const command = document.createElement("code");
  command.textContent = primary.command;
  titleWrap.append(title, command);

  if (!isExactMatch) {
    const notice = document.createElement("p");
    notice.className = "lookup-match-notice";
    notice.textContent = "No exact local command was found. Choose a suggested command, select the vendor, or paste full output for diagnosis.";
    titleWrap.append(notice);
  }

  const vendorWrap = document.createElement("div");
  vendorWrap.className = "lookup-vendors";
  uniqueValues(allVariants.map((variant) => variant.vendor)).forEach((vendor) => {
    const chip = document.createElement("span");
    chip.textContent = vendor;
    vendorWrap.append(chip);
  });
  const riskChip = document.createElement("span");
  riskChip.className = isElevatedRisk(riskText) ? "lookup-risk-chip elevated" : "lookup-risk-chip";
  riskChip.textContent = `Risk: ${riskText || "Not classified"}`;
  vendorWrap.append(riskChip);

  head.append(titleWrap, vendorWrap);

  const grid = document.createElement("div");
  grid.className = "lookup-detail-grid";
  grid.append(
    createLookupDetailField("Meaning", primary.meaning || "Known offline command", true),
    createLookupDetailField("Why Run It", mergeLookupValues(variants, "useFor", 6)),
    createLookupDetailField("Good Output", mergeLookupValues(variants, "goodOutput", 5)),
    createLookupDetailField("Bad Output", mergeLookupValues(variants, "badOutput", 5)),
    createLookupDetailField("Recommended Next Commands", mergeLookupNextCommands(variants, 5), true),
    createLookupDetailField("Learning Note", primary.learningNote || "", true)
  );

  els.lookupDetailPanel.append(head, grid);
}

function createLookupDetailField(title, value, wide = false) {
  const field = document.createElement("section");
  field.className = wide ? "lookup-detail-field wide" : "lookup-detail-field";
  const label = document.createElement("strong");
  label.textContent = title;
  field.append(label);

  const values = Array.isArray(value) ? value.filter(Boolean) : [];
  if (values.length) {
    const list = document.createElement("ul");
    values.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      list.append(li);
    });
    field.append(list);
    return field;
  }

  const p = document.createElement("p");
  p.textContent = value || "-";
  field.append(p);
  return field;
}

function mergeLookupValues(variants, key, limit) {
  return uniqueValues(variants.flatMap((variant) => Array.isArray(variant[key]) ? variant[key] : [variant[key]])).slice(0, limit);
}

function mergeLookupNextCommands(variants, limit) {
  const commands = [];
  variants.forEach((variant) => {
    (variant.nextCommands || []).forEach((next) => {
      const text = next.why ? `${next.command} - ${next.why}` : next.command;
      if (text && !commands.includes(text)) {
        commands.push(text);
      }
    });
  });
  return commands.slice(0, limit);
}

function renderCommandLookup() {
  if (!els.lookupResults) {
    return;
  }
  const lookupContext = getLookupContext();
  const query = lookupContext.query;
  const lookupMatches = findCommandLookupMatches(query, 18);
  const vendorMatches = els.vendorSelect.value === "auto"
    ? lookupMatches
    : lookupMatches.filter((match) => match.vendorKey === els.vendorSelect.value);
  const matches = compactLookupMatches(vendorMatches).slice(0, 6);
  els.lookupResults.replaceChildren();
  renderPasteSuggestions(matches, lookupContext.source === "paste", query);
  renderLookupDetail(matches[0] || null, query);
  if (!query) {
    return;
  }

  matches.forEach((match) => {
    const button = document.createElement("button");
    button.className = "lookup-item";
    button.type = "button";
    button.addEventListener("click", () => selectLookupCommand(match));

    const command = document.createElement("strong");
    command.textContent = match.command;
    const meta = document.createElement("span");
    meta.textContent = `${match.vendor} · ${match.matchedText}`;

    const risk = document.createElement("small");
    risk.className = isElevatedRisk(match.safetyLevel) ? "lookup-risk elevated" : "lookup-risk";
    risk.textContent = `Risk: ${lookupSummary(match.safetyLevel, "Safe read-only command")}`;

    button.append(command, meta, risk);
    els.lookupResults.append(button);
  });
}

function renderPasteSuggestions(matches, isPasteLookup, query) {
  if (!els.pasteSuggestions || !els.pasteSuggestionList) {
    return;
  }

  els.pasteSuggestionList.replaceChildren();
  els.pasteSuggestions.hidden = !isPasteLookup || !query || !matches.length;
  if (els.pasteSuggestions.hidden) {
    return;
  }

  matches.forEach((match) => {
    const selected = resolveLookupVariant(match);
    const button = document.createElement("button");
    button.className = "paste-suggestion-button";
    button.type = "button";
    button.addEventListener("click", () => selectLookupCommand(match));

    const command = document.createElement("strong");
    command.textContent = selected.command;
    const vendor = document.createElement("span");
    vendor.textContent = match.vendor;
    const meaning = document.createElement("small");
    meaning.textContent = lookupSummary(selected.meaning, "Known local command");

    button.append(command, vendor, meaning);
    els.pasteSuggestionList.append(button);
  });
}

function getLookupContext() {
  const directQuery = els.commandSearch.value.trim();
  const pastedQuery = getPastedLookupQuery(els.cliOutput.value);
  if (state.lookupSource === "paste") {
    return pastedQuery
      ? { query: pastedQuery, source: "paste" }
      : { query: "", source: "none" };
  }
  return directQuery
    ? { query: directQuery, source: "search" }
    : pastedQuery
      ? { query: pastedQuery, source: "paste" }
      : { query: "", source: "none" };
}

function getLookupQueryFromInputs() {
  return getLookupContext().query;
}

function getPastedLookupQuery(text) {
  const pastedText = text.trim();
  const meaningfulLines = getMeaningfulLines(pastedText);
  if (!pastedText || meaningfulLines.length !== 1) {
    return "";
  }

  const firstLine = meaningfulLines[0].replace(/^\s*[^\s>#]+[>#]\s*/, "").trim();
  if (!firstLine || firstLine.length > 120) {
    return "";
  }
  if (looksLikeCommandOnlyText(pastedText)) {
    return firstLine;
  }

  const bestMatch = findCommandLookupMatches(firstLine, 1)[0];
  return bestMatch?.score >= 55 ? firstLine : "";
}

function explainLookupCommand() {
  const query = els.commandSearch.value.trim();
  if (!query) {
    showToast("Type a command first.");
    return;
  }

  const exactMatches = findExactLookupCommands(query);
  const vendorExact = exactMatches.find((match) => match.vendorKey === els.vendorSelect.value);
  if (vendorExact) {
    selectLookupCommand(vendorExact);
    runDiagnosis();
    return;
  }
  if (exactMatches.length === 1) {
    selectLookupCommand(exactMatches[0]);
    runDiagnosis();
    return;
  }
  if (exactMatches.length > 1) {
    renderCommandLookup();
    showToast("Choose the vendor-specific command from the lookup list.");
    return;
  }

  const matches = findCommandLookupMatches(query, 6);
  renderCommandLookup();
  if (matches.length === 1) {
    selectLookupCommand(matches[0]);
    runDiagnosis();
    return;
  }

  if (matches.length > 1) {
    showToast("Choose a command from the lookup list.");
    return;
  }

  els.cliOutput.value = query;
  els.vendorSelect.value = "auto";
  runDiagnosis();
}

function selectLookupCommand(match) {
  const selected = resolveLookupVariant(match);
  state.lookupSource = "search";
  els.commandSearch.value = selected.command;
  els.cliOutput.value = selected.command;
  els.vendorSelect.value = selected.vendorKey;
  renderCommandLookup();
}

function resolveLookupVariant(match) {
  const variants = match.variants || [match];
  if (els.vendorSelect.value !== "auto") {
    return variants.find((variant) => variant.vendorKey === els.vendorSelect.value) || variants[0];
  }
  return variants[0];
}

function findExactLookupCommand(query) {
  return findExactLookupCommands(query)[0] || null;
}

function findExactLookupCommands(query) {
  const normalizedQuery = normalizeLookupQuery(query);
  return getCommandLookupEntries().filter((entry) => {
    const normalizedCandidate = normalizeLookupQuery(entry.lookupText);
    return normalizedCandidate === normalizedQuery || lookupPatternMatches(normalizedCandidate, normalizedQuery);
  });
}

function findCommandLookupMatches(query, limit = 6) {
  const normalizedQuery = normalizeLookupQuery(query);
  if (!normalizedQuery) {
    return [];
  }

  const bestByCommand = new Map();
  getCommandLookupEntries().forEach((entry) => {
    const score = scoreLookupMatch(normalizedQuery, normalizeLookupQuery(entry.lookupText));
    if (score <= 0) {
      return;
    }
    const current = bestByCommand.get(entry.commandId);
    if (!current || score > current.score) {
      bestByCommand.set(entry.commandId, { ...entry, score });
    }
  });

  return Array.from(bestByCommand.values())
    .sort((a, b) => b.score - a.score || a.command.localeCompare(b.command))
    .slice(0, limit);
}

function getCommandLookupEntries() {
  return state.commands.flatMap((command) => {
    const base = {
      commandId: command.id,
      command: command.command,
      vendor: command.vendor_label,
      vendorKey: command.vendor_key,
      meaning: command.meaning,
      useFor: command.use_for,
      safetyLevel: command.safety_level,
      goodOutput: command.good_output || [],
      badOutput: command.bad_output || [],
      nextCommands: command.next_commands || [],
      learningNote: command.learning_note,
      category: command.category
    };
    return [
      {
        ...base,
        lookupText: command.command,
        matchedText: command.command
      },
      ...getCommandAliases(command).map((alias) => ({
        ...base,
        lookupText: alias,
        matchedText: `${alias} alias`
      }))
    ];
  });
}

function normalizeLookupQuery(value) {
  return normalizeCommandText(value)
    .replace(/\?/g, "")
    .replace(/\bsh\b/g, "show")
    .replace(/\bdis\b/g, "display")
    .replace(/\bdiag\b/g, "diagnostic")
    .trim();
}

function scoreLookupMatch(query, candidate) {
  if (!query || !candidate) {
    return 0;
  }
  if (candidate === query) {
    return 100;
  }
  if (lookupPatternMatches(candidate, query)) {
    return 96;
  }
  if (candidate.startsWith(query)) {
    return 85 - Math.max(0, candidate.length - query.length) / 10;
  }
  if (candidate.includes(query)) {
    return 65;
  }
  const queryTokens = query.split(" ").filter(Boolean);
  const candidateTokens = candidate.split(" ").filter(Boolean);
  const allTokensMatch = queryTokens.every((token) => candidateTokens.some((candidateToken) => candidateToken.startsWith(token)));
  if (allTokensMatch) {
    return 55 + queryTokens.length;
  }
  return similarityScore(query, candidate) * 45;
}

function lookupPatternMatches(candidate, query) {
  const candidateTokens = candidate.split(" ").filter(Boolean);
  const queryTokens = query.split(" ").filter(Boolean);
  if (!candidateTokens.length || !queryTokens.length) {
    return false;
  }

  let queryIndex = 0;
  for (let index = 0; index < candidateTokens.length; index += 1) {
    const token = candidateTokens[index];
    if (isLookupParameter(token)) {
      if (queryIndex >= queryTokens.length) {
        return false;
      }
      if (index === candidateTokens.length - 1 && isGreedyLookupParameter(token)) {
        return true;
      }
      queryIndex += 1;
      continue;
    }
    if (queryTokens[queryIndex] !== token) {
      return false;
    }
    queryIndex += 1;
  }
  return queryIndex === queryTokens.length;
}

function isLookupParameter(token) {
  return /^<[^>]+>$/.test(token);
}

function isGreedyLookupParameter(token) {
  return /(?:text|description|name|value|command)/.test(token);
}

function isElevatedRisk(value) {
  return /high|critical|disrupt|change|reboot|reload|shutdown|save|admin/i.test(value || "");
}

function looksLikeCommandOnlyText(text) {
  const meaningfulLines = getMeaningfulLines(text);
  if (!meaningfulLines.length || meaningfulLines.length > 2) {
    return false;
  }
  const joined = meaningfulLines.join(" ");
  const commandText = joined.replace(/^\s*[^\s>#]+[>#]\s*/, "").trim();
  if (findExactLookupCommands(commandText).length) {
    return true;
  }
  if (OUTPUT_EVIDENCE_HINTS.some((hint) => new RegExp(escapeRegex(hint), "i").test(joined))) {
    return false;
  }
  return /^(?:\S+[>#]\s*)?(?:show|sh|display|configure|config|conf|interface|int|shutdown|no|undo|switchport|port|vlan|copy|write|wr|save|reload|reboot|system-view|sys|ipconfig|ping|tracert|traceroute|arp|route|nslookup|netsh|ip|dig|sudo|systemctl|nmcli|dhclient)\b/i.test(joined);
}

function isCommandOnlyInput(text, command) {
  if (!looksLikeCommandOnlyText(text)) {
    return false;
  }
  if (commandPhraseExists(text, command.command)) {
    return true;
  }
  return getCommandAliases(command).some((alias) => commandPhraseExists(text, alias));
}

function calculateConfidence(commandDetection, evidence) {
  if ((commandDetection.matchType === "exact" || commandDetection.matchType === "alias") && evidence.length) {
    return "High";
  }
  if (commandDetection.matchType === "pattern" && evidence.length) {
    return commandDetection.confidence;
  }
  return "Medium";
}

function buildConfidenceReason(commandDetection, evidence) {
  if ((commandDetection.matchType === "exact" || commandDetection.matchType === "alias") && evidence.length) {
    return `${commandDetection.matchDescription} and known output evidence was found.`;
  }
  if (commandDetection.matchType === "pattern" && evidence.length) {
    return "Known output patterns were found, but an exact command line was not confirmed.";
  }
  return `${commandDetection.matchDescription || "Command recognized"}, but strong output evidence was limited.`;
}

function chooseRule(command, text) {
  const matches = (command.diagnosis_rules || [])
    .map((rule) => {
      const evidence = getMatchingLines(text, rule.patterns || []);
      return {
        rule,
        evidence,
        score: (STATUS_SCORE[rule.status] || 0) + evidence.length
      };
    })
    .filter((entry) => entry.evidence.length)
    .sort((a, b) => b.score - a.score);

  if (matches.length) {
    const best = matches[0].rule;
    return {
      status: best.status,
      diagnosis: best.diagnosis,
      evidence: matches[0].evidence,
      meaning: best.meaning,
      possibleCauses: best.possible_causes || [],
      doNotTouch: best.do_not_touch
    };
  }

  const criticalEvidence = getMatchingLines(text, command.critical_patterns || []);
  if (criticalEvidence.length) {
    return {
      status: "Critical",
      diagnosis: "A critical pattern was detected in the pasted command output.",
      evidence: criticalEvidence,
      meaning: command.meaning,
      possibleCauses: ["The output contains a critical keyword or state from the local knowledge base."],
      doNotTouch: "Do not make changes until the critical condition is understood and approved."
    };
  }

  const warningEvidence = getMatchingLines(text, command.warning_patterns || []);
  if (warningEvidence.length) {
    return {
      status: "Warning",
      diagnosis: "A warning pattern was detected in the pasted command output.",
      evidence: warningEvidence,
      meaning: command.meaning,
      possibleCauses: ["The output contains a warning keyword or state from the local knowledge base."],
      doNotTouch: "Do not make changes until the warning condition is verified."
    };
  }

  const normalEvidence = getMatchingLines(text, command.normal_patterns || []);
  if (normalEvidence.length) {
    return {
      status: "Passed",
      diagnosis: "No issue pattern was detected and the output matches normal patterns.",
      evidence: normalEvidence,
      meaning: command.meaning,
      possibleCauses: ["No visible issue in this output"],
      doNotTouch: "Do not make configuration changes if the reported issue may be outside this command's scope."
    };
  }

  return {
    status: "Info",
    diagnosis: "The command was recognized, but no strong issue pattern was found.",
    evidence: getFirstLines(text),
    meaning: command.meaning,
    possibleCauses: ["The pasted output may be incomplete or the symptom may require a related command."],
    doNotTouch: "Do not make changes until additional read-only evidence is collected."
  };
}

function extractEntities(text, vendorKey) {
  const interfaces = uniqueMatches(text, [
    "\\b(?:Gi|Fa|Te|Twe|Hu|Eth|Po)\\d+(?:\\/\\d+){1,3}(?:\\.\\d+)?\\b",
    "\\b(?:GigabitEthernet|FastEthernet|TenGigabitEthernet|Ethernet|Port-channel)\\d+(?:\\/\\d+){0,3}(?:\\.\\d+)?\\b",
    "\\b(?:Ten-GigabitEthernet|GigabitEthernet|Bridge-Aggregation)\\d+(?:\\/\\d+){1,3}\\b",
    "\\b(?:eth\\d+|ens\\d+|eno\\d+|enp[a-z0-9]+|wlan\\d+|bond\\d+|br\\d+)\\b",
    vendorKey === "aruba_cx" ? "\\b\\d+\\/\\d+\\/\\d+\\b" : null
  ]);

  if (vendorKey === "aruba_cx" && !interfaces.length) {
    interfaces.push(...uniqueMatches(text, ["^\\s*(\\d+\\/\\d+\\/\\d+)\\s+"]));
  }

  const ipAddresses = uniqueMatches(text, [
    "\\b(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)){3}\\b"
  ]).filter((ip) => !["0.0.0.0", "255.255.255.255"].includes(ip));

  const gateway = firstCapture(text, [
    "Default Gateway[ .]*:\\s*(\\d+\\.\\d+\\.\\d+\\.\\d+)",
    "default\\s+via\\s+(\\d+\\.\\d+\\.\\d+\\.\\d+)",
    "0\\.0\\.0\\.0\\s+0\\.0\\.0\\.0\\s+(\\d+\\.\\d+\\.\\d+\\.\\d+)"
  ]);

  const vlans = uniqueMatches(text, [
    "\\bVLAN(?:\\s+ID)?[^0-9]{0,12}(\\d{1,4})\\b",
    "\\b(?:connected|notconnect|disabled|err-disabled|up|down)\\s+(\\d{1,4})\\b",
    "\\bvlan\\s+(\\d{1,4})\\b"
  ]).filter((vlan) => Number(vlan) >= 1 && Number(vlan) <= 4094);

  const macs = uniqueMatches(text, [
    "\\b[0-9a-f]{4}\\.[0-9a-f]{4}\\.[0-9a-f]{4}\\b",
    "\\b[0-9a-f]{2}(?::[0-9a-f]{2}){5}\\b",
    "\\b[0-9a-f]{2}(?:-[0-9a-f]{2}){5}\\b"
  ]);

  const hostname = firstCapture(text, [
    "Pinging\\s+([^\\s\\[]+)",
    "traceroute\\s+to\\s+([^\\s\\(]+)",
    "Tracing route to\\s+([^\\s\\[]+)",
    ";\\s*<<>>\\s*DiG\\s+[^\\s]+\\s+([^\\s]+)"
  ]);

  return {
    interface: interfaces[0] || "",
    interfaces,
    vlan: vlans[0] || "",
    vlans,
    ip: ipAddresses[0] || "",
    ips: ipAddresses,
    gateway: gateway || "",
    mac: macs[0] || "",
    macs,
    hostname: hostname || ""
  };
}

function refineEntitiesFromEvidence(entities, evidence, vendorKey) {
  if (!evidence?.length) {
    return entities;
  }

  const evidenceEntities = extractEntities(evidence.join("\n"), vendorKey);
  return {
    ...entities,
    interface: evidenceEntities.interface || entities.interface,
    interfaces: mergeUnique(evidenceEntities.interfaces, entities.interfaces),
    vlan: evidenceEntities.vlan || entities.vlan,
    vlans: mergeUnique(evidenceEntities.vlans, entities.vlans),
    ip: evidenceEntities.ip || entities.ip,
    ips: mergeUnique(evidenceEntities.ips, entities.ips),
    gateway: evidenceEntities.gateway || entities.gateway,
    mac: evidenceEntities.mac || entities.mac,
    macs: mergeUnique(evidenceEntities.macs, entities.macs),
    hostname: evidenceEntities.hostname || entities.hostname
  };
}

function mergeUnique(primary = [], secondary = []) {
  return Array.from(new Set([...primary, ...secondary].filter(Boolean)));
}

function prepareNextCommands(commands, entities) {
  return commands.map((item) => {
    const rendered = replacePlaceholders(item.command, entities);
    return {
      ...item,
      renderedCommand: rendered.command,
      missingPlaceholders: rendered.missing
    };
  });
}

function replacePlaceholders(command, entities) {
  const replacements = {
    interface: entities.interface,
    vlan: entities.vlan,
    ip: entities.gateway || entities.ip,
    gateway: entities.gateway,
    mac: entities.mac,
    hostname: entities.hostname
  };

  const missing = [];
  let rendered = command;
  rendered = rendered.replace(/<([^>]+)>/g, (match, rawKey) => {
    const key = rawKey.trim().toLowerCase();
    if (replacements[key]) {
      return replacements[key];
    }
    missing.push(key);
    return match;
  });

  return {
    command: rendered,
    missing: Array.from(new Set(missing))
  };
}

function detectDangerous(text) {
  return (state.safety.commands || [])
    .map((entry) => {
      const evidence = getMatchingLines(text, entry.patterns || []);
      return evidence.length ? { ...entry, evidence } : null;
    })
    .filter(Boolean);
}

function patternExists(text, pattern) {
  const regex = toRegex(pattern, "im");
  if (!regex) {
    return false;
  }
  return regex.test(text);
}

function getMatchingLines(text, patterns) {
  const lines = text.split(/\r?\n/);
  const matched = [];
  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }
    for (const pattern of patterns) {
      if (lineMatchesPattern(line, pattern)) {
        matched.push(line.trim());
        break;
      }
    }
  }
  return Array.from(new Set(matched)).slice(0, 8);
}

function lineMatchesPattern(line, pattern) {
  const patternText = String(pattern).toLowerCase();
  if (patternText.includes("crc") && !patternText.includes("0 crc")) {
    const hasZeroCrc = /(?:^|\D)0\s+CRC\b/i.test(line);
    const hasNonZeroCrc = /(?:^|\D)[1-9]\d*\s+CRC\b/i.test(line);
    if (hasZeroCrc && !hasNonZeroCrc) {
      return false;
    }
  }
  if (patternText.includes("input errors") && !patternText.includes("0 input")) {
    const hasZeroInputErrors = /(?:^|\D)0\s+input errors\b/i.test(line);
    const hasNonZeroInputErrors = /(?:^|\D)[1-9]\d*\s+input errors\b/i.test(line);
    if (hasZeroInputErrors && !hasNonZeroInputErrors) {
      return false;
    }
  }
  const regex = toRegex(pattern, "i");
  return regex ? regex.test(line) : false;
}

function toRegex(pattern, flags) {
  try {
    return new RegExp(pattern, flags);
  } catch (error) {
    try {
      return new RegExp(escapeRegex(pattern), flags);
    } catch (_fallbackError) {
      return null;
    }
  }
}

function uniqueMatches(text, patterns) {
  const found = [];
  for (const pattern of patterns.filter(Boolean)) {
    const regex = toRegex(pattern, "gim");
    if (!regex) {
      continue;
    }
    let match;
    while ((match = regex.exec(text)) !== null) {
      found.push(match[1] || match[0]);
      if (match[0] === "") {
        regex.lastIndex += 1;
      }
    }
  }
  return Array.from(new Set(found.map((value) => value.trim()).filter(Boolean)));
}

function firstCapture(text, patterns) {
  for (const pattern of patterns) {
    const regex = toRegex(pattern, "im");
    const match = regex?.exec(text);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return "";
}

function getFirstLines(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function getMeaningfulLines(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function suggestCommands(text, vendorKey) {
  const normalizedText = normalizeCommandText(text);
  const candidates = vendorKey && vendorKey !== "unknown"
    ? state.commands.filter((command) => command.vendor_key === vendorKey)
    : state.commands;

  return candidates
    .map((command) => {
      const labels = [command.command, ...getCommandAliases(command)];
      const score = Math.max(...labels.map((label) => similarityScore(normalizedText, normalizeCommandText(label))));
      return {
        command: command.command,
        vendor: command.vendor_label,
        score
      };
    })
    .filter((item) => item.score >= 0.25)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

function normalizeCommandText(value) {
  return String(value)
    .toLowerCase()
    .replace(/^\S+[>#]\s*/, "")
    .replace(/[^a-z0-9/ <>-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function similarityScore(a, b) {
  if (!a || !b) {
    return 0;
  }
  if (a === b) {
    return 1;
  }
  if (a.includes(b) || b.includes(a)) {
    return Math.min(a.length, b.length) / Math.max(a.length, b.length);
  }
  const aTokens = new Set(a.split(" "));
  const bTokens = new Set(b.split(" "));
  const intersection = [...aTokens].filter((token) => bTokens.has(token)).length;
  const union = new Set([...aTokens, ...bTokens]).size;
  return union ? intersection / union : 0;
}

function getSourceNote(command) {
  return command?.source_note || state.sources?.source_note || "Local command knowledge base.";
}

function findFlow(category) {
  if (!category) {
    return null;
  }
  const mappedCategory = FLOW_CATEGORY_MAP[category] || category;
  const flow = state.flows.find((item) => item.category === mappedCategory);
  if (!flow) {
    return null;
  }
  return {
    title: flow.title,
    steps: flow.steps || [],
    doNotTouch: flow.do_not_touch || ""
  };
}

function buildTicketSummary(report) {
  if (report.mode === "Explanation Mode") {
    return "Command recognized, but no output was provided for diagnosis.";
  }
  if (report.command === "Unknown command") {
    return "Unknown command. No diagnosis was made. Paste full command output or choose the vendor manually.";
  }
  const commandPart = report.command && report.command !== "Unknown command"
    ? `${report.vendor} ${report.command}`
    : `${report.vendor} command`;
  const evidence = report.evidence?.[0] ? ` Evidence: ${report.evidence[0]}.` : "";
  const next = report.nextCommands?.[0]?.renderedCommand
    ? ` Recommended next check: ${report.nextCommands[0].renderedCommand}.`
    : "";
  return `Reviewed pasted ${commandPart} output. Status: ${report.status}. ${report.diagnosis}${evidence}${next}`;
}

function renderReport(report) {
  els.resultsGrid.replaceChildren();
  els.resultsToolbar.hidden = false;

  const primaryTextTitle = report.mode === "Explanation Mode" ? "Command Meaning" : "Diagnosis";
  const primaryText = report.mode === "Explanation Mode" ? report.meaning : report.diagnosis;
  const cards = [
    createStatusCard(report),
    createModeCard(report),
    createTextCard(primaryTextTitle, primaryText),
    createEvidenceCard(report.evidence),
    createNextCommandsCard(report.nextCommands),
    createTextCard("Ticket Summary", report.ticketSummary),
    createSuggestionsCard(report.commandSuggestions),
    createListCard("Used For", report.useFor),
    report.mode === "Diagnosis Mode" ? createTextCard("Meaning", report.meaning) : null,
    createListCard("Possible Causes", report.possibleCauses),
    createListCard("Good Output", report.goodOutput),
    createListCard("Bad Output", report.badOutput),
    createFlowCard(report.troubleshootingFlow),
    createSafetyCard(report),
    createTextCard("Learning Note", report.learningNote),
    createTextCard("Source Note", report.sourceNote)
  ].filter(Boolean);

  els.resultsGrid.append(...cards);
}

function createStatusCard(report) {
  const card = createCard("Detection");
  const pill = document.createElement("span");
  pill.className = `status-pill status-${report.status}`;
  pill.textContent = `Status: ${report.status}`;
  card.append(pill);

  const meta = document.createElement("div");
  meta.className = "meta-row";
  [
    `Vendor: ${report.vendor}`,
    `Vendor confidence: ${report.vendorConfidence}`,
    `Command: ${report.command}`,
    `Risk: ${report.safetyLevel || "Not classified"}`,
    `Command confidence: ${report.commandConfidence || "Low"}`,
    `Confidence: ${report.confidence || "Low"}`
  ].forEach((item) => meta.append(createChip(item)));

  if (report.entities.interface) {
    meta.append(createChip(`Interface: ${report.entities.interface}`));
  }
  if (report.entities.vlan) {
    meta.append(createChip(`VLAN: ${report.entities.vlan}`));
  }
  if (report.entities.gateway) {
    meta.append(createChip(`Gateway: ${report.entities.gateway}`));
  }

  card.append(meta);
  const reason = document.createElement("p");
  reason.className = "muted";
  reason.textContent = report.confidenceReason || "Confidence reason was not available.";
  card.append(reason);
  return card;
}

function createModeCard(report) {
  const card = createCard("Mode");
  const p = document.createElement("p");
  p.className = "muted";
  p.textContent = report.mode === "Explanation Mode"
    ? "Explanation Mode. Command recognized, but no command output was pasted."
    : report.mode === "Diagnosis Mode"
      ? "Diagnosis Mode: command output evidence was found and evaluated against local rules."
      : "Unknown Mode: Command Doctor could not confidently classify this paste.";
  card.append(p);
  return card;
}

function createTextCard(title, text) {
  const card = createCard(title);
  const p = document.createElement("p");
  p.className = "muted";
  p.textContent = text || "-";
  card.append(p);
  return card;
}

function createListCard(title, items) {
  const card = createCard(title);
  const list = document.createElement("ul");
  list.className = "list";
  (items?.length ? items : ["-"]).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    list.append(li);
  });
  card.append(list);
  return card;
}

function createEvidenceCard(evidence) {
  const card = createCard("Evidence");
  if (!evidence?.length) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "No command output evidence was pasted or matched.";
    card.append(p);
    return card;
  }

  evidence.forEach((line) => {
    const code = document.createElement("code");
    code.className = "evidence-line";
    code.textContent = line;
    card.append(code);
  });
  return card;
}

function createSuggestionsCard(suggestions) {
  if (!suggestions?.length) {
    return null;
  }
  const card = createCard("Possible Command Match", "wide");
  const p = document.createElement("p");
  p.className = "muted";
  p.textContent = "Command Doctor did not force a diagnosis. These local commands look closest:";
  card.append(p);

  const list = document.createElement("ul");
  list.className = "list";
  suggestions.forEach((suggestion) => {
    const li = document.createElement("li");
    li.textContent = `${suggestion.command} (${suggestion.vendor})`;
    list.append(li);
  });
  card.append(list);
  return card;
}

function createFlowCard(flow) {
  const card = createCard("Troubleshooting Flow", "wide");
  if (!flow) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "No local flow is mapped to this command category yet.";
    card.append(p);
    return card;
  }

  const title = document.createElement("p");
  title.className = "muted";
  title.textContent = flow.title;
  card.append(title);

  const list = document.createElement("ol");
  list.className = "list";
  flow.steps.forEach((step) => {
    const li = document.createElement("li");
    li.textContent = step;
    list.append(li);
  });
  card.append(list);

  if (flow.doNotTouch) {
    const warning = document.createElement("p");
    warning.className = "muted";
    warning.textContent = flow.doNotTouch;
    card.append(warning);
  }
  return card;
}

function createNextCommandsCard(commands) {
  const card = createCard("Recommended Next Commands", "wide");

  if (!commands?.length) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "No command recommendation is available for this match.";
    card.append(p);
    return card;
  }

  const set = document.createElement("div");
  set.className = "command-set";

  commands.forEach((command, index) => {
    const item = document.createElement("article");
    item.className = "command-item";

    const head = document.createElement("div");
    head.className = "command-head";
    const commandLine = document.createElement("code");
    commandLine.className = "command-line";
    commandLine.textContent = `${index + 1}. ${command.renderedCommand}`;
    const copy = document.createElement("button");
    copy.className = "copy-btn";
    copy.type = "button";
    copy.textContent = "Copy";
    copy.addEventListener("click", () => copyText(command.renderedCommand, "Command copied."));
    head.append(commandLine, copy);

    const body = document.createElement("div");
    body.className = "command-body";
    body.append(
      createCommandField("Why", command.why),
      createCommandField("Meaning", command.meaning),
      createCommandField("Good Output", command.look_for_good),
      createCommandField("Bad Output", command.look_for_bad),
      createCommandField("Risk", command.risk),
      createCommandField(
        "Placeholder",
        command.missingPlaceholders?.length
          ? `Replace ${command.missingPlaceholders.map((value) => `<${value}>`).join(", ")} manually.`
          : "Filled from pasted output when possible."
      )
    );

    item.append(head, body);
    set.append(item);
  });

  card.append(set);
  return card;
}

function createCommandField(title, value) {
  const section = document.createElement("section");
  const label = document.createElement("span");
  label.className = "field-title";
  label.textContent = title;
  section.append(label);

  if (Array.isArray(value)) {
    const list = document.createElement("ul");
    list.className = "list";
    value.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      list.append(li);
    });
    section.append(list);
  } else {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = value || "-";
    section.append(p);
  }

  return section;
}

function createSafetyCard(report) {
  const card = createCard("Do Not Touch", "wide");
  const p = document.createElement("p");
  p.className = "muted";
  p.textContent = report.doNotTouch;
  card.append(p);

  if (report.dangerWarnings?.length) {
    const warningTitle = document.createElement("span");
    warningTitle.className = "field-title";
    warningTitle.textContent = "Safety Warning";
    card.append(warningTitle);

    const list = document.createElement("ul");
    list.className = "list";
    report.dangerWarnings.forEach((warning) => {
      const li = document.createElement("li");
      li.textContent = `${warning.command}: ${warning.reason} ${state.safety.warning_message}`;
      list.append(li);
    });
    card.append(list);
  }

  return card;
}

function createCard(title, extraClass = "") {
  const card = document.createElement("article");
  card.className = `result-card ${extraClass}`.trim();
  const heading = document.createElement("h3");
  heading.textContent = title;
  card.append(heading);
  return card;
}

function createChip(text) {
  const chip = document.createElement("span");
  chip.className = "meta-chip";
  chip.textContent = text;
  return chip;
}

function updateMetrics(report) {
  els.detectedVendor.textContent = `${report.vendor} (${report.vendorConfidence})`;
  els.detectedCommand.textContent = report.command;
  els.detectedStatus.textContent = report.status;
}

function renderKnowledge() {
  if (!state.commandFiles.length) {
    renderKnowledgeError();
    return;
  }

  els.knowledgeGrid.replaceChildren();

  state.commandFiles.forEach((file) => {
    const card = document.createElement("article");
    card.className = "knowledge-card";
    const title = document.createElement("h3");
    title.textContent = file.vendor;
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = `${file.commandCount} local command entries`;
    const meta = document.createElement("div");
    meta.className = "meta-row";
    meta.append(createChip(file.version), createChip(file.path));
    card.append(title, p, meta);
    els.knowledgeGrid.append(card);
  });

  state.flows.forEach((flow) => {
    const card = document.createElement("article");
    card.className = "knowledge-card";
    const title = document.createElement("h3");
    title.textContent = flow.title;
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = flow.do_not_touch;
    const meta = document.createElement("div");
    meta.className = "meta-row";
    meta.append(createChip(flow.category), createChip(`${flow.steps?.length || 0} steps`));
    card.append(title, p, meta);
    els.knowledgeGrid.append(card);
  });
}

function renderKnowledgeError() {
  els.knowledgeGrid.replaceChildren();
  const card = document.createElement("article");
  card.className = "knowledge-card";
  const title = document.createElement("h3");
  title.textContent = "Knowledge unavailable";
  const p = document.createElement("p");
  p.className = "muted";
  p.textContent = "Local JSON files were not loaded. Serve this folder locally so the browser can read data files.";
  card.append(title, p);
  els.knowledgeGrid.append(card);
}

function loadHistory() {
  try {
    state.history = JSON.parse(localStorage.getItem("commandDoctorHistory") || "[]");
  } catch (_error) {
    state.history = [];
  }
}

function saveHistory(report) {
  state.history = [
    report,
    ...state.history.filter((item) => item.id !== report.id)
  ].slice(0, 40);
  localStorage.setItem("commandDoctorHistory", JSON.stringify(state.history));
}

function renderHistory() {
  els.historyList.replaceChildren();

  if (!state.history.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    const title = document.createElement("h3");
    title.textContent = "No history yet";
    const p = document.createElement("p");
    p.textContent = "Saved analyses will appear here.";
    empty.append(title, p);
    els.historyList.append(empty);
    return;
  }

  state.history.forEach((report) => {
    const item = document.createElement("article");
    item.className = "history-item";

    const top = document.createElement("div");
    top.className = "history-top";
    const headingWrap = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = report.diagnosis;
    const meta = document.createElement("div");
    meta.className = "meta-row";
    meta.append(
      createChip(report.status),
      createChip(report.vendor),
      createChip(report.command),
      createChip(formatDate(report.timestamp))
    );
    headingWrap.append(title, meta);

    const actions = document.createElement("div");
    actions.className = "history-actions";
    const load = document.createElement("button");
    load.className = "secondary";
    load.type = "button";
    load.textContent = "Load";
    load.addEventListener("click", () => loadHistoryItem(report));
    const copy = document.createElement("button");
    copy.className = "secondary";
    copy.type = "button";
    copy.textContent = "Copy Ticket";
    copy.addEventListener("click", () => copyText(report.ticketSummary, "Ticket copied."));
    actions.append(load, copy);

    top.append(headingWrap, actions);
    item.append(top);
    els.historyList.append(item);
  });
}

function loadHistoryItem(report) {
  state.currentReport = report;
  els.cliOutput.value = report.pastedOutput;
  els.vendorSelect.value = report.vendor_key || "auto";
  renderReport(report);
  updateMetrics(report);
  switchView("diagnose");
}

function clearHistory() {
  state.history = [];
  localStorage.removeItem("commandDoctorHistory");
  renderHistory();
  showToast("History cleared.");
}

function copyCurrent(type) {
  if (!state.currentReport) {
    showToast("No report to copy.");
    return;
  }

  if (type === "commands") {
    const commands = state.currentReport.nextCommands
      .map((command) => command.renderedCommand)
      .join("\n");
    copyText(commands || "No commands available.", "Commands copied.");
    return;
  }

  if (type === "ticket") {
    copyText(state.currentReport.ticketSummary, "Ticket copied.");
    return;
  }

  copyText(formatFullReport(state.currentReport), "Report copied.");
}

async function copyText(text, message) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      fallbackCopy(text);
    }
    showToast(message);
  } catch (_error) {
    fallbackCopy(text);
    showToast(message);
  }
}

function fallbackCopy(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function formatFullReport(report) {
  const nextCommands = report.nextCommands.length
    ? report.nextCommands.map(formatNextCommandForReport).join("\n\n")
    : "No next commands available.";

  return [
    `Status: ${report.status}`,
    `Mode: ${report.mode || "Unknown"}`,
    `Confidence: ${report.confidence || "Low"}`,
    `Confidence Reason: ${report.confidenceReason || "-"}`,
    `Vendor: ${report.vendor}`,
    `Command: ${report.command}`,
    `Diagnosis: ${report.diagnosis}`,
    `Possible Command Matches:\n${formatSuggestionsForReport(report.commandSuggestions)}`,
    `Evidence:\n${report.evidence.map((line) => `- ${line}`).join("\n")}`,
    `Meaning: ${report.meaning}`,
    `Used For:\n${formatReportList(report.useFor)}`,
    `Possible Causes:\n${report.possibleCauses.map((item) => `- ${item}`).join("\n")}`,
    `Good Output:\n${formatReportList(report.goodOutput)}`,
    `Bad Output:\n${formatReportList(report.badOutput)}`,
    `Troubleshooting Flow:\n${formatFlowForReport(report.troubleshootingFlow)}`,
    `Recommended Next Commands:\n${nextCommands}`,
    `Do Not Touch: ${report.doNotTouch}`,
    `Ticket Summary: ${report.ticketSummary}`,
    `Learning Note: ${report.learningNote}`,
    `Source Note: ${report.sourceNote}`
  ].join("\n\n");
}

function formatReportList(items) {
  return (items?.length ? items : ["-"]).map((item) => `- ${item}`).join("\n");
}

function formatNextCommandForReport(command, index) {
  const placeholder = command.missingPlaceholders?.length
    ? `Replace ${command.missingPlaceholders.map((value) => `<${value}>`).join(", ")} manually.`
    : "Filled from pasted output when possible.";
  return [
    `${index + 1}. ${command.renderedCommand}`,
    `Why: ${command.why || "-"}`,
    `Meaning: ${command.meaning || "-"}`,
    `Good Output:\n${formatReportList(command.look_for_good)}`,
    `Bad Output:\n${formatReportList(command.look_for_bad)}`,
    `Risk: ${command.risk || "-"}`,
    `Placeholder: ${placeholder}`
  ].join("\n");
}

function formatFlowForReport(flow) {
  if (!flow) {
    return "-";
  }
  const steps = flow.steps.length
    ? flow.steps.map((step, index) => `${index + 1}. ${step}`).join("\n")
    : "-";
  return `${flow.title}\n${steps}${flow.doNotTouch ? `\nDo Not Touch: ${flow.doNotTouch}` : ""}`;
}

function formatSuggestionsForReport(suggestions) {
  return suggestions?.length
    ? suggestions.map((suggestion) => `- ${suggestion.command} (${suggestion.vendor})`).join("\n")
    : "-";
}

function defaultLabProgress() {
  return {
    completedLessons: {},
    lessonScores: {},
    sectionTests: {},
    foundationFinalScore: null,
    configurationCompleted: false,
    scenarioScores: {},
    simulatorMissions: {},
    lastLessonId: ""
  };
}

function migrateLabProgress() {
  if (Number(state.lab.progress.foundationFinalScore) < 80) return;
  labFoundationLessons().forEach((lesson) => {
    state.lab.progress.completedLessons[lesson.id] = true;
    state.lab.progress.lessonScores[lesson.id] ||= 100;
  });
  saveLabProgress();
}

function loadLabProgress() {
  try {
    return { ...defaultLabProgress(), ...(JSON.parse(localStorage.getItem(LAB_PROGRESS_KEY) || "{}")) };
  } catch {
    return defaultLabProgress();
  }
}

function saveLabProgress() {
  localStorage.setItem(LAB_PROGRESS_KEY, JSON.stringify(state.lab.progress));
}

function emptyVendorProgress() {
  return { completedLessons: {}, learnedCommands: {}, practisedRoutes: {}, reviewRoutes: {}, mastery: {}, reviewRecords: {}, lastLessonId: "", lastLabRouteId: "" };
}

function loadVendorProgress() {
  try {
    const stored = JSON.parse(localStorage.getItem(VENDOR_PROGRESS_KEY) || "{}");
    return stored && typeof stored === "object" ? stored : {};
  } catch {
    return {};
  }
}

function activeTrack() {
  return state.lab.vendorTrack || "all";
}

function trackProgress(track = activeTrack()) {
  const key = track || "all";
  state.lab.vendorProgress ||= {};
  state.lab.vendorProgress[key] ||= emptyVendorProgress();
  return state.lab.vendorProgress[key];
}

function saveVendorProgress() {
  localStorage.setItem(VENDOR_PROGRESS_KEY, JSON.stringify(state.lab.vendorProgress || {}));
}

function recordTrackActivity(track, patch) {
  const progress = trackProgress(track);
  Object.assign(progress, patch);
  saveVendorProgress();
}

function beginnerExperience() {
  return window.CommandDoctorBeginnerExperience;
}

function missionStudioComponents() {
  return window.CommandDoctorMissionStudioComponents;
}

function renderMissionStudio(description) {
  const api = missionStudioComponents();
  return api?.renderDescription ? api.renderDescription(document, description) : null;
}

function loadLearningState() {
  const api = beginnerExperience();
  const lessons = api.createLevel0Lessons();
  state.learning.path = localStorage.getItem(api.STORAGE_KEYS.path) || "";
  state.learning.recentTool = localStorage.getItem(api.STORAGE_KEYS.recentTool) || "diagnose";
  state.learning.level0Progress = api.restoreLevel0State(api.safeParse(localStorage.getItem(api.STORAGE_KEYS.level0), api.createLevel0State(lessons)), lessons);
}

function saveLearningPath(path) {
  const api = beginnerExperience();
  state.learning.path = path;
  localStorage.setItem(api.STORAGE_KEYS.path, path);
}

function saveLevel0Progress() {
  const api = beginnerExperience();
  state.learning.level0Progress.resume_timestamp = new Date().toISOString();
  localStorage.setItem(api.STORAGE_KEYS.level0, JSON.stringify(state.learning.level0Progress));
}

function levelById(levelId) {
  return state.curriculum.complete?.levels?.find((level) => level.level_id === levelId) || null;
}

function level0Lessons() {
  return beginnerExperience().createLevel0Lessons();
}

function level0CurrentLesson() {
  const lessons = level0Lessons();
  return lessons.find((lesson) => lesson.lesson_id === state.learning.level0Progress?.current_lesson_id) || lessons[0] || null;
}

function currentLevel0StepIndex() {
  const api = beginnerExperience();
  return Math.max(0, api.STEP_IDS.indexOf(state.learning.level0Progress?.current_step_id || "mission"));
}

function renderBeginnerNavigation() {
  const navigation = beginnerExperience().BEGINNER_NAVIGATION;
  const studioNavigation = window.CommandDoctorMissionStudioComponents?.navItems || [];
  els.navTabs.forEach((tab, index) => {
    const item = navigation[index];
    if (!item) {
      tab.hidden = true;
      return;
    }
    const studioItem = studioNavigation.find((candidate) => candidate.view === item.view);
    tab.hidden = false;
    tab.dataset.view = item.view;
    tab.dataset.navIcon = studioItem?.icon || item.view;
    tab.textContent = item.label;
    tab.classList.toggle("active", item.view === "home");
    tab.setAttribute("aria-label", item.label);
  });
}

function labFoundationLessons() {
  return state.lab.lessons.filter((lesson) => !isConfigurationLesson(lesson));
}

function isConfigurationLesson(lesson) {
  return state.lab.sections.find((section) => section.id === lesson.section_id)?.stage === "configuration";
}

function labConfigurationUnlocked() {
  return Number(state.lab.progress.foundationFinalScore) >= 80;
}

function labFoundationComplete() {
  const lessons = labFoundationLessons();
  return lessons.length > 0 && lessons.every((lesson) => state.lab.progress.completedLessons[lesson.id]);
}

function labStageUnlocked(stageId) {
  if (stageId === "foundation") return true;
  if (stageId === "configuration") return labConfigurationUnlocked();
  if (stageId === "playground") return labPlaygroundUnlocked();
  return false;
}

const PLAYGROUND_REQUIRED_SECTIONS = ["interface", "vlan", "mac", "safety"];

function labSectionLessons(sectionId) {
  const section = state.lab.sections.find((item) => item.id === sectionId);
  return (section?.lesson_ids || []).map((id) => state.lab.lessons.find((item) => item.id === id)).filter(Boolean);
}

function labSectionComplete(sectionId) {
  const lessons = labSectionLessons(sectionId);
  return lessons.length > 0 && lessons.every((lesson) => state.lab.progress.completedLessons[lesson.id]);
}

function labPlaygroundUnlocked() {
  return PLAYGROUND_REQUIRED_SECTIONS.every(labSectionComplete);
}

function labProgressPercent(lessons) {
  if (!lessons.length) return 0;
  const complete = lessons.filter((lesson) => state.lab.progress.completedLessons[lesson.id]).length;
  return Math.round((complete / lessons.length) * 100);
}

function labCreate(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function labButton(label, className, action) {
  const button = labCreate("button", className || "secondary", label);
  button.type = "button";
  button.addEventListener("click", action);
  return button;
}

function renderLab() {
  if (!els.labRoot || !state.lab.progress) return;
  els.labRoot.replaceChildren();
  if (state.lab.screen === "lesson") {
    renderLabLesson();
    return;
  }
  if (state.lab.screen === "final-quiz") {
    renderLabFinalQuiz();
    return;
  }
  if (state.lab.screen === "scenario") {
    renderLabScenario();
    return;
  }
  if (state.lab.screen === "cli") {
    renderLabCliWorkspace();
    return;
  }
  if (state.lab.screen === "guided-cli") {
    renderGuidedCliLab();
    return;
  }
  if (state.lab.screen === "visual") {
    renderVisualLab();
    return;
  }
  if (state.lab.screen === "profiles") {
    renderSwitchProfileSelection();
    return;
  }
  if (state.lab.screen === "workbench") {
    renderSwitchWorkbench();
    return;
  }
  if (state.lab.screen === "stage") {
    renderLabStagePage();
    return;
  }
  if (state.lab.screen === "section") {
    renderLabSectionPage();
    return;
  }
  if (state.lab.screen === "playground") {
    renderLabPlayground();
    return;
  }
  if (state.lab.screen === "lessons") {
    renderLabLessonLibrary();
    return;
  }
  renderLabDashboard();
}

function renderLabDashboard() {
  const intro = labCreate("section", "lab-workspace-intro");
  intro.append(labCreate("div", "lab-card-kicker", "100% simulated practice"));
  intro.append(labCreate("h3", "", "Choose a Switch Lab workspace"));
  intro.append(labCreate("p", "", "Use one focused workspace at a time. Commands, topology changes, and training evidence stay only in this browser."));
  els.labRoot.append(intro);

  const workspaces = [
    { title: "Switch Workbench", description: "Choose a simulated profile, work from a shared switch state, inspect ports, preview changes, and verify before saving.", command: "Profile, Inspector, pending changes", action: () => { state.lab.screen = "profiles"; renderLab(); } },
    { title: "Guided CLI", description: "Follow a route with a large continuous switch terminal and concise coaching.", command: "Start with a guided scenario", action: () => { state.lab.screen = "guided-cli"; renderLab(); } },
    { title: "Focused Terminal", description: "Open a near full-screen terminal for uninterrupted manual command practice.", command: "Continuous terminal session", action: () => { state.lab.screen = "cli"; renderLab(); } },
    { title: "Visual Playground", description: "Build a small local topology, connect endpoints, inspect ports, and practise diagnostics.", command: "Drag devices and create cables", action: () => { state.lab.screen = "visual"; renderLab(); } }
  ];
  const grid = labCreate("div", "lab-workspace-grid");
  workspaces.forEach((workspace) => {
    const card = labCreate("article", "lab-workspace-card");
    card.append(labCreate("div", "lab-card-kicker", "Switch Lab"));
    card.append(labCreate("h3", "", workspace.title));
    card.append(labCreate("p", "", workspace.description));
    card.append(labCreate("code", "lab-command", workspace.command));
    card.append(labButton(`Open ${workspace.title}`, "primary", workspace.action));
    grid.append(card);
  });
  els.labRoot.append(grid);
}

function renderGuidedCliLab() {
  els.labRoot.append(labButton("Back to Switch Lab", "secondary lab-back-button", () => { state.lab.screen = "dashboard"; renderLab(); }));
  renderLabConsole();
}

function renderVisualLab() {
  els.labRoot.append(labButton("Back to Switch Lab", "secondary lab-back-button", () => { state.lab.screen = "dashboard"; renderLab(); }));
  renderVisualNetworkPlayground();
}

function renderSwitchProfileSelection() {
  const selected = activeSwitchProfile();
  const panel = labCreate("section", "lab-workspace-intro switch-profile-selection");
  panel.append(labButton("Back to Switch Lab", "secondary lab-back-button", () => { state.lab.screen = "dashboard"; renderLab(); }));
  panel.append(labCreate("div", "lab-card-kicker", "Simulated training profile"), labCreate("h3", "", "Choose a switch profile"), labCreate("p", "", "Profiles set the vendor prompt, interface format, local command catalog, software version, and capabilities. They are training approximations, not hardware emulators."));
  const select = document.createElement("select");
  select.setAttribute("aria-label", "Switch profile");
  state.lab.switchProfiles.forEach((profile) => { const option = document.createElement("option"); option.value = profile.profile_id; option.textContent = `${profile.vendor_label} | ${profile.model} | ${profile.default_version}`; option.selected = profile.profile_id === selected?.profile_id; select.append(option); });
  const renderSummary = () => {
    const profile = state.lab.switchProfiles.find((item) => item.profile_id === select.value) || selected;
    const registry = window.CommandDoctorSwitchRuntime ? new window.CommandDoctorSwitchRuntime.CommandRegistry(state.curriculum.inventory, profile) : null;
    const counts = registry?.summary() || {};
    const facts = labCreate("div", "learn-summary");
    [["Vendor", profile.vendor_label], ["Model", profile.model], ["OS", profile.operating_system], ["Version", profile.default_version], ["Interfaces", `${profile.access_port_count} + ${profile.uplink_port_count} uplinks`], ["Stack", profile.stack_technology], ["Catalog", counts.canonical || 0], ["Aliases", counts.aliases || 0], ["Full", counts.fully_simulated || 0], ["Simplified", counts.simplified_simulated || 0], ["Output only", counts.output_only || 0], ["Explanation", counts.explanation_only || 0]].forEach(([label, value]) => facts.append(labCreate("span", "badge", `${label}: ${value}`)));
    return facts;
  };
  const summary = renderSummary();
  select.addEventListener("change", () => {
    state.lab.activeSwitchProfileId = select.value;
    renderLab();
  });
  panel.append(labCreate("label", "lab-setup-field", "Profile"), select, summary);
  panel.append(labButton("Open Switch Workbench", "primary", () => { selectSwitchProfile(select.value); state.lab.screen = "workbench"; renderLab(); }));
  els.labRoot.append(panel);
}

function workbenchPort(runtimeState, network) {
  const selected = runtimeState.selectedInterface?.() || network.selectedPort;
  return runtimeState.interface(selected) || runtimeState.interface(Object.keys(runtimeState.running.interfaces)[0]);
}

function workbenchPreview(profile, port, values) {
  const name = port.name;
  if (profile.vendor === "hp_comware") return `system-view\ninterface ${name}\ndescription ${values.description}\nreturn`;
  if (profile.vendor === "aruba_cx") return `configure terminal\ninterface ${name}\ndescription ${values.description}\nend`;
  return `configure terminal\ninterface ${name}\ndescription ${values.description}\nend`;
}

function runtimeInterfaceConfiguration(runtimeState, name, source = "running", profile = activeSwitchProfile()) {
  const snapshot = source === "startup" ? runtimeState.startup : runtimeState.running;
  const port = snapshot.interfaces?.[name];
  if (!port) return `! Interface ${name} is not present in this local profile.`;
  if (profile?.vendor === "hp_comware") return `interface ${name}\n${port.description ? ` description ${port.description}\n` : ""} port link-type ${port.mode || "access"}\n${port.mode === "trunk" ? ` port trunk permit vlan ${port.allowed_vlans || "all"}` : ` port access vlan ${port.vlan || 1}`}\n ${port.admin_up ? "undo shutdown" : "shutdown"}`;
  if (profile?.vendor === "aruba_cx") return `interface ${name}\n${port.description ? ` description ${port.description}\n` : ""} ${port.mode === "trunk" ? `vlan trunk allowed ${port.allowed_vlans || "all"}` : `vlan access ${port.vlan || 1}`}\n ${port.admin_up ? "no shutdown" : "shutdown"}`;
  return `interface ${name}\n${port.description ? ` description ${port.description}\n` : ""} switchport mode ${port.mode || "access"}\n${port.mode === "trunk" ? ` switchport trunk allowed vlan ${port.allowed_vlans || "all"}` : ` switchport access vlan ${port.vlan || 1}`}\n ${port.admin_up ? "no shutdown" : "shutdown"}`;
}

function workbenchVerificationCommand(profile, name) {
  return profile?.vendor === "hp_comware" ? `display current-configuration interface ${name}` : `show running-config interface ${name}`;
}

function workbenchRollbackCommand(profile, name) {
  return profile?.vendor === "hp_comware" ? `system-view; interface ${name}; undo description; return` : `configure terminal; interface ${name}; no description; end`;
}

function runtimeStartupConfiguration(runtimeState) {
  return Object.keys(runtimeState.startup.interfaces || {})
    .map((name) => runtimeInterfaceConfiguration(runtimeState, name, "startup"))
    .join("\n!\n");
}

function runtimeConfigurationDifference(runtimeState, name) {
  const running = runtimeState.running.interfaces?.[name] || {};
  const startup = runtimeState.startup.interfaces?.[name] || {};
  const fields = ["description", "mode", "vlan", "admin_up", "allowed_vlans"];
  const differences = fields.filter((field) => running[field] !== startup[field]).map((field) => `${field}: ${startup[field] ?? "-"} -> ${running[field] ?? "-"}`);
  return differences.join("\n") || "Running and startup configuration match for this interface.";
}

function executeWorkbenchCommand(command, source = "workbench") {
  const runtime = state.lab.switchRuntime;
  const engine = getLabEngine();
  if (!runtime || !engine) return { ok: false, output: "The local switch runtime is not ready." };
  const modeBefore = engine.mode || "exec";
  let resolution = runtime.registry.resolve(command, { mode: modeBefore, privilege: "privileged" });
  const verificationTarget = runtime.state.verificationTargetForCommand(command);
  if (resolution.status !== "matched") return { ok: false, output: resolution.corrective_message || `Command cannot run here: ${resolution.status}.`, resolution };
  const before = JSON.parse(JSON.stringify(runtime.state.running));
  const changesBefore = JSON.parse(JSON.stringify(runtime.state.changes()));
  const result = verificationTarget
    ? { ok: true, kind: "verification", output: runtimeInterfaceConfiguration(runtime.state, verificationTarget.interface_name, "running", activeSwitchProfile()) }
    : engine.execute(command);
  if (result.ok && verificationTarget) {
    result.verified = runtime.state.verifyInterfaceDescription(verificationTarget.interface_name, command, result.output, { command_id: resolution.command.command_id, handler_id: resolution.command.handler_id, canonical_command: resolution.command.canonical_command });
    const record = runtime.state.verification(verificationTarget.interface_name);
    result.verification_policy_id = record.policy_id;
    result.verification_record_id = record.verification_id;
  }
  if (result.ok) {
    syncRuntimeFromEngine(engine, resolution.command.command_id, command);
    const changedRecords = pendingChangeRecordsSince(runtime.state, changesBefore);
    const changedFields = changedRecords.map((change) => change.field);
    const isPolicyVerification = Boolean(verificationTarget);
    runtime.state.record({ ...commandEventMetadata(resolution, command, modeBefore, engine.mode || "exec", changedFields, result), success: true, state_before: before, state_after: JSON.parse(JSON.stringify(runtime.state.running)), safety_result: source, verification_result: isPolicyVerification ? (result.verified ? "passed" : "failed") : "not_run", save_result: result.kind === "save" ? "saved" : "" });
  }
  persistSwitchRuntime();
  return { ...result, resolution };
}

function executeWorkbenchSequence(commands, source = "workbench") {
  const runtime = state.lab.switchRuntime;
  const engine = getLabEngine();
  if (!runtime || !engine) return { ok: false, output: "The local switch runtime is not ready." };
  const engineBefore = {
    state: JSON.parse(JSON.stringify(engine.state)),
    mode: engine.mode,
    selectedInterface: engine.selectedInterface,
    selectedVlan: engine.selectedVlan,
    transcript: [...engine.transcript],
    commands: [...engine.commands]
  };
  const runtimeBefore = JSON.parse(JSON.stringify(runtime.state.running));
  const eventLogBefore = JSON.parse(JSON.stringify(runtime.state.eventLog));
  const outcomes = [];
  for (const command of commands) {
    const outcome = executeWorkbenchCommand(command, source);
    outcomes.push(outcome);
    if (!outcome.ok) {
      engine.state = engineBefore.state;
      engine.mode = engineBefore.mode;
      engine.selectedInterface = engineBefore.selectedInterface;
      engine.selectedVlan = engineBefore.selectedVlan;
      engine.transcript = engineBefore.transcript;
      engine.commands = engineBefore.commands;
      runtime.state.running = runtimeBefore;
      runtime.state.eventLog = eventLogBefore;
      persistSwitchRuntime();
      return { ok: false, output: `No simulated changes were applied. ${outcome.output}`, outcomes };
    }
  }
  return { ok: true, outcomes };
}

function renderSwitchWorkbench() {
  const profile = activeSwitchProfile();
  const runtime = state.lab.switchRuntime;
  if (!profile || !runtime) { state.lab.screen = "profiles"; renderLab(); return; }
  const network = visualNetwork();
  const port = workbenchPort(runtime.state, network);
  const heading = labCreate("section", "lab-workspace-intro switch-workbench-heading");
  heading.append(labButton("Back to Switch Lab", "secondary lab-back-button", () => { state.lab.screen = "dashboard"; renderLab(); }));
  heading.append(labCreate("div", "lab-card-kicker", "Shared local switch state"), labCreate("h3", "", "Switch Workbench"), labCreate("p", "", `${profile.vendor_label} ${profile.model} | ${profile.operating_system} ${profile.default_version} | ${profile.simulator_support_summary}`));
  heading.append(labButton("Change profile", "secondary", () => { state.lab.screen = "profiles"; renderLab(); }));
  els.labRoot.append(heading);

  const inspector = labCreate("section", "switch-inspector");
  inspector.append(labCreate("div", "lab-card-kicker", "Switch Inspector"), labCreate("h4", "", port ? `Interface ${port.name}` : "No interface selected"));
  if (port) {
    const interfaceField = labCreate("label", "lab-setup-field");
    interfaceField.append(labCreate("span", "", "Interface"));
    const interfaceSelect = document.createElement("select");
    interfaceSelect.setAttribute("aria-label", "Workbench interface");
    Object.keys(runtime.state.running.interfaces).forEach((name) => { const option = document.createElement("option"); option.value = name; option.textContent = name; option.selected = name === port.name; interfaceSelect.append(option); });
    interfaceSelect.addEventListener("change", () => { runtime.state.selectInterface(interfaceSelect.value); network.selectedPort = interfaceSelect.value; saveVisualNetwork(network); renderLab(); });
    interfaceField.append(interfaceSelect);
    inspector.append(interfaceField);
    const fields = {};
    [["Description", "description", port.description]].forEach(([label, key, value]) => {
      const field = labCreate("label", "lab-setup-field"); field.append(labCreate("span", "", label)); const input = document.createElement("input"); input.value = value; input.setAttribute("aria-label", label); fields[key] = input; field.append(input); inspector.append(field);
    });
    const preview = labCreate("pre", "lab-output", workbenchPreview(profile, port, { description: fields.description.value }));
    const currentValue = labCreate("p", "", `Current value: ${port.description || "empty"}`);
    const newValue = labCreate("p", "", `New value: ${fields.description.value || "empty"}`);
    const updatePreview = () => {
      preview.textContent = workbenchPreview(profile, port, { description: fields.description.value });
      newValue.textContent = `New value: ${fields.description.value || "empty"}`;
    };
    Object.values(fields).forEach((input) => input.addEventListener("input", updatePreview));
    const verificationCommand = workbenchVerificationCommand(profile, port.name);
    inspector.append(labCreate("strong", "", "Command Preview"), currentValue, newValue, preview, labCreate("p", "", `Verification: ${verificationCommand}`), labCreate("p", "", `Rollback: ${workbenchRollbackCommand(profile, port.name)}`), labCreate("p", "", "Risk: Low - changes interface documentation only."));
    inspector.append(labButton("Apply simulated change", "primary", () => {
      const engine = getLabEngine();
      const commands = profile.vendor === "hp_comware"
        ? ["system-view", `interface ${port.name}`, `description ${fields.description.value.trim()}`, "return"]
        : profile.vendor === "aruba_cx"
          ? ["configure terminal", `interface ${port.name}`, `description ${fields.description.value.trim()}`, "end"]
          : ["configure terminal", `interface ${port.name}`, `description ${fields.description.value.trim()}`, "end"];
      const sequence = executeWorkbenchSequence(commands);
      if (!sequence.ok) { showToast(sequence.output); return; }
      engine.transcript.push(`! Workbench command sequence\n${commands.join("\n")}\n\n${verificationCommand}`);
      runtime.state.storeTerminal(engine.transcript, engine.commands);
      syncVisualFromRuntime(); renderLab(); showToast("Local change is pending verification. Running configuration changed; startup configuration did not.");
    }), labButton("Open in terminal", "secondary", () => { state.lab.screen = "guided-cli"; state.lab.console.pendingCommand = verificationCommand; renderLab(); }), labButton("Cancel", "secondary", () => renderLab()));
    const verification = runtime.state.verification(port.name);
    const configurations = labCreate("section", "lab-detail-field");
    configurations.append(labCreate("strong", "", "Running configuration"), labCreate("pre", "lab-output", runtimeInterfaceConfiguration(runtime.state, port.name, "running", profile)), labCreate("strong", "", "Startup configuration"), labCreate("pre", "lab-output", runtimeInterfaceConfiguration(runtime.state, port.name, "startup", profile)), labCreate("strong", "", "Configuration difference"), labCreate("pre", "lab-output", runtimeConfigurationDifference(runtime.state, port.name)), labCreate("strong", "", `Verification: ${runtime.state.isVerificationCurrent(port.name) ? "Passed" : verification.verified ? "Stale - run again" : "Required"}`));
    configurations.append(labButton("Run verification", "secondary", () => {
      const engine = getLabEngine();
      const modeBefore = engine.mode || "exec";
      const resolution = runtime.registry.resolve(verificationCommand, { mode: modeBefore, privilege: "privileged" });
      const result = engine.execute(verificationCommand);
      const output = runtimeInterfaceConfiguration(runtime.state, port.name, "running", profile);
      const passed = result.ok && runtime.state.verifyInterfaceDescription(port.name, verificationCommand, output, { command_id: resolution?.command?.command_id, handler_id: resolution?.command?.handler_id, canonical_command: resolution?.command?.canonical_command });
      const record = runtime.state.verification(port.name);
      runtime.state.record({ ...commandEventMetadata(resolution, verificationCommand, modeBefore, engine.mode || "exec", [], { verification_policy_id: record.policy_id, verification_record_id: record.verification_id }), success: passed, safety_result: "workbench", verification_result: passed ? "passed" : "failed" });
      engine.transcript.push(`${consolePrompt()} ${verificationCommand}\n${output}`);
      runtime.state.storeTerminal(engine.transcript, engine.commands);
      persistSwitchRuntime();
      renderLab();
      showToast(passed ? "Verification passed from current shared running configuration." : "Verification did not prove the requested description change.");
    }));
    inspector.append(configurations);
  }
  const changes = runtime.state.changes();
  const pending = labCreate("section", "lab-detail-field");
  pending.append(labCreate("strong", "", `Pending Changes (${changes.length})`), labCreate("pre", "lab-output", changes.length ? changes.map((change) => `${change.field}: ${change.before ?? "-"} -> ${change.after}`).join("\n") : "No unsaved local configuration changes."));
  pending.append(
    labButton("Save verified configuration", "secondary", () => {
      const saved = runtime.state.save("save");
      if (!saved.ok) { showToast(saved.message); return; }
      hydrateEngineFromRuntime(getLabEngine());
      syncVisualFromRuntime();
      persistSwitchRuntime();
      renderLab();
      showToast("Startup configuration was updated from the verified local running state.");
    }),
    labButton("Roll back pending changes", "secondary", () => {
      runtime.state.rollbackUnsaved();
      hydrateEngineFromRuntime(getLabEngine());
      syncVisualFromRuntime();
      persistSwitchRuntime();
      renderLab();
      showToast("Unsaved local changes were restored from the saved startup configuration.");
    }),
    labButton("Roll back latest change", "secondary", () => {
      if (!changes.length) { showToast("There is no pending local change to roll back."); return; }
      runtime.state.rollbackChange(changes.length - 1);
      hydrateEngineFromRuntime(getLabEngine());
      syncVisualFromRuntime();
      persistSwitchRuntime();
      renderLab();
      showToast("The latest pending local change was rolled back.");
    }),
    labButton("Reset training switch", "secondary", () => {
      if (!window.confirm("Reset the local training switch to its original factory baseline? Saved and running local changes will be replaced.")) return;
      runtime.state.resetTraining();
      hydrateEngineFromRuntime(getLabEngine());
      syncVisualFromRuntime();
      persistSwitchRuntime();
      renderLab();
      showToast("The local training switch was reset to its original baseline.");
    })
  );
  inspector.append(pending);
  els.labRoot.append(inspector);
  const topologyLink = labCreate("section", "lab-workspace-intro");
  topologyLink.append(labCreate("strong", "", "Visual topology"), labCreate("p", "", "The existing visual topology uses this same local switch state and remains available as its own workspace."));
  topologyLink.append(labButton("Open Visual Playground", "secondary", () => { state.lab.screen = "visual"; renderLab(); }));
  els.labRoot.append(topologyLink);
}

function labNavigate(destination) {
  if (destination.stageId !== undefined) state.lab.activeStageId = destination.stageId;
  if (destination.sectionId !== undefined) state.lab.activeSectionId = destination.sectionId;
  if (destination.lessonId !== undefined) state.lab.activeLessonId = destination.lessonId;
  state.lab.screen = destination.screen || "dashboard";
  renderLab();
}

function renderLabBreadcrumb(items) {
  const navigation = labCreate("div", "lab-page-navigation");
  navigation.append(labButton("Back to Lab Mode", "secondary lab-back-button", () => labNavigate({ screen: "dashboard" })));
  const trail = labCreate("nav", "lab-breadcrumb", "");
  trail.setAttribute("aria-label", "Lab navigation");
  items.forEach((item, index) => {
    if (index) trail.append(labCreate("span", "", ">"));
    if (!item.screen) {
      trail.append(labCreate("span", "lab-breadcrumb-current", item.label));
      return;
    }
    trail.append(labButton(item.label, "lab-breadcrumb-link", () => labNavigate(item)));
  });
  navigation.append(trail);
  els.labRoot.append(navigation);
}

function renderLabStagePage() {
  const stageId = state.lab.activeStageId;
  const stage = state.lab.stages.find((item) => item.id === stageId);
  if (!stage || !labStageUnlocked(stageId)) { state.lab.screen = "dashboard"; renderLab(); return; }
  renderLabBreadcrumb([{ label: "Lab Mode", screen: "dashboard" }, { label: stage.title }]);
  const header = labCreate("section", "lab-page-header");
  header.append(labCreate("div", "lab-card-kicker", stageId === "foundation" ? "Learning path" : "Guided configuration"));
  header.append(labCreate("h3", "", stage.title));
  header.append(labCreate("p", "", stage.description));
  els.labRoot.append(header);
  const grid = labCreate("div", "lab-section-grid");
  state.lab.sections.filter((section) => section.stage === stageId).forEach((section) => grid.append(renderLabStageSectionCard(section)));
  els.labRoot.append(grid);
  if (stageId === "foundation" && labFoundationComplete()) {
    const checkpoint = labCreate("section", "lab-unlock-card");
    checkpoint.append(labCreate("strong", "", "Foundation checkpoint ready"), labCreate("span", "", "Pass with 80% or higher to unlock the Configuration Lab."));
    checkpoint.append(labButton("Take Foundation Quiz", "primary", () => { state.lab.screen = "final-quiz"; renderLab(); }));
    els.labRoot.append(checkpoint);
  }
}

function renderLabStageSectionCard(section) {
  const lessons = labSectionLessons(section.id);
  const percent = labProgressPercent(lessons);
  const card = labCreate("article", "lab-section-card");
  card.append(labCreate("h4", "", section.title), labCreate("p", "", section.description));
  card.append(labCreate("div", "lab-section-meta", `${lessons.length} lesson${lessons.length === 1 ? "" : "s"} | ${percent}% complete`));
  const track = labCreate("div", "lab-progress-track");
  const fill = labCreate("span", "lab-progress-fill");
  fill.style.width = `${percent}%`;
  track.append(fill);
  card.append(track);
  const label = percent === 100 ? "Review" : percent > 0 ? "Continue" : "Start";
  card.append(labButton(label, "secondary", () => { state.lab.activeSectionId = section.id; state.lab.screen = "section"; renderLab(); }));
  return card;
}

function renderLabSectionPage() {
  const section = state.lab.sections.find((item) => item.id === state.lab.activeSectionId);
  if (!section) { state.lab.screen = "dashboard"; renderLab(); return; }
  const stage = state.lab.stages.find((item) => item.id === section.stage);
  renderLabBreadcrumb([{ label: "Lab Mode", screen: "dashboard" }, { label: stage?.title || "Stage", screen: "stage", stageId: section.stage }, { label: section.title }]);
  const header = labCreate("section", "lab-page-header");
  header.append(labCreate("div", "lab-card-kicker", section.difficulty), labCreate("h3", "", section.title), labCreate("p", "", section.description));
  els.labRoot.append(header);
  const list = labCreate("div", "lab-lesson-list");
  labSectionLessons(section.id).forEach((lesson) => {
    const complete = Boolean(state.lab.progress.completedLessons[lesson.id]);
    const score = state.lab.progress.lessonScores[lesson.id];
    const row = labCreate("article", "lab-lesson-row");
    const copy = labCreate("div", "lab-lesson-row-copy");
    copy.append(labCreate("h4", "", lesson.title));
    copy.append(labCreate("p", "", `${lesson.vendor} | ${lesson.difficulty} | ${complete ? `Completed${score !== undefined ? ` (${score}%)` : ""}` : "Not completed"}`));
    row.append(copy, labButton(complete ? "Review lesson" : "Start lesson", "secondary", () => openLabLesson(lesson.id)));
    list.append(row);
  });
  els.labRoot.append(list);
}

function routeMetadata(route, index) {
  const vendor = route.category === "HP Comware" || route.category === "Stacking" ? "HP Comware"
    : route.category === "Endpoint Network" ? "Windows CMD"
      : "Cisco IOS";
  const support = route.steps?.length || ["Free Practice", "Access Ports", "VLANs", "Trunks", "Troubleshooting"].includes(route.category)
    ? "Fully simulated"
    : ["Layer 2 Health", "Stacking", "Port Security"].includes(route.category)
      ? "Explanation only"
      : "Partially simulated";
  const routeType = route.category === "Troubleshooting" ? "Troubleshooting"
    : route.category === "Free Practice" ? "Free practice"
      : route.category === "Safety and Tickets" ? "Workflow"
        : "Configuration";
  const requiredCommands = route.steps?.map((step) => step.command) || (vendor === "HP Comware"
    ? ["display interface brief", "display vlan"]
    : route.category === "VLANs" ? ["show vlan brief", "configure terminal"]
      : route.category === "Trunks" ? ["show interfaces trunk", "configure terminal"]
        : ["show interface status"]);
  return {
    ...route,
    id: route.id || `route-${index + 1}`,
    vendor,
    platform: vendor,
    topic: route.category,
    difficulty: index < 30 ? "Foundation" : index < 85 ? "Intermediate" : "Advanced existing content",
    routeType,
    support,
    requiredCommands,
    startingState: `Local ${route.device || "access"} switch profile`,
    expectedFinalState: "Local simulated state checked and verified",
    verificationCommands: vendor === "HP Comware" ? ["display interface brief"] : ["show interface status"],
    estimatedMinutes: route.steps?.length ? Math.max(8, Math.ceil(route.steps.length * 1.5)) : 8 + (index % 4) * 2
  };
}

function buildTrainingRoutes() {
  const core = [
    { id: "free-practice", category: "Free Practice", label: "Free Practice", device: "access", goal: "Explore a fresh local switch without automatic answers.", hint: "Start with show interface status or show vlan brief.", steps: [] },
    { id: "full-switch-configuration", category: "Complete Builds", label: "Full Switch Configuration - Start to Finish", device: "access", goal: "Configure a fresh simulated Cisco switch manually: name it, create a VLAN, configure two access ports, verify, and save.", hint: "Every command is typed by you. The coach only shows the next safe goal.", steps: [
      { command: "show interface status", why: "See the fresh switch state before changing it.", alternatives: ["show vlan brief"] },
      { command: "configure terminal", why: "Enter global configuration mode." },
      { command: "hostname TRAINING-SWITCH", why: "Give the simulated switch a clear local name." },
      { command: "vlan 20", why: "Create the training VLAN before assigning ports." },
      { command: "name USERS", why: "Name the VLAN so the configuration is understandable." },
      { command: "exit", why: "Return to global configuration mode." },
      { command: "interface GigabitEthernet1/0/1", why: "Select the first intended access port." },
      { command: "description PC-1", why: "Document the connected local endpoint." },
      { command: "switchport mode access", why: "Make the port an access port." },
      { command: "switchport access vlan 20", why: "Assign the port to the new VLAN." },
      { command: "no shutdown", why: "Enable the simulated port." },
      { command: "end", why: "Return to privileged EXEC mode before verification." },
      { command: "show running-config interface GigabitEthernet1/0/1", why: "Verify the first port configuration." },
      { command: "show vlan brief", why: "Verify VLAN membership." },
      { command: "write memory", why: "Save only after the evidence is correct." }
    ] },
    { id: "access-port", category: "Access Ports", label: "Configure Access Port", device: "access", goal: "Set a simulated access port description, access VLAN, and verify it.", hint: "Read the port state before entering configuration mode.", steps: [] },
    { id: "create-vlan", category: "VLANs", label: "Create VLAN", device: "access", goal: "Create a local simulated VLAN, give it a name, verify it, then save.", hint: "Create the VLAN before assigning it to a port.", steps: [] },
    { id: "trunk-port", category: "Trunks", label: "Configure Trunk Port", device: "trunk", goal: "Configure a simulated trunk and verify its allowed VLANs.", hint: "Use a show command to inspect the existing trunk first.", steps: [] },
    { id: "wrong-vlan", category: "Troubleshooting", label: "Fix Wrong VLAN", device: "access", goal: "Inspect a simulated port, correct its VLAN, then confirm the result.", hint: "Use interface status and running configuration as evidence.", steps: [] },
    { id: "recover-port", category: "Troubleshooting", label: "Recover Shutdown Port", device: "disabled", goal: "Identify an administratively disabled simulated port and recover it safely.", hint: "Check port status before making the change.", steps: [] }
  ];
  const catalog = [
    ["Interface Basics", ["Read port status", "Add a port description", "Set speed and duplex", "Disable an unused port", "Recover a disabled port", "Compare two port states", "Check interface counters", "Clear interface counters", "Inspect error-disabled state", "Document an endpoint"]],
    ["VLANs", ["Create a user VLAN", "Name a VLAN", "Assign an access VLAN", "Move an endpoint VLAN", "Verify VLAN membership", "Remove a VLAN assignment", "Build a guest VLAN", "Build a voice VLAN", "Inspect VLAN status", "Save a VLAN change"]],
    ["Trunks", ["Identify a trunk", "Configure a trunk", "Allow VLANs on a trunk", "Remove a trunk VLAN", "Inspect trunk status", "Find a native VLAN mismatch", "Validate uplink VLANs", "Document an uplink", "Recover a trunk mismatch", "Save a trunk change"]],
    ["MAC and Neighbor", ["Inspect MAC learning", "Find a MAC on a port", "Clear a learned MAC", "Verify MAC movement", "Read CDP neighbors", "Read LLDP neighbors", "Find an unknown endpoint", "Check a device location", "Compare MAC tables", "Verify endpoint traffic"]],
    ["Port Security", ["Inspect port security", "Set a secure port", "Test a violation", "Recover a violation", "Check secure MACs", "Set violation mode", "Review sticky MACs", "Clear a security state", "Document a violation", "Verify secure port recovery"]],
    ["Switch Management", ["Set hostname", "Review running configuration", "Review startup configuration", "Save configuration", "Compare saved state", "Check version", "Set login banner", "Set management VLAN", "Inspect management interface", "Prepare a change summary"]],
    ["Layer 2 Health", ["Read STP state", "Inspect root bridge", "Find a blocked port", "Review EtherChannel", "Inspect LACP member", "Check loop symptoms", "Verify uplink redundancy", "Document STP evidence", "Check broadcast symptoms", "Verify recovery"]],
    ["Stacking", ["Inspect stack members", "Review stack priority", "Set stack priority", "Inspect IRF topology", "Inspect IRF port", "Review member role", "Check stack link health", "Document stack evidence", "Plan member replacement", "Verify stack recovery"]],
    ["Endpoint Network", ["Configure a PC IP", "Check subnet mask", "Check default gateway", "Test same VLAN ping", "Test VLAN mismatch ping", "Fix a duplicate IP", "Inspect ARP", "Check DNS reachability", "Document endpoint state", "Verify endpoint connectivity"]],
    ["Safety and Tickets", ["Read before change", "Use a rollback plan", "Build a change checklist", "Verify before save", "Write a ticket summary", "Escalate physical fault", "Identify dangerous commands", "Use a maintenance window", "Capture before/after evidence", "Close a verified ticket"]],
    ["HP Comware", ["Display interface brief", "Display VLAN", "Configure access port", "Configure trunk", "Inspect MAC address", "Read LLDP neighbor", "Set system name", "Inspect IRF topology", "Set IRF priority", "Save Comware configuration"]],
    ["Cisco IOS", ["Show interface status", "Show VLAN brief", "Configure access port", "Configure trunk", "Show MAC table", "Show CDP neighbors", "Show LLDP neighbors", "Save running configuration", "Recover shutdown port", "Verify configuration"]]
  ];
  return core.concat(catalog.flatMap(([category, labels], categoryIndex) => labels.map((label, itemIndex) => ({
    id: `route-${categoryIndex + 1}-${itemIndex + 1}`,
    category,
    label,
    device: category === "HP Comware" || category === "Stacking" ? "irf" : category === "Trunks" || category === "Layer 2 Health" ? "trunk" : "access",
    goal: `${label}. Work through the local simulation manually and verify the final state.`,
    hint: "The coach suggests safe verification steps; it does not run commands for you.",
    steps: []
  })))).map(routeMetadata);
}

const PLAYGROUND_TASKS = buildTrainingRoutes();

// Runtime routes come from the generated registry. The legacy builder remains only as
// generator input until every historic learning objective has been migrated.
function runtimeTrainingRoutes() {
  const generated = state.curriculum?.routes || [];
  if (!generated.length) return PLAYGROUND_TASKS;
  const inventory = new Map((state.curriculum.inventory || []).map((command) => [command.command_id, command]));
  return generated.map((route) => ({
    id: route.route_id,
    label: route.title,
    category: route.category || route.topic,
    vendor_id: route.vendor,
    vendor_label: route.vendor_label || route.vendor,
    vendor: route.vendor,
    device: route.vendor === "hp_comware" ? "irf" : route.vendor === "aruba_cx" ? "aruba" : route.vendor === "windows_cmd" || route.vendor === "linux" ? "access" : "access",
    purpose: route.description,
    goal: route.expected_final_state,
    hint: (route.hints || [])[0] || "Collect evidence before making a change.",
    supportLevel: route.support_level,
    routeType: route.route_type,
    requiredCommandsPolicy: route.required_commands_policy,
    requiredCommandIds: route.required_command_ids || [],
    verificationCommandIds: route.verification_command_ids || [],
    rollbackCommandIds: route.rollback_command_ids || [],
    steps: (route.required_command_ids || []).map((id) => ({ command: inventory.get(id)?.canonical_command || id, alternatives: inventory.get(id)?.aliases || [] }))
  }));
}

function currentTrainingRoute() {
  const routes = runtimeTrainingRoutes();
  return routes.find((item) => item.id === state.lab.playgroundTaskId) || routes[0];
}

function renderLabPlayground() {
  if (!labPlaygroundUnlocked()) { state.lab.screen = "dashboard"; renderLab(); return; }
  renderLabBreadcrumb([{ label: "Lab Mode", screen: "dashboard" }, { label: "Playground" }]);
  const routes = runtimeTrainingRoutes();
  const task = routes.find((item) => item.id === state.lab.playgroundTaskId) || routes[0];
  const header = labCreate("section", "lab-page-header");
  header.append(labCreate("div", "lab-card-kicker", "Simulated switch playground"));
  header.append(labCreate("h3", "", "Practice on a local imaginary switch"));
  header.append(labCreate("p", "", `Choose from ${routes.length} generated local training routes, type every command yourself, then verify the result. Nothing connects to a network or changes a real device.`));
  els.labRoot.append(header);

  const taskBar = labCreate("section", "lab-playground-taskbar");
  const selectorField = labCreate("label", "lab-setup-field");
  selectorField.append(labCreate("span", "", "Scenario"));
  const selector = document.createElement("select");
  selector.setAttribute("aria-label", "Playground scenario");
  [...new Set(routes.map((item) => item.category))].forEach((category) => {
    const group = document.createElement("optgroup");
    group.label = category;
    routes.filter((item) => item.category === category).forEach((item) => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.label;
      group.append(option);
    });
    selector.append(group);
  });
  selector.value = task.id;
  selector.addEventListener("change", () => {
    const next = routes.find((item) => item.id === selector.value) || routes[0];
    state.lab.playgroundTaskId = next.id;
    startLabMission(SIMULATOR_MISSIONS.find((mission) => mission.device === next.device) || { device: next.device });
    renderLab();
  });
  selectorField.append(selector);
  taskBar.append(selectorField);
  const taskCopy = labCreate("div", "lab-playground-task-copy");
  taskCopy.append(labCreate("strong", "", task.label), labCreate("span", "", task.goal), labCreate("span", "", "Manual CLI practice: the coach guides; it never types commands for you."));
  taskBar.append(taskCopy);
  els.labRoot.append(taskBar);

  renderLabConsole();
  const engine = getLabEngine();
  const verification = labCreate("section", "lab-playground-summary");
  const commands = engine.commands.join(" ").toLowerCase();
  const checked = /show|display/.test(commands);
  const configured = /configure terminal|system-view|switchport|port access|vlan /.test(commands);
  const saved = /write memory|copy running-config startup-config|save force/.test(commands);
  const checklist = labCreate("div", "lab-summary-field");
  checklist.append(labCreate("strong", "", "Verification checklist"));
  [
    [checked, "Read the simulated current state"],
    [configured, "Made a local simulated change"],
    [checked && configured, "Verified with a show or display command"],
    [saved, "Saved only after verification"]
  ].forEach(([done, label]) => checklist.append(labCreate("span", done ? "is-complete" : "", `${done ? "Done" : "Next"}: ${label}`)));
  const ticket = labCreate("div", "lab-summary-field");
  ticket.append(labCreate("strong", "", "Ticket summary"));
  ticket.append(labCreate("p", "", configured && checked ? `Simulated task in progress: ${task.label}. Local switch state was checked and a simulated change was made on ${engine.selectedInterface}. Verification ${checked ? "is recorded" : "is still required"}.` : `Simulated task selected: ${task.label}. No diagnosis or device change is claimed until simulated output and verification are present.`));
  const actions = labCreate("div", "lab-summary-actions");
  actions.append(labButton("Reset Playground", "secondary", () => { engine.rollback(); engine.transcript = []; engine.commands = []; renderLab(); showToast("The local simulated switch was reset."); }));
  verification.append(checklist, ticket, actions);
  els.labRoot.append(verification);
}

function createVisualNetwork() {
  const ports = {};
  for (let index = 1; index <= 24; index += 1) {
    const name = `GigabitEthernet1/0/${index}`;
    ports[name] = { name, description: "", vlan: "1", mode: "access", adminUp: true, connectedDeviceId: "", cable: "disconnected", speed: "auto", duplex: "auto", voiceVlan: "", allowedVlans: "all", errorDisabled: false, lastActivity: "Never" };
  }
  return {
    schemaVersion: VISUAL_NETWORK_SCHEMA_VERSION,
    hostname: "TRAINING-SWITCH",
    vendor: "Cisco IOS",
    ports,
    vlans: { "1": { name: "DEFAULT" } },
    devices: [
      { id: "pc-1", name: "PC-1", type: "Desktop PC", mac: "02:CD:00:00:00:01", ip: "", mask: "255.255.255.0", gateway: "", method: "static", port: "", lastPing: "Not tested" },
      { id: "laptop-1", name: "Laptop-1", type: "Laptop", mac: "02:CD:00:00:00:02", ip: "", mask: "255.255.255.0", gateway: "", method: "static", port: "", lastPing: "Not tested" }
    ],
    macs: [],
    selectedPort: "GigabitEthernet1/0/1",
    selectedDeviceId: "pc-1",
    selectedVlan: "",
    traffic: "",
    diagnostics: [],
    lastDiagnosticScan: "",
    saved: false
  };
}

function visualNetwork() {
  if (!state.lab.visualNetwork) {
    let recoveryMessage = "";
    let savedSchemaVersion = 0;
    try {
      const saved = JSON.parse(window.localStorage.getItem(VISUAL_NETWORK_STORAGE_KEY) || "null");
      savedSchemaVersion = Number(saved?.schemaVersion) || 0;
      if (saved && saved.ports && Array.isArray(saved.devices)) {
        state.lab.visualNetwork = saved;
        state.lab.visualNetwork.schemaVersion = VISUAL_NETWORK_SCHEMA_VERSION;
      } else if (saved) {
        state.lab.visualNetwork = createVisualNetwork();
        recoveryMessage = "Saved simulator data was invalid and was replaced with a fresh local switch.";
      } else {
        state.lab.visualNetwork = createVisualNetwork();
      }
    } catch {
      state.lab.visualNetwork = createVisualNetwork();
      recoveryMessage = "Saved simulator data could not be read. A fresh local switch was created.";
    }
    const network = state.lab.visualNetwork;
    const legacyTopology = window.CommandDoctorTopology?.loadSavedTopology?.();
    if (legacyTopology && (!network.topology || savedSchemaVersion < VISUAL_NETWORK_SCHEMA_VERSION)) network.topology = legacyTopology;
    if (window.CommandDoctorTopology?.ensureTopology) window.CommandDoctorTopology.ensureTopology(network);
    if (recoveryMessage) network.topology.notice = recoveryMessage;
    if (saveVisualNetwork(network) && legacyTopology) window.localStorage.removeItem("command-doctor.phase1.topology");
  }
  return state.lab.visualNetwork;
}

function saveVisualNetwork(network) {
  try {
    network.schemaVersion = VISUAL_NETWORK_SCHEMA_VERSION;
    window.localStorage.setItem(VISUAL_NETWORK_STORAGE_KEY, JSON.stringify(network));
    return true;
  } catch {
    return false;
  }
}

function visualPort(network, name = network.selectedPort) {
  return network.ports[name] || null;
}

function visualDevice(network, id = network.selectedDeviceId) {
  return network.devices.find((device) => device.id === id) || null;
}

function visualPortIsUp(port) {
  const diagnostics = window.CommandDoctorDiagnostics;
  return diagnostics ? diagnostics.portOperational(visualNetwork(), port) : Boolean(port && port.adminUp && !port.errorDisabled && port.connectedDeviceId && port.cable === "good");
}

function visualMacRefresh(network) {
  window.CommandDoctorDiagnostics?.invalidateMacs(network);
}

function syncEngineFromVisual() {
  const network = visualNetwork();
  const engine = getLabEngine();
  const shared = state.lab.switchRuntime?.state;
  if (!engine || !shared) return;
  if (network.hostname !== shared.running.system.hostname) shared.updateHostname(network.hostname, "visual-adapter");
  Object.values(network.ports).forEach((port) => {
    if (!shared.running.interfaces[port.name]) return;
    shared.updateInterface(port.name, {
      description: port.description || "",
      vlan: Number(port.vlan) || 1,
      admin_up: Boolean(port.adminUp),
      operational_up: Boolean(port.connectedDeviceId && port.adminUp),
      mode: port.mode || "access",
      allowed_vlans: port.allowedVlans || ""
    }, "visual-adapter");
  });
  shared.running.vlans = Object.fromEntries(Object.entries(network.vlans).map(([id, vlan]) => [id, { name: vlan.name || `VLAN-${id}` }]));
  shared.running.endpoint_links = network.devices.filter((device) => device.port).map((device) => ({ device_id: device.id, interface: device.port }));
  shared.running.cables = network.topology?.cables || [];
  shared.running.diagnostics = network.diagnostics || [];
  hydrateEngineFromRuntime(engine);
  syncVisualFromRuntime();
  persistSwitchRuntime();
}

function recordVisualCommands(commands, message) {
  const engine = getLabEngine();
  if (!engine) return;
  commands.forEach((command) => {
    engine.commands.push(command.toLowerCase());
    engine.transcript.push(`${consolePrompt()} ${command}\n${message}`);
  });
  if (engine.transcript.length > 8) engine.transcript.splice(0, engine.transcript.length - 8);
  syncEngineFromVisual();
}

function renderVisualNetworkPlayground() {
  const network = visualNetwork();
  window.CommandDoctorTopology?.ensureTopology?.(network);
  const profile = activeSwitchProfile();
  const switchNode = network.topology?.nodes?.find((node) => node.id === "switch-1");
  if (profile && switchNode) {
    switchNode.vendor = profile.vendor_label;
    switchNode.model = `${profile.model} simulated training switch`;
    switchNode.modelShort = profile.model;
  }
  visualMacRefresh(network);
  const panel = labCreate("section", "visual-playground");
  const heading = labCreate("div", "visual-playground-heading");
  heading.append(labCreate("div", "lab-card-kicker", "Offline simulated training"));
  heading.append(labCreate("h3", "", state.lab.diagnosticsMode ? "Advanced Diagnostics Mode" : "Visual Network Playground"));
  heading.append(labCreate("p", "", `Build a small topology, configure the local simulated ${profile?.vendor_label || "switch"} profile through the CLI or visual controls, and test connectivity. It never connects to real equipment.`));
  panel.append(heading);
  const topologyHost = labCreate("div", "visual-topology-host");
  const topologyOptions = {
    onChange: (changedNetwork) => {
      visualMacRefresh(changedNetwork);
      syncEngineFromVisual();
      return saveVisualNetwork(changedNetwork);
    }
  };
  if (window.CommandDoctorTopology) {
    window.CommandDoctorTopology.render(topologyHost, network, topologyOptions);
  } else {
    topologyHost.append(labCreate("p", "", "Topology workspace is loading."));
  }
  panel.append(topologyHost);
  panel.append(renderVisualNextStep(network));
  panel.append(renderDiagnosticResults(network));

  const grid = labCreate("div", "visual-playground-grid");
  grid.append(renderVisualDetails(network));
  panel.append(grid, renderVisualVerification(network));
  els.labRoot.append(panel);
}

function runTopologyDiagnostic(network) {
  network.diagnostics = window.CommandDoctorDiagnostics?.scan(network) || [];
  network.lastDiagnosticScan = new Date().toLocaleTimeString();
  if (network.topology) {
    network.topology.lastDiagnosticScan = network.lastDiagnosticScan;
    window.CommandDoctorTopology?.saveTopology(network.topology);
  }
  return network.diagnostics;
}

function renderDiagnosticResults(network) {
  if (state.lab.diagnosticsMode && !network.lastDiagnosticScan) runTopologyDiagnostic(network);
  const results = network.diagnostics?.length ? network.diagnostics : runTopologyDiagnostic(network);
  const filters = ["All", "Critical", "Warning", "Passed", "Physical", "Layer 2", "Layer 3", "Connectivity"];
  network.diagnosticFilter ||= "All";
  const visible = results.filter((item) => network.diagnosticFilter === "All" || item.severity === network.diagnosticFilter || item.category === network.diagnosticFilter);
  const counts = Object.fromEntries(["Critical", "Warning", "Passed"].map((severity) => [severity, results.filter((item) => item.severity === severity).length]));
  const score = results.length ? Math.round((counts.Passed / results.length) * 100) : 100;
  const panel = labCreate("section", "diagnostic-results-panel");
  const heading = labCreate("div", "diagnostic-results-heading");
  heading.append(labCreate("div", "lab-card-kicker", "Offline topology scan"), labCreate("h4", "", "Diagnostic Results"));
  heading.append(labButton("Run full diagnostic", "secondary", () => { runTopologyDiagnostic(network); renderLab(); }));
  panel.append(heading);
  const metrics = labCreate("div", "diagnostic-metrics");
  [["Health score", `${score}%`], ["Critical", counts.Critical], ["Warnings", counts.Warning], ["Passed", counts.Passed], ["Last scan", network.lastDiagnosticScan || "Not scanned"]].forEach(([label, value]) => {
    const item = labCreate("div", "diagnostic-metric");
    item.append(labCreate("span", "", label), labCreate("strong", "", String(value)));
    metrics.append(item);
  });
  panel.append(metrics);
  const filterRow = labCreate("div", "diagnostic-filters");
  filters.forEach((filter) => filterRow.append(labButton(filter, `secondary ${network.diagnosticFilter === filter ? "is-active" : ""}`, () => { network.diagnosticFilter = filter; renderLab(); })));
  panel.append(filterRow);
  const list = labCreate("div", "diagnostic-findings");
  visible.forEach((finding) => {
    const item = labButton(`${finding.severity} | ${finding.category} | ${finding.device}\n${finding.finding}\n${finding.evidence}\nNext: ${finding.nextCheck}`, `diagnostic-finding is-${finding.severity.toLowerCase()}`, () => {
      network.selectedDeviceId = finding.target.deviceId || network.selectedDeviceId;
      network.selectedPort = finding.target.port || network.selectedPort;
      if (network.topology) {
        network.topology.selectedId = finding.target.deviceId || "";
        network.topology.selectedCableId = finding.target.cableId || "";
      }
      renderLab();
    });
    list.append(item);
  });
  panel.append(list);
  return panel;
}

function renderVisualNextStep(network) {
  const connected = Object.values(network.ports).filter((port) => port.connectedDeviceId).length;
  const panel = labCreate("section", "visual-next-step");
  panel.append(
    labCreate("strong", "", "Topology status"),
    labCreate("span", "", `${connected} of 24 simulated RJ45 ports connected`),
    labCreate("p", "", "Use the Cable tool in the topology workspace. Click an endpoint Ethernet socket, then click a switch RJ45 socket. The tool returns to Select after one cable is created."),
  );
  return panel;
}

function visualNextStep(network) {
  const port = visualPort(network);
  const device = visualDevice(network);
  const connectedDevices = network.devices.filter((item) => item.port);
  let title = "1. Connect the selected device";
  let copy = `PC-1 is selected. Select GigabitEthernet1/0/1 on the switch, then connect the cable.`;
  let actionLabel = "Connect PC-1 to GigabitEthernet1/0/1";
  let action = connectSelectedVisualDevice;

  if (!device) {
    title = "1. Select a device";
    copy = "Choose a device in the device tray. Then select a switch port.";
    actionLabel = "Select PC-1";
    action = () => { network.selectedDeviceId = "pc-1"; renderLab(); };
  } else if (!port?.connectedDeviceId) {
    title = "1. Connect the selected device";
    copy = `${device.name} is selected. Connect it to ${port?.name || "a switch port"}.`;
    actionLabel = `Connect ${device.name} to ${port?.name || "selected port"}`;
  } else if (!visualPortIsUp(port)) {
    title = "2. Enable the selected port";
    copy = `${port.name} has a cable but is not operational. Enable it before testing.`;
    actionLabel = `Enable ${port.name}`;
    action = toggleVisualPort;
  } else if (connectedDevices.length < 2) {
    title = "2. Add and connect a second endpoint";
    copy = "Select PC-2 in the device tray, choose another switch port, then connect it. A ping needs two connected endpoints.";
    actionLabel = "Select PC-2";
    action = () => { network.selectedDeviceId = "pc-2"; network.selectedPort = "GigabitEthernet1/0/2"; renderLab(); };
  } else if (!network.devices.every((item) => item.port && item.ip)) {
    title = "3. Set IP addresses";
    copy = "Use the selected device configuration panel to give both endpoints addresses in the same subnet, such as 192.168.10.10 and 192.168.10.11.";
    actionLabel = "Use PC-1 IP settings";
    action = () => { network.selectedDeviceId = "pc-1"; renderLab(); };
  } else {
    title = "4. Run a simulated ping";
    copy = "Both endpoints are connected and addressed. Use Ping selected device to verify the local topology.";
    actionLabel = "Open PC-1 ping test";
    action = () => { network.selectedDeviceId = "pc-1"; renderLab(); };
  }

  const panel = labCreate("section", "visual-next-step");
  panel.append(labCreate("strong", "", "What to do now"), labCreate("span", "", title), labCreate("p", "", copy), labButton(actionLabel, "primary", action));
  return panel;
}

function renderVisualDeviceTray(network) {
  const tray = labCreate("aside", "visual-device-tray");
  tray.append(labCreate("strong", "", "Device tray"), labCreate("p", "", "Add a device, select it, then connect it to a selected switch port."));
  tray.append(labCreate("span", "visual-selection-label", `Selected device: ${visualDevice(network)?.name || "none"}`));
  const types = ["Desktop PC", "Laptop", "IP Phone", "Printer", "Wireless AP", "Server", "Switch", "Router"];
  types.forEach((type) => tray.append(labButton(`Add ${type}`, "secondary visual-tray-button", () => addVisualDevice(type))));
  const devices = labCreate("div", "visual-device-list");
  network.devices.forEach((device) => {
    const item = labButton(`${device.name}\n${device.port ? device.port : "Not connected"}`, `visual-device ${device.id === network.selectedDeviceId ? "is-selected" : ""}`, () => { network.selectedDeviceId = device.id; renderLab(); });
    item.draggable = true;
    item.addEventListener("dragstart", (event) => event.dataTransfer?.setData("text/plain", device.id));
    devices.append(item);
  });
  tray.append(devices);
  return tray;
}

function addVisualDevice(type) {
  const network = visualNetwork();
  const number = network.devices.length + 1;
  const id = `${type.toLowerCase().replace(/[^a-z]+/g, "-")}-${number}`;
  network.devices.push({ id, name: `${type.replace(/\s+/g, "-").toUpperCase()}-${number}`, type, mac: `02:00:00:00:00:${String(number).padStart(2, "0")}`, ip: "", mask: "255.255.255.0", gateway: "", method: "static", port: "", lastPing: "Not tested" });
  network.selectedDeviceId = id;
  renderLab();
}

function renderVisualSwitch(network) {
  const switchPane = labCreate("section", "visual-switch-pane");
  const head = labCreate("div", "visual-switch-head");
  head.append(labCreate("strong", "", network.hostname), labCreate("span", "", "SIM-24P | SYSTEM ON"));
  switchPane.append(head, labCreate("p", "visual-switch-caption", "24-port local simulated Cisco IOS switch"));
  switchPane.append(labCreate("span", "visual-selection-label", `Target port: ${visualPort(network)?.name || "none"}`));
  const chassis = labCreate("div", "visual-switch-chassis");
  const consolePort = labCreate("span", "visual-console-port", "CONSOLE");
  chassis.append(consolePort);
  const ports = labCreate("div", "visual-port-grid");
  Object.values(network.ports).forEach((port, index) => {
    const button = labButton(`Gi1/0/${index + 1}`, `visual-port ${port.name === network.selectedPort ? "is-selected" : ""} ${visualPortIsUp(port) ? "is-up" : port.errorDisabled || !port.adminUp ? "is-warning" : ""}`, () => { network.selectedPort = port.name; renderLab(); });
    button.setAttribute("title", `${port.name}: ${visualPortIsUp(port) ? "link up" : "link down"}`);
    button.addEventListener("dragover", (event) => event.preventDefault());
    button.addEventListener("drop", (event) => { event.preventDefault(); network.selectedDeviceId = event.dataTransfer?.getData("text/plain") || network.selectedDeviceId; connectSelectedVisualDevice(); });
    ports.append(button);
  });
  chassis.append(ports);
  switchPane.append(chassis);
  const cables = labCreate("div", "visual-cables");
  network.devices.filter((device) => device.port).forEach((device) => cables.append(labCreate("span", `visual-cable ${visualPortIsUp(visualPort(network, device.port)) ? "is-up" : "is-down"}`, `${device.name} to ${device.port}`)));
  switchPane.append(cables);
  return switchPane;
}

function renderVisualDetails(network) {
  const panel = labCreate("aside", "visual-detail-pane");
  const port = visualPort(network);
  const device = visualDevice(network);
  panel.append(labCreate("strong", "", "Port details"));
  if (port) {
    [["Interface", port.name], ["Description", port.description || "-"], ["Physical", port.connectedDeviceId ? "Connected" : "Disconnected"], ["Admin", port.adminUp ? "Up" : "Shutdown"], ["Operational", visualPortIsUp(port) ? "Up" : "Down"], ["Mode", port.mode], ["Access VLAN", port.vlan], ["Connected device", device?.port === port.name ? device.name : "-"], ["Learned MAC", network.macs.find((mac) => mac.interface === port.name)?.mac || "-"], ["Cable test", port.cable], ["Last activity", port.lastActivity]].forEach(([label, value]) => panel.append(labCreate("div", "visual-detail-row", `${label}: ${value}`)));
  }
  const actions = labCreate("div", "visual-actions");
  actions.append(labButton(port?.adminUp ? "Shut down port" : "Enable port", "secondary", toggleVisualPort));
  actions.append(labButton("Run cable test", "secondary", runVisualCableTest));
  panel.append(actions);
  if (device) panel.append(renderVisualDeviceConfig(network, device));
  return panel;
}

function renderVisualDeviceConfig(network, device) {
  const config = labCreate("div", "visual-device-config");
  config.append(labCreate("strong", "", `${device.name} configuration`));
  const fields = {};
  [["IP address", "ip"], ["Subnet mask", "mask"], ["Default gateway", "gateway"]].forEach(([label, key]) => {
    const field = labCreate("label", "lab-setup-field");
    field.append(labCreate("span", "", label));
    const input = document.createElement("input");
    input.value = device[key];
    fields[key] = input;
    field.append(input);
    config.append(field);
  });
  config.append(labButton("Apply device IP settings", "secondary", () => { Object.entries(fields).forEach(([key, input]) => { device[key] = input.value.trim(); }); visualMacRefresh(network); network.traffic = `Updated ${device.name} local IP settings.`; network.diagnostics = []; saveVisualNetwork(network); showToast(`${device.name} IP settings saved locally. Run diagnostics to refresh findings.`); }));
  const target = document.createElement("select");
  target.setAttribute("aria-label", "Ping target");
  network.devices.filter((item) => item.id !== device.id).forEach((item) => { const option = document.createElement("option"); option.value = item.id; option.textContent = item.name; target.append(option); });
  config.append(target, labButton("Ping selected device", "primary", () => runVisualPing(device.id, target.value)));
  return config;
}

function connectSelectedVisualDevice() {
  const network = visualNetwork();
  const port = visualPort(network);
  const device = visualDevice(network);
  if (!port || !device) return;
  if (port.connectedDeviceId && port.connectedDeviceId !== device.id) { showToast("Disconnect the existing simulated cable first."); return; }
  if (device.port && device.port !== port.name) visualPort(network, device.port).connectedDeviceId = "";
  port.connectedDeviceId = device.id;
  port.cable = "good";
  device.port = port.name;
  port.lastActivity = "Cable connected";
  visualMacRefresh(network);
  recordVisualCommands([`interface ${port.name}`, "no shutdown"], `${device.name} connected to ${port.name} in the local simulation.`);
  renderLab();
}

function disconnectVisualCable() {
  const network = visualNetwork(); const port = visualPort(network); if (!port) return;
  const device = visualDevice(network, port.connectedDeviceId); if (device) device.port = "";
  port.connectedDeviceId = ""; port.cable = "disconnected"; port.lastActivity = "Cable disconnected";
  visualMacRefresh(network); recordVisualCommands([`interface ${port.name}`, "! cable disconnected"], `Cable removed from ${port.name}.`); renderLab();
}

function toggleVisualPort() {
  const network = visualNetwork(); const port = visualPort(network); if (!port) return;
  port.adminUp = !port.adminUp; port.lastActivity = port.adminUp ? "Port enabled" : "Port shut down";
  visualMacRefresh(network); recordVisualCommands([`interface ${port.name}`, port.adminUp ? "no shutdown" : "shutdown"], `Simulated port ${port.adminUp ? "enabled" : "shut down"}.`); renderLab();
}

function runVisualCableTest() {
  const network = visualNetwork(); const port = visualPort(network); if (!port) return;
  const output = port.cable === "good" ? `Cable test ${port.name}: Good. All simulated pairs normal.` : `Cable test ${port.name}: Open pair. Estimated simulated distance to fault: 12 meters.`;
  port.lastActivity = output; recordVisualCommands([`test cable-diagnostics tdr interface ${port.name}`], output); renderLab();
}

function sameVisualSubnet(a, b) {
  const parts = (value) => String(value || "").split(".");
  const left = parts(a.ip); const right = parts(b.ip);
  return left.length === 4 && right.length === 4 && left.slice(0, 3).join(".") === right.slice(0, 3).join(".");
}

function runVisualPing(sourceId, targetId) {
  const network = visualNetwork(); const source = visualDevice(network, sourceId); const target = visualDevice(network, targetId); const sourcePort = visualPort(network, source?.port); const targetPort = visualPort(network, target?.port);
  const outcome = window.CommandDoctorDiagnostics?.connectivity(network, source, target) || { ok: false, reason: "Diagnostics engine is unavailable.", command: "show interfaces status" };
  if (outcome.ok) {
    window.CommandDoctorDiagnostics.learnMac(network, source, "ARP before ping");
    window.CommandDoctorDiagnostics.learnMac(network, target, "ARP reply before ping");
  }
  const message = outcome.ok ? `Ping success: ${source.name} reached ${target.name}. ARP learned both MAC addresses before ICMP.` : `Ping failed: ${outcome.reason} Next check: ${outcome.command}.`;
  if (source) source.lastPing = message; if (target) target.lastPing = message;
  if (sourcePort) sourcePort.lastActivity = "Ping tested"; if (targetPort) targetPort.lastActivity = "Ping tested";
  visualMacRefresh(network); syncEngineFromVisual(); network.traffic = message; showToast(message); renderLab();
}

function renderVisualVerification(network) {
  const checks = [
    [network.devices.some((device) => device.port), "Physical connection checked"],
    [Object.values(network.ports).some((port) => port.lastActivity.includes("Port") || port.lastActivity.includes("Ping")), "Port status checked"],
    [Object.values(network.ports).some((port) => port.vlan !== "1"), "VLAN configured"],
    [network.macs.length > 0, "MAC address learned"],
    [network.devices.some((device) => device.ip), "IP configuration checked"],
    [network.devices.some((device) => device.lastPing.startsWith("Ping success")), "Ping tested successfully"]
  ];
  const panel = labCreate("section", "visual-verification");
  panel.append(labCreate("strong", "", "Verification checklist"));
  checks.forEach(([done, label]) => panel.append(labCreate("span", done ? "is-complete" : "", `${done ? "Done" : "Next"}: ${label}`)));
  panel.append(labCreate("p", "", "Ticket summary: This is a local browser simulation. Record only the simulated evidence you have verified."));
  panel.append(labButton("Reset visual topology", "secondary", () => { state.lab.visualNetwork = createVisualNetwork(); window.CommandDoctorTopology?.ensureTopology?.(state.lab.visualNetwork); saveVisualNetwork(state.lab.visualNetwork); syncEngineFromVisual(); renderLab(); }));
  return panel;
}

function renderLabLessonLibrary() {
  const heading = labCreate("section", "lab-lesson-library-heading");
  heading.append(labCreate("div", "lab-card-kicker", "Lesson library"), labCreate("h3", "", "Guided Lessons From First Checks to Stacking"), labCreate("p", "", "Choose a topic to study its meaning, good and bad output, safe next commands, and a simulated practice task."));
  const track = document.createElement("select");
  track.className = "lab-track-select";
  track.setAttribute("aria-label", "Switch type learning track");
  [
    ["all", "All learning tracks"],
    ["Cisco IOS", "Cisco IOS switch track"],
    ["HP Comware", "HP Comware switch track"],
    ["ArubaOS-CX", "ArubaOS-CX switch track"],
    ["Windows CMD", "Windows endpoint track"],
    ["Linux", "Linux endpoint track"]
  ].forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    track.append(option);
  });
  track.value = state.lab.vendorTrack;
  track.addEventListener("change", () => { state.lab.vendorTrack = track.value; renderLab(); });
  heading.append(labCreate("label", "lab-control-label", "Choose what you want to learn"), track);
  heading.append(labButton("Back to Interactive Lab", "secondary", () => { state.lab.screen = "dashboard"; renderLab(); }));
  els.labRoot.append(heading);

  ["foundation", "configuration"].forEach((stage) => {
    const title = stage === "foundation" ? "Foundation Lessons" : "Configuration Lessons";
    const copy = stage === "foundation" ? "Read evidence before changing anything." : "Practice controlled changes, verification, and rollback.";
    const group = labCreate("section", "lab-lesson-library-group");
    group.append(labCreate("h4", "", title), labCreate("p", "", copy));
    const grid = labCreate("div", "lab-section-grid");
    const matchingSections = state.lab.sections.filter((section) => section.stage === stage && section.lesson_ids.some((id) => {
      const lesson = state.lab.lessons.find((item) => item.id === id);
      return lesson && (state.lab.vendorTrack === "all" || lesson.vendor === state.lab.vendorTrack);
    }));
    if (matchingSections.length) {
      matchingSections.forEach((section) => grid.append(renderLabSectionCard(section, state.lab.vendorTrack)));
    } else {
      grid.append(labCreate("p", "lab-coming-soon", `No ${state.lab.vendorTrack === "all" ? "" : state.lab.vendorTrack + " "}lessons are available in this stage yet.`));
    }
    group.append(grid);
    els.labRoot.append(group);
  });
}

function renderLabConsole() {
  const consolePanel = labCreate("section", "lab-console-panel");
  consolePanel.append(labCreate("div", "lab-card-kicker", "Simulated switch console"));
  consolePanel.append(labCreate("h3", "", "Interactive Switch Lab"));
  consolePanel.append(labCreate("p", "", "Work through a realistic check, configuration, verification, and rollback on an imaginary device. The coach updates after every command; nothing leaves this browser."));
  consolePanel.append(renderManualRouteSelector());
  const engine = getLabEngine();
  const setup = labCreate("section", "lab-device-setup");
  setup.append(labCreate("div", "lab-card-kicker", "Build your simulated device"));
  setup.append(labCreate("p", "", "Choose the local training values you want to practice. These details exist only in this browser and never reach a real device."));
  const setupGrid = labCreate("div", "lab-device-setup-grid");
  const setupInputs = {};
  [
    ["Switch name", "hostname", String(engine.state.hostname).includes("<") ? "TRAINING-SWITCH" : engine.state.hostname],
    ["Port name", "interface", String(engine.selectedInterface).includes("<") ? "GigabitEthernet1/0/1" : engine.selectedInterface],
    ["Endpoint label", "endpoint", String(engine.current().description || "").includes("<") || !engine.current().description ? "PC-1" : engine.current().description],
    ["Current VLAN", "currentVlan", String(engine.current().vlan).includes("<") ? "1" : engine.current().vlan],
    ["Target VLAN", "targetVlan", String(engine.seed.targetVlan).includes("<") ? "20" : engine.seed.targetVlan]
  ].forEach(([label, key, value]) => {
    const field = labCreate("label", "lab-setup-field");
    field.append(labCreate("span", "", label));
    const input = document.createElement("input");
    input.value = value;
    input.spellcheck = false;
    input.setAttribute("aria-label", label);
    setupInputs[key] = input;
    field.append(input);
    setupGrid.append(field);
  });
  setup.append(setupGrid);
  setup.append(labButton("Apply device details", "primary", () => {
    const profile = Object.fromEntries(Object.entries(setupInputs).map(([key, input]) => [key, input.value.trim()]));
    if (Object.values(profile).some((value) => !value)) {
      showToast("Enter all simulated device details before applying them.");
      return;
    }
    engine.setTrainingProfile(profile);
    state.lab.console.activeInterface = profile.interface;
    state.lab.console.vlan = profile.currentVlan;
    state.lab.console.description = profile.endpoint;
    renderLab();
    showToast("Your simulated device details were applied locally.");
  }));
  consolePanel.append(setup);
  const selector = document.createElement("select");
  selector.className = "lab-device-select";
  [
    ["access", "Cisco IOS access-port practice"],
    ["disabled", "Cisco IOS disabled-port practice"],
    ["trunk", "Cisco IOS trunk practice"],
    ["irf", "HP Comware IRF practice"],
    ["aruba", "ArubaOS-CX LACP practice"]
  ].forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    selector.append(option);
  });
  selector.value = state.lab.console.device;
  selector.addEventListener("change", () => {
    startLabMission(SIMULATOR_MISSIONS.find((mission) => mission.device === selector.value) || { device: selector.value });
    renderLab();
  });
  const workspace = labCreate("div", "lab-simulator-workspace lab-console-only-workspace");

  const terminalPane = labCreate("section", "lab-terminal-pane");
  terminalPane.append(labCreate("label", "lab-control-label", "Simulated device"), selector);
  const activeRoute = currentTrainingRoute();
  const routeGuidance = getTrainingRouteGuidance(engine);
  const nextCommand = routeGuidance?.command || getLabGuidance(engine).command;
  const routeStatus = labCreate("section", "lab-route-status");
  routeStatus.append(labCreate("strong", "", `Route: ${activeRoute.label}`));
  routeStatus.append(labCreate("p", "", `Next step: type ${nextCommand} below, then press Enter or Run simulated command. Every command is entered by you.`));
  terminalPane.append(routeStatus);
  terminalPane.append(labCreate("div", "lab-terminal-label", "Console"));
  const terminal = labCreate("div", "lab-console-terminal");
  const transcript = engine.transcript.length
    ? engine.transcript.join("\n\n")
    : `${consolePrompt()}\nChoose the simulated device, then begin with the safe read-only command shown by the coach.`;
  terminal.append(labCreate("pre", "lab-console-output", transcript));
  const row = labCreate("div", "lab-console-input-row");
  row.append(labCreate("span", "lab-console-prompt", consolePrompt()));
  const input = document.createElement("input");
  input.className = "lab-terminal-input";
  input.id = "labTerminalInput";
  input.placeholder = "Type a simulated command";
  input.value = state.lab.console.pendingCommand || "";
  state.lab.console.pendingCommand = "";
  input.setAttribute("aria-label", "Simulated switch command");
  bindTerminalKeyboard(input, engine, terminal);
  row.append(input);
  terminal.append(row);
  terminal.addEventListener("pointerdown", (event) => { if (event.target !== input) queueTerminalFocus(input, terminal); });
  terminalPane.append(terminal);
  const controls = labCreate("div", "lab-console-actions");
  controls.append(labButton("Run simulated command", "secondary", () => runLabConsoleCommand(input)));
  controls.append(labButton("Start fresh switch", "secondary", startFreshTrainingSwitch));
  controls.append(labButton("Reset device", "secondary", () => { engine.rollback(); engine.transcript = []; engine.commands = []; renderLab(); showToast("The simulated device was reset to its starting state."); }));
  controls.append(labButton("Open focused terminal", "secondary", () => { state.lab.screen = "cli"; renderLab(); }));
  terminalPane.append(controls);
  workspace.append(terminalPane, renderLabCoach(engine));
  consolePanel.append(workspace);
  els.labRoot.append(consolePanel);
  state.lab.console.focusRequested = false;
  queueTerminalFocus(input, terminal);
}

function queueTerminalFocus(input, terminal) {
  window.setTimeout(() => {
    if (!input.isConnected) return;
    if (state.lab.console.autoScroll !== false) terminal.scrollTop = terminal.scrollHeight;
    input.focus({ preventScroll: true });
  }, 0);
}

function appendTerminalHelp(engine, value) {
  const command = value.trim();
  const registry = activeCommandRegistry();
  const suggestions = registry
    ? registry.help(command, { mode: engine?.mode || "exec", privilege: "privileged" })
    : ["show interfaces status", "show vlan brief", "show running-config", "configure terminal", "display irf", "rollback"].filter((item) => !command || item.startsWith(command.toLowerCase()));
  const lines = suggestions.map((suggestion) => typeof suggestion === "string" ? suggestion : `${suggestion.token}${suggestion.description ? `  ${suggestion.description}` : ""}`);
  engine.transcript.push(`${consolePrompt()} ${command}?\n${lines.length ? lines.join("\n") : "No local completion is available for this profile."}`);
  if (engine.transcript.length > 150) engine.transcript.splice(0, engine.transcript.length - 150);
}

function bindTerminalKeyboard(input, engine, terminal) {
  input.addEventListener("keydown", (event) => {
    const history = engine.commands || [];
    state.lab.console.historyIndex ??= history.length;
    if (event.key === "Enter") { event.preventDefault(); runLabConsoleCommand(input); return; }
    if (event.key === "ArrowUp") { event.preventDefault(); state.lab.console.historyIndex = Math.max(0, state.lab.console.historyIndex - 1); input.value = history[state.lab.console.historyIndex] || ""; return; }
    if (event.key === "ArrowDown") { event.preventDefault(); state.lab.console.historyIndex = Math.min(history.length, state.lab.console.historyIndex + 1); input.value = history[state.lab.console.historyIndex] || ""; return; }
    if (event.ctrlKey && event.key.toLowerCase() === "l") { event.preventDefault(); engine.transcript = []; state.lab.console.focusRequested = true; renderLab(); return; }
    if (event.ctrlKey && event.key.toLowerCase() === "c") { event.preventDefault(); input.value = ""; return; }
    if (event.ctrlKey && event.key.toLowerCase() === "z") { event.preventDefault(); input.value = engine.seed.vendor === "HP Comware" ? "return" : "end"; runLabConsoleCommand(input); return; }
    if (event.key === "Tab") {
      event.preventDefault();
      const registry = activeCommandRegistry();
      const completion = registry?.complete(input.value, { mode: engine?.mode || "exec", privilege: "privileged" });
      const fallback = registry ? null : ["show interfaces status", "show vlan brief", "show running-config", "configure terminal", "display irf", "display irf topology"].find((item) => item.startsWith(input.value.trim().toLowerCase()));
      const match = typeof completion === "string" ? completion : fallback;
      if (match && normalizeCommandText(match) !== normalizeCommandText(input.value)) input.value = `${match} `;
      else if (completion?.status === "ambiguous") { showToast(`Possible completions: ${completion.candidates.slice(0, 4).join(", ")}`); input.focus(); }
      return;
    }
    if (event.key === "?" && !event.ctrlKey && !event.metaKey) { event.preventDefault(); appendTerminalHelp(engine, input.value); state.lab.console.focusRequested = true; renderLab(); return; }
  });
  terminal.addEventListener("scroll", () => { state.lab.console.autoScroll = terminal.scrollHeight - terminal.scrollTop - terminal.clientHeight < 32; });
}

function renderManualRouteSelector() {
  const route = currentTrainingRoute();
  const panel = labCreate("section", "lab-manual-route-panel");
  panel.append(labCreate("strong", "", "Manual CLI training path"));
  panel.append(labCreate("span", "", `${runtimeTrainingRoutes().length} generated local routes are available. The current route is ${route.label}. Browse or filter routes in the Practice Library, then type every command yourself.`));
  panel.append(labButton("Open Practice Library", "secondary", () => { state.lab.libraryTab = "practice"; switchView("library"); }), labButton("Start current route", "primary", () => startPracticeRoute(route.id)));
  return panel;
}

function startFreshTrainingSwitch(route = currentTrainingRoute()) {
  const engine = createLabEngine(route.device);
  const profile = activeSwitchProfile();
  const interfaceName = profile?.interface_naming?.replace("{port}", "1") || "GigabitEthernet1/0/1";
  if (engine?.setTrainingProfile) engine.setTrainingProfile({ hostname: "TRAINING-SWITCH", interface: interfaceName, endpoint: "PC-1", currentVlan: "1", targetVlan: "20" });
  state.lab.console.engine = engine;
  state.lab.console.device = route.device;
  state.lab.console.routeStarted = route.id;
  state.lab.console.focusRequested = true;
  state.lab.visualNetwork = createVisualNetwork();
  state.lab.visualNetwork.hostname = "TRAINING-SWITCH";
  recordTrackActivity(route.vendor_id || route.vendor || activeTrack(), { lastLabRouteId: route.id });
  const track = trackProgress(route.vendor_id || route.vendor || activeTrack());
  track.practisedRoutes[route.id] = true;
  saveVendorProgress();
  window.CommandDoctorTopology?.ensureTopology?.(state.lab.visualNetwork);
  saveVisualNetwork(state.lab.visualNetwork);
  renderLab();
  showToast(`${route.label} is ready. Step 1 is waiting in the console.`);
}

function hasActiveWorkbenchState() {
  const shared = state.lab.switchRuntime?.state;
  if (!shared) return Boolean(state.lab.console?.routeStarted);
  const hasChanges = shared.changes().length > 0;
  const hasTerminalSession = shared.terminalHistory().length > 0;
  const hasRoute = Boolean(state.lab.console?.routeStarted);
  const hasTopology = Boolean(state.lab.visualNetwork?.cables?.length || state.lab.visualNetwork?.devices?.length);
  return hasChanges || hasTerminalSession || hasRoute || hasTopology;
}

function renderLabCliWorkspace() {
  const engine = getLabEngine();
  const toolbar = labCreate("div", "lab-focused-toolbar");
  toolbar.append(labButton("Back to Lab", "secondary", () => { state.lab.screen = labPlaygroundUnlocked() ? "playground" : "dashboard"; state.lab.console.focusRequested = true; renderLab(); }));
  const selector = document.createElement("select");
  selector.setAttribute("aria-label", "Focused terminal device");
  [["access", "Cisco IOS"], ["disabled", "Cisco IOS disabled port"], ["trunk", "Cisco IOS trunk"], ["irf", "HP Comware"], ["aruba", "ArubaOS-CX"]].forEach(([value, label]) => { const option = document.createElement("option"); option.value = value; option.textContent = label; selector.append(option); });
  selector.value = state.lab.console.device;
  selector.addEventListener("change", () => { startLabMission(SIMULATOR_MISSIONS.find((mission) => mission.device === selector.value) || { device: selector.value }); });
  toolbar.append(selector);
  toolbar.append(labButton("Clear terminal", "secondary", () => { engine.transcript = []; state.lab.console.focusRequested = true; renderLab(); }));
  toolbar.append(labButton("Reset device", "secondary", () => { engine.rollback(); engine.transcript = []; engine.commands = []; state.lab.console.focusRequested = true; renderLab(); }));
  toolbar.append(labButton("Start fresh switch", "secondary", startFreshTrainingSwitch));
  els.labRoot.append(toolbar);
  const workspace = labCreate("section", "lab-cli-workspace");
  const header = labCreate("div", "lab-cli-workspace-head");
  header.append(labCreate("div", "lab-card-kicker", "Simulated command line interface"));
  header.append(labCreate("h3", "", engine.state.hostname));
  header.append(labCreate("p", "", `${engine.seed.vendor} training console. All commands and outputs remain local to this browser.`));
  workspace.append(header);

  const terminal = labCreate("div", "lab-cli-terminal");
  const transcript = engine.transcript.length ? engine.transcript.join("\n\n") : engine.bootOutput();
  terminal.append(labCreate("pre", "lab-cli-output", transcript));
  const row = labCreate("div", "lab-cli-input-row");
  row.append(labCreate("span", "lab-console-prompt", consolePrompt()));
  const input = document.createElement("input");
  input.className = "lab-terminal-input";
  input.placeholder = "Enter a simulated command";
  input.setAttribute("aria-label", "Full simulated switch command");
  bindTerminalKeyboard(input, engine, terminal);
  row.append(input);
  terminal.append(row);
  terminal.addEventListener("pointerdown", (event) => { if (event.target !== input) queueTerminalFocus(input, terminal); });
  workspace.append(terminal);
  els.labRoot.append(workspace);
  state.lab.console.focusRequested = false;
  queueTerminalFocus(input, terminal);
}

function renderLabConfigurationLibrary() {
  const section = labCreate("section", "lab-config-library");
  const heading = labCreate("div", "lab-mission-heading");
  heading.append(labCreate("div", "lab-card-kicker", "Configuration practice"), labCreate("h4", "", "System, VLAN, and Stack Configuration"), labCreate("p", "", "Choose a drill, follow the displayed sequence in the simulated console, then use the final show command to prove the change."));
  section.append(heading);
  const grid = labCreate("div", "lab-config-grid");
  CONFIGURATION_DRILLS.forEach((drill) => {
    const card = labCreate("article", "lab-config-card");
    card.append(labCreate("h5", "", drill.title), labCreate("p", "", drill.purpose));
    const sequence = labCreate("pre", "lab-config-sequence", drill.commands.join("\n"));
    card.append(sequence);
    const device = deviceProfile(drill.device);
    card.append(labButton(`Load ${drill.title}`, "secondary", () => {
      startLabMission({ device: drill.device, id: "" });
      showToast(`${drill.title} loaded in the simulated console.`);
    }));
    grid.append(card);
  });
  section.append(grid);
  return section;
}

function renderLabMissionPath() {
  const completed = state.lab.progress.simulatorMissions || {};
  const completedCount = SIMULATOR_MISSIONS.filter((mission) => completed[mission.id]).length;
  const section = labCreate("section", "lab-mission-path");
  const heading = labCreate("div", "lab-mission-heading");
  const foundationCount = labFoundationLessons().length;
  const configurationCount = state.lab.lessons.filter((lesson) => isConfigurationLesson(lesson)).length;
  heading.append(
    labCreate("div", "lab-card-kicker", "Guided console missions"),
    labCreate("h4", "", "6 Hands-on Switch Missions"),
    labCreate("p", "", `${completedCount} of ${SIMULATOR_MISSIONS.length} console missions complete. These are practical simulations, separate from the course lessons.`),
    labCreate("p", "lab-mission-library-note", `${foundationCount} Foundation lessons and ${configurationCount} Configuration lessons are available in the course library.`),
    labButton(`Open all ${state.lab.lessons.length} course lessons`, "secondary", () => { state.lab.screen = "lessons"; renderLab(); })
  );
  section.append(heading);
  const grid = labCreate("div", "lab-mission-grid");
  SIMULATOR_MISSIONS.forEach((mission, index) => {
    const active = state.lab.console.missionId === mission.id;
    const card = labCreate("article", `lab-mission-card ${active ? "is-active" : ""} ${completed[mission.id] ? "is-complete" : ""}`);
    const meta = labCreate("div", "lab-mission-meta");
    meta.append(labCreate("span", "", `${index + 1}. ${mission.phase}`), labCreate("span", "", completed[mission.id] ? "Complete" : active ? "In progress" : "Ready"));
    card.append(meta, labCreate("h5", "", mission.title), labCreate("p", "", mission.description));
    const command = labCreate("code", "lab-mission-command", mission.command);
    card.append(command, labButton(active ? "Current mission" : completed[mission.id] ? "Practice again" : "Start mission", "secondary", () => startLabMission(mission)));
    grid.append(card);
  });
  section.append(grid);
  return section;
}

function startLabMission(mission) {
  const device = mission.device || "access";
  const candidate = profileForSimulatorDevice(device);
  // Keep a selected model when it already belongs to the requested vendor. A
  // Cisco 9300 must not be silently replaced by the first Cisco profile.
  if (candidate && (!activeSwitchProfile() || activeSwitchProfile().vendor !== candidate.vendor)) activateSwitchProfile(candidate.profile_id);
  state.lab.console = {
    device,
    missionId: mission.id || (SIMULATOR_MISSIONS.find((item) => item.device === device)?.id || ""),
    mode: "exec",
    activeInterface: deviceProfile(device).port,
    vlan: deviceProfile(device).vlan,
    description: deviceProfile(device).endpoint,
    transcript: [],
    engine: createLabEngine(device)
  };
  renderLab();
}

function currentLabMission() {
  return SIMULATOR_MISSIONS.find((mission) => mission.id === state.lab.console.missionId) || null;
}

function labMissionComplete(mission, engine) {
  if (!mission) return false;
  const used = (test) => engine.commands.some((command) => test.test(command));
  if (mission.id === "first-check") return used(/^(show interface status|show interfaces status|sh int status)$/);
  if (mission.id === "access-vlan" || mission.id === "port-recovery" || mission.id === "switch-verification") return engine.verify() && used(/^show running-config interface/);
  if (mission.id === "irf-investigation") return used(/^display irf topology$/) && used(/^display irf-port/);
  if (mission.id === "lacp-investigation") return used(/^show interface brief$/) && used(/^show lacp interfaces$/);
  return false;
}

function renderLabDeviceVisual(engine) {
  const current = engine.current();
  const pane = labCreate("section", "lab-device-pane");
  pane.append(labCreate("span", "lab-pane-kicker", `${engine.seed.vendor} - simulated hardware`));
  pane.append(labCreate("h4", "", engine.state.hostname));
  pane.append(labCreate("p", "lab-device-issue", `Training condition: ${engine.seed.issue}`));

  const switchFace = labCreate("div", "switch-face");
  const switchHead = labCreate("div", "switch-face-head");
  switchHead.append(labCreate("strong", "", engine.state.hostname), labCreate("span", "switch-power", "POWER"));
  switchFace.append(switchHead);
  const ports = labCreate("div", "switch-ports");
  const focusPort = Math.min(Number(String(engine.selectedInterface).split("/").at(-1)) || 1, 24);
  for (let index = 1; index <= 24; index += 1) {
    const isActive = index === focusPort;
    const port = labCreate("button", `switch-port ${isActive ? (current.shutdown || !current.connected ? "is-down" : "is-active") : ""}`, "");
    port.type = "button";
    port.title = isActive ? `${engine.selectedInterface}: ${current.shutdown ? "administratively down" : current.connected ? "connected" : "link down"}` : `Simulated port ${index}`;
    port.setAttribute("aria-label", port.title);
    port.addEventListener("click", () => {
      showToast(isActive ? `${engine.selectedInterface}: ${current.shutdown ? "administratively down" : current.connected ? `connected on VLAN ${current.vlan}` : "link down"}` : `Port ${index} is not part of this training task.`);
    });
    ports.append(port);
  }
  switchFace.append(ports);
  switchFace.append(labCreate("small", "switch-interface-label", `Focus port: ${engine.selectedInterface}`));
  pane.append(switchFace);

  const status = labCreate("dl", "lab-device-status");
  [["Endpoint", engine.seed.endpoint], ["Port status", current.shutdown ? "Administratively down" : current.connected ? "Connected" : "Link down"], ["Access VLAN", String(current.vlan)], ["Change status", engine.verify() ? "Verified" : "Needs verification"]].forEach(([label, value]) => {
    const row = labCreate("div", "lab-device-status-row");
    row.append(labCreate("dt", "", label), labCreate("dd", "", value));
    status.append(row);
  });
  pane.append(status);
  return pane;
}

function renderLabCoach(engine) {
  const coach = labCreate("aside", "lab-coach-pane");
  const guidance = getTrainingRouteGuidance(engine) || getLabGuidance(engine);
  coach.append(labCreate("span", "lab-pane-kicker", "Guidance"));
  coach.append(labCreate("h4", "", guidance.title));
  coach.append(labCreate("p", "lab-coach-copy", guidance.explanation));
  const next = labCreate("div", "lab-next-command");
  next.append(labCreate("span", "", "Recommended next command"), labCreate("code", "", guidance.command));
  coach.append(next);
  coach.append(labCreate("p", "lab-coach-why", guidance.why));
  const safety = labCreate("div", "lab-safety-note");
  safety.append(labCreate("strong", "", "Safety check"), labCreate("span", "", guidance.safety));
  coach.append(safety);
  const milestones = labCreate("ol", "lab-milestones");
  guidance.milestones.forEach(([label, done]) => {
    const item = labCreate("li", done ? "is-complete" : "", label);
    milestones.append(item);
  });
  coach.append(milestones);
  return coach;
}

function getTrainingRouteGuidance(engine) {
  const route = currentTrainingRoute();
  if (!route?.steps?.length) return null;
  const normalize = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  const used = new Set(engine.commands.map(normalize));
  const isComplete = (step) => [step.command, ...(step.alternatives || [])].some((command) => used.has(normalize(command)));
  const nextIndex = route.steps.findIndex((step) => !isComplete(step));
  const complete = nextIndex === -1;
  const step = complete ? null : route.steps[nextIndex];
  const commandNeedsInterfaceMode = /^(?:switchport|port access|port link-type|vlan access|description|shutdown|no shutdown|undo shutdown)\b/i.test(step?.command || "");
  const commandNeedsConfigMode = /^(?:interface|vlan|hostname|sysname|switch \S+ priority|irf member)\b/i.test(step?.command || "");
  if (!complete && ((commandNeedsInterfaceMode && engine.mode !== "interface") || (commandNeedsConfigMode && engine.mode !== "config"))) return null;
  return {
    title: complete ? "Full Configuration Verified" : `Guided Route: ${route.label}`,
    explanation: complete ? "You manually completed every route checkpoint. Review the actual simulated switch state, then decide whether to save or reset for another attempt." : `Step ${nextIndex + 1} of ${route.steps.length}: enter ${step.command}, then review the resulting simulated output.`,
    command: complete ? "show running-config" : step.command,
    why: complete ? "A final read-only review confirms the state before you preserve it." : "Type this command yourself in the terminal. You may use an approved alternative when one is shown.",
    safety: "This is an offline browser simulation. The coach does not execute commands or make changes for you.",
    milestones: route.steps.map((item, index) => [`${index + 1}. ${item.command}`, isComplete(item)])
  };
}

function getLabGuidance(engine) {
  const used = (test) => engine.commands.some((command) => test.test(command));
  const current = engine.current();
  const isCisco = engine.seed.vendor === "Cisco IOS";
  const checkCommand = engine.seed.vendor === "HP Comware" ? "display irf topology" : engine.seed.vendor === "ArubaOS-CX" ? "show interface brief" : "show interface status";
  const checked = used(/^(show interface status|show interfaces status|sh int status|display irf topology|show interface brief)$/);
  const configured = current.vlan !== engine.baseline.interfaces[engine.selectedInterface]?.vlan || current.shutdown !== engine.baseline.interfaces[engine.selectedInterface]?.shutdown;
  const verified = used(/^(show running-config interface|show interface status|show interfaces status|sh int status|display irf topology|show interface brief)/) && engine.verify();
  const configureCommand = engine.seed.vendor === "HP Comware" ? "system-view" : "configure terminal";
  const vlanCommand = isCisco ? `switchport access vlan ${engine.seed.targetVlan}` : engine.seed.vendor === "HP Comware" ? `port access vlan ${engine.seed.targetVlan}` : `vlan access ${engine.seed.targetVlan}`;
  const targetNeedsVlan = engine.seed.vlan !== engine.seed.targetVlan;
  const targetNeedsEnable = Boolean(engine.seed.shutdown);

  if (!checked) return { title: "Start With Evidence", explanation: `The simulated ${engine.seed.hostname} has a training condition: ${engine.seed.issue}. Read its current state before making a change.`, command: checkCommand, why: "A read-only check shows the current port or stack state without changing anything.", safety: "Do not configure or save until the observed output supports the change.", milestones: [["Read current state", false], ["Enter configuration only when justified", false], ["Verify the result", false], ["Save or roll back", false]] };
  if (engine.seed.vendor === "HP Comware") {
    const focused = used(/^display irf-port/);
    return { title: focused ? "IRF Evidence Collected" : "Investigate the IRF Port", explanation: focused ? "You have collected both topology and IRF-port evidence. The simulated fault points to the stack-link path, so the next production step would be an approved physical inspection and a clear ticket." : "The IRF topology shows a simulated stack-link fault. Collect the IRF-port detail before deciding the safe next action.", command: focused ? "rollback" : "display irf-port", why: focused ? "Reset the simulation when you are ready to repeat the investigation." : "This identifies the affected member and IRF port without changing stack state.", safety: "Do not reset a stack or change IRF membership during an active incident without an approved change plan.", milestones: [["Read current state", true], ["Collect focused evidence", focused], ["Record safe next action", focused], ["Create ticket summary", focused]] };
  }
  if (engine.seed.vendor === "ArubaOS-CX") {
    const focused = used(/^show lacp interfaces$/);
    return { title: focused ? "LACP Evidence Collected" : "Inspect the LACP Member", explanation: focused ? "The simulated member and LACP state have been collected. Use this evidence to confirm the partner, bundle, and approved remediation before touching configuration." : "The interface brief shows the simulated LACP condition. Collect the LACP member state before proposing a change.", command: focused ? "rollback" : "show lacp interfaces", why: focused ? "Reset the simulation when you are ready to practice the investigation again." : "This adds the bundle-level evidence needed to distinguish a local port issue from an aggregation mismatch.", safety: "Do not change LACP membership during an active incident without an approved change plan.", milestones: [["Read current state", true], ["Collect LACP evidence", focused], ["Record safe next action", focused], ["Create ticket summary", focused]] };
  }
  if (!targetNeedsVlan && !targetNeedsEnable) return { title: "Healthy Reference Confirmed", explanation: `${engine.selectedInterface} is the known-good comparison port. Its observed status and VLAN provide a baseline for troubleshooting another access port.`, command: "show vlan brief", why: "A healthy reference lets you compare expected VLAN membership before changing a faulty port.", safety: "Do not alter a healthy reference port simply to make outputs match.", milestones: [["Read current state", true], ["Confirm expected VLAN", false], ["Use as comparison", false], ["Keep configuration unchanged", true]] };
  if (!configured) return { title: "Make the Controlled Change", explanation: targetNeedsEnable ? `${engine.selectedInterface} is administratively down. Enter configuration mode and enable the simulated port.` : `The port is on VLAN ${current.vlan}; the intended training VLAN is ${engine.seed.targetVlan}. Enter configuration mode, select the interface, then apply the VLAN change.`, command: engine.mode === "exec" ? configureCommand : engine.mode === "config" ? `interface ${engine.seed.interface}` : targetNeedsEnable ? "no shutdown" : vlanCommand, why: engine.mode === "exec" ? "Configuration mode is required before changing a port." : engine.mode === "config" ? "Select only the intended interface before making a change." : "Apply only the approved correction to the selected simulated port.", safety: "Confirm the interface, VLAN, and change approval before continuing.", milestones: [["Read current state", true], ["Enter configuration only when justified", engine.mode !== "exec"], ["Apply minimal change", false], ["Verify the result", false], ["Save or roll back", false]] };
  if (engine.mode !== "exec") return { title: "Return and Verify", explanation: "The simulated change is staged. Leave configuration mode and inspect the running interface configuration before you consider saving it.", command: "end", why: "Verification should be performed from privileged EXEC mode using a read-only show command.", safety: "A successful command is not proof of a correct change. Verify the expected port state.", milestones: [["Read current state", true], ["Enter configuration only when justified", true], ["Apply minimal change", true], ["Verify the result", false], ["Save or roll back", false]] };
  if (!verified) return { title: "Verify the Intended State", explanation: `The simulated port now has VLAN ${current.vlan}${current.shutdown ? " and is shut down" : ""}. Confirm its active configuration before saving.`, command: `show running-config interface ${engine.selectedInterface}`, why: "The running configuration proves the interface has the intended access VLAN and administrative state.", safety: "Never save based only on the configuration command response.", milestones: [["Read current state", true], ["Enter configuration only when justified", true], ["Apply minimal change", true], ["Verify the result", false], ["Save or roll back", false]] };
  return { title: "Verified - Choose Save or Rollback", explanation: `The simulated ${engine.selectedInterface} now meets the training target. You can practice a safe save acknowledgement or roll the device back and try again.`, command: "write memory", why: "The simulator permits a save only after verification. Use rollback to return to the starting condition.", safety: "In production, save only after approval and validation of the connected service.", milestones: [["Read current state", true], ["Enter configuration only when justified", true], ["Apply minimal change", true], ["Verify the result", true], ["Save or roll back", false]] };
}

function deviceProfile(device) {
  const profiles = {
    access: { name: "TRAINING-SWITCH", vendor: "Cisco IOS", port: "GigabitEthernet1/0/1", endpoint: "PC-1", vlan: "1" },
    disabled: { name: "TRAINING-SWITCH", vendor: "Cisco IOS", port: "GigabitEthernet1/0/1", endpoint: "PC-1", vlan: "20" },
    trunk: { name: "TRAINING-SWITCH", vendor: "Cisco IOS", port: "GigabitEthernet1/0/24", endpoint: "UPLINK-SWITCH", vlan: "20" },
    irf: { name: "COMWARE-LAB", vendor: "HP Comware", port: "GigabitEthernet1/0/24", endpoint: "1", vlan: "1" },
    aruba: { name: "ARUBA-LAB", vendor: "ArubaOS-CX", port: "GigabitEthernet1/0/1", endpoint: "PC-1", vlan: "1" }
  };
  return profiles[device] || profiles.access;
}

function consolePrompt() {
  const engine = getLabEngine();
  if (engine) return engine.prompt();
  const profile = deviceProfile(state.lab.console.device);
  if (state.lab.console.mode === "config") return `${profile.name}(config)#`;
  if (state.lab.console.mode === "interface") return `${profile.name}(config-if)#`;
  return profile.vendor === "HP Comware" ? `<${profile.name}>` : `${profile.name}#`;
}

function runLabConsoleCommand(input) {
  const command = input.value.trim().replace(/\s+/g, " ");
  if (!command) {
    showToast("Enter a simulated command first.");
    return;
  }
  const engine = getLabEngine();
  const prompt = consolePrompt();
  const registry = activeCommandRegistry();
  const catalogResolution = registry?.resolve(command, { mode: engine?.mode || "exec", privilege: "privileged" });
  if (["wrong_vendor", "wrong_operating_system", "wrong_version", "wrong_model", "capability_missing", "feature_disabled", "license_unavailable", "wrong_mode", "insufficient_privilege"].includes(catalogResolution?.status)) {
    const expected = catalogResolution.command.vendor_label || catalogResolution.command.vendor;
    const actual = activeSwitchProfile()?.vendor_label || "the active training profile";
    const output = `${command}\n\nThis command is unavailable for the active ${actual} profile: ${catalogResolution.status.replace(/_/g, " ")}. ${catalogResolution.status === "wrong_vendor" ? `It belongs to ${expected}.` : "Use a command supported by the selected profile and current CLI mode."}`;
    engine?.transcript.push(`${prompt} ${command}\n${output}`);
    input.value = "";
    state.lab.console.focusRequested = true;
    renderLab();
    return;
  }
  if (catalogResolution?.status === "ambiguous" || catalogResolution?.status === "incomplete") {
    const matches = catalogResolution.matches || [catalogResolution.command];
    const output = `Possible commands for this profile:\n${matches.filter(Boolean).map((item) => item.canonical_command).join("\n")}`;
    engine?.transcript.push(`${prompt} ${command}\n${output}`);
    input.value = "";
    state.lab.console.focusRequested = true;
    renderLab();
    return;
  }
  // Capture the shared running state before any CLI or visual handler mutates it.
  const runtimeBefore = state.lab.switchRuntime?.state
    ? JSON.parse(JSON.stringify(state.lab.switchRuntime.state.running))
    : {};
  const changesBefore = state.lab.switchRuntime?.state
    ? JSON.parse(JSON.stringify(state.lab.switchRuntime.state.changes()))
    : [];
  let authoritativeDiff = "";
  let result = engine ? engine.execute(command) : { output: simulateLabCommand(command), diff: "Simulator engine unavailable." };
  const runtime = state.lab.switchRuntime?.state;
  const verificationTarget = runtime?.verificationTargetForCommand(command);
  const runningConfigMatch = command.match(/^show running-config interface\s+(\S+)$/i);
  if (runtime && verificationTarget) {
    result = { ...result, ok: true, kind: "verification", output: runtimeInterfaceConfiguration(runtime, verificationTarget.interface_name, "running", activeSwitchProfile()) };
    result.verified = runtime.verifyInterfaceDescription(verificationTarget.interface_name, command, result.output, { command_id: catalogResolution?.command?.command_id, handler_id: catalogResolution?.command?.handler_id, canonical_command: catalogResolution?.command?.canonical_command });
    const record = runtime.verification(verificationTarget.interface_name);
    result.verification_policy_id = record.policy_id;
    result.verification_record_id = record.verification_id;
  } else if (result.ok && runtime && runningConfigMatch) {
    const interfaceName = runningConfigMatch[1];
    result = { ...result, output: runtimeInterfaceConfiguration(runtime, interfaceName, "running", activeSwitchProfile()) };
  }
  if (result.ok && runtime && /^show startup-config$/i.test(command)) {
    result = { ...result, output: runtimeStartupConfiguration(runtime) };
  }
  if (engine && !result.ok && result.kind === "unknown" && catalogResolution?.status === "matched") {
    const known = catalogResolution?.status === "matched" ? { command: catalogResolution.command.canonical_command, meaning: catalogResolution.command.purpose, support: catalogResolution.command.simulator_support } : findKnownLabCommand(command);
    if (known && ["output_simulation", "explanation_only"].includes(known.support)) {
      result = {
        ...result,
        ok: true,
        kind: "catalog",
        output: `Recognized offline command: ${known.command}\n${known.meaning}\n\nSimulation support: ${String(known.support || "explanation only").replace(/_/g, " ")}. This command is available for study in Command Lookup; a device-specific state handler has not been authored for this practice device yet.`
      };
    }
  }
  if (engine) {
    const isModeNavigation = /^(configure terminal|conf t|system-view|end|return|exit|interface\s+\S+|vlan\s+\S+)$/i.test(command);
    const isSaveRequest = /^(write memory|wr mem|write mem|copy running-config startup-config|save|save force)$/i.test(command);
    if (state.lab.switchRuntime?.state) {
      const shared = state.lab.switchRuntime.state;
      const commandId = catalogResolution?.command?.command_id || "unclassified";
      if (isSaveRequest) {
        const saved = shared.save(commandId, commandEventMetadata(catalogResolution, command, prompt.includes("config-if") ? "interface" : prompt.includes("config") ? "config" : "exec", engine.mode || "exec"));
        result = { ...result, ok: saved.ok, kind: saved.ok ? "save" : "warning", output: saved.message, save_gate: saved };
      } else if (result.ok && result.kind === "rollback") {
        shared.rollbackUnsaved();
        hydrateEngineFromRuntime(engine);
      } else if (result.ok) {
        syncRuntimeFromEngine(engine, commandId, command);
      }
      if (result.kind !== "save" && result.kind !== "rollback" && !result.save_gate) {
        const changedRecords = result.ok ? pendingChangeRecordsSince(shared, changesBefore) : [];
        const changedFields = changedRecords.map((change) => change.field);
        authoritativeDiff = formatAuthoritativeConfigurationDiff(changedRecords);
        const isPolicyVerification = Boolean(verificationTarget);
        shared.record({ ...commandEventMetadata(catalogResolution, command, prompt.includes("config-if") ? "interface" : prompt.includes("config") ? "config" : "exec", engine.mode || "exec", changedFields, result), success: Boolean(result.ok), failure_type: result.ok ? "" : (catalogResolution?.status || result.kind || "command_rejected"), state_before: runtimeBefore, state_after: result.ok ? JSON.parse(JSON.stringify(shared.running)) : runtimeBefore, safety_result: result.ok ? "accepted" : "rejected", verification_result: isPolicyVerification ? (result.verified ? "passed" : "failed") : "not_run", save_result: "" });
      }
      persistSwitchRuntime();
    }
    engine.transcript.push(`${prompt} ${command}\n${result.output}${authoritativeDiff && !isModeNavigation ? `\n\nConfiguration diff\n${authoritativeDiff}` : ""}`);
    if (engine.transcript.length > 150) engine.transcript.splice(0, engine.transcript.length - 150);
    const mission = currentLabMission();
    if (labMissionComplete(mission, engine) && !state.lab.progress.simulatorMissions[mission.id]) {
      state.lab.progress.simulatorMissions[mission.id] = true;
      saveLabProgress();
      showToast(`${mission.title} completed. Choose the next mission when you are ready.`);
    }
  } else {
    state.lab.console.transcript.push(`${prompt} ${command}\n${result.output}`);
  }
  input.value = "";
  state.lab.console.historyIndex = engine?.commands?.length || 0;
  state.lab.console.focusRequested = true;
  renderLab();
}

function syncVisualCliCommand(command, engine) {
  const network = visualNetwork();
  const lower = command.toLowerCase();
  const selectedPort = () => visualPort(network, engine?.selectedInterface || network.selectedPort);
  const interfaceMatch = command.match(/^interface\s+(GigabitEthernet1\/0\/\d+)$/i);
  if (interfaceMatch) {
    network.selectedPort = interfaceMatch[1];
    if (engine) engine.selectedInterface = interfaceMatch[1];
    syncEngineFromVisual();
    return { ok: true, kind: "config", output: `Selected local simulated interface ${interfaceMatch[1]}.` };
  }
  const vlanMatch = command.match(/^vlan\s+(\d+)$/i);
  if (vlanMatch && engine?.mode === "vlan") {
    const id = vlanMatch[1];
    network.vlans[id] ||= { name: `VLAN-${id}` };
    network.selectedVlan = id;
    syncEngineFromVisual();
    return { ok: true, kind: "config", output: `Created or selected local simulated VLAN ${id}.` };
  }
  if (/^name\s+/.test(lower) && engine?.mode === "vlan" && network.selectedVlan) {
    network.vlans[network.selectedVlan] ||= {};
    network.vlans[network.selectedVlan].name = command.slice(5).trim().toUpperCase();
    syncEngineFromVisual();
    return { ok: true, kind: "config", output: `Named local simulated VLAN ${network.selectedVlan} ${network.vlans[network.selectedVlan].name}.` };
  }
  const port = selectedPort();
  if (port && /^description\s+/.test(lower) && engine?.mode === "interface") {
    port.description = command.slice(12).trim(); port.lastActivity = "Description updated"; syncEngineFromVisual();
    return { ok: true, kind: "config", output: `Description set on ${port.name}.` };
  }
  const accessMatch = command.match(/^switchport access vlan\s+(\d+)$/i);
  if (port && accessMatch && engine?.mode === "interface") {
    const id = accessMatch[1];
    if (!network.vlans[id]) return { ok: false, kind: "warning", output: `VLAN ${id} does not exist in the local simulation. Create it first.` };
    port.vlan = id; port.mode = "access"; port.lastActivity = `Access VLAN ${id} applied`; visualMacRefresh(network); syncEngineFromVisual();
    return { ok: true, kind: "config", output: `${port.name} is now a local access port in VLAN ${id}.` };
  }
  if (port && /^switchport mode access$/i.test(command) && engine?.mode === "interface") { port.mode = "access"; syncEngineFromVisual(); return { ok: true, kind: "config", output: `${port.name} set to access mode.` }; }
  if (port && /^switchport mode trunk$/i.test(command) && engine?.mode === "interface") { port.mode = "trunk"; syncEngineFromVisual(); return { ok: true, kind: "config", output: `${port.name} set to trunk mode.` }; }
  if (port && /^switchport trunk allowed vlan\s+/.test(lower) && engine?.mode === "interface") { port.allowedVlans = command.split(/\s+/).slice(4).join(" "); syncEngineFromVisual(); return { ok: true, kind: "config", output: `${port.name} allowed VLANs set to ${port.allowedVlans}.` }; }
  if (port && /^shutdown$/i.test(command) && engine?.mode === "interface") { port.adminUp = false; port.lastActivity = "Port shut down"; visualMacRefresh(network); syncEngineFromVisual(); return { ok: true, kind: "config", output: `${port.name} administratively down in the local simulation.` }; }
  if (port && /^no shutdown$/i.test(command) && engine?.mode === "interface") { port.adminUp = true; port.lastActivity = "Port enabled"; visualMacRefresh(network); syncEngineFromVisual(); return { ok: true, kind: "config", output: `${port.name} administratively enabled in the local simulation.` }; }
  if (/^show interfaces? status$/i.test(command) || /^show interface status$/i.test(command)) return { ok: true, kind: "show", output: visualInterfaceStatus(network) };
  const detailMatch = command.match(/^show interface\s+(GigabitEthernet1\/0\/\d+)$/i);
  if (detailMatch) return { ok: true, kind: "show", output: visualInterfaceDetail(network, detailMatch[1]) };
  if (/^show vlan brief$/i.test(command)) return { ok: true, kind: "show", output: visualVlanBrief(network) };
  if (/^show mac address-table(?: interface .+)?$/i.test(command)) return { ok: true, kind: "show", output: visualMacTable(network) };
  if (/^show running-config interface/i.test(command)) return { ok: true, kind: "show", output: visualRunningInterface(network, port?.name || network.selectedPort) };
  if (/^show running-config$/i.test(command)) return { ok: true, kind: "show", output: Object.keys(network.ports).filter((name) => { const item = visualPort(network, name); return item.description || item.vlan !== "1" || !item.adminUp; }).map((name) => visualRunningInterface(network, name)).join("\n\n") || "! No local simulated interface changes" };
  if (/^show ip interface brief$/i.test(command)) return { ok: true, kind: "show", output: network.devices.map((device) => `${device.name.padEnd(14)} ${device.ip || "unassigned"}  ${device.port || "down"}`).join("\n") };
  if (/^show interfaces trunk$/i.test(command)) return { ok: true, kind: "show", output: Object.values(network.ports).filter((item) => item.mode === "trunk").map((item) => `${item.name}  trunking  allowed ${item.allowedVlans}`).join("\n") || "No local simulated trunk ports." };
  if (/^ping\s+/i.test(command)) {
    const source = visualDevice(network); const target = network.devices.find((device) => device.ip === command.split(/\s+/).at(-1));
    if (!source || !target) return { ok: false, kind: "warning", output: "Choose a simulated source device and use a configured local IP address." };
    runVisualPing(source.id, target.id);
    return { ok: true, kind: "show", output: source.lastPing };
  }
  if (/^(write memory|copy running-config startup-config)$/i.test(command)) { network.saved = true; return { ok: true, kind: "save", output: "Local simulated running configuration saved." }; }
  return null;
}

function visualInterfaceStatus(network) {
  return `Port                 Name                 Status       Vlan\n${Object.values(network.ports).map((port) => `${port.name.padEnd(21)} ${(port.description || "-").padEnd(20)} ${(visualPortIsUp(port) ? "connected" : port.adminUp ? "notconnect" : "disabled").padEnd(12)} ${port.vlan}`).join("\n")}`;
}

function visualInterfaceDetail(network, name) {
  const port = visualPort(network, name); if (!port) return `Interface ${name} is not present in this local simulation.`;
  return `${port.name} is ${visualPortIsUp(port) ? "up" : port.adminUp ? "down" : "administratively down"}, line protocol is ${visualPortIsUp(port) ? "up" : "down"}\n Description: ${port.description || "-"}\n switchport mode ${port.mode}\n access VLAN ${port.vlan}\n speed ${port.speed}, duplex ${port.duplex}\n cable test ${port.cable}`;
}

function visualVlanBrief(network) {
  return `VLAN  Name                 Status    Ports\n${Object.entries(network.vlans).map(([id, vlan]) => `${id.padEnd(5)} ${String(vlan.name).padEnd(20)} active    ${Object.values(network.ports).filter((port) => port.mode === "access" && port.vlan === id).map((port) => port.name).join(", ") || "-"}`).join("\n")}`;
}

function visualMacTable(network) {
  return `Vlan  Mac Address          Type       Ports\n${network.macs.map((entry) => `${entry.vlan.padEnd(5)} ${entry.mac.padEnd(20)} ${entry.type.padEnd(10)} ${entry.interface}`).join("\n") || "No dynamic MAC addresses learned."}`;
}

function visualRunningInterface(network, name) {
  const port = visualPort(network, name); if (!port) return "";
  return `interface ${port.name}\n description ${port.description || "-"}\n switchport mode ${port.mode}\n${port.mode === "trunk" ? ` switchport trunk allowed vlan ${port.allowedVlans}` : ` switchport access vlan ${port.vlan}`}\n ${port.adminUp ? "no shutdown" : "shutdown"}`;
}

function findKnownLabCommand(rawCommand) {
  const normalized = normalizeCommandText(rawCommand);
  return state.commands.find((item) => {
    const template = normalizeCommandText(item.command);
    if (template === normalized) return true;
    if (!template.includes("<")) return false;
    const expression = `^${template.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/<[^>]+>/g, "[^ ]+")}$`;
    return new RegExp(expression).test(normalized);
  }) || null;
}

function createLabEngine(device) {
  const engine = window.CommandDoctorLabEngine ? new window.CommandDoctorLabEngine.SimulatedDeviceEngine(device) : null;
  return hydrateEngineFromRuntime(engine);
}

function getLabEngine() {
  if (!state.lab.console.engine) state.lab.console.engine = createLabEngine(state.lab.console.device);
  return state.lab.console.engine;
}

function simulateLabCommand(command) {
  const lower = command.toLowerCase();
  const profile = deviceProfile(state.lab.console.device);
  const consoleState = state.lab.console;
  if (/^(configure terminal|conf t|system-view)$/.test(lower)) { consoleState.mode = "config"; return "Enter configuration mode. Simulation only."; }
  if (/^(end|exit)$/.test(lower)) { consoleState.mode = "exec"; return "Return to privileged mode."; }
  if (consoleState.mode === "config" && /^interface\s+/.test(lower)) { consoleState.mode = "interface"; consoleState.activeInterface = command.split(/\s+/).slice(1).join(" "); return `Selected simulated interface ${consoleState.activeInterface}.`; }
  if (consoleState.mode === "interface" && /^switchport access vlan\s+\d+/.test(lower)) { consoleState.vlan = command.match(/\d+$/)[0]; return `Simulated access VLAN set to ${consoleState.vlan}. Verify before saving.`; }
  if (consoleState.mode === "interface" && /^description\s+/.test(lower)) { consoleState.description = command.slice(12).trim(); return `Simulated description set to ${consoleState.description}.`; }
  if (consoleState.mode === "interface" && /^(no shutdown|undo shutdown)$/.test(lower)) return "Simulated interface is administratively enabled. Check physical state and VLAN next.";
  if (/^(show interface status|show interfaces status|sh int status)$/.test(lower)) return `Port        Name              Status     Vlan\n${consoleState.activeInterface}  ${consoleState.description}  connected  ${consoleState.vlan}`;
  if (/^(show vlan brief|sh vlan brief)$/.test(lower)) return `VLAN  Name        Status    Ports\n${consoleState.vlan}    TRAINING-${consoleState.vlan}  active    ${consoleState.activeInterface}`;
  if (/^show running-config interface/.test(lower)) return `interface ${consoleState.activeInterface}\n description ${consoleState.description}\n switchport access vlan ${consoleState.vlan}\n no shutdown`;
  if (/^show cdp neighbors/.test(lower)) return `Device ID       Local Intrfce             Platform\nUPLINK-SWITCH   ${consoleState.activeInterface}  CD-SW24`;
  if (/^display irf$/.test(lower)) return "MemberID  Role     Priority\n1         Master   10";
  if (/^display irf topology/.test(lower)) return "Topology Info\nMember 1  GigabitEthernet1/0/24 UP";
  if (/^show interface brief/.test(lower)) return `Interface  Status  Speed\n${profile.port}     up      1G`;
  if (/^(write memory|copy running-config startup-config|save)$/.test(lower)) return "Simulated configuration saved. In real work, save only after approved verification.";
  const knownCommand = state.commands.find((item) => normalizeCommandText(item.command) === normalizeCommandText(command));
  if (knownCommand) {
    return `Recognized offline command: ${knownCommand.command}\n${knownCommand.meaning}\n\nThis command is available in Command Lookup. A detailed device-specific simulation has not been authored for this device yet.`;
  }
  return "Unknown simulated command. Try show interface status, show vlan brief, show running-config interface GigabitEthernet1/0/1, configure terminal, display irf, or display irf topology.";
}

function renderLabSectionCard(section, vendorTrack = "all") {
  const lessons = section.lesson_ids
    .map((id) => state.lab.lessons.find((lesson) => lesson.id === id))
    .filter((lesson) => lesson && (vendorTrack === "all" || lesson.vendor === vendorTrack));
  const percent = labProgressPercent(lessons);
  const card = labCreate("article", "lab-section-card");
  card.append(labCreate("h4", "", section.title));
  card.append(labCreate("p", "", section.description));
  const meta = labCreate("div", "lab-section-meta", `${section.difficulty} | ${lessons.length} lesson${lessons.length === 1 ? "" : "s"} | ${percent}%`);
  card.append(meta);
  const bar = labCreate("div", "lab-progress-track");
  const fill = labCreate("span", "lab-progress-fill");
  fill.style.width = `${percent}%`;
  bar.append(fill);
  card.append(bar);
  if (!lessons.length) {
    card.append(labCreate("span", "lab-coming-soon", "More lessons coming soon"));
  } else {
    lessons.forEach((lesson) => card.append(labButton(state.lab.progress.completedLessons[lesson.id] ? `Review ${lesson.title}` : `Start ${lesson.title}`, "secondary lab-lesson-button", () => openLabLesson(lesson.id))));
  }
  return card;
}

function openLabStage(stageId) {
  if (!labStageUnlocked(stageId)) {
    const requirement = stageId === "configuration" ? "Complete the Foundation checkpoint with 80% or higher first." : "Complete four Foundation lessons first.";
    showToast(`${requirement} Trainer Controls can unlock local practice for review.`);
    return;
  }
  if (stageId === "playground") {
    state.lab.screen = "playground";
    renderLab();
    return;
  }
  state.lab.activeStageId = stageId;
  state.lab.screen = "stage";
  renderLab();
}

function openLabLesson(lessonId) {
  const lesson = state.lab.lessons.find((item) => item.id === lessonId);
  if (!lesson || (isConfigurationLesson(lesson) && !labConfigurationUnlocked())) {
    showToast("Complete the Foundation final quiz first.");
    return;
  }
  state.lab.screen = "lesson";
  state.lab.activeLessonId = lessonId;
  state.lab.practiceInput = "";
  state.lab.practicePassed = false;
  state.lab.quizSelection = null;
  state.lab.progress.lastLessonId = lessonId;
  saveLabProgress();
  renderLab();
}

function renderLabLesson() {
  const lesson = state.lab.lessons.find((item) => item.id === state.lab.activeLessonId);
  if (!lesson) { state.lab.screen = "dashboard"; renderLab(); return; }
  const section = state.lab.sections.find((item) => item.id === lesson.section_id);
  const stage = state.lab.stages.find((item) => item.id === section?.stage);
  renderLabBreadcrumb([{ label: "Lab Mode", screen: "dashboard" }, { label: stage?.title || "Stage", screen: "stage", stageId: section?.stage }, { label: section?.title || "Section", screen: "section", sectionId: lesson.section_id }, { label: lesson.title }]);
  const header = labCreate("div", "lab-lesson-header");
  header.append(labCreate("div", "lab-card-kicker", `${lesson.vendor} | ${lesson.difficulty}`));
  header.append(labCreate("h3", "", lesson.title));
  header.append(labCreate("code", "lab-command", lesson.command));
  els.labRoot.append(header);
  const details = labCreate("div", "lab-detail-grid");
  [["Meaning", lesson.meaning], ["When to use it", lesson.when_to_use], ["Good output", lesson.good_output], ["Bad output", lesson.bad_output], ["Common mistakes", lesson.common_mistakes], ["Next related commands", lesson.next_commands], ["Practice task", lesson.practice_task], ["Final summary", lesson.final_summary]].forEach(([label, value]) => {
    const field = labCreate("section", "lab-detail-field");
    field.append(labCreate("strong", "", label));
    if (Array.isArray(value)) {
      const list = labCreate("ul");
      value.forEach((item) => list.append(labCreate("li", "", item)));
      field.append(list);
    } else field.append(labCreate("p", "", value));
    details.append(field);
  });
  els.labRoot.append(details);

  const practice = labCreate("section", "lab-practice-panel");
  practice.append(labCreate("div", "lab-card-kicker", "Practice terminal"));
  practice.append(labCreate("p", "", "Type the command from the lesson. This terminal is simulated and does not execute anything."));
  const terminal = labCreate("div", "lab-terminal");
  terminal.append(labCreate("div", "lab-terminal-line", "simulated-switch#"));
  const input = document.createElement("input");
  input.className = "lab-terminal-input";
  input.value = state.lab.practiceInput;
  input.placeholder = "Type the command here";
  input.setAttribute("aria-label", "Lab command input");
  input.addEventListener("input", () => { state.lab.practiceInput = input.value; });
  terminal.append(input);
  practice.append(terminal);
  practice.append(labButton("Check simulated command", "primary", () => checkLabPractice(lesson)));
  if (state.lab.practicePassed) {
    practice.append(labCreate("pre", "lab-output", lesson.practice_output));
    practice.append(labCreate("p", "lab-success", "Correct. The simulated output is ready for interpretation."));
    renderLabLessonQuiz(practice, lesson);
  }
  els.labRoot.append(practice);
}

function checkLabPractice(lesson) {
  const entered = state.lab.practiceInput.trim().toLowerCase().replace(/\\s+/g, " ");
  const accepted = lesson.accepted_commands.some((command) => command.toLowerCase().replace(/\\s+/g, " ") === entered);
  const dangerous = isLabDangerous(entered);
  if (dangerous) {
    showToast("Safety stop: that command is not allowed in Lab Mode.");
    state.lab.practicePassed = false;
    renderLab();
    return;
  }
  if (!accepted) {
    showToast(lesson.hint);
    return;
  }
  state.lab.practicePassed = true;
  renderLab();
}

function isLabDangerous(command) {
  return /(?:write erase|erase startup-config|delete flash:|format(?:\\s|$)|reload|reboot|reset saved-configuration|shutdown|undo shutdown|default interface|no switchport|factory reset)/i.test(command);
}

function renderLabLessonQuiz(parent, lesson) {
  const question = state.lab.quizzes[lesson.id]?.[0];
  if (!question) return;
  const quiz = labCreate("div", "lab-quiz");
  quiz.append(labCreate("strong", "", "Memory check"));
  quiz.append(labCreate("p", "", question.question));
  if (state.lab.progress.completedLessons[lesson.id]) {
    quiz.append(labCreate("p", "lab-lesson-complete", "Lesson complete. Your score was 100%. Continue to the next lesson when ready."));
    const nextLesson = getNextLabLesson(lesson);
    quiz.append(labButton(nextLesson ? `Next Lesson: ${nextLesson.title}` : "Return to Lab Dashboard", "primary lab-next-button", () => {
      if (nextLesson) {
        openLabLesson(nextLesson.id);
      } else {
        state.lab.screen = "dashboard";
        renderLab();
      }
    }));
    parent.append(quiz);
    return;
  }
  const options = labCreate("div", "lab-options");
  question.options.forEach((option, index) => options.append(labButton(option, `secondary ${state.lab.quizSelection === index ? "is-selected" : ""}`, () => finishLabLesson(lesson, index === question.answer, question.explanation))));
  quiz.append(options);
  parent.append(quiz);
}

function getNextLabLesson(lesson) {
  const lessons = isConfigurationLesson(lesson)
    ? state.lab.lessons.filter((item) => isConfigurationLesson(item))
    : labFoundationLessons();
  const index = lessons.findIndex((item) => item.id === lesson.id);
  return lessons[index + 1] || null;
}

function finishLabLesson(lesson, correct, explanation) {
  const score = correct ? 100 : 0;
  state.lab.progress.lessonScores[lesson.id] = score;
  state.lab.quizSelection = correct ? 0 : -1;
  if (correct) state.lab.progress.completedLessons[lesson.id] = true;
  if (correct && isConfigurationLesson(lesson)) state.lab.progress.configurationCompleted = true;
  if (correct) {
    const progress = trackProgress(lesson.vendor || activeTrack());
    const commandKey = `${lesson.vendor || activeTrack()}:${normalizeCommandText(lesson.command || lesson.id)}`;
    progress.completedLessons[lesson.id] = true;
    progress.learnedCommands[commandKey] = true;
    progress.lastLessonId = lesson.id;
    saveVendorProgress();
  }
  saveLabProgress();
  showToast(correct ? `Lesson complete. ${explanation}` : `Not quite. ${explanation}`);
  renderLab();
}

function renderLabFinalQuiz() {
  els.labRoot.append(labButton("Back to Lab Dashboard", "secondary lab-back-button", () => { state.lab.screen = "dashboard"; renderLab(); }));
  const panel = labCreate("section", "lab-quiz-panel");
  panel.append(labCreate("div", "lab-card-kicker", "Stage 1 checkpoint"));
  panel.append(labCreate("h3", "", "Basic Foundation Final Quiz"));
  panel.append(labCreate("p", "", "Pass with 80% or higher to unlock the simulated Configuration Lab."));
  let score = 0;
  state.lab.foundationFinalQuiz.forEach((question, index) => {
    const block = labCreate("fieldset", "lab-final-question");
    block.append(labCreate("legend", "", `${index + 1}. ${question.question}`));
    question.options.forEach((option, optionIndex) => {
      const label = labCreate("label", "lab-radio");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = `lab-final-${index}`;
      input.value = optionIndex;
      input.addEventListener("change", () => { block.dataset.answer = optionIndex; });
      label.append(input, labCreate("span", "", option));
      block.append(label);
    });
    panel.append(block);
  });
  panel.append(labButton("Submit final quiz", "primary", () => {
    panel.querySelectorAll("fieldset").forEach((block, index) => { if (Number(block.dataset.answer) === state.lab.foundationFinalQuiz[index].answer) score += 20; });
    state.lab.progress.foundationFinalScore = score;
    saveLabProgress();
    showToast(score >= 80 ? "Configuration Lab unlocked." : "Review the lessons and try the final quiz again.");
    state.lab.screen = "dashboard";
    renderLab();
  }));
  els.labRoot.append(panel);
}

function renderLabScenario() {
  const scenario = state.lab.scenarios.find((item) => item.id === state.lab.activeLessonId) || state.lab.scenarios[0];
  if (!scenario) return;
  els.labRoot.append(labButton("Back to Lab Dashboard", "secondary lab-back-button", () => { state.lab.screen = "dashboard"; renderLab(); }));
  const panel = labCreate("section", "lab-scenario-panel");
  panel.append(labCreate("div", "lab-card-kicker", `Final Scenario | ${scenario.difficulty}`));
  panel.append(labCreate("h3", "", scenario.title));
  panel.append(labCreate("p", "", scenario.description));
  panel.append(labCreate("strong", "lab-scenario-label", "Simulated evidence"));
  panel.append(labCreate("pre", "lab-output", `${scenario.check_command}\n\n${scenario.evidence}`));
  [["Interpretation", scenario.interpretation], ["Recommended next step", scenario.next_step], ["Safety", scenario.safety], ["Ticket summary", scenario.ticket_summary]].forEach(([label, value]) => {
    const field = labCreate("div", "lab-scenario-field");
    field.append(labCreate("strong", "", label), labCreate("p", "", value));
    panel.append(field);
  });
  const challenge = labCreate("div", "lab-scenario-challenge");
  challenge.append(labCreate("strong", "", "Choose the safest next action"));
  const choices = [scenario.next_step, "Change the port configuration immediately", "Reload the device to test it"];
  choices.forEach((choice, index) => challenge.append(labButton(choice, "secondary", () => {
    const points = index === 0 ? 10 : -3;
    state.lab.progress.scenarioScores[scenario.id] = points;
    saveLabProgress();
    showToast(index === 0 ? `Correct: +${points} points.` : `Unsafe shortcut: ${points} points.`);
    renderLab();
  })));
  const score = state.lab.progress.scenarioScores[scenario.id];
  if (score !== undefined) challenge.append(labCreate("strong", "lab-score", `Scenario score: ${score}/10`));
  panel.append(challenge);
  const select = document.createElement("select");
  select.className = "lab-scenario-select";
  state.lab.scenarios.forEach((item) => { const option = document.createElement("option"); option.value = item.id; option.textContent = item.title; select.append(option); });
  select.value = scenario.id;
  select.addEventListener("change", () => { state.lab.activeLessonId = select.value; renderLab(); });
  panel.append(select);
  els.labRoot.append(panel);
}

function announcePathChoice(message) {
  if (els.pathStatusAnnouncer) els.pathStatusAnnouncer.textContent = message;
}

function focusElement(selector) {
  const target = selector ? document.querySelector(selector) : null;
  if (!target) return;
  target.tabIndex = -1;
  window.setTimeout(() => {
    target.focus({ preventScroll: true });
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    target.scrollIntoView({ block: "start", behavior });
  }, 0);
}

function focusActiveViewHeading(viewName) {
  const api = beginnerExperience();
  focusElement(api.focusTargetForView(viewName));
}

function focusLessonStepHeading() {
  const api = beginnerExperience();
  focusElement(api.focusTargetForStep(state.learning.level0Progress?.current_step_id || "mission"));
}

function visualAssetsForLessons() {
  return Array.isArray(state.curriculum.visualAssets?.assets) ? state.curriculum.visualAssets.assets : [];
}

function visualAssetForLessonStep(lesson, stepId) {
  if (!lesson) return null;
  const assetId = lesson.visual_asset_id;
  return visualAssetsForLessons().find((asset) => {
    const matchesLesson = asset.asset_id === assetId || asset.lesson_id === lesson.lesson_id;
    const matchesStep = !stepId || (asset.step_ids || []).includes(stepId);
    return matchesLesson && matchesStep && asset.status === "authored";
  }) || null;
}

function switchPreviewAssets() {
  return visualAssetsForLessons().filter((asset) => asset.status === "preview_contract" && asset.lesson_id?.startsWith("planned_"));
}

function renderLessonVisualPanel(lesson, stepId) {
  const asset = visualAssetForLessonStep(lesson, stepId);
  if (!asset) return null;
  return renderMissionStudio(missionStudioComponents()?.visualLearningPanel(asset));
}

function applyHomePrimaryAction(action) {
  if (!action) return;
  if (action.libraryTab) state.lab.libraryTab = action.libraryTab;
  if (action.labScreen) state.lab.screen = action.labScreen;
  if (action.courseScreen) state.learning.courseScreen = action.courseScreen;
  if (action.toolId) {
    const tool = beginnerExperience().toolDestination(action.toolId);
    openTechnicianTool(tool);
    return;
  }
  switchView(action.view || "home");
}

function renderHome() {
  if (!els.homeRoot || !state.lab.progress) return;
  els.homeRoot.replaceChildren();
  const api = beginnerExperience();
  const studio = missionStudioComponents();
  const track = activeTrack();
  const progress = trackProgress(track);
  const learned = Object.keys(progress.learnedCommands).length;
  const review = Object.keys(progress.reviewRoutes).length;
  const level0Progress = state.learning.level0Progress || api.createLevel0State();
  const currentLesson = level0CurrentLesson();
  const stepIndex = currentLevel0StepIndex();
  const homeState = api.homeStateForPath(state.learning.path, { lessonTitle: currentLesson?.title, lastTool: state.learning.recentTool || "diagnose" });
  const hero = labCreate("section", "home-hero");
  hero.append(labCreate("p", "eyebrow", state.learning.path ? "Mission Studio" : "Choose your mission"));
  const title = labCreate("h2", "", state.learning.path ? `Welcome back to ${homeState.label}` : "Learn networks from zero, then practise safely.");
  title.id = "homeTitle";
  title.tabIndex = -1;
  hero.append(title);
  hero.append(labCreate("p", "", state.learning.path
    ? "Continue your current path, review recent local activity, or open one technician shortcut. Nothing here reaches a real device."
    : "Start with plain-language Level 0, open local practice, or use technician tools when you need the working app surface."));
  const status = labCreate("div", "home-status-strip");
  status.append(labCreate("span", "badge badge-green", "Works offline"), labCreate("span", "badge", `Path: ${homeState.label}`), labCreate("span", "badge", `Level 0 step: ${stepIndex + 1}/${api.STEPPER_STEPS.length}`), labCreate("span", "badge", `Commands learned: ${learned}`), labCreate("span", "badge", `Needs review: ${review}`));
  hero.append(status);
  const actions = labCreate("div", "home-primary-actions");
  if (!state.learning.path) actions.append(labButton(homeState.primaryAction.label, "primary", () => applyHomePrimaryAction(homeState.primaryAction)));
  actions.append(labButton("Open Course Map", "secondary", () => { state.learning.courseScreen = "map"; switchView("course"); }));
  if (state.learning.path) actions.append(labButton("Change learning path", "secondary", () => { saveLearningPath(""); announcePathChoice("Choose a learning path."); renderHome(); renderProgress(); focusActiveViewHeading("home"); }));
  hero.append(actions);
  els.homeRoot.append(hero);

  if (!state.learning.path) {
    const firstRun = labCreate("section", "first-run-panel");
    firstRun.append(labCreate("div", "lab-card-kicker", "Choose your starting path"));
    firstRun.append(labCreate("h3", "", "What do you want Command Doctor to be today?"));
    firstRun.append(labCreate("p", "", "This saves only your preference. Existing lab progress, vendor records, saved reports, and history are preserved."));
    const pathGrid = labCreate("div", "learning-path-grid");
    api.PATHS.forEach((path) => {
      const card = labCreate("article", "learning-path-card");
      card.append(labCreate("h4", "", path.label), labCreate("p", "", path.description), labButton(`Choose ${path.label}`, "primary", () => {
        const choice = api.applyPathChoice(path.id);
        saveLearningPath(choice.path);
        if (choice.courseScreen) state.learning.courseScreen = choice.courseScreen;
        announcePathChoice(choice.announcement);
        showToast(choice.announcement);
        renderProgress();
        switchView(choice.view);
      }));
      pathGrid.append(card);
    });
    firstRun.append(pathGrid);
    els.homeRoot.append(firstRun);
    return;
  }

  const dashboard = labCreate("section", "mission-home-dashboard");
  const missionCard = renderMissionStudio(studio?.continueMissionCard({
    title: homeState.primaryAction.label,
    lessonTitle: currentLesson?.title || "Welcome to Networking",
    phaseLabel: "Phase 1: Absolute Beginner",
    levelLabel: "Level 0",
    progressLabel: level0Progress.level_complete ? "Orientation complete" : `Step ${stepIndex + 1} of ${api.STEPPER_STEPS.length}`,
    actionLabel: homeState.primaryAction.label,
    onAction: () => applyHomePrimaryAction(homeState.primaryAction)
  }));
  if (missionCard) dashboard.append(missionCard);
  const recent = labCreate("article", "mission-recent-card");
  recent.append(labCreate("div", "lab-card-kicker", "Recent activity"));
  recent.append(labCreate("h3", "", currentLesson?.title || "No lesson started"));
  const recentFacts = labCreate("div", "mission-card-facts");
  [
    `Current step: ${api.humanStatus(level0Progress.current_step_id)}`,
    `Confidence: ${level0Progress.confidence_by_lesson?.[level0Progress.current_lesson_id] || "not rated"}`,
    `Saved reports: ${state.history.length}`
  ].forEach((fact) => recentFacts.append(labCreate("span", "badge", fact)));
  recent.append(recentFacts);
  dashboard.append(recent);
  const tool = api.toolDestination(state.learning.recentTool || "diagnose");
  const toolCard = renderMissionStudio(studio?.technicianToolCard({ tool, onAction: () => openTechnicianTool(tool) }));
  if (toolCard) dashboard.append(toolCard);
  els.homeRoot.append(dashboard);
  const details = renderMissionStudio(studio?.progressSummary({
    facts: [
      `Track: ${track === "all" ? "All Tracks" : track}`,
      `Commands learned: ${learned}`,
      `Needs review: ${review}`,
      `Level 0 complete: ${level0Progress.level_complete ? "Yes" : "No"}`
    ],
    actionLabel: "Open Progress",
    onAction: () => switchView("progress")
  }));
  if (details) els.homeRoot.append(details);
}

const DEFAULT_VENDOR_LABELS = { cisco_ios: "Cisco IOS", hp_comware: "HP Comware", aruba_cx: "ArubaOS-CX", windows_cmd: "Windows CMD", linux: "Linux" };
const LEARNING_TRACKS = ["Cisco IOS", "HP Comware", "ArubaOS-CX", "Windows CMD", "Linux", "all"];

function vendorLabelMap() {
  return { ...DEFAULT_VENDOR_LABELS, ...(state.curriculum?.index?.vendors || {}) };
}

function vendorTrackKey(track = activeTrack()) {
  const value = String(track || "all").trim();
  if (!value || value === "all") return "all";
  const labels = vendorLabelMap();
  if (labels[value]) return value;
  const normalized = value.toLowerCase();
  const match = Object.entries(labels).find(([id, label]) => id.toLowerCase() === normalized || String(label).toLowerCase() === normalized);
  return match?.[0] || value;
}

function vendorLabelFor(value) {
  const key = vendorTrackKey(value);
  return vendorLabelMap()[key] || String(value || "Unknown vendor");
}

function routeVendorId(route) {
  return vendorTrackKey(route?.vendor_id || route?.vendor || route?.vendor_label || "all");
}

function routeVendorLabel(route) {
  return route?.vendor_label || vendorLabelFor(routeVendorId(route));
}

function matchingVendor(value, track) {
  const key = vendorTrackKey(track);
  return key === "all" || vendorTrackKey(value) === key;
}

function commandsForTrack(track = activeTrack()) {
  if (state.curriculum?.inventory?.length) {
    const key = vendorTrackKey(track);
    return state.curriculum.inventory
      .filter((command) => key === "all" || command.vendor === key)
      .map((command) => ({ ...command, id: command.command_id, command: command.canonical_command, vendor_label: command.vendor_label, vendor_key: command.vendor }));
  }
  return state.commands.filter((command) => matchingVendor(command.vendor_label || command.vendor, track));
}

function lessonsForTrack(track = activeTrack()) {
  if (state.curriculum?.index?.modules) {
    const key = vendorTrackKey(track);
    const modules = key === "all" ? Object.values(state.curriculum.index.modules).flat() : state.curriculum.index.modules[key] || [];
    return modules.flatMap((module) => (module.lessons || []).map((lesson) => ({ ...lesson, section_id: module.topic, vendor: lesson.vendor_label || state.curriculum.index.vendors?.[lesson.vendor] || lesson.vendor })));
  }
  return state.lab.lessons.filter((lesson) => matchingVendor(lesson.vendor, track));
}

function relatedLessonForRoute(route) {
  const tokens = `${route.label} ${route.topic}`.toLowerCase().split(/\s+/).filter((token) => token.length > 4);
  return state.lab.lessons.find((lesson) => matchingVendor(lesson.vendor, route.vendor) && tokens.some((token) => lesson.title.toLowerCase().includes(token))) || null;
}

function commandLearningState(command, trackProgressData) {
  const key = `${command.vendor_label || command.vendor}:${normalizeCommandText(command.canonical_command || command.command)}`;
  const mastery = trackProgressData.mastery?.[command.command_id];
  const review = trackProgressData.reviewRecords?.[command.command_id];
  if (review && new Date(review.next_review_date).getTime() <= Date.now()) return "Needs review";
  if (trackProgressData.learnedCommands[key]) return "Mastered";
  if (mastery?.verification >= 100) return "Verified";
  if (mastery?.practical_execution >= 100) return "Practised";
  if (mastery?.concept > 0 || mastery?.syntax > 0) return "Understood";
  if (command.learning_status === "grouped_lesson") return "Grouped lesson";
  if (command.learning_status === "explanation_only") return "Explanation only";
  const lesson = state.lab.lessons.find((item) => matchingVendor(item.vendor, command.vendor_label || command.vendor) && normalizeCommandText(item.command || "") === normalizeCommandText(command.command));
  return lesson ? "Introduced" : "Not started";
}

const PREMIUM_INTERFACE_LESSONS = {
  cisco_show_interface_status: { vendor: "Cisco IOS", output: "Port      Name       Status       Vlan\nGi1/0/24  Lobby-AP   connected    30\nGi1/0/25  Camera     notconnect   40", signal: "notconnect", next: "show interfaces Gi1/0/25", purpose: "Scan port state, VLAN, and link health before changing a switch port.", evidence: ["Gi1/0/25 is not connected and needs a detailed check.", "Gi1/0/24 is the failed endpoint.", "VLAN 30 has been deleted."], correctEvidence: 0 },
  hp_display_interface_brief: { vendor: "HP Comware", output: "Interface                 Link Protocol Description\nGigabitEthernet1/0/24    UP   UP       Lobby-AP\nGigabitEthernet1/0/25    DOWN DOWN     Camera", signal: "DOWN", next: "display interface GigabitEthernet1/0/25", purpose: "Read Comware physical and protocol state before entering system view.", evidence: ["GigabitEthernet1/0/25 is down and needs a detailed check.", "GigabitEthernet1/0/24 has a protocol fault.", "The camera is confirmed to be on VLAN 1."], correctEvidence: 0 },
  aruba_show_interface_brief: { vendor: "ArubaOS-CX", output: "Interface  Status  Speed  Duplex\n1/1/24     up      1G     full\n1/1/25     down    auto   auto", signal: "down", next: "show interface 1/1/25", purpose: "Review an ArubaOS-CX interface summary and isolate the port that needs evidence.", evidence: ["Interface 1/1/25 is down and needs a detailed check.", "Interface 1/1/24 has lost duplex.", "The output proves the endpoint VLAN is wrong."], correctEvidence: 0 }
};

function resetPremiumLesson(commandId) {
  state.lab.activePremiumCommandId = commandId;
  state.lab.premiumLesson = { mode: "guided", prediction: "", evidence: "", entered: "", hintLevel: 0, confidence: "", verified: false };
}

function premiumMastery(command, progress) {
  const key = command.command_id;
  progress.mastery ||= {};
  progress.mastery[key] ||= { concept: 0, syntax: 0, output_interpretation: 0, command_selection: 0, practical_execution: 0, troubleshooting: 0, verification: 0, safety: 0, ticket_documentation: 0, attempts: 0, hints_used: 0 };
  return progress.mastery[key];
}

function renderPremiumLesson() {
  const command = (state.curriculum.inventory || []).find((item) => item.command_id === state.lab.activePremiumCommandId);
  const profile = PREMIUM_INTERFACE_LESSONS[state.lab.activePremiumCommandId];
  if (!command || !profile) { state.lab.learnPanel = "module"; renderLearn(); return; }
  const lesson = state.lab.premiumLesson;
  const progress = trackProgress(command.vendor);
  const mastery = premiumMastery(command, progress);
  const panel = labCreate("section", "learn-track-panel premium-lesson");
  panel.append(labButton("Back to Module", "secondary", () => { state.lab.learnPanel = "module"; renderLearn(); }));
  panel.append(labCreate("div", "lab-card-kicker", `${profile.vendor} premium practice`));
  panel.append(labCreate("h3", "", command.canonical_command));
  panel.append(labCreate("p", "", profile.purpose));
  const mode = document.createElement("select");
  mode.setAttribute("aria-label", "Learning support mode");
  [["guided", "Guided"], ["assisted", "Assisted"], ["independent", "Independent"]].forEach(([value, label]) => { const option = document.createElement("option"); option.value = value; option.textContent = label; option.selected = lesson.mode === value; mode.append(option); });
  mode.addEventListener("change", () => { lesson.mode = mode.value; renderLearn(); });
  panel.append(labCreate("p", "", "Support mode"), mode);
  if (lesson.mode === "guided") panel.append(labCreate("p", "", `Worked workflow: read the summary, identify ${profile.signal}, inspect that interface, then verify the physical cause before changing configuration.`));
  if (lesson.mode === "assisted") panel.append(labCreate("p", "", "Choose the evidence and command yourself. Hints remain available, but no worked solution is shown."));
  if (lesson.mode === "independent") panel.append(labCreate("p", "", "Ticket: an expected endpoint is offline. Collect evidence and submit a safe next command without coaching."));
  if (lesson.mode !== "independent") {
    const syntax = labCreate("section", "lab-detail-field");
    syntax.append(labCreate("strong", "", "Syntax and purpose"), labCreate("code", "lab-command", command.canonical_command), labCreate("p", "", `Aliases: ${(command.aliases || []).join(", ") || "None"}. Safe read-only command.`));
    panel.append(syntax);
  }
  const attempted = Boolean(lesson.prediction || lesson.entered.trim());
  if (lesson.mode === "guided" || (lesson.mode === "assisted" && attempted) || (lesson.mode === "independent" && attempted)) {
    const output = labCreate("section", "lab-detail-field");
    output.append(labCreate("strong", "", "Evidence sample"), labCreate("pre", "lab-output", profile.output));
    panel.append(output);
  }
  const prediction = labCreate("section", "lab-detail-field");
  prediction.append(labCreate("strong", "", "Prediction"), labCreate("p", "", "Before checking the answer, which state needs follow-up?"));
  ["connected or UP", profile.signal, "the expected VLAN name"].forEach((choice) => prediction.append(labButton(choice, `secondary ${lesson.prediction === choice ? "is-selected" : ""}`, () => { lesson.prediction = choice; mastery.output_interpretation = choice === profile.signal ? 100 : 35; mastery.attempts += 1; saveVendorProgress(); renderLearn(); })));
  panel.append(prediction);
  if (lesson.mode !== "independent") {
    const hints = labCreate("section", "lab-detail-field");
    hints.append(labCreate("strong", "", "Progressive hints"));
    const hintText = ["Start with the port whose expected endpoint is not healthy.", "Use the vendor's detailed interface command family.", `Try: ${profile.next}`, `Complete answer: ${profile.next}`];
    const maximumHint = lesson.mode === "guided" ? 3 : 1;
    for (let index = 0; index <= Math.min(lesson.hintLevel, maximumHint); index += 1) hints.append(labCreate("p", "", `Hint ${index + 1}: ${hintText[index]}`));
    if (lesson.hintLevel < maximumHint) hints.append(labButton("Show next hint", "secondary", () => { lesson.hintLevel += 1; mastery.hints_used += 1; saveVendorProgress(); renderLearn(); }));
    panel.append(hints);
  }
  const practice = labCreate("section", "lab-practice-panel");
  practice.append(labCreate("strong", "", "Simulated command practice"));
  const input = document.createElement("input"); input.className = "lab-terminal-input"; input.value = lesson.entered; input.placeholder = "Type the command"; input.setAttribute("aria-label", "Premium lesson command input");
  input.addEventListener("input", () => { lesson.entered = input.value; });
  input.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); lesson.entered = input.value; const accepted = [command.canonical_command, ...(command.aliases || [])].map(normalizeCommandText); const correct = accepted.includes(normalizeCommandText(lesson.entered)); mastery.syntax = correct ? 100 : 30; mastery.practical_execution = correct ? 100 : 0; mastery.command_selection = correct ? 100 : 35; mastery.attempts += 1; saveVendorProgress(); renderLearn(); } });
  practice.append(input, labButton("Check command", "secondary", () => { const accepted = [command.canonical_command, ...(command.aliases || [])].map(normalizeCommandText); const correct = accepted.includes(normalizeCommandText(lesson.entered)); mastery.syntax = correct ? 100 : 30; mastery.practical_execution = correct ? 100 : 0; mastery.command_selection = correct ? 100 : 35; mastery.attempts += 1; saveVendorProgress(); renderLearn(); }));
  if (mastery.practical_execution) practice.append(labCreate("p", "lab-success", lesson.mode === "independent" ? "Command accepted. Continue the investigation using the evidence you collected." : `Accepted. Next safe command: ${profile.next}`));
  panel.append(practice);
  const verification = labCreate("section", "lab-detail-field");
  verification.append(labCreate("strong", "", "Evidence interpretation"), labCreate("p", "", "Which statement is supported by the output?"));
  profile.evidence.forEach((choice, index) => verification.append(labButton(choice, `secondary ${lesson.evidence === choice ? "is-selected" : ""}`, () => {
    lesson.evidence = choice;
    const correct = index === profile.correctEvidence;
    mastery.concept = correct ? 100 : 35;
    mastery.troubleshooting = correct ? 100 : 30;
    mastery.safety = correct ? 100 : 35;
    mastery.attempts += 1;
    saveVendorProgress();
    renderLearn();
  })));
  if (lesson.evidence === profile.evidence[profile.correctEvidence]) {
    const verificationLabel = lesson.mode === "independent" ? "Submit final investigation" : `Verify with: ${profile.next}`;
    verification.append(labButton(verificationLabel, "secondary", () => { lesson.verified = true; mastery.verification = 100; mastery.ticket_documentation = 100; saveVendorProgress(); renderLearn(); }));
  }
  panel.append(verification);
  const confidence = document.createElement("select"); confidence.setAttribute("aria-label", "Lesson confidence"); ["", "Low", "Medium", "High"].forEach((value) => { const option = document.createElement("option"); option.value = value; option.textContent = value || "Rate confidence"; option.selected = lesson.confidence === value; confidence.append(option); }); confidence.addEventListener("change", () => { lesson.confidence = confidence.value; saveVendorProgress(); renderLearn(); });
  panel.append(labCreate("p", "", "Confidence"), confidence);
  const dimensions = Object.entries(mastery).filter(([key]) => !["attempts", "hints_used"].includes(key));
  panel.append(labCreate("p", "", `Mastery: ${dimensions.map(([key, value]) => `${key.replace(/_/g, " ")} ${value}%`).join(" | ")}`));
  if (lesson.verified && lesson.evidence === profile.evidence[profile.correctEvidence] && mastery.practical_execution && lesson.prediction === profile.signal && lesson.confidence) {
    progress.learnedCommands[`${command.vendor_label}:${normalizeCommandText(command.canonical_command)}`] = true;
    progress.reviewRecords ||= {};
    const existingReview = progress.reviewRecords[command.command_id];
    const reviewIntervals = [3, 7, 14, 30];
    const intervalDays = existingReview ? reviewIntervals.find((days) => days > existingReview.interval_days) || 30 : 3;
    progress.reviewRecords[command.command_id] = { command_id: command.command_id, vendor: command.vendor, next_review_date: new Date(Date.now() + intervalDays * 86400000).toISOString(), interval_days: intervalDays, ease: lesson.hintLevel ? 2 : 3, attempt_history: mastery.attempts, last_result: "passed", question_type: "evidence interpretation" };
    progress.reviewRoutes[command.command_id] = true; saveVendorProgress();
    panel.append(labCreate("p", "lab-lesson-complete", "Premium lesson complete. Your evidence, practice, verification, confidence, and mastery dimensions were saved locally."));
  }
  els.learnRoot.append(panel);
}

function renderLearn() {
  if (!els.learnRoot || !state.lab.progress) return;
  els.learnRoot.replaceChildren();
  const track = activeTrack();
  const progress = trackProgress(track);
  if (state.lab.learnPanel === "coverage") {
    renderCommandCoverage();
    return;
  }
  if (state.lab.learnPanel === "modules") {
    renderGeneratedModules();
    return;
  }
  if (state.lab.learnPanel === "module") {
    renderGeneratedModule();
    return;
  }
  if (state.lab.learnPanel === "premium") {
    renderPremiumLesson();
    return;
  }
  const panel = labCreate("section", "learn-track-panel");
  panel.append(labCreate("div", "lab-card-kicker", "Choose your active learning track"));
  panel.append(labCreate("h3", "", "What do you want to learn?"));
  panel.append(labCreate("p", "", "Your selection filters the course and command coverage. Opening Practice Library from here applies the track as a visible Vendor filter. Progress is stored independently for each vendor on this browser."));
  els.learnRoot.append(panel);
  const grid = labCreate("div", "learn-track-grid");
  LEARNING_TRACKS.forEach((id) => {
    const label = id === "all" ? "All Tracks" : id;
    const count = lessonsForTrack(id).length;
    const card = labCreate("article", `learn-track-card ${track === id ? "is-active" : ""}`);
    card.append(labCreate("div", "lab-card-kicker", track === id ? "Active track" : "Learning track"));
    card.append(labCreate("h3", "", label));
    card.append(labCreate("p", "", count ? `${count} available local lesson${count === 1 ? "" : "s"}; ${commandsForTrack(id).length} local commands.` : `${commandsForTrack(id).length} local commands are available for coverage and explanation.`));
    card.append(labButton(track === id ? "Current Track" : `Choose ${label}`, track === id ? "secondary" : "primary", () => { state.lab.vendorTrack = id; trackProgress(id); saveVendorProgress(); renderLearn(); renderHome(); }));
    grid.append(card);
  });
  els.learnRoot.append(grid);
  const summary = labCreate("section", "learn-summary");
  const trackLessons = lessonsForTrack(track);
  const learned = Object.keys(progress.learnedCommands).length;
  summary.append(labCreate("span", "badge", `Current level: ${learned < 5 ? "Foundation" : learned < 16 ? "Basic configuration" : "Existing advanced content"}`), labCreate("span", "badge", `Current module: ${trackLessons[0]?.section_id || "Command coverage"}`), labCreate("span", "badge", `Progress: ${learned}/${commandsForTrack(track).length} commands`), labCreate("span", "badge", `Needs review: ${Object.keys(progress.reviewRoutes).length}`));
  summary.append(labButton("Continue Course", "primary", () => { state.lab.learnPanel = "modules"; renderLearn(); }), labButton("Browse Modules", "secondary", () => { state.lab.learnPanel = "modules"; renderLearn(); }), labButton("Command Coverage", "secondary", () => { state.lab.learnPanel = "coverage"; renderLearn(); }), labButton("Practice Library", "secondary", openPracticeLibraryFromLearn), labButton("Change Track", "secondary", () => { state.lab.vendorTrack = "all"; renderLearn(); }));
  els.learnRoot.append(summary);
}

function openPracticeLibraryFromLearn() {
  const trackVendor = vendorTrackKey(activeTrack());
  state.lab.libraryFilters.vendor = trackVendor === "all" ? "" : trackVendor;
  state.lab.libraryTab = "practice";
  switchView("library");
}

function generatedModulesForTrack(track = activeTrack()) {
  const modules = state.curriculum?.index?.modules || {};
  const key = vendorTrackKey(track);
  return key === "all" ? Object.values(modules).flat() : modules[key] || [];
}

function renderGeneratedModules() {
  const track = activeTrack();
  const modules = generatedModulesForTrack(track);
  const panel = labCreate("section", "learn-track-panel");
  panel.append(labButton("Back to Learn", "secondary", () => { state.lab.learnPanel = "overview"; renderLearn(); }));
  panel.append(labCreate("div", "lab-card-kicker", "Progressive vendor curriculum"));
  panel.append(labCreate("h3", "", `${track === "all" ? "All Tracks" : track} modules`));
  panel.append(labCreate("p", "", "Open one command group at a time. Every item retains its vendor syntax, safety classification, aliases, verification guidance, and simulation support."));
  els.learnRoot.append(panel);
  const grid = labCreate("div", "library-grid");
  modules.forEach((module) => {
    const commands = module.lessons?.flatMap((lesson) => lesson.commands || []) || [];
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

function startPracticeRoute(routeId, action = "") {
  const route = runtimeTrainingRoutes().find((item) => item.id === routeId);
  if (!route) return;
  if (!action && hasActiveWorkbenchState()) {
    state.lab.pendingRouteStartId = route.id;
    renderLibrary();
    return;
  }
  if (action === "cancel") {
    state.lab.pendingRouteStartId = "";
    renderLibrary();
    showToast("Route start cancelled. The current Workbench state was kept.");
    return;
  }
  state.lab.pendingRouteStartId = "";
  state.lab.playgroundTaskId = route.id;
  state.lab.screen = "guided-cli";
  recordTrackActivity(routeVendorId(route), { lastLabRouteId: route.id });
  switchView("lab");
  if (action === "reuse") {
    state.lab.console.routeStarted = route.id;
    state.lab.console.focusRequested = true;
    renderLab();
    showToast(`${route.label} is using the current simulated switch and topology.`);
    return;
  }
  if (action === "save-and-replace") {
    const saved = state.lab.switchRuntime?.state?.save("route-start-save");
    if (saved && !saved.ok) { showToast(saved.message); return; }
  }
  const routeVendorKey = routeVendorId(route);
  const routeProfile = state.lab.switchProfiles.find((profile) => profile.vendor === routeVendorKey);
  if (routeProfile && activeSwitchProfile()?.vendor !== routeVendorKey) activateSwitchProfile(routeProfile.profile_id);
  startFreshTrainingSwitch(route);
}

function defaultPracticeLibraryFilters() {
  return { search: "", vendor: "", operatingSystem: "", platform: "", modelFamily: "", topic: "", difficulty: "", routeType: "", support: "", status: "" };
}

function clearPracticeLibraryFilters() {
  Object.assign(state.lab.libraryFilters, defaultPracticeLibraryFilters());
}

function normalizedPracticeRoutes() {
  return runtimeTrainingRoutes().map((route) => {
    const generated = state.curriculum?.routes?.find((item) => item.route_id === route.id);
    if (!generated) return { ...route, vendor_id: routeVendorId(route), vendor_label: routeVendorLabel(route) };
    return {
      ...route,
      ...generated,
      vendor_id: generated.vendor,
      vendor_label: generated.vendor_label || vendorLabelFor(generated.vendor),
      vendor: generated.vendor,
      operatingSystem: generated.operating_system,
      modelFamily: generated.platform,
      routeType: generated.route_type,
      support: String(generated.support_level || route.supportLevel || "").replace(/_/g, " "),
      estimatedMinutes: route.estimatedMinutes || 10
    };
  });
}

function practiceLibraryFilterDefinitions(routes) {
  const values = (key) => [...new Set(routes.map((route) => route[key]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b))).map((value) => ({ value, label: value }));
  return [
    { key: "vendor", label: "Vendor", allLabel: "All vendors", options: Object.entries(vendorLabelMap()).map(([value, label]) => ({ value, label })) },
    { key: "operatingSystem", label: "Operating system", allLabel: "All operating systems", options: values("operatingSystem") },
    { key: "platform", label: "Platform", allLabel: "All platforms", options: values("platform") },
    { key: "modelFamily", label: "Model family", allLabel: "All model families", options: values("modelFamily") },
    { key: "topic", label: "Topic", allLabel: "All topics", options: values("topic") },
    { key: "difficulty", label: "Difficulty", allLabel: "All difficulties", options: values("difficulty") },
    { key: "routeType", label: "Route type", allLabel: "All route types", options: values("routeType") },
    { key: "support", label: "Support level", allLabel: "All support levels", options: values("support") },
    { key: "status", label: "Learning status", allLabel: "All learning statuses", options: ["Learned", "Not learned", "Needs review"].map((value) => ({ value, label: value })) }
  ];
}

function practiceLibraryRouteProgress(route) {
  return trackProgress(routeVendorId(route));
}

function practiceLibraryRouteMatches(route, filters) {
  const vendorFilter = vendorTrackKey(filters.vendor) === "all" ? "" : vendorTrackKey(filters.vendor);
  const searched = !filters.search || `${route.label} ${route.topic} ${route.category} ${routeVendorLabel(route)} ${route.vendor}`.toLowerCase().includes(filters.search.toLowerCase());
  const fieldsMatch = [
    ["vendor", routeVendorId(route), vendorFilter],
    ["operatingSystem", route.operatingSystem, filters.operatingSystem],
    ["platform", route.platform, filters.platform],
    ["modelFamily", route.modelFamily, filters.modelFamily],
    ["topic", route.topic, filters.topic],
    ["difficulty", route.difficulty, filters.difficulty],
    ["routeType", route.routeType, filters.routeType],
    ["support", route.support, filters.support]
  ].every(([, value, selected]) => !selected || value === selected);
  const progress = practiceLibraryRouteProgress(route);
  const learned = Boolean(progress.practisedRoutes?.[route.id]);
  const review = Boolean(progress.reviewRoutes?.[route.id]);
  const statusMatch = !filters.status || (filters.status === "Learned" && learned) || (filters.status === "Not learned" && !learned) || (filters.status === "Needs review" && review);
  return searched && fieldsMatch && statusMatch;
}

function filteredPracticeRoutes(routes, filters) {
  return routes.filter((route) => practiceLibraryRouteMatches(route, filters));
}

function practiceLibraryEmptyMessage(filters, allRoutes) {
  const vendorFilter = vendorTrackKey(filters.vendor) === "all" ? "" : vendorTrackKey(filters.vendor);
  if (vendorFilter && !allRoutes.some((route) => routeVendorId(route) === vendorFilter)) {
    return `No ${vendorLabelFor(vendorFilter)} practice routes are authored yet. Command learning remains available, and route migration is planned.`;
  }
  return "No practice routes match the visible filters. Clear filters to return to the full local route library.";
}

function practiceRouteVendorDisplay(route) {
  return `${routeVendorLabel(route)} | ${route.platform || route.operatingSystem || "Local route"}`;
}

function renderPracticeLibrary(parent) {
  const filters = state.lab.libraryFilters;
  filters.vendor = vendorTrackKey(filters.vendor) === "all" ? "" : vendorTrackKey(filters.vendor);
  const normalizedRoutes = normalizedPracticeRoutes();
  const pendingRoute = normalizedRoutes.find((route) => route.id === state.lab.pendingRouteStartId);
  if (pendingRoute) {
    const choice = labCreate("section", "lab-workspace-intro route-start-choice");
    choice.append(labCreate("strong", "lab-card-kicker", "Current Workbench State Detected"), labCreate("p", "", `Starting ${pendingRoute.label} can replace the active local switch and topology. Choose how to continue.`));
    choice.append(
      labButton("Use current switch and topology", "secondary", () => startPracticeRoute(pendingRoute.id, "reuse")),
      labButton("Save current state and start route state", "secondary", () => startPracticeRoute(pendingRoute.id, "save-and-replace")),
      labButton("Start route state without saving", "primary", () => startPracticeRoute(pendingRoute.id, "replace")),
      labButton("Cancel", "secondary", () => startPracticeRoute(pendingRoute.id, "cancel"))
    );
    parent.append(choice);
  }
  const filterPanel = labCreate("section", "library-filter-panel");
  filterPanel.append(labCreate("strong", "lab-card-kicker", `${normalizedRoutes.length} local practice routes`));
  const search = document.createElement("input");
  search.placeholder = "Search routes";
  search.value = filters.search;
  search.setAttribute("aria-label", "Search practice routes");
  search.addEventListener("input", () => { filters.search = search.value; renderLibrary(); });
  filterPanel.append(search);
  practiceLibraryFilterDefinitions(normalizedRoutes).forEach(({ key, label, allLabel, options }) => {
    const select = document.createElement("select");
    select.setAttribute("aria-label", label);
    select.append(new Option(allLabel, ""));
    options.forEach(({ value, label }) => select.append(new Option(label, value)));
    select.value = filters[key];
    select.addEventListener("change", () => { filters[key] = select.value; renderLibrary(); });
    filterPanel.append(select);
  });
  filterPanel.append(labButton("Clear filters", "secondary", () => {
    clearPracticeLibraryFilters();
    renderLibrary();
  }));
  parent.append(filterPanel);
  const routes = filteredPracticeRoutes(normalizedRoutes, filters);
  const count = labCreate("p", "", `${routes.length} route${routes.length === 1 ? "" : "s"} match the current filters.`);
  parent.append(count);
  if (!routes.length) {
    const empty = labCreate("section", "library-card");
    empty.append(labCreate("h3", "", "No practice routes found"), labCreate("p", "", practiceLibraryEmptyMessage(filters, normalizedRoutes)), labButton("Clear filters", "secondary", () => { clearPracticeLibraryFilters(); renderLibrary(); }));
    parent.append(empty);
    return;
  }
  const grid = labCreate("div", "practice-route-grid");
  routes.forEach((route) => {
    const lesson = relatedLessonForRoute(route);
    const card = labCreate("article", "practice-route-card");
    card.dataset.routeId = route.id;
    card.append(labCreate("div", "lab-card-kicker", practiceRouteVendorDisplay(route)), labCreate("h3", "", route.label), labCreate("p", "", `${route.topic} | ${route.difficulty}`));
    const facts = labCreate("div", "route-facts");
    [route.routeType, route.support, `${route.estimatedMinutes} min`, `Lesson: ${lesson?.title || "Planned command group"}`].forEach((fact) => facts.append(labCreate("span", "badge", fact)));
    card.append(facts, labButton("Start route", "primary", () => startPracticeRoute(route.id)));
    grid.append(card);
  });
  parent.append(grid);
}

function renderCourse() {
  if (!els.courseRoot) return;
  els.courseRoot.replaceChildren();
  if (state.learning.courseScreen === "overview") {
    renderLevelOverview();
    focusActiveViewHeading("course");
    return;
  }
  if (state.learning.courseScreen === "lesson") {
    renderLevel0LessonStepper();
    return;
  }
  renderCourseMap();
  focusActiveViewHeading("course");
}

function renderCourseMap() {
  const curriculum = state.curriculum.complete;
  const api = beginnerExperience();
  const studio = missionStudioComponents();
  const intro = labCreate("section", "learn-track-panel");
  intro.append(labCreate("div", "lab-card-kicker", "Complete networking curriculum"));
  intro.append(labCreate("h3", "", "40 levels across 10 phases"));
  intro.append(labCreate("p", "", "Level 0 is fully authored for beginners. Levels 1-39 are planned outlines and remain locked until real lessons, practice, verification, rollback, and review evidence are authored."));
  intro.append(labButton("Start Level 0", "primary", () => { state.learning.levelId = "level_00"; state.learning.courseScreen = "lesson"; renderCourse(); }));
  els.courseRoot.append(intro);
  const currentPhaseId = levelById(state.learning.levelId || "level_00")?.phase_id || "phase_00";
  const phaseRail = renderMissionStudio(studio?.coursePhaseRail({
    phases: (curriculum?.phases || []).map((phase) => ({ ...phase, statusText: api.humanStatus(phase.status) })),
    currentPhaseId
  }));
  if (phaseRail) els.courseRoot.append(phaseRail);
  const currentPhase = (curriculum?.phases || []).find((phase) => phase.phase_id === currentPhaseId) || curriculum?.phases?.[0];
  const contextPanel = renderMissionStudio(studio?.phaseContextPanel({
    phase: currentPhase,
    facts: [
      `${currentPhase?.level_ids?.length || 0} levels`,
      `${currentPhase?.estimated_learning_hours || "Planned"} hours`,
      api.humanStatus(currentPhase?.status)
    ]
  }));
  if (contextPanel) els.courseRoot.append(contextPanel);
  (curriculum?.phases || []).forEach((phase) => {
    const details = document.createElement("details");
    details.className = "course-phase";
    details.open = phase.phase_id === currentPhaseId;
    const summary = document.createElement("summary");
    summary.append(labCreate("span", "course-phase-title", phase.title), labCreate("span", "badge", api.humanStatus(phase.status)));
    details.append(summary);
    const grid = labCreate("div", "course-level-grid");
    phase.level_ids.forEach((id) => {
      const level = levelById(id);
      if (!level) return;
      const authored = level.content_status === "authored";
      const card = renderMissionStudio(studio?.levelCard({
        level,
        current: authored,
        statusText: authored ? "Available now" : api.humanStatus(level.content_status),
        actionLabel: level.level_id === "level_00" ? "Open overview" : "Preview plan",
        onAction: () => { state.learning.levelId = level.level_id; state.learning.courseScreen = "overview"; renderCourse(); }
      }));
      if (card) grid.append(card);
    });
    details.append(grid);
    els.courseRoot.append(details);
  });
}

function renderLevelOverview() {
  const api = beginnerExperience();
  const studio = missionStudioComponents();
  const level = levelById(state.learning.levelId || "level_00") || levelById("level_00");
  const isLevel0 = level?.level_id === "level_00";
  const panel = labCreate("section", "learn-track-panel level-overview");
  panel.append(labButton("Back to Course Map", "secondary", () => { state.learning.courseScreen = "map"; renderCourse(); }));
  panel.append(labCreate("div", "lab-card-kicker", `Level ${level?.level_number ?? 0} | ${api.humanStatus(level?.content_status)}`));
  panel.append(labCreate("h3", "", level?.title || "Welcome to Networking"));
  panel.append(labCreate("p", "", level?.why_it_matters || "Preview the planned subject-specific outline before authored lessons are available."));
  const facts = labCreate("div", "route-facts");
  [
    `${level?.estimated_learning_hours || "Planned"} hours`,
    `${(level?.modules || []).length} modules`,
    `${(level?.command_ids || []).length} commands`,
    `${(level?.prerequisite_level_ids || []).length ? `Prerequisites: ${level.prerequisite_level_ids.join(", ")}` : "No prerequisites"}`,
    api.humanStatus(level?.practice_status),
    api.humanStatus(level?.review_status)
  ].forEach((fact) => facts.append(labCreate("span", "badge", fact)));
  panel.append(facts);
  const phase = (state.curriculum.complete?.phases || []).find((item) => item.phase_id === level?.phase_id);
  const phaseContext = renderMissionStudio(studio?.phaseContextPanel({
    phase,
    title: "About this phase",
    facts: [api.humanStatus(phase?.status), `${phase?.level_ids?.length || 0} levels`]
  }));
  if (phaseContext) panel.append(phaseContext);
  const list = labCreate("div", "lesson-outline-list");
  if (isLevel0) {
    level0Lessons().forEach((lesson) => {
      const item = labCreate("article", "lesson-outline-card");
      item.append(labCreate("h4", "", lesson.title), labCreate("p", "", lesson.objective));
      list.append(item);
    });
  } else {
    (level?.modules || []).forEach((module) => {
      const item = labCreate("article", "lesson-outline-card");
      item.append(labCreate("h4", "", module.title), labCreate("p", "", module.purpose));
      const objectives = document.createElement("ul");
      (module.objectives || []).forEach((objective) => {
        const li = document.createElement("li");
        li.textContent = objective;
        objectives.append(li);
      });
      item.append(objectives, labCreate("p", "", `${(module.command_ids || []).length} mapped commands | ${api.humanStatus(module.status)}`));
      list.append(item);
    });
  }
  panel.append(list);
  if (!isLevel0) {
    const previewPanel = labCreate("section", "switch-preview-panel");
    previewPanel.append(labCreate("div", "lab-card-kicker", "What is a switch? preview"));
    previewPanel.append(labCreate("h4", "", "Visual contract only"));
    previewPanel.append(labCreate("p", "planned-note", "These generic switch previews define the visual standard for future beginner lessons. They do not make this planned level authored."));
    const previewGrid = labCreate("div", "switch-preview-grid");
    switchPreviewAssets().forEach((asset) => {
      const visual = renderMissionStudio(studio?.visualLearningPanel(asset));
      if (visual) previewGrid.append(visual);
    });
    previewPanel.append(previewGrid);
    panel.append(previewPanel);
  }
  if (isLevel0) panel.append(labButton("Start Level 0 lesson", "primary", () => { state.learning.courseScreen = "lesson"; renderCourse(); }));
  else panel.append(labCreate("p", "planned-note", "This planned level is preview-only until authored lessons, practice, verification, rollback, and review evidence are complete."));
  els.courseRoot.append(panel);
}

function level0StepText(lesson, stepId) {
  if (!lesson) return "";
  if (stepId === "key_words") return (lesson.key_words || []).join(", ");
  if (stepId === "predict") return lesson.predict?.question || "Choose the best prediction.";
  if (stepId === "try") return lesson.tryInteraction?.prompt || "Choose the safest local practice answer.";
  if (stepId === "explain") return lesson.explain || "Explain your evidence in plain language.";
  if (stepId === "confidence") return lesson.confidence_prompt || "Record your confidence before continuing.";
  return lesson[stepId] || lesson.objective || "This planned step is waiting for authored content.";
}

function setLevel0Progress(nextState) {
  state.learning.level0Progress = nextState;
  saveLevel0Progress();
  renderCourse();
  renderHome();
  renderProgress();
}

function recordLevel0Interaction(action, message) {
  const api = beginnerExperience();
  const lessons = level0Lessons();
  const result = api.advanceLevel0(state.learning.level0Progress, lessons, action);
  setLevel0Progress(result.state);
  if (message) showToast(message);
}

function advanceLevel0Step(direction) {
  const api = beginnerExperience();
  const lessons = level0Lessons();
  const result = api.advanceLevel0(state.learning.level0Progress, lessons, { direction });
  if (result.blocked) {
    state.learning.level0Progress = result.state;
    showToast(result.reason);
    renderCourse();
    focusLessonStepHeading();
    return;
  }
  setLevel0Progress(result.state);
  if (result.state.level_complete) showToast("Level 0 orientation complete. No command mastery was awarded.");
}

function renderLevel0LessonStepper() {
  const api = beginnerExperience();
  const lesson = level0CurrentLesson();
  const progress = state.learning.level0Progress;
  const stepIndex = currentLevel0StepIndex();
  const stepName = api.STEPPER_STEPS[stepIndex];
  const stepId = api.STEP_IDS[stepIndex];
  const lessonIndex = Math.max(0, level0Lessons().findIndex((item) => item.lesson_id === lesson?.lesson_id));
  const studio = missionStudioComponents();
  const panel = labCreate("section", "level-stepper");
  panel.append(labButton("Back to Course Map", "secondary", () => { state.learning.courseScreen = "map"; renderCourse(); }));
  panel.append(labCreate("div", "lab-card-kicker", "Level 0 | Beginner orientation"));
  panel.append(labCreate("h3", "", `${lessonIndex + 1}. ${lesson?.title || "Level 0"}`));
  const steps = renderMissionStudio(studio?.lessonTimeline({
    stepNames: api.STEPPER_STEPS,
    stepIds: api.STEP_IDS,
    activeStepId: stepId,
    activeIndex: stepIndex
  })) || labCreate("ol", "stepper-steps");
  panel.append(steps);
  const body = labCreate("section", "stepper-body");
  body.append(labCreate("div", "lab-card-kicker", stepName));
  const stepHeading = labCreate("h4", "", stepName);
  stepHeading.dataset.stepHeading = stepId;
  stepHeading.tabIndex = -1;
  body.append(stepHeading, labCreate("p", "", level0StepText(lesson, stepId)));
  const visualPanel = renderLessonVisualPanel(lesson, stepId);
  if (visualPanel) body.append(visualPanel);
  if (stepName === "Key words") {
    const words = labCreate("div", "route-facts");
    (lesson?.key_words || []).forEach((word) => words.append(labCreate("span", "badge", word)));
    body.append(words);
  }
  if (stepId === "predict" || stepId === "try") {
    const interaction = stepId === "predict" ? lesson?.predict : lesson?.tryInteraction;
    const responseMap = stepId === "predict" ? progress.prediction_responses : progress.try_responses;
    (interaction?.answer_choices || []).forEach((choice, index) => body.append(labButton(choice, `secondary ${responseMap?.[lesson.lesson_id]?.value === choice ? "is-selected" : ""}`, () => {
      recordLevel0Interaction({ interaction: stepId === "predict" ? "prediction" : "try", value: choice }, index === interaction.correct_index ? interaction.explanation : "Saved for review. Try again or continue after reading the explanation.");
    })));
    if (responseMap?.[lesson.lesson_id]) body.append(labCreate("p", "planned-note", interaction?.explanation || "Response saved."));
  }
  if (stepId === "explain") {
    const textarea = document.createElement("textarea");
    textarea.className = "level0-explain-input";
    textarea.setAttribute("aria-label", "Level 0 explanation response");
    textarea.value = progress.explanation_responses?.[lesson.lesson_id]?.value || "";
    body.append(textarea, labButton("Save explanation", "secondary", () => recordLevel0Interaction({ interaction: "explanation", value: textarea.value }, "Explanation saved.")));
  }
  if (stepId === "confidence") {
    const select = document.createElement("select");
    select.setAttribute("aria-label", "Level 0 confidence");
    ["", "Low", "Medium", "High"].forEach((value) => select.append(new Option(value || "Rate confidence", value)));
    select.value = progress.confidence_by_lesson?.[lesson.lesson_id] || "";
    select.addEventListener("change", () => { if (select.value) recordLevel0Interaction({ interaction: "confidence", value: select.value }, "Confidence saved."); });
    body.append(select);
  }
  if (stepId === "continue") {
    body.append(labCreate("p", "planned-note", lesson?.continue || "Continue saves orientation progress only."));
    if ((lesson?.completion_requirements || []).includes("final_checkpoint")) {
      const submitted = progress.final_checkpoint_result?.submitted;
      body.append(submitted ? labCreate("p", "lab-success", "Checkpoint submitted. Continue to complete orientation.") : labButton("Submit Level 0 checkpoint", "secondary", () => recordLevel0Interaction({ interaction: "checkpoint", passed: true, score: 100 }, "Checkpoint submitted.")));
    }
    body.append(labCreate("p", "planned-note", "Level 0 records orientation completion only. It does not award practical execution, verification, or command mastery."));
  }
  panel.append(body);
  const controls = labCreate("div", "stepper-controls");
  controls.append(
    labButton("Previous", "secondary", () => advanceLevel0Step("previous")),
    labButton(stepName === "Continue" ? "Continue" : "Next", "primary", () => advanceLevel0Step("next"))
  );
  panel.append(controls);
  els.courseRoot.append(panel);
  focusLessonStepHeading();
}

function renderPractice() {
  if (!els.practiceRoot) return;
  els.practiceRoot.replaceChildren();
  const panel = labCreate("section", "learn-track-panel");
  panel.append(labCreate("div", "lab-card-kicker", "Practise and specialize"));
  panel.append(labCreate("h3", "", "Use authored practice routes, then follow planned specialization paths."));
  panel.append(labCreate("p", "", "Practice routes stay local. Specialization paths are visible for planning, but they do not count as complete until real content and evidence exist."));
  panel.append(labButton("Open Practice Library", "primary", () => { state.lab.libraryTab = "practice"; switchView("library"); }));
  els.practiceRoot.append(panel);
  const grid = labCreate("div", "library-grid");
  (state.curriculum.specializations || []).forEach((path) => {
    const card = labCreate("article", "library-card");
    const levelCount = path.level_ids.length;
    const commandCount = path.command_ids.length;
    const mappingFacts = labCreate("div", "route-facts");
    mappingFacts.append(labCreate("span", "badge", levelCount ? `Planned levels: ${levelCount}` : "Detailed path mapping is planned"));
    mappingFacts.append(labCreate("span", "badge", commandCount ? `Mapped commands - planned: ${commandCount}` : "Command mapping is provisional"));
    card.append(labCreate("div", "lab-card-kicker", path.status.replace(/_/g, " ")), labCreate("h3", "", path.title), mappingFacts);
    card.append(labCreate("p", "", (path.blocking_reasons || []).join("; ")));
    grid.append(card);
  });
  els.practiceRoot.append(grid);
}

function renderProgress() {
  if (!els.progressRoot) return;
  els.progressRoot.replaceChildren();
  const api = beginnerExperience();
  const progress = state.learning.level0Progress || api.createLevel0State();
  const currentLesson = level0Lessons().find((lesson) => lesson.lesson_id === progress.current_lesson_id);
  const confidence = progress.confidence_by_lesson?.[progress.current_lesson_id] || "not rated";
  const vendorProgressCount = Object.keys(state.lab.vendorProgress || {}).length;
  const panel = labCreate("section", "learn-track-panel");
  panel.append(labCreate("div", "lab-card-kicker", "Saved locally"));
  panel.append(labCreate("h3", "", "Progress is preserved."));
  panel.append(labCreate("p", "", "Changing the beginner path does not delete existing lab progress, vendor mastery records, practice route records, saved reports, or history."));
  const facts = labCreate("div", "learn-summary");
  [
    `Path: ${state.learning.path ? api.pathLabel(state.learning.path) : "not chosen"}`,
    `Level 0 lesson: ${currentLesson?.title || "not started"}`,
    `Level 0 step: ${api.humanStatus(progress.current_step_id)}`,
    `Confidence: ${confidence}`,
    `Level 0 complete: ${progress.level_complete ? "Yes" : "No"}`,
    `Vendor tracks with records: ${vendorProgressCount}`,
    `Saved reports: ${state.history.length}`
  ].forEach((fact) => facts.append(labCreate("span", "badge", fact)));
  panel.append(facts);
  panel.append(labButton("Resume Level 0", "primary", () => { state.learning.levelId = "level_00"; state.learning.courseScreen = "lesson"; switchView("course"); }), labButton("Change learning path", "secondary", () => { saveLearningPath(""); announcePathChoice("Choose a learning path."); switchView("home"); }));
  els.progressRoot.append(panel);
}

function openTechnicianTool(tool) {
  const api = beginnerExperience();
  const destination = api.toolDestination(tool.id || tool.label || tool);
  state.learning.recentTool = destination.id;
  localStorage.setItem(api.STORAGE_KEYS.recentTool, destination.id);
  if (destination.libraryTab) state.lab.libraryTab = destination.libraryTab;
  if (destination.labScreen) state.lab.screen = destination.labScreen;
  switchView(destination.view);
  if (destination.id === "command-lookup") {
    state.lookupSource = "search";
    window.setTimeout(() => els.commandSearch?.focus(), 0);
  }
}

function renderTools() {
  if (!els.toolsRoot) return;
  els.toolsRoot.replaceChildren();
  const studio = missionStudioComponents();
  const panel = labCreate("section", "learn-track-panel");
  panel.append(labCreate("div", "lab-card-kicker", "Technician Tools"));
  panel.append(labCreate("h3", "", "Open the working app tools when you need them."));
  panel.append(labCreate("p", "", "These are local diagnostic, terminal, reference, and report surfaces. Instructor Mode is not part of beginner navigation."));
  els.toolsRoot.append(panel);
  const grid = labCreate("div", "library-grid");
  beginnerExperience().TECHNICIAN_TOOLS.forEach((tool) => {
    const card = renderMissionStudio(studio?.technicianToolCard({ tool, onAction: () => openTechnicianTool(tool) }));
    if (card) grid.append(card);
  });
  els.toolsRoot.append(grid);
}

function renderTechnicianReturn(viewName) {
  document.querySelectorAll(".technician-return-action").forEach((node) => node.remove());
  if (!["diagnose", "lab", "library", "knowledge", "history"].includes(viewName)) return;
  const activeView = document.getElementById(`${viewName}View`);
  const heading = activeView?.querySelector(".page-heading");
  if (!heading) return;
  const action = labButton("Back to Tools", "secondary technician-return-action", () => switchView("tools"));
  heading.append(action);
}

function switchView(viewName, options = {}) {
  els.navTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.view === viewName));
  els.views.forEach((view) => view.classList.toggle("active", view.id === `${viewName}View`));
  if (viewName === "lab") {
    if (options.resetLab) state.lab.screen = "dashboard";
    renderLab();
  }
  if (viewName === "home") renderHome();
  if (viewName === "course") renderCourse();
  if (viewName === "practice") renderPractice();
  if (viewName === "progress") renderProgress();
  if (viewName === "tools") renderTools();
  if (viewName === "learn") renderLearn();
  if (viewName === "library") renderLibrary();
  if (viewName === "diagnose") renderCommandLookup();
  if (viewName === "knowledge") renderKnowledge();
  if (viewName === "history") renderHistory();
  if (viewName === "admin") renderAdmin();
  renderTechnicianReturn(viewName);
  focusActiveViewHeading(viewName);
  if (viewName === "course" && state.learning.courseScreen === "lesson") window.setTimeout(focusLessonStepHeading, 20);
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
