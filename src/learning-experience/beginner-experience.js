"use strict";

(function exposeBeginnerExperience(global) {
  const STORAGE_KEYS = Object.freeze({
    path: "command-doctor.learning-path",
    level0: "command-doctor.level-0-progress"
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
    { id: "diagnose", label: "Diagnose", view: "diagnose" },
    { id: "command-lookup", label: "Command Lookup", view: "diagnose" },
    { id: "focused-terminal", label: "Focused Terminal", view: "lab", labScreen: "cli" },
    { id: "guided-cli", label: "Guided CLI", view: "lab", labScreen: "guided-cli" },
    { id: "switch-workbench", label: "Switch Workbench", view: "lab", labScreen: "profiles" },
    { id: "visual-playground", label: "Visual Playground", view: "lab", labScreen: "visual" },
    { id: "practice-library", label: "Practice Library", view: "library", libraryTab: "practice" },
    { id: "knowledge-base", label: "Knowledge Base", view: "knowledge" },
    { id: "saved-reports", label: "Saved Reports", view: "history" }
  ]);

  const STEPPER_STEPS = Object.freeze(["Mission", "Learn", "See", "Key words", "Predict", "Try", "Explain", "Confidence", "Continue"]);

  function defaultLevel0Progress() {
    return {
      level_id: "level_00",
      lesson_id: "level00_mission_network_technician",
      step_index: 0,
      confidence: "",
      checkpoints: {},
      updated_at: ""
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

  const api = Object.freeze({
    STORAGE_KEYS,
    PATHS,
    BEGINNER_NAVIGATION,
    TECHNICIAN_TOOLS,
    STEPPER_STEPS,
    defaultLevel0Progress,
    safeParse
  });

  global.CommandDoctorBeginnerExperience = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
