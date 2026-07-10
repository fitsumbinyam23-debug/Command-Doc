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
  "data/commands/vendor_learning_extended.json"
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
  foundationLessons: "data/labs/lessons/foundation.json",
  foundationExtendedLessons: "data/labs/lessons/foundation_extended.json",
  configurationLessons: "data/labs/lessons/configuration.json",
  configurationExtendedLessons: "data/labs/lessons/configuration_extended.json",
  quizzes: "data/labs/quizzes/lesson-quizzes.json",
  extendedQuizzes: "data/labs/quizzes/extended-quizzes.json",
  scenarios: "data/labs/scenarios/scenarios.json"
};

const LAB_PROGRESS_KEY = "commandDoctorLabProgress";

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
    activeLessonId: "",
    practiceInput: "",
    practicePassed: false,
    quizSelection: null,
    scenarioScore: 0,
    console: {
      device: "hq",
      mode: "exec",
      activeInterface: "Gi1/0/24",
      vlan: "31",
      description: "Finance-PC",
      transcript: []
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
  state.lab.lessons = [
    ...(labData.foundationLessons?.lessons || []),
    ...(labData.foundationExtendedLessons?.lessons || []),
    ...(labData.configurationLessons?.lessons || []),
    ...(labData.configurationExtendedLessons?.lessons || [])
  ];
  state.lab.quizzes = { ...(labData.quizzes?.quizzes || {}), ...(labData.extendedQuizzes?.quizzes || {}) };
  state.lab.foundationFinalQuiz = labData.quizzes?.foundation_final || [];
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
  return labConfigurationUnlocked() && state.lab.progress.configurationCompleted;
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
  renderLabDashboard();
}

function renderLabDashboard() {
  const intro = labCreate("div", "lab-banner");
  intro.append(
    labCreate("strong", "lab-banner-title", "100% simulated practice"),
    labCreate("span", "lab-banner-copy", "Nothing in Lab Mode runs on a real device. Type commands, read evidence, and learn the safe next step.")
  );
  els.labRoot.append(intro);

  els.labRoot.append(labButton("Open Trainer Controls", "secondary lab-trainer-button", () => switchView("admin")));
  renderLabConsole();

  const stages = labCreate("div", "lab-stage-grid");
  state.lab.stages.forEach((stage) => {
    const unlocked = labStageUnlocked(stage.id);
    const card = labCreate("article", `lab-stage-card ${unlocked ? "" : "is-locked"}`);
    const status = unlocked ? (stage.id === "foundation" ? "Available" : "Unlocked") : "Locked";
    card.append(labCreate("span", `lab-status ${unlocked ? "available" : "locked"}`, status));
    card.append(labCreate("h3", "", stage.title));
    card.append(labCreate("p", "", stage.description));
    if (stage.id === "foundation") {
      card.append(labCreate("div", "lab-stage-metric", `${labProgressPercent(labFoundationLessons())}% complete`));
    } else if (stage.id === "configuration") {
      card.append(labCreate("div", "lab-stage-metric", labConfigurationUnlocked() ? "Ready for simulated configuration" : "Pass the Foundation final quiz"));
    } else {
      card.append(labCreate("div", "lab-stage-metric", state.lab.progress.configurationCompleted ? "Ready for final scenarios" : "Complete Configuration Lab"));
    }
    if (unlocked) {
      card.append(labButton(stage.id === "scenarios" ? "Open scenarios" : "Open stage", "secondary", () => openLabStage(stage.id)));
    } else {
      card.append(labCreate("span", "lab-lock-note", "Complete the previous stage to unlock"));
    }
    stages.append(card);
  });
  els.labRoot.append(stages);

  const foundationHeading = labCreate("div", "lab-section-heading");
  foundationHeading.append(labCreate("h3", "", "Basic Foundation"), labCreate("p", "", "Check first. Understand the evidence. Build safe troubleshooting habits."));
  els.labRoot.append(foundationHeading);
  const sectionGrid = labCreate("div", "lab-section-grid");
  state.lab.sections.filter((section) => section.stage === "foundation").forEach((section) => sectionGrid.append(renderLabSectionCard(section)));
  els.labRoot.append(sectionGrid);

  const finalQuiz = labCreate("article", "lab-final-card");
  finalQuiz.append(labCreate("div", "lab-card-kicker", "Foundation checkpoint"));
  finalQuiz.append(labCreate("h3", "", "Stage 1 Final Quiz"));
  finalQuiz.append(labCreate("p", "", labFoundationComplete() ? "All sample foundation lessons are complete. Pass with 80% to unlock Configuration Lab." : "Complete the available foundation lessons before taking the final quiz."));
  if (state.lab.progress.foundationFinalScore !== null) {
    finalQuiz.append(labCreate("strong", "lab-score", `Last score: ${state.lab.progress.foundationFinalScore}%`));
  }
  const quizButton = labButton(labFoundationComplete() ? "Take final quiz" : "Locked until lessons are complete", labFoundationComplete() ? "primary" : "secondary", () => {
    if (labFoundationComplete()) { state.lab.screen = "final-quiz"; renderLab(); }
  });
  quizButton.disabled = !labFoundationComplete();
  finalQuiz.append(quizButton);
  els.labRoot.append(finalQuiz);

  if (labConfigurationUnlocked()) {
    const configHeading = labCreate("div", "lab-section-heading");
    configHeading.append(labCreate("h3", "", "Configuration Lab"), labCreate("p", "", "Practice a controlled simulated change, verify it, and learn the rollback."));
    els.labRoot.append(configHeading);
    const configGrid = labCreate("div", "lab-section-grid");
    state.lab.sections.filter((section) => section.stage === "configuration").forEach((section) => configGrid.append(renderLabSectionCard(section)));
    els.labRoot.append(configGrid);
    const config = labCreate("article", "lab-unlock-card");
    config.append(labCreate("strong", "", "Configuration Lab unlocked. You are now ready to practice simulated configuration."));
    config.append(labButton("Open Configuration Lab", "secondary", () => openLabStage("configuration")));
    els.labRoot.append(config);
  }
}

function renderLabConsole() {
  const consolePanel = labCreate("section", "lab-console-panel");
  consolePanel.append(labCreate("div", "lab-card-kicker", "Simulated switch console"));
  consolePanel.append(labCreate("h3", "", "Practice From First Check to Change and Verification"));
  consolePanel.append(labCreate("p", "", "Choose an imaginary device. Commands only change the local simulation and never reach a real network."));
  const selector = document.createElement("select");
  selector.className = "lab-device-select";
  [
    ["hq", "HQ-ACC-01 | Cisco access switch"],
    ["branch", "BRANCH-ACC-02 | Cisco branch switch"],
    ["warehouse", "WH-ACC-03 | Cisco warehouse switch"],
    ["irf", "CORE-IRF-01 | HP Comware IRF stack"],
    ["aruba", "EDGE-CX-01 | ArubaOS-CX edge switch"]
  ].forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    selector.append(option);
  });
  selector.value = state.lab.console.device;
  selector.addEventListener("change", () => {
    state.lab.console = { device: selector.value, mode: "exec", activeInterface: deviceProfile(selector.value).port, vlan: deviceProfile(selector.value).vlan, description: deviceProfile(selector.value).endpoint, transcript: [] };
    renderLab();
  });
  consolePanel.append(selector);

  const terminal = labCreate("div", "lab-console-terminal");
  const transcript = state.lab.console.transcript.length
    ? state.lab.console.transcript.join("\n\n")
    : "Choose a device, then start with a read-only command such as show interface status or display irf.";
  terminal.append(labCreate("pre", "lab-console-output", transcript));
  const row = labCreate("div", "lab-console-input-row");
  row.append(labCreate("span", "lab-console-prompt", consolePrompt()));
  const input = document.createElement("input");
  input.className = "lab-terminal-input";
  input.placeholder = "Type a simulated command";
  input.setAttribute("aria-label", "Simulated switch command");
  input.addEventListener("keydown", (event) => { if (event.key === "Enter") runLabConsoleCommand(input); });
  row.append(input);
  consolePanel.append(terminal, row);
  const controls = labCreate("div", "lab-console-actions");
  controls.append(labButton("Run simulated command", "primary", () => runLabConsoleCommand(input)));
  controls.append(labButton("Clear console", "secondary", () => { state.lab.console.transcript = []; renderLab(); }));
  consolePanel.append(controls);
  els.labRoot.append(consolePanel);
}

function deviceProfile(device) {
  const profiles = {
    hq: { name: "HQ-ACC-01", vendor: "Cisco IOS", port: "Gi1/0/24", endpoint: "Finance-PC", vlan: "31" },
    branch: { name: "BRANCH-ACC-02", vendor: "Cisco IOS", port: "Gi1/0/12", endpoint: "Reception-PC", vlan: "20" },
    warehouse: { name: "WH-ACC-03", vendor: "Cisco IOS", port: "Gi1/0/8", endpoint: "Scanner-07", vlan: "50" },
    irf: { name: "CORE-IRF-01", vendor: "HP Comware", port: "GigabitEthernet1/0/24", endpoint: "Distribution-Uplink", vlan: "30" },
    aruba: { name: "EDGE-CX-01", vendor: "ArubaOS-CX", port: "1/1/10", endpoint: "Training-AP", vlan: "40" }
  };
  return profiles[device] || profiles.hq;
}

function consolePrompt() {
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
  const output = simulateLabCommand(command);
  state.lab.console.transcript.push(`${consolePrompt()} ${command}\n${output}`);
  if (state.lab.console.transcript.length > 8) state.lab.console.transcript.shift();
  input.value = "";
  renderLab();
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
  if (/^show cdp neighbors/.test(lower)) return `Device ID       Local Intrfce   Platform\nCORE-SW         ${consoleState.activeInterface}      C9300`;
  if (/^display irf$/.test(lower)) return "MemberID  Role     Priority\n1         Master   32\n2         Standby  31";
  if (/^display irf topology/.test(lower)) return "Topology Info\nMember 1  IRF-Port1 UP  IRF-Port2 UP\nMember 2  IRF-Port1 UP  IRF-Port2 UP";
  if (/^show interface brief/.test(lower)) return `Interface  Status  Speed\n${profile.port}     up      1G`;
  if (/^(write memory|copy running-config startup-config|save)$/.test(lower)) return "Simulated configuration saved. In real work, save only after approved verification.";
  const knownCommand = state.commands.find((item) => normalizeCommandText(item.command) === normalizeCommandText(command));
  if (knownCommand) {
    return `Recognized offline command: ${knownCommand.command}\n${knownCommand.meaning}\n\nThis command is available in Command Lookup. A detailed device-specific simulation has not been authored for this device yet.`;
  }
  return "Unknown simulated command. Try show interface status, show vlan brief, show running-config interface <port>, configure terminal, display irf, or display irf topology.";
}

function renderLabSectionCard(section) {
  const lessons = section.lesson_ids.map((id) => state.lab.lessons.find((lesson) => lesson.id === id)).filter(Boolean);
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
  if (stageId === "scenarios") {
    state.lab.screen = "scenario";
    state.lab.activeLessonId = state.lab.scenarios[0]?.id || "";
  } else {
    const stageLessons = state.lab.lessons.filter((lesson) => {
      const section = state.lab.sections.find((item) => item.id === lesson.section_id);
      return section?.stage === stageId;
    });
    const nextLesson = stageLessons.find((lesson) => !state.lab.progress.completedLessons[lesson.id]) || stageLessons[0];
    if (nextLesson) {
      openLabLesson(nextLesson.id);
      return;
    }
    state.lab.screen = "dashboard";
  }
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
  els.labRoot.append(labButton("Back to Lab Dashboard", "secondary lab-back-button", () => { state.lab.screen = "dashboard"; renderLab(); }));
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
