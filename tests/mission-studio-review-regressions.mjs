import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFile(path.join(root, file), "utf8");
const exists = (file) => fs.access(path.join(root, file)).then(() => true).catch(() => false);
const errors = [];
const check = (condition, message) => {
  if (!condition) errors.push(message);
};

const [missionTest, componentsSource, appSource, designDoc, registrySource] = await Promise.all([
  read("tests/mission-studio-design.mjs"),
  read("src/learning-experience/mission-studio-components.js"),
  read("src/app-release-21.js"),
  read("docs/COMMAND-DOCTOR-MISSION-STUDIO-DESIGN.md"),
  read("data/curriculum/lesson-visual-assets.json")
]);

check(!missionTest.includes("C:\\\\Program Files\\\\Git\\\\cmd\\\\git.exe"), "Mission Studio test must not hard-code a Windows Git path");
check(await exists("tools/browser-review/mission-studio-browser-review.mjs"), "Browser review runner must exist");

const sandbox = { module: { exports: {} }, globalThis: {}, window: {} };
vm.runInNewContext(componentsSource, sandbox, { filename: "src/learning-experience/mission-studio-components.js" });
const components = sandbox.module.exports;
[
  "appShellState",
  "recommendedActionCard",
  "continueMissionCard",
  "coursePhaseRail",
  "levelCard",
  "phaseContextPanel",
  "lessonTimeline",
  "lessonStepPanel",
  "visualLearningPanel",
  "technicianToolCard",
  "progressSummary",
  "plannedContentNotice",
  "accessibleStatusMessage",
  "renderDescription"
].forEach((name) => check(typeof components[name] === "function", `Reusable component API missing: ${name}`));

[
  "Approved Mission Studio Direction",
  "Three Product Journeys",
  "Visual Personality",
  "Desktop Layout",
  "Mobile Layout",
  "Navigation",
  "Home Hierarchy",
  "Course Structure",
  "Lesson Page Structure",
  "Mandatory Lesson Visual Types",
  "Image Asset And Rights Rules",
  "What Is A Switch Example",
  "Reusable Component List",
  "Typography And Spacing",
  "Accessibility",
  "Runtime Boundaries",
  "Acceptance Standard"
].forEach((heading) => check(designDoc.includes(`## ${heading}`), `Design contract missing heading: ${heading}`));

check(!/"0 levels/.test(appSource), "Practice UI must not expose meaningless zero-level counts");
check(!/"0 command mappings/.test(appSource), "Practice UI must not expose meaningless zero-command counts");
check(registrySource.includes('"preview_contract"'), "Visual registry must include switch preview contract assets");
check(registrySource.includes('"rights_status"'), "Visual assets must include rights metadata");

check(missionTest.includes("validateVisualAssetRegistry"), "Mission Studio test must actually validate the visual registry against schema");
[
  "missing alt_text",
  "missing text_alternative",
  "remote local_asset_path",
  "remote dependency",
  "unknown visual component",
  "missing asset file",
  "invalid step ID",
  "unexpected property"
].forEach((fixture) => check(missionTest.includes(fixture), `Schema rejection fixture missing: ${fixture}`));

[
  "desktop onboarding narrow content strip",
  "desktop home narrow content strip",
  "desktop course narrow content strip",
  "desktop level overview narrow content strip",
  "mobile home partial viewport",
  "mobile tools duplicate content",
  "screenshot metric mismatch"
].forEach((failureId) => check(missionTest.includes(failureId), `Review screenshot guard missing: ${failureId}`));

if (errors.length) {
  console.error(JSON.stringify({ status: "failed", reproduced_review_failures: errors }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ status: "passed", review_regression_guards: true }, null, 2));
