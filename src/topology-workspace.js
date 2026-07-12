(function () {
  "use strict";

  // Legacy key used before the full visual-network state was persisted together.
  // New writes are performed by the app through one versioned simulator snapshot.
  const LEGACY_STORAGE_KEY = "command-doctor.phase1.topology";
  const TOPOLOGY_SCHEMA_VERSION = 3;
  const GRID = 20;
  const STAGE_WIDTH = 1200;
  const STAGE_HEIGHT = 650;
  const ENDPOINT_PROFILES = [
    { type: "Desktop PC", prefix: "PC", idPrefix: "pc" },
    { type: "Laptop", prefix: "Laptop", idPrefix: "laptop" },
    { type: "IP Phone", prefix: "Phone", idPrefix: "phone" },
    { type: "Printer", prefix: "Printer", idPrefix: "printer" },
    { type: "Wireless AP", prefix: "AP", idPrefix: "ap" },
    { type: "Server", prefix: "Server", idPrefix: "server" }
  ];

  function create(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function button(label, className, handler) {
    const element = create("button", className, label);
    element.type = "button";
    element.addEventListener("click", handler);
    return element;
  }

  function defaultNode(id, type, name, x, y, deviceType = "") {
    const isSwitch = type === "switch";
    return {
      id, type, name, x, y,
      vendor: isSwitch ? "Cisco IOS" : "Generic endpoint",
      model: isSwitch ? "CD-SW24 simulated access switch" : "CD-ENDPOINT-1",
      deviceType: isSwitch ? "" : deviceType,
      width: isSwitch ? 470 : 180,
      height: isSwitch ? 235 : 108,
      locked: false,
      runtime: { power: true, status: isSwitch ? "ready" : "disconnected" }
    };
  }

  function initialTopology(network) {
    return {
      version: TOPOLOGY_SCHEMA_VERSION,
      identity: { nextDeviceId: 1, nextMac: 1, nameCounters: {} },
      zoom: 1,
      grid: true,
      tool: "select",
      selectedId: "",
      selectedCableId: "",
      cableStartId: "",
      nodes: [defaultNode("switch-1", "switch", network.hostname || "SIM-SWITCH", 390, 165)],
      cables: []
    };
  }

  function validTopology(value) {
    if (!value || typeof value !== "object" || !Array.isArray(value.nodes) || !Array.isArray(value.cables)) return false;
    if (!value.nodes.every((node) => node && typeof node.id === "string" && typeof node.type === "string" && Number.isFinite(Number(node.x)) && Number.isFinite(Number(node.y)))) return false;
    if (!value.cables.every((cable) => cable && typeof cable.id === "string" && typeof cable.endpointId === "string" && typeof cable.switchPort === "string")) return false;
    const nodeIds = new Set(value.nodes.map((node) => node.id));
    const endpointIds = new Set(value.nodes.filter((node) => node.type === "endpoint").map((node) => node.id));
    const cableIds = new Set();
    const usedEndpoints = new Set();
    const usedPorts = new Set();
    return value.cables.every((cable) => {
      if (cableIds.has(cable.id) || usedEndpoints.has(cable.endpointId) || usedPorts.has(cable.switchPort)) return false;
      if (!nodeIds.has(cable.endpointId) || !endpointIds.has(cable.endpointId) || !/^GigabitEthernet1\/0\/(?:[1-9]|1\d|2[0-4])$/.test(cable.switchPort)) return false;
      cableIds.add(cable.id);
      usedEndpoints.add(cable.endpointId);
      usedPorts.add(cable.switchPort);
      return true;
    });
  }

  function migrateTopology(value) {
    if (!value || typeof value !== "object") return null;
    const migrated = JSON.parse(JSON.stringify(value));
    migrated.version = TOPOLOGY_SCHEMA_VERSION;
    migrated.identity ||= { nextDeviceId: 1, nextMac: 1, nameCounters: {} };
    migrated.identity.nextDeviceId = Math.max(1, Number(migrated.identity.nextDeviceId) || 1);
    migrated.identity.nextMac = Math.max(1, Number(migrated.identity.nextMac) || 1);
    migrated.identity.nameCounters ||= {};
    return validTopology(migrated) ? migrated : null;
  }

  function loadSavedTopology() {
    try {
      const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
      const saved = raw ? JSON.parse(raw) : null;
      return migrateTopology(saved);
    } catch {
      return null;
    }
  }

  // Retained as a validation helper for callers from earlier releases. New state is
  // persisted through the single visual-network snapshot owned by app-release-21.
  function saveTopology(topology) { return Boolean(migrateTopology(topology)); }

  function nodeById(topology, id) {
    return topology.nodes.find((node) => node.id === id) || null;
  }

  function deviceById(network, id) {
    return network.devices.find((device) => device.id === id) || null;
  }

  function savedDeviceType(node) {
    const name = String(node.name || "").toLowerCase();
    if (name.startsWith("server")) return "Server";
    if (name.startsWith("ap")) return "Wireless AP";
    if (name.startsWith("phone")) return "IP Phone";
    if (name.startsWith("printer")) return "Printer";
    if (name.startsWith("laptop")) return "Laptop";
    return node.deviceType || "Desktop PC";
  }

  function profileForType(type) {
    return ENDPOINT_PROFILES.find((item) => item.type === type) || ENDPOINT_PROFILES[0];
  }

  function identityState(topology) {
    topology.identity ||= { nextDeviceId: 1, nextMac: 1, nameCounters: {} };
    topology.identity.nextDeviceId = Math.max(1, Number(topology.identity.nextDeviceId) || 1);
    topology.identity.nextMac = Math.max(1, Number(topology.identity.nextMac) || 1);
    topology.identity.nameCounters ||= {};
    return topology.identity;
  }

  function usedDeviceIds(network, topology) {
    return new Set([...(network.devices || []).map((device) => device.id), ...(topology.nodes || []).map((node) => node.id)]);
  }

  function createUniqueDeviceId(network, topology, type) {
    const profile = profileForType(type);
    const identity = identityState(topology);
    const ids = usedDeviceIds(network, topology);
    let id = "";
    do { id = `${profile.idPrefix}-${identity.nextDeviceId++}`; } while (ids.has(id));
    return id;
  }

  function createUniqueDeviceName(network, topology, type) {
    const profile = profileForType(type);
    const identity = identityState(topology);
    const names = new Set((network.devices || []).map((device) => String(device.name || "").trim().toLowerCase()));
    let number = Math.max(1, Number(identity.nameCounters[profile.prefix]) || 1);
    let name = "";
    do { name = `${profile.prefix}-${number++}`; } while (names.has(name.toLowerCase()));
    identity.nameCounters[profile.prefix] = number;
    return name;
  }

  function createUniqueMacAddress(network, topology) {
    const identity = identityState(topology);
    const macs = new Set((network.devices || []).map((device) => String(device.mac || "").toLowerCase()));
    let mac = "";
    do {
      const value = identity.nextMac++;
      const hex = value.toString(16).padStart(6, "0");
      mac = `02:CD:${hex.slice(0, 2)}:${hex.slice(2, 4)}:${hex.slice(4, 6)}`;
    } while (macs.has(mac.toLowerCase()));
    return mac;
  }

  function validateDeviceIdentity(network) {
    const ids = new Set(); const names = new Set(); const macs = new Set();
    return (network.devices || []).every((device) => {
      const id = String(device.id || ""); const name = String(device.name || "").trim().toLowerCase(); const mac = String(device.mac || "").toLowerCase();
      if (!id || !name || !mac || ids.has(id) || names.has(name) || macs.has(mac)) return false;
      ids.add(id); names.add(name); macs.add(mac); return true;
    });
  }

  function repairDeviceIdentity(network, topology) {
    const identity = identityState(topology);
    const usedIds = new Set(); const usedNames = new Set(); const usedMacs = new Set();
    network.devices.forEach((device) => {
      const type = device.type || "Desktop PC";
      const profile = profileForType(type);
      if (!device.id || usedIds.has(device.id)) device.id = createUniqueDeviceId({ devices: network.devices.filter((item) => item !== device) }, topology, type);
      usedIds.add(device.id);
      const baseName = String(device.name || "").trim() || createUniqueDeviceName({ devices: network.devices.filter((item) => item !== device) }, topology, type);
      let candidate = baseName; let suffix = 2;
      while (usedNames.has(candidate.toLowerCase())) candidate = `${baseName}-${suffix++}`;
      device.name = candidate;
      usedNames.add(candidate.toLowerCase());
      if (!device.mac || usedMacs.has(String(device.mac).toLowerCase())) device.mac = createUniqueMacAddress({ devices: network.devices.filter((item) => item !== device) }, topology);
      usedMacs.add(String(device.mac).toLowerCase());
      const match = device.name.match(new RegExp(`^${profile.prefix}-(\\d+)$`, "i"));
      if (match) identity.nameCounters[profile.prefix] = Math.max(Number(identity.nameCounters[profile.prefix]) || 1, Number(match[1]) + 1);
    });
  }

  function hydrateSavedDevices(network, topology) {
    topology.nodes.filter((node) => node.type === "endpoint").forEach((node) => {
      if (deviceById(network, node.id)) return;
      network.devices.push({
        id: node.id,
        name: node.name || createUniqueDeviceName(network, topology, savedDeviceType(node)),
        type: savedDeviceType(node),
        mac: createUniqueMacAddress(network, topology),
        ip: "",
        mask: "255.255.255.0",
        gateway: "",
        method: "static",
        port: "",
        lastPing: "Not tested"
      });
    });
  }

  function ensureTopology(network) {
    const topology = migrateTopology(network.topology) || loadSavedTopology() || initialTopology(network);
    topology.version = TOPOLOGY_SCHEMA_VERSION;
    topology.zoom = Math.min(1.4, Math.max(0.6, Number(topology.zoom) || 1));
    topology.grid = topology.grid !== false;
    topology.tool = ["select", "move", "cable"].includes(topology.tool) ? topology.tool : "select";
    topology.selectedId ||= "";
    topology.selectedCableId ||= "";
    topology.cableStartId ||= "";
    if (!nodeById(topology, "switch-1")) topology.nodes.push(defaultNode("switch-1", "switch", network.hostname || "SIM-SWITCH", 390, 165));
    hydrateSavedDevices(network, topology);
    repairDeviceIdentity(network, topology);
    network.devices.forEach((device, index) => {
      const node = nodeById(topology, device.id);
      if (node?.type === "endpoint") node.deviceType ||= device.type;
      if (device.port && !node) topology.nodes.push(defaultNode(device.id, "endpoint", device.name, 80, 100 + index * 135, device.type));
    });
    const endpointIds = new Set(network.devices.map((device) => device.id));
    topology.nodes = topology.nodes.filter((node) => node.id === "switch-1" || endpointIds.has(node.id));
    topology.nodes.filter((node) => node.type === "endpoint").forEach((node) => {
      const device = deviceById(network, node.id);
      if (device) { node.name = device.name; node.deviceType = device.type; }
    });
    topology.cables = topology.cables.filter((cable) => endpointIds.has(cable.endpointId) && network.ports[cable.switchPort]);
    topology.cables.forEach((cable) => window.CommandDoctorDiagnostics?.ensureCableModel(cable));
    applyCablesToNetwork(network, topology);
    network.topology = topology;
    return topology;
  }

  function applyCablesToNetwork(network, topology = network.topology) {
    if (!topology) return;
    Object.values(network.ports).forEach((port) => {
      port.connectedDeviceId = "";
      port.cable = "disconnected";
      port.lastActivity = "Never";
    });
    network.devices.forEach((device) => { device.port = ""; });
    topology.cables.forEach((cable) => {
      const device = deviceById(network, cable.endpointId);
      const port = network.ports[cable.switchPort];
      if (!device || !port) return;
      device.port = port.name;
      port.connectedDeviceId = device.id;
      port.cable = cable.state || "good";
      port.lastActivity = "Cable connected";
    });
  }

  function persist(network, topology, onChange) {
    applyCablesToNetwork(network, topology);
    network.topology = topology;
    const saved = onChange(network, topology);
    topology.saveState = saved === false ? "Local save failed. Changes remain in this page until storage is available." : "Autosaved locally";
  }

  function snap(value, enabled) {
    return enabled ? Math.round(value / GRID) * GRID : Math.round(value);
  }

  function endpointAnchor(node) {
    return { x: node.x + node.width, y: node.y + node.height / 2 };
  }

  function portIndex(portName) {
    const match = String(portName).match(/(\d+)$/);
    return match ? Number(match[1]) : 1;
  }

  function cableAnchor(node, index) {
    const column = (index - 1) % 12;
    const row = index <= 12 ? 0 : 1;
    return { x: node.x + 33 + column * 36.7, y: node.y + 125 + row * 46.7 };
  }

  function selectNode(network, topology, id, onChange) {
    topology.selectedId = id;
    topology.selectedCableId = "";
    const node = nodeById(topology, id);
    if (node?.type === "endpoint") network.selectedDeviceId = id;
    onChange(network, topology);
  }

  function connectCable(network, topology, endpointId, switchPort) {
    if (!endpointId || !network.ports[switchPort]) return false;
    const occupied = topology.cables.find((cable) => cable.switchPort === switchPort && cable.endpointId !== endpointId);
    if (occupied) return false;
    topology.cables = topology.cables.filter((cable) => cable.endpointId !== endpointId);
    const cable = {
      id: `cable-${endpointId}`,
      type: "Copper Ethernet",
      endpointId,
      switchPort,
      state: "good",
      pairs: { "1-2": { state: "Good" }, "3-6": { state: "Good" }, "4-5": { state: "Good" }, "7-8": { state: "Good" } },
      length: 12,
      faultDistance: null,
      speed: "1 Gbps",
      duplex: "full",
      intermittent: false
    };
    topology.cables.push(cable);
    topology.selectedCableId = cable.id;
    topology.selectedId = "";
    topology.cableStartId = "";
    topology.tool = "select";
    return true;
  }

  function disconnectCable(network, topology, cableId) {
    const cable = topology.cables.find((item) => item.id === cableId);
    if (!cable) return false;
    topology.cables = topology.cables.filter((item) => item.id !== cableId);
    topology.selectedCableId = "";
    return true;
  }

  function addEndpoint(network, topology, type = "Desktop PC") {
    const profile = profileForType(type);
    const existing = network.devices.find((device) => device.type === profile.type && !nodeById(topology, device.id));
    const device = existing || { id: createUniqueDeviceId(network, topology, profile.type), name: createUniqueDeviceName(network, topology, profile.type), type: profile.type, mac: createUniqueMacAddress(network, topology), ip: "", mask: "255.255.255.0", gateway: "", method: "static", port: "", lastPing: "Not tested" };
    if (!existing) network.devices.push(device);
    const number = topology.nodes.filter((node) => node.type === "endpoint").length;
    topology.nodes.push(defaultNode(device.id, "endpoint", device.name, 90, 80 + (number % 4) * 135, device.type));
    topology.selectedId = device.id;
    topology.selectedCableId = "";
    network.selectedDeviceId = device.id;
  }

  function renameSelected(network, topology) {
    const node = nodeById(topology, topology.selectedId);
    if (!node || node.type !== "endpoint") return false;
    const next = window.prompt("Device name", node.name);
    const name = String(next || "").trim();
    if (!name || name === node.name) return false;
    if (network.devices.some((device) => device.id !== node.id && String(device.name || "").trim().toLowerCase() === name.toLowerCase())) {
      topology.notice = `"${name}" is already in use. Choose a unique device name.`;
      return false;
    }
    node.name = name;
    const device = deviceById(network, node.id);
    if (device) device.name = name;
    return true;
  }

  function deleteSelected(network, topology) {
    const node = nodeById(topology, topology.selectedId);
    if (!node || node.type === "switch" || node.locked) return false;
    topology.cables = topology.cables.filter((cable) => cable.endpointId !== node.id);
    topology.nodes = topology.nodes.filter((item) => item.id !== node.id);
    network.devices = network.devices.filter((device) => device.id !== node.id);
    topology.selectedId = "";
    return true;
  }

  function inspectTopology(network, topology) {
    const endpoints = topology.nodes.filter((node) => node.type === "endpoint");
    const connected = topology.cables.filter((cable) => cable.state === "good");
    const missing = endpoints.filter((node) => !topology.cables.some((cable) => cable.endpointId === node.id));
    const portWarnings = topology.cables.filter((cable) => !network.ports[cable.switchPort]?.adminUp || network.ports[cable.switchPort]?.cable !== "good");
    const checks = [
      `${connected.length} cable${connected.length === 1 ? "" : "s"} connected`,
      missing.length ? `${missing.length} endpoint${missing.length === 1 ? "" : "s"} not connected` : "All endpoints connected",
      portWarnings.length ? `${portWarnings.length} port health warning${portWarnings.length === 1 ? "" : "s"}` : "Connected port health is good"
    ];
    const status = portWarnings.length ? "Warning" : missing.length ? "Ready" : endpoints.length ? "Healthy" : "Ready";
    return { checkedAt: new Date().toLocaleTimeString(), status, checks };
  }

  function renderCables(svg, network, topology, onChange) {
    const sw = nodeById(topology, "switch-1");
    topology.cables.forEach((cable) => {
      const endpoint = nodeById(topology, cable.endpointId);
      if (!endpoint || !sw) return;
      const start = endpointAnchor(endpoint);
      const end = cableAnchor(sw, portIndex(cable.switchPort));
      const curve = Math.max(70, Math.abs(end.x - start.x) * 0.35);
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", `M ${start.x} ${start.y} C ${start.x + curve} ${start.y}, ${end.x - curve} ${end.y}, ${end.x} ${end.y}`);
      path.setAttribute("class", `topology-cable is-${cable.state || "good"} ${topology.selectedCableId === cable.id ? "is-selected" : ""}`);
      path.setAttribute("data-cable-id", cable.id);
      path.setAttribute("tabindex", "0");
      path.setAttribute("role", "button");
      path.setAttribute("aria-label", `${cable.id}, ${cable.type}, ${cable.endpointId} to ${cable.switchPort}`);
      const select = () => { topology.selectedCableId = cable.id; topology.selectedId = ""; onChange(network, topology); };
      path.addEventListener("click", (event) => { event.stopPropagation(); select(); });
      path.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(); } });
      svg.append(path);
    });
  }

  function renderEndpoint(node, network, topology, onChange) {
    const device = deviceById(network, node.id);
    const panel = create("article", `topology-node topology-endpoint ${topology.selectedId === node.id ? "is-selected" : ""} ${node.locked ? "is-locked" : ""}`);
    panel.style.transform = `translate(${node.x}px, ${node.y}px)`;
    panel.dataset.nodeId = node.id;
    panel.setAttribute("aria-label", `${node.name} endpoint`);
    panel.addEventListener("click", () => { if (topology.tool === "select") selectNode(network, topology, node.id, onChange); });
    panel.append(create("strong", "", node.name), create("span", "topology-endpoint-type", device?.type || "Desktop PC"), create("span", `topology-status ${device?.port ? "is-up" : ""}`, device?.port ? `Linked: ${device.port}` : "No cable"));
    const socket = button("", "topology-endpoint-socket", () => {
      if (topology.tool !== "cable") return;
      topology.cableStartId = node.id;
      topology.selectedId = node.id;
      topology.selectedCableId = "";
      onChange(network, topology);
    });
    socket.setAttribute("aria-label", `${node.name} Ethernet socket`);
    socket.title = "Ethernet socket";
    panel.append(socket, create("span", "topology-socket-label", "ETH0"));
    return panel;
  }

  function renderSwitch(node, network, topology, onChange) {
    const panel = create("article", `topology-node topology-switch ${topology.selectedId === node.id ? "is-selected" : ""} ${node.locked ? "is-locked" : ""}`);
    panel.style.transform = `translate(${node.x}px, ${node.y}px)`;
    panel.dataset.nodeId = node.id;
    panel.setAttribute("aria-label", `${node.name} simulated switch`);
    panel.addEventListener("click", () => { if (topology.tool === "select") selectNode(network, topology, node.id, onChange); });
    const top = create("div", "topology-switch-title");
    top.append(create("strong", "", node.name), create("span", "", "CD-SW24"));
    const indicators = create("div", "topology-switch-indicators");
    [["PWR", true], ["SYS", true], ["STACK", false]].forEach(([label, active]) => {
      const indicator = create("span", `topology-indicator ${active ? "is-on" : ""}`);
      indicator.append(create("i", ""), document.createTextNode(label));
      indicators.append(indicator);
    });
    const utility = create("div", "topology-switch-utility");
    utility.append(create("span", "topology-console-port", "CONSOLE"), create("span", "topology-uplink-port", "SFP1"), create("span", "topology-uplink-port", "SFP2"));
    const ports = create("div", "topology-switch-ports");
    for (let index = 1; index <= 24; index += 1) {
      const name = `GigabitEthernet1/0/${index}`;
      const port = network.ports[name];
      const item = create("div", `topology-port-item ${port?.connectedDeviceId ? "is-connected" : ""} ${network.selectedPort === name ? "is-selected" : ""}`);
      item.append(create("i", "topology-port-led"));
      const socket = button("", "topology-port-socket", () => {
        network.selectedPort = name;
        if (topology.tool === "cable" && topology.cableStartId && !connectCable(network, topology, topology.cableStartId, name)) {
          topology.notice = `${name} is already connected. Choose an available RJ45 socket.`;
        } else {
          topology.notice = "";
        }
        onChange(network, topology);
      });
      socket.setAttribute("aria-label", `${name} RJ45 socket, ${port?.connectedDeviceId ? "connected" : "available"}`);
      socket.title = name;
      item.append(socket, create("span", "topology-port-number", String(index)));
      ports.append(item);
    }
    panel.append(top, create("div", "topology-device-meta", `${node.vendor} | ${node.model}`), indicators, utility, ports);
    return panel;
  }

  function renderSelectionPanel(network, topology, onChange, rerender) {
    const panel = create("section", "topology-selection-panel");
    const cable = topology.cables.find((item) => item.id === topology.selectedCableId);
    if (cable) {
      const endpoint = nodeById(topology, cable.endpointId);
      panel.append(create("strong", "", "Cable details"));
      [["Cable ID", cable.id], ["Type", cable.type], ["Endpoint", endpoint?.name || cable.endpointId], ["Switch port", cable.switchPort], ["State", cable.state]].forEach(([label, value]) => panel.append(create("div", "topology-detail-row", `${label}: ${value}`)));
      const report = window.CommandDoctorDiagnostics?.cableReport(network, cable);
      if (report) {
        const table = create("table", "cable-diagnostic-table");
        const head = document.createElement("thead");
        head.innerHTML = "<tr><th>Pair</th><th>State</th></tr>";
        const body = document.createElement("tbody");
        Object.entries(report.pairs).forEach(([pair, pairResult]) => {
          const row = document.createElement("tr");
          row.append(create("td", "", pair), create("td", "", pairResult.state));
          body.append(row);
        });
        table.append(head, body);
        panel.append(create("div", "topology-detail-row", `Length: ${report.length}m | Fault distance: ${report.faultDistance ?? "-"} | ${report.speed} ${report.duplex}`), table);
      }
      const actions = create("div", "topology-selection-actions");
      actions.append(button("Disconnect cable", "secondary", () => { if (disconnectCable(network, topology, cable.id)) { persist(network, topology, onChange); rerender(); } }));
      actions.append(button("Run cable diagnostic", "secondary", () => { const port = network.ports[cable.switchPort]; if (port) port.lastActivity = `Cable diagnostic: ${report?.linkImpact || cable.state}`; persist(network, topology, onChange); rerender(); }));
      actions.append(button("Inject open pair", "secondary", () => { window.CommandDoctorDiagnostics?.ensureCableModel(cable); cable.pairs["3-6"].state = "Open"; cable.faultDistance = 18; cable.state = "fault"; cable.speed = "100 Mbps"; persist(network, topology, onChange); rerender(); }));
      actions.append(button("Repair cable", "secondary", () => { window.CommandDoctorDiagnostics?.ensureCableModel(cable); Object.values(cable.pairs).forEach((pair) => { pair.state = "Good"; }); cable.faultDistance = null; cable.state = "good"; cable.speed = "1 Gbps"; persist(network, topology, onChange); rerender(); }));
      panel.append(actions);
      return panel;
    }
    const node = nodeById(topology, topology.selectedId);
    if (node?.type === "endpoint") {
      const device = deviceById(network, node.id);
      panel.append(create("strong", "", "Endpoint details"), create("div", "topology-detail-row", `Name: ${node.name}`), create("div", "topology-detail-row", `Device: ${device?.type || "Desktop PC"}`), create("div", "topology-detail-row", `Link: ${device?.port || "Not connected"}`));
      panel.append(button("Rename device", "secondary", () => { if (renameSelected(network, topology)) { persist(network, topology, onChange); rerender(); } }));
      return panel;
    }
    const diagnostic = topology.lastDiagnostic || inspectTopology(network, topology);
    panel.append(create("strong", "", "Topology health"), create("div", "topology-health-status", diagnostic.status));
    diagnostic.checks.forEach((check) => panel.append(create("div", "topology-detail-row", check)));
    panel.append(create("p", "", topology.tool === "cable" ? (topology.cableStartId ? "Click a switch RJ45 socket to finish the cable." : "Click an endpoint Ethernet socket to begin a cable.") : "Use Select to inspect objects, Move to reposition devices, or Cable to connect sockets."));
    panel.append(button("Run full diagnostic", "secondary", () => { topology.lastDiagnostic = inspectTopology(network, topology); topology.notice = `Diagnostic complete: ${topology.lastDiagnostic.status}.`; persist(network, topology, onChange); rerender(); }));
    return panel;
  }

  function bindMovement(canvas, topology, network, onChange, rerender) {
    let dragging = null;
    let redrawFrame = 0;
    const redrawCables = () => {
      if (redrawFrame) return;
      redrawFrame = window.requestAnimationFrame(() => {
        redrawFrame = 0;
        const svg = canvas.querySelector(".topology-cables");
        if (svg) { svg.replaceChildren(); renderCables(svg, network, topology, onChange); }
      });
    };
    canvas.addEventListener("pointerdown", (event) => {
      if (topology.tool !== "move" || event.target.closest("button") || event.target.closest(".topology-cable")) return;
      const element = event.target.closest(".topology-node");
      const node = element && nodeById(topology, element.dataset.nodeId);
      if (!node || node.locked) return;
      topology.selectedId = node.id;
      topology.selectedCableId = "";
      dragging = { node, startX: event.clientX, startY: event.clientY, x: node.x, y: node.y };
      canvas.setPointerCapture?.(event.pointerId);
      canvas.classList.add("is-dragging");
      event.preventDefault();
    });
    canvas.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      const zoom = topology.zoom || 1;
      const stage = canvas.querySelector(".topology-stage");
      const width = Math.max(STAGE_WIDTH, stage?.clientWidth || 0);
      const height = Math.max(STAGE_HEIGHT, stage?.clientHeight || 0);
      dragging.node.x = Math.max(0, Math.min(width - dragging.node.width, snap(dragging.x + (event.clientX - dragging.startX) / zoom, topology.grid)));
      dragging.node.y = Math.max(0, Math.min(height - dragging.node.height, snap(dragging.y + (event.clientY - dragging.startY) / zoom, topology.grid)));
      const element = canvas.querySelector(`[data-node-id="${dragging.node.id}"]`);
      if (element) element.style.transform = `translate(${dragging.node.x}px, ${dragging.node.y}px)`;
      redrawCables();
    });
    canvas.addEventListener("pointerup", () => {
      if (!dragging) return;
      dragging = null;
      canvas.classList.remove("is-dragging");
      persist(network, topology, onChange);
      rerender();
    });
    canvas.addEventListener("pointercancel", () => { if (dragging) { dragging = null; canvas.classList.remove("is-dragging"); persist(network, topology, onChange); rerender(); } });
  }

  function resetLayout(topology) {
    const sw = nodeById(topology, "switch-1");
    if (sw) { sw.x = Math.round((STAGE_WIDTH - sw.width) / 2); sw.y = Math.round((STAGE_HEIGHT - sw.height) / 2); }
    const endpoints = topology.nodes.filter((node) => node.type === "endpoint");
    endpoints.forEach((node, index) => {
      const left = index % 2 === 0;
      node.x = left ? 70 : STAGE_WIDTH - node.width - 70;
      node.y = 65 + Math.floor(index / 2) * 145;
    });
  }

  function fitTopologyToCanvas(topology, canvas) {
    const nodes = topology.nodes || [];
    if (!nodes.length || !canvas) return;
    const left = Math.min(...nodes.map((node) => node.x)); const top = Math.min(...nodes.map((node) => node.y));
    const right = Math.max(...nodes.map((node) => node.x + node.width)); const bottom = Math.max(...nodes.map((node) => node.y + node.height));
    const availableWidth = Math.max(320, canvas.clientWidth - 80); const availableHeight = Math.max(260, canvas.clientHeight - 80);
    topology.zoom = Math.max(0.6, Math.min(1.4, Math.min(availableWidth / Math.max(1, right - left), availableHeight / Math.max(1, bottom - top))));
    canvas.scrollLeft = Math.max(0, (left * topology.zoom) - 30);
    canvas.scrollTop = Math.max(0, (top * topology.zoom) - 30);
  }

  function renderInto(canvas, network, topology, onChange, rerender) {
    canvas.replaceChildren();
    const commitCanvasChange = () => {
      persist(network, topology, onChange);
      rerender();
    };
    const stage = create("div", `topology-stage ${topology.grid ? "has-grid" : ""} ${topology.tool === "move" ? "is-move" : ""}`);
    stage.style.transform = `scale(${topology.zoom})`;
    stage.style.transformOrigin = "top left";
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "topology-cables");
    svg.setAttribute("viewBox", `0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}`);
    svg.setAttribute("role", "group");
    svg.setAttribute("aria-label", "Interactive simulated Ethernet cables");
    renderCables(svg, network, topology, commitCanvasChange);
    stage.append(svg);
    topology.nodes.forEach((node) => stage.append(node.type === "switch" ? renderSwitch(node, network, topology, commitCanvasChange) : renderEndpoint(node, network, topology, commitCanvasChange)));
    canvas.append(stage);
    bindMovement(canvas, topology, network, onChange, rerender);
  }

  function render(container, network, options = {}) {
    container.replaceChildren();
    const onChange = options.onChange || (() => {});
    const topology = ensureTopology(network);
    const rerender = () => render(container, network, options);
    const workspace = create("section", "topology-workspace");
    workspace.append(create("div", "lab-card-kicker", "Phase 1 topology workspace"), create("h4", "", "Build and connect a local simulated network"), create("p", "topology-intro", "Select, move, and cable are separate tools. Every device, cable, name, and position is saved only in this browser."));
    const tray = create("div", "topology-device-tray");
    tray.append(create("strong", "", "Device tray"), create("span", "", "Add local endpoints, then cable them to the simulated switch."));
    const palette = create("div", "topology-device-palette");
    ENDPOINT_PROFILES.forEach((profile) => palette.append(button(`Add ${profile.type}`, "topology-tray-item", () => { addEndpoint(network, topology, profile.type); persist(network, topology, onChange); rerender(); })));
    tray.append(palette);
    workspace.append(tray);
    let canvas;
    const toolbar = create("div", "topology-toolbar");
    const setTool = (tool) => { topology.tool = tool; topology.cableStartId = ""; topology.notice = tool === "move" ? "Move mode: drag a device to reposition it." : ""; persist(network, topology, onChange); rerender(); };
    toolbar.append(
      button("Select tool", `secondary ${topology.tool === "select" ? "is-active" : ""}`, () => setTool("select")),
      button("Move tool", `secondary ${topology.tool === "move" ? "is-active" : ""}`, () => setTool("move")),
      button("Cable tool", `secondary ${topology.tool === "cable" ? "is-active" : ""}`, () => setTool("cable")),
      button("Run full diagnostic", "secondary", () => { topology.lastDiagnostic = inspectTopology(network, topology); topology.notice = `Diagnostic complete: ${topology.lastDiagnostic.status}.`; persist(network, topology, onChange); rerender(); }),
      button("Rename selected", "secondary", () => { if (renameSelected(network, topology)) { persist(network, topology, onChange); rerender(); } }),
      button(topology.selectedId && nodeById(topology, topology.selectedId)?.locked ? "Unlock selected" : "Lock selected", "secondary", () => { const node = nodeById(topology, topology.selectedId); if (node) { node.locked = !node.locked; persist(network, topology, onChange); rerender(); } }),
      button("Delete selected", "secondary", () => { if (deleteSelected(network, topology)) { persist(network, topology, onChange); rerender(); } }),
      button("Disconnect selected cable", "secondary", () => { if (disconnectCable(network, topology, topology.selectedCableId)) { persist(network, topology, onChange); rerender(); } }),
      button("Zoom out", "icon-button", () => { topology.zoom = Math.max(0.6, topology.zoom - 0.1); persist(network, topology, onChange); rerender(); }),
      button("Zoom in", "icon-button", () => { topology.zoom = Math.min(1.4, topology.zoom + 0.1); persist(network, topology, onChange); rerender(); }),
      button("Reset zoom", "secondary", () => { topology.zoom = 1; persist(network, topology, onChange); rerender(); }),
      button("Fit to screen", "secondary", () => { fitTopologyToCanvas(topology, canvas); persist(network, topology, onChange); rerender(); }),
      button("Reset layout", "secondary", () => { resetLayout(topology); persist(network, topology, onChange); rerender(); }),
      button(topology.grid ? "Hide grid" : "Show grid", "secondary", () => { topology.grid = !topology.grid; persist(network, topology, onChange); rerender(); }),
      button("Clear topology", "secondary", () => { if (window.confirm("Clear local endpoints and cables?")) { network.devices = network.devices.filter((device) => !topology.nodes.some((node) => node.id === device.id && node.type === "endpoint")); network.topology = initialTopology(network); persist(network, network.topology, onChange); rerender(); } })
    );
    workspace.append(toolbar);
    const content = create("div", "topology-workspace-content");
    canvas = create("div", "topology-canvas");
    canvas.setAttribute("role", "application");
    canvas.setAttribute("aria-label", "Simulated network topology canvas");
    content.append(canvas, renderSelectionPanel(network, topology, onChange, rerender));
    const saved = topology.saveState || "Autosaved locally";
    workspace.append(content, create("div", "topology-workspace-status", `${saved} | ${topology.cables.length} cable${topology.cables.length === 1 ? "" : "s"} | ${topology.nodes.length} device${topology.nodes.length === 1 ? "" : "s"}`));
    if (topology.notice) workspace.append(create("p", "topology-notice", topology.notice));
    renderInto(canvas, network, topology, onChange, rerender);
    container.append(workspace);
  }

  window.CommandDoctorTopology = { render, ensureTopology, applyCablesToNetwork, saveTopology, loadSavedTopology, validTopology, migrateTopology, createUniqueDeviceId, createUniqueDeviceName, createUniqueMacAddress, validateDeviceIdentity };
  document.addEventListener("commanddoctor:render-topology", (event) => {
    const detail = event.detail || {};
    if (detail.container && detail.network) render(detail.container, detail.network, detail.options || {});
  });
}());
