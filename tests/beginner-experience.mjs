import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFile(path.join(root, file), "utf8");
const readJson = async (file) => JSON.parse(await read(file));
const errors = [];
const check = (condition, message) => {
  if (!condition) errors.push(message);
};

const [modelSource, appSource, componentsSource, viewsSource, labHtml, baseCss, missionCss, curriculum, readiness] = await Promise.all([
  read("src/learning-experience/beginner-experience.js"),
  read("src/app-release-21.js"),
  read("src/learning-experience/mission-studio-components.js"),
  read("src/learning-experience/mission-studio-views.js"),
  read("lab.html"),
  read("styles.css"),
  read("mission-studio.css"),
  readJson("data/curriculum/complete-networking-curriculum.json"),
  readJson("reports/beginner-experience-readiness.json")
]);
const css = `${baseCss}\n${missionCss}`;

const sandbox = { module: { exports: {} }, globalThis: {}, window: {} };
vm.runInNewContext(modelSource, sandbox, { filename: "src/learning-experience/beginner-experience.js" });
const model = sandbox.module.exports;

const requiredExports = [
  "STORAGE_KEYS",
  "PATHS",
  "BEGINNER_NAVIGATION",
  "TECHNICIAN_TOOLS",
  "STEPPER_STEPS",
  "createLevel0State",
  "createLevel0Lessons",
  "advanceLevel0",
  "restoreLevel0State",
  "applyPathChoice",
  "homeStateForPath",
  "toolDestination",
  "focusTargetForView",
  "focusTargetForStep",
  "humanStatus"
];
for (const key of requiredExports) check(Object.hasOwn(model, key), `model missing export ${key}`);

check(model.STORAGE_KEYS?.path === "command-doctor.learning-path", "first-run path uses dedicated localStorage key");
check(model.STORAGE_KEYS?.level0 === "command-doctor.level-0-progress", "Level 0 progress uses dedicated localStorage key");
check((model.PATHS || []).map((item) => item.label).join("|") === "Learn From Zero|Practise and Specialize|Technician Tools", "three approved journeys are present");
check((model.BEGINNER_NAVIGATION || []).map((item) => item.label).join("|") === "Home|Course|Practice|Progress|Tools", "beginner navigation is correct");
check(!(model.BEGINNER_NAVIGATION || []).some((item) => /instructor/i.test(item.label)), "beginner navigation excludes Instructor Mode");

if (model.applyPathChoice) {
  check(model.applyPathChoice("zero").view === "course", "Learn From Zero opens beginner course/Level 0");
  check(model.applyPathChoice("practice").view === "practice", "Practise and Specialize opens Practice");
  check(model.applyPathChoice("tools").view === "tools", "Technician Tools opens Tools");
}

if (model.homeStateForPath) {
  const zeroHome = model.homeStateForPath("zero", { lessonTitle: "What is a network?" });
  const practiceHome = model.homeStateForPath("practice", {});
  const toolsHome = model.homeStateForPath("tools", { lastTool: "Diagnose" });
  check(zeroHome.primaryAction?.label === "Continue Level 0" || zeroHome.primaryAction?.label === "Start Level 0", "zero-path Home has one dominant Level 0 action");
  check(practiceHome.primaryAction?.label === "Open Practice Library", "practice-path Home primary action opens Practice Library");
  check(toolsHome.primaryAction?.label === "Open Diagnose", "tools-path Home primary action opens most recent tool or Diagnose");
  check((zeroHome.journeyCards || []).length === 0, "selected path does not render repeated equal journey cards");
  check((practiceHome.journeyCards || []).length === 0, "practice path does not render repeated equal journey cards");
}

if (model.createLevel0State && model.createLevel0Lessons && model.advanceLevel0) {
  const lessons = model.createLevel0Lessons();
  check(lessons.length === 8, "Level 0 has exactly eight authored lessons");
  check(lessons.map((lesson) => lesson.title).join("|") === "What is a network?|Why devices communicate|LAN, WAN and the internet|What a network technician does|Real devices versus Command Doctor simulation|Safe learning rules|Beginner glossary|Level checkpoint", "Level 0 lesson titles are approved");
  const serializedContent = lessons.map((lesson) => [lesson.mission, lesson.learn, lesson.see, lesson.predict?.question, lesson.tryInteraction?.prompt, lesson.explain].join(" | "));
  check(new Set(serializedContent).size === lessons.length, "Level 0 lessons have unique subject-specific content");
  let state = model.createLevel0State(lessons);
  state = model.advanceLevel0(state, lessons, { direction: "next" }).state;
  state = model.advanceLevel0(state, lessons, { direction: "next" }).state;
  state = model.advanceLevel0(state, lessons, { direction: "next" }).state;
  state = model.advanceLevel0(state, lessons, { direction: "next" }).state;
  const blockedPrediction = model.advanceLevel0(state, lessons, { direction: "next" });
  check(blockedPrediction.blocked && /prediction/i.test(blockedPrediction.reason), "Next cannot skip required prediction interaction");
  state = model.advanceLevel0(state, lessons, { interaction: "prediction", value: lessons[0].predict.answer_choices[0] }).state;
  state = model.advanceLevel0(state, lessons, { direction: "next" }).state;
  const blockedTry = model.advanceLevel0(state, lessons, { direction: "next" });
  check(blockedTry.blocked && /try/i.test(blockedTry.reason), "Next cannot skip Try interaction");
  state = model.advanceLevel0(state, lessons, { interaction: "try", value: lessons[0].tryInteraction.answer_choices[0] }).state;
  state = model.advanceLevel0(state, lessons, { direction: "next" }).state;
  const blockedExplain = model.advanceLevel0(state, lessons, { direction: "next" });
  check(blockedExplain.blocked && /explanation/i.test(blockedExplain.reason), "Explanation/check response is required before confidence");
  state = model.advanceLevel0(state, lessons, { interaction: "explanation", value: "The safest answer uses evidence first." }).state;
  state = model.advanceLevel0(state, lessons, { direction: "next" }).state;
  const blockedConfidence = model.advanceLevel0(state, lessons, { direction: "next" });
  check(blockedConfidence.blocked && /confidence/i.test(blockedConfidence.reason), "Confidence must be recorded before lesson completion");
  state = model.advanceLevel0(state, lessons, { interaction: "confidence", value: "High" }).state;
  state = model.advanceLevel0(state, lessons, { direction: "next" }).state;
  const previous = model.advanceLevel0({ ...state, current_lesson_id: lessons[1].lesson_id, current_step_id: "mission" }, lessons, { direction: "previous" });
  check(previous.state?.current_lesson_id === lessons[0].lesson_id && previous.state?.current_step_id === "continue", "Previous from first step returns to previous lesson");
  const restored = model.restoreLevel0State(JSON.parse(JSON.stringify(state)), lessons);
  check(restored.current_lesson_id === state.current_lesson_id && restored.current_step_id === state.current_step_id, "resume restores exact lesson and step");
  const checkpointState = { ...model.createLevel0State(lessons), current_lesson_id: lessons.at(-1).lesson_id, current_step_id: "continue", confidence_by_lesson: Object.fromEntries(lessons.map((lesson) => [lesson.lesson_id, "High"])), completed_lesson_ids: lessons.slice(0, -1).map((lesson) => lesson.lesson_id) };
  const checkpointGate = model.advanceLevel0(checkpointState, lessons, { direction: "next" });
  check(checkpointGate.blocked && /checkpoint/i.test(checkpointGate.reason), "final checkpoint must be submitted before Level 0 completes");
  check(!checkpointGate.state?.mastery?.practical_execution && !checkpointGate.state?.mastery?.verification, "Level 0 completion cannot create practical execution or verification mastery");
}

if (model.toolDestination) {
  check(model.toolDestination("switch-workbench").labScreen === "workbench", "Switch Workbench opens lab workbench");
  check(model.toolDestination("focused-terminal").labScreen === "cli", "Focused Terminal opens lab cli");
}

if (model.focusTargetForView && model.focusTargetForStep) {
  check(model.focusTargetForView("course") === "#courseTitle", "course navigation focuses active view heading");
  check(model.focusTargetForStep("predict") === "[data-step-heading=\"predict\"]", "lesson step navigation focuses active step heading");
}

for (const id of ["courseView", "practiceView", "progressView", "toolsView"]) check(labHtml.includes(`id="${id}"`), `${id} exists in lab.html`);
check(labHtml.includes("src/learning-experience/beginner-experience.js?v=2026.07-runtime-rc.3"), "learning experience model is loaded with current query version");
check(appSource.includes("focusActiveViewHeading"), "app moves focus to active view heading after navigation");
check(appSource.includes("focusLessonStepHeading"), "app moves focus to active lesson-step heading");
check(componentsSource.includes("aria-current") && viewsSource.includes("LessonStepRail"), "active lesson step exposes aria-current");
check(appSource.includes("pathStatusAnnouncer"), "path-choice result is announced");
check(!appSource.includes("command-doctor.lesson-attempt-engine"), "Stage 2 lesson engine is not integrated");

const level0 = curriculum.levels.find((level) => level.level_id === "level_00");
check(level0?.title === "Welcome to Networking", "Level 0 title is approved");
check(readiness.home_primary_action === "path-adaptive", "readiness report records path-adaptive home action");
check(readiness.instructor_mode_in_beginner_navigation === false, "readiness report excludes Instructor Mode from beginner nav");

for (const marker of [".learning-path-grid", ".course-level-grid", ".stepper-steps", ".ms-course-layout", ".ms-lesson-layout", "@media (max-width: 640px)", "@media (max-width: 720px)", "@media (prefers-reduced-motion: reduce)"]) {
  check(css.includes(marker), `CSS includes ${marker}`);
}

if (errors.length) {
  console.error(JSON.stringify({ status: "failed", errors }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: "passed",
  journeys: model.PATHS.length,
  beginner_navigation: model.BEGINNER_NAVIGATION.map((item) => item.label),
  tools: model.TECHNICIAN_TOOLS.length,
  stepper_steps: model.STEPPER_STEPS.length
}, null, 2));
