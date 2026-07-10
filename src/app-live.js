Exit code: 0
Wall time: 3.7 seconds
Total output lines: 2842
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
    scenarioScore: 0
  }
};

const els = {};

document.addEventListener("DOMContentLoaded", init);

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

  if (vendorDetection.key ===…14485 tokens truncated…"
  };
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
  return state.lab.lessons.filter((lesson) => lesson.section_id !== "configuration-core");
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
    state.lab.screen = "dashboard";
  }
  renderLab();
}

function openLabLesson(lessonId) {
  const lesson = state.lab.lessons.find((item) => item.id === lessonId);
  if (!lesson || (lesson.section_id === "configuration-core" && !labConfigurationUnlocked())) {
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
  const lessons = lesson.section_id === "configuration-core"
    ? state.lab.lessons.filter((item) => item.section_id === "configuration-core")
    : labFoundationLessons();
  const index = lessons.findIndex((item) => item.id === lesson.id);
  return lessons[index + 1] || null;
}

function finishLabLesson(lesson, correct, explanation) {
  const score = correct ? 100 : 0;
  state.lab.progress.lessonScores[lesson.id] = score;
  state.lab.quizSelection = correct ? 0 : -1;
  if (correct) state.lab.progress.completedLessons[lesson.id] = true;
  if (correct && lesson.section_id === "configuration-core") state.lab.progress.configurationCompleted = true;
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

