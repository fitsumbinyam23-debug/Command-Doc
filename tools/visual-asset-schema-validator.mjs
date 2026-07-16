const allowedVisualComponents = new Set([
  "realistic_device",
  "annotated_device_view",
  "topology",
  "sequence",
  "healthy_fault_comparison",
  "cli_to_visual_evidence",
  "text_alternative"
]);

const allowedStepIds = new Set([
  "mission",
  "learn",
  "see",
  "key_words",
  "predict",
  "try",
  "explain",
  "confidence",
  "continue"
]);

const allowedStatuses = new Set(["authored", "contract_only", "planned", "preview_contract"]);

const rootKeys = new Set(["schema_version", "source", "rules", "assets", "future_visual_contracts"]);
const rulesKeys = new Set(["local_asset_required", "remote_dependencies_allowed", "text_alternative_required"]);
const assetKeys = new Set([
  "asset_id",
  "level_id",
  "lesson_id",
  "title",
  "caption",
  "status",
  "content_status",
  "visual_components",
  "step_ids",
  "local_asset_path",
  "alt_text",
  "text_alternative",
  "evidence_requirements",
  "mastery_scope",
  "review_scope",
  "source_type",
  "rights_status",
  "generic_model_scope",
  "mobile_behavior",
  "remote_dependencies"
]);
const futureContractKeys = new Set(["lesson_key", "status", "expected_components", "required_evidence", "text_alternative_required"]);

function unexpectedKeys(value, allowed, label, errors) {
  for (const key of Object.keys(value || {})) {
    if (!allowed.has(key)) errors.push(`${label} unexpected property: ${key}`);
  }
}

function requiredString(value, path, errors, minLength = 1) {
  if (typeof value !== "string" || value.trim().length < minLength) errors.push(`${path} must be a string with length >= ${minLength}`);
}

function requiredArray(value, path, errors) {
  if (!Array.isArray(value) || !value.length) errors.push(`${path} must be a non-empty array`);
}

export async function validateVisualAssetRegistry(registry, schema, options = {}) {
  const errors = [];
  const assetExists = options.assetExists || (async () => true);
  const expectedVersion = schema?.properties?.schema_version?.const;

  if (!expectedVersion) errors.push("schema_version const is required by schema");
  if (registry?.schema_version !== expectedVersion) errors.push(`schema_version must be ${expectedVersion}`);
  unexpectedKeys(registry, rootKeys, "registry", errors);
  if (!registry || typeof registry !== "object" || Array.isArray(registry)) errors.push("registry must be an object");
  if (!registry?.rules || typeof registry.rules !== "object") errors.push("rules must be an object");
  else {
    unexpectedKeys(registry.rules, rulesKeys, "rules", errors);
    if (registry.rules.local_asset_required !== true) errors.push("rules.local_asset_required must be true");
    if (registry.rules.remote_dependencies_allowed !== false) errors.push("rules.remote_dependencies_allowed must be false");
    if (registry.rules.text_alternative_required !== true) errors.push("rules.text_alternative_required must be true");
  }
  if (!Array.isArray(registry?.assets) || !registry.assets.length) errors.push("assets must be a non-empty array");
  if (!Array.isArray(registry?.future_visual_contracts) || !registry.future_visual_contracts.length) errors.push("future_visual_contracts must be a non-empty array");

  for (const [index, asset] of (registry?.assets || []).entries()) {
    const label = `assets[${index}]`;
    unexpectedKeys(asset, assetKeys, label, errors);
    for (const key of assetKeys) {
      if (!Object.hasOwn(asset, key)) errors.push(`${label}.${key} is required`);
    }
    requiredString(asset.asset_id, `${label}.asset_id`, errors, 3);
    requiredString(asset.level_id, `${label}.level_id`, errors);
    requiredString(asset.lesson_id, `${label}.lesson_id`, errors);
    requiredString(asset.title, `${label}.title`, errors);
    requiredString(asset.caption, `${label}.caption`, errors);
    requiredString(asset.alt_text, `${label}.alt_text`, errors, 20);
    requiredString(asset.text_alternative, `${label}.text_alternative`, errors, 40);
    requiredString(asset.source_type, `${label}.source_type`, errors);
    requiredString(asset.rights_status, `${label}.rights_status`, errors);
    requiredString(asset.generic_model_scope, `${label}.generic_model_scope`, errors);
    requiredString(asset.mobile_behavior, `${label}.mobile_behavior`, errors);
    requiredString(asset.content_status, `${label}.content_status`, errors);
    if (!allowedStatuses.has(asset.status)) errors.push(`${label}.status is invalid: ${asset.status}`);
    requiredArray(asset.visual_components, `${label}.visual_components`, errors);
    for (const component of asset.visual_components || []) {
      if (!allowedVisualComponents.has(component)) errors.push(`${label}.visual_components unknown visual component: ${component}`);
    }
    requiredArray(asset.step_ids, `${label}.step_ids`, errors);
    for (const stepId of asset.step_ids || []) {
      if (!allowedStepIds.has(stepId)) errors.push(`${label}.step_ids invalid step ID: ${stepId}`);
    }
    requiredArray(asset.evidence_requirements, `${label}.evidence_requirements`, errors);
    if (typeof asset.local_asset_path !== "string" || !/^data\/curriculum\/.+\.svg$/i.test(asset.local_asset_path)) errors.push(`${label}.local_asset_path must be a local SVG path`);
    if (/^https?:/i.test(asset.local_asset_path || "")) errors.push(`${label}.local_asset_path must not be remote`);
    if (!Array.isArray(asset.remote_dependencies)) errors.push(`${label}.remote_dependencies must be an array`);
    else if (asset.remote_dependencies.length) errors.push(`${label}.remote dependency is not allowed`);
    if (asset.local_asset_path && !await assetExists(asset.local_asset_path)) errors.push(`${label}.local_asset_path missing asset file: ${asset.local_asset_path}`);
  }

  for (const [index, contract] of (registry?.future_visual_contracts || []).entries()) {
    const label = `future_visual_contracts[${index}]`;
    unexpectedKeys(contract, futureContractKeys, label, errors);
    requiredString(contract.lesson_key, `${label}.lesson_key`, errors);
    if (contract.status !== "contract_only") errors.push(`${label}.status must be contract_only`);
    requiredArray(contract.expected_components, `${label}.expected_components`, errors);
    requiredArray(contract.required_evidence, `${label}.required_evidence`, errors);
    if (contract.text_alternative_required !== true) errors.push(`${label}.text_alternative_required must be true`);
  }

  return { valid: errors.length === 0, errors };
}
