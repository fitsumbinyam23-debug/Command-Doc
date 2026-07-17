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
    { id: "zero", label: "Learn From Zero", description: "Build the networking basics first, then move into safe command practice.", icon: "network" },
    { id: "practice", label: "Practise and Specialize", description: "Use authored local routes and specialization previews when the basics are familiar.", icon: "practice" },
    { id: "tools", label: "Technician Tools", description: "Open diagnostic, lookup, lab, and report tools for focused troubleshooting work.", icon: "tools" }
  ]);

  function iconApi() {
    return global.CommandDoctorMissionStudioIcons;
  }

  function icon(name, className = "ms-icon") {
    return iconApi()?.icon?.(name, className) || node("span", { className, ariaHidden: "true" });
  }

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
      ariaLabel,
      onClick: onAction,
      dataset: extra.dataset || {},
      attrs: extra.attrs || {}
    }, [
      ...(extra.icon ? [icon(extra.icon, "ms-button-icon")] : []),
      node("span", { text: label })
    ]);
  }

  function StatusPill(text, tone = "neutral") {
    return node("span", { className: `ms-pill ms-pill-${tone}`, text });
  }

  function MissionStudioBrand() {
    return node("div", { className: "ms-brand", dataset: { component: "MissionStudioBrand" } }, [
      node("span", { className: "ms-brand-mark", ariaHidden: "true" }, [
        icon("shield", "ms-brand-shield"),
        node("span", { className: "ms-brand-dot" })
      ]),
      node("div", { className: "ms-brand-copy" }, [
        node("strong", { className: "ms-product-name", text: "Command Doctor" }),
        node("span", { className: "ms-product-tagline", text: "Learn. Practise. Diagnose." })
      ])
    ]);
  }

  function MissionStudioPrimaryNav({ activeView = "home", onNavigate } = {}) {
    return node("nav", { className: "ms-primary-nav", ariaLabel: "Primary learning views", dataset: { component: "MissionStudioPrimaryNav" } }, navItems.map((item) => {
      const active = item.view === activeView;
      return node("button", {
        className: active ? "ms-nav-item nav-tab is-active active" : "ms-nav-item nav-tab",
        type: "button",
        ariaCurrent: active ? "page" : "",
        dataset: { view: item.view, navIcon: item.icon, msPrimaryNav: "true" }
      }, [
        icon(item.icon, "ms-nav-icon"),
        node("span", { text: item.label })
      ]);
    }));
  }

  function MissionStudioSidebarProfile({ pathLabel = "Choose a path", offlineStatus = "Works offline" } = {}) {
    return node("section", { className: "ms-sidebar-profile", ariaLabel: "Learning path", dataset: { component: "MissionStudioSidebarProfile" } }, [
      icon("flag", "ms-profile-icon"),
      node("div", {}, [
        node("strong", { text: "Your mission" }),
        node("p", { text: pathLabel, dataset: { msPathSummary: "true" } }),
        node("span", { text: offlineStatus, dataset: { msOfflineStatus: "true" } })
      ])
    ]);
  }

  function MissionStudioSidebar({ activeView = "home", pathLabel = "Choose a path", onNavigate } = {}) {
    return node("aside", { className: "ms-desktop-sidebar", ariaLabel: "Mission Studio navigation", dataset: { component: "MissionStudioSidebar" } }, [
      MissionStudioBrand(),
      MissionStudioPrimaryNav({ activeView, onNavigate }),
      node("div", { className: "ms-sidebar-spacer" }),
      MissionStudioSidebarProfile({ pathLabel })
    ]);
  }

  function MissionStudioMobileHeader({ activeView = "home", pathLabel = "Choose a path" } = {}) {
    const current = navItems.find((item) => item.view === activeView) || navItems[0];
    return node("header", { className: "ms-mobile-header", ariaLabel: "Command Doctor", dataset: { component: "MissionStudioMobileHeader" } }, [
      MissionStudioBrand(),
      node("div", { className: "ms-mobile-page" }, [
        node("span", { text: current.label }),
        node("small", { text: pathLabel, dataset: { msMobilePath: "true" } })
      ])
    ]);
  }

  function MissionStudioMobileBottomNav({ activeView = "home", onNavigate } = {}) {
    return node("nav", { className: "ms-mobile-bottom-nav", ariaLabel: "Mobile learning views", dataset: { component: "MissionStudioMobileBottomNav" } }, navItems.map((item) => {
      const active = item.view === activeView;
      return node("button", {
        className: active ? "ms-mobile-nav-item nav-tab is-active active" : "ms-mobile-nav-item nav-tab",
        type: "button",
        ariaCurrent: active ? "page" : "",
        dataset: { view: item.view, navIcon: item.icon, msPrimaryNav: "true" }
      }, [
        icon(item.icon, "ms-mobile-nav-icon"),
        node("span", { text: item.label })
      ]);
    }));
  }

  function MissionStudioContentHeader({ kicker, title, body, id } = {}) {
    return node("header", { className: "ms-content-header", dataset: { component: "MissionStudioContentHeader" } }, [
      kicker ? node("p", { className: "ms-kicker", text: kicker }) : null,
      node("h2", { text: title || "Mission Studio", tabIndex: id ? -1 : undefined, attrs: id ? { id } : {} }),
      body ? node("p", { className: "ms-screen-intro", text: body }) : null
    ]);
  }

  function MissionStudioShell({ activeView = "home", pathLabel = "Choose a path", onNavigate } = {}) {
    return node("div", { className: "ms-app-shell", dataset: { component: "MissionStudioShell", activeView } }, [
      MissionStudioSidebar({ activeView, pathLabel, onNavigate }),
      node("div", { className: "ms-stage-canvas" }, [
        MissionStudioMobileHeader({ activeView, pathLabel }),
        node("main", { className: "ms-shell-main", attrs: { id: "missionStudioMain" } })
      ]),
      MissionStudioMobileBottomNav({ activeView, onNavigate })
    ]);
  }

  function AccessibleViewStatus(message = "Mission Studio view updated.", politeness = "polite") {
    return node("div", { className: "sr-only", role: "status", ariaLive: politeness, text: message, dataset: { component: "AccessibleViewStatus" } });
  }

  function FirstRunMissionSelector({ paths = pathCards, onChoosePath } = {}) {
    return node("section", { className: "ms-onboarding-panel", ariaLabel: "Choose your Command Doctor mission", dataset: { component: "FirstRunMissionSelector" } }, [
      node("div", { className: "ms-onboarding-hero" }, [
        node("div", {}, [
          node("p", { className: "ms-kicker", text: "Command Doctor Mission Studio" }),
          node("h3", { text: "Choose the way you want to train today." }),
          node("p", { text: "Start from first principles, practise a focused route, or jump into technician tools. Your choice only changes the learning path on this browser." })
        ]),
        node("div", { className: "ms-onboarding-graphic", ariaHidden: "true" }, [
          icon("network", "ms-onboarding-network"),
          node("span"),
          node("span"),
          node("span")
        ])
      ]),
      node("div", { className: "ms-path-choices" }, paths.slice(0, 3).map((path) => node("button", {
        className: "ms-path-card",
        type: "button",
        ariaLabel: `Choose ${path.label}`,
        onClick: () => onChoosePath?.(path.id),
        dataset: { pathChoice: path.id }
      }, [
        icon(path.icon || "network", "ms-path-icon"),
        node("strong", { text: path.label }),
        node("span", { text: path.description }),
        node("em", { text: path.actionLabel || "Select path" })
      ])))
    ]);
  }

  function HomeMissionHero(model = {}) {
    const percent = Math.max(0, Math.min(100, Number(model.progressPercent) || 0));
    return node("section", { className: "ms-home-hero", ariaLabel: "Current mission", dataset: { component: "HomeMissionHero" } }, [
      node("div", { className: "ms-home-hero-copy" }, [
        node("p", { className: "ms-kicker", text: model.pathLabel || "Learn From Zero" }),
        node("h3", { text: model.title || "Level 0 - Welcome to Networking" }),
        node("p", { className: "ms-hero-lesson", text: model.lessonLabel || "Lesson 1 of 8" }),
        node("p", { className: "ms-hero-statement", text: model.statement || "Understand what a network is and why connected devices communicate." }),
        node("div", { className: "ms-hero-progress-row" }, [
          node("div", {
            className: "ms-progress-bar",
            role: "progressbar",
            ariaLabel: model.progressLabel || `${percent}% complete`,
            attrs: { "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(percent) }
          }, [
            node("span", { style: { width: `${percent}%` } })
          ]),
          node("strong", { text: `${percent}%` })
        ]),
        node("div", { className: "ms-hero-actions" }, [
          ActionButton(model.actionLabel || "Continue Level 0", model.onAction, "primary", model.actionLabel || "Continue Level 0", { icon: "arrow", dataset: { dominantAction: "true" } }),
          model.secondaryActionLabel ? ActionButton(model.secondaryActionLabel, model.onSecondaryAction, "quiet") : null
        ])
      ]),
      node("figure", { className: "ms-mission-visual", dataset: { localVisual: "mission-studio-home-network" } }, [
        node("img", {
          src: model.visualSrc || "src/learning-experience/assets/mission-studio-home-network.svg",
          alt: model.visualAlt || "Generic switch connecting local devices, a gateway, and a service in a learning network.",
          loading: "eager",
          decoding: "async"
        }),
        node("figcaption", { text: model.visualText || "A generic local network scene shows endpoints, a switch, a gateway, and a service linked together." })
      ])
    ]);
  }

  function HomeProgressSummary({ title = "Level 0 orientation", percent = 0, facts = [] } = {}) {
    const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
    return node("section", { className: "ms-rail-card ms-progress-summary", ariaLabel: "Progress summary", dataset: { component: "HomeProgressSummary" } }, [
      node("p", { className: "ms-kicker", text: "Progress" }),
      node("h3", { text: title }),
      node("div", {
        className: "ms-progress-bar",
        role: "progressbar",
        ariaLabel: `${safePercent}% complete`,
        attrs: { "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(safePercent) }
      }, [
        node("span", { style: { width: `${safePercent}%` } })
      ]),
      node("div", { className: "ms-rail-facts" }, facts.map((fact) => node("div", {}, [
        node("span", { text: fact.label }),
        node("strong", { text: fact.value }),
        fact.detail ? node("small", { text: fact.detail }) : null
      ])))
    ]);
  }

  function HomeNextCheckpoint({ title = "Next checkpoint", body = "Checkpoint opens after the current lesson steps are complete.", state = "Not ready yet" } = {}) {
    return node("section", { className: "ms-rail-card ms-next-checkpoint", ariaLabel: "Next checkpoint", dataset: { component: "HomeNextCheckpoint" } }, [
      node("p", { className: "ms-kicker", text: "Checkpoint" }),
      node("h3", { text: title }),
      node("p", { text: body }),
      node("span", { className: "ms-state-chip", text: state })
    ]);
  }

  function HomeTechnicianAction({ title = "Open Diagnose", body = "Paste output and build an evidence-first diagnostic summary.", actionLabel = "Open Tools", iconName = "pulse", onAction } = {}) {
    return node("section", { className: "ms-rail-card ms-technician-action", ariaLabel: "Quick technician action", dataset: { component: "HomeTechnicianAction" } }, [
      node("p", { className: "ms-kicker", text: "Technician shortcut" }),
      node("div", { className: "ms-rail-action-head" }, [
        icon(iconName, "ms-shortcut-icon"),
        node("h3", { text: title })
      ]),
      node("p", { text: body }),
      ActionButton(actionLabel, onAction, "secondary")
    ]);
  }

  function HomeRecentActivity({ items = [], onAction } = {}) {
    const visibleItems = items.slice(0, 4);
    return node("section", { className: "ms-home-section ms-recent-activity", ariaLabel: "Recent activity", dataset: { component: "HomeRecentActivity" } }, [
      node("div", { className: "ms-section-head" }, [
        node("div", {}, [
          node("p", { className: "ms-kicker", text: "Recent activity" }),
          node("h3", { text: "Saved locally" })
        ]),
        onAction ? ActionButton("Open reports", onAction, "quiet") : null
      ]),
      visibleItems.length ? node("div", { className: "ms-recent-list" }, visibleItems.map((item) => node("article", { className: "ms-recent-item" }, [
        icon(item.icon || "book", "ms-recent-icon"),
        node("div", {}, [
          node("strong", { text: item.title }),
          node("span", { text: item.detail }),
          item.status ? node("small", { text: item.status }) : null
        ])
      ]))) : node("div", { className: "ms-empty-state" }, [
        icon("book", "ms-empty-icon"),
        node("strong", { text: "No local activity yet" }),
        node("span", { text: "Start a lesson or save a diagnostic report and it will appear here." })
      ])
    ]);
  }

  function HomeTechnicianShortcuts({ shortcuts = [] } = {}) {
    return node("section", { className: "ms-home-section ms-shortcuts", ariaLabel: "Technician shortcuts", dataset: { component: "HomeTechnicianShortcuts" } }, [
      node("div", { className: "ms-section-head" }, [
        node("div", {}, [
          node("p", { className: "ms-kicker", text: "Technician shortcuts" }),
          node("h3", { text: "Useful tools" })
        ])
      ]),
      node("div", { className: "ms-shortcut-grid" }, shortcuts.slice(0, 4).map((shortcut) => node("button", {
        className: "ms-shortcut-card",
        type: "button",
        onClick: shortcut.onAction,
        ariaLabel: `Open ${shortcut.label}`,
        dataset: { shortcutDestination: shortcut.view || "", toolId: shortcut.id || "" }
      }, [
        icon(shortcut.icon || "tools", "ms-shortcut-icon"),
        node("strong", { text: shortcut.label }),
        node("span", { text: shortcut.description })
      ])))
    ]);
  }

  function HomeJourneyPreview({ lessons = [] } = {}) {
    return node("section", { className: "ms-home-section ms-journey-preview", ariaLabel: "Learning path preview", dataset: { component: "HomeJourneyPreview" } }, [
      node("div", { className: "ms-section-head" }, [
        node("div", {}, [
          node("p", { className: "ms-kicker", text: "Journey preview" }),
          node("h3", { text: "Level 0 path" })
        ])
      ]),
      node("ol", { className: "ms-journey-timeline" }, lessons.slice(0, 3).map((lesson) => node("li", { className: `is-${lesson.state || "upcoming"}` }, [
        node("span", { className: "ms-journey-dot", text: lesson.indexLabel || "" }),
        node("div", {}, [
          node("strong", { text: lesson.title }),
          node("span", { text: lesson.detail }),
          node("small", { text: lesson.stateLabel || "Upcoming" })
        ])
      ])))
    ]);
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
    return HomeRecentActivity({ items });
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
      icon(iconApi()?.toolSymbol?.(tool?.id) || symbol || "tools", "ms-tool-symbol"),
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
    return AccessibleViewStatus(message, politeness);
  }

  const svgNamespace = "http://www.w3.org/2000/svg";
  const svgTags = new Set(["svg", "path", "circle", "rect", "line", "polyline", "polygon", "g", "defs", "title", "desc", "use"]);

  function renderDescription(documentRef, description, namespace = "") {
    if (description === null || description === undefined) return documentRef.createTextNode("");
    if (typeof description === "string" || typeof description === "number") return documentRef.createTextNode(String(description));
    const tag = description.tag || "div";
    const childNamespace = tag === "svg" || (namespace === svgNamespace && svgTags.has(tag)) ? svgNamespace : "";
    const element = childNamespace
      ? documentRef.createElementNS(svgNamespace, tag)
      : documentRef.createElement(tag);
    const props = description.props || {};
    if (props.className) {
      if (childNamespace) element.setAttribute("class", props.className);
      if (!childNamespace || typeof element.className === "string") element.className = props.className;
    }
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
    (description.children || []).forEach((child) => element.append(renderDescription(documentRef, child, childNamespace)));
    return element;
  }

  const api = Object.freeze({
    navItems,
    lessonStepper,
    visualComponents,
    pathCards,
    appShellState,
    MissionStudioShell,
    MissionStudioSidebar,
    MissionStudioBrand,
    MissionStudioPrimaryNav,
    MissionStudioSidebarProfile,
    MissionStudioMobileHeader,
    MissionStudioMobileBottomNav,
    MissionStudioContentHeader,
    FirstRunMissionSelector,
    HomeMissionHero,
    HomeProgressSummary,
    HomeNextCheckpoint,
    HomeTechnicianAction,
    HomeTechnicianShortcuts,
    HomeRecentActivity,
    HomeJourneyPreview,
    AccessibleViewStatus,
    DesktopSidebar: MissionStudioSidebar,
    MobileProductHeader: MissionStudioMobileHeader,
    MobileBottomNavigation: MissionStudioMobileBottomNav,
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
