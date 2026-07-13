"use strict";

(() => {
  const COMMANDS = {
    cisco: {
      status: "show interfaces status",
      detail: (port) => `show interface ${port}`,
      config: (port) => `show running-config interface ${port}`,
      vlan: "show vlan brief",
      mac: "show mac address-table",
      macPort: (port) => `show mac address-table interface ${port}`
    },
    hp: {
      status: "display interface brief",
      detail: (port) => `display interface ${port}`,
      config: (port) => `display current-configuration interface ${port}`,
      vlan: "display vlan",
      mac: "display mac-address",
      macPort: () => "display mac-address"
    }
  };

  const toInt = (value) => value.split(".").reduce((result, octet) => (result << 8) + Number(octet), 0) >>> 0;
  const toIp = (value) => [24, 16, 8, 0].map((shift) => (value >>> shift) & 255).join(".");
  const result = (category, severity, device, iface, finding, evidence, nextCheck, configurationRequired = false, target = {}) => ({ category, severity, device, interface: iface || "-", finding, evidence, nextCheck, configurationRequired, target });

  function isIpv4(value) {
    const parts = String(value || "").trim().split(".");
    return parts.length === 4 && parts.every((part) => /^\d+$/.test(part) && Number(part) >= 0 && Number(part) <= 255 && String(Number(part)) === part);
  }

  function cidrFromMask(mask) {
    if (!isIpv4(mask)) return null;
    const binary = toInt(mask).toString(2).padStart(32, "0");
    if (!/^1*0*$/.test(binary)) return null;
    return binary.indexOf("0") === -1 ? 32 : binary.indexOf("0");
  }

  function isSubnetMask(mask) {
    const cidr = cidrFromMask(mask);
    return cidr !== null && cidr >= 8 && cidr <= 30;
  }

  function subnetInfo(ip, mask) {
    if (!isIpv4(ip) || !isSubnetMask(mask)) return null;
    const cidr = cidrFromMask(mask);
    const maskInt = toInt(mask);
    const ipInt = toInt(ip);
    const network = ipInt & maskInt;
    const broadcast = network | (~maskInt >>> 0);
    return { cidr, network: toIp(network), broadcast: toIp(broadcast), usable: ipInt !== network && ipInt !== broadcast };
  }

  function sameSubnet(first, second) {
    const a = subnetInfo(first.ip, first.mask);
    const b = subnetInfo(second.ip, second.mask);
    return Boolean(a && b && a.network === b.network && a.cidr === b.cidr);
  }

  function cableHealthy(cable) {
    return Boolean(cable && cable.pairs && Object.values(cable.pairs).every((pair) => pair.state === "Good") && !cable.intermittent);
  }

  function portOperational(network, port) {
    if (!port) return false;
    const cable = network.topology?.cables?.find((item) => item.switchPort === port.name);
    return Boolean(port && port.adminUp && !port.errorDisabled && port.connectedDeviceId && cableHealthy(cable));
  }

  function ensureCableModel(cable) {
    cable.pairs ||= {
      "1-2": { state: "Good" }, "3-6": { state: "Good" }, "4-5": { state: "Good" }, "7-8": { state: "Good" }
    };
    cable.length ||= 12;
    cable.faultDistance ??= null;
    cable.speed ||= "1 Gbps";
    cable.duplex ||= "full";
    cable.intermittent ||= false;
    return cable;
  }

  function invalidateMacs(network, deviceId = "") {
    network.macs = (network.macs || []).filter((entry) => {
      const port = network.ports[entry.interface];
      return (!deviceId || entry.deviceId !== deviceId) && portOperational(network, port);
    });
  }

  function learnMac(network, device, reason) {
    const port = network.ports[device.port];
    if (!portOperational(network, port) || !network.vlans[port.vlan]) return null;
    const duplicate = network.devices.filter((item) => item.id !== device.id && item.mac.toLowerCase() === device.mac.toLowerCase()).length;
    const existing = network.macs.find((entry) => entry.mac.toLowerCase() === device.mac.toLowerCase());
    const now = new Date().toLocaleTimeString();
    if (existing) {
      existing.moveCount += existing.interface === port.name ? 0 : 1;
      existing.interface = port.name;
      existing.vlan = port.vlan;
      existing.device = device.name;
      existing.deviceId = device.id;
      existing.learnedAt = now;
      existing.age = "0";
      existing.reason = reason;
      return existing;
    }
    const entry = { vlan: port.vlan, mac: device.mac, interface: port.name, device: device.name, deviceId: device.id, type: "Dynamic", learnedAt: now, age: "0", moveCount: 0, reason, duplicate: Boolean(duplicate) };
    network.macs.push(entry);
    return entry;
  }

  function cableReport(network, cable) {
    const checked = ensureCableModel(cable);
    const failed = Object.entries(checked.pairs).filter(([, pair]) => pair.state !== "Good");
    return { cableId: checked.id, pairs: checked.pairs, length: checked.length, faultDistance: checked.faultDistance, speed: checked.speed, duplex: checked.duplex, intermittent: checked.intermittent, linkImpact: failed.length || checked.intermittent ? "Link down or unstable" : "Link healthy" };
  }

  function connectivity(network, source, target) {
    const sourcePort = network.ports[source?.port];
    const targetPort = network.ports[target?.port];
    if (!source || !target) return { ok: false, reason: "Select two simulated endpoints before testing connectivity.", command: COMMANDS.cisco.status };
    if (!sourcePort?.adminUp) return { ok: false, reason: `Source port ${sourcePort?.name || "-"} is administratively down.`, command: COMMANDS.cisco.config(sourcePort?.name || "GigabitEthernet1/0/1") };
    if (!targetPort?.adminUp) return { ok: false, reason: `Destination port ${targetPort?.name || "-"} is administratively down.`, command: COMMANDS.cisco.config(targetPort?.name || "GigabitEthernet1/0/1") };
    if (!portOperational(network, sourcePort)) return { ok: false, reason: `Source port ${sourcePort.name} is operationally down because its cable or endpoint is unavailable.`, command: COMMANDS.cisco.detail(sourcePort.name) };
    if (!portOperational(network, targetPort)) return { ok: false, reason: `Destination port ${targetPort.name} is operationally down because its cable or endpoint is unavailable.`, command: COMMANDS.cisco.detail(targetPort.name) };
    if (!network.vlans[sourcePort.vlan] || !network.vlans[targetPort.vlan]) return { ok: false, reason: `VLAN ${!network.vlans[sourcePort.vlan] ? sourcePort.vlan : targetPort.vlan} does not exist.`, command: COMMANDS.cisco.vlan };
    if (sourcePort.vlan !== targetPort.vlan) return { ok: false, reason: `${source.name} and ${target.name} are assigned to different VLANs (${sourcePort.vlan} and ${targetPort.vlan}).`, command: COMMANDS.cisco.status };
    if (!subnetInfo(source.ip, source.mask) || !subnetInfo(target.ip, target.mask)) return { ok: false, reason: "Both endpoints need valid IPv4 addresses and supported subnet masks before ping.", command: "show ip interface brief" };
    if (!sameSubnet(source, target)) return { ok: false, reason: `Destination IP address ${target.ip} is outside the source subnet ${subnetInfo(source.ip, source.mask).network}/${subnetInfo(source.ip, source.mask).cidr}.`, command: "show ip interface brief" };
    const duplicates = network.devices.filter((device) => device.ip && device.ip === source.ip);
    if (duplicates.length > 1) return { ok: false, reason: `Duplicate IP address detected: ${source.ip}.`, command: "show ip interface brief" };
    return { ok: true, reason: `${source.name} can reach ${target.name} on VLAN ${sourcePort.vlan}. ARP will learn both endpoint MAC addresses before ICMP.`, command: COMMANDS.cisco.mac };
  }

  function scan(network) {
    const checks = [];
    const cables = network.topology?.cables || [];
    const macs = network.macs || [];
    network.devices.forEach((device) => {
      const port = network.ports[device.port];
      const cable = cables.find((item) => item.endpointId === device.id);
      const target = { deviceId: device.id, port: port?.name, cableId: cable?.id };
      checks.push(result("Physical", portOperational(network, port) ? "Passed" : "Warning", device.name, port?.name, port ? (portOperational(network, port) ? "Endpoint link is operational" : "Endpoint link is not operational") : "Endpoint is disconnected", port ? `Admin ${port.adminUp ? "up" : "down"}; cable ${cable?.state || "disconnected"}.` : "No switch port assigned.", port ? COMMANDS.cisco.detail(port.name) : COMMANDS.cisco.status, !portOperational(network, port), target));
      if (cable) {
        const report = cableReport(network, cable);
        checks.push(result("Physical", report.linkImpact === "Link healthy" ? "Passed" : "Critical", device.name, port?.name, "Cable pair health", `${Object.entries(report.pairs).map(([pair, value]) => `${pair}: ${value.state}`).join(", ")}; ${report.length}m.`, COMMANDS.cisco.detail(port?.name || "GigabitEthernet1/0/1"), report.linkImpact !== "Link healthy", target));
      }
      if (port) {
        checks.push(result("Layer 2", network.vlans[port.vlan] ? "Passed" : "Critical", device.name, port.name, `${port.mode} mode, VLAN ${port.vlan}`, network.vlans[port.vlan] ? `VLAN ${port.vlan} exists; voice VLAN ${port.voiceVlan || "none"}; allowed ${port.allowedVlans}.` : `VLAN ${port.vlan} is missing.`, COMMANDS.cisco.vlan, !network.vlans[port.vlan], target));
        checks.push(result("Layer 2", macs.some((entry) => entry.deviceId === device.id) ? "Passed" : "Info", device.name, port.name, "MAC learning", macs.some((entry) => entry.deviceId === device.id) ? "Dynamic MAC learned from simulated traffic." : "Not learned. Generate ARP, ping, or manual traffic.", COMMANDS.cisco.macPort(port.name), false, target));
      }
      const info = subnetInfo(device.ip, device.mask);
      checks.push(result("Layer 3", info && info.usable ? "Passed" : "Warning", device.name, port?.name, "IPv4 addressing", info && info.usable ? `${device.ip}/${info.cidr}; network ${info.network}; broadcast ${info.broadcast}.` : "Valid usable IPv4 address and supported subnet mask are required.", "show ip interface brief", !info, target));
      if (device.ip) {
        const duplicate = network.devices.filter((item) => item.ip && item.ip === device.ip).length > 1;
        if (duplicate) checks.push(result("Layer 3", "Critical", device.name, port?.name, "Duplicate IP address", `${device.ip} is assigned to more than one endpoint.`, "show ip interface brief", true, target));
      }
    });
    if (network.devices.length >= 2) {
      const [source, target] = network.devices;
      const outcome = connectivity(network, source, target);
      checks.push(result("Connectivity", outcome.ok ? "Passed" : "Warning", `${source.name} to ${target.name}`, "-", outcome.ok ? "Expected ping success" : "Expected ping failure", outcome.reason, outcome.command, !outcome.ok, { deviceId: source.id, port: source.port }));
    }
    return checks;
  }

  window.CommandDoctorDiagnostics = { isIpv4, isSubnetMask, cidrFromMask, subnetInfo, sameSubnet, cableHealthy, portOperational, ensureCableModel, invalidateMacs, learnMac, cableReport, connectivity, scan, commands: COMMANDS };
})();
