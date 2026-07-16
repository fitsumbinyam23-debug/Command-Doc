import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFile(path.join(root, file), "utf8");
const readJson = async (file) => JSON.parse(await read(file));
const exists = async (file) => fs.access(path.join(root, file)).then(() => true).catch(() => false);
const errors = [];
const check = (condition, message) => {
  if (!condition) errors.push(message);
};

const [
  labHtml,
  css,
  appSource,
  modelSource,
  tokensSource,
  componentsSource,
  registry,
  schema,
  designDoc,
  packageJson
] = await Promise.all([
  read("lab.html"),
  read("styles.css"),
  read("src/app-release-21.js"),
  read("src/learning-experience/beginner-experience.js"),
  read("src/learning-experience/mission-studio-tokens.js"),
  read("src/learning-experience/mission-studio-components.js"),
  readJson("data/curriculum/lesson-visual-assets.json"),
  readJson("data/curriculum/lesson-visual-assets.schema.json"),
  read("docs/COMMAND-DOCTOR-MISSION-STUDIO-DESIGN.md"),
  readJson("package.json")
]);

const sandbox = { module: { exports: {} }, globalThis: {}, window: {} };
vm.runInNewContext(modelSource, sandbox, { filename: "src/learning-experience/beginner-experience.js" });
const model = sandbox.module.exports;
const tokenSandbox = { module: { exports: {} }, globalThis: {}, window: {} };
vm.runInNewContext(tokensSource, tokenSandbox, { filename: "src/learning-experience/mission-studio-tokens.js" });
const tokens = tokenSandbox.module.exports;
const componentSandbox = { module: { exports: {} }, globalThis: {}, window: {} };
vm.runInNewContext(componentsSource, componentSandbox, { filename: "src/learning-experience/mission-studio-components.js" });
const components = componentSandbox.module.exports;

check(packageJson.scripts?.["test:mission-studio"] === "node tests/mission-studio-design.mjs", "Mission Studio test script is registered");
check(labHtml.includes("src/learning-experience/mission-studio-tokens.js"), "Mission Studio tokens are loaded");
check(labHtml.includes("src/learning-experience/mission-studio-components.js"), "Mission Studio components are loaded");
check((labHtml.match(/class="nav-tabs"/g) || []).length === 1, "navigation is reused instead of duplicated");
check(!/<(?:script|link)[^>]+(?:src|href)=["']https?:/i.test(labHtml), "lab.html has no remote script or stylesheet dependency");

check(tokens.navigation?.desktopWidth === "244px", "desktop navigation token is present");
check(tokens.navigation?.mobileHeight === "72px", "mobile navigation token is present");
check(tokens.colors?.action === "#1769e0", "action color token is present");
check(components.navItems?.map((item) => item.label).join("|") === "Home|Course|Practice|Progress|Tools", "component navigation labels are approved");
check(components.visualComponents?.includes("annotated_device_view"), "visual component contract includes annotated device view");

for (const marker of [
  "--mission-sidebar-width",
  ".nav-tab[data-nav-icon",
  "@media (max-width: 720px)",
  ".mission-visual-panel",
  ".mission-visual-layout",
  ".stepper-steps li.is-active"
]) {
  check(css.includes(marker), `CSS includes ${marker}`);
}
check(!/@import\s+url|url\(["']?https?:|font-face/i.test(css), "CSS does not import remote fonts or images");

check(appSource.includes("visualAssets: \"data/curriculum/lesson-visual-assets.json\""), "app loads the visual asset registry");
check(appSource.includes("renderLessonVisualPanel"), "app renders lesson visual panels");
check(appSource.includes("visualAssetForLessonStep"), "app resolves visuals by lesson and step");
check(appSource.includes("aria-current"), "lesson stepper exposes aria-current");
check(appSource.includes("focusLessonStepHeading"), "lesson step navigation moves focus");

check(schema.schema_version === undefined || schema.properties?.schema_version?.const === "lesson-visual-assets.v1", "visual schema declares v1");
check(registry.schema_version === "lesson-visual-assets.v1", "visual registry uses v1 schema");
check(registry.rules?.local_asset_required === true, "visual registry requires local assets");
check(registry.rules?.remote_dependencies_allowed === false, "visual registry rejects remote dependencies");
check(Array.isArray(registry.assets) && registry.assets.length >= 4, "registry contains authored Level 0 assets");

const requiredLessons = new Map([
  ["level00_what_is_a_network", "level0_network_shared_service"],
  ["level00_why_devices_communicate", "level0_device_request_response"],
  ["level00_lan_wan_and_the_internet", "level0_lan_wan_internet_scope"],
  ["level00_real_devices_versus_command_doctor_simulation", "level0_simulation_production_boundary"]
]);

const assetsByLesson = new Map(registry.assets.map((asset) => [asset.lesson_id, asset]));
for (const [lessonId, assetId] of requiredLessons) {
  const asset = assetsByLesson.get(lessonId);
  check(asset?.asset_id === assetId, `${lessonId} has the expected visual asset`);
  check(asset?.status === "authored", `${lessonId} visual asset is authored`);
  check(asset?.local_asset_path?.startsWith("data/curriculum/"), `${lessonId} visual asset is local`);
  check(!/^https?:/i.test(asset?.local_asset_path || ""), `${lessonId} visual asset is not remote`);
  check((asset?.alt_text || "").length >= 20, `${lessonId} visual asset has alt text`);
  check((asset?.text_alternative || "").length >= 40, `${lessonId} visual asset has text alternative`);
  check((asset?.evidence_requirements || []).length >= 3, `${lessonId} visual asset has evidence requirements`);
  check((asset?.remote_dependencies || []).length === 0, `${lessonId} visual asset has no remote dependencies`);
  check(await exists(asset.local_asset_path), `${asset.local_asset_path} exists`);
  const svg = await read(asset.local_asset_path);
  check(!/<script|(?:href|src)=["']https?:|@import\s+url/i.test(svg), `${asset.local_asset_path} has no remote references or scripts`);
}

const lessons = model.createLevel0Lessons();
for (const [lessonId, assetId] of requiredLessons) {
  const lesson = lessons.find((item) => item.lesson_id === lessonId);
  check(lesson?.visual_asset_id === assetId, `${lessonId} model keeps stable visual asset id`);
}

const futureKeys = new Set((registry.future_visual_contracts || []).map((item) => item.lesson_key));
for (const key of ["what_is_a_switch", "switch_ports_and_leds", "what_is_a_router", "vlan_and_trunk_foundations"]) {
  check(futureKeys.has(key), `future visual contract includes ${key}`);
}

check(/Final command placement QA remains a separate curriculum review/i.test(designDoc), "design doc keeps command placement QA separate");
check(!/SME verified|final placement/i.test(appSource), "app does not claim SME verified or final placement");

const protectedFiles = new Set([
  "src/switch-runtime.js",
  "src/lab-engine.js",
  "sw.js",
  "data/generated/command-inventory.json",
  "data/generated/route-inventory.json",
  "data/platforms/switch-profiles.json",
  "data/curriculum/curriculum-command-placement.json"
]);
const diffNames = execFileSync("C:\\Program Files\\Git\\cmd\\git.exe", ["diff", "--name-only"], { cwd: root, encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean)
  .map((name) => name.replace(/\\/g, "/"));
for (const file of protectedFiles) check(!diffNames.includes(file), `protected file is unchanged: ${file}`);

if (errors.length) {
  console.error(JSON.stringify({ status: "failed", errors }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: "passed",
  desktop_width: tokens.navigation.desktopWidth,
  mobile_width: "390px target",
  visual_assets: registry.assets.length,
  future_contracts: registry.future_visual_contracts.length,
  protected_files_checked: protectedFiles.size
}, null, 2));
