"use strict";

(() => {
  const normalise = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const STORAGE_KEY = "command-doctor.switch-runtime.v1";
  const SUPPORT_LEVELS = {
    fully_simulated: "full_state_simulation",
    partially_simulated: "simplified_state_simulation",
    lookup_only: "output_simulation",
    full_state_simulation: "full_state_simulation",
    simplified_state_simulation: "simplified_state_simulation",
    output_simulation: "output_simulation",
    explanation_only: "explanation_only",
    unsupported_for_profile: "unsupported_for_profile"
  };
  const groupBy = (items, key) => items.reduce((groups, item) => { const name = key(item); (groups[name] ||= []).push(item); return groups; }, {});
  const cleanSnapshot = (value) => { const next = clone(value); delete next.unsaved_changes; return next; };
  const normaliseState = (value, profile) => {
    const next = clone(value);
    next.system ||= { hostname: next.hostname || "TRAINING-SWITCH", profile_id: profile.profile_id, version: profile.default_version };
    next.configuration ||= {};
    next.interfaces ||= {};
    next.vlans ||= { 1: { name: "DEFAULT" } };
    next.mac_table ||= [];
    next.neighbors ||= [];
    next.endpoint_links ||= [];
    next.cables ||= [];
    next.diagnostics ||= [];
    next.logs ||= [];
    next.unsaved_changes ||= [];
    delete next.hostname;
    delete next.profile_id;
    delete next.version;
    return next;
  };

  const tokenLabel = (token) => token.type === "literal" ? token.value : token.type === "choice" ? token.values.join("|") : `<${token.name}>`;
  const parameterType = (name) => {
    const value = normalise(name);
    if (/ipv6/.test(value)) return "ipv6";
    if (/ip|address/.test(value)) return "ipv4";
    if (/mask/.test(value)) return "mask";
    if (/prefix/.test(value)) return "prefix";
    if (/vlan/.test(value)) return "vlan";
    if (/mac/.test(value)) return "mac";
    if (/interface|port/.test(value)) return "interface";
    if (/description|name|text|message/.test(value)) return "free_text";
    if (/list|range|allowed/.test(value)) return "list";
    return "parameter";
  };
  const validateParameter = (type, value, profile) => {
    if (type === "ipv4") return /^(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(value);
    if (type === "ipv6") return value.includes(":") && /^[0-9a-f:]+$/i.test(value);
    if (type === "mask") return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(value);
    if (type === "prefix") return /^\/?(?:[0-9]|[12]\d|3[0-2])$/.test(value);
    if (type === "vlan") return /^(?:[1-9]\d{0,3}|40[0-9][0-4])$/.test(value) && Number(value) <= 4094;
    if (type === "mac") return /^(?:[0-9a-f]{4}\.){2}[0-9a-f]{4}$|^(?:[0-9a-f]{2}:){5}[0-9a-f]{2}$/i.test(value);
    if (type === "interface") return /^(?:gi|gigabitethernet|fa|fastethernet|te|ten-gigabitethernet|ethernet)\S+$/i.test(value) || Boolean(profile?.interface_naming && value.toLowerCase().startsWith(profile.interface_naming.split("{")[0].toLowerCase()));
    if (type === "list") return /^[\d,-]+$/.test(value);
    return Boolean(value);
  };
  function tokeniseSyntax(syntax) {
    return String(syntax || "").trim().split(/\s+/).filter(Boolean).map((raw) => {
      const optional = /^\[.+\]$/.test(raw);
      const value = optional ? raw.slice(1, -1) : raw;
      if (/^<.+>$/.test(value)) { const name = value.slice(1, -1).toLowerCase(); return { type: parameterType(name), name, optional, repeated: /\.\.\.|list|range/.test(name) }; }
      if (value.includes("|")) return { type: "choice", values: value.split("|").map(normalise), optional };
      return { type: "literal", value: normalise(value), optional };
    });
  }

  function parseTokens(command, text, profile = null, syntaxOverride = "") {
    const entered = String(text || "").trim().split(/\s+/).filter(Boolean);
    const syntax = tokeniseSyntax(syntaxOverride || command.canonical_command);
    const parameters = {};
    let inputIndex = 0;
    for (let syntaxIndex = 0; syntaxIndex < syntax.length; syntaxIndex += 1) {
      const expected = syntax[syntaxIndex];
      const value = entered[inputIndex];
      if (value === undefined) {
        if (expected.optional) continue;
        return { status: "incomplete", consumed_tokens: inputIndex, parsed_parameters: parameters, expected_tokens: [tokenLabel(expected)], invalid_token_index: null };
      }
      if (expected.type === "free_text") {
        parameters[expected.name] = entered.slice(inputIndex).join(" ");
        inputIndex = entered.length;
        break;
      }
      if (expected.type === "literal" && normalise(value) !== expected.value) return { status: "invalid", invalid_token_index: inputIndex, consumed_tokens: inputIndex, parsed_parameters: parameters, expected_tokens: [expected.value] };
      if (expected.type === "choice" && !expected.values.includes(normalise(value))) return { status: "invalid", invalid_token_index: inputIndex, consumed_tokens: inputIndex, parsed_parameters: parameters, expected_tokens: expected.values };
      if (!["literal", "choice"].includes(expected.type) && !validateParameter(expected.type, value, profile)) return { status: "invalid", invalid_token_index: inputIndex, consumed_tokens: inputIndex, parsed_parameters: parameters, expected_tokens: [tokenLabel(expected)] };
      if (!["literal", "choice"].includes(expected.type)) parameters[expected.name] = expected.repeated ? entered.slice(inputIndex).join(" ") : value;
      inputIndex += expected.repeated ? entered.length - inputIndex : 1;
      if (expected.repeated) break;
    }
    if (inputIndex < entered.length) return { status: "invalid", invalid_token_index: inputIndex, consumed_tokens: inputIndex, parsed_parameters: parameters, expected_tokens: [] };
    return { status: "matched", consumed_tokens: inputIndex, parsed_parameters: parameters, expected_tokens: [], invalid_token_index: null };
  }

  class CommandRegistry {
    constructor(commands = [], profile = null) {
      this.commands = commands;
      this.profile = profile;
      this.catalog = commands.filter((command) => this.availability(command).available);
    }

    setProfile(profile) {
      this.profile = profile;
      this.catalog = this.commands.filter((command) => this.availability(command).available);
      return this.catalog;
    }

    availability(command, mode = "exec", privilege = "privileged") {
      const profile = this.profile;
      if (!profile) return { available: true };
      if (command.vendor !== profile.vendor) return { available: false, reason: "wrong_vendor" };
      const profileOs = normalise(`${profile.operating_system} ${profile.vendor_label}`);
      if (command.operating_system && command.operating_system !== "Unknown" && !profileOs.includes(normalise(command.operating_system))) return { available: false, reason: "wrong_operating_system" };
      if (command.operating_system_version && command.operating_system_version !== "Unknown" && !normalise(profile.default_version).includes(normalise(command.operating_system_version))) return { available: false, reason: "wrong_version" };
      if (command.platform_family && command.platform_family !== "Any" && command.platform_family !== profile.platform_family) return { available: false, reason: "wrong_model" };
      if (Array.isArray(command.supported_model_profiles) && command.supported_model_profiles.length && !command.supported_model_profiles.includes(profile.profile_id)) return { available: false, reason: "wrong_model" };
      if (Array.isArray(command.required_capabilities) && command.required_capabilities.some((capability) => !(profile.capability_ids || []).includes(capability))) return { available: false, reason: "capability_missing" };
      if (Array.isArray(command.feature_dependencies) && command.feature_dependencies.some((feature) => !(profile.feature_ids || []).includes(feature))) return { available: false, reason: "feature_disabled" };
      if (Array.isArray(command.license_dependencies) && command.license_dependencies.some((license) => !(profile.license_ids || []).includes(license))) return { available: false, reason: "license_unavailable" };
      if (Array.isArray(command.available_modes) && command.available_modes.length && !command.available_modes.includes(mode)) return { available: false, reason: "wrong_mode" };
      if (command.required_privilege === "enable" && privilege !== "privileged") return { available: false, reason: "insufficient_privilege" };
      return { available: true };
    }

    resolve(text, context = {}) {
      const entered = normalise(text);
      const candidates = this.commands.filter((command) => command.vendor === this.profile?.vendor);
      const parsed = candidates.flatMap((command) => [command.canonical_command, ...(command.aliases || [])].map((syntax) => ({ command, syntax, parsed: parseTokens(command, entered, this.profile, syntax), availability: this.availability(command, context.mode, context.privilege) })));
      const match = parsed.find((item) => item.parsed.status === "matched");
      if (match) return match.availability.available ? { status: "matched", command: match.command, entered_alias: normalise(match.command.canonical_command) !== normalise(match.syntax), ...match.parsed } : { status: match.availability.reason, command: match.command, ...match.parsed };
      const incomplete = parsed.filter((item) => item.parsed.status === "incomplete" && item.availability.available);
      if (incomplete.length === 1) return { status: "incomplete", command: incomplete[0].command, ...incomplete[0].parsed };
      if (incomplete.length > 1) return { status: "ambiguous", matches: incomplete.slice(0, 8).map((item) => item.command), expected_tokens: [...new Set(incomplete.flatMap((item) => item.parsed.expected_tokens))] };
      const otherVendor = this.commands.find((command) => normalise(command.canonical_command) === entered || (command.aliases || []).some((alias) => normalise(alias) === entered));
      if (otherVendor) return { status: "wrong_vendor", command: otherVendor };
      const starts = this.catalog.filter((command) => normalise(command.canonical_command).startsWith(entered));
      if (starts.length > 1) return { status: "ambiguous", matches: starts.slice(0, 8) };
      if (starts.length === 1) return { status: "incomplete", command: starts[0] };
      return { status: "unknown" };
    }

    help(text = "") {
      const value = normalise(text.replace(/\?$/, ""));
      const candidates = this.catalog.flatMap((command) => [command.canonical_command, ...(command.aliases || [])].map((syntax) => ({ command, parsed: parseTokens(command, value, this.profile, syntax) }))).filter((item) => item.parsed.status === "matched" || item.parsed.status === "incomplete");
      return [...new Set(candidates.flatMap((item) => item.parsed.expected_tokens))].slice(0, 12);
    }

    complete(text = "") {
      const next = this.help(text);
      if (next.length !== 1) return null;
      return `${String(text || "").trim()}${text.trim() ? " " : ""}${next[0].replace(/^<|>$/g, "")}`;
    }

    summary() {
      const bySupport = groupBy(this.catalog, (command) => command.simulator_support);
      return {
        canonical: this.catalog.length,
        aliases: this.catalog.reduce((total, command) => total + (command.aliases || []).length, 0),
        fully_simulated: (bySupport.full_state_simulation || []).length,
        simplified_simulated: (bySupport.simplified_state_simulation || []).length,
        output_only: (bySupport.output_simulation || []).length,
        explanation_only: (bySupport.explanation_only || []).length
      };
    }
  }

  class SharedSwitchState {
    constructor(profile, saved = null) {
      this.profile = profile;
      this.eventLog = saved?.eventLog || [];
      this.running = normaliseState(saved?.running || this.defaultState(profile), profile);
      this.startup = normaliseState(saved?.startup || clone(this.running), profile);
      this.baseline = normaliseState(saved?.baseline || clone(this.running), profile);
      this.factoryBaseline = normaliseState(saved?.factoryBaseline || clone(this.baseline), profile);
    }

    defaultState(profile) {
      const interfaces = {};
      for (let port = 1; port <= profile.access_port_count; port += 1) {
        const name = profile.interface_naming.replace("{port}", port);
        interfaces[name] = { name, description: "", mode: "access", vlan: 1, admin_up: true, operational_up: false, connected_device: "", allowed_vlans: "", native_vlan: 1 };
      }
      return { system: { hostname: "TRAINING-SWITCH", profile_id: profile.profile_id, version: profile.default_version }, configuration: {}, interfaces, vlans: { 1: { name: "DEFAULT" } }, mac_table: [], neighbors: [], endpoint_links: [], cables: [], diagnostics: [], logs: [], unsaved_changes: [] };
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
    updateHostname(hostname, commandId = "hostname") { this.change("system.hostname", this.running.system.hostname, hostname, commandId); this.running.system.hostname = hostname; }
    save(commandId = "save") {
      const before = clone(this.running);
      const cleanRunning = cleanSnapshot(this.running);
      this.startup = clone(cleanRunning);
      this.baseline = clone(cleanRunning);
      this.running.unsaved_changes = [];
      this.record({ command_id: commandId, canonical_command: commandId, entered_text: commandId, success: true, state_before: before, state_after: clone(this.running), save_result: "saved" });
      this.persist();
    }
    rollbackUnsaved() { const before = clone(this.running); this.running = clone(this.startup); this.running.unsaved_changes = []; this.record({ command_id: "rollback-unsaved", canonical_command: "rollback unsaved", entered_text: "rollback unsaved", success: true, state_before: before, state_after: clone(this.running), safety_result: "rollback_unsaved" }); this.persist(); }
    resetTraining() { const before = clone(this.running); this.running = clone(this.factoryBaseline); this.running.unsaved_changes = []; this.record({ command_id: "reset-training", canonical_command: "reset training switch", entered_text: "reset training switch", success: true, state_before: before, state_after: clone(this.running), safety_result: "reset_training" }); this.persist(); }
    rollbackChange(index) { const change = this.changes()[index]; if (!change) return false; const [name, field] = change.field.split("."); if (this.running.interfaces[name]) this.running.interfaces[name][field] = change.before; this.running.unsaved_changes.splice(index, 1); this.record({ command_id: "rollback-one-change", canonical_command: "rollback one change", entered_text: change.field, success: true, changed_fields: [change.field], safety_result: "rollback_one_change" }); this.persist(); return true; }
    rollback() { this.rollbackUnsaved(); }
    record(event) {
      const required = { event_id: crypto.randomUUID?.() || `${Date.now()}-${this.eventLog.length}`, timestamp: new Date().toISOString(), command_id: "unclassified", canonical_command: "", entered_text: "", entered_alias: false, parsed_parameters: {}, vendor: this.profile.vendor, profile_id: this.profile.profile_id, operating_system_version: this.profile.default_version, mode_before: "exec", mode_after: "exec", privilege_before: "privileged", privilege_after: "privileged", success: false, failure_type: "", state_before: {}, state_after: {}, changed_fields: [], output_id: "", route_id: "", route_step: null, lesson_id: "", safety_result: "", verification_result: "", save_result: "" };
      const next = { ...required, ...event };
      if (!next.command_id || !next.profile_id || typeof next.success !== "boolean") throw new Error("Invalid local command event.");
      this.eventLog.push(next); if (this.eventLog.length > 300) this.eventLog.splice(0, this.eventLog.length - 300);
    }
    snapshot() { return { profile_id: this.profile.profile_id, running: this.running, startup: this.startup, baseline: this.baseline, factoryBaseline: this.factoryBaseline, eventLog: this.eventLog }; }
    persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.snapshot())); }
  }

  class ProfileRegistry {
    constructor(profiles = []) { this.profiles = profiles; }
    get(id) { return this.profiles.find((profile) => profile.profile_id === id) || this.profiles[0] || null; }
    byVendor(vendor) { return this.profiles.filter((profile) => profile.vendor === vendor); }
  }

  window.CommandDoctorSwitchRuntime = { CommandRegistry, SharedSwitchState, ProfileRegistry, STORAGE_KEY, normalise, clone };
})();
