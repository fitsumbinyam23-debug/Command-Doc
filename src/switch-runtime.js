"use strict";

(() => {
  const normalise = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  const clone = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const STORAGE_KEY = "command-doctor.switch-runtime.v1";
  const RUNTIME_SCHEMA_VERSION = 5;
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
  const normaliseSupportLevel = (value) => SUPPORT_LEVELS[normalise(value).replace(/-/g, "_")] || "unsupported_for_profile";
  const groupBy = (items, key) => items.reduce((groups, item) => { const name = key(item); (groups[name] ||= []).push(item); return groups; }, {});
  const cleanSnapshot = (value) => { const next = clone(value); delete next.unsaved_changes; return next; };
  const MAX_VERIFICATION_RECORDS = 200;
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
    next.unsaved_changes = (next.unsaved_changes || []).map((change) => {
      const field = String(change?.field || "");
      const first = field.split(".")[0];
      // Lab 45 stored interface fields without their SharedSwitchState root.
      const fullPath = field.startsWith("interfaces.") || !next.interfaces[first] ? field : `interfaces.${field}`;
      return {
        ...change,
        field: fullPath,
        transaction_id: change.transaction_id || change.command_id || "migrated-change",
        revision_created: Number.isInteger(change.revision_created) ? change.revision_created : Number(next.session?.revision || 0),
        verification_required: change.verification_required !== false,
        verification_status: change.verification_status || "required",
        verification_record_id: change.verification_record_id || ""
      };
    });
    next.session ||= {};
    next.session.selected_interface ||= Object.keys(next.interfaces)[0] || "";
    next.session.terminal_history ||= [];
    next.session.command_history ||= [];
    next.session.verification ||= {};
    next.session.verification_records ||= {};
    next.session.revision = Number.isInteger(next.session.revision) ? next.session.revision : 0;
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

  // Generated catalog files and the small runtime handler catalog do not always
  // express modes in the same form. Normalize both before any parser index or
  // duplicate decision is made so one effective grammar has one candidate.
  const normaliseCommand = (raw = {}) => {
    const canonical_command = String(raw.canonical_command || raw.command || "").trim();
    const vendor_id = raw.vendor_id || raw.vendor || "";
    const explicitModes = Array.isArray(raw.available_modes) ? raw.available_modes.filter(Boolean) : [];
    const available_modes = explicitModes.length
      ? [...new Set(explicitModes.map(normalise))]
      : (/^(description|switchport|port access|port link-type|vlan access|shutdown|no shutdown|undo shutdown)\b/i.test(canonical_command) ? ["interface"]
        : (/^(hostname|sysname|interface|vlan|switch \S+ priority|irf member)\b/i.test(canonical_command) ? ["config"] : []));
    const aliases = [...new Set((raw.aliases || []).map(String).filter(Boolean))];
    const compatible_os_ids = [...new Set(raw.compatible_os_ids || [])].sort();
    const compatible_os_family_ids = [...new Set(raw.compatible_os_family_ids || [])].sort();
    const compatible_platform_family_ids = [...new Set(raw.compatible_platform_family_ids || (raw.platform_family && raw.platform_family !== "Any" ? [raw.platform_family] : []))].sort();
    const supported_model_profiles = [...new Set(raw.supported_model_profiles || [])].sort();
    const required_capabilities = [...new Set(raw.required_capabilities || [])].sort();
    const feature_dependencies = [...new Set(raw.feature_dependencies || [])].sort();
    const license_dependencies = [...new Set(raw.license_dependencies || [])].sort();
    const required_privilege = raw.required_privilege || (available_modes.length || /^(show|display|copy|write|save|rollback|end|return|configure terminal|system-view)\b/i.test(canonical_command) ? "enable" : "user");
    return {
      ...raw,
      command_id: raw.command_id || `generated-${vendor_id}-${normalise(canonical_command).replace(/[^a-z0-9]+/g, "-")}`,
      vendor_id,
      vendor: vendor_id,
      canonical_command,
      aliases,
      grammar: raw.grammar || compileGrammar(canonical_command),
      available_modes,
      required_privilege,
      compatible_os_ids,
      compatible_os_family_ids,
      compatible_platform_family_ids,
      supported_model_profiles,
      required_capabilities,
      feature_dependencies,
      license_dependencies,
      simulator_support: normaliseSupportLevel(raw.simulator_support || raw.support_level),
      support_level: normaliseSupportLevel(raw.simulator_support || raw.support_level),
      handler_id: raw.handler_id || (/^runtime[-_]/.test(raw.command_id || "") ? raw.command_id : ""),
      metadata_source: raw.metadata_source || (/^runtime[-_]/.test(raw.command_id || "") ? "runtime" : (explicitModes.length ? "catalog" : "derived")),
      priority: Number(raw.priority || (/^runtime[-_]/.test(raw.command_id || "") ? 100 : 0))
    };
  };
  const commandIdentity = (command) => [
    command.vendor_id,
    normalise(command.canonical_command),
    command.available_modes.join(","),
    command.required_privilege,
    command.compatible_os_ids.join(","),
    command.compatible_os_family_ids.join(","),
    command.compatible_platform_family_ids.join(","),
    command.supported_model_profiles.join(","),
    command.minimum_version || "",
    command.maximum_version || "",
    (command.excluded_versions || []).join(","),
    command.required_capabilities.join(","),
    command.feature_dependencies.join(","),
    command.license_dependencies.join(",")
  ].join("|");
  const mergeCommands = (left, right) => {
    const runtime = [left, right].find((command) => command.handler_id);
    const catalog = [left, right].find((command) => !command.handler_id);
    const primary = catalog || (left.priority >= right.priority ? left : right);
    return {
      ...primary,
      aliases: [...new Set([...left.aliases, ...right.aliases])],
      handler_id: runtime?.handler_id || primary.handler_id || "",
      handler_identity: runtime?.handler_id || primary.handler_id || "",
      metadata_source: runtime && catalog ? "merged" : primary.metadata_source,
      merged_command_ids: [...new Set([...(primary.merged_command_ids || []), left.command_id, right.command_id])]
    };
  };

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
      const commandBySignature = new Map();
      const mergeReport = { duplicates_detected: 0, records_merged: 0, aliases_combined: 0, handler_chosen: [], command_ids_retained: [], conflicts: [] };
      commands.map(normaliseCommand).forEach((command) => {
        const signature = commandIdentity(command);
        const existing = commandBySignature.get(signature);
        if (!existing) {
          commandBySignature.set(signature, command);
          return;
        }
        const merged = mergeCommands(existing, command);
        mergeReport.duplicates_detected += 1;
        mergeReport.records_merged += 1;
        mergeReport.aliases_combined += merged.aliases.length - Math.max(existing.aliases.length, command.aliases.length);
        mergeReport.handler_chosen.push({ identity: signature, handler_id: merged.handler_id || "" });
        mergeReport.command_ids_retained.push(merged.command_id);
        commandBySignature.set(signature, merged);
      });
      this.commands = [...commandBySignature.values()];
      this.mergeReport = mergeReport;
      this.profile = normaliseProfile(profile || {});
      // Profile filtering must not depend on the currently selected CLI mode.
      this.catalog = this.commands.filter((command) => this.profileAvailability(command).available);
    }

    setProfile(profile) {
      this.profile = normaliseProfile(profile || {});
      this.catalog = this.commands.filter((command) => this.profileAvailability(command).available);
      return this.catalog;
    }

    profileAvailability(command) {
      const profile = normaliseProfile(this.profile || {});
      if (!profile) return { available: true };
      if ((command.vendor_id || command.vendor) !== profile.vendor_id) return { available: false, reason: "wrong_vendor" };
      if (command.compatible_os_ids?.length && !command.compatible_os_ids.includes(profile.operating_system_id)) return { available: false, reason: "wrong_operating_system" };
      if (command.compatible_os_family_ids?.length && !command.compatible_os_family_ids.includes(profile.operating_system_family_id)) return { available: false, reason: "wrong_operating_system_family" };
      if (command.compatible_platform_family_ids?.length && !command.compatible_platform_family_ids.includes(profile.platform_family_id)) return { available: false, reason: "wrong_model" };
      if (command.minimum_version && compareVersion(profile.software_version, command.minimum_version) < 0) return { available: false, reason: "wrong_version" };
      if (command.maximum_version && compareVersion(profile.software_version, command.maximum_version) > 0) return { available: false, reason: "wrong_version" };
      if (command.excluded_versions?.some((version) => compareVersion(profile.software_version, version) === 0)) return { available: false, reason: "wrong_version" };
      if (Array.isArray(command.supported_model_profiles) && command.supported_model_profiles.length && !command.supported_model_profiles.includes(profile.profile_id)) return { available: false, reason: "wrong_model" };
      if (Array.isArray(command.required_capabilities) && command.required_capabilities.some((capability) => !profile.capability_ids.includes(capability))) return { available: false, reason: "capability_missing" };
      if (Array.isArray(command.feature_dependencies) && command.feature_dependencies.some((feature) => !profile.feature_ids.includes(feature))) return { available: false, reason: "feature_disabled" };
      if (Array.isArray(command.license_dependencies) && command.license_dependencies.some((license) => !profile.license_ids.includes(license))) return { available: false, reason: "license_unavailable" };
      return { available: true };
    }

    availability(command, mode = "exec", privilege = "privileged") {
      const profileResult = this.profileAvailability(command);
      if (!profileResult.available) return profileResult;
      if (Array.isArray(command.available_modes) && command.available_modes.length && !command.available_modes.includes(mode)) return { available: false, reason: "wrong_mode" };
      if (command.required_privilege === "enable" && privilege !== "privileged") return { available: false, reason: "insufficient_privilege" };
      return { available: true };
    }

    resolve(text, context = {}) {
      const entered = normalise(text);
      const candidates = this.commands.filter((command) => (command.vendor_id || command.vendor) === this.profile?.vendor_id);
      const parsed = candidates.flatMap((command) => [...new Set([command.canonical_command, ...(command.aliases || [])].map(normalise))].map((syntax) => ({ command, syntax, parsed: parseTokens(command, entered, this.profile, syntax), availability: this.availability(command, context.mode, context.privilege) })));
      // An exact command that is valid only in another mode must not be hidden by
      // a broader duplicate grammar that happens to match in the current mode.
      const exactModeBlocked = parsed.filter((item) => item.parsed.status === "matched" && item.availability.reason === "wrong_mode")
        .sort((left, right) => (right.command.grammar?.nodes?.filter((node) => node.type === "literal").length || 0) - (left.command.grammar?.nodes?.filter((node) => node.type === "literal").length || 0))[0];
      if (exactModeBlocked) return { ...exactModeBlocked.parsed, status: "wrong_mode", command: exactModeBlocked.command };
      const matches = parsed.filter((item) => item.parsed.status === "matched").sort((left, right) => this.rank(right, context, entered) - this.rank(left, context, entered));
      const match = matches[0];
      if (matches.length > 1 && this.rank(matches[0], context, entered) === this.rank(matches[1], context, entered)) return { status: "ambiguous", matches: matches.slice(0, 8).map((item) => item.command), expected_tokens: [] };
      if (match) return match.availability.available ? { ...match.parsed, status: "matched", command: match.command, entered_alias: normalise(match.command.canonical_command) !== normalise(match.syntax) } : { ...match.parsed, status: match.availability.reason, command: match.command };
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
      const available = item.availability?.available !== false;
      return (canonical === entered ? 100000 : 0) + (alias === entered ? 50000 : 0) + (available ? 10000 : 0) + ((item.command.available_modes || []).includes(context.mode) ? 1000 : 0) + ((item.command.supported_model_profiles || []).includes(this.profile?.profile_id) ? 500 : 0) + (literals * 20) - parameters;
    }

    help(text = "", context = {}) {
      const value = normalise(text.replace(/\?$/, ""));
      const candidates = this.catalog.flatMap((command) => [command.canonical_command, ...(command.aliases || [])].map((syntax) => ({ command, parsed: parseTokens(command, value, this.profile, syntax) }))).filter((item) => item.parsed.status === "matched" || item.parsed.status === "incomplete");
      const toEntry = (item, token) => ({ token, token_type: token.startsWith("<") ? "parameter" : "keyword", description: token.startsWith("<") ? `Enter ${token.slice(1, -1)}.` : `Keyword for ${item.command.canonical_command}.`, allowed_range: token.includes("vlan") ? "1-4094" : "", possible_values: token === "<interface>" ? interfaceNames(this.profile) : [], availability: this.availability(item.command, context.mode, context.privilege).available, reason_unavailable: this.availability(item.command, context.mode, context.privilege).reason || "", related_command_ids: [item.command.command_id] });
      const parts = value.split(/\s+/).filter(Boolean);
      const partial = parts.at(-1) || "";
      const prior = parts.slice(0, -1).join(" ");
      const prefixEntries = partial
        ? this.catalog.flatMap((command) => [command.canonical_command, ...(command.aliases || [])].map((syntax) => ({ command, parsed: parseTokens(command, prior, this.profile, syntax) })))
          .filter((item) => item.parsed.status === "incomplete")
          .flatMap((item) => item.parsed.expected_tokens.filter((token) => !token.startsWith("<") && normalise(token).startsWith(partial)).map((token) => toEntry(item, token)))
        : [];
      const entries = candidates.flatMap((item) => item.parsed.expected_tokens.map((token) => toEntry(item, token))).concat(prefixEntries);
      const unique = entries.filter((item, index, all) => all.findIndex((candidate) => candidate.token === item.token) === index).slice(0, 12);
      if (candidates.some((item) => item.parsed.status === "matched")) unique.push({ token: "<cr>", token_type: "execute", description: "Execute command", allowed_range: "", possible_values: [], availability: true, reason_unavailable: "", related_command_ids: candidates.filter((item) => item.parsed.status === "matched").map((item) => item.command.command_id) });
      return unique;
    }

    complete(text = "", context = {}) {
      const input = String(text || "");
      const endsWithSpace = /\s$/.test(input);
      const inputParts = input.trim().split(/\s+/).filter(Boolean);
      const current = endsWithSpace ? "" : inputParts.at(-1) || "";
      const priorParts = endsWithSpace ? inputParts : inputParts.slice(0, -1);
      const uniqueValues = (values) => [...new Set(values.map((value) => String(value || "")).filter(Boolean))];
      const valuesFor = (baseText, tokenPrefix) => uniqueValues(this.catalog
        .filter((command) => this.availability(command, context.mode, context.privilege).available)
        .flatMap((command) => [command.canonical_command, ...(command.aliases || [])].map((syntax) => parseTokens(command, baseText, this.profile, syntax)))
        .filter((parsed) => parsed.status === "incomplete")
        .flatMap((parsed) => parsed.expected_tokens.flatMap((token) => token === "<interface>" ? interfaceNames(this.profile) : token.startsWith("<") ? [] : token.split("|")))
        .filter((value) => normalise(value).startsWith(normalise(tokenPrefix))));
      const completeFrom = (baseParts, tokenPrefix, values) => {
        const candidates = uniqueValues(values);
        if (!candidates.length) return null;
        const common = candidates.reduce((prefixValue, value) => { let index = 0; while (index < prefixValue.length && index < value.length && prefixValue[index].toLowerCase() === value[index].toLowerCase()) index += 1; return prefixValue.slice(0, index); });
        if (common && normalise(common) !== normalise(tokenPrefix) && normalise(common).startsWith(normalise(tokenPrefix))) return `${baseParts.join(" ")}${baseParts.length ? " " : ""}${common}`;
        return { status: "ambiguous", candidates, current_token: tokenPrefix, common_prefix: common || "" };
      };
      const primary = completeFrom(priorParts, current, valuesFor(priorParts.join(" "), current));
      if (typeof primary === "string" || endsWithSpace) return primary;
      const nextToken = completeFrom(inputParts, "", valuesFor(inputParts.join(" "), ""));
      return nextToken || primary;
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
    constructor(profile, saved = null, catalogMetadata = {}) {
      this.profile = normaliseProfile(profile);
      this.catalogMetadata = {
        runtime_schema_version: RUNTIME_SCHEMA_VERSION,
        command_catalog_version: catalogMetadata.command_catalog_version || "local",
        profile_catalog_version: catalogMetadata.profile_catalog_version || "local",
        active_build_version: catalogMetadata.active_build_version || "local"
      };
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
    storeTerminal(history, commands) {
      const compact = (items, limit, maxLength) => (items || []).slice(-limit).map((item) => String(item || "").slice(-maxLength));
      this.running.session.terminal_history = compact(history, 120, 2400);
      this.running.session.command_history = compact(commands, 120, 320);
      this.persist();
    }
    verificationPolicies() {
      return [{
        policy_id: "interface-description-cisco-running-config",
        vendor_ids: ["cisco_ios", "aruba_cx"],
        command_patterns: ["show running-config interface <interface>"],
        object_type: "interface",
        field_pattern: "interfaces.<interface>.description",
        required_evidence: "interface name and exact description line",
        invalidating_fields: ["interfaces.<interface>.description"],
        support_level: "full_state_simulation",
        authorizes_save: true
      }, {
        policy_id: "interface-description-comware-running-config",
        vendor_ids: ["hp_comware"],
        command_patterns: ["display current-configuration interface <interface>"],
        object_type: "interface",
        field_pattern: "interfaces.<interface>.description",
        required_evidence: "interface name and exact description line",
        invalidating_fields: ["interfaces.<interface>.description"],
        support_level: "full_state_simulation",
        authorizes_save: true
      }];
    }
    verificationTargetForCommand(command) {
      const entered = normalise(command);
      const patterns = [
        { pattern: /^show running-config interface\s+(\S+)$/i, syntax: "show running-config interface <interface>" },
        { pattern: /^display current-configuration interface\s+(\S+)$/i, syntax: "display current-configuration interface <interface>" }
      ];
      const match = patterns.map((candidate) => ({ ...candidate, found: String(command || "").match(candidate.pattern) })).find((candidate) => candidate.found);
      if (!match) return null;
      const policy = this.verificationPolicies().find((item) => item.vendor_ids.includes(this.profile.vendor) && item.command_patterns.includes(match.syntax));
      return policy ? { policy, interface_name: match.found[1], command: entered } : null;
    }
    verificationPolicyForChange(change) {
      const field = String(change?.field || "");
      const description = field.match(/^interfaces\.([^\.]+)\.description$/);
      if (description) {
        const policy = this.verificationPolicies().find((item) => item.vendor_ids.includes(this.profile.vendor));
        return policy ? { ...policy, object_id: description[1], verified_field_path: field } : { policy_id: "unverified-pending-change", authorizes_save: false, verified_field_path: field };
      }
      return { policy_id: "unverified-pending-change", object_type: field.startsWith("interfaces.") ? "interface" : "system", object_id: field.split(".")[1] || "system", verified_field_path: field, required_evidence: "No current verification policy proves this field.", invalidating_fields: [field], support_level: "unsupported_for_profile", authorizes_save: false };
    }
    verificationRecords() { return Object.values(this.running.session.verification_records || {}); }
    verification(name) {
      const records = this.verificationRecords().filter((record) => record.object_id === name);
      return records.at(-1) || this.running.session.verification?.[name] || { verified: false, covered_change_ids: [] };
    }
    revision() { return Number(this.running.session.revision || 0); }
    bumpRevision() { this.running.session.revision = this.revision() + 1; return this.running.session.revision; }
    invalidateVerificationForFields(fields = []) {
      const changed = new Set(fields.map(String));
      this.verificationRecords().forEach((record) => {
        if ((record.verified_field_paths || []).some((field) => changed.has(field))) {
          record.result = "stale";
          record.failure_reason = "A field proved by this verification changed.";
          record.covered_change_ids = [];
        }
      });
      this.changes().forEach((change) => {
        if (changed.has(change.field)) {
          change.verification_status = "required";
          change.verification_record_id = "";
        }
      });
    }
    invalidateVerification(name = "") {
      if (!name) {
        this.running.session.verification = {};
        this.running.session.verification_records = {};
        return;
      }
      this.invalidateVerificationForFields(Object.keys(this.interface(name) || {}).map((field) => `interfaces.${name}.${field}`));
    }
    isVerificationRecordCurrent(record) {
      if (!record || record.result !== "passed" || !record.policy_id || !record.output_evidence) return false;
      if (record.profile_id !== this.profile.profile_id || record.vendor !== this.profile.vendor) return false;
      const policy = this.verificationPolicies().find((item) => item.policy_id === record.policy_id);
      if (!policy?.authorizes_save) return false;
      return (record.covered_change_ids || []).every((changeId) => {
        const change = this.changes().find((item) => item.change_id === changeId);
        return Boolean(change && record.verified_field_paths?.includes(change.field) && record.values_proved?.[change.field] === change.after);
      });
    }
    isVerificationCurrent(name) {
      const verification = this.verification(name);
      const pending = this.changes().filter((change) => String(change.field || "").startsWith(`interfaces.${name}.`));
      return Boolean(pending.length && pending.every((change) => this.verificationRecords().some((record) => this.isVerificationRecordCurrent(record) && record.covered_change_ids?.includes(change.change_id))));
    }
    verifyInterfaceDescription(name, command, output, commandMetadata = {}) {
      const port = this.interface(name);
      const expected = `description ${port?.description || ""}`.trim();
      const target = this.verificationTargetForCommand(command);
      const passed = Boolean(port?.description) && target?.interface_name === name && String(output || "").includes(name) && normalise(output).includes(normalise(expected));
      const policy = target?.policy || this.verificationPolicyForChange({ field: `interfaces.${name}.description` });
      const field = `interfaces.${name}.description`;
      const covered = this.changes().filter((change) => change.field === field).map((change) => change.change_id);
      const verificationId = `verification-${crypto.randomUUID?.() || Date.now()}-${this.verificationRecords().length}`;
      const verification = { verification_id: verificationId, policy_id: policy.policy_id, vendor: this.profile.vendor, profile_id: this.profile.profile_id, object_type: policy.object_type, object_id: name, command_id: commandMetadata.command_id || "verify-interface-description", handler_id: commandMetadata.handler_id || "", canonical_command: commandMetadata.canonical_command || command, entered_command: command, output_evidence: String(output || "").slice(-2400), state_revision: this.revision(), verified_field_paths: passed ? [field] : [], covered_change_ids: passed ? covered : [], values_proved: passed ? { [field]: port?.description || "" } : {}, timestamp: new Date().toISOString(), result: passed ? "passed" : "failed", failure_reason: passed ? "" : "The required interface description evidence was not present.", support_level: policy.support_level, verified: passed, command, output: String(output || "").slice(-2400), expected_description: port?.description || "" };
      this.running.session.verification_records ||= {};
      this.running.session.verification_records[verification.verification_id] = verification;
      if (passed) this.changes().filter((change) => covered.includes(change.change_id)).forEach((change) => {
        change.verification_status = "verified";
        change.verification_record_id = verification.verification_id;
      });
      this.running.session.verification ||= {};
      this.running.session.verification[name] = verification;
      this.compactVerificationRecords();
      this.persist();
      return passed;
    }
    compactVerificationRecords() {
      const records = this.running.session.verification_records || {};
      const protectedIds = new Set(this.changes().map((change) => change.verification_record_id).filter(Boolean));
      Object.values(records).forEach((record) => {
        if ((record.covered_change_ids || []).some((changeId) => this.changes().some((change) => change.change_id === changeId))) protectedIds.add(record.verification_id);
      });
      const removable = Object.values(records).filter((record) => !protectedIds.has(record.verification_id)).sort((left, right) => String(left.timestamp).localeCompare(String(right.timestamp)));
      while (Object.keys(records).length > MAX_VERIFICATION_RECORDS && removable.length) delete records[removable.shift().verification_id];
      Object.entries(this.running.session.verification || {}).forEach(([name, record]) => {
        if (record?.verification_id && !records[record.verification_id]) delete this.running.session.verification[name];
      });
    }
    change(field, before, after, commandId = "inspector") {
      if (before === after) return;
      const existing = [...this.running.unsaved_changes].reverse().find((change) => change.field === field);
      if (existing) {
        if (existing.before === after) {
          this.running.unsaved_changes.splice(this.running.unsaved_changes.indexOf(existing), 1);
          return;
        }
        existing.after = after;
        existing.command_id = commandId;
        existing.transaction_id = commandId;
        existing.timestamp = new Date().toISOString();
        existing.verification_status = "required";
        existing.verification_record_id = "";
        return;
      }
      this.running.unsaved_changes.push({ change_id: `change-${crypto.randomUUID?.() || Date.now()}-${this.eventLog.length}-${this.running.unsaved_changes.length}`, transaction_id: commandId, field, before, after, revision_created: this.revision() + 1, verification_required: true, verification_status: "required", verification_record_id: "", timestamp: new Date().toISOString(), command_id: commandId, verified: false });
    }
    updateInterface(name, updates, commandId = "inspector", options = {}) {
      const port = this.interface(name);
      if (!port) return false;
      let changed = false;
      const changedFields = [];
      Object.entries(updates).forEach(([key, value]) => {
        if (port[key] === value) return;
        if (options.recordChange !== false) this.change(`interfaces.${name}.${key}`, port[key], value, commandId);
        port[key] = value;
        changed = true;
        changedFields.push(`interfaces.${name}.${key}`);
      });
      if (changed && options.bumpRevision !== false) {
        this.bumpRevision();
        this.invalidateVerificationForFields(changedFields);
      }
      return true;
    }
    updateHostname(hostname, commandId = "hostname", options = {}) {
      if (this.running.system.hostname === hostname) return false;
      if (options.recordChange !== false) this.change("system.hostname", this.running.system.hostname, hostname, commandId);
      this.running.system.hostname = hostname;
      if (options.bumpRevision !== false) { this.bumpRevision(); this.invalidateVerificationForFields(["system.hostname"]); }
      return true;
    }
    getByPath(path, source = this.running) { return String(path || "").split(".").filter(Boolean).reduce((value, key) => value == null ? undefined : value[key], source); }
    setByPath(path, value, commandId = "inspector", options = {}) {
      const keys = String(path || "").split(".").filter(Boolean);
      if (!keys.length) return false;
      const before = this.getByPath(path);
      let target = this.running;
      keys.slice(0, -1).forEach((key) => { target[key] ||= {}; target = target[key]; });
      target[keys.at(-1)] = value;
      if (options.recordChange !== false) this.change(path, before, value, commandId);
      if (before !== value && options.bumpRevision !== false) {
        this.bumpRevision();
        this.invalidateVerificationForFields([path]);
      }
      return true;
    }
    deleteByPath(path, commandId = "inspector") { const keys = String(path || "").split(".").filter(Boolean); if (!keys.length) return false; const before = this.getByPath(path); let target = this.running; for (const key of keys.slice(0, -1)) { target = target?.[key]; if (target == null) return false; } if (!(keys.at(-1) in target)) return false; delete target[keys.at(-1)]; this.change(path, before, undefined, commandId); return true; }
    canSave() {
      const changes = this.changes();
      if (!changes.length) return { ok: true, uncovered: [], uncovered_change_ids: [], uncovered_fields: [], required_policy_ids: [] };
      const uncovered = changes.filter((change) => !this.verificationRecords().some((record) => this.isVerificationRecordCurrent(record) && record.covered_change_ids?.includes(change.change_id)));
      return { ok: !uncovered.length, uncovered, uncovered_change_ids: uncovered.map((change) => change.change_id), uncovered_fields: uncovered.map((change) => change.field), required_policy_ids: [...new Set(uncovered.map((change) => this.verificationPolicyForChange(change).policy_id))] };
    }
    save(commandId = "save", event = {}) {
      const eligibility = this.canSave();
      if (!eligibility.ok) {
        const message = `Save blocked: verify ${eligibility.uncovered_fields.join(", ")} before saving.`;
        this.record({ command_id: commandId, canonical_command: event.canonical_command || commandId, entered_text: event.entered_text || commandId, entered_alias: Boolean(event.entered_alias), parsed_parameters: event.parsed_parameters || {}, handler_id: event.handler_id || "", mode_before: event.mode_before || "exec", mode_after: event.mode_after || "exec", success: false, failure_type: "verification_required", changed_fields: [], safety_result: "save_rejected", save_result: "rejected" });
        this.persist();
        return { ok: false, saved: false, ...eligibility, message };
      }
      const cleanRunning = cleanSnapshot(this.running);
      this.startup = clone(cleanRunning);
      this.baseline = clone(cleanRunning);
      this.running.unsaved_changes = [];
      this.record({ command_id: commandId, canonical_command: event.canonical_command || commandId, entered_text: event.entered_text || commandId, entered_alias: Boolean(event.entered_alias), parsed_parameters: event.parsed_parameters || {}, handler_id: event.handler_id || "", mode_before: event.mode_before || "exec", mode_after: event.mode_after || "exec", success: true, changed_fields: [], save_result: "saved" });
      this.persist();
      return { ok: true, saved: true, uncovered_change_ids: [], uncovered_fields: [], required_policy_ids: [], message: "Local startup configuration updated from verified running state." };
    }
    rollbackUnsaved() {
      const session = clone(this.running.session || {});
      this.running = clone(this.startup);
      this.running.session = session;
      this.running.unsaved_changes = [];
      this.bumpRevision();
      this.invalidateVerification();
      this.record({ command_id: "rollback-unsaved", canonical_command: "rollback unsaved", entered_text: "rollback unsaved", success: true, safety_result: "rollback_unsaved" });
      this.persist();
    }
    resetTraining() { this.running = clone(this.factoryBaseline); this.running.unsaved_changes = []; this.bumpRevision(); this.invalidateVerification(); this.record({ command_id: "reset-training", canonical_command: "reset training switch", entered_text: "reset training switch", success: true, safety_result: "reset_training" }); this.persist(); }
    rollbackChange(index) {
      const change = this.changes()[index];
      if (!change) return false;
      this.setByPath(change.field, clone(change.before), "rollback-one-change", { recordChange: false, bumpRevision: false });
      this.running.unsaved_changes.splice(index, 1);
      this.bumpRevision();
      this.verificationRecords().forEach((verification) => {
        verification.covered_change_ids = (verification.covered_change_ids || []).filter((changeId) => changeId !== change.change_id);
      });
      this.record({ command_id: "rollback-one-change", canonical_command: "rollback one change", entered_text: change.field, success: true, changed_fields: [change.field], safety_result: "rollback_one_change" });
      this.persist();
      return true;
    }
    rollback() { this.rollbackUnsaved(); }
    record(event) {
      const required = { event_id: crypto.randomUUID?.() || `${Date.now()}-${this.eventLog.length}`, timestamp: new Date().toISOString(), command_id: "unclassified", handler_id: "", canonical_command: "", entered_text: "", entered_alias: false, parsed_parameters: {}, vendor: this.profile.vendor, profile_id: this.profile.profile_id, operating_system_version: this.profile.default_version, mode_before: "exec", mode_after: "exec", privilege_before: "privileged", privilege_after: "privileged", success: false, failure_type: "", changed_fields: [], output_id: "", route_id: "", route_step: null, lesson_id: "", verification_policy_id: "", verification_record_id: "", safety_result: "", verification_result: "", save_result: "" };
      const next = { ...required, ...event };
      delete next.state_before;
      delete next.state_after;
      if (!next.command_id || !next.profile_id || typeof next.success !== "boolean" || !next.vendor || !next.event_id || !next.timestamp || !Array.isArray(next.changed_fields) || typeof next.parsed_parameters !== "object") throw new Error("Invalid local command event.");
      this.eventLog.push(next); if (this.eventLog.length > 200) this.eventLog.splice(0, this.eventLog.length - 200);
    }
    migrateSnapshot(saved) {
      if (!saved || typeof saved !== "object") return null;
      if (saved.profile_id && saved.profile_id !== this.profile.profile_id) return null;
      const migrated = { ...saved, schema_version: RUNTIME_SCHEMA_VERSION, ...this.catalogMetadata };
      migrated.running = normaliseState(migrated.running || {}, this.profile);
      migrated.startup = normaliseState(migrated.startup || {}, this.profile);
      migrated.baseline = normaliseState(migrated.baseline || {}, this.profile);
      migrated.factoryBaseline = normaliseState(migrated.factoryBaseline || {}, this.profile);
      migrated.running.unsaved_changes = (migrated.running.unsaved_changes || []).map((change, index) => {
        const field = String(change.field || "");
        const selected = migrated.running.session?.selected_interface || Object.keys(migrated.running.interfaces || {})[0] || "GigabitEthernet1/0/1";
        const fullPath = field.startsWith("interfaces.") || field.startsWith("system.") ? field : `interfaces.${selected}.${field}`;
        return {
          ...change,
          change_id: change.change_id || `migrated-${index}-${fullPath}`,
          transaction_id: change.transaction_id || change.command_id || "migrated-change",
          field: fullPath,
          revision_created: Number.isInteger(change.revision_created) ? change.revision_created : Number(migrated.running.session?.revision || 0),
          verification_required: change.verification_required !== false,
          verification_status: change.verification_status || "required",
          verification_record_id: change.verification_record_id || "",
          verified: false
        };
      });
      migrated.running.session ||= {};
      migrated.running.session.verification ||= {};
      migrated.running.session.verification_records ||= {};
      Object.values(migrated.running.session.verification).forEach((verification, index) => {
        verification.covered_change_ids ||= [];
        const verificationId = verification.verification_id || `migrated-verification-${index}`;
        migrated.running.session.verification_records[verificationId] ||= { ...verification, verification_id: verificationId, policy_id: "legacy-unscoped", vendor: this.profile.vendor, profile_id: this.profile.profile_id, object_type: "interface", object_id: Object.keys(migrated.running.interfaces || {})[0] || "", verified_field_paths: [], values_proved: {}, result: "stale", failure_reason: "Legacy unscoped verification requires a new field-scoped verification.", support_level: "unsupported_for_profile", output_evidence: verification.output || "" };
      });
      migrated.eventLog = Array.isArray(migrated.eventLog) ? migrated.eventLog.slice(-200).map((event) => {
        const compact = { ...event };
        delete compact.state_before; delete compact.state_after;
        return compact;
      }) : [];
      const savedRecords = migrated.running.session.verification_records;
      const records = Object.values(savedRecords).sort((left, right) => String(left.timestamp).localeCompare(String(right.timestamp)));
      while (records.length > MAX_VERIFICATION_RECORDS) delete savedRecords[records.shift().verification_id];
      return migrated;
    }
    snapshot() { return { schema_version: RUNTIME_SCHEMA_VERSION, ...this.catalogMetadata, profile_id: this.profile.profile_id, running: this.running, startup: this.startup, baseline: this.baseline, factoryBaseline: this.factoryBaseline, eventLog: this.eventLog }; }
    persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.snapshot())); }
  }

  class ProfileRegistry {
    constructor(profiles = []) { this.profiles = profiles.map(normaliseProfile); }
    get(id) { return this.profiles.find((profile) => profile.profile_id === id) || this.profiles[0] || null; }
    byVendor(vendor) { return this.profiles.filter((profile) => profile.vendor === vendor); }
  }

  window.CommandDoctorSwitchRuntime = { CommandRegistry, SharedSwitchState, ProfileRegistry, STORAGE_KEY, RUNTIME_SCHEMA_VERSION, MAX_VERIFICATION_RECORDS, normaliseSupportLevel, normaliseCommand, commandIdentity, normalise, clone, normaliseProfile, compileGrammar, parseTokens, validateParameterDetail, compareVersion };
})();
