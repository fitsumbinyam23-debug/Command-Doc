"use strict";

(function exposeMissionStudioShell(global) {
  function components() {
    return global.CommandDoctorMissionStudioComponents;
  }

  function render(documentRef, description) {
    return components()?.renderDescription(documentRef, description);
  }

  function activeViewFromDocument(documentRef) {
    const active = documentRef.querySelector(".view.active");
    return active?.id?.replace(/View$/, "") || "home";
  }

  function setupMissionStudioShell(documentRef, { getPathLabel, onNavigate } = {}) {
    documentRef.body.classList.add("mission-studio-shell");
    const legacyShell = documentRef.querySelector(".app-shell");
    if (!legacyShell || documentRef.querySelector(".ms-app-shell")) {
      syncMissionStudioShell(documentRef, {
        activeView: activeViewFromDocument(documentRef),
        pathLabel: typeof getPathLabel === "function" ? getPathLabel() : "Choose a path",
        onNavigate
      });
      return;
    }

    const legacyMain = legacyShell.querySelector(".main-panel");
    const views = Array.from(legacyMain?.querySelectorAll(":scope > .view") || documentRef.querySelectorAll(".view"));
    const shell = render(documentRef, components().MissionStudioShell({
      activeView: activeViewFromDocument(documentRef),
      pathLabel: typeof getPathLabel === "function" ? getPathLabel() : "Choose a path",
      onNavigate
    }));
    const main = shell.querySelector(".ms-shell-main");
    views.forEach((view) => main.append(view));
    legacyShell.replaceWith(shell);

    syncMissionStudioShell(documentRef, {
      activeView: activeViewFromDocument(documentRef),
      pathLabel: typeof getPathLabel === "function" ? getPathLabel() : "Choose a path",
      onNavigate
    });
  }

  function syncMissionStudioShell(documentRef, { activeView = "home", pathLabel = "Choose a path", onNavigate } = {}) {
    const navButtons = Array.from(documentRef.querySelectorAll("[data-ms-primary-nav='true']"));
    navButtons.forEach((button) => {
      const active = button.dataset.view === activeView;
      button.classList.toggle("is-active", active);
      button.classList.toggle("active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
      if (typeof onNavigate === "function" && !button.dataset.msBound) {
        button.addEventListener("click", () => onNavigate(button.dataset.view || "home"));
        button.dataset.msBound = "true";
      }
    });

    documentRef.querySelectorAll("[data-ms-path-summary], [data-ms-mobile-path]").forEach((node) => {
      node.textContent = pathLabel;
    });

    const shell = documentRef.querySelector(".ms-app-shell");
    if (shell) shell.dataset.activeView = activeView;
    const mobileHeader = documentRef.querySelector(".ms-mobile-header");
    const current = components()?.navItems?.find((item) => item.view === activeView);
    const pageLabel = mobileHeader?.querySelector(".ms-mobile-page > span");
    if (pageLabel && current) pageLabel.textContent = current.label;
  }

  const api = Object.freeze({ setupMissionStudioShell, syncMissionStudioShell });
  global.CommandDoctorMissionStudioShell = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
