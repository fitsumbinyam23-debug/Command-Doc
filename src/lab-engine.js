"use strict";

(() => {
  const DEVICE_SEEDS = {
    hq: { hostname: "HQ-ACC-01", vendor: "Cisco IOS", interface: "Gi1/0/24", endpoint: "Finance-PC", vlan: 30, targetVlan: 31, description: "Finance-PC", issue: "Wrong access VLAN" },
    branch: { hostname: "BRANCH-ACC-02", vendor: "Cisco IOS", interface: "Gi1/0/12", endpoint: "Reception-PC", vlan: 20, targetVlan: 20, description: "Reception-PC", issue: "Administratively down port", shutdown: true },
    warehouse: { hostname: "WH-ACC-03", vendor: "Cisco IOS", interface: "Gi1/0/8", endpoint: "Scanner-07", vlan: 50, targetVlan: 50, description: "Scanner-07", issue: "Healthy reference port" },
    irf: { hostname: "CORE-IRF-01", vendor: "HP Comware", interface: "Ten-GigabitEthernet1/0/49", endpoint: "IRF-Port1", vlan: 30, targetVlan: 30, description: "IRF uplink", issue: "IRF link down", irfDown: true },
    aruba: { hostname: "EDGE-CX-01", vendor: "ArubaOS-CX", interface: "1/1/10", endpoint: "Training-AP", vlan: 40, targetVlan: 40, description: "Training-AP", issue: "LACP member not selected", lacpDown: true }
  };

  const normalize = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  const clone = (value) => JSON.parse(JSON.stringify(value));

  class SimulatedDeviceEngine {
    constructor(deviceId = "hq") {
      this.deviceId = deviceId;
      this.seed = clone(DEVICE_SEEDS[deviceId] || DEVICE_SEEDS.hq);
      this.mode = "exec";
      this.selectedInterface = this.seed.interface;
      this.transcript = [];
      this.logs = [`%LINK-3-UPDOWN: ${this.seed.interface} initialized for offline practice`];
      this.state = {
        hostname: this.seed.hostname,
        vendor: this.seed.vendor,
        interfaces: {
          [this.seed.interface]: {
            description: this.seed.description,
            vlan: this.seed.vlan,
            shutdown: Boolean(this.seed.shutdown),
            connected: !this.seed.irfDown,
            mode: "access"
          }
        },
        vlans: [1, 20, 30, 31, 40, 50],
        irfDown: Boolean(this.seed.irfDown),
        lacpDown: Boolean(this.seed.lacpDown)
      };
      this.baseline = clone(this.state);
    }

    prompt() {
      if (this.mode === "config") return `${this.state.hostname}(config)#`;
      if (this.mode === "interface") return `${this.state.hostname}(config-if)#`;
      return this.seed.vendor === "HP Comware" ? `<${this.state.hostname}>` : `${this.state.hostname}#`;
    }

    execute(raw) {
      const command = normalize(raw);
      if (!command) return this.result(false, "Enter a command first.", "input");
      if (/(write erase|erase startup-config|delete flash:|format|reload|reboot|factory reset)/.test(command)) {
        return this.result(false, "Safety stop: destructive commands are intentionally blocked in Lab Mode. Use rollback or reset the simulated device instead.", "danger");
      }
      if (/^(configure terminal|conf t|system-view)$/.test(command)) { this.mode = "config"; return this.result(true, "Enter configuration mode. Changes affect only this local simulation.", "config"); }
      if (/^(end|return)$/.test(command)) { this.mode = "exec"; return this.result(true, "Return to privileged EXEC mode.", "config"); }
      if (command === "exit") { this.mode = this.mode === "interface" ? "config" : "exec"; return this.result(true, "Exit one configuration level.", "config"); }
      if (this.mode === "config" && /^interface\s+/.test(command)) {
        this.selectedInterface = raw.trim().split(/\s+/).slice(1).join(" ");
        if (!this.state.interfaces[this.selectedInterface]) this.state.interfaces[this.selectedInterface] = { description: "", vlan: 1, shutdown: false, connected: true, mode: "access" };
        this.mode = "interface";
        return this.result(true, `Selected simulated interface ${this.selectedInterface}.`, "config");
      }
      if (this.mode === "interface") return this.executeInterfaceCommand(raw, command);
      if (/^(show interface status|show interfaces status|sh int status)$/.test(command)) return this.result(true, this.interfaceStatus(), "show");
      if (/^(show vlan brief|sh vlan brief)$/.test(command)) return this.result(true, this.vlanBrief(), "show");
      if (/^show running-config interface/.test(command)) return this.result(true, this.runningInterface(), "verify");
      if (/^show interfaces trunk/.test(command)) return this.result(true, "Port        Mode         Encapsulation  Status\nGi1/0/48  on           802.1q         trunking", "show");
      if (/^show cdp neighbors/.test(command)) return this.result(true, `Device ID       Local Intrfce   Platform\nCORE-SW         ${this.selectedInterface}      C9300`, "show");
      if (/^show mac address-table/.test(command)) return this.result(true, `Vlan    Mac Address       Type       Ports\n${this.current().vlan}      0011.2233.4455    DYNAMIC    ${this.selectedInterface}`, "show");
      if (/^display irf$/.test(command)) return this.result(true, "MemberID  Role      Priority  Status\n1         Master    32        Ready\n2         Standby   31        Ready", "show");
      if (/^display irf topology/.test(command)) return this.result(true, this.state.irfDown ? "Topology Info\nMember 1  IRF-Port1 DOWN  IRF-Port2 UP\nMember 2  IRF-Port1 DOWN  IRF-Port2 UP" : "Topology Info\nMember 1  IRF-Port1 UP  IRF-Port2 UP\nMember 2  IRF-Port1 UP  IRF-Port2 UP", "show");
      if (/^show interface brief/.test(command)) return this.result(true, `Interface  Status  Speed\n${this.selectedInterface}     ${this.state.lacpDown ? "down" : "up"}      1G`, "show");
      if (/^(write memory|wr mem|copy running-config startup-config|save)$/.test(command)) return this.result(true, this.verify() ? "Simulated configuration saved after verification." : "Safety warning: verification has not passed. Do not save an unverified simulated change.", this.verify() ? "save" : "warning");
      if (/^(rollback|reset simulated device)$/.test(command)) { this.rollback(); return this.result(true, "Simulated device rolled back to its baseline.", "rollback"); }
      return this.result(false, "Unknown for this simulated device. Use a supported show/display command, configure terminal, interface <port>, switchport access vlan <vlan>, description <text>, no shutdown, end, or rollback.", "unknown");
    }

    executeInterfaceCommand(raw, command) {
      const current = this.current();
      if (/^switchport mode access$/.test(command)) { current.mode = "access"; return this.result(true, "Simulated switchport mode set to access.", "config"); }
      if (/^switchport access vlan \d+$/.test(command)) { current.vlan = Number(command.match(/\d+$/)[0]); return this.result(true, `Simulated access VLAN set to ${current.vlan}.`, "config"); }
      if (/^description\s+/.test(command)) { current.description = raw.trim().slice("description".length).trim(); return this.result(true, `Simulated description set to ${current.description}.`, "config"); }
      if (/^(no shutdown|undo shutdown)$/.test(command)) { current.shutdown = false; current.connected = true; return this.result(true, "Simulated interface enabled. Verify the link and VLAN.", "config"); }
      if (/^shutdown$/.test(command)) { current.shutdown = true; return this.result(true, "Simulated interface administratively down. This is reversible with no shutdown.", "config"); }
      if (/^exit$/.test(command)) { this.mode = "config"; return this.result(true, "Exit interface configuration mode.", "config"); }
      return this.result(false, "That command is not appropriate in simulated interface configuration mode.", "warning");
    }

    current() { return this.state.interfaces[this.selectedInterface]; }
    verify() { const current = this.current(); return !current.shutdown && current.vlan === this.seed.targetVlan && (!this.seed.irfDown || !this.state.irfDown); }
    diff() { const before = this.baseline.interfaces[this.selectedInterface] || {}; const after = this.current(); return Object.keys(after).filter((key) => before[key] !== after[key]).map((key) => `${key}: ${before[key] ?? "-"} -> ${after[key]}`).join("\n") || "No pending simulated configuration changes."; }
    rollback() { this.state = clone(this.baseline); this.mode = "exec"; this.selectedInterface = this.seed.interface; }
    interfaceStatus() { const current = this.current(); const status = current.shutdown ? "disabled" : current.connected ? "connected" : "notconnect"; return `Port        Name              Status     Vlan\n${this.selectedInterface}  ${current.description || "-"}  ${status}  ${current.vlan}`; }
    vlanBrief() { const current = this.current(); return `VLAN Name             Status    Ports\n${current.vlan}    TRAINING-${current.vlan}  active    ${this.selectedInterface}`; }
    runningInterface() { const current = this.current(); return `interface ${this.selectedInterface}\n description ${current.description}\n switchport mode ${current.mode}\n switchport access vlan ${current.vlan}\n ${current.shutdown ? "shutdown" : "no shutdown"}`; }
    result(ok, output, kind) { return { ok, output, kind, prompt: this.prompt(), diff: this.diff(), verified: this.verify() }; }
  }

  window.CommandDoctorLabEngine = { SimulatedDeviceEngine, DEVICE_SEEDS };
})();
