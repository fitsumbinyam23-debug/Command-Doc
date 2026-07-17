"use strict";

(function exposeMissionStudioTokens(global) {
  const colors = Object.freeze({
    canvas: "#eef3f7",
    pageBackground: "#eef4f8",
    surface: "#ffffff",
    surfaceSoft: "#f7fafc",
    surfaceElevated: "#ffffff",
    ink: "#17212b",
    textPrimary: "#101828",
    muted: "#5c6b7a",
    textSecondary: "#455468",
    line: "#d7e0e7",
    border: "#d3deea",
    accent: "#0f7a75",
    accentDark: "#095b58",
    action: "#1769e0",
    primaryAction: "#1664e8",
    success: "#16825d",
    completedGreen: "#16825d",
    warning: "#a35e00",
    warningAmber: "#a35e00",
    risk: "#b3261e",
    riskRed: "#b3261e",
    navy: "#071633",
    sidebarBackground: "#061733",
    heroNavy: "#071a3c",
    focus: "#64b5ff"
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
    panel: "8px",
    feature: "12px"
  });

  const shadows = Object.freeze({
    panel: "0 18px 45px rgba(35, 49, 64, 0.12)",
    elevated: "0 18px 44px rgba(22, 35, 54, 0.12)",
    soft: "0 10px 28px rgba(35, 49, 64, 0.08)"
  });

  const navigation = Object.freeze({
    desktopWidth: "244px",
    mobileHeight: "72px",
    mobileHeaderHeight: "64px",
    mobileBottomHeight: "76px",
    contentMax: "1180px",
    views: ["Home", "Course", "Practice", "Progress", "Tools"]
  });

  const api = Object.freeze({ colors, spacing, radius, shadows, navigation });
  global.CommandDoctorMissionStudioTokens = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
