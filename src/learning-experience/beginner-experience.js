"use strict";

(function exposeBeginnerExperience(global) {
  const STORAGE_KEYS = Object.freeze({
    path: "command-doctor.learning-path",
    level0: "command-doctor.level-0-progress",
    recentTool: "command-doctor.recent-technician-tool"
  });

  const PATHS = Object.freeze([
    { id: "zero", label: "Learn From Zero", description: "Start with plain-language networking concepts before command syntax." },
    { id: "practice", label: "Practise and Specialize", description: "Open practice routes and planned specialization paths when you already know the basics." },
    { id: "tools", label: "Technician Tools", description: "Go straight to local diagnostic and reference tools." }
  ]);

  const BEGINNER_NAVIGATION = Object.freeze([
    { view: "home", label: "Home" },
    { view: "course", label: "Course" },
    { view: "practice", label: "Practice" },
    { view: "progress", label: "Progress" },
    { view: "tools", label: "Tools" }
  ]);

  const TECHNICIAN_TOOLS = Object.freeze([
    { id: "diagnose", label: "Diagnose", view: "diagnose", description: "Paste output and build an evidence-first diagnostic summary." },
    { id: "command-lookup", label: "Command Lookup", view: "diagnose", description: "Search the command catalog and focus the command search field." },
    { id: "focused-terminal", label: "Focused Terminal", view: "lab", labScreen: "cli", description: "Open a continuous simulated terminal for manual practice." },
    { id: "guided-cli", label: "Guided CLI", view: "lab", labScreen: "guided-cli", description: "Follow a local guided route with concise coaching." },
    { id: "switch-workbench", label: "Switch Workbench", view: "lab", labScreen: "workbench", description: "Inspect a shared simulated switch state, pending changes, and verification." },
    { id: "visual-playground", label: "Visual Playground", view: "lab", labScreen: "visual", description: "Build a small local topology and inspect simulated links." },
    { id: "practice-library", label: "Practice Library", view: "library", libraryTab: "practice", description: "Browse authored local practice routes and route filters." },
    { id: "knowledge-base", label: "Knowledge Base", view: "knowledge", description: "Review local command and evidence reference files." },
    { id: "saved-reports", label: "Saved Reports", view: "history", description: "Open reports saved only in this browser." }
  ]);

  const STEPPER_STEPS = Object.freeze(["Mission", "Learn", "See", "Key words", "Predict", "Try", "Explain", "Confidence", "Continue"]);
  const STEP_IDS = Object.freeze(["mission", "learn", "see", "key_words", "predict", "try", "explain", "confidence", "continue"]);
  const LEVEL0_VISUAL_ASSETS = Object.freeze({
    level00_what_is_a_network: "level0_network_shared_service",
    level00_why_devices_communicate: "level0_device_request_response",
    level00_lan_wan_and_the_internet: "level0_lan_wan_internet_scope",
    level00_real_devices_versus_command_doctor_simulation: "level0_simulation_production_boundary"
  });

  const level0Lessons = Object.freeze([
    lesson("what_is_a_network", "What is a network?", ["network", "device", "connection", "service"], "A guest laptop reaches a booking page because several devices pass information along.", "Two or more devices connected so they can exchange useful information.", "Guest laptop -> wall port -> switch -> gateway -> booking service.", "Which phrase best describes a network?", ["Devices connected to communicate", "One unplugged cable", "A password list"], 0, "The important idea is communication between connected devices.", "Choose the picture that shows devices sharing a service.", "You can explain what a network is in one sentence.", "Continue to why devices communicate."),
    lesson("why_devices_communicate", "Why devices communicate", ["endpoint", "server", "request", "response"], "A POS terminal sends a payment request and receives an approval response.", "Devices communicate to request, deliver, confirm, or update information.", "POS terminal asks -> payment service answers -> receipt prints.", "Why does a client send data to a server?", ["To request or update a service", "To make the cable longer", "To erase the switch"], 0, "Communication has a purpose: a request, response, or update.", "Pick the request and response in the example.", "You can name a reason devices talk.", "Continue to LAN, WAN and internet."),
    lesson("lan_wan_and_the_internet", "LAN, WAN and the internet", ["LAN", "WAN", "internet", "site"], "A resort office printer is local, while a cloud booking platform is reached through the internet.", "A LAN is local to a room, floor, or site. A WAN links sites. The internet links to public services.", "Room LAN -> hotel network -> ISP/WAN -> internet service.", "Which problem is most likely local?", ["Only one room printer fails", "Every public website fails worldwide", "A vendor cloud region is down"], 0, "Scope matters: local failures and external failures need different evidence.", "Sort three examples into LAN, WAN, and internet.", "You can separate local and remote network scope.", "Continue to the technician role."),
    lesson("what_a_network_technician_does", "What a network technician does", ["symptom", "evidence", "scope", "verify"], "A CCTV camera is offline; the technician checks link state before changing VLANs.", "A technician defines the problem, gathers evidence, changes only with approval, verifies, and documents.", "Symptom -> evidence -> safe action -> verification -> note.", "What should come before a configuration change?", ["Evidence and scope", "Guessing", "Reloading every device"], 0, "Safe technicians use evidence before action.", "Build a short symptom/evidence/next-step note.", "You can describe the technician workflow.", "Continue to simulation boundaries."),
    lesson("real_devices_versus_command_doctor_simulation", "Real devices versus Command Doctor simulation", ["simulation", "production", "local", "safe"], "A simulated switch can teach command order without touching a guest-room switch.", "Command Doctor is local training. Production devices are real systems with guest and business impact.", "Simulation sandbox || production network; the boundary must stay clear.", "Where should a first attempt happen?", ["Local simulation", "Production core switch", "Unknown live device"], 0, "Practice belongs in simulation until approved production work exists.", "Choose whether examples are simulated or production-impacting.", "You can explain the simulation boundary.", "Continue to safe learning rules."),
    lesson("safe_learning_rules", "Safe learning rules", ["read-only", "approval", "rollback", "save"], "A read-only command is safe evidence; saving a wrong config can preserve an outage.", "Start read-only, avoid unsupported changes, verify before save, and know rollback before action.", "Read-only evidence -> approved change -> verify -> save or rollback.", "Which action is safest first?", ["Run a read-only check", "Save an unverified change", "Disable a random port"], 0, "Safe order protects users and services.", "Choose the safe first action in three mini cases.", "You can state the beginner safety order.", "Continue to the glossary."),
    lesson("beginner_glossary", "Beginner glossary", ["host", "switch", "router", "VLAN", "gateway"], "A phone, AP, and printer are hosts connected through switch ports and VLANs.", "Plain words make command output readable: hosts use links, switches connect local devices, gateways reach other networks.", "Host -> switch port -> VLAN -> gateway -> other network.", "What is a gateway used for?", ["Leaving the local network", "Naming a cable", "Cooling a rack"], 0, "Glossary words turn output into a story.", "Match each word to the simplest definition.", "You can define the core beginner terms.", "Continue to the checkpoint."),
    lesson("level_checkpoint", "Level checkpoint", ["checkpoint", "confidence", "review", "next step"], "Before command syntax, a learner proves they understand safe evidence, scope, and simulation.", "The checkpoint confirms the beginner can explain networks, scope, technician behavior, and safety boundaries.", "Question -> answer -> explanation -> confidence -> orientation complete.", "What must be true before Level 0 completes?", ["Checkpoint submitted with confidence", "All commands mastered", "A real switch changed"], 0, "Level 0 completion records orientation only, not command mastery.", "Answer the Level 0 checkpoint question.", "You can decide whether to review or continue.", "Return to the course map or open practice when ready.")
  ]);

  function lesson(id, title, keyWords, mission, learn, see, question, choices, correctIndex, explanation, tryPrompt, confidencePrompt, nextAction) {
    return {
      lesson_id: `level00_${id}`,
      title,
      content_status: "authored",
      objective: `Explain ${title} in beginner language.`,
      mission,
      learn,
      see,
      key_words: keyWords,
      predict: { question, answer_choices: choices, correct_index: correctIndex, explanation },
      tryInteraction: { prompt: tryPrompt, answer_choices: choices, correct_index: correctIndex, explanation },
      explain: explanation,
      confidence_prompt: confidencePrompt,
      continue: nextAction,
      completion_requirements: id === "level_checkpoint" ? ["prediction", "try", "explanation", "confidence", "final_checkpoint"] : ["prediction", "try", "explanation", "confidence"],
      mastery_eligible: false,
      review_eligible: true
    };
  }

  function createLevel0Lessons() {
    return level0Lessons.map((item) => ({
      ...item,
      key_words: [...item.key_words],
      stepper_steps: [...STEPPER_STEPS],
      visual_asset_id: LEVEL0_VISUAL_ASSETS[item.lesson_id] || ""
    }));
  }

  function createLevel0State(lessons = createLevel0Lessons()) {
    return {
      current_lesson_id: lessons[0]?.lesson_id || "level00_what_is_a_network",
      current_step_id: "mission",
      completed_lesson_ids: [],
      prediction_responses: {},
      try_responses: {},
      explanation_responses: {},
      confidence_by_lesson: {},
      final_checkpoint_result: null,
      level_complete: false,
      resume_timestamp: "",
      mastery: { concept_orientation: false }
    };
  }

  function safeParse(value, fallback) {
    try {
      const parsed = JSON.parse(value || "");
      return parsed && typeof parsed === "object" ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  function restoreLevel0State(candidate, lessons = createLevel0Lessons()) {
    const base = createLevel0State(lessons);
    const lessonIds = new Set(lessons.map((item) => item.lesson_id));
    const stepIds = new Set(STEP_IDS);
    const restored = { ...base, ...(candidate || {}) };
    if (!lessonIds.has(restored.current_lesson_id)) restored.current_lesson_id = base.current_lesson_id;
    if (!stepIds.has(restored.current_step_id)) restored.current_step_id = "mission";
    restored.completed_lesson_ids = (restored.completed_lesson_ids || []).filter((id) => lessonIds.has(id));
    restored.prediction_responses ||= {};
    restored.try_responses ||= {};
    restored.explanation_responses ||= {};
    restored.confidence_by_lesson ||= {};
    restored.mastery = { concept_orientation: Boolean(restored.level_complete) };
    delete restored.mastery.practical_execution;
    delete restored.mastery.verification;
    return restored;
  }

  function currentIndexes(state, lessons) {
    const lessonIndex = Math.max(0, lessons.findIndex((item) => item.lesson_id === state.current_lesson_id));
    const stepIndex = Math.max(0, STEP_IDS.indexOf(state.current_step_id));
    return { lessonIndex, stepIndex };
  }

  function cloneState(state) {
    return JSON.parse(JSON.stringify(state));
  }

  function blocked(state, reason) {
    return { state, blocked: true, reason };
  }

  function advanceLevel0(inputState, lessons = createLevel0Lessons(), action = {}) {
    const state = restoreLevel0State(cloneState(inputState), lessons);
    const { lessonIndex, stepIndex } = currentIndexes(state, lessons);
    const lesson = lessons[lessonIndex];
    if (action.interaction) {
      if (action.interaction === "prediction") state.prediction_responses[lesson.lesson_id] = { value: action.value, correct: action.value === lesson.predict.answer_choices[lesson.predict.correct_index] };
      if (action.interaction === "try") state.try_responses[lesson.lesson_id] = { value: action.value, correct: action.value === lesson.tryInteraction.answer_choices[lesson.tryInteraction.correct_index] };
      if (action.interaction === "explanation") state.explanation_responses[lesson.lesson_id] = { value: String(action.value || "").trim() };
      if (action.interaction === "confidence") state.confidence_by_lesson[lesson.lesson_id] = action.value;
      if (action.interaction === "checkpoint") state.final_checkpoint_result = { submitted: true, passed: Boolean(action.passed ?? true), score: Number(action.score ?? 100) };
      state.resume_timestamp = new Date(0).toISOString();
      return { state, blocked: false };
    }
    if (action.direction === "previous") {
      if (stepIndex > 0) state.current_step_id = STEP_IDS[stepIndex - 1];
      else if (lessonIndex > 0) {
        state.current_lesson_id = lessons[lessonIndex - 1].lesson_id;
        state.current_step_id = "continue";
      }
      return { state, blocked: false };
    }
    if (action.direction !== "next") return { state, blocked: false };
    if (state.current_step_id === "predict" && !state.prediction_responses[lesson.lesson_id]) return blocked(state, "Complete the prediction interaction before continuing.");
    if (state.current_step_id === "try" && !state.try_responses[lesson.lesson_id]) return blocked(state, "Complete the Try interaction before continuing.");
    if (state.current_step_id === "explain" && !state.explanation_responses[lesson.lesson_id]?.value) return blocked(state, "Enter an explanation or checkpoint response before continuing.");
    if (state.current_step_id === "confidence" && !state.confidence_by_lesson[lesson.lesson_id]) return blocked(state, "Record confidence before completing this lesson.");
    if (state.current_step_id === "continue") {
      if (lesson.completion_requirements.includes("final_checkpoint") && !state.final_checkpoint_result?.submitted) return blocked(state, "Submit the final checkpoint before Level 0 completes.");
      if (!state.completed_lesson_ids.includes(lesson.lesson_id)) state.completed_lesson_ids.push(lesson.lesson_id);
      if (lessonIndex + 1 < lessons.length) {
        state.current_lesson_id = lessons[lessonIndex + 1].lesson_id;
        state.current_step_id = "mission";
      } else {
        state.level_complete = true;
        state.mastery = { concept_orientation: true };
      }
      return { state, blocked: false };
    }
    state.current_step_id = STEP_IDS[stepIndex + 1];
    return { state, blocked: false };
  }

  function applyPathChoice(pathId) {
    if (pathId === "practice") return { path: "practice", view: "practice", announcement: "Practise and Specialize selected. Practice is open." };
    if (pathId === "tools") return { path: "tools", view: "tools", announcement: "Technician Tools selected. Tools are open." };
    return { path: "zero", view: "course", courseScreen: "lesson", announcement: "Learn From Zero selected. Level 0 is open." };
  }

  function pathLabel(pathId) {
    return PATHS.find((item) => item.id === pathId)?.label || "Choose a path";
  }

  function homeStateForPath(pathId, context = {}) {
    if (!pathId) return { label: "Choose a path", primaryAction: { label: "Start Level 0", view: "course", courseScreen: "lesson" }, journeyCards: PATHS.map((item) => item.id) };
    if (pathId === "practice") return { label: pathLabel(pathId), primaryAction: { label: "Open Practice Library", view: "library", libraryTab: "practice" }, journeyCards: [] };
    if (pathId === "tools") {
      const tool = toolDestination(context.lastTool || "diagnose");
      return { label: pathLabel(pathId), primaryAction: { label: `Open ${tool.label}`, view: tool.view, labScreen: tool.labScreen, libraryTab: tool.libraryTab, toolId: tool.id }, journeyCards: [] };
    }
    return { label: pathLabel(pathId), primaryAction: { label: context.lessonTitle ? "Continue Level 0" : "Start Level 0", view: "course", courseScreen: "lesson" }, journeyCards: [] };
  }

  function toolDestination(toolId) {
    return TECHNICIAN_TOOLS.find((item) => item.id === toolId || item.label === toolId) || TECHNICIAN_TOOLS[0];
  }

  function focusTargetForView(viewName) {
    return {
      home: "#homeTitle",
      course: "#courseTitle",
      practice: "#practiceTitle",
      progress: "#progressTitle",
      tools: "#toolsTitle",
      diagnose: "#diagnoseTitle",
      lab: "#labTitle",
      library: "#libraryTitle",
      knowledge: "#knowledgeTitle",
      history: "#historyTitle",
      admin: "#adminTitle"
    }[viewName] || "#homeTitle";
  }

  function focusTargetForStep(stepId) {
    return `[data-step-heading="${stepId}"]`;
  }

  function humanStatus(value) {
    return String(value || "planned").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  const api = Object.freeze({
    STORAGE_KEYS,
    PATHS,
    BEGINNER_NAVIGATION,
    TECHNICIAN_TOOLS,
    STEPPER_STEPS,
    STEP_IDS,
    LEVEL0_VISUAL_ASSETS,
    defaultLevel0Progress: createLevel0State,
    createLevel0State,
    createLevel0Lessons,
    advanceLevel0,
    restoreLevel0State,
    applyPathChoice,
    homeStateForPath,
    toolDestination,
    focusTargetForView,
    focusTargetForStep,
    humanStatus,
    pathLabel,
    safeParse
  });

  global.CommandDoctorBeginnerExperience = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
