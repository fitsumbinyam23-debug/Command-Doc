import { buildLearningIntegritySystem, compareOutputFiles } from "./learning-integrity-lib.mjs";

const result = await buildLearningIntegritySystem();
const differences = await compareOutputFiles(result.artifacts);
const errors = [...result.validation.errors];
if (differences.length) errors.push("Generated outputs are out of date: " + differences.map((item) => item.file).join(", "));
const summary = {
  passed: errors.length === 0,
  errors,
  warnings: result.validation.warnings,
  broken_references: result.validation.broken_references,
  vendor_errors: result.validation.vendor_errors,
  prerequisite_cycles: result.validation.prerequisite_cycles,
  metrics: result.validation.metrics
};
console.log(JSON.stringify(summary, null, 2));
if (errors.length) process.exit(1);
