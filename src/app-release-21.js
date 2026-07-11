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

const LAB_PROGRESS_KEY = "commandDoctorLabProgress";

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
    activeSectionId: "",
    playgroundTaskId: "free-practice",
    visualNetwork: null,
    activeLessonId: "",
    practiceInput: "",
    practicePassed: false,
    quizSelection: null,
    scenarioScore: 0,
    vendorTrack: "all",
    console: {
      device: "access",
      missionId: "access-vlan",
      mode: "exec",
      activeInterface: "<ACCESS_PORT>",
      vlan: "<VLAN_ID>",
      description: "<DEVICE_NAME>",
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
  renderLab();
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
    tab.addEventListener("click", () => switchView(tab.dataset.view));
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
  migrateLabProgress();

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
  const heading = labCreate("section", "lab-home-heading");
  heading.append(labCreate("div", "lab-card-kicker", "Offline simulated training"));
  heading.append(labCreate("h3", "", "Lab Mode"));
  heading.append(labCreate("p", "", "Learn one topic at a time, then practice safely on a local simulated switch."));
  els.labRoot.append(heading);

  const intro = labCreate("div", "lab-banner");
  intro.append(labCreate("strong", "lab-banner-title", "100% simulated practice"), labCreate("span", "lab-banner-copy", "Nothing here runs on a real device. Commands, outputs, and changes stay in this browser."));
  els.labRoot.append(intro);

  const stages = labCreate("div", "lab-stage-grid");
  const stageOrder = ["foundation", "configuration", "playground"];
  stageOrder.forEach((id) => {
    const stage = state.lab.stages.find((item) => item.id === id) || { id, title: id, description: "" };
    const unlocked = labStageUnlocked(id);
    const complete = id === "foundation" ? labFoundationComplete() : id === "configuration" ? state.lab.progress.configurationCompleted : false;
    const status = complete ? "Completed" : unlocked ? "Available" : "Locked";
    const card = labCreate("article", `lab-stage-card ${unlocked ? "" : "is-locked"}`);
    card.append(labCreate("span", `lab-status ${unlocked ? "available" : "locked"}`, status));
    card.append(labCreate("h3", "", stage.title));
    card.append(labCreate("p", "", stage.description));
    const metric = id === "foundation" ? `${labProgressPercent(labFoundationLessons())}% complete` : id === "configuration" ? (labConfigurationUnlocked() ? "Ready for guided configuration" : "Pass the Foundation checkpoint") : (unlocked ? "Ready for free practice" : "Complete four safety foundations");
    card.append(labCreate("div", "lab-stage-metric", metric));
    const button = labButton("Open", unlocked ? "primary" : "secondary", () => openLabStage(id));
    button.disabled = !unlocked;
    card.append(button);
    stages.append(card);
  });
  els.labRoot.append(stages);
  renderLabConsole();
  renderVisualNetworkPlayground();
}

function renderLabBreadcrumb(items) {
  const trail = labCreate("nav", "lab-breadcrumb", "");
  trail.setAttribute("aria-label", "Lab navigation");
  items.forEach((item, index) => {
    if (index) trail.append(labCreate("span", "", ">"));
    const button = labButton(item.label, "lab-breadcrumb-link", () => { state.lab.screen = item.screen; renderLab(); });
    button.disabled = !item.screen;
    trail.append(button);
  });
  els.labRoot.append(trail);
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
  renderLabBreadcrumb([{ label: "Lab Mode", screen: "dashboard" }, { label: stage?.title || "Stage", screen: "stage" }, { label: section.title }]);
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
  }))));
}

const PLAYGROUND_TASKS = buildTrainingRoutes();

function currentTrainingRoute() {
  return PLAYGROUND_TASKS.find((item) => item.id === state.lab.playgroundTaskId) || PLAYGROUND_TASKS[0];
}

function renderLabPlayground() {
  if (!labPlaygroundUnlocked()) { state.lab.screen = "dashboard"; renderLab(); return; }
  renderLabBreadcrumb([{ label: "Lab Mode", screen: "dashboard" }, { label: "Playground" }]);
  const task = PLAYGROUND_TASKS.find((item) => item.id === state.lab.playgroundTaskId) || PLAYGROUND_TASKS[0];
  const header = labCreate("section", "lab-page-header");
  header.append(labCreate("div", "lab-card-kicker", "Simulated switch playground"));
  header.append(labCreate("h3", "", "Practice on a local imaginary switch"));
  header.append(labCreate("p", "", `Choose from ${PLAYGROUND_TASKS.length} local training routes, type every command yourself, then verify the result. Nothing connects to a network or changes a real device.`));
  els.labRoot.append(header);

  const taskBar = labCreate("section", "lab-playground-taskbar");
  const selectorField = labCreate("label", "lab-setup-field");
  selectorField.append(labCreate("span", "", "Scenario"));
  const selector = document.createElement("select");
  selector.setAttribute("aria-label", "Playground scenario");
  [...new Set(PLAYGROUND_TASKS.map((item) => item.category))].forEach((category) => {
    const group = document.createElement("optgroup");
    group.label = category;
    PLAYGROUND_TASKS.filter((item) => item.category === category).forEach((item) => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.label;
      group.append(option);
    });
    selector.append(group);
  });
  selector.value = task.id;
  selector.addEventListener("change", () => {
    const next = PLAYGROUND_TASKS.find((item) => item.id === selector.value) || PLAYGROUND_TASKS[0];
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
    hostname: "SIM-SWITCH",
    vendor: "Cisco IOS",
    ports,
    vlans: { "1": { name: "DEFAULT" } },
    devices: [
      { id: "pc-1", name: "PC-1", type: "Desktop PC", mac: "02:00:00:00:00:01", ip: "", mask: "255.255.255.0", gateway: "", method: "static", port: "", lastPing: "Not tested" },
      { id: "pc-2", name: "PC-2", type: "Laptop", mac: "02:00:00:00:00:02", ip: "", mask: "255.255.255.0", gateway: "", method: "static", port: "", lastPing: "Not tested" }
    ],
    macs: [],
    selectedPort: "GigabitEthernet1/0/1",
    selectedDeviceId: "pc-1",
    selectedVlan: "",
    traffic: "",
    saved: false
  };
}

function visualNetwork() {
  if (!state.lab.visualNetwork) state.lab.visualNetwork = createVisualNetwork();
  return state.lab.visualNetwork;
}

function visualPort(network, name = network.selectedPort) {
  return network.ports[name] || null;
}

function visualDevice(network, id = network.selectedDeviceId) {
  return network.devices.find((device) => device.id === id) || null;
}

function visualPortIsUp(port) {
  return Boolean(port && port.adminUp && !port.errorDisabled && port.connectedDeviceId && port.cable === "good");
}

function visualMacRefresh(network) {
  network.macs = network.devices.flatMap((device) => {
    const port = visualPort(network, device.port);
    return device.port && visualPortIsUp(port) && network.vlans[port.vlan] ? [{ vlan: port.vlan, mac: device.mac, type: "Dynamic", interface: port.name, age: "0" }] : [];
  });
}

function syncEngineFromVisual() {
  const network = visualNetwork();
  const engine = getLabEngine();
  if (!engine) return;
  engine.state.hostname = network.hostname;
  engine.state.interfaces = Object.fromEntries(Object.values(network.ports).map((port) => [port.name, {
    description: port.description,
    vlan: port.vlan,
    shutdown: !port.adminUp,
    connected: Boolean(port.connectedDeviceId),
    mode: port.mode,
    allowedVlans: port.allowedVlans,
    voiceVlan: port.voiceVlan
  }]));
  engine.state.vlans = Object.keys(network.vlans);
  engine.state.vlanNames = Object.fromEntries(Object.entries(network.vlans).map(([id, vlan]) => [id, vlan.name]));
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
  visualMacRefresh(network);
  const panel = labCreate("section", "visual-playground");
  const heading = labCreate("div", "visual-playground-heading");
  heading.append(labCreate("div", "lab-card-kicker", "Offline simulated training"));
  heading.append(labCreate("h3", "", "Visual Network Playground"));
  heading.append(labCreate("p", "", "Build a small topology, configure the local simulated switch through the CLI or visual controls, and test connectivity. It never connects to real equipment."));
  panel.append(heading);
  const topologyHost = labCreate("div", "visual-topology-host");
  const topologyOptions = {
    onChange: () => {
      visualMacRefresh(network);
      syncEngineFromVisual();
      renderLab();
    }
  };
  if (window.CommandDoctorTopology) {
    window.CommandDoctorTopology.render(topologyHost, network, topologyOptions);
  } else {
    topologyHost.append(labCreate("p", "", "Topology workspace is loading."));
  }
  panel.append(topologyHost);
  panel.append(renderVisualNextStep(network));

  const grid = labCreate("div", "visual-playground-grid");
  grid.append(renderVisualDetails(network));
  panel.append(grid, renderVisualVerification(network));
  els.labRoot.append(panel);
}

function renderVisualNextStep(network) {
  const connected = network.ports.filter((port) => port.connectedDeviceId).length;
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
  config.append(labButton("Apply device IP settings", "secondary", () => { Object.entries(fields).forEach(([key, input]) => { device[key] = input.value.trim(); }); recordVisualCommands([`! ${device.name} IP configured locally`], `Updated ${device.name} local IP settings.`); renderLab(); }));
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
  const ok = source && target && source.ip && target.ip && visualPortIsUp(sourcePort) && visualPortIsUp(targetPort) && sourcePort.vlan === targetPort.vlan && sameVisualSubnet(source, target);
  const message = ok ? `Ping success: ${source.name} reached ${target.name}. Simulated packet travelled through ${sourcePort.name} and ${targetPort.name}.` : "Ping failed: check cable, port status, VLAN, and IP subnet in the local simulation.";
  if (source) source.lastPing = message; if (target) target.lastPing = message;
  if (sourcePort) sourcePort.lastActivity = "Ping tested"; if (targetPort) targetPort.lastActivity = "Ping tested";
  visualMacRefresh(network); recordVisualCommands([`ping ${target?.ip || "<DESTINATION_IP>"}`], message); showToast(message); renderLab();
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
  panel.append(labButton("Reset visual topology", "secondary", () => { state.lab.visualNetwork = createVisualNetwork(); syncEngineFromVisual(); renderLab(); }));
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
    ["Endpoint label", "endpoint", String(engine.current().description).includes("<") ? "PC-1" : engine.current().description],
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
  const topologyHost = labCreate("div", "lab-topology-host");
  const topologyNetwork = visualNetwork();
  const topologyOptions = { onChange: () => { syncEngineFromVisual(); } };
  if (window.CommandDoctorTopology) window.CommandDoctorTopology.render(topologyHost, topologyNetwork, topologyOptions);
  else topologyHost.dispatchEvent(new CustomEvent("commanddoctor:render-topology", { bubbles: true, detail: { container: topologyHost, network: topologyNetwork, options: topologyOptions } }));
  consolePanel.append(topologyHost);
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
  const workspace = labCreate("div", "lab-simulator-workspace");
  workspace.append(renderLabDeviceVisual(engine));

  const terminalPane = labCreate("section", "lab-terminal-pane");
  terminalPane.append(labCreate("label", "lab-control-label", "Simulated device"), selector);
  const activeRoute = currentTrainingRoute();
  const nextCommand = getTrainingRouteGuidance(engine)?.command || getLabGuidance(engine).command;
  const routeStatus = labCreate("section", "lab-route-status");
  routeStatus.append(labCreate("strong", "", `Route: ${activeRoute.label}`));
  routeStatus.append(labCreate("p", "", `Step 1: type ${nextCommand} below, then press Enter or Run simulated command. Every command is entered by you.`));
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
  input.setAttribute("aria-label", "Simulated switch command");
  input.addEventListener("keydown", (event) => { if (event.key === "Enter") runLabConsoleCommand(input); });
  row.append(input);
  terminalPane.append(terminal, row);
  const controls = labCreate("div", "lab-console-actions");
  controls.append(labButton("Run simulated command", "primary", () => runLabConsoleCommand(input)));
  controls.append(labButton("Start fresh switch", "secondary", startFreshTrainingSwitch));
  controls.append(labButton("Reset device", "secondary", () => { engine.rollback(); engine.transcript = []; engine.commands = []; renderLab(); showToast("The simulated device was reset to its starting state."); }));
  controls.append(labButton("Open focused terminal", "secondary", () => { state.lab.screen = "cli"; renderLab(); }));
  terminalPane.append(controls);
  workspace.append(terminalPane, renderLabCoach(engine));
  consolePanel.append(workspace);
  els.labRoot.append(consolePanel);
  if (state.lab.console.focusRequested) {
    state.lab.console.focusRequested = false;
    setTimeout(() => { input.scrollIntoView({ behavior: "smooth", block: "center" }); input.focus(); }, 0);
  }
}

function renderManualRouteSelector() {
  const route = currentTrainingRoute();
  const panel = labCreate("section", "lab-manual-route-panel");
  panel.append(labCreate("strong", "", "Manual CLI training path"));
  panel.append(labCreate("span", "", `${PLAYGROUND_TASKS.length} routes are available. Choose a route, press Start selected route, then type every command yourself in Step 1.`));
  const select = document.createElement("select");
  select.setAttribute("aria-label", "Manual CLI training path");
  [...new Set(PLAYGROUND_TASKS.map((item) => item.category))].forEach((category) => {
    const group = document.createElement("optgroup");
    group.label = category;
    PLAYGROUND_TASKS.filter((item) => item.category === category).forEach((item) => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.label;
      group.append(option);
    });
    select.append(group);
  });
  select.value = route.id;
  select.addEventListener("change", () => { state.lab.playgroundTaskId = select.value; renderLab(); });
  panel.append(select, labButton("Start selected route", "primary", startFreshTrainingSwitch));
  return panel;
}

function startFreshTrainingSwitch() {
  const route = currentTrainingRoute();
  const engine = createLabEngine(route.device);
  if (engine?.setTrainingProfile) engine.setTrainingProfile({ hostname: "TRAINING-SWITCH", interface: "GigabitEthernet1/0/1", endpoint: "PC-1", currentVlan: "1", targetVlan: "20" });
  state.lab.console.engine = engine;
  state.lab.console.device = route.device;
  state.lab.console.routeStarted = route.id;
  state.lab.console.focusRequested = true;
  state.lab.visualNetwork = createVisualNetwork();
  state.lab.visualNetwork.hostname = "TRAINING-SWITCH";
  renderLab();
  showToast(`${route.label} is ready. Step 1 is waiting in the console.`);
}

function renderLabCliWorkspace() {
  const engine = getLabEngine();
  els.labRoot.append(labButton("Back to Playground", "secondary lab-back-button", () => { state.lab.screen = labPlaygroundUnlocked() ? "playground" : "dashboard"; renderLab(); }));
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
  input.addEventListener("keydown", (event) => { if (event.key === "Enter") runLabConsoleCommand(input); });
  row.append(input);
  terminal.append(row);
  workspace.append(terminal);

  const actions = labCreate("div", "lab-console-actions");
  actions.append(labButton("Run command", "primary", () => runLabConsoleCommand(input)));
  actions.append(labButton("Clear terminal", "secondary", () => { engine.transcript = []; renderLab(); }));
  actions.append(labButton("Reset simulated device", "secondary", () => { engine.rollback(); engine.transcript = []; engine.commands = []; renderLab(); showToast("The simulated device was reset."); }));
  els.labRoot.append(workspace, actions);
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
  return {
    title: complete ? "Full Configuration Verified" : `Guided Route: ${route.label}`,
    explanation: complete ? "You manually completed every route checkpoint. Review the actual simulated switch state, then decide whether to save or reset for another attempt." : `Step ${nextIndex + 1} of ${route.steps.length}: ${step.why}`,
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
    access: { name: "<SWITCH_NAME>", vendor: "Cisco IOS", port: "<ACCESS_PORT>", endpoint: "<DEVICE_NAME>", vlan: "<VLAN_ID>" },
    disabled: { name: "<SWITCH_NAME>", vendor: "Cisco IOS", port: "<ACCESS_PORT>", endpoint: "<DEVICE_NAME>", vlan: "<VLAN_ID>" },
    trunk: { name: "<SWITCH_NAME>", vendor: "Cisco IOS", port: "<TRUNK_PORT>", endpoint: "<UPLINK_DEVICE>", vlan: "<VLAN_ID>" },
    irf: { name: "<SWITCH_NAME>", vendor: "HP Comware", port: "<IRF_PORT>", endpoint: "<STACK_MEMBER_ID>", vlan: "<VLAN_ID>" },
    aruba: { name: "<SWITCH_NAME>", vendor: "ArubaOS-CX", port: "<ACCESS_PORT>", endpoint: "<DEVICE_NAME>", vlan: "<VLAN_ID>" }
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
  let result = engine ? engine.execute(command) : { output: simulateLabCommand(command), diff: "Simulator engine unavailable." };
  const visualResult = syncVisualCliCommand(command, engine);
  if (visualResult) result = { ...result, ok: visualResult.ok, kind: visualResult.kind || result.kind, output: visualResult.output, diff: "" };
  if (engine && !result.ok && result.kind === "unknown") {
    const known = findKnownLabCommand(command);
    if (known) {
      result = {
        ...result,
        ok: true,
        kind: "catalog",
        output: `Recognized offline command: ${known.command}\n${known.meaning}\n\nThis command is available for study in Command Lookup. A device-specific simulated response has not been authored for this practice device yet.`
      };
    }
  }
  if (engine) {
    engine.transcript.push(`${prompt} ${command}\n${result.output}${result.diff ? `\n\nConfiguration diff\n${result.diff}` : ""}`);
    if (engine.transcript.length > 8) engine.transcript.shift();
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
  return window.CommandDoctorLabEngine ? new window.CommandDoctorLabEngine.SimulatedDeviceEngine(device) : null;
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
  if (/^show cdp neighbors/.test(lower)) return `Device ID       Local Intrfce   Platform\n<UPLINK_DEVICE>         ${consoleState.activeInterface}      <PLATFORM>`;
  if (/^display irf$/.test(lower)) return "MemberID  Role     Priority\n<STACK_MEMBER_ID>         Master   <PRIORITY>";
  if (/^display irf topology/.test(lower)) return "Topology Info\nMember <STACK_MEMBER_ID>  <IRF_PORT> UP";
  if (/^show interface brief/.test(lower)) return `Interface  Status  Speed\n${profile.port}     up      1G`;
  if (/^(write memory|copy running-config startup-config|save)$/.test(lower)) return "Simulated configuration saved. In real work, save only after approved verification.";
  const knownCommand = state.commands.find((item) => normalizeCommandText(item.command) === normalizeCommandText(command));
  if (knownCommand) {
    return `Recognized offline command: ${knownCommand.command}\n${knownCommand.meaning}\n\nThis command is available in Command Lookup. A detailed device-specific simulation has not been authored for this device yet.`;
  }
  return "Unknown simulated command. Try show interface status, show vlan brief, show running-config interface <port>, configure terminal, display irf, or display irf topology.";
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
  if (!labStageUnlocked(stageId)) return;
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
  renderLabBreadcrumb([{ label: "Lab Mode", screen: "dashboard" }, { label: stage?.title || "Stage", screen: "stage" }, { label: section?.title || "Section", screen: "section" }, { label: lesson.title }]);
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

function switchView(viewName) {
  els.navTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.view === viewName));
  els.views.forEach((view) => view.classList.toggle("active", view.id === `${viewName}View`));
  if (viewName === "lab") renderLab();
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
