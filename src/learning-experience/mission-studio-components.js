"use strict";

(function exposeMissionStudioComponents(global) {
  const navItems = Object.freeze([
    { view: "home", label: "Home", icon: "home" },
    { view: "course", label: "Course", icon: "course" },
    { view: "practice", label: "Practice", icon: "practice" },
    { view: "progress", label: "Progress", icon: "progress" },
    { view: "tools", label: "Tools", icon: "tools" }
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
    { id: "zero", label: "Learn From Zero", description: "Start with the Level 0 mission sequence." },
    { id: "practice", label: "Practise", description: "Open local practice routes and specialization previews." },
    { id: "tools", label: "Technician", description: "Jump into diagnostic and reference tools." }
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

  function ActionButton(label, onAction, variant = "primary", ariaLabel = label, extra = {}) {
    const className = variant === "primary" ? "ms-button ms-button-primary" : `ms-button ms-button-${variant}`;
    return node("button", {
      className,
      type: "button",
      text: label,
      ariaLabel,
      onClick: onAction,
      dataset: extra.dataset || {},
      attrs: extra.attrs || {}
    });
  }

  function StatusPill(text, tone = "neutral") {
    return node("span", { className: `ms-pill ms-pill-${tone}`, text });
  }

  function MissionStudioShell({ activeView = "home", pathLabel = "Choose a path" } = {}) {
    return node("div", { className: "ms-shell", dataset: { activeView } }, [
      DesktopSidebar({ activeView, pathLabel }),
      node("main", { className: "ms-shell-main" }),
      MobileProductHeader({ pathLabel }),
      MobileBottomNavigation({ activeView })
    ]);
  }

  function DesktopSidebar({ activeView = "home", pathLabel = "Choose a path" } = {}) {
    return node("aside", { className: "ms-desktop-sidebar", ariaLabel: "Mission Studio navigation" }, [
      node("div", { className: "ms-product-lockup" }, [
        node("span", { className: "ms-product-mark", text: "CD", ariaHidden: "true" }),
        node("span", { className: "ms-product-name", text: "Command Doctor" })
      ]),
      node("nav", { className: "ms-sidebar-nav", ariaLabel: "Primary learning views" }, navItems.map((item) => {
        const active = item.view === activeView;
        return node("button", {
          className: active ? "ms-nav-item is-active" : "ms-nav-item",
          type: "button",
          text: item.label,
          ariaCurrent: active ? "page" : "",
          dataset: { view: item.view, navIcon: item.icon }
        });
      })),
      node("section", { className: "ms-sidebar-summary", ariaLabel: "Learning path" }, [
        node("strong", { text: "Your mission" }),
        node("p", { text: pathLabel })
      ])
    ]);
  }

  function MobileProductHeader({ pathLabel = "Choose a path" } = {}) {
    return node("header", { className: "ms-mobile-product-header", ariaLabel: "Command Doctor" }, [
      node("span", { className: "ms-product-mark", text: "CD", ariaHidden: "true" }),
      node("div", {}, [
        node("strong", { text: "Command Doctor" }),
        node("span", { text: pathLabel })
      ])
    ]);
  }

  function MobileBottomNavigation({ activeView = "home" } = {}) {
    return node("nav", { className: "ms-mobile-bottom-navigation", ariaLabel: "Mobile learning views" }, navItems.map((item) => {
      const active = item.view === activeView;
      return node("button", {
        className: active ? "ms-nav-item is-active" : "ms-nav-item",
        type: "button",
        text: item.label,
        ariaCurrent: active ? "page" : "",
        dataset: { view: item.view, navIcon: item.icon }
      });
    }));
  }

  function ContinueMissionCard({ title, lessonTitle, phaseLabel, levelLabel, progressLabel, actionLabel, onAction } = {}) {
    return node("section", { className: "ms-card ms-continue-card", ariaLabel: "Continue mission" }, [
      node("div", { className: "ms-kicker", text: "Continue learning" }),
      node("h3", { text: title || "Continue Mission" }),
      node("p", { text: lessonTitle || "Resume the current beginner lesson." }),
      node("div", { className: "ms-fact-row" }, [
        StatusPill(phaseLabel || "Phase 1"),
        StatusPill(levelLabel || "Level 0"),
        StatusPill(progressLabel || "In progress", "success")
      ]),
      ActionButton(actionLabel || "Continue Mission", onAction, "primary", actionLabel || "Continue Mission", { dataset: { dominantAction: "true" } })
    ]);
  }

  function DiagnosticShortcutCard({ title = "Start a diagnostic", body = "Open the local tools when you need to investigate output.", actionLabel = "Open Tools", onAction } = {}) {
    return node("article", { className: "ms-card ms-diagnostic-card" }, [
      node("div", { className: "ms-kicker", text: "Technician tools" }),
      node("h3", { text: title }),
      node("p", { text: body }),
      ActionButton(actionLabel, onAction, "secondary")
    ]);
  }

  function RecentActivityStrip({ items = [] } = {}) {
    return node("section", { className: "ms-recent-strip", ariaLabel: "Recent activity" }, [
      node("div", { className: "ms-section-head" }, [
        node("span", { className: "ms-kicker", text: "Recent activity" }),
        node("strong", { text: "Saved locally" })
      ]),
      node("div", { className: "ms-recent-list" }, items.map((item) => node("article", { className: "ms-recent-item" }, [
        node("span", { className: "ms-tool-symbol", text: item.symbol || "MS", ariaHidden: "true" }),
        node("strong", { text: item.title }),
        node("span", { text: item.detail })
      ])))
    ]);
  }

  function CoursePhaseRail({ phases = [], currentPhaseId = "" } = {}) {
    return node("nav", { className: "ms-phase-rail", ariaLabel: "Course phases" }, [
      node("ol", {}, phases.map((phase) => {
        const active = phase.phase_id === currentPhaseId;
        return node("li", { className: active ? "is-current" : "" }, [
          node("button", {
            className: "ms-phase-button",
            type: "button",
            ariaCurrent: active ? "step" : "",
            onClick: phase.onSelect,
            dataset: { phaseId: phase.phase_id || "" }
          }, [
            node("span", { className: "ms-phase-number", text: String(phase.phase_number ?? phase.number ?? "") }),
            node("strong", { text: phase.title || "Phase" }),
            node("span", { text: phase.statusText || phase.status || "planned" })
          ])
        ]);
      }))
    ]);
  }

  function CourseLevelTimeline({ levels = [] } = {}) {
    return node("section", { className: "ms-level-timeline", ariaLabel: "Course levels" }, levels.map((level) => LevelOverviewHeader(level)));
  }

  function LevelOverviewHeader({ level, statusText, actionLabel, onAction, current = false, facts = [] } = {}) {
    const item = level || {};
    return node("article", { className: current ? "ms-level-row is-current" : "ms-level-row" }, [
      node("span", { className: "ms-level-number", text: String(item.level_number ?? 0) }),
      node("div", { className: "ms-level-main" }, [
        node("span", { className: "ms-kicker", text: statusText || item.content_status || "planned" }),
        node("h3", { text: item.title || "Planned level" }),
        node("p", { text: item.plain_language_summary || item.why_it_matters || item.purpose || "Previewed until complete lesson evidence exists." }),
        node("div", { className: "ms-fact-row" }, facts.map((fact) => StatusPill(fact)))
      ]),
      ActionButton(actionLabel || "Preview plan", onAction, current ? "primary" : "secondary")
    ]);
  }

  function PhaseContextPanel({ phase, title = "About this phase", body, facts = [] } = {}) {
    return node("aside", { className: "ms-card ms-phase-context", ariaLabel: title }, [
      node("div", { className: "ms-kicker", text: title }),
      node("h3", { text: phase?.title || "Phase context" }),
      node("p", { text: body || phase?.purpose || "This phase is visible for planning until every lesson is authored and verified." }),
      node("div", { className: "ms-fact-row" }, facts.map((fact) => StatusPill(fact)))
    ]);
  }

  function LessonStepRail({ stepNames = lessonStepper, stepIds = [], activeStepId = "", activeIndex = 0 } = {}) {
    return node("nav", { className: "ms-lesson-step-rail", ariaLabel: "Lesson steps" }, [
      node("ol", {}, stepNames.map((name, index) => {
        const stepId = stepIds[index] || name.toLowerCase().replace(/\s+/g, "_");
        const active = stepId === activeStepId || index === activeIndex;
        const complete = index < activeIndex;
        return node("li", { className: active ? "is-active" : complete ? "is-complete" : "", ariaCurrent: active ? "step" : "" }, [
          node("span", { className: "ms-step-number", text: String(index + 1) }),
          node("span", { text: name, ariaCurrent: active ? "step" : "" }),
          node("small", { text: complete ? "Complete" : active ? "Current" : "Upcoming" })
        ]);
      }))
    ]);
  }

  function LessonContentStage({ kicker, heading, body, stepId, children = [] } = {}) {
    return node("section", { className: "ms-card ms-lesson-stage" }, [
      node("div", { className: "ms-kicker", text: kicker }),
      node("h3", { text: heading, tabIndex: -1, dataset: { stepHeading: stepId } }),
      node("p", { text: body }),
      ...children
    ]);
  }

  function VisualLearningPanel(asset = {}) {
    return node("section", { className: "ms-card ms-visual-panel mission-visual-panel", ariaLabel: "Visual learning panel" }, [
      node("div", { className: "ms-kicker", text: "Visual evidence" }),
      node("div", { className: "ms-visual-layout" }, [
        node("figure", { className: "ms-visual-figure" }, [
          node("img", { src: asset.local_asset_path, alt: asset.alt_text || asset.title || "Lesson visual", loading: "lazy", decoding: "async" }),
          node("figcaption", { text: asset.caption || asset.title || "Command Doctor visual" })
        ]),
        node("div", { className: "ms-visual-copy" }, [
          node("h4", { text: "What to notice" }),
          node("p", { text: asset.text_alternative || "A local visual explains the current learning step." }),
          node("ul", {}, (asset.evidence_requirements || []).map((requirement) => node("li", { text: requirement }))),
          node("div", { className: "ms-fact-row" }, (asset.visual_components || []).map((component) => StatusPill(component.replace(/_/g, " "))))
        ])
      ])
    ]);
  }

  function ProgressDashboard({ facts = [], actionLabel, onAction, percent = 0, progressLabel = "" } = {}) {
    const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
    const label = progressLabel || `${safePercent}% complete`;
    return node("section", { className: "ms-progress-dashboard" }, [
      node("div", { className: "ms-section-head" }, [
        node("span", { className: "ms-kicker", text: "Local progress" }),
        node("h3", { text: "Beginner progress" })
      ]),
      node("div", {
        className: "ms-progress-bar",
        role: "progressbar",
        ariaLabel: label,
        attrs: {
          "aria-valuemin": "0",
          "aria-valuemax": "100",
          "aria-valuenow": String(safePercent)
        }
      }, [
        node("span", { style: { width: `${safePercent}%` } })
      ]),
      node("p", { className: "ms-planned-text", text: label }),
      node("div", { className: "ms-progress-facts" }, facts.map((fact) => node("article", { className: "ms-metric" }, [
        node("span", { text: fact.label }),
        node("strong", { text: fact.value }),
        node("small", { text: fact.detail || "" })
      ]))),
      actionLabel ? ActionButton(actionLabel, onAction, "primary") : null
    ]);
  }

  function TechnicianToolCard({ tool, symbol, onAction } = {}) {
    return node("article", { className: "ms-tool-card", dataset: { toolId: tool?.id || "" } }, [
      node("span", { className: "ms-tool-symbol", text: symbol || tool?.symbol || "TL", ariaHidden: "true" }),
      node("div", { className: "ms-kicker", text: "Tool" }),
      node("h3", { text: tool?.label || "Tool" }),
      node("p", { text: tool?.description || "Open a local Command Doctor tool." }),
      ActionButton(`Open ${tool?.label || "Tool"}`, onAction, "secondary")
    ]);
  }

  function TechnicianToolsGrid({ tools = [] } = {}) {
    return node("section", { className: "ms-tools-grid", ariaLabel: "Technician tools" }, tools.map((tool) => TechnicianToolCard(tool)));
  }

  function PlannedContentNotice({ title = "Planned content", body = "This item is visible for planning. It does not count as complete until authored lesson, practice, verification, rollback, and review evidence exist." } = {}) {
    return node("section", { className: "ms-planned-notice" }, [
      node("strong", { text: title }),
      node("p", { text: body })
    ]);
  }

  function AccessibleStatusMessage(message, politeness = "polite") {
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
    if (props.style) Object.assign(element.style, props.style);
    if (props.dataset) Object.entries(props.dataset).forEach(([key, value]) => { element.dataset[key] = value; });
    if (props.attrs) Object.entries(props.attrs).forEach(([key, value]) => {
      if (value !== "" && value !== undefined && value !== null) element.setAttribute(key, value);
    });
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
    MissionStudioShell,
    DesktopSidebar,
    MobileProductHeader,
    MobileBottomNavigation,
    ContinueMissionCard,
    DiagnosticShortcutCard,
    RecentActivityStrip,
    CoursePhaseRail,
    CourseLevelTimeline,
    PhaseContextPanel,
    LevelOverviewHeader,
    LessonStepRail,
    LessonContentStage,
    VisualLearningPanel,
    ProgressDashboard,
    TechnicianToolsGrid,
    TechnicianToolCard,
    PlannedContentNotice,
    AccessibleStatusMessage,
    renderDescription,
    actionButton: ActionButton,
    recommendedActionCard: DiagnosticShortcutCard,
    continueMissionCard: ContinueMissionCard,
    coursePhaseRail: CoursePhaseRail,
    levelCard: LevelOverviewHeader,
    phaseContextPanel: PhaseContextPanel,
    lessonTimeline: LessonStepRail,
    lessonStepPanel: LessonContentStage,
    visualLearningPanel: VisualLearningPanel,
    technicianToolCard: TechnicianToolCard,
    progressSummary: ProgressDashboard,
    plannedContentNotice: PlannedContentNotice,
    accessibleStatusMessage: AccessibleStatusMessage
  });

  global.CommandDoctorMissionStudioComponents = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
