import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { validateVisualAssetRegistry } from "../tools/visual-asset-schema-validator.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFile(path.join(root, file), "utf8");
const readJson = async (file) => JSON.parse(await read(file));
const exists = async (file) => fs.access(path.join(root, file)).then(() => true).catch(() => false);
const errors = [];
const check = (condition, message) => {
  if (!condition) errors.push(message);
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadBrowserModule(source, filename, injectedGlobals = {}) {
  const sandbox = {
    module: { exports: {} },
    globalThis: { ...injectedGlobals },
    window: { ...injectedGlobals }
  };
  vm.runInNewContext(source, sandbox, { filename });
  return sandbox.module.exports;
}

function createFakeDocument() {
  return {
    createTextNode(text) {
      return { nodeType: 3, textContent: String(text) };
    },
    createElement(tag) {
      return {
        tagName: tag.toUpperCase(),
        children: [],
        attributes: {},
        dataset: {},
        className: "",
        textContent: "",
        style: {},
        append(...nodes) {
          this.children.push(...nodes);
        },
        setAttribute(name, value) {
          this.attributes[name] = String(value);
        },
        addEventListener(type, handler) {
          this[`on${type}`] = handler;
        }
      };
    }
  };
}

function flattenRendered(node) {
  if (!node || typeof node !== "object") return [];
  return [node, ...(node.children || []).flatMap(flattenRendered)];
}

function gitDiffNames(gitExecutable) {
  try {
    return execFileSync(gitExecutable, ["diff", "--name-only"], { cwd: root, encoding: "utf8" })
      .split(/\r?\n/)
      .filter(Boolean)
      .map((name) => name.replace(/\\/g, "/"));
  } catch (error) {
    throw new Error(`Git is required for Mission Studio protected-file checks. Tried ${gitExecutable}. ${error.message}`);
  }
}

const [
  labHtml,
  baseCss,
  missionCss,
  appSource,
  modelSource,
  tokensSource,
  iconsSource,
  missionStateSource,
  componentsSource,
  shellSource,
  viewsSource,
  registry,
  schema,
  designDoc,
  packageJson,
  buildSource,
  gitignoreSource,
  isolatedBuildSource,
  isolatedStartupSource,
  browserReviewSource,
  protectedHashSource
] = await Promise.all([
  read("lab.html"),
  read("styles.css"),
  read("mission-studio.css"),
  read("src/app-release-21.js"),
  read("src/learning-experience/beginner-experience.js"),
  read("src/learning-experience/mission-studio-tokens.js"),
  read("src/learning-experience/mission-studio-icons.js"),
  read("src/learning-experience/mission-studio-state.js"),
  read("src/learning-experience/mission-studio-components.js"),
  read("src/learning-experience/mission-studio-shell.js"),
  read("src/learning-experience/mission-studio-views.js"),
  readJson("data/curriculum/lesson-visual-assets.json"),
  readJson("data/curriculum/lesson-visual-assets.schema.json"),
  read("docs/COMMAND-DOCTOR-MISSION-STUDIO-DESIGN.md"),
  readJson("package.json"),
  read("scripts/build.mjs"),
  read(".gitignore"),
  read("tools/review-isolated-build.mjs"),
  read("tools/review-isolated-startup.mjs"),
  read("tools/browser-review/mission-studio-browser-review.mjs"),
  read("tools/protected-hash-report.mjs")
]);

const css = `${baseCss}\n${missionCss}`;
const model = loadBrowserModule(modelSource, "src/learning-experience/beginner-experience.js");
const tokens = loadBrowserModule(tokensSource, "src/learning-experience/mission-studio-tokens.js");
const icons = loadBrowserModule(iconsSource, "src/learning-experience/mission-studio-icons.js");
const missionState = loadBrowserModule(missionStateSource, "src/learning-experience/mission-studio-state.js");
const components = loadBrowserModule(componentsSource, "src/learning-experience/mission-studio-components.js", {
  CommandDoctorMissionStudioIcons: icons
});
const shell = loadBrowserModule(shellSource, "src/learning-experience/mission-studio-shell.js", {
  CommandDoctorMissionStudioComponents: components
});
const views = loadBrowserModule(viewsSource, "src/learning-experience/mission-studio-views.js", {
  CommandDoctorMissionStudioComponents: components,
  CommandDoctorMissionStudioIcons: icons
});

check(packageJson.scripts?.["test:mission-studio"] === "node tests/mission-studio-design.mjs && node tests/mission-studio-review-regressions.mjs", "Mission Studio test script runs design and review regression guards");
check(packageJson.scripts?.["review:mission-studio"] === "node tools/browser-review/mission-studio-browser-review.mjs --repeat 2", "Mission Studio browser review script is registered");
check(buildSource.includes("export async function buildCommandDoctor") && buildSource.includes("--out-dir"), "build tool supports an optional isolated output directory");
check(gitignoreSource.includes(".review-build/"), "review build output is ignored by Git");
check(isolatedBuildSource.includes("buildCommandDoctor") && isolatedBuildSource.includes("verified_source_copies"), "isolated build runner reuses the build implementation and verifies copied source");
check(isolatedStartupSource.includes("isolated startup") && isolatedStartupSource.includes("--client"), "isolated startup runner supports an explicit client directory");
check(labHtml.includes("src/learning-experience/mission-studio-tokens.js"), "Mission Studio tokens are loaded");
check(labHtml.includes("mission-studio.css"), "Mission Studio scoped stylesheet is loaded");
check(labHtml.includes("src/learning-experience/mission-studio-icons.js"), "Mission Studio icons are loaded");
check(labHtml.includes("src/learning-experience/mission-studio-state.js"), "Mission Studio state helpers are loaded");
check(labHtml.includes("src/learning-experience/mission-studio-components.js"), "Mission Studio components are loaded");
check(labHtml.includes("src/learning-experience/mission-studio-shell.js"), "Mission Studio shell is loaded");
check(labHtml.includes("src/learning-experience/mission-studio-views.js"), "Mission Studio views are loaded");
check((labHtml.match(/class="nav-tabs"/g) || []).length === 1, "legacy navigation bridge is singular before Mission Studio shell replacement");
check(labHtml.includes("Learn. Practise. Diagnose."), "initial shell bridge uses the approved Mission Studio tagline");
check(!labHtml.includes("Offline CLI diagnosis"), "rejected old tagline is absent from lab.html");
check(!/<(?:script|link)[^>]+(?:src|href)=["']https?:/i.test(labHtml), "lab.html has no remote script or stylesheet dependency");

check(tokens.navigation?.desktopWidth === "244px", "desktop navigation token is present");
check(tokens.navigation?.mobileHeight === "72px", "mobile navigation token is present");
check(tokens.colors?.action === "#1769e0", "action color token is present");
check(components.navItems?.map((item) => item.label).join("|") === "Home|Course|Practice|Progress|Tools", "component navigation labels are approved");
check(components.visualComponents?.includes("annotated_device_view"), "visual component contract includes annotated device view");
check(icons.toolSymbol("diagnose") !== icons.toolSymbol("command-lookup"), "tool symbols are unique per tool");
check(Object.values(icons.navSymbols || {}).every((value) => !/^[A-Z]{2}$/.test(value)), "navigation icons are semantic names, not two-letter abbreviations");
check(typeof icons.icon === "function", "icon renderer exposes original local SVG descriptions");
check(typeof missionState.level0Completion === "function", "Mission Studio state helper exposes level0Completion");
check(typeof shell.setupMissionStudioShell === "function", "Mission Studio shell exposes setup");
check(typeof views.renderMissionStudioHomeView === "function", "Mission Studio views expose Home renderer");
const plannedLevelFacts = missionState.levelFacts({
  estimated_learning_hours: 0,
  modules: [],
  command_ids: [],
  prerequisite_level_ids: ["level_00"],
  practice_status: "planned",
  review_status: "planned"
}, (value) => value || "planned", (id) => id === "level_00" ? "Requires Level 0: Welcome to Networking" : "Requires prior level review");
check(plannedLevelFacts.includes("Command lessons are planned"), "planned level facts use honest command-planning copy");
check(!plannedLevelFacts.join(" ").includes("0 mapped commands"), "planned level facts suppress zero mapped-command copy");
check(!plannedLevelFacts.join(" ").includes("level_00"), "planned level facts suppress raw prerequisite ids");
const progressDescription = components.ProgressDashboard({ facts: [], percent: 42, progressLabel: "42% complete" });
check(JSON.stringify(progressDescription).includes("\"role\":\"progressbar\""), "ProgressDashboard exposes an accessible progress bar");
check(JSON.stringify(progressDescription).includes("\"aria-valuenow\":\"42\""), "ProgressDashboard binds progress value");

[
  "MissionStudioShell",
  "MissionStudioSidebar",
  "MissionStudioBrand",
  "MissionStudioPrimaryNav",
  "MissionStudioSidebarProfile",
  "MissionStudioMobileHeader",
  "MissionStudioMobileBottomNav",
  "MissionStudioContentHeader",
  "FirstRunMissionSelector",
  "HomeMissionHero",
  "HomeProgressSummary",
  "HomeTechnicianShortcuts",
  "HomeRecentActivity",
  "HomeJourneyPreview",
  "AccessibleViewStatus",
  "DesktopSidebar",
  "MobileProductHeader",
  "MobileBottomNavigation",
  "ContinueMissionCard",
  "DiagnosticShortcutCard",
  "RecentActivityStrip",
  "CoursePhaseRail",
  "CourseLevelTimeline",
  "PhaseContextPanel",
  "LevelOverviewHeader",
  "LessonStepRail",
  "LessonContentStage",
  "VisualLearningPanel",
  "ProgressDashboard",
  "TechnicianToolsGrid",
  "TechnicianToolCard",
  "PlannedContentNotice",
  "AccessibleStatusMessage",
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
].forEach((name) => check(typeof components[name] === "function", `Reusable component API exists: ${name}`));

const fakeDocument = createFakeDocument();
const renderedContinue = components.renderDescription(fakeDocument, components.continueMissionCard({
  title: "Continue Level 0",
  lessonTitle: "What is a network?",
  phaseLabel: "Phase 1",
  levelLabel: "Level 0",
  progressLabel: "Step 1 of 9",
  actionLabel: "Continue Mission",
  onAction: () => true
}));
check(renderedContinue.tagName === "SECTION", "ContinueMissionCard renders as a DOM node description");
check(renderedContinue.attributes["aria-label"] === "Continue mission", "ContinueMissionCard has an accessible label");
check(renderedContinue.children.some((child) => child.tagName === "BUTTON" && typeof child.onclick === "function"), "ContinueMissionCard action is executable");

const renderedTimeline = components.renderDescription(fakeDocument, components.lessonTimeline({
  stepNames: model.STEPPER_STEPS,
  stepIds: model.STEP_IDS,
  activeStepId: "see",
  activeIndex: 2
}));
check(flattenRendered(renderedTimeline).filter((item) => item.attributes?.["aria-current"] === "step").length >= 1, "LessonTimeline exposes one aria-current step");

const renderedShell = components.renderDescription(fakeDocument, components.MissionStudioShell({
  activeView: "home",
  pathLabel: "Learn From Zero"
}));
const shellNodes = flattenRendered(renderedShell);
check(renderedShell.className === "ms-app-shell", "real MissionStudioShell renders the active shell root");
check(shellNodes.some((item) => item.className === "ms-desktop-sidebar"), "MissionStudioSidebar renders a desktop sidebar");
check(shellNodes.some((item) => item.className === "ms-mobile-header"), "MissionStudioMobileHeader renders");
check(shellNodes.some((item) => item.className === "ms-mobile-bottom-nav"), "MissionStudioMobileBottomNav renders");
check(shellNodes.filter((item) => item.dataset?.msPrimaryNav === "true").length === 10, "desktop and mobile shell expose five destinations each");
check(shellNodes.some((item) => item.textContent === "Command Doctor"), "brand wordmark is visible");
check(shellNodes.some((item) => item.textContent === "Learn. Practise. Diagnose."), "new tagline is visible in shell");

const onboardingHome = views.renderMissionStudioHomeView(fakeDocument, {
  path: "",
  paths: components.pathCards,
  onChoosePath: () => true
});
const onboardingNodes = flattenRendered(onboardingHome);
check(onboardingHome.className.includes("ms-onboarding"), "first-run Home renders the onboarding screen");
check(onboardingNodes.filter((item) => item.dataset?.pathChoice).length === 3, "onboarding shows exactly three path choices");
check(!onboardingNodes.some((item) => String(item.className || "").includes("ms-home-hero")), "normal Home dashboard is absent before path selection");

const renderedHome = views.renderMissionStudioHomeView(fakeDocument, {
  path: "zero",
  pathLabel: "Learn From Zero",
  missionHero: {
    pathLabel: "Learn From Zero",
    title: "Level 0 - Welcome to Networking",
    lessonLabel: "Lesson 1 of 8: What is a network?",
    statement: "Understand what a network is and why connected devices communicate.",
    progressPercent: 1,
    actionLabel: "Continue Level 0",
    onAction: () => true
  },
  progressSummary: {
    title: "Level 0 orientation",
    percent: 1,
    facts: [{ label: "Lessons", value: "0/8", detail: "complete" }]
  },
  nextCheckpoint: { title: "Level checkpoint", body: "Complete the lessons first.", state: "Not ready yet" },
  technicianAction: { title: "Open Diagnose", body: "Paste output.", actionLabel: "Open Diagnose", onAction: () => true },
  shortcuts: [
    { id: "diagnose", label: "Diagnose Output", description: "Paste output.", view: "diagnose", icon: "pulse", onAction: () => true },
    { id: "command-lookup", label: "Command Lookup", description: "Search commands.", view: "diagnose", icon: "search", onAction: () => true },
    { id: "switch-workbench", label: "Switch Workbench", description: "Inspect switch state.", view: "lab", icon: "switch", onAction: () => true },
    { id: "saved-reports", label: "Saved Reports", description: "Open reports.", view: "history", icon: "report", onAction: () => true }
  ],
  recentActivity: [{ icon: "book", title: "What is a network?", detail: "Current step: Mission" }],
  journeyPreview: [
    { title: "What is a network?", detail: "Explain What is a network? in beginner language.", state: "current", stateLabel: "Current", indexLabel: "1" },
    { title: "Why devices communicate", detail: "Explain Why devices communicate in beginner language.", state: "upcoming", stateLabel: "Upcoming", indexLabel: "2" },
    { title: "LAN, WAN and the internet", detail: "Explain LAN, WAN and the internet in beginner language.", state: "upcoming", stateLabel: "Upcoming", indexLabel: "3" }
  ]
});
const homeNodes = flattenRendered(renderedHome);
check(renderedHome.className.includes("ms-home"), "normal Home dashboard renders after path selection");
check(homeNodes.filter((item) => item.dataset?.dominantAction === "true").length === 1, "Home has exactly one dominant mission action");
check(homeNodes.some((item) => item.dataset?.localVisual === "mission-studio-home-network"), "Home mission hero contains a local visual asset");
check(homeNodes.some((item) => item.tagName === "IMG" && (item.alt || "").length >= 30), "mission visual has meaningful alt text");
check(homeNodes.some((item) => item.tagName === "FIGCAPTION" && (item.textContent || "").length >= 40), "mission visual has a structured text alternative");
check(homeNodes.some((item) => item.attributes?.role === "progressbar" && item.attributes?.["aria-valuenow"] === "1"), "Home progress exposes accessible value semantics");
check(homeNodes.filter((item) => item.dataset?.shortcutDestination).length === 4, "Home renders four technician shortcuts with destinations");
check(homeNodes.some((item) => item.textContent === "Why devices communicate"), "Home journey preview uses real Level 0 lesson data");

for (const marker of [
  "--mission-sidebar-width",
  "--ms-sidebar-width",
  ".ms-app-shell",
  ".ms-primary-nav",
  ".ms-mobile-bottom-nav",
  ".ms-home-hero",
  ".ms-home-top-row",
  ".ms-home-right-rail",
  "@media (max-width: 720px)",
  ".ms-home-grid",
  ".ms-continue-card",
  ".ms-course-layout",
  ".ms-phase-rail",
  ".ms-level-timeline",
  ".ms-phase-context",
  ".mission-visual-panel",
  ".ms-visual-layout",
  ".ms-lesson-layout",
  ".ms-lesson-step-rail li.is-active",
  ".ms-tools-grid"
]) {
  check(css.includes(marker), `CSS includes ${marker}`);
}
check(!/home-hero::after/.test(css), "Home has no empty decorative navy rectangle");
check(!/@import\s+url|url\(["']?https?:|font-face/i.test(css), "CSS does not import remote fonts or images");

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
].forEach((heading) => check(designDoc.includes(`## ${heading}`), `Design contract heading is present: ${heading}`));
check(/Final command placement QA remains a separate curriculum review/i.test(designDoc), "design doc keeps command placement QA separate");
check(/No production device access/i.test(designDoc), "design doc preserves runtime boundaries");
check(!/SME verified|final placement/i.test(appSource), "app does not claim SME verified or final placement");

check(appSource.includes("visualAssets: \"data/curriculum/lesson-visual-assets.json\""), "app loads the visual asset registry");
check(appSource.includes("renderLessonVisualPanel"), "app renders lesson visual panels");
check(appSource.includes("visualAssetForLessonStep"), "app resolves visuals by lesson and step");
check(appSource.includes("switchPreviewAssets"), "app exposes preview contract visuals without authoring Level 1");
check(appSource.includes("missionStudioComponents"), "app consumes the reusable Mission Studio component layer");
check(appSource.includes("missionStudioViews"), "app delegates primary Mission Studio screens to view renderers");
check(appSource.includes("setupMissionStudioShell") && appSource.includes("syncMissionStudioShell"), "app initializes and syncs the Mission Studio shell");
check(componentsSource.includes("aria-current") && viewsSource.includes("LessonStepRail"), "lesson stepper exposes aria-current");
check(!/function renderHome\(\)[\s\S]*?home-hero[\s\S]*?function/.test(appSource), "Home primary renderer does not use old home-hero");
check(!/function renderCourseMap\(\)[\s\S]*?document\.createElement\(\"details\"\)[\s\S]*?function/.test(appSource), "Course primary renderer does not use details accordion");
check(!/function renderTools\(\)[\s\S]*?library-grid[\s\S]*?function/.test(appSource), "Tools primary renderer does not use old library grid");
check(appSource.includes("focusLessonStepHeading"), "lesson step navigation moves focus");
check(!/"0 levels/.test(appSource), "Practice UI suppresses meaningless zero-level counts");
check(!/"0 command mappings/.test(appSource), "Practice UI suppresses meaningless zero-command counts");
check(!/0 mapped commands/.test(missionStateSource), "Course UI suppresses meaningless zero mapped-command counts");
check(!missionStateSource.includes("Prerequisite: ${prerequisites.join"), "Course UI avoids raw prerequisite ids");
check(appSource.includes("Detailed path mapping is planned"), "Practice UI uses honest planned-state language");
check(appSource.includes("Command mapping is provisional"), "Practice UI labels provisional command mapping");

check(schema.properties?.schema_version?.const === "lesson-visual-assets.v1", "visual schema declares v1 and does not allow undefined");
const validation = await validateVisualAssetRegistry(registry, schema, { assetExists: exists });
check(validation.valid, `visual asset registry validates: ${validation.errors.join("; ")}`);
const noSchemaVersion = await validateVisualAssetRegistry({ ...clone(registry), schema_version: undefined }, schema, { assetExists: exists });
check(!noSchemaVersion.valid, "visual schema validation rejects undefined schema version");

const fixtureChecks = [
  ["missing alt_text", (draft) => { delete draft.assets[0].alt_text; }, "alt_text"],
  ["missing text_alternative", (draft) => { delete draft.assets[0].text_alternative; }, "text_alternative"],
  ["remote local_asset_path", (draft) => { draft.assets[0].local_asset_path = "https://example.test/asset.svg"; }, "local_asset_path"],
  ["remote dependency", (draft) => { draft.assets[0].remote_dependencies = ["https://example.test/font.css"]; }, "remote dependency"],
  ["unknown visual component", (draft) => { draft.assets[0].visual_components.push("unapproved_visual"); }, "unknown visual component"],
  ["missing asset file", (draft) => { draft.assets[0].local_asset_path = "data/curriculum/missing-visual-review-fixture.svg"; }, "missing asset file"],
  ["invalid step ID", (draft) => { draft.assets[0].step_ids.push("bad_step"); }, "invalid step ID"],
  ["unexpected property", (draft) => { draft.assets[0].unexpected_review_field = true; }, "unexpected property"]
];
for (const [name, mutate, expected] of fixtureChecks) {
  const draft = clone(registry);
  mutate(draft);
  const result = await validateVisualAssetRegistry(draft, schema, { assetExists: exists });
  check(!result.valid && result.errors.some((error) => error.includes(expected)), `visual schema rejects ${name}`);
}

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
  check(asset?.rights_status === "original_command_doctor_asset", `${lessonId} visual asset has rights metadata`);
  check((asset?.evidence_requirements || []).length >= 3, `${lessonId} visual asset has evidence requirements`);
  check((asset?.remote_dependencies || []).length === 0, `${lessonId} visual asset has no remote dependencies`);
  check(await exists(asset.local_asset_path), `${asset.local_asset_path} exists`);
  const svg = await read(asset.local_asset_path);
  check(!/<script|(?:href|src)=["']https?:|@import\s+url/i.test(svg), `${asset.local_asset_path} has no remote references or scripts`);
}

const previewAssets = registry.assets.filter((asset) => asset.status === "preview_contract");
check(previewAssets.length === 4, "four switch preview contract assets are present");
for (const asset of previewAssets) {
  check(asset.level_id === "level_01", `${asset.asset_id} remains a Level 1 preview`);
  check(asset.content_status === "preview_contract_not_authored_lesson", `${asset.asset_id} does not claim authored content`);
  check(asset.rights_status === "original_command_doctor_asset", `${asset.asset_id} has rights metadata`);
  check(asset.generic_model_scope.includes("no_vendor_model"), `${asset.asset_id} avoids real vendor model claims`);
  check(await exists(asset.local_asset_path), `${asset.local_asset_path} exists`);
}

const lessons = model.createLevel0Lessons();
for (const [lessonId, assetId] of requiredLessons) {
  const lesson = lessons.find((item) => item.lesson_id === lessonId);
  check(lesson?.visual_asset_id === assetId, `${lessonId} model keeps stable visual asset id`);
}

check(model.TECHNICIAN_TOOLS.length === 9, "all nine tool destinations are modeled");
for (const tool of model.TECHNICIAN_TOOLS) {
  const destination = model.toolDestination(tool.id);
  check(destination?.view, `${tool.id} has a destination view`);
}
check(model.homeStateForPath("zero", { lessonTitle: "What is a network?" }).primaryAction.label === "Continue Level 0", "Home adapts to the learning path");
check(model.homeStateForPath("practice").primaryAction.libraryTab === "practice", "Practice path Home action opens Practice Library");
check(model.restoreLevel0State({ current_step_id: "unknown" }, lessons).current_step_id === "mission", "invalid lesson step is restored safely");

const futureKeys = new Set((registry.future_visual_contracts || []).map((item) => item.lesson_key));
for (const key of ["what_is_a_switch", "switch_ports_and_leds", "what_is_a_router", "vlan_and_trunk_foundations"]) {
  check(futureKeys.has(key), `future visual contract includes ${key}`);
}

for (const marker of [
  "mkdtemp",
  "Emulation.setDeviceMetricsOverride",
  "Emulation.setPageScaleFactor",
  "localStorage.clear",
  "document.fonts",
  "decode()",
  "requestAnimationFrame(() => requestAnimationFrame",
  "clickVisibleText",
  "Page.captureScreenshot",
  "screenshot_sha256",
  "active_root_rectangle",
  "document_scroll_width",
  "horizontal_overflow",
  "focused_element",
  "console_errors",
  "contrast_results",
  "computed contrast",
  "content_width_ratio",
  "desktop-onboarding",
  "desktop-home-zero",
  "desktop-home-practice-path",
  "desktop-home-technician-path",
  "desktop-home-recent-activity",
  "desktop-home-empty-activity",
  "desktop-navigation-focus",
  "desktop-1280-home-zero",
  "mobile-onboarding",
  "mobile-home-zero",
  "mobile-home-bottom-scroll",
  "mobile-navigation-focus"
]) {
  check(browserReviewSource.includes(marker), `browser review runner includes ${marker}`);
}
for (const failureId of [
  "desktop onboarding narrow content strip",
  "desktop home narrow content strip",
  "desktop shell old layout reuse",
  "desktop mission hero missing visual",
  "mobile home partial viewport",
  "mobile bottom navigation overlap",
  "screenshot metric mismatch"
]) {
  check(browserReviewSource.includes(failureId) || failureId === "screenshot metric mismatch", `Review screenshot guard exists: ${failureId}`);
}
check(browserReviewSource.includes("0.88") && browserReviewSource.includes("0.8"), "browser review runner enforces mobile and desktop content width thresholds");
check(browserReviewSource.includes("duplicate fixed nav in full-page capture"), "browser review runner checks duplicate fixed mobile nav risk");
check(browserReviewSource.includes("Initial render stability failed"), "browser review runner checks initial render stability");
check(browserReviewSource.includes("visible_navigation_count"), "browser review runner checks one visible desktop and mobile navigation");
check(browserReviewSource.includes("--base-url") || browserReviewSource.includes("externalBaseUrl"), "browser review runner can reuse an existing app URL");

check(protectedHashSource.includes('normalizationPolicy = "raw-byte-sha256"'), "protected hash report documents raw-byte SHA-256 policy");
check(protectedHashSource.includes("process.env.GIT || \"git\""), "protected hash report uses portable Git resolution");

const protectedFiles = new Set([
  "src/switch-runtime.js",
  "src/lab-engine.js",
  "sw.js",
  "data/generated/command-inventory.json",
  "data/generated/route-inventory.json",
  "data/platforms/switch-profiles.json",
  "data/curriculum/curriculum-command-placement.json"
]);
const gitExecutable = process.env.GIT || "git";
const diffNames = gitDiffNames(gitExecutable);
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
  switch_preview_assets: previewAssets.length,
  future_contracts: registry.future_visual_contracts.length,
  protected_files_checked: protectedFiles.size,
  git_executable: gitExecutable,
  browser_review_runner: "tools/browser-review/mission-studio-browser-review.mjs"
}, null, 2));
