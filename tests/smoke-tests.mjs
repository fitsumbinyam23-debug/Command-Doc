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
  `${appSource}\nglobalThis.__CommandDoctorTest = { state, diagnose, findCommandLookupMatches };`,
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
  "admin_commands.json"
];

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

const adminExplainReport = engine.diagnose("ipconfig /renew", "auto");
assertEqual(adminExplainReport.mode, "Explanation Mode", "admin command explanation mode");
assertEqual(adminExplainReport.command, "ipconfig /renew", "admin command recognized");
assert(adminExplainReport.safetyLevel.includes("Medium"), "admin risk visible");

const irfPortExplainReport = engine.diagnose("display irf-port", "auto");
assertEqual(irfPortExplainReport.mode, "Explanation Mode", "IRF port command explanation mode");
assertEqual(irfPortExplainReport.command, "display irf-port", "IRF port command recognized");
assertEqual(irfPortExplainReport.ticketSummary, "Command recognized, but no output was provided for diagnosis.", "IRF port explanation ticket summary");

console.log(`Command Doctor smoke tests passed: ${cases.length + lookupCases.length + 5}`);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual, expected, message) {
  assert(actual === expected, `${message} expected "${expected}", got "${actual}"`);
}
