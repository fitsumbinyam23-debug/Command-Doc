"use strict";

(function exposeMissionStudioComponents(global) {
  const navItems = Object.freeze([
    { view: "home", label: "Home", icon: "home" },
    { view: "course", label: "Course", icon: "map" },
    { view: "practice", label: "Practice", icon: "terminal" },
    { view: "progress", label: "Progress", icon: "chart" },
    { view: "tools", label: "Tools", icon: "toolbox" }
  ]);

  const lessonStepper = Object.freeze([
    "Mission",
    "Learn",
    "See",
    "Key words",
    "Predict",
    "Try",
    "Explain",
    "Confidence",
    "Continue"
  ]);

  const visualComponents = Object.freeze([
    "realistic_device",
    "annotated_device_view",
    "topology",
    "sequence",
    "healthy_fault_comparison",
    "cli_to_visual_evidence",
    "text_alternative"
  ]);

  const pathCards = Object.freeze([
    { id: "zero", label: "Continue Mission", description: "Resume guided beginner lessons with visual evidence." },
    { id: "practice", label: "Open Practice", description: "Use local routes without changing real devices." },
    { id: "tools", label: "Open Tools", description: "Jump into technician surfaces for focused work." }
  ]);

  const api = Object.freeze({ navItems, lessonStepper, visualComponents, pathCards });
  global.CommandDoctorMissionStudioComponents = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
