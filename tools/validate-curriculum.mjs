import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = async (file) => JSON.parse(await fs.readFile(path.join(root, file), "utf8"));
const [inventoryFile, routeFile, indexFile, appSource] = await Promise.all([
  read("data/generated/command-inventory.json"),
  read("data/generated/route-inventory.json"),
  read("data/generated/curriculum-index.json"),
  fs.readFile(path.join(root, "src", "app-release-21.js"), "utf8")
]);

const commands = inventoryFile.commands || [];
const routes = routeFile.routes || [];
const errors = [];
const warnings = [];
const ids = new Set();
const aliasKeys = new Set();
const commandIds = new Set(commands.map((command) => command.command_id));

for (const command of commands) {
  if (!command.command_id || ids.has(command.command_id)) errors.push(`Duplicate or missing command ID: ${command.command_id || "(missing)"}`);
  ids.add(command.command_id);
  if (!command.vendor || !command.simulator_support || !command.learning_status) errors.push(`Missing classification: ${command.command_id}`);
  for (const alias of command.aliases || []) {
    const aliasKey = `${command.vendor}:${String(alias).trim().toLowerCase()}`;
    if (aliasKeys.has(aliasKey)) warnings.push(`Shared alias within vendor: ${aliasKey}`);
    aliasKeys.add(aliasKey);
  }
  if (command.changes_configuration && !command.safety_level) errors.push(`Configuration command lacks safety guidance: ${command.command_id}`);
  if (command.simulator_support === "fully_simulated" && !appSource.toLowerCase().includes(String(command.canonical_command).toLowerCase())) warnings.push(`Fully simulated command needs handler review: ${command.command_id}`);
}

const routeIds = new Set();
for (const route of routes) {
  if (!route.route_id || routeIds.has(route.route_id)) errors.push(`Duplicate or missing route ID: ${route.route_id || "(missing)"}`);
  routeIds.add(route.route_id);
  if (!route.vendor || !route.support_level || !route.operating_system_version || !Array.isArray(route.supported_model_profiles)) errors.push(`Route missing vendor/profile/support metadata: ${route.route_id}`);
  const required = route.required_command_ids || [];
  if (route.route_type !== "free_practice" && !required.length) errors.push(`Route has no required commands: ${route.route_id}`);
  if (route.route_type === "free_practice" && route.required_commands_policy !== "unrestricted") errors.push(`Free practice route lacks unrestricted policy: ${route.route_id}`);
  for (const commandId of required) {
    const command = commands.find((item) => item.command_id === commandId);
    if (!commandIds.has(commandId)) errors.push(`Broken route command reference: ${route.route_id} -> ${commandId}`);
    else if (command.vendor !== route.vendor) errors.push(`Cross-vendor route command reference: ${route.route_id} (${route.vendor}) -> ${commandId} (${command.vendor})`);
  }
  for (const lessonId of route.related_lesson_ids || []) if (!String(lessonId).startsWith(`${route.vendor}-`)) errors.push(`Cross-vendor lesson reference: ${route.route_id} -> ${lessonId}`);
  if (route.support_level === "full_state_simulation") {
    for (const commandId of [...required, ...(route.verification_command_ids || [])]) {
      if (commands.find((item) => item.command_id === commandId)?.simulator_support !== "fully_simulated") errors.push(`Fully simulated route has non-full command: ${route.route_id} -> ${commandId}`);
    }
  }
}

for (const [vendor, modules] of Object.entries(indexFile.modules || {})) {
  if (!modules.length) warnings.push(`No generated modules for ${vendor}`);
  for (const module of modules) for (const lesson of module.lessons || []) {
    if (!lesson.commands?.length || !lesson.learning_sequence?.includes("Verification")) errors.push(`Incomplete lesson structure: ${lesson.lesson_id}`);
  }
}

const result = { status: errors.length ? "Errors" : warnings.length ? "Warnings" : "Passed", passed: errors.length === 0, errors, warnings, metrics: { commands: commands.length, routes: routes.length, aliases: aliasKeys.size, classification_coverage_percentage: Math.round((commands.filter((command) => command.learning_status !== "unclassified").length / Math.max(commands.length, 1)) * 100) } };
console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exitCode = 1;
