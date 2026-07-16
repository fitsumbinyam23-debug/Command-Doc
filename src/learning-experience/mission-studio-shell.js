"use strict";

(function exposeMissionStudioShell(global) {
  function setupMissionStudioShell(documentRef, { getPathLabel } = {}) {
    documentRef.body.classList.add("mission-studio-shell");
    const sidebar = documentRef.querySelector(".sidebar");
    const main = documentRef.querySelector(".main-panel");
    const brand = sidebar?.querySelector(".brand");
    const status = sidebar?.querySelector(".status-stack");
    if (sidebar) sidebar.classList.add("ms-desktop-sidebar");
    if (main) main.classList.add("ms-main-panel");
    if (brand) {
      brand.classList.add("ms-product-lockup");
      const mark = brand.querySelector(".brand-mark");
      if (mark) mark.classList.add("ms-product-mark");
    }
    let summary = documentRef.querySelector(".ms-sidebar-summary");
    if (!summary && status) {
      summary = documentRef.createElement("section");
      summary.className = "ms-sidebar-summary";
      summary.setAttribute("aria-label", "Learning path");
      summary.innerHTML = "<strong>Your mission</strong><p data-ms-path-summary></p>";
      status.replaceWith(summary);
    }
    let mobileHeader = documentRef.querySelector(".ms-mobile-product-header");
    if (!mobileHeader && main) {
      mobileHeader = documentRef.createElement("header");
      mobileHeader.className = "ms-mobile-product-header";
      mobileHeader.setAttribute("aria-label", "Command Doctor");
      mobileHeader.innerHTML = "<span class=\"ms-product-mark\" aria-hidden=\"true\">CD</span><div><strong>Command Doctor</strong><span data-ms-mobile-path></span></div>";
      main.prepend(mobileHeader);
    }
    syncMissionStudioShell(documentRef, {
      activeView: documentRef.querySelector(".nav-tab.active")?.dataset.view || "home",
      pathLabel: typeof getPathLabel === "function" ? getPathLabel() : "Choose a path"
    });
  }

  function syncMissionStudioShell(documentRef, { activeView = "home", pathLabel = "Choose a path" } = {}) {
    documentRef.querySelectorAll(".nav-tab").forEach((tab) => {
      const active = tab.dataset.view === activeView;
      tab.classList.toggle("is-active", active);
      if (active) tab.setAttribute("aria-current", "page");
      else tab.removeAttribute("aria-current");
    });
    documentRef.querySelectorAll("[data-ms-path-summary], [data-ms-mobile-path]").forEach((node) => {
      node.textContent = pathLabel;
    });
  }

  const api = Object.freeze({ setupMissionStudioShell, syncMissionStudioShell });
  global.CommandDoctorMissionStudioShell = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
