"use strict";

(function exposeMissionStudioViews(global) {
  function components() {
    return global.CommandDoctorMissionStudioComponents;
  }

  function icons() {
    return global.CommandDoctorMissionStudioIcons;
  }

  function renderDescription(documentRef, description) {
    return components()?.renderDescription(documentRef, description) || documentRef.createTextNode("");
  }

  function el(documentRef, tag, className = "", text = "") {
    const node = documentRef.createElement(tag);
    if (className) node.className = className;
    if (text !== "") node.textContent = text;
    return node;
  }

  function button(documentRef, label, className, onClick) {
    const control = el(documentRef, "button", className, label);
    control.type = "button";
    if (typeof onClick === "function") control.addEventListener("click", onClick);
    return control;
  }

  function sectionHeader(documentRef, { kicker, title, body, id }) {
    const header = el(documentRef, "header", "ms-screen-header");
    if (kicker) header.append(el(documentRef, "p", "ms-kicker", kicker));
    const heading = el(documentRef, "h2", "", title);
    if (id) {
      heading.id = id;
      heading.tabIndex = -1;
    }
    header.append(heading);
    if (body) header.append(el(documentRef, "p", "ms-screen-intro", body));
    return header;
  }

  function pill(documentRef, text, tone = "neutral") {
    return el(documentRef, "span", `ms-pill ms-pill-${tone}`, text);
  }

  function facts(documentRef, values = []) {
    const row = el(documentRef, "div", "ms-fact-row");
    values.filter(Boolean).forEach((value) => row.append(pill(documentRef, value)));
    return row;
  }

  function renderMissionStudioHomeView(documentRef, model = {}) {
    const root = el(documentRef, "section", model.path ? "ms-screen ms-home" : "ms-screen ms-onboarding");
    if (!model.path) {
      root.append(renderDescription(documentRef, components().MissionStudioContentHeader({
        id: "homeTitle",
        kicker: "Welcome to Mission Studio",
        title: "Choose your Command Doctor mission",
        body: "Pick one path for this browser. You can start from zero, practise a route, or open technician tools."
      })));
      root.append(renderDescription(documentRef, components().FirstRunMissionSelector({
        paths: model.paths || [],
        onChoosePath: model.onChoosePath
      })));
      root.append(renderDescription(documentRef, components().AccessibleViewStatus("Choose one Command Doctor mission path.")));
      return root;
    }

    root.append(renderDescription(documentRef, components().MissionStudioContentHeader({
      id: "homeTitle",
      kicker: model.headerKicker || "Mission Studio",
      title: `Welcome back to ${model.pathLabel}`,
      body: model.headerBody || "Continue your mission, inspect recent local activity, or open one technician shortcut."
    })));
    const top = el(documentRef, "div", "ms-home-top-row");
    top.append(renderDescription(documentRef, components().HomeMissionHero(model.missionHero || {})));
    const rail = el(documentRef, "aside", "ms-home-right-rail");
    rail.append(
      renderDescription(documentRef, components().HomeProgressSummary(model.progressSummary || {})),
      renderDescription(documentRef, components().HomeNextCheckpoint(model.nextCheckpoint || {})),
      renderDescription(documentRef, components().HomeTechnicianAction(model.technicianAction || model.diagnosticShortcut || {}))
    );
    top.append(rail);
    root.append(top);
    const lower = el(documentRef, "div", "ms-home-lower-grid");
    lower.append(
      renderDescription(documentRef, components().HomeRecentActivity({
        items: model.recentActivity || [],
        onAction: model.onOpenReports
      })),
      renderDescription(documentRef, components().HomeTechnicianShortcuts({ shortcuts: model.shortcuts || [] })),
      renderDescription(documentRef, components().HomeJourneyPreview({ lessons: model.journeyPreview || [] }))
    );
    root.append(lower);
    const recommendation = el(documentRef, "section", "ms-recommendation-row");
    recommendation.append(el(documentRef, "strong", "", model.recommendation || "Recommended next action: continue your current lesson."));
    recommendation.append(button(documentRef, "Change Path", "ms-button ms-button-quiet", model.onChangePath));
    root.append(recommendation);
    root.append(renderDescription(documentRef, components().AccessibleViewStatus(`Home loaded for ${model.pathLabel}.`)));
    return root;
  }

  function renderCourseMapView(documentRef, model = {}) {
    const root = el(documentRef, "section", "ms-screen ms-course");
    root.append(sectionHeader(documentRef, {
      id: "courseTitle",
      kicker: "Course",
      title: "Switching Fundamentals",
      body: "Move through phases, inspect level status, and keep planned content clearly separated from authored lessons."
    }));
    const layout = el(documentRef, "div", "ms-course-layout");
    layout.append(renderDescription(documentRef, components().CoursePhaseRail({
      phases: model.phases || [],
      currentPhaseId: model.currentPhaseId
    })));
    layout.append(renderDescription(documentRef, components().CourseLevelTimeline({ levels: model.levels || [] })));
    layout.append(renderDescription(documentRef, components().PhaseContextPanel(model.phaseContext)));
    root.append(layout);
    return root;
  }

  function renderLevelOverviewView(documentRef, model = {}) {
    const root = el(documentRef, "section", "ms-screen ms-level-overview");
    root.append(sectionHeader(documentRef, {
      id: "courseTitle",
      kicker: model.phaseLabel || "Level overview",
      title: model.title || "Level",
      body: model.purpose || "Preview this level before opening the lesson sequence."
    }));
    const hero = el(documentRef, "section", "ms-level-overview-grid");
    const details = el(documentRef, "article", "ms-card ms-level-details");
    details.append(facts(documentRef, model.facts || []));
    const outcomes = el(documentRef, "div", "ms-outcome-list");
    outcomes.append(el(documentRef, "h3", "", "Learning outcomes"));
    const outcomeList = el(documentRef, "ul");
    (model.outcomes || []).forEach((item) => outcomeList.append(el(documentRef, "li", "", item)));
    outcomes.append(outcomeList);
    details.append(outcomes);
    const actions = el(documentRef, "div", "ms-action-row");
    actions.append(button(documentRef, "Back to Course", "ms-button ms-button-secondary", model.onBack));
    if (model.primaryActionLabel) actions.append(button(documentRef, model.primaryActionLabel, "ms-button ms-button-primary", model.onPrimaryAction));
    details.append(actions);
    hero.append(details);
    const sequence = el(documentRef, "section", "ms-card ms-lesson-sequence");
    sequence.append(el(documentRef, "div", "ms-kicker", model.sequenceKicker || "Lesson sequence"));
    sequence.append(el(documentRef, "h3", "", model.sequenceTitle || "Connected lessons"));
    (model.sequence || []).forEach((item, index) => {
      const row = el(documentRef, "article", "ms-sequence-row");
      row.append(el(documentRef, "span", "ms-step-number", String(index + 1)));
      row.append(el(documentRef, "div", "", ""));
      row.lastElementChild.append(el(documentRef, "strong", "", item.title));
      row.lastElementChild.append(el(documentRef, "p", "", item.body));
      sequence.append(row);
    });
    hero.append(sequence);
    root.append(hero);
    if (model.previewAssets?.length) {
      const previews = el(documentRef, "section", "ms-switch-preview-panel switch-preview-panel");
      previews.append(el(documentRef, "div", "ms-kicker", "Visual contract preview"));
      previews.append(el(documentRef, "h3", "", "Future switch lesson visuals"));
      previews.append(el(documentRef, "p", "ms-planned-text", "These generic switch previews define a visual standard only. They do not mark this level as authored."));
      const previewGrid = el(documentRef, "div", "ms-preview-grid");
      model.previewAssets.forEach((asset) => previewGrid.append(renderDescription(documentRef, components().VisualLearningPanel(asset))));
      previews.append(previewGrid);
      root.append(previews);
    } else if (model.plannedNotice) {
      root.append(renderDescription(documentRef, components().PlannedContentNotice(model.plannedNotice)));
    }
    return root;
  }

  function renderLessonView(documentRef, model = {}) {
    const root = el(documentRef, "section", "ms-screen ms-lesson-workspace");
    root.append(sectionHeader(documentRef, {
      id: "courseTitle",
      kicker: model.kicker || "Level 0 lesson",
      title: model.title || "Lesson",
      body: model.subtitle || "Work one step at a time."
    }));
    const workspace = el(documentRef, "div", "ms-lesson-layout");
    workspace.append(renderDescription(documentRef, components().LessonStepRail(model.stepRail)));
    const center = el(documentRef, "div", "ms-lesson-center");
    const stage = renderDescription(documentRef, components().LessonContentStage(model.stage));
    if (model.interaction) stage.append(renderInteraction(documentRef, model.interaction));
    const controls = el(documentRef, "div", "ms-step-controls");
    controls.append(button(documentRef, "Previous", "ms-button ms-button-secondary", model.onPrevious));
    controls.append(button(documentRef, model.nextLabel || "Next", "ms-button ms-button-primary", model.onNext));
    stage.append(controls);
    center.append(stage);
    workspace.append(center);
    if (model.visualAsset) workspace.append(renderDescription(documentRef, components().VisualLearningPanel(model.visualAsset)));
    else workspace.append(renderDescription(documentRef, components().PlannedContentNotice({
      title: "Visual planned",
      body: "This step has text guidance now. A dedicated visual appears when the lesson asset registry supplies one."
    })));
    root.append(workspace);
    return root;
  }

  function renderInteraction(documentRef, interaction) {
    const wrap = el(documentRef, "section", "ms-interaction-panel");
    if (interaction.kind === "choices") {
      wrap.append(el(documentRef, "strong", "", interaction.prompt || "Choose an answer"));
      const choices = el(documentRef, "div", "ms-choice-grid");
      (interaction.choices || []).forEach((choice) => {
        const control = button(documentRef, choice.label, choice.selected ? "ms-button ms-button-secondary is-selected" : "ms-button ms-button-secondary", choice.onChoose);
        choices.append(control);
      });
      wrap.append(choices);
      if (interaction.feedback) wrap.append(el(documentRef, "p", "ms-planned-text", interaction.feedback));
    }
    if (interaction.kind === "explain") {
      const input = el(documentRef, "textarea", "ms-textarea");
      input.value = interaction.value || "";
      input.setAttribute("aria-label", "Lesson explanation");
      wrap.append(input, button(documentRef, "Save explanation", "ms-button ms-button-secondary", () => interaction.onSave?.(input.value)));
    }
    if (interaction.kind === "confidence") {
      const select = el(documentRef, "select", "ms-select");
      select.setAttribute("aria-label", "Lesson confidence");
      ["", "Low", "Medium", "High"].forEach((value) => {
        const option = documentRef.createElement("option");
        option.value = value;
        option.textContent = value || "Rate confidence";
        option.selected = value === interaction.value;
        select.append(option);
      });
      select.addEventListener("change", () => { if (select.value) interaction.onChange?.(select.value); });
      wrap.append(select);
    }
    if (interaction.kind === "checkpoint") {
      wrap.append(el(documentRef, "p", "ms-planned-text", interaction.body || ""));
      if (interaction.submitted) wrap.append(el(documentRef, "p", "ms-success-text", "Checkpoint submitted."));
      else wrap.append(button(documentRef, "Submit Level 0 checkpoint", "ms-button ms-button-secondary", interaction.onSubmit));
    }
    return wrap;
  }

  function renderPracticeView(documentRef, model = {}) {
    const root = el(documentRef, "section", "ms-screen ms-practice");
    root.append(sectionHeader(documentRef, {
      id: "practiceTitle",
      kicker: "Practice",
      title: "Local practice routes",
      body: "Run authored local routes, then inspect specialization paths that remain honestly planned."
    }));
    const grid = el(documentRef, "div", "ms-practice-layout");
    const recommended = el(documentRef, "article", "ms-card ms-practice-feature");
    recommended.append(el(documentRef, "div", "ms-kicker", "Recommended practice"));
    recommended.append(el(documentRef, "h3", "", model.recommendedRoute?.title || "Practice Library"));
    recommended.append(el(documentRef, "p", "", model.recommendedRoute?.description || "Open authored local routes without touching real devices."));
    recommended.append(facts(documentRef, model.recommendedFacts || []));
    recommended.append(button(documentRef, model.routeActionLabel || "Open Practice Library", "ms-button ms-button-primary", model.onOpenPractice));
    grid.append(recommended);
    const specializations = el(documentRef, "section", "ms-specialization-grid");
    (model.specializations || []).forEach((path) => {
      const card = el(documentRef, "article", "ms-card ms-specialization-card");
      card.append(el(documentRef, "div", "ms-kicker", path.statusText || "Planned"));
      card.append(el(documentRef, "h3", "", path.title));
      card.append(facts(documentRef, path.facts || []));
      card.append(el(documentRef, "p", "", path.body || "Detailed path mapping is planned."));
      specializations.append(card);
    });
    grid.append(specializations);
    root.append(grid);
    return root;
  }

  function renderProgressDashboard(documentRef, model = {}) {
    const root = el(documentRef, "section", "ms-screen ms-progress");
    root.append(sectionHeader(documentRef, {
      id: "progressTitle",
      kicker: "Progress",
      title: "Beginner progress dashboard",
      body: "Review local orientation progress without inventing mastery, XP, streaks, or badges."
    }));
    root.append(renderDescription(documentRef, components().ProgressDashboard({
      facts: model.metrics || [],
      percent: model.progressPercent || 0,
      progressLabel: model.progressLabel || "",
      actionLabel: "Resume Level 0",
      onAction: model.onResume
    })));
    root.append(renderDescription(documentRef, components().RecentActivityStrip({ items: model.recentActivity || [] })));
    const row = el(documentRef, "section", "ms-recommendation-row");
    row.append(el(documentRef, "strong", "", model.recommendation || "Recommended next action: resume the active lesson."));
    row.append(button(documentRef, "Change Path", "ms-button ms-button-quiet", model.onChangePath));
    root.append(row);
    return root;
  }

  function renderTechnicianToolsGrid(documentRef, model = {}) {
    const root = el(documentRef, "section", "ms-screen ms-tools");
    root.append(sectionHeader(documentRef, {
      id: "toolsTitle",
      kicker: "Technician tools",
      title: "Mission tools",
      body: "Nine local tools with distinct destinations. Instructor controls stay outside beginner navigation."
    }));
    const tools = el(documentRef, "section", "ms-tools-grid", "");
    (model.tools || []).forEach((tool) => {
      tools.append(renderDescription(documentRef, components().TechnicianToolCard({
        tool,
        symbol: icons()?.toolSymbol(tool.id),
        onAction: () => model.onOpenTool?.(tool)
      })));
    });
    root.append(tools);
    return root;
  }

  const api = Object.freeze({
    renderMissionStudioHomeView,
    renderCourseMapView,
    renderLevelOverviewView,
    renderLessonView,
    renderPracticeView,
    renderProgressDashboard,
    renderTechnicianToolsGrid
  });

  global.CommandDoctorMissionStudioViews = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
