(function () {
  "use strict";

  const STORAGE_KEY = "command-doctor.phase1.topology";
  const GRID = 20;

  function defaultNode(id, type, name, x, y) {
    const isSwitch = type === "switch";
    return { id, type, vendor: isSwitch ? "Cisco IOS" : "Generic endpoint", model: isSwitch ? "CD-SW24 simulated access switch" : "CD-ENDPOINT-1", name, x, y, width: isSwitch ? 420 : 176, height: isSwitch ? 190 : 92, rotation: 0, selected: false, locked: false, configuration: {}, runtime: { power: true, status: isSwitch ? "ready" : "disconnected" } };
  }

  function initialTopology(network) {
    return { version: 1, zoom: 1, grid: true, selectedId: "", nodes: [defaultNode("switch-1", "switch", network.hostname || "SIM-SWITCH", 390, 150)], cables: [] };
  }

  function loadSavedTopology() {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      const topology = saved ? JSON.parse(saved) : null;
      return topology && Array.isArray(topology.nodes) && Array.isArray(topology.cables) ? topology : null;
    } catch { return null; }
  }

  function saveTopology(topology) {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(topology)); return true; } catch { return false; }
  }

  function ensureTopology(network) {
    const topology = network.topology || loadSavedTopology() || initialTopology(network);
    topology.nodes ||= [];
    topology.cables ||= [];
    topology.zoom = Number(topology.zoom) || 1;
    topology.grid = topology.grid !== false;
    if (!topology.nodes.some((node) => node.id === "switch-1")) topology.nodes.push(defaultNode("switch-1", "switch", network.hostname || "SIM-SWITCH", 390, 150));

    // Saved endpoints are part of the local topology model. Recreate their
    // lightweight device records before reconciling cables after a refresh.
    topology.nodes.filter((node) => node.type === "endpoint").forEach((node, index) => {
      if (network.devices.some((device) => device.id === node.id)) return;
      const suffix = String(index + 10).padStart(2, "0");
      network.devices.push({
        id: node.id,
        name: node.name || `PC-${index + 1}`,
        type: "Desktop PC",
        mac: `02:00:00:00:01:${suffix}`,
        ip: "",
        mask: "255.255.255.0",
        gateway: "",
        method: "static",
        port: "",
        lastPing: "Not tested"
      });
    });
    network.devices.forEach((device, index) => {
      if (device.port && !topology.nodes.some((node) => node.id === device.id)) topology.nodes.push(defaultNode(device.id, "endpoint", device.name, 80, 100 + index * 150));
    });
    const endpointIds = new Set(network.devices.map((device) => device.id));
    topology.nodes = topology.nodes.filter((node) => node.id === "switch-1" || endpointIds.has(node.id));
    topology.cables = topology.cables.filter((cable) => endpointIds.has(cable.endpointId) && network.ports[cable.switchPort]);
    network.devices.forEach((device) => {
      if (device.port && !topology.cables.some((cable) => cable.endpointId === device.id)) topology.cables.push({ id: `cable-${device.id}`, type: "copper", endpointId: device.id, switchPort: device.port, state: "good" });
    });
    network.topology = topology;
    applyCablesToNetwork(network);
    return topology;
  }

  function applyCablesToNetwork(network) {
    const topology = network.topology;
    if (!topology) return;
    Object.values(network.ports).forEach((port) => { port.connectedDeviceId = ""; port.cable = "disconnected"; });
    network.devices.forEach((device) => { device.port = ""; });
    topology.cables.forEach((cable) => {
      const device = network.devices.find((item) => item.id === cable.endpointId);
      const port = network.ports[cable.switchPort];
      if (!device || !port) return;
      device.port = port.name;
      port.connectedDeviceId = device.id;
      port.cable = cable.state || "good";
      port.lastActivity = "Cable connected";
    });
  }

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

  function nodeById(topology, id) { return topology.nodes.find((node) => node.id === id) || null; }
  function snap(value, enabled) { return enabled ? Math.round(value / GRID) * GRID : Math.round(value); }
  function endpointAnchor(node) { return { x: node.x + node.width, y: node.y + node.height / 2 }; }
  function portIndex(portName) { const result = String(portName).match(/(\d+)$/); return result ? Number(result[1]) : 1; }
  function cableAnchor(node, index) { return { x: node.x + 18 + ((index - 1) % 12) * 31, y: node.y + (index <= 12 ? 104 : 145) }; }

  function renderCables(svg, topology) {
    topology.cables.forEach((cable) => {
      const endpoint = nodeById(topology, cable.endpointId);
      const sw = nodeById(topology, "switch-1");
      if (!endpoint || !sw) return;
      const a = endpointAnchor(endpoint);
      const b = cableAnchor(sw, portIndex(cable.switchPort));
      const curve = Math.max(70, Math.abs(b.x - a.x) * 0.35);
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", `M ${a.x} ${a.y} C ${a.x + curve} ${a.y}, ${b.x - curve} ${b.y}, ${b.x} ${b.y}`);
      path.setAttribute("class", `topology-cable is-${cable.state || "good"}`);
      path.setAttribute("data-cable-id", cable.id);
      svg.append(path);
    });
  }

  function connectEndpoint(network, topology, endpointId, switchPort) {
    if (topology.cables.some((cable) => cable.switchPort === switchPort && cable.endpointId !== endpointId)) return;
    topology.cables = topology.cables.filter((cable) => cable.endpointId !== endpointId);
    topology.cables.push({ id: `cable-${endpointId}`, type: "copper", endpointId, switchPort, state: "good" });
    applyCablesToNetwork(network);
  }

  function renderSwitch(node, network, topology, onChange) {
    const panel = create("article", "topology-node topology-switch");
    panel.style.transform = `translate(${node.x}px, ${node.y}px)`;
    panel.dataset.nodeId = node.id;
    panel.append(create("div", "topology-device-header", node.name), create("div", "topology-device-meta", `${node.model} | 24-port access switch`));
    const ledRow = create("div", "topology-led-row");
    ["PWR", "SYS", "STACK"].forEach((label, index) => ledRow.append(create("span", `topology-led ${index === 0 ? "is-on" : ""}`, label)));
    panel.append(ledRow);
    const ports = create("div", "topology-switch-ports");
    for (let index = 1; index <= 24; index += 1) {
      const name = `GigabitEthernet1/0/${index}`;
      const port = network.ports[name];
      const socket = button(String(index), `topology-port ${port?.connectedDeviceId ? "is-connected" : ""} ${topology.selectedPort === name ? "is-selected" : ""}`, () => {
        topology.selectedPort = name;
        network.selectedPort = name;
        const selected = nodeById(topology, topology.selectedId);
        if (selected?.type === "endpoint") connectEndpoint(network, topology, selected.id, name);
        onChange();
      });
      socket.title = `${name}: ${port?.connectedDeviceId ? "connected" : "available"}`;
      socket.setAttribute("aria-label", `${name}, ${port?.connectedDeviceId ? "connected" : "available"}`);
      ports.append(socket);
    }
    panel.append(ports);
    return panel;
  }

  function renderEndpoint(node, network, topology, onChange) {
    const device = network.devices.find((item) => item.id === node.id);
    const panel = create("article", `topology-node topology-endpoint ${topology.selectedId === node.id ? "is-selected" : ""}`);
    panel.style.transform = `translate(${node.x}px, ${node.y}px)`;
    panel.dataset.nodeId = node.id;
    panel.setAttribute("aria-label", `${node.name} endpoint`);
    panel.addEventListener("click", () => { topology.selectedId = node.id; network.selectedDeviceId = node.id; onChange(); });
    panel.append(create("strong", "", node.name), create("span", "topology-endpoint-type", device?.type || "Endpoint"), create("span", `topology-status ${device?.port ? "is-up" : ""}`, device?.port ? `Linked: ${device.port}` : "No cable"), create("span", "topology-port-anchor", "eth0"));
    return panel;
  }

  function addEndpoint(network, topology) {
    const existing = network.devices.find((device) => !topology.nodes.some((node) => node.id === device.id));
    const number = network.devices.filter((device) => device.type === "Desktop PC").length + 1;
    const id = existing?.id || `pc-${Date.now()}`;
    const device = existing || { id, name: `PC-${number}`, type: "Desktop PC", mac: `02:00:00:00:${String(number).padStart(2, "0")}:01`, ip: "", mask: "255.255.255.0", gateway: "", method: "static", port: "", lastPing: "Not tested" };
    if (!existing) network.devices.push(device);
    topology.nodes.push(defaultNode(id, "endpoint", device.name, 90, 100 + (topology.nodes.length % 4) * 135));
    topology.selectedId = id;
    network.selectedDeviceId = id;
  }

  function deleteSelected(network, topology) {
    const selected = nodeById(topology, topology.selectedId);
    if (!selected || selected.type === "switch" || selected.locked) return;
    topology.cables = topology.cables.filter((cable) => cable.endpointId !== selected.id);
    topology.nodes = topology.nodes.filter((node) => node.id !== selected.id);
    network.devices = network.devices.filter((device) => device.id !== selected.id);
    topology.selectedId = "";
    applyCablesToNetwork(network);
  }

  function bindMovement(canvas, topology, network, onChange) {
    if (canvas.dataset.phaseOneBound === "true") return;
    canvas.dataset.phaseOneBound = "true";
    let dragging = null;
    canvas.addEventListener("pointerdown", (event) => {
      const element = event.target.closest(".topology-node");
      if (!element) return;
      const node = nodeById(topology, element.dataset.nodeId);
      if (!node || node.locked) return;
      dragging = { node, startX: event.clientX, startY: event.clientY, x: node.x, y: node.y };
    });
    canvas.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      const zoom = topology.zoom || 1;
      dragging.node.x = Math.max(0, snap(dragging.x + (event.clientX - dragging.startX) / zoom, topology.grid));
      dragging.node.y = Math.max(0, snap(dragging.y + (event.clientY - dragging.startY) / zoom, topology.grid));
      const element = canvas.querySelector(`[data-node-id="${dragging.node.id}"]`);
      if (element) element.style.transform = `translate(${dragging.node.x}px, ${dragging.node.y}px)`;
      const svg = canvas.querySelector(".topology-cables");
      if (svg) {
        svg.replaceChildren();
        renderCables(svg, topology);
      }
    });
    canvas.addEventListener("pointerup", () => {
      if (!dragging) return;
      dragging = null;
      persistAndNotify(network, topology, onChange);
    });
  }

  function persistAndNotify(network, topology, onChange) { applyCablesToNetwork(network); saveTopology(topology); onChange(); }

  function renderInto(canvas, network, topology, onChange) {
    canvas.replaceChildren();
    const stage = create("div", `topology-stage ${topology.grid ? "has-grid" : ""}`);
    stage.style.transform = `scale(${topology.zoom})`;
    stage.style.transformOrigin = "top left";
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "topology-cables");
    svg.setAttribute("viewBox", "0 0 1200 620");
    svg.setAttribute("aria-hidden", "true");
    renderCables(svg, topology);
    stage.append(svg);
    topology.nodes.forEach((node) => stage.append(node.type === "switch" ? renderSwitch(node, network, topology, onChange) : renderEndpoint(node, network, topology, onChange)));
    canvas.append(stage);
    bindMovement(canvas, topology, network, onChange);
  }

  function render(container, network, options = {}) {
    container.replaceChildren();
    const onChange = options.onChange || (() => {});
    const topology = ensureTopology(network);
    const workspace = create("section", "topology-workspace");
    workspace.append(create("div", "lab-card-kicker", "Phase 1 topology workspace"), create("h4", "", "Build and connect a local simulated network"), create("p", "topology-intro", "Drag devices to position them. Click an endpoint, then click a switch port to draw a simulated cable. Every position and cable is stored only in this browser."));
    const tray = create("div", "topology-device-tray");
    const trayItem = create("button", "topology-tray-item", "Desktop PC");
    trayItem.type = "button";
    trayItem.draggable = true;
    trayItem.addEventListener("dragstart", (event) => event.dataTransfer?.setData("text/plain", "desktop-pc"));
    trayItem.addEventListener("click", () => { addEndpoint(network, topology); persistAndNotify(network, topology, onChange); render(container, network, options); });
    tray.append(create("strong", "", "Device tray"), create("span", "", "Drag a device onto the canvas or click to add it."), trayItem);
    workspace.append(tray);
    const toolbar = create("div", "topology-toolbar");
    toolbar.append(
      button("Add PC", "secondary", () => { addEndpoint(network, topology); persistAndNotify(network, topology, onChange); render(container, network, options); }),
      button("Delete selected", "secondary", () => { deleteSelected(network, topology); persistAndNotify(network, topology, onChange); render(container, network, options); }),
      button("Zoom out", "icon-button", () => { topology.zoom = Math.max(0.6, topology.zoom - 0.1); render(container, network, options); }),
      button("Zoom in", "icon-button", () => { topology.zoom = Math.min(1.4, topology.zoom + 0.1); render(container, network, options); }),
      button(topology.grid ? "Hide grid" : "Show grid", "secondary", () => { topology.grid = !topology.grid; saveTopology(topology); render(container, network, options); }),
      button("Save topology", "primary", () => { saveTopology(topology); onChange(); render(container, network, options); }),
      button("Load saved", "secondary", () => { const saved = loadSavedTopology(); if (saved) { network.topology = saved; ensureTopology(network); } render(container, network, options); onChange(); })
    );
    workspace.append(toolbar);
    const canvas = create("div", "topology-canvas");
    canvas.setAttribute("role", "application");
    canvas.setAttribute("aria-label", "Simulated network topology canvas");
    canvas.addEventListener("dragover", (event) => event.preventDefault());
    canvas.addEventListener("drop", (event) => {
      event.preventDefault();
      if (event.dataTransfer?.getData("text/plain") !== "desktop-pc") return;
      addEndpoint(network, topology);
      const node = nodeById(topology, topology.selectedId);
      const bounds = canvas.getBoundingClientRect();
      if (node) {
        node.x = Math.max(0, snap(event.clientX - bounds.left, topology.grid));
        node.y = Math.max(0, snap(event.clientY - bounds.top, topology.grid));
      }
      persistAndNotify(network, topology, onChange);
      render(container, network, options);
    });
    workspace.append(canvas);
    workspace.append(create("div", "topology-workspace-status", `Saved locally | ${topology.cables.length} cable${topology.cables.length === 1 ? "" : "s"} | ${topology.nodes.length} device${topology.nodes.length === 1 ? "" : "s"}`));
    renderInto(canvas, network, topology, () => { persistAndNotify(network, topology, onChange); render(container, network, options); });
    container.append(workspace);
  }

  window.CommandDoctorTopology = { render, ensureTopology, applyCablesToNetwork, saveTopology, loadSavedTopology };
  document.addEventListener("commanddoctor:render-topology", (event) => {
    const detail = event.detail || {};
    if (detail.container && detail.network) render(detail.container, detail.network, detail.options || {});
  });
}());
