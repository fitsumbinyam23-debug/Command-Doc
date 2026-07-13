"use strict";

(() => {
  const normalise = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const STORAGE_KEY = "command-doctor.switch-runtime.v1";
  const RUNTIME_SCHEMA_VERSION = 2;
  const COMMAND_CATALOG_VERSION = "2026.07-lab.40";
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
  const vendorIds = {
    cisco_ios: { operating_system_id: "cisco_ios", operating_system_family_id: "cisco_ios" },
    hp_comware: { operating_system_id: "hp_comware", operating_system_family_id: "hp_comware" },
    aruba_cx: { operating_system_id: "arubaos_cx", operating_system_family_id: "arubaos_cx" },
    windows_cmd: { operating_system_id: "windows_cmd", operating_system_family_id: "windows" },
    linux: { operating_system_id: "linux", operating_system_family_id: "linux" }
  };
  const normaliseProfile = (profile = {}) => {
    const defaults = vendorIds[profile.vendor_id || profile.vendor] || {};
    const os = normalise(profile.operating_system);
    const operatingSystemId = profile.operating_system_id || (profile.vendor === "cisco_ios" && os.includes("xe") ? "cisco_ios_xe" : defaults.operating_system_id || normalise(profile.operating_system).replace(/[^a-z0-9]+/g, "_"));
    return {
      ...profile,
      vendor_id: profile.vendor_id || profile.vendor,
      vendor: profile.vendor_id || profile.vendor,
      operating_system_id: operatingSystemId,
      operating_system_family_id: profile.operating_system_family_id || defaults.operating_system_family_id || operatingSystemId,
      platform_family_id: profile.platform_family_id || profile.platform_family,
      software_version: profile.software_version || profile.default_version || "",
      capability_ids: profile.capability_ids || [],
      feature_ids: profile.feature_ids || [],
      license_ids: profile.license_ids || []
    };
  };
  const normaliseState = (value, profile) => {
    const next = clone(value);
    next.system ||= { hostname: next.hostname || "TRAINING-SWITCH", profile_id: profile.profile_id, version: profile.software_version || profile.default_version };
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
    next.session ||= {};
    next.session.selected_interface ||= Object.keys(next.interfaces)[0] || "";
    next.session.terminal_history ||= [];
    next.session.command_history ||= [];
    next.session.verification ||= {};
    delete next.hostname;
    delete next.profile_id;
    delete next.version;
    return next;
  };

  const tokenLabel = (token) => token.type === "literal" ? token.value : token.type === "choice" ? token.values.join("|") : `<${token.name}>`;
  const parameterType = (name) => {
    const value = normalise(name);
    if (/ipv6/.test(value)) return "ipv6";
    if (/ipv4|ip_address|address/.test(value)) return "ipv4";
    if (/mask/.test(value)) return "mask";
    if (/prefix/.test(value)) return "prefix";
    if (/vlan.*(?:list|allowed)/.test(value)) return "vlan_list";
    if (/vlan.*range/.test(value)) return "vlan_range";
    if (/vlan/.test(value)) return "vlan";
    if (/mac/.test(value)) return "mac";
    if (/interface|port/.test(value)) return "interface";
    if (/description|name|text|message/.test(value)) return "free_text";
    if (/list|range|allowed/.test(value)) return "list";
    return "parameter";
  };
  const validation = (ok, expected, message, allowed_range = "") => ({ ok, expected, message, allowed_range });
  const vlanId = (value) => /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 4094;
  const contiguousMask = (value) => {
    const octets = value.split(".").map(Number);
    if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
    return /^1*0*$/.test(octets.map((part) => part.toString(2).padStart(8, "0")).join(""));
  };
  const interfaceNames = (profile) => Array.from({ length: Number(profile?.access_port_count || 0) }, (_, index) => String(profile.interface_naming || "GigabitEthernet1/0/{port}").replace("{port}", index + 1));
  const validateParameterDetail = (type, value, profile) => {
    const candidate = String(value || "").trim();
    if (type === "ipv4") return validation(/^(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(candidate), "IPv4", "Enter an IPv4 address with four octets from 0 to 255.");
    if (type === "ipv6") return validation(/^(?=.{2,45}$)(?:[0-9a-f]{1,4}:){1,7}[0-9a-f]{0,4}$/i.test(candidate) || /^::1$/i.test(candidate), "IPv6", "Enter a valid compressed or expanded IPv6 address.");
    if (type === "mask") return validation(contiguousMask(candidate), "subnet mask", "Enter a contiguous IPv4 subnet mask such as 255.255.255.0.");
    if (type === "prefix") return validation(/^\/?\d+$/.test(candidate) && Number(candidate.replace("/", "")) >= 0 && Number(candidate.replace("/", "")) <= 128, "prefix", "Enter a prefix from 0 to 128.", "0-128");
    if (type === "vlan") return validation(vlanId(candidate), "VLAN ID", "Enter a VLAN ID from 1 to 4094.", "1-4094");
    if (type === "vlan_range") { const parts = candidate.split("-"); return validation(parts.length === 2 && vlanId(parts[0]) && vlanId(parts[1]) && Number(parts[0]) <= Number(parts[1]), "VLAN range", "Enter an ordered VLAN range such as 10-20.", "1-4094"); }
    if (type === "vlan_list" || type === "list") { const items = candidate.split(","); const valid = items.length && items.every((item) => { const parts = item.split("-"); return parts.length === 1 ? vlanId(parts[0]) : parts.length === 2 && vlanId(parts[0]) && vlanId(parts[1]) && Number(parts[0]) <= Number(parts[1]); }); return validation(valid, "VLAN list", "Enter VLAN IDs or ordered ranges, for example 10,20-30.", "1-4094"); }
    if (type === "mac") return validation(/^(?:[0-9a-f]{4}[.:]){2}[0-9a-f]{4}$|^(?:[0-9a-f]{2}:){5}[0-9a-f]{2}$/i.test(candidate), "MAC address", "Enter a MAC address such as 0011.2233.4455.");
    if (type === "interface") { const names = interfaceNames(profile); return validation(names.some((name) => normalise(name) === normalise(candidate)), "existing interface", `Choose an interface available on ${profile?.model || "this switch"}.`, names.join(", ")); }
    if (type === "free_text") return validation(Boolean(candidate), "text", "Enter a value after the command keyword.");
    return validation(Boolean(candidate), "value", "Enter a value.");
  };
  const validateParameter = (type, value, profile) => validateParameterDetail(type, value, profile).ok;
  function tokeniseSyntax(syntax) {
    const rawTokens = String(syntax || "").trim().match(/\[[^\]]+\]|\{[^}]+\}|\([^\)]+\)|<[^>]+>|\S+/g) || [];
    return rawTokens.map((raw) => {
      const optional = /^\[.+\]$/.test(raw);
      const required = /^\{.+\}$/.test(raw);
      const value = (optional || required) ? raw.slice(1, -1) : raw;
      if (/^<.+>$/.test(value)) { const name = value.slice(1, -1).toLowerCase(); return { type: parameterType(name), name, optional, repeated: /\.\.\.|list|range/.test(name) }; }
      if (value.includes("|")) return { type: "choice", values: value.split("|").map(normalise), optional, required };
      return { type: "literal", value: normalise(value), optional, required };
    });
  }
  const compileGrammar = (syntax) => ({ type: "sequence", syntax, nodes: tokeniseSyntax(syntax).map((token) => ({ ...token, node_type: token.type === "literal" ? "literal" : token.type === "choice" ? "choice" : token.type === "free_text" ? "free_text" : "parameter" })) });

  function parseTokens(command, text, profile = null, syntaxOverride = "") {
    const entered = String(text || "").trim().split(/\s+/).filter(Boolean);
    // A command can have a compiled canonical grammar and a different alias grammar.
    // Never reuse the canonical grammar while checking a distinct alias.
    const grammar = syntaxOverride && normalise(syntaxOverride) !== normalise(command.canonical_command)
      ? compileGrammar(syntaxOverride)
      : (command.grammar || compileGrammar(command.canonical_command));
    const syntax = grammar.nodes || grammar;
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
      if (!["literal", "choice"].includes(expected.type) && !validateParameter(expected.type, value, profile)) { const detail = validateParameterDetail(expected.type, value, profile); return { status: "invalid", invalid_token_index: inputIndex, invalid_value: value, expected_type: detail.expected, corrective_message: detail.message, allowed_range: detail.allowed_range, consumed_tokens: inputIndex, parsed_parameters: parameters, expected_tokens: [tokenLabel(expected)] }; }
      if (!["literal", "choice"].includes(expected.type)) parameters[expected.name] = expected.repeated ? entered.slice(inputIndex).join(" ") : value;
      inputIndex += expected.repeated ? entered.length - inputIndex : 1;
      if (expected.repeated) break;
    }
    if (inputIndex < entered.length) return { status: "invalid", invalid_token_index: inputIndex, consumed_tokens: inputIndex, parsed_parameters: parameters, expected_tokens: [] };
    return { status: "matched", consumed_tokens: inputIndex, parsed_parameters: parameters, expected_tokens: [], invalid_token_index: null };
  }

  const versionParts = (value) => String(value || "").match(/\d+/g)?.map(Number) || [];
  const compareVersion = (left, right) => {
    const a = versionParts(left); const b = versionParts(right); const length = Math.max(a.length, b.length);
    for (let index = 0; index < length; index += 1) { const difference = (a[index] || 0) - (b[index] || 0); if (difference) return difference > 0 ? 1 : -1; }
    return 0;
  };

  class CommandRegistry {
    constructor(commands = [], profile = null) {
      this.commands = commands.map((command) => ({ ...command, grammar: command.grammar || compileGrammar(command.canonical_command), vendor_id: command.vendor_id || command.vendor, compatible_os_ids: command.compatible_os_ids || [], compatible_os_family_ids: command.compatible_os_family_ids || [], compatible_platform_family_ids: command.compatible_platform_family_ids || (command.platform_family && command.platform_family !== "Any" ? [command.platform_family] : []) }));
      this.profile = normaliseProfile(profile || {});
      this.catalog = this.commands.filter((command) => this.availability(command).available);
    }

    setProfile(profile) {
      this.profile = normaliseProfile(profile || {});
      this.catalog = this.commands.filter((command) => this.availability(command).available);
      return this.catalog;
    }

    availability(command, mode = "exec", privilege = "privileged") {
      const profile = normaliseProfile(this.profile || {});
      if (!profile) return { available: true };
      if ((command.vendor_id || command.vendor) !== profile.vendor_id) return { available: false, reason: "wrong_vendor" };
      if (command.compatible_os_ids?.length && !command.compatible_os_ids.includes(profile.operating_system_id)) return { available: false, reason: "wrong_operating_system" };
      if (command.compatible_os_family_ids?.length && !command.compatible_os_family_ids.includes(profile.operating_system_family_id)) return { available: false, reason: "wrong_operating_system_family" };
      if (command.compatible_platform_family_ids?.length && !command.compatible_platform_family_ids.includes(profile.platform_family_id)) return { available: false, reason: "wrong_model" };
      if (command.minimum_version && compareVersion(profile.software_version, command.minimum_version) < 0) return { available: false, reason: "version_too_old" };
      if (command.maximum_version && compareVersion(profile.software_version, command.maximum_version) > 0) return { available: false, reason: "version_too_new" };
      if (command.excluded_versions?.some((version) => compareVersion(profile.software_version, version) === 0)) return { available: false, reason: "excluded_version" };
      if (Array.isArray(command.supported_model_profiles) && command.supported_model_profiles.length && !command.supported_model_profiles.includes(profile.profile_id)) return { available: false, reason: "wrong_model" };
      if (Array.isArray(command.required_capabilities) && command.required_capabilities.some((capability) => !profile.capability_ids.includes(capability))) return { available: false, reason: "capability_missing" };
      if (Array.isArray(command.feature_dependencies) && command.feature_dependencies.some((feature) => !profile.feature_ids.includes(feature))) return { available: false, reason: "feature_disabled" };
      if (Array.isArray(command.license_dependencies) && command.license_dependencies.some((license) => !profile.license_ids.includes(license))) return { available: false, reason: "license_unavailable" };
      if (Array.isArray(command.available_modes) && command.available_modes.length && !command.available_modes.includes(mode)) return { available: false, reason: "wrong_mode" };
      if (command.required_privilege === "enable" && privilege !== "privileged") return { available: false, reason: "insufficient_privilege" };
      return { available: true };
    }

    resolve(text, context = {}) {
      const entered = normalise(text);
      const candidates = this.commands.filter((command) => (command.vendor_id || command.vendor) === this.profile?.vendor_id);
      const parsed = candidates.flatMap((command) => [...new Set([command.canonical_command, ...(command.aliases || [])].map(normalise))].map((syntax) => ({ command, syntax, parsed: parseTokens(command, entered, this.profile, syntax), availability: this.availability(command, context.mode, context.privilege) })));
      const matches = parsed.filter((item) => item.parsed.status === "matched").sort((left, right) => this.rank(right, context, entered) - this.rank(left, context, entered));
      const match = matches[0];
      if (matches.length > 1 && this.rank(matches[0], context, entered) === this.rank(matches[1], context, entered)) return { status: "ambiguous", matches: matches.slice(0, 8).map((item) => item.command), expected_tokens: [] };
      if (match) return match.availability.available ? { status: "matched", command: match.command, entered_alias: normalise(match.command.canonical_command) !== normalise(match.syntax), ...match.parsed } : { status: match.availability.reason, command: match.command, ...match.parsed };
      const incomplete = parsed.filter((item) => item.parsed.status === "incomplete" && item.availability.available);
      if (incomplete.length === 1) return { status: "incomplete", command: incomplete[0].command, ...incomplete[0].parsed };
      if (incomplete.length > 1) return { status: "ambiguous", matches: incomplete.slice(0, 8).map((item) => item.command), expected_tokens: [...new Set(incomplete.flatMap((item) => item.parsed.expected_tokens))] };
      const otherVendor = this.commands.flatMap((command) => [command.canonical_command, ...(command.aliases || [])].map((syntax) => ({ command, parsed: parseTokens(command, entered, null, syntax) }))).filter((item) => item.parsed.status === "matched" && (item.command.vendor_id || item.command.vendor) !== this.profile?.vendor_id).sort((left, right) => this.rank(right, context, entered) - this.rank(left, context, entered))[0];
      if (otherVendor) return { status: "wrong_vendor", command: otherVendor.command, detected_vendor: otherVendor.command.vendor_id || otherVendor.command.vendor, detected_command_id: otherVendor.command.command_id, active_vendor: this.profile?.vendor_id, equivalent_active_vendor_command: this.catalog.find((command) => command.topic === otherVendor.command.topic)?.command_id || null };
      const starts = this.catalog.filter((command) => normalise(command.canonical_command).startsWith(entered));
      if (starts.length > 1) return { status: "ambiguous", matches: starts.slice(0, 8) };
      if (starts.length === 1) return { status: "incomplete", command: starts[0] };
      return { status: "unknown" };
    }

    rank(item, context = {}, entered = "") {
      const canonical = normalise(item.command.canonical_command);
      const alias = normalise(item.syntax);
      const grammar = item.command.grammar || compileGrammar(item.syntax);
      const nodes = grammar.nodes || [];
      const literals = nodes.filter((node) => node.type === "literal").length;
      const parameters = nodes.filter((node) => !["literal", "choice"].includes(node.type)).length;
      return (canonical === entered ? 100000 : 0) + (alias === entered ? 50000 : 0) + (item.availability.available ? 10000 : 0) + ((item.command.available_modes || []).includes(context.mode) ? 1000 : 0) + ((item.command.supported_model_profiles || []).includes(this.profile?.profile_id) ? 500 : 0) + (literals * 20) - parameters;
    }

    help(text = "", context = {}) {
      const value = normalise(text.replace(/\?$/, ""));
      const candidates = this.catalog.flatMap((command) => [command.canonical_command, ...(command.aliases || [])].map((syntax) => ({ command, parsed: parseTokens(command, value, this.profile, syntax) }))).filter((item) => item.parsed.status === "matched" || item.parsed.status === "incomplete");
      const entries = candidates.flatMap((item) => item.parsed.expected_tokens.map((token) => ({ token, token_type: token.startsWith("<") ? "parameter" : "keyword", description: token.startsWith("<") ? `Enter ${token.slice(1, -1)}.` : `Keyword for ${item.command.canonical_command}.`, allowed_range: token.includes("vlan") ? "1-4094" : "", possible_values: token === "<interface>" ? interfaceNames(this.profile) : [], availability: this.availability(item.command, context.mode, context.privilege).available, reason_unavailable: this.availability(item.command, context.mode, context.privilege).reason || "", related_command_ids: [item.command.command_id] })));
      const unique = entries.filter((item, index, all) => all.findIndex((candidate) => candidate.token === item.token) === index).slice(0, 12);
      if (candidates.some((item) => item.parsed.status === "matched")) unique.push({ token: "<cr>", token_type: "execute", description: "Execute command", allowed_range: "", possible_values: [], availability: true, reason_unavailable: "", related_command_ids: candidates.filter((item) => item.parsed.status === "matched").map((item) => item.command.command_id) });
      return unique;
    }

    complete(text = "") {
      const prefix = String(text || "");
      const parts = prefix.trim().split(/\s+/).filter(Boolean);
      const current = parts.pop() || "";
      const candidates = this.help(prefix).filter((item) => item.token !== "<cr>").flatMap((item) => item.possible_values?.length ? item.possible_values : item.token.startsWith("<") ? [] : [item.token]).filter((value) => normalise(value).startsWith(normalise(current)));
      if (!candidates.length) return null;
      const common = candidates.reduce((prefixValue, value) => { let index = 0; while (index < prefixValue.length && index < value.length && prefixValue[index].toLowerCase() === value[index].toLowerCase()) index += 1; return prefixValue.slice(0, index); });
      if (!common) return { status: "ambiguous", candidates };
      return `${parts.join(" ")}${parts.length ? " " : ""}${common}`;
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
      this.profile = normaliseProfile(profile);
      const restored = this.migrateSnapshot(saved);
      this.eventLog = restored?.eventLog || [];
      this.running = normaliseState(restored?.running || this.defaultState(this.profile), this.profile);
      this.startup = normaliseState(restored?.startup || clone(this.running), this.profile);
      this.baseline = normaliseState(restored?.baseline || clone(this.running), this.profile);
      this.factoryBaseline = normaliseState(restored?.factoryBaseline || clone(this.baseline), this.profile);
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
    selectedInterface() { return this.running.session.selected_interface; }
    selectInterface(name) { if (!this.interface(name)) return false; this.running.session.selected_interface = name; this.persist(); return true; }
    terminalHistory() { return this.running.session.terminal_history || []; }
    storeTerminal(history, commands) { this.running.session.terminal_history = clone(history || []); this.running.session.command_history = clone(commands || []); this.persist(); }
    verification(name) { return this.running.session.verification?.[name] || { verified: false }; }
    verifyInterfaceDescription(name, command, output) {
      const port = this.interface(name);
      const expected = `description ${port?.description || ""}`.trim();
      const passed = Boolean(port?.description) && normalise(command) === normalise(`show running-config interface ${name}`) && String(output || "").includes(name) && String(output || "").includes(expected);
      this.running.session.verification[name] = { verified: passed, command, output, timestamp: new Date().toISOString() };
      this.record({ command_id: "verify-interface-description", canonical_command: command, entered_text: command, success: passed, state_before: {}, state_after: {}, verification_result: passed ? "passed" : "failed" });
      this.persist();
      return passed;
    }
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
    getByPath(path, source = this.running) { return String(path || "").split(".").filter(Boolean).reduce((value, key) => value == null ? undefined : value[key], source); }
    setByPath(path, value, commandId = "inspector") { const keys = String(path || "").split(".").filter(Boolean); if (!keys.length) return false; const before = this.getByPath(path); let target = this.running; keys.slice(0, -1).forEach((key) => { target[key] ||= {}; target = target[key]; }); target[keys.at(-1)] = value; this.change(path, before, value, commandId); return true; }
    deleteByPath(path, commandId = "inspector") { const keys = String(path || "").split(".").filter(Boolean); if (!keys.length) return false; const before = this.getByPath(path); let target = this.running; for (const key of keys.slice(0, -1)) { target = target?.[key]; if (target == null) return false; } if (!(keys.at(-1) in target)) return false; delete target[keys.at(-1)]; this.change(path, before, undefined, commandId); return true; }
    save(commandId = "save") {
      const before = clone(this.running);
      const cleanRunning = cleanSnapshot(this.running);
      this.startup = clone(cleanRunning);
      this.baseline = clone(cleanRunning);
      this.running.unsaved_changes = [];
      this.record({ command_id: commandId, canonical_command: commandId, entered_text: commandId, success: true, state_before: before, state_after: clone(this.running), save_result: "saved" });
      this.persist();
    }
    rollbackUnsaved() {
      const before = clone(this.running);
      const session = clone(this.running.session || {});
      this.running = clone(this.startup);
      this.running.session = session;
      this.running.unsaved_changes = [];
      this.record({ command_id: "rollback-unsaved", canonical_command: "rollback unsaved", entered_text: "rollback unsaved", success: true, state_before: before, state_after: clone(this.running), safety_result: "rollback_unsaved" });
      this.persist();
    }
    resetTraining() { const before = clone(this.running); this.running = clone(this.factoryBaseline); this.running.unsaved_changes = []; this.record({ command_id: "reset-training", canonical_command: "reset training switch", entered_text: "reset training switch", success: true, state_before: before, state_after: clone(this.running), safety_result: "reset_training" }); this.persist(); }
    rollbackChange(index) { const change = this.changes()[index]; if (!change) return false; this.setByPath(change.field, clone(change.before), "rollback-one-change"); this.running.unsaved_changes.splice(index, 1); this.record({ command_id: "rollback-one-change", canonical_command: "rollback one change", entered_text: change.field, success: true, changed_fields: [change.field], safety_result: "rollback_one_change" }); this.persist(); return true; }
    rollback() { this.rollbackUnsaved(); }
    record(event) {
      const required = { event_id: crypto.randomUUID?.() || `${Date.now()}-${this.eventLog.length}`, timestamp: new Date().toISOString(), command_id: "unclassified", canonical_command: "", entered_text: "", entered_alias: false, parsed_parameters: {}, vendor: this.profile.vendor, profile_id: this.profile.profile_id, operating_system_version: this.profile.default_version, mode_before: "exec", mode_after: "exec", privilege_before: "privileged", privilege_after: "privileged", success: false, failure_type: "", state_before: {}, state_after: {}, changed_fields: [], output_id: "", route_id: "", route_step: null, lesson_id: "", safety_result: "", verification_result: "", save_result: "" };
      const next = { ...required, ...event };
      if (!next.command_id || !next.profile_id || typeof next.success !== "boolean" || !next.vendor || !next.event_id || !next.timestamp || !Array.isArray(next.changed_fields) || typeof next.parsed_parameters !== "object" || typeof next.state_before !== "object" || typeof next.state_after !== "object") throw new Error("Invalid local command event.");
      this.eventLog.push(next); if (this.eventLog.length > 300) this.eventLog.splice(0, this.eventLog.length - 300);
    }
    migrateSnapshot(saved) {
      if (!saved || typeof saved !== "object") return null;
      if (saved.profile_id && saved.profile_id !== this.profile.profile_id) return null;
      return { ...saved, schema_version: RUNTIME_SCHEMA_VERSION, command_catalog_version: saved.command_catalog_version || "legacy" };
    }
    snapshot() { return { schema_version: RUNTIME_SCHEMA_VERSION, command_catalog_version: COMMAND_CATALOG_VERSION, profile_id: this.profile.profile_id, running: this.running, startup: this.startup, baseline: this.baseline, factoryBaseline: this.factoryBaseline, eventLog: this.eventLog }; }
    persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.snapshot())); }
  }

  class ProfileRegistry {
    constructor(profiles = []) { this.profiles = profiles.map(normaliseProfile); }
    get(id) { return this.profiles.find((profile) => profile.profile_id === id) || this.profiles[0] || null; }
    byVendor(vendor) { return this.profiles.filter((profile) => profile.vendor === vendor); }
  }

  window.CommandDoctorSwitchRuntime = { CommandRegistry, SharedSwitchState, ProfileRegistry, STORAGE_KEY, RUNTIME_SCHEMA_VERSION, COMMAND_CATALOG_VERSION, normalise, clone, normaliseProfile, compileGrammar, parseTokens, validateParameterDetail, compareVersion };
})();

