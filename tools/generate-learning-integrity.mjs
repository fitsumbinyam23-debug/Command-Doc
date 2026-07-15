import { buildLearningIntegritySystem, compareOutputFiles, writeOutputFiles } from "./learning-integrity-lib.mjs";

const check = process.argv.includes("--check");
const first = await buildLearningIntegritySystem();
const second = await buildLearningIntegritySystem();
const deterministic = JSON.stringify(first.artifacts) === JSON.stringify(second.artifacts);
if (!deterministic) {
  console.error("Learning integrity generation is not deterministic.");
  process.exit(1);
}

if (check) {
  const differences = await compareOutputFiles(first.artifacts);
  if (differences.length) {
    console.error(JSON.stringify({ status: "out_of_date", differences }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ status: "ok", mode: "check", deterministic, validation: first.validation.metrics }, null, 2));
} else {
  first.artifacts.stageReportJson.deterministic_generation = deterministic ? "passed" : "failed";
  first.artifacts.stageReportMarkdown = first.artifacts.stageReportMarkdown.replace("Deterministic generation: pending_compare", "Deterministic generation: passed");
  await writeOutputFiles(first.artifacts);
  console.log(JSON.stringify({ status: "ok", mode: "write", deterministic, validation: first.validation.metrics }, null, 2));
}
