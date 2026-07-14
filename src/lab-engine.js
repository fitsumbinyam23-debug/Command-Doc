"use strict";

(() => {
  const DEFAULT_PROFILE = {
    hostname: "TRAINING-SWITCH", accessPort: "GigabitEthernet1/0/1", secondAccessPort: "GigabitEthernet1/0/2",
    trunkPort: "GigabitEthernet1/0/24", endpoint: "PC-1", currentVlan: "1", targetVlan: "20", stackMember: "1", priority: "10"
  };
  const DEVICE_SEEDS = {
    access: { hostname: DEFAULT_PROFILE.hostname, vendor: "Cisco IOS", interface: DEFAULT_PROFILE.accessPort, endpoint: DEFAULT_PROFILE.endpoint, vlan: DEFAULT_PROFILE.currentVlan, targetVlan: DEFAULT_PROFILE.targetVlan, description: DEFAULT_PROFILE.endpoint, issue: "Incorrect simulated access VLAN" },
    disabled: { hostname: DEFAULT_PROFILE.hostname, vendor: "Cisco IOS", interface: DEFAULT_PROFILE.accessPort, endpoint: DEFAULT_PROFILE.endpoint, vlan: DEFAULT_PROFILE.targetVlan, targetVlan: DEFAULT_PROFILE.targetVlan, description: DEFAULT_PROFILE.endpoint, issue: "Administratively down simulated port", shutdown: true },
    trunk: { hostname: DEFAULT_PROFILE.hostname, vendor: "Cisco IOS", interface: DEFAULT_PROFILE.trunkPort, endpoint: "UPLINK-SWITCH", vlan: DEFAULT_PROFILE.currentVlan, targetVlan: DEFAULT_PROFILE.targetVlan, description: "Uplink to distribution switch", issue: "Simulated trunk configuration review", trunk: true },
    irf: { hostname: "COMWARE-LAB", vendor: "HP Comware", interface: "GigabitEthernet1/0/24", endpoint: DEFAULT_PROFILE.stackMember, vlan: DEFAULT_PROFILE.currentVlan, targetVlan: DEFAULT_PROFILE.targetVlan, description: "IRF port", issue: "Simulated IRF link down", irfDown: true },
    aruba: { hostname: "ARUBA-LAB", vendor: "ArubaOS-CX", interface: DEFAULT_PROFILE.accessPort, endpoint: DEFAULT_PROFILE.endpoint, vlan: DEFAULT_PROFILE.currentVlan, targetVlan: DEFAULT_PROFILE.targetVlan, description: DEFAULT_PROFILE.endpoint, issue: "Simulated LACP member not selected", lacpDown: true }
  };

  const normalize = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  const clone = (value) => JSON.parse(JSON.stringify(value));

  class SimulatedDeviceEngine {
    constructor(deviceId = "access") {
      this.deviceId = deviceId;
      this.seed = clone(DEVICE_SEEDS[deviceId] || DEVICE_SEEDS.access);
      this.mode = "exec";
      this.selectedInterface = this.seed.interface;
      this.selectedVlan = null;
      this.transcript = [];
      this.commands = [];
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
        vlans: [DEFAULT_PROFILE.currentVlan, DEFAULT_PROFILE.targetVlan],
        vlanNames: { [DEFAULT_PROFILE.currentVlan]: "DEFAULT", [DEFAULT_PROFILE.targetVlan]: "USERS" },
        stackMembers: [{ id: DEFAULT_PROFILE.stackMember, role: "Active", priority: DEFAULT_PROFILE.priority }, { id: "2", role: "Standby", priority: "5" }],
        irfMembers: [{ id: DEFAULT_PROFILE.stackMember, role: "Master", priority: DEFAULT_PROFILE.priority }, { id: "2", role: "Standby", priority: "5" }],
        irfDown: Boolean(this.seed.irfDown),
        lacpDown: Boolean(this.seed.lacpDown)
      };
      this.baseline = clone(this.state);
    }

    prompt() {
      if (this.seed.vendor === "HP Comware") {
        if (this.mode === "interface") return `[${this.state.hostname}-${this.selectedInterface}]`;
        if (this.mode === "config" || this.mode === "vlan") return `[${this.state.hostname}]`;
        return `<${this.state.hostname}>`;
      }
      if (this.mode === "config") return `${this.state.hostname}(config)#`;
      if (this.mode === "interface") return `${this.state.hostname}(config-if)#`;
      if (this.mode === "vlan") return `${this.state.hostname}(config-vlan)#`;
      return `${this.state.hostname}#`;
    }

    setTrainingProfile(profile = {}) {
      const hostname = String(profile.hostname || this.seed.hostname).trim() || this.seed.hostname;
      const interfaceName = String(profile.interface || this.seed.interface).trim() || this.seed.interface;
      const endpoint = String(profile.endpoint || this.seed.endpoint).trim() || this.seed.endpoint;
      const targetVlan = String(profile.targetVlan || this.seed.targetVlan).trim() || this.seed.targetVlan;
      const currentVlan = String(profile.currentVlan || targetVlan).trim() || targetVlan;
      this.seed = { ...this.seed, hostname, interface: interfaceName, endpoint, description: endpoint, targetVlan, vlan: currentVlan };
      this.mode = "exec";
      this.selectedInterface = interfaceName;
      this.selectedVlan = null;
      this.commands = [];
      this.transcript = [];
      this.state.hostname = hostname;
      this.state.interfaces = {
        [interfaceName]: {
          description: endpoint,
          vlan: currentVlan,
          shutdown: Boolean(this.seed.shutdown),
          connected: !this.seed.irfDown,
          mode: this.seed.trunk ? "trunk" : "access"
        }
      };
      this.state.vlans = [...new Set([currentVlan, targetVlan])];
      this.state.vlanNames = Object.fromEntries(this.state.vlans.map((vlan) => [vlan, vlan === targetVlan ? "TARGET-VLAN" : "CURRENT-VLAN"]));
      this.baseline = clone(this.state);
      return this.result(true, `Simulated training device ${hostname} is ready. Use read-only commands before configuration.`, "profile");
    }

    execute(raw) {
      const command = normalize(raw);
      this.commands.push(command);
      if (!command) return this.result(false, "Enter a command first.", "input");
      if (/(write erase|erase startup-config|reset saved-configuration|delete flash:|format|reload|reboot|factory reset)/.test(command)) {
        return this.result(false, "Safety stop: destructive commands are intentionally blocked in Lab Mode. Use rollback or reset the simulated device instead.", "danger");
      }
      if (/^(configure terminal|conf t|system-view)$/.test(command)) { this.mode = "config"; return this.result(true, "Enter configuration mode. Changes affect only this local simulation.", "config"); }
      if (/^(end|return)$/.test(command)) { this.mode = "exec"; return this.result(true, "Return to privileged EXEC mode.", "config"); }
      if (command === "exit") { this.mode = (this.mode === "interface" || this.mode === "vlan") ? "config" : "exec"; return this.result(true, "Exit one configuration level.", "config"); }
      if (this.mode === "vlan") return this.executeVlanCommand(raw, command);
      if (this.mode === "config" && /^(hostname|sysname)\s+\S+/.test(command)) {
        this.state.hostname = raw.trim().split(/\s+/).slice(1).join("-").toUpperCase();
        return this.result(true, `Simulated device name changed to ${this.state.hostname}.`, "config");
      }
      if (this.mode === "config" && /^vlan\s+\S+$/.test(command)) {
        this.selectedVlan = raw.trim().split(/\s+/).at(-1);
        if (!this.state.vlans.includes(this.selectedVlan)) this.state.vlans.push(this.selectedVlan);
        this.state.vlanNames[this.selectedVlan] ||= `VLAN-${this.selectedVlan}`;
        this.mode = "vlan";
        return this.result(true, `Selected simulated VLAN ${this.selectedVlan}.`, "config");
      }
      if (this.mode === "config" && /^switch\s+\S+\s+priority\s+\S+$/.test(command)) {
        const [, memberId, priority] = raw.trim().match(/^switch\s+(\S+)\s+priority\s+(\S+)$/i);
        const member = this.state.stackMembers.find((item) => String(item.id).toLowerCase() === memberId.toLowerCase());
        if (!member) return this.result(false, `Switch member ${memberId} is not present in this simulation.`, "warning");
        member.priority = priority;
        return this.result(true, `Simulated Cisco stack member ${memberId} priority set to ${priority}.`, "config");
      }
      if (this.mode === "config" && /^irf\s+member\s+\S+\s+priority\s+\S+$/.test(command)) {
        const [, memberId, priority] = raw.trim().match(/^irf\s+member\s+(\S+)\s+priority\s+(\S+)$/i);
        const member = this.state.irfMembers.find((item) => String(item.id).toLowerCase() === memberId.toLowerCase());
        if (!member) return this.result(false, `IRF member ${memberId} is not present in this simulation.`, "warning");
        member.priority = priority;
        return this.result(true, `Simulated IRF member ${memberId} priority set to ${priority}.`, "config");
      }
      if (this.mode === "config" && /^interface\s+/.test(command)) {
        this.selectedInterface = raw.trim().split(/\s+/).slice(1).join(" ");
        if (!this.state.interfaces[this.selectedInterface]) this.state.interfaces[this.selectedInterface] = { description: "", vlan: 1, shutdown: false, connected: true, mode: "access" };
        this.mode = "interface";
        return this.result(true, `Selected simulated interface ${this.selectedInterface}.`, "config");
      }
      if (this.mode === "interface") return this.executeInterfaceCommand(raw, command);
      if (/^(show interface status|show interfaces status|sh int status)$/.test(command)) return this.result(true, this.interfaceStatus(), "show");
      if (/^show version$/.test(command)) return this.result(true, `Simulated ${this.seed.vendor} software\nDevice: ${this.state.hostname}\nPlatform: CD-SW24 local training switch\nNo real device is connected.`, "show");
      if (/^show interfaces?(?:\s+\S+)?$/.test(command)) return this.result(true, this.interfaceDetail(raw), "show");
      if (/^(show vlan brief|sh vlan brief)$/.test(command)) return this.result(true, this.vlanBrief(), "show");
      if (/^show running-config interface/.test(command)) return this.result(true, this.runningInterface(), "verify");
      if (/^show startup-config$/.test(command)) return this.result(true, `Simulated startup configuration\n${this.runningConfig()}`, "show");
      if (/^show interfaces trunk/.test(command)) return this.result(true, `Port                         Mode         Encapsulation  Status\n${DEFAULT_PROFILE.trunkPort}  on           802.1q         trunking`, "show");
      if (/^show cdp neighbors/.test(command)) return this.result(true, `Device ID       Local Intrfce             Platform\nUPLINK-SWITCH   ${this.selectedInterface}  CD-SW24`, "show");
      if (/^show lldp neighbors/.test(command)) return this.result(true, `Local Interface             Chassis ID       Port ID\n${this.selectedInterface}  UPLINK-SWITCH   Gi1/0/24`, "show");
      if (/^show mac address-table/.test(command)) return this.result(true, `Vlan    Mac Address        Type       Ports\n${this.current().vlan}       02cd.0000.0001  DYNAMIC    ${this.selectedInterface}`, "show");
      if (/^show switch$/.test(command)) return this.result(true, `Switch/Stack Mac Address : 02cd.0000.0001\n\nSwitch#  Role      Priority  State\n${this.state.stackMembers.map((member) => `${member.id}${member.role === "Active" ? "*" : " "}        ${member.role.padEnd(8)} ${String(member.priority).padEnd(8)} Ready`).join("\n")}`, "show");
      if (/^display irf$/.test(command)) return this.result(true, `MemberID  Role      Priority  Status\n${this.state.irfMembers.map((member) => `${member.id}         ${member.role.padEnd(9)} ${String(member.priority).padEnd(8)} Ready`).join("\n")}`, "show");
      if (/^display irf configuration$/.test(command)) return this.result(true, `IRF Configuration\n${this.state.irfMembers.map((member) => `irf member ${member.id} priority ${member.priority}`).join("\n")}`, "show");
      if (/^display irf-port(?: configuration)?$/.test(command)) return this.result(true, this.state.irfDown ? "MemberID  IRF-Port1                    IRF-Port2\n1         GigabitEthernet1/0/24 DOWN    UP" : "MemberID  IRF-Port1                    IRF-Port2\n1         GigabitEthernet1/0/24 UP      UP", "show");
      if (/^display irf topology/.test(command)) return this.result(true, this.state.irfDown ? "Topology Info\nMember 1  GigabitEthernet1/0/24 DOWN" : "Topology Info\nMember 1  GigabitEthernet1/0/24 UP", "show");
      if (/^display version$/.test(command)) return this.result(true, `Simulated ${this.seed.vendor} software\nDevice: ${this.state.hostname}\nPlatform: CD-SW24 local training switch\nNo real device is connected.`, "show");
      if (/^display current-configuration(?: interface)?/.test(command)) return this.result(true, /interface/.test(command) ? this.runningInterface() : this.runningConfig(), "show");
      if (/^display saved-configuration$/.test(command)) return this.result(true, `Simulated saved configuration\n${this.runningConfig()}`, "show");
      if (/^display vlan(?:\s+\S+)?$/.test(command)) return this.result(true, this.vlanBrief(), "show");
      if (/^display interface brief$/.test(command)) return this.result(true, this.interfaceStatus(), "show");
      if (/^display mac-address(?: interface)?/.test(command)) return this.result(true, `VLAN  MAC Address        Type       Interface\n${this.current().vlan}     02cd.0000.0001  Dynamic    ${this.selectedInterface}`, "show");
      if (/^display lldp neighbor-information/.test(command)) return this.result(true, `Local Interface             Neighbor        Remote Port\n${this.selectedInterface}  UPLINK-SWITCH   Gi1/0/24`, "show");
      if (/^display interface(?:\s+\S+)?$/.test(command)) return this.result(true, this.interfaceDetail(raw), "show");
      if (/^show interface brief/.test(command)) return this.result(true, `Interface  Status  Speed\n${this.selectedInterface}     ${this.state.lacpDown ? "down" : "up"}      1G`, "show");
      if (/^show lacp interfaces$/.test(command)) return this.result(true, this.state.lacpDown ? `Interface  Bundle  State       Partner\n${this.selectedInterface}     1        blocked     UPLINK-SWITCH\n\nMember is not selected for the simulated LAG.` : `Interface  Bundle  State       Partner\n${this.selectedInterface}     1        selected    UPLINK-SWITCH`, "show");
      if (/^show running-config$/.test(command)) return this.result(true, this.runningConfig(), "verify");
      if (/^(write memory|wr mem|copy running-config startup-config|save|save force)$/.test(command)) return this.result(true, this.verify() ? "Simulated configuration saved after verification." : "Safety warning: verification has not passed. Do not save an unverified simulated change.", this.verify() ? "save" : "warning");
      if (/^(rollback|reset simulated device)$/.test(command)) { this.rollback(); return this.result(true, "Simulated device rolled back to its baseline.", "rollback"); }
      return this.result(false, "Unknown for this simulated device. Use a supported show/display command, configure terminal, interface GigabitEthernet1/0/1, switchport access vlan 20, description PC-1, no shutdown, end, or rollback.", "unknown");
    }

    executeInterfaceCommand(raw, command) {
      const current = this.current();
      if (/^switchport mode access$/.test(command)) { current.mode = "access"; return this.result(true, "Simulated switchport mode set to access.", "config"); }
      if (/^switchport mode trunk$/.test(command)) { current.mode = "trunk"; return this.result(true, "Simulated switchport mode set to trunk. Verify allowed VLANs before saving.", "config"); }
      if (/^switchport trunk allowed vlan\s+.+$/.test(command)) { current.allowedVlans = raw.trim().split(/\s+/).slice(4).join(" "); return this.result(true, `Simulated trunk allowed VLANs set to ${current.allowedVlans}.`, "config"); }
      if (/^switchport access vlan \S+$/.test(command)) { current.vlan = raw.trim().split(/\s+/).at(-1); return this.result(true, `Simulated access VLAN set to ${current.vlan}.`, "config"); }
      if (/^port link-type access$/.test(command)) { current.mode = "access"; return this.result(true, "Simulated Comware port link type set to access.", "config"); }
      if (/^port access vlan \S+$/.test(command)) { current.vlan = raw.trim().split(/\s+/).at(-1); return this.result(true, `Simulated Comware access VLAN set to ${current.vlan}.`, "config"); }
      if (/^vlan access \S+$/.test(command)) { current.vlan = raw.trim().split(/\s+/).at(-1); return this.result(true, `Simulated Aruba access VLAN set to ${current.vlan}.`, "config"); }
      if (/^(no description|undo description)$/.test(command)) { current.description = ""; return this.result(true, "Simulated interface description cleared. Verify before saving.", "config"); }
      if (/^description\s+/.test(command)) { current.description = raw.trim().slice("description".length).trim(); return this.result(true, `Simulated description set to ${current.description}.`, "config"); }
      if (/^(no shutdown|undo shutdown)$/.test(command)) { current.shutdown = false; current.connected = true; return this.result(true, "Simulated interface enabled. Verify the link and VLAN.", "config"); }
      if (/^shutdown$/.test(command)) { current.shutdown = true; return this.result(true, "Simulated interface administratively down. This is reversible with no shutdown.", "config"); }
      if (/^default interface\s+/.test(command)) { this.state.interfaces[this.selectedInterface] = clone(this.baseline.interfaces[this.selectedInterface] || { description: "", vlan: DEFAULT_PROFILE.currentVlan, shutdown: false, connected: true, mode: "access" }); return this.result(true, "Simulated interface returned to its baseline state. Verify before saving.", "rollback"); }
      if (/^exit$/.test(command)) { this.mode = "config"; return this.result(true, "Exit interface configuration mode.", "config"); }
      return this.result(false, "That command is not appropriate in simulated interface configuration mode.", "warning");
    }

    executeVlanCommand(raw, command) {
      if (/^name\s+/.test(command)) {
        this.state.vlanNames[this.selectedVlan] = raw.trim().slice("name".length).trim().toUpperCase();
        return this.result(true, `Simulated VLAN ${this.selectedVlan} name set to ${this.state.vlanNames[this.selectedVlan]}.`, "config");
      }
      return this.result(false, "Use name USERS or exit while in simulated VLAN configuration mode.", "warning");
    }

    current() { return this.state.interfaces[this.selectedInterface]; }
    verify() { const current = this.current(); return !current.shutdown && current.vlan === this.seed.targetVlan && (!this.seed.irfDown || !this.state.irfDown); }
    diff() {
      const changes = [];
      if (this.baseline.hostname !== this.state.hostname) changes.push(`hostname: ${this.baseline.hostname} -> ${this.state.hostname}`);
      this.state.stackMembers.forEach((member, index) => { if (this.baseline.stackMembers[index]?.priority !== member.priority) changes.push(`switch ${member.id} priority: ${this.baseline.stackMembers[index].priority} -> ${member.priority}`); });
      this.state.irfMembers.forEach((member, index) => { if (this.baseline.irfMembers[index]?.priority !== member.priority) changes.push(`irf member ${member.id} priority: ${this.baseline.irfMembers[index].priority} -> ${member.priority}`); });
      Object.entries(this.state.vlanNames).forEach(([id, name]) => { if (this.baseline.vlanNames[id] !== name) changes.push(`vlan ${id} name: ${this.baseline.vlanNames[id] ?? "-"} -> ${name}`); });
      const before = this.baseline.interfaces[this.selectedInterface] || {}; const after = this.current();
      Object.keys(after).filter((key) => before[key] !== after[key]).forEach((key) => changes.push(`${key}: ${before[key] ?? "-"} -> ${after[key]}`));
      return changes.join("\n") || "No pending simulated configuration changes.";
    }
    rollback() { this.state = clone(this.baseline); this.mode = "exec"; this.selectedInterface = this.seed.interface; this.selectedVlan = null; }
    interfaceStatus() { const current = this.current(); const status = current.shutdown ? "disabled" : current.connected ? "connected" : "notconnect"; return `Port        Name              Status     Vlan\n${this.selectedInterface}  ${current.description || "-"}  ${status}  ${current.vlan}`; }
    interfaceDetail(raw) {
      const words = raw.trim().split(/\s+/);
      const requested = words.slice(2).join(" ");
      const interfaceName = requested && !/^(brief|status)$/i.test(requested) ? requested : this.selectedInterface;
      const current = this.state.interfaces[interfaceName] || this.current();
      const link = current.shutdown ? "administratively down" : current.connected ? "up" : "down";
      const protocol = current.shutdown || !current.connected ? "down" : "up";
      if (this.seed.vendor === "HP Comware") {
        return `${interfaceName} current state: ${link.toUpperCase()}\nLine protocol current state: ${protocol.toUpperCase()}\nDescription: ${current.description || "-"}\nPort link-type: ${current.mode}\nPVID: ${current.vlan}\nSpeed: 1G\nInput errors: 0\nOutput errors: 0`;
      }
      return `${interfaceName} is ${link}, line protocol is ${protocol}\n  Description: ${current.description || "-"}\n  Hardware is Simulated Ethernet, address is 02cd.0000.0001\n  MTU 1500 bytes, BW 1000000 Kbit/sec\n  Full-duplex, 1000Mb/s, media type is simulated\n  switchport mode ${current.mode}\n  access VLAN ${current.vlan}\n  0 input errors, 0 CRC, 0 frame, 0 overrun, 0 ignored\n  0 output errors, 0 collisions, 0 interface resets`;
    }
    bootOutput() { return `Booting simulated ${this.seed.vendor} device...\nLoading local training configuration...\nSystem ready. No real device is connected.\n\n${this.prompt()}`; }
    vlanBrief() { const current = this.current(); return `VLAN Name             Status    Ports\n${this.state.vlans.map((vlan) => `${String(vlan).padEnd(18)} ${String(this.state.vlanNames[vlan]).padEnd(22)} active    ${vlan === current.vlan ? this.selectedInterface : ""}`).join("\n")}`; }
    runningInterface() { const current = this.current(); return `interface ${this.selectedInterface}\n description ${current.description}\n switchport mode ${current.mode}\n${current.mode === "trunk" ? ` switchport trunk allowed vlan ${current.allowedVlans || DEFAULT_PROFILE.targetVlan}` : ` switchport access vlan ${current.vlan}`}\n ${current.shutdown ? "shutdown" : "no shutdown"}`; }
    runningConfig() { return `hostname ${this.state.hostname}\n${this.state.stackMembers.map((member) => `switch ${member.id} priority ${member.priority}`).join("\n")}\n${this.state.vlans.map((vlan) => `vlan ${vlan}\n name ${this.state.vlanNames[vlan]}`).join("\n")}\n${this.runningInterface()}`; }
    result(ok, output, kind) { return { ok, output, kind, prompt: this.prompt(), diff: this.diff(), verified: this.verify() }; }
  }

  window.CommandDoctorLabEngine = { SimulatedDeviceEngine, DEVICE_SEEDS, DEFAULT_PROFILE };
})();
