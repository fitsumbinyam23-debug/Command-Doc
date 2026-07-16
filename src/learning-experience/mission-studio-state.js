"use strict";

(function exposeMissionStudioState(global) {
  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function level0Completion(progress = {}, lessons = [], stepIds = []) {
    const completedLessons = safeArray(progress.completed_lesson_ids).length;
    const lessonCount = Math.max(1, lessons.length);
    const stepIndex = Math.max(0, stepIds.indexOf(progress.current_step_id || "mission"));
    const lessonIndex = Math.max(0, lessons.findIndex((lesson) => lesson.lesson_id === progress.current_lesson_id));
    const totalSteps = Math.max(1, lessonCount * Math.max(1, stepIds.length));
    const completedSteps = progress.level_complete ? totalSteps : Math.min(totalSteps, (completedLessons * stepIds.length) + stepIndex + 1);
    return {
      percent: Math.min(100, Math.round((completedSteps / totalSteps) * 100)),
      completedLessons,
      lessonCount,
      stepIndex,
      lessonIndex,
      completedSteps,
      totalSteps
    };
  }

  function currentLesson(progress = {}, lessons = []) {
    return safeArray(lessons).find((lesson) => lesson.lesson_id === progress.current_lesson_id) || lessons[0] || null;
  }

  function recentActivity({ progress = {}, lesson, historyCount = 0, vendorProgressCount = 0, currentStepLabel = "Mission" } = {}) {
    return [
      {
        symbol: "LS",
        title: lesson?.title || "Level 0",
        detail: `Current step: ${currentStepLabel}`
      },
      {
        symbol: "CF",
        title: "Confidence",
        detail: progress.confidence_by_lesson?.[progress.current_lesson_id] || "Not rated"
      },
      {
        symbol: "LC",
        title: "Local records",
        detail: `${historyCount} reports, ${vendorProgressCount} vendor tracks`
      }
    ];
  }

  function phaseStatus(phase = {}, humanStatus = (value) => value || "planned") {
    return {
      levelCount: safeArray(phase.level_ids).length,
      statusText: humanStatus(phase.status),
      hoursText: phase.estimated_learning_hours ? `${phase.estimated_learning_hours} hours` : "Planned duration"
    };
  }

  function levelFacts(level = {}, humanStatus = (value) => value || "planned", levelNameFor = null) {
    const prerequisites = safeArray(level.prerequisite_level_ids);
    const modules = safeArray(level.modules);
    const commandIds = safeArray(level.command_ids);
    const prerequisiteText = prerequisites.length
      ? prerequisites
          .map((id) => (typeof levelNameFor === "function" ? levelNameFor(id) : "Requires prior level review"))
          .filter(Boolean)
          .join(", ")
      : "No prerequisites";
    return [
      level.estimated_learning_hours ? `${level.estimated_learning_hours} hours` : "Planned duration",
      modules.length ? `${modules.length} modules` : "Module sequence planned",
      commandIds.length ? `Mapped commands planned: ${commandIds.length}` : "Command lessons are planned",
      prerequisites.length ? prerequisiteText : "No prerequisites",
      humanStatus(level.practice_status),
      humanStatus(level.review_status)
    ];
  }

  const api = Object.freeze({
    level0Completion,
    currentLesson,
    recentActivity,
    phaseStatus,
    levelFacts
  });

  global.CommandDoctorMissionStudioState = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
