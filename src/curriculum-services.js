"use strict";

(() => {
  const keyFor = (command) => `${command.vendor}:${String(command.canonical_command || command.command || "").trim().toLowerCase().replace(/\s+/g, " ")}`;

  class CommandInventoryService {
    constructor(commands = []) { this.commands = commands; }
    byVendor(vendor) { return vendor === "all" ? this.commands : this.commands.filter((command) => command.vendor === vendor); }
    find(commandId) { return this.commands.find((command) => command.command_id === commandId) || null; }
    coverage(vendor) { return this.byVendor(vendor); }
  }

  class CurriculumRegistry {
    constructor(index = {}) { this.index = index; }
    modules(vendor) { return vendor === "all" ? Object.values(this.index.modules || {}).flat() : this.index.modules?.[vendor] || []; }
  }

  class VendorTrackService {
    constructor(vendors = {}) { this.vendors = vendors; }
    label(vendor) { return this.vendors[vendor] || vendor; }
  }

  class LessonRegistry {
    constructor(index = {}) { this.index = index; }
    lessons(vendor) { return new CurriculumRegistry(this.index).modules(vendor).flatMap((module) => module.lessons || []); }
  }

  class RouteRegistry {
    constructor(routes = []) { this.routes = routes; }
    byVendor(vendor) { return vendor === "all" ? this.routes : this.routes.filter((route) => route.vendor === vendor); }
  }

  class CommandCoverageService {
    constructor(inventory) { this.inventory = inventory; }
    summary(vendor) {
      const commands = this.inventory.byVendor(vendor);
      return commands.reduce((summary, command) => {
        summary.total += 1;
        summary[command.simulator_support] = (summary[command.simulator_support] || 0) + 1;
        summary[command.learning_status] = (summary[command.learning_status] || 0) + 1;
        return summary;
      }, { total: 0 });
    }
  }

  class LearningProgressStore {
    static key(command) { return keyFor(command); }
    static learned(progress, command) { return Boolean(progress?.learnedCommands?.[keyFor(command)]); }
  }

  class ReviewQueueService {
    static needsReview(progress, routeId) { return Boolean(progress?.reviewRoutes?.[routeId]); }
  }

  window.CommandDoctorCurriculum = { CommandInventoryService, CurriculumRegistry, VendorTrackService, LessonRegistry, RouteRegistry, CommandCoverageService, LearningProgressStore, ReviewQueueService };
})();
