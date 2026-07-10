Exit code: 0
Wall time: 3.1 seconds
Output:
import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const sandbox = {
  console,
  crypto: { randomUUID: () => "test-id" },
  document: {
    addEventListener() {},
    getElementById() { return null; },
    querySelectorAll() { return []; }
  },
  window: {
    clearTimeout() {},
    setTimeout() {}
  }
};

const appSource = await fs.readFile(path.join(root, "src", "app.js"), "utf8");
const indexSource = await fs.readFile(path.join(root, "index.html"), "utf8");
assert(!/<input[^>]+id="commandSearch"[^>]+\slist=/.test(indexSource), "lookup input does not use a duplicate native datalist");
assert(!indexSource.includes("<datalist"), "native alias datalist removed");
vm.runInNewContext(
  `${appSource}\nglobalThis.__CommandDoctorTest = { state, diagnose, findCommandLookupMatches, getPastedLookupQuery };`,
  sandbox,
  { filename: "src/app.js" }
);

const engine = sandbox.__CommandDoctorTest;
const commandFiles = [
  "cisco_ios.json",
  "hp_comware.json",
  "aruba_cx.json",
  "windows_cmd.json",
  "linux.json",
  "admin_commands.json",
  "platform_commands.json",
  "network_commands_extended.json",
  "vendor_learning_extended.json"
];

const labFiles = [
  ["stages.json", "stages"],
  ["sections.json", "sections"],
  ["lessons/foundation.json", "lessons"],
  ["lessons/foundation_extended.json", "lessons"],
  ["lessons/configuration.json", "lessons"],
  ["lessons/configuration_extended.json", "lessons"],
  ["quizzes/lesson-quizzes.json", "quizzes"],
  ["quizzes/extended-quizzes.json", "quizzes"],
  ["scenarios/scenarios.json", "scenarios"]
];

for (const [fileName, key] of labFiles) {
  const lab = JSON.parse(await fs.readFile(path.join(root, "data", "labs", fileName), "utf8"));
  assert(lab[key] || (key === "quizzes" && lab.foundation_final), `Lab ${fileName} loads`);
}

engine.state.commands = [];
for (const fileName of commandFiles) {
  const file = JSON.parse(
    await fs.readFile(path.join(root, "data", "commands", fileName), "utf8")
  );
  for (const command of file.commands) {
    const commandVendorKey = command.vendor_key || file.vendor_key;
    const commandVendorLabel = command.vendor_label || file.vendor;
    engine.state.commands.push({
      ...command,
      vendor_key: commandVendorKey,
      vendor_label: commandVendorLabel,
      knowledge_base_version: file.knowledge_base_version
    });
  }
}

engine.state.safety = JSON.parse(
  await fs.readFile(path.join(root, "data", "safety", "dangerous_commands.json"), "utf8")
);
engine.state.sources = JSON.parse(
  await fs.readFile(path.join(root, "data", "sources", "sources.json"), "utf8")
);
engine.state.flows = await Promise.all(
  [
    "interface_troubleshooting.json",
    "vlan_troubleshooting.json",
    "stack_troubleshooting.json",
    "dns_troubleshooting.json",
    "gateway_troubleshooting.json"
  ].map(async (fileName) => JSON.parse(
    await fs.readFile(path.join(root, "data", "flows", fileName), "utf8")
  ))
);

const cases = [
  {
    name: "Cisco notconnect",
    text: `Switch# show interface status

Port      Name       Status       Vlan       Duplex  Speed Type
Gi1/0/24  Lobby-AP   notconnect   30         auto    auto  10/100/1000BaseTX`,
    vendor: "Cisco IOS",
    command: "show interface status",
    status: "Warning",
    next: "show interface Gi1/0/24"
  },
  {
    name: "Cisco err-disabled",
    text: `Switch# show interface status

Port      Name       Status       Vlan       Duplex  Speed Type
Gi1/0/25  Camera     err-disabled 40         auto    auto  10/100/1000BaseTX`,
    vendor: "Cisco IOS",
    command: "show interface status",
    status: "Critical",
    next: "show interface Gi1/0/25"
  },
  {
    name: "Cisco shorthand vlan brief",
    text: `Switch# sh vlan brief

VLAN Name                             Status    Ports
---- -------------------------------- --------- -------------------------------
1    default                          active    Gi1/0/1
30   LOBBY                            active    Gi1/0/24`,
    vendor: "Cisco IOS",
    command: "show vlan brief",
    status: "Info",
    next: "show interface status"
  },
  {
    name: "HP Comware down",
    text: `<HP> display interface brief
Interface            Link Protocol Main IP         Description
GigabitEthernet1/0/24 DOWN DOWN     --              Lobby AP`,
    vendor: "HP Comware",
    command: "display interface brief",
    status: "Warning",
    next: "display interface GigabitEthernet1/0/24"
  },
  {
    name: "HP Comware irf-port exact",
    text: `<HP> display irf-port
MemberID  IRF-Port1                 IRF-Port2
1         Ten-GigabitEthernet1/0/49 DOWN`,
    vendor: "HP Comware",
    command: "display irf-port",
    status: "Critical",
    next: "display irf topology"
  },
  {
    name: "Aruba down",
    text: `switch# show interface brief

Interface  Status  Speed  Duplex
1/1/24     down    auto   auto`,
    vendor: "ArubaOS-CX",
    command: "show interface brief",
    status: "Warning",
    next: "show interface 1/1/24"
  },
  {
    name: "Windows APIPA",
    text: `Windows IP Configuration

Ethernet adapter Ethernet:
   Autoconfiguration IPv4 Address. . : 169.254.12.44(Preferred)
   Default Gateway . . . . . . . . . :`,
    vendor: "Windows CMD",
    command: "ipconfig /all",
    status: "Critical",
    next: "ping <gateway>"
  },
  {
    name: "Linux no carrier",
    text: `2: enp3s0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc fq_codel state DOWN mode DEFAULT group default qlen 1000
    inet 192.168.10.55/24 brd 192.168.10.255 scope global enp3s0`,
    vendor: "Linux",
    command: "ip addr",
    status: "Critical",
    next: "ip route"
  }
];

for (const testCase of cases) {
  const report = engine.diagnose(testCase.text, "auto");
  assertEqual(report.vendor, testCase.vendor, `${testCase.name} vendor`);
  assertEqual(report.command, testCase.command, `${testCase.name} command`);
  assertEqual(report.status, testCase.status, `${testCase.name} status`);
  assertEqual(report.nextCommands[0]?.renderedCommand, testCase.next, `${testCase.name} next command`);
  assert(report.goodOutput.length > 0, `${testCase.name} good output`);
  assert(report.badOutput.length > 0, `${testCase.name} bad output`);
  assert(report.troubleshootingFlow, `${testCase.name} troubleshooting flow`);
}

const safetyReport = engine.diagnose(
  `Switch# show running-config interface Gi1/0/24
interface Gi1/0/24
 shutdown`,
  "auto"
);
assertEqual(safetyReport.status, "Warning", "shutdown status");
assert(safetyReport.dangerWarnings.length > 0, "shutdown safety warning");

const lookupCases = [
  ["conf t", "configure terminal"],
  ["int 1/1/5", "interface <interface>"],
  ["undo shutdown", "undo shutdown"],
  ["ipconfig /renew", "ipconfig /renew"],
  ["sudo ip link set eth0 down", "sudo ip link set <interface> down"]
];

for (const [query, expectedCommand] of lookupCases) {
  const matches = engine.findCommandLookupMatches(query, 6);
  assertEqual(matches[0]?.command, expectedCommand, `${query} lookup`);
  assert(matches[0]?.safetyLevel, `${query} risk level`);
}

for (const partial of ["sh", "dis", "diag", "flash:"]) {
  assertEqual(engine.getPastedLookupQuery(partial), partial, `${partial} paste lookup prefix`);
}
assertEqual(engine.findCommandLookupMatches("flash:", 1)[0]?.command, "dir flash:", "flash filesystem suggestion");
assert(engine.findCommandLookupMatches("diag", 6).some((match) => match.command.includes("diagnostic")), "diagnostic suggestions available");
assertEqual(engine.findCommandLookupMatches("sh ip int br", 1)[0]?.command, "show ip interface brief", "Cisco IP interface shorthand");
assertEqual(engine.findCommandLookupMatches("dis ip route", 1)[0]?.command, "display ip routing-table", "Comware routing shorthand");
assertEqual(engine.findCommandLookupMatches("netsh wlan show interfaces", 1)[0]?.command, "netsh wlan show interfaces", "Windows wireless command");
assertEqual(engine.findCommandLookupMatches("ss -tulpn", 1)[0]?.command, "ss -tulpn", "Linux listening sockets command");
assertEqual(engine.getPastedLookupQuery("Gi1/0/24 notconnect 30"), "", "single output row is not treated as a command");
assertEqual(engine.getPastedLookupQuery("show interface status\nGi1/0/24 notconnect 30"), "", "multi-line output hides command suggestions");
assert(JSON.parse(await fs.readFile(path.join(root, "data", "labs", "lessons", "foundation.json"), "utf8")).lessons.length === 6, "six foundation lessons available");
assert(JSON.parse(await fs.readFile(path.join(root, "data", "labs", "lessons", "foundation_extended.json"), "utf8")).lessons.length === 4, "four extended foundation lessons available");
assert(JSON.parse(await fs.readFile(path.join(root, "data", "labs", "lessons", "configuration.json"), "utf8")).lessons[0].commands.length > 5, "configuration lesson has simulated command sequence");
assert(JSON.parse(await fs.readFile(path.join(root, "data", "labs", "lessons", "configuration_extended.json"), "utf8")).lessons.length === 8, "eight extended configuration lessons available");

const adminExplainReport = engine.diagnose("ipconfig /renew", "auto");
assertEqual(adminExplainReport.mode, "Explanation Mode", "admin command explanation mode");
assertEqual(adminExplainReport.command, "ipconfig /renew", "admin command recognized");
assert(adminExplainReport.safetyLevel.includes("Medium"), "admin risk visible");

const irfPortExplainReport = engine.diagnose("display irf-port", "auto");
assertEqual(irfPortExplainReport.mode, "Explanation Mode", "IRF port command explanation mode");
assertEqual(irfPortExplainReport.command, "display irf-port", "IRF port command recognized");
assertEqual(irfPortExplainReport.ticketSummary, "Command recognized, but no output was provided for diagnosis.", "IRF port explanation ticket summary");

console.log(`Command Doctor smoke tests passed: ${cases.length + lookupCases.length + 17}`);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual, expected, message) {
  assert(actual === expected, `${message} expected "${expected}", got "${actual}"`);
}

