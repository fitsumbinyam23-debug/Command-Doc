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

  function freezeDescription(description) {
    if (!description || typeof description !== "object") return description;
    const children = Array.isArray(description.children) ? Object.freeze(description.children.map(freezeDescription)) : Object.freeze([]);
    const props = description.props && typeof description.props === "object" ? Object.freeze({ ...description.props }) : Object.freeze({});
    return Object.freeze({ ...description, props, children });
  }

  function node(tag, props = {}, children = []) {
    const childList = Array.isArray(children) ? children : [children];
    return freezeDescription({ tag, props: { ...props }, children: childList.filter((child) => child !== null && child !== undefined) });
  }

  function appShellState({ activeView = "home", pathLabel = "Choose a path", nav = navItems } = {}) {
    return Object.freeze({
      activeView,
      pathLabel,
      nav: nav.map((item) => ({ ...item, active: item.view === activeView }))
    });
  }

  function actionButton(label, onAction, variant = "primary", ariaLabel = label) {
    return node("button", { className: variant, type: "button", text: label, ariaLabel, onClick: onAction });
  }

  function recommendedActionCard({ kicker = "Recommended", title, body, icon = "mission", actionLabel, onAction, variant = "primary" } = {}) {
    return node("article", { className: "mission-action-card", dataset: { icon } }, [
      node("div", { className: "mission-card-icon", ariaHidden: "true" }),
      node("div", { className: "lab-card-kicker", text: kicker }),
      node("h3", { text: title }),
      node("p", { text: body }),
      actionButton(actionLabel, onAction, variant)
    ]);
  }

  function continueMissionCard({ title, lessonTitle, phaseLabel, levelLabel, progressLabel, actionLabel, onAction } = {}) {
    return node("section", { className: "continue-mission-card", ariaLabel: "Continue mission" }, [
      node("div", { className: "lab-card-kicker", text: "Continue learning" }),
      node("h3", { text: title || "Continue Mission" }),
      node("p", { text: lessonTitle || "Resume your current beginner lesson." }),
      node("div", { className: "mission-card-facts" }, [
        node("span", { className: "badge", text: phaseLabel || "Phase 1" }),
        node("span", { className: "badge", text: levelLabel || "Level 0" }),
        node("span", { className: "badge badge-green", text: progressLabel || "In progress" })
      ]),
      actionButton(actionLabel || "Continue Mission", onAction, "primary")
    ]);
  }

  function coursePhaseRail({ phases = [], currentPhaseId = "" } = {}) {
    return node("nav", { className: "course-phase-rail", ariaLabel: "Course phases" }, [
      node("ol", {}, phases.map((phase) => {
        const active = phase.phase_id === currentPhaseId;
        return node("li", { className: active ? "is-current" : "", ariaCurrent: active ? "step" : "" }, [
          node("span", { className: "phase-number", text: String(phase.phase_number || "") }),
          node("strong", { text: phase.title }),
          node("span", { text: phase.statusText || phase.status || "planned" })
        ]);
      }))
    ]);
  }

  function levelCard({ level, statusText, actionLabel, onAction, current = false } = {}) {
    const className = `course-level-card ${current ? "is-current" : "is-locked"}`.trim();
    return node("article", { className }, [
      node("div", { className: "lab-card-kicker", text: `Level ${level?.level_number ?? 0}` }),
      node("h3", { text: level?.title || "Planned level" }),
      node("p", { text: level?.plain_language_summary || level?.why_it_matters || "Planned subject-specific outline." }),
      node("div", { className: "route-facts" }, [
        node("span", { className: "badge", text: statusText || "Planned preview" }),
        node("span", { className: "badge", text: `${(level?.modules || []).length} modules` }),
        node("span", { className: "badge", text: `${(level?.command_ids || []).length} commands` })
      ]),
      actionButton(actionLabel || "Preview plan", onAction, "primary")
    ]);
  }

  function phaseContextPanel({ phase, title = "About this phase", body, facts = [] } = {}) {
    return node("aside", { className: "phase-context-panel", ariaLabel: title }, [
      node("div", { className: "lab-card-kicker", text: title }),
      node("h3", { text: phase?.title || "Phase context" }),
      node("p", { text: body || phase?.purpose || "This phase is previewed honestly until authored lesson evidence exists." }),
      node("div", { className: "route-facts" }, facts.map((fact) => node("span", { className: "badge", text: fact })))
    ]);
  }

  function lessonTimeline({ stepNames = lessonStepper, stepIds = [], activeStepId = "", activeIndex = 0 } = {}) {
    return node("ol", { className: "stepper-steps" }, stepNames.map((name, index) => {
      const stepId = stepIds[index] || name.toLowerCase().replace(/\s+/g, "_");
      const active = stepId === activeStepId || index === activeIndex;
      const done = index < activeIndex;
      return node("li", { className: active ? "is-active" : done ? "is-done" : "", ariaCurrent: active ? "step" : "" }, [
        node("span", { text: name }),
        node("span", { className: "step-status", text: done ? "Completed" : active ? "Current step" : "Locked until reached" })
      ]);
    }));
  }

  function lessonStepPanel({ kicker, heading, body, stepId, children = [] } = {}) {
    return node("section", { className: "stepper-body" }, [
      node("div", { className: "lab-card-kicker", text: kicker }),
      node("h4", { text: heading, tabIndex: -1, dataset: { stepHeading: stepId } }),
      node("p", { text: body }),
      ...children
    ]);
  }

  function visualLearningPanel(asset = {}) {
    return node("section", { className: "mission-visual-panel" }, [
      node("div", { className: "lab-card-kicker", text: "Visual evidence" }),
      node("div", { className: "mission-visual-layout" }, [
        node("figure", { className: "mission-visual-figure" }, [
          node("img", { src: asset.local_asset_path, alt: asset.alt_text, loading: "lazy", decoding: "async" }),
          node("figcaption", { text: asset.caption || asset.title })
        ]),
        node("div", { className: "mission-visual-copy" }, [
          node("h5", { text: "What to notice" }),
          node("p", { text: asset.text_alternative }),
          node("ul", { className: "mission-visual-evidence" }, (asset.evidence_requirements || []).map((requirement) => node("li", { text: requirement }))),
          node("div", { className: "route-facts" }, (asset.visual_components || []).map((component) => node("span", { className: "badge", text: component.replace(/_/g, " ") })))
        ])
      ])
    ]);
  }

  function technicianToolCard({ tool, onAction } = {}) {
    return recommendedActionCard({
      kicker: "Technician tool",
      title: tool?.label || "Tool",
      body: tool?.description || "Open a local Command Doctor tool.",
      icon: tool?.id || "tool",
      actionLabel: `Open ${tool?.label || "Tool"}`,
      onAction
    });
  }

  function progressSummary({ facts = [], actionLabel, onAction } = {}) {
    return node("section", { className: "progress-summary-panel" }, [
      node("div", { className: "lab-card-kicker", text: "Local progress" }),
      node("h3", { text: "Progress is preserved" }),
      node("div", { className: "learn-summary" }, facts.map((fact) => node("span", { className: "badge", text: fact }))),
      actionLabel ? actionButton(actionLabel, onAction, "primary") : null
    ]);
  }

  function plannedContentNotice({ title = "Planned content", body = "Detailed mapping is planned. Command mapping is provisional." } = {}) {
    return node("section", { className: "planned-content-notice" }, [
      node("strong", { text: title }),
      node("p", { text: body })
    ]);
  }

  function accessibleStatusMessage(message, politeness = "polite") {
    return node("div", { className: "sr-only", role: "status", ariaLive: politeness, text: message });
  }

  function renderDescription(documentRef, description) {
    if (description === null || description === undefined) return documentRef.createTextNode("");
    if (typeof description === "string" || typeof description === "number") return documentRef.createTextNode(String(description));
    const element = documentRef.createElement(description.tag || "div");
    const props = description.props || {};
    if (props.className) element.className = props.className;
    if (props.text !== undefined) element.textContent = props.text;
    if (props.type) element.type = props.type;
    if (props.role) element.setAttribute("role", props.role);
    if (props.ariaLabel) element.setAttribute("aria-label", props.ariaLabel);
    if (props.ariaHidden) element.setAttribute("aria-hidden", props.ariaHidden);
    if (props.ariaCurrent) element.setAttribute("aria-current", props.ariaCurrent);
    if (props.ariaLive) element.setAttribute("aria-live", props.ariaLive);
    if (props.tabIndex !== undefined) element.tabIndex = props.tabIndex;
    if (props.src) element.src = props.src;
    if (props.alt !== undefined) element.alt = props.alt;
    if (props.loading) element.loading = props.loading;
    if (props.decoding) element.decoding = props.decoding;
    if (props.dataset) Object.entries(props.dataset).forEach(([key, value]) => { element.dataset[key] = value; });
    if (props.attrs) Object.entries(props.attrs).forEach(([key, value]) => { if (value !== "") element.setAttribute(key, value); });
    if (typeof props.onClick === "function") element.addEventListener("click", props.onClick);
    (description.children || []).forEach((child) => element.append(renderDescription(documentRef, child)));
    return element;
  }

  const api = Object.freeze({
    navItems,
    lessonStepper,
    visualComponents,
    pathCards,
    appShellState,
    recommendedActionCard,
    continueMissionCard,
    coursePhaseRail,
    levelCard,
    phaseContextPanel,
    lessonTimeline,
    lessonStepPanel,
    visualLearningPanel,
    technicianToolCard,
    progressSummary,
    plannedContentNotice,
    accessibleStatusMessage,
    renderDescription
  });

  global.CommandDoctorMissionStudioComponents = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
