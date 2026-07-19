"use strict";

(function exposeMissionStudioHomeV2ViewModel(global) {
  const ASSET_ROOT = "data/mission-studio-home-v2/";
  const SHORTCUT_IDS = Object.freeze(["diagnose", "command-lookup", "switch-workbench", "saved-reports"]);

  function clampPercent(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(0, Math.min(100, Math.round(number)));
  }

  function plural(count, singular, pluralForm = `${singular}s`) {
    return `${count} ${count === 1 ? singular : pluralForm}`;
  }

  function sentence(value, fallback) {
    const text = String(value || "").trim();
    return text || fallback;
  }

  function compact(value, maxLength = 84) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (text.length <= maxLength) return text;
    return `${text.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
  }

  function currentLessonIndex(lessons, progress) {
    const index = lessons.findIndex((lesson) => lesson.lesson_id === progress?.current_lesson_id);
    return Math.max(0, index);
  }

  function currentStepIndex(stepIds, progress) {
    const index = stepIds.indexOf(progress?.current_step_id || "mission");
    return Math.max(0, index);
  }

  function lessonObjective(lesson) {
    return sentence(lesson?.objective || lesson?.mission || lesson?.learn, "Continue the active Level 0 lesson.");
  }

  function checkpointState(progress, completion) {
    if (progress?.level_complete) {
      return {
        title: "Orientation complete",
        body: "Level 0 checkpoint is complete.",
        state: "Complete"
      };
    }
    if (progress?.final_checkpoint_result?.submitted) {
      return {
        title: "Checkpoint submitted",
        body: "The Level 0 checkpoint response is saved locally.",
        state: "Submitted"
      };
    }
    const remainingToCheckpoint = Math.max(0, (completion.lessonCount || 1) - 1 - (completion.completedLessons || 0));
    if (remainingToCheckpoint === 0) {
      return {
        title: "Next checkpoint",
        body: "The checkpoint opens from the final Level 0 lesson.",
        state: "Ready soon"
      };
    }
    return {
      title: "Next checkpoint",
      body: `${plural(remainingToCheckpoint, "lesson")} to first reflection.`,
      state: "Not ready yet"
    };
  }

  function toolById(tools, id) {
    return tools.find((tool) => tool.id === id) || { id, label: id, description: "" };
  }

  function shortcutDescription(id, tool, historyCount) {
    if (id === "diagnose") return "Summarize output.";
    if (id === "command-lookup") return "Syntax examples.";
    if (id === "switch-workbench") return "Network state.";
    if (id === "saved-reports") return plural(historyCount, "saved report");
    return tool.description || "Open tool.";
  }

  function newestReportActivity(report) {
    if (!report) {
      return {
        type: "Report",
        title: "No saved reports yet",
        detail: "Saved diagnostics will appear here."
      };
    }
    const facts = [report.vendor, report.command, report.status].filter(Boolean).join(" - ");
    const savedAt = report.timestamp ? `Saved ${report.timestamp}` : "";
    return {
      type: "Report",
      title: compact(report.diagnosis || report.ticketSummary || report.command || "Saved diagnostic report", 58),
      detail: compact([facts, savedAt].filter(Boolean).join(" - ") || "Saved locally from real history.", 88)
    };
  }

  function recentToolActivity(recentTool, hasRecentTool) {
    if (!hasRecentTool) {
      return {
        type: "Tool",
        title: "No technician tool opened yet",
        detail: "Open a tool from Home or Tools to record the latest shortcut."
      };
    }
    return {
      type: "Tool",
      title: recentTool?.label || "Technician tool",
      detail: recentTool?.description || "Recent technician tool"
    };
  }

  function createRecentActivity({ currentLesson, currentStepLabel, latestReport, recentTool, hasRecentTool }) {
    return [
      newestReportActivity(latestReport),
      {
        type: "Lesson",
        title: currentLesson?.title || "Level 0",
        detail: `Current step: ${currentStepLabel}`
      },
      recentToolActivity(recentTool, hasRecentTool)
    ];
  }

  function createJourneyPreview(lessons, lessonIndex, currentStepLabel) {
    return lessons.slice(lessonIndex, lessonIndex + 3).map((lesson, offset) => {
      const absoluteIndex = lessonIndex + offset;
      return {
        number: absoluteIndex + 1,
        title: lesson.title,
        current: offset === 0,
        detail: offset === 0
          ? `Current - ${currentStepLabel}`
          : offset === 1
            ? `Next - ${sentence(lesson.objective, "Continue the Level 0 path.")}`
            : `Upcoming - ${sentence(lesson.objective, "Continue the Level 0 path.")}`
      };
    });
  }

  function createHomeV2ViewModel(input = {}) {
    const lessons = Array.isArray(input.lessons) ? input.lessons : [];
    const tools = Array.isArray(input.tools) ? input.tools : [];
    const progress = input.progress || {};
    const stepIds = Array.isArray(input.stepIds) ? input.stepIds : [];
    const stepNames = Array.isArray(input.stepNames) ? input.stepNames : [];
    const lessonIndex = currentLessonIndex(lessons, progress);
    const stepIndex = currentStepIndex(stepIds, progress);
    const currentLesson = input.currentLesson || lessons[lessonIndex] || lessons[0] || null;
    const currentStepId = stepIds[stepIndex] || progress.current_step_id || "mission";
    const currentStepLabel = stepNames[stepIndex] || input.currentStepLabel || "Mission";
    const completion = {
      percent: clampPercent(input.completion?.percent),
      completedLessons: Math.max(0, Number(input.completion?.completedLessons || 0)),
      lessonCount: Math.max(1, Number(input.completion?.lessonCount || lessons.length || 1)),
      stepIndex,
      totalSteps: Math.max(1, Number(input.completion?.totalSteps || (lessons.length || 1) * Math.max(1, stepIds.length || 1))),
      completedSteps: Math.max(0, Number(input.completion?.completedSteps || 0))
    };
    const historyCount = Math.max(0, Number(input.historyCount || 0));
    const history = Array.isArray(input.history) ? input.history : [];
    const recentTool = input.recentTool || toolById(tools, "diagnose");
    const hasRecentTool = Boolean(input.hasRecentTool);
    const remainingLessons = Math.max(0, completion.lessonCount - completion.completedLessons - (progress.level_complete ? 0 : 1));
    const objective = compact(lessonObjective(currentLesson), 92);

    return {
      assets: {
        logo: `${ASSET_ROOT}mission-studio-logo.svg`,
        icons: `${ASSET_ROOT}home-icons.svg`,
        hero: `${ASSET_ROOT}mission-hero-network.svg`
      },
      header: {
        kicker: "Mission Studio",
        title: "Welcome back",
        copy: sentence(input.pathLabel && input.pathLabel !== "Choose a path"
          ? `Continue the ${input.pathLabel} path, build real network intuition, and open technician tools when you need evidence.`
          : "", "Continue the beginner path, build real network intuition, and open technician tools when you need evidence.")
      },
      path: {
        label: sentence(input.pathLabel, "Learn From Zero")
      },
      hero: {
        label: "Continue learning",
        title: currentLesson?.title || "What is a network?",
        lesson: `Lesson ${lessonIndex + 1} - ${currentStepLabel}`,
        copy: `${objective} Current step: ${currentStepLabel}.`,
        progressLabel: "Mission progress",
        progressPercent: completion.percent,
        visualAlt: "A vendor-neutral switch front panel connects an endpoint, gateway, and access point with lit ports and cables."
      },
      progress: {
        title: "Learning progress",
        body: `${plural(remainingLessons, "beginner lesson")} ahead. Current step: ${currentStepLabel}.`,
        percent: completion.percent
      },
      checkpoint: checkpointState(progress, completion),
      technicianAction: {
        title: "Technician quick action",
        body: toolById(tools, "diagnose").description || "Paste output and build evidence.",
        label: "Open Diagnose",
        toolId: "diagnose"
      },
      recentActivity: createRecentActivity({
        currentLesson,
        currentStepLabel,
        latestReport: history[0] || null,
        recentTool,
        hasRecentTool
      }),
      shortcuts: SHORTCUT_IDS.map((id) => {
        const tool = toolById(tools, id);
        return {
          id,
          label: tool.label,
          description: shortcutDescription(id, tool, historyCount)
        };
      }),
      journey: createJourneyPreview(lessons, lessonIndex, currentStepLabel),
      actions: input.actions || {}
    };
  }

  const api = Object.freeze({ createHomeV2ViewModel });
  global.CommandDoctorMissionStudioHomeV2ViewModel = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
