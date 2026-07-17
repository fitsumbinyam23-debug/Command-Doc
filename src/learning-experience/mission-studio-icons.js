"use strict";

(function exposeMissionStudioIcons(global) {
  const navSymbols = Object.freeze({
    home: "home",
    course: "course",
    practice: "practice",
    progress: "progress",
    tools: "tools"
  });

  const toolSymbols = Object.freeze({
    diagnose: "pulse",
    "command-lookup": "search",
    "focused-terminal": "terminal",
    "guided-cli": "route",
    "switch-workbench": "switch",
    "visual-playground": "cube",
    "practice-library": "book",
    "knowledge-base": "bulb",
    "saved-reports": "report"
  });

  const paths = Object.freeze({
    home: [
      ["path", { d: "M4 11.5 12 5l8 6.5" }],
      ["path", { d: "M6.5 10.5V20h11v-9.5" }],
      ["path", { d: "M10 20v-5h4v5" }]
    ],
    course: [
      ["path", { d: "M5 6.5h8a4 4 0 0 1 4 4V20H9a4 4 0 0 0-4 4V6.5Z", transform: "translate(0 -2)" }],
      ["path", { d: "M17 6.5h2v13.5" }],
      ["path", { d: "M8.5 9h5" }],
      ["path", { d: "M8.5 12h4" }]
    ],
    practice: [
      ["path", { d: "M6 7h12" }],
      ["path", { d: "M7 12h10" }],
      ["path", { d: "M8 17h8" }],
      ["circle", { cx: "6", cy: "7", r: "2" }],
      ["circle", { cx: "7", cy: "12", r: "2" }],
      ["circle", { cx: "8", cy: "17", r: "2" }]
    ],
    progress: [
      ["path", { d: "M5 19V9" }],
      ["path", { d: "M12 19V5" }],
      ["path", { d: "M19 19v-7" }],
      ["path", { d: "M4 19h16" }]
    ],
    tools: [
      ["path", { d: "M14.5 5.5a4.5 4.5 0 0 0 4 6.7l-6.3 6.3a3 3 0 1 1-4.2-4.2l6.3-6.3a4.5 4.5 0 0 0 .2-2.5Z" }],
      ["path", { d: "m8.5 15.5 2 2" }]
    ],
    pulse: [
      ["path", { d: "M3 13h4l2-6 4 12 2-6h6" }]
    ],
    search: [
      ["circle", { cx: "10.5", cy: "10.5", r: "5.5" }],
      ["path", { d: "m15 15 5 5" }]
    ],
    terminal: [
      ["path", { d: "m5 8 4 4-4 4" }],
      ["path", { d: "M11 17h8" }],
      ["rect", { x: "3", y: "5", width: "18", height: "14", rx: "2" }]
    ],
    route: [
      ["circle", { cx: "6", cy: "7", r: "2" }],
      ["circle", { cx: "18", cy: "17", r: "2" }],
      ["path", { d: "M8 7h4a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h7" }]
    ],
    switch: [
      ["rect", { x: "4", y: "8", width: "16", height: "9", rx: "2" }],
      ["path", { d: "M7 12h2M11 12h2M15 12h2" }],
      ["path", { d: "M8 17v2M16 17v2" }]
    ],
    cube: [
      ["path", { d: "m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" }],
      ["path", { d: "m4 7.5 8 4.5 8-4.5" }],
      ["path", { d: "M12 12v9" }]
    ],
    book: [
      ["path", { d: "M5 5.5h8a3 3 0 0 1 3 3V20H8a3 3 0 0 0-3 3V5.5Z", transform: "translate(0 -2)" }],
      ["path", { d: "M16 6h3v14" }]
    ],
    bulb: [
      ["path", { d: "M9 18h6" }],
      ["path", { d: "M10 21h4" }],
      ["path", { d: "M8 11a4 4 0 1 1 8 0c0 2-1.5 3-2.3 4h-3.4C9.5 14 8 13 8 11Z" }]
    ],
    report: [
      ["path", { d: "M7 3h7l4 4v14H7V3Z" }],
      ["path", { d: "M14 3v5h4" }],
      ["path", { d: "M9.5 13h5" }],
      ["path", { d: "M9.5 17h4" }]
    ],
    shield: [
      ["path", { d: "M12 3 19 6v5.5c0 4-2.8 7.2-7 9.5-4.2-2.3-7-5.5-7-9.5V6l7-3Z" }],
      ["path", { d: "m9 12 2 2 4-5" }]
    ],
    signal: [
      ["path", { d: "M5 18a10 10 0 0 1 14 0" }],
      ["path", { d: "M8 15a6 6 0 0 1 8 0" }],
      ["path", { d: "M11 12a2 2 0 0 1 2 0" }],
      ["circle", { cx: "12", cy: "19", r: "1" }]
    ],
    briefcase: [
      ["rect", { x: "4", y: "8", width: "16", height: "11", rx: "2" }],
      ["path", { d: "M9 8V6.5A2.5 2.5 0 0 1 11.5 4h1A2.5 2.5 0 0 1 15 6.5V8" }],
      ["path", { d: "M4 13h16" }]
    ],
    code: [
      ["path", { d: "m8 8-4 4 4 4" }],
      ["path", { d: "m16 8 4 4-4 4" }],
      ["path", { d: "m14 5-4 14" }]
    ],
    play: [
      ["path", { d: "M8 5v14l11-7-11-7Z" }]
    ],
    network: [
      ["rect", { x: "4", y: "5", width: "16", height: "6", rx: "2" }],
      ["path", { d: "M7 15h10" }],
      ["path", { d: "M12 11v8" }],
      ["circle", { cx: "7", cy: "18", r: "2" }],
      ["circle", { cx: "17", cy: "18", r: "2" }]
    ],
    flag: [
      ["path", { d: "M6 21V4" }],
      ["path", { d: "M6 5h11l-2 4 2 4H6" }]
    ],
    arrow: [
      ["path", { d: "M5 12h14" }],
      ["path", { d: "m13 6 6 6-6 6" }]
    ]
  });

  function icon(name, className = "ms-icon") {
    const segments = paths[name] || paths.tools;
    return {
      tag: "svg",
      props: {
        className,
        ariaHidden: "true",
        attrs: {
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          "stroke-width": "2",
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
          focusable: "false"
        }
      },
      children: Object.freeze(segments.map(([tag, attrs]) => Object.freeze({ tag, props: Object.freeze({ attrs: Object.freeze(attrs) }), children: Object.freeze([]) })))
    };
  }

  function navSymbol(iconName) {
    return navSymbols[iconName] || "tools";
  }

  function toolSymbol(toolId) {
    return toolSymbols[toolId] || "tools";
  }

  const api = Object.freeze({ navSymbols, toolSymbols, navSymbol, toolSymbol, icon });
  global.CommandDoctorMissionStudioIcons = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
