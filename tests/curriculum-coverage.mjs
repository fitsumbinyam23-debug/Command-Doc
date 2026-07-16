import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async (file) => JSON.parse(await fs.readFile(path.join(root, file), "utf8"));
const assert = (condition, message) => {
  if (!condition) throw new Error(`Curriculum coverage test failed: ${message}`);
};

const [catalog, curriculum, commandMapFile, specializations, coverage] = await Promise.all([
  readJson("data/generated/learning-command-catalog.json"),
  readJson("data/curriculum/complete-networking-curriculum.json"),
  readJson("data/curriculum/curriculum-command-map.json"),
  readJson("data/curriculum/curriculum-specializations.json"),
  readJson("reports/curriculum-command-coverage.json")
]);

const catalogCommands = catalog.commands || [];
const commandMap = commandMapFile.commands || [];
const catalogById = new Map(catalogCommands.map((command) => [command.canonical_command_id, command]));
const mappedById = new Map(commandMap.map((record) => [record.canonical_command_id, record]));

assert(curriculum.phases.length === 10, "curriculum has exactly 10 phases");
assert(curriculum.levels.length === 40, "curriculum has exactly 40 levels");
assert(curriculum.levels.every((level, index) => level.level_number === index && level.level_id === `level_${String(index).padStart(2, "0")}`), "levels 0-39 are contiguous and stable");
assert(curriculum.fully_authored_level_ids.join(",") === "level_00", "only Level 0 is fully authored");
assert(curriculum.planned_level_ids.length === 39, "Levels 1-39 are planned");
assert(specializations.specializations.length === 8, "eight specialization paths exist");

const level0 = curriculum.levels.find((level) => level.level_id === "level_00");
assert(level0?.status === "authored", "Level 0 is authored");
const level0Lessons = level0.modules.flatMap((module) => module.lessons || []);
assert(level0Lessons.length >= 8, "Level 0 has production-authored lessons");
for (const lesson of level0Lessons) {
  assert(lesson.status === "authored", `${lesson.lesson_id} is authored`);
  assert(lesson.stepper_steps?.join("|") === "Mission|Learn|See|Key words|Predict|Try|Explain|Confidence|Continue", `${lesson.lesson_id} uses the required stepper`);
  assert(lesson.mastery_eligible === false, `${lesson.lesson_id} does not award command mastery`);
}

for (const level of curriculum.levels.filter((item) => item.level_number > 0)) {
  assert(level.status === "planned_outline", `${level.level_id} is honestly planned`);
  assert(level.mastery_policy?.eligible === false, `${level.level_id} cannot award mastery`);
  assert(level.blocking_reasons?.length, `${level.level_id} has explicit blocking reasons`);
}

assert(commandMap.length === catalogCommands.length, "every authoritative command has one learning record");
for (const command of catalogCommands) {
  const record = mappedById.get(command.canonical_command_id);
  assert(record, `missing command map record for ${command.canonical_command_id}`);
  assert(record.learning_identity === command.canonical_command_id, `${command.canonical_command_id} has stable learning identity`);
  assert(record.vendor_id === command.vendor_id, `${command.canonical_command_id} preserves vendor scope`);
  assert(record.operating_system_family_id === command.operating_system_family_id, `${command.canonical_command_id} preserves operating-system scope`);
  assert(record.module_id && record.level_id, `${command.canonical_command_id} has module and level assignment`);
  assert(record.learning_objectives?.length, `${command.canonical_command_id} has objectives`);
  assert(record.lesson_status, `${command.canonical_command_id} has lesson status`);
  assert(record.practice_status, `${command.canonical_command_id} has practice status`);
  assert(record.verification_status, `${command.canonical_command_id} has verification status`);
  assert(record.rollback_status, `${command.canonical_command_id} has rollback status`);
  assert(record.mastery_policy && record.mastery_policy.eligible === false, `${command.canonical_command_id} has conservative mastery policy`);
  assert(record.review_eligibility, `${command.canonical_command_id} has review eligibility`);
  assert(record.migration_status, `${command.canonical_command_id} has migration status`);
  assert(record.syntax_coverage?.vendor_scoped && record.syntax_coverage?.operating_system_scoped, `${command.canonical_command_id} syntax is scoped`);
  assert(record.alias_identity_policy.includes("same_canonical_learning_identity"), `${command.canonical_command_id} aliases share identity`);
  if (record.migration_status === "complete") {
    assert(record.evidence_requirements?.lesson_stages?.length, `${command.canonical_command_id} complete record has lesson evidence`);
    assert(record.evidence_requirements?.verification_command_ids?.length || record.verification_status === "not_applicable", `${command.canonical_command_id} complete record has verification evidence`);
  }
}

for (const record of commandMap) {
  assert(catalogById.has(record.canonical_command_id), `learning command ID does not exist in catalog: ${record.canonical_command_id}`);
}

const visiting = new Set();
const visited = new Set();
function visit(levelId) {
  if (visiting.has(levelId)) throw new Error(`Curriculum coverage test failed: prerequisite cycle at ${levelId}`);
  if (visited.has(levelId)) return;
  visiting.add(levelId);
  for (const dependency of curriculum.prerequisite_graph[levelId] || []) visit(dependency);
  visiting.delete(levelId);
  visited.add(levelId);
}
for (const level of curriculum.levels) visit(level.level_id);

assert(coverage.authoritative_command_count === catalogCommands.length, "coverage report uses current authoritative count");
assert(coverage.commands_mapped === catalogCommands.length, "coverage report maps every command");
assert(coverage.commands_omitted.length === 0, "coverage report omits no commands");
assert(coverage.vendors_represented.length >= 5, "coverage report represents all current vendors");

console.log(JSON.stringify({
  status: "passed",
  authoritative_command_count: catalogCommands.length,
  commands_mapped: commandMap.length,
  phases: curriculum.phases.length,
  levels: curriculum.levels.length,
  specializations: specializations.specializations.length
}, null, 2));
