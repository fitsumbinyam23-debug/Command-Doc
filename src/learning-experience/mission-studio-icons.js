"use strict";

(function exposeMissionStudioIcons(global) {
  const navSymbols = Object.freeze({
    home: "HM",
    course: "CR",
    practice: "PR",
    progress: "PG",
    tools: "TL"
  });

  const toolSymbols = Object.freeze({
    diagnose: "DX",
    "command-lookup": "CL",
    "focused-terminal": ">_",
    "guided-cli": "GC",
    "switch-workbench": "SW",
    "visual-playground": "VP",
    "practice-library": "PL",
    "knowledge-base": "KB",
    "saved-reports": "SR"
  });

  function navSymbol(icon) {
    return navSymbols[icon] || "CD";
  }

  function toolSymbol(toolId) {
    return toolSymbols[toolId] || "TL";
  }

  const api = Object.freeze({ navSymbols, toolSymbols, navSymbol, toolSymbol });
  global.CommandDoctorMissionStudioIcons = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
