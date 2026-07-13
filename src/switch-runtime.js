"use strict";

(() => {
  const normalise = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const STORAGE_KEY = "command-doctor.switch-runtime.v1";

  class CommandRegistry {
    constructor(commands = [], profile = null) {
      this.commands = commands;
      this.profile = profile;
      this.catalog = commands.filter((command) => !profile || command.vendor === profile.vendor);
    }

    setProfile(profile) {
      this.profile = profile;
      this.catalog = this.commands.filter((command) => command.vendor === profile.vendor);
      return this.catalog;
    }

    resolve(text) {
      const entered = normalise(text);
      const exact = this.catalog.find((command) => normalise(command.canonical_command) === entered || (command.aliases || []).some((alias) => normalise(alias) === entered));
      if (exact) return { status: "matched", command: exact, entered_alias: normalise(exact.canonical_command) !== entered };
      const template = this.catalog.find((command) => this.matchesTemplate(command.canonical_command, entered) || (command.aliases || []).some((alias) => this.matchesTemplate(alias, entered)));
      if (template) return { status: "matched", command: template, entered_alias: normalise(template.canonical_command) !== entered };
      const otherVendor = this.commands.find((command) => normalise(command.canonical_command) === entered || (command.aliases || []).some((alias) => normalise(alias) === entered));
      if (otherVendor) return { status: "wrong_vendor", command: otherVendor };
      const starts = this.catalog.filter((command) => normalise(command.canonical_command).startsWith(entered));
      if (starts.length > 1) return { status: "ambiguous", matches: starts.slice(0, 8) };
      if (starts.length === 1) return { status: "incomplete", command: starts[0] };
      return { status: "unknown" };
    }

    matchesTemplate(template, entered) {
      const syntax = normalise(template);
      if (!syntax.includes("<")) return false;
      const expression = `^${syntax.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/<[^>]+>/g, "[^ ]+")}$`;
      return new RegExp(expression).test(entered);
    }

    help(text = "") {
      const value = normalise(text.replace(/\?$/, ""));
      const matches = this.catalog.filter((command) => !value || normalise(command.canonical_command).startsWith(value) || (command.aliases || []).some((alias) => normalise(alias).startsWith(value)));
      return matches.slice(0, 12).map((command) => ({ command_id: command.command_id, syntax: command.canonical_command, purpose: command.purpose, support: command.simulator_support }));
    }

    complete(text = "") {
      const value = normalise(text);
      const matches = this.catalog.filter((command) => normalise(command.canonical_command).startsWith(value));
      return matches.length === 1 ? matches[0].canonical_command : null;
    }

    summary() {
      const bySupport = Object.groupBy(this.catalog, (command) => command.simulator_support);
      return {
        canonical: this.catalog.length,
        aliases: this.catalog.reduce((total, command) => total + (command.aliases || []).length, 0),
        fully_simulated: (bySupport.fully_simulated || []).length,
        simplified_simulated: (bySupport.partially_simulated || []).length,
        output_only: (bySupport.lookup_only || []).length,
        explanation_only: (bySupport.explanation_only || []).length
      };
    }
  }

  class SharedSwitchState {
    constructor(profile, saved = null) {
      this.profile = profile;
      this.eventLog = saved?.eventLog || [];
      this.running = saved?.running || this.defaultState(profile);
      this.startup = saved?.startup || clone(this.running);
      this.baseline = saved?.baseline || clone(this.running);
    }

    defaultState(profile) {
      const interfaces = {};
      for (let port = 1; port <= profile.access_port_count; port += 1) {
        const name = profile.interface_naming.replace("{port}", port);
        interfaces[name] = { name, description: "", mode: "access", vlan: 1, admin_up: true, operational_up: false, connected_device: "", allowed_vlans: "", native_vlan: 1 };
      }
      return { hostname: "TRAINING-SWITCH", profile_id: profile.profile_id, version: profile.default_version, interfaces, vlans: { 1: { name: "DEFAULT" } }, mac_table: [], logs: [], unsaved_changes: [] };
    }

    interface(name) { return this.running.interfaces[name]; }
    changes() { return this.running.unsaved_changes || []; }
    change(field, before, after, commandId = "inspector") {
      if (before === after) return;
      this.running.unsaved_changes.push({ field, before, after, timestamp: new Date().toISOString(), command_id: commandId });
    }
    updateInterface(name, updates, commandId = "inspector") {
      const port = this.interface(name);
      if (!port) return false;
      Object.entries(updates).forEach(([key, value]) => { this.change(`${name}.${key}`, port[key], value, commandId); port[key] = value; });
      return true;
    }
    updateHostname(hostname, commandId = "hostname") { this.change("hostname", this.running.hostname, hostname, commandId); this.running.hostname = hostname; }
    save(commandId = "save") { this.startup = clone(this.running); this.running.unsaved_changes = []; this.record({ command_id: commandId, success: true, save_result: "saved" }); }
    rollback() { this.running = clone(this.baseline); this.record({ command_id: "rollback", success: true, safety_result: "rollback" }); }
    record(event) { this.eventLog.push({ event_id: crypto.randomUUID?.() || `${Date.now()}-${this.eventLog.length}`, timestamp: new Date().toISOString(), profile_id: this.profile.profile_id, ...event }); if (this.eventLog.length > 300) this.eventLog.splice(0, this.eventLog.length - 300); }
    snapshot() { return { profile_id: this.profile.profile_id, running: this.running, startup: this.startup, baseline: this.baseline, eventLog: this.eventLog }; }
    persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.snapshot())); }
  }

  class ProfileRegistry {
    constructor(profiles = []) { this.profiles = profiles; }
    get(id) { return this.profiles.find((profile) => profile.profile_id === id) || this.profiles[0] || null; }
    byVendor(vendor) { return this.profiles.filter((profile) => profile.vendor === vendor); }
  }

  window.CommandDoctorSwitchRuntime = { CommandRegistry, SharedSwitchState, ProfileRegistry, STORAGE_KEY, normalise, clone };
})();
