"use strict";

(function exposeMissionStudioTokens(global) {
  const colors = Object.freeze({
    canvas: "#eef3f7",
    surface: "#ffffff",
    surfaceSoft: "#f7fafc",
    ink: "#17212b",
    muted: "#5c6b7a",
    line: "#d7e0e7",
    accent: "#0f7a75",
    accentDark: "#095b58",
    action: "#1769e0",
    success: "#16825d",
    warning: "#a35e00",
    risk: "#b3261e",
    navy: "#071633"
  });

  const spacing = Object.freeze({
    xs: "4px",
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "24px",
    xxl: "32px"
  });

  const radius = Object.freeze({
    control: "6px",
    card: "8px",
    panel: "8px"
  });

  const shadows = Object.freeze({
    panel: "0 18px 45px rgba(35, 49, 64, 0.12)",
    soft: "0 10px 28px rgba(35, 49, 64, 0.08)"
  });

  const navigation = Object.freeze({
    desktopWidth: "244px",
    mobileHeight: "72px",
    views: ["Home", "Course", "Practice", "Progress", "Tools"]
  });

  const api = Object.freeze({ colors, spacing, radius, shadows, navigation });
  global.CommandDoctorMissionStudioTokens = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
