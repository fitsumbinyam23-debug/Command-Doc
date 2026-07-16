import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFile(path.join(root, file), "utf8");
const readJson = async (file) => JSON.parse(await read(file));
const assert = (condition, message) => {
  if (!condition) throw new Error(`Beginner experience test failed: ${message}`);
};

const [modelSource, appSource, labHtml, css, curriculum, readiness] = await Promise.all([
  read("src/learning-experience/beginner-experience.js"),
  read("src/app-release-21.js"),
  read("lab.html"),
  read("styles.css"),
  readJson("data/curriculum/complete-networking-curriculum.json"),
  readJson("reports/beginner-experience-readiness.json")
]);

const sandbox = { module: { exports: {} }, globalThis: {}, window: {} };
vm.runInNewContext(modelSource, sandbox, { filename: "src/learning-experience/beginner-experience.js" });
const model = sandbox.module.exports;

assert(model.STORAGE_KEYS.path === "command-doctor.learning-path", "first-run path uses dedicated localStorage key");
assert(model.STORAGE_KEYS.level0 === "command-doctor.level-0-progress", "Level 0 progress uses dedicated localStorage key");
assert(model.PATHS.map((path) => path.label).join("|") === "Learn From Zero|Practise and Specialize|Technician Tools", "three user journeys are present");
assert(model.BEGINNER_NAVIGATION.map((item) => item.label).join("|") === "Home|Course|Practice|Progress|Tools", "beginner navigation is correct");
assert(!model.BEGINNER_NAVIGATION.some((item) => /instructor/i.test(item.label)), "beginner navigation excludes Instructor Mode");
for (const label of ["Diagnose", "Command Lookup", "Focused Terminal", "Guided CLI", "Switch Workbench", "Visual Playground", "Practice Library", "Knowledge Base", "Saved Reports"]) {
  assert(model.TECHNICIAN_TOOLS.some((tool) => tool.label === label), `${label} is available from Technician Tools`);
}
assert(model.STEPPER_STEPS.join("|") === "Mission|Learn|See|Key words|Predict|Try|Explain|Confidence|Continue", "Level 0 stepper is complete");

for (const id of ["courseView", "practiceView", "progressView", "toolsView"]) {
  assert(labHtml.includes(`id="${id}"`), `${id} exists in lab.html`);
}
assert(labHtml.includes("src/learning-experience/beginner-experience.js?v=2026.07-runtime-rc.3"), "learning experience model is loaded with current query version");

for (const marker of [
  "renderBeginnerNavigation",
  "Start Level 0",
  "renderCourseMap",
  "renderLevel0LessonStepper",
  "No command mastery was awarded",
  "Instructor Mode is not part of beginner navigation",
  "saveLearningPath",
  "saveLevel0Progress"
]) {
  assert(appSource.includes(marker), `app source includes ${marker}`);
}
assert(!appSource.includes("command-doctor.lesson-attempt-engine"), "Stage 2 lesson engine is not integrated");
assert(appSource.includes("state.curriculum.complete") && appSource.includes("commandMap: complete.commandMap?.commands"), "complete curriculum files are loaded");

const level0 = curriculum.levels.find((level) => level.level_id === "level_00");
assert(level0.status === "authored", "Level 0 is authored in curriculum data");
assert(curriculum.levels.filter((level) => level.level_number > 0).every((level) => level.status === "planned_outline"), "future levels stay planned");
assert(readiness.home_primary_action === "Start Level 0", "readiness report records home primary action");
assert(readiness.instructor_mode_in_beginner_navigation === false, "readiness report excludes Instructor Mode from beginner nav");
assert(readiness.planned_content_honesty.includes("cannot award practical mastery"), "readiness report states planned-content honesty");

for (const marker of [".learning-path-grid", ".course-level-grid", ".stepper-steps", "@media (max-width: 640px)"]) {
  assert(css.includes(marker), `CSS includes ${marker}`);
}
assert(css.includes("grid-template-columns: repeat(3, minmax(0, 1fr));"), "mobile stepper has stable responsive columns");

console.log(JSON.stringify({
  status: "passed",
  journeys: model.PATHS.length,
  beginner_navigation: model.BEGINNER_NAVIGATION.map((item) => item.label),
  tools: model.TECHNICIAN_TOOLS.length,
  stepper_steps: model.STEPPER_STEPS.length
}, null, 2));
