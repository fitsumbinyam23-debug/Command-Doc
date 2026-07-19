"use strict";

(function exposeMissionStudioHomeV2View(global) {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const XLINK_NS = "http://www.w3.org/1999/xlink";

  function append(parent, children) {
    children.filter(Boolean).forEach((child) => parent.append(child));
    return parent;
  }

  function element(documentRef, tag, className = "", text = "") {
    const node = documentRef.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function icon(documentRef, model, name) {
    const svg = documentRef.createElementNS(SVG_NS, "svg");
    const use = documentRef.createElementNS(SVG_NS, "use");
    const href = `${model.assets.icons}#icon-${name}`;
    svg.setAttribute("aria-hidden", "true");
    use.setAttribute("href", href);
    use.setAttributeNS(XLINK_NS, "href", href);
    svg.append(use);
    return svg;
  }

  function actionButton(documentRef, label, className, onAction, iconName, actionName) {
    const button = element(documentRef, "button", className);
    button.type = "button";
    button.dataset.homeV2Action = actionName || "";
    button.append(documentRef.createTextNode(label));
    if (iconName) button.append(icon(documentRef, { assets: { icons: "data/mission-studio-home-v2/home-icons.svg" } }, iconName));
    if (typeof onAction === "function") button.addEventListener("click", onAction);
    return button;
  }

  function decorateProgressbar(node, percent, label) {
    const value = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
    node.setAttribute("role", "progressbar");
    node.setAttribute("aria-valuemin", "0");
    node.setAttribute("aria-valuemax", "100");
    node.setAttribute("aria-valuenow", String(value));
    node.setAttribute("aria-valuetext", `${value}%`);
    if (label) node.setAttribute("aria-label", label);
    return value;
  }

  function progressTrack(documentRef, percent, label) {
    const track = element(documentRef, "div", "progress-track");
    const value = decorateProgressbar(track, percent, label);
    const bar = element(documentRef, "span");
    bar.style.width = `${value}%`;
    track.append(bar);
    return track;
  }

  function renderHeader(documentRef, model) {
    const header = element(documentRef, "header", "welcome-row");
    const wrap = element(documentRef, "div");
    wrap.append(element(documentRef, "p", "section-kicker", model.header.kicker));
    const title = element(documentRef, "h1", "", model.header.title);
    title.id = "homeTitle";
    wrap.append(title);
    wrap.append(element(documentRef, "p", "welcome-copy", model.header.copy));
    header.append(wrap);
    return header;
  }

  function renderHero(documentRef, model) {
    const hero = element(documentRef, "article", "mission-hero");
    const content = element(documentRef, "div", "hero-content");
    content.append(element(documentRef, "p", "hero-label", model.hero.label));
    content.append(element(documentRef, "h2", "", model.hero.title));
    content.append(element(documentRef, "p", "hero-lesson", model.hero.lesson));
    content.append(element(documentRef, "p", "hero-copy", model.hero.copy));

    const progress = element(documentRef, "div", "hero-progress");
    progress.setAttribute("aria-label", "Mission progress");
    const row = element(documentRef, "div", "hero-progress-row");
    row.append(element(documentRef, "span", "", model.hero.progressLabel));
    row.append(element(documentRef, "strong", "", `${model.hero.progressPercent}%`));
    progress.append(row, progressTrack(documentRef, model.hero.progressPercent, model.hero.progressLabel));
    content.append(progress);

    const actions = element(documentRef, "div", "hero-actions");
    actions.append(
      actionButton(documentRef, "Continue Mission", "primary-action", model.actions.continueMission, "arrow", "continue"),
      actionButton(documentRef, "View path", "secondary-action", model.actions.viewPath, "", "view-path")
    );
    content.append(actions);

    const visual = element(documentRef, "div", "mission-visual");
    const image = element(documentRef, "img");
    image.src = model.assets.hero;
    image.alt = model.hero.visualAlt || "A vendor-neutral network switch training diagram.";
    visual.append(image);
    hero.append(content, visual);
    return hero;
  }

  function renderRail(documentRef, model) {
    const rail = element(documentRef, "aside", "progress-rail");
    rail.setAttribute("aria-label", "Mission status");

    const progress = element(documentRef, "article", "rail-panel rail-progress");
    const progressIcon = element(documentRef, "div", "rail-icon");
    progressIcon.append(icon(documentRef, model, "progress"));
    const progressText = element(documentRef, "div");
    progressText.append(element(documentRef, "h3", "", model.progress.title));
    progressText.append(element(documentRef, "p", "", model.progress.body));
    const railMeter = element(documentRef, "div", "rail-meter");
    const railPercent = decorateProgressbar(railMeter, model.progress.percent, model.progress.title);
    const railBar = element(documentRef, "span");
    railBar.style.width = `${railPercent}%`;
    railMeter.append(railBar);
    progress.append(progressIcon, progressText, railMeter);

    const checkpoint = element(documentRef, "article", "rail-panel rail-checkpoint");
    const checkpointIcon = element(documentRef, "div", "rail-icon");
    checkpointIcon.append(icon(documentRef, model, "checkpoint"));
    const checkpointText = element(documentRef, "div");
    checkpointText.append(element(documentRef, "h3", "", model.checkpoint.title));
    checkpointText.append(element(documentRef, "p", "", model.checkpoint.body));
    checkpoint.append(checkpointIcon, checkpointText, element(documentRef, "span", "rail-state", model.checkpoint.state));

    const action = element(documentRef, "article", "rail-panel rail-action");
    const actionIcon = element(documentRef, "div", "rail-icon");
    actionIcon.append(icon(documentRef, model, "diagnose"));
    const actionText = element(documentRef, "div");
    actionText.append(element(documentRef, "h3", "", model.technicianAction.title));
    actionText.append(element(documentRef, "p", "", model.technicianAction.body));
    action.append(
      actionIcon,
      actionText,
      actionButton(documentRef, model.technicianAction.label, "rail-button", () => model.actions.openTool?.(model.technicianAction.toolId), "", "diagnose")
    );

    rail.append(progress, checkpoint, action);
    return rail;
  }

  function renderRecentActivity(documentRef, model) {
    const panel = element(documentRef, "article", "recent-panel lower-panel");
    const heading = element(documentRef, "div", "lower-heading");
    heading.append(icon(documentRef, model, "reports"), element(documentRef, "h2", "", "Recent activity"));
    const list = element(documentRef, "div", "activity-list");
    model.recentActivity.forEach((item) => {
      const row = element(documentRef, "div", "activity-item");
      row.append(element(documentRef, "span", "activity-type", item.type));
      row.append(element(documentRef, "strong", "", item.title));
      row.append(element(documentRef, "p", "", item.detail));
      list.append(row);
    });
    panel.append(heading, list);
    return panel;
  }

  function renderShortcuts(documentRef, model) {
    const panel = element(documentRef, "article", "shortcut-panel lower-panel");
    const heading = element(documentRef, "div", "lower-heading");
    heading.append(icon(documentRef, model, "tools"), element(documentRef, "h2", "", "Technician shortcuts"));
    const list = element(documentRef, "div", "shortcut-list");
    const iconNames = { diagnose: "diagnose", "command-lookup": "lookup", "switch-workbench": "switch", "saved-reports": "reports" };
    model.shortcuts.forEach((shortcut) => {
      const button = element(documentRef, "button", "shortcut");
      button.type = "button";
      button.dataset.homeV2Action = shortcut.id;
      button.addEventListener("click", () => model.actions.openTool?.(shortcut.id));
      const text = element(documentRef, "span");
      text.append(element(documentRef, "strong", "", shortcut.label), element(documentRef, "small", "", shortcut.description));
      button.append(icon(documentRef, model, iconNames[shortcut.id] || "tools"), text);
      list.append(button);
    });
    panel.append(heading, list);
    return panel;
  }

  function renderJourney(documentRef, model) {
    const panel = element(documentRef, "article", "journey-panel lower-panel");
    const heading = element(documentRef, "div", "lower-heading");
    heading.append(icon(documentRef, model, "course"), element(documentRef, "h2", "", "Journey preview"));
    const list = element(documentRef, "ol", "journey-list");
    model.journey.forEach((item) => {
      const row = element(documentRef, "li", item.current ? "is-current" : "");
      const body = element(documentRef, "div");
      body.append(element(documentRef, "strong", "", item.title), element(documentRef, "p", "", item.detail));
      row.append(element(documentRef, "span", "", String(item.number)), body);
      list.append(row);
    });
    panel.append(heading, list);
    return panel;
  }

  function renderMissionStudioHomeV2View(documentRef, model = {}) {
    const screen = element(documentRef, "div", "studio-main");
    screen.dataset.homeV2Root = "true";
    screen.append(renderHeader(documentRef, model));

    const primaryGrid = element(documentRef, "section", "primary-grid");
    primaryGrid.setAttribute("aria-label", "Current mission and progress");
    primaryGrid.append(renderHero(documentRef, model), renderRail(documentRef, model));
    screen.append(primaryGrid);

    const lower = element(documentRef, "section", "lower-row");
    lower.setAttribute("aria-label", "Mission support");
    lower.append(renderRecentActivity(documentRef, model), renderShortcuts(documentRef, model), renderJourney(documentRef, model));
    screen.append(lower);
    return screen;
  }

  const api = Object.freeze({ renderMissionStudioHomeV2View });
  global.CommandDoctorMissionStudioHomeV2View = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
