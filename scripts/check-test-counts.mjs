import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const baseline = JSON.parse(readFileSync(join(root, "scripts/test-count-baseline.json"), "utf8"));
const vitestReportPath = resolve(process.argv[2] ?? "test-results/vitest.json");
const playwrightReportPath = resolve(process.argv[3] ?? "test-results/playwright.json");

function filesUnder(directory, pattern) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory() && entry.name !== "e2e") files.push(...filesUnder(path, pattern));
    if (entry.isFile() && pattern.test(entry.name)) files.push(path);
  }
  return files;
}

function readReport(path, label) {
  try {
    const content = readFileSync(path, "utf8");
    const jsonStart = content.indexOf("{");
    return JSON.parse(jsonStart >= 0 ? content.slice(jsonStart) : content);
  } catch (error) {
    throw new Error(`Unable to read ${label} report at ${path}: ${error.message}`);
  }
}

function assertAtLeast(actual, expected, label) {
  if (actual < expected) throw new Error(`${label} decreased: ${actual} < ${expected}`);
}

function assertReportCount(value, label) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} is missing or invalid`);
  }
}

const vitest = readReport(vitestReportPath, "Vitest");
const playwright = readReport(playwrightReportPath, "Playwright");
for (const [key, value] of Object.entries({
  total: vitest.numTotalTests,
  passed: vitest.numPassedTests,
  failed: vitest.numFailedTests,
  skipped: vitest.numPendingTests,
})) {
  assertReportCount(value, `Vitest ${key} count`);
}
if (!Array.isArray(vitest.testResults) || vitest.testResults.length === 0) {
  throw new Error("Vitest report does not contain test results");
}
assertReportCount(playwright.stats?.expected, "Playwright passed count");
assertReportCount(playwright.stats?.unexpected, "Playwright failed count");
assertReportCount(playwright.stats?.skipped, "Playwright skipped count");
const vitestFiles = filesUnder(join(root, "tests"), /\.test\.(ts|tsx)$/);
const unitFiles = vitestFiles.filter((path) => path.endsWith(".test.ts"));
const componentFiles = vitestFiles.filter((path) => path.endsWith(".test.tsx"));
const playwrightFiles = filesUnder(join(root, "tests/e2e"), /\.spec\.ts$/);

assertAtLeast(vitestFiles.length, baseline.vitest.minTestFiles, "Vitest test files");
assertAtLeast(vitest.numTotalTests, baseline.vitest.minTests, "Vitest tests");
assertAtLeast(vitest.numPassedTests, baseline.vitest.minPassedTests, "Vitest passed tests");
if (vitest.numFailedTests > 0) throw new Error(`Vitest failures: ${vitest.numFailedTests}`);
if (vitest.numPendingTests > baseline.vitest.maxSkipped) {
  throw new Error(
    `Vitest skips increased: ${vitest.numPendingTests} > ${baseline.vitest.maxSkipped}`,
  );
}
if (unitFiles.length === 0 || componentFiles.length === 0) {
  throw new Error("Both Vitest unit and component test projects must contain discovered files");
}

assertAtLeast(playwrightFiles.length, baseline.playwright.minSpecFiles, "Playwright spec files");
const playwrightStats = playwright.stats ?? {};
const playwrightTests =
  (playwrightStats.expected ?? 0) +
  (playwrightStats.unexpected ?? 0) +
  (playwrightStats.flaky ?? 0) +
  (playwrightStats.skipped ?? 0);
assertAtLeast(playwrightTests, baseline.playwright.minTests, "Playwright tests");
if ((playwrightStats.unexpected ?? 0) > 0)
  throw new Error(`Playwright failures: ${playwrightStats.unexpected}`);
if ((playwrightStats.skipped ?? 0) > baseline.playwright.maxSkipped) {
  throw new Error(
    `Playwright skips increased: ${playwrightStats.skipped} > ${baseline.playwright.maxSkipped}`,
  );
}

console.log(
  JSON.stringify(
    {
      vitest: {
        files: vitestFiles.length,
        projects: {
          unit: unitFiles.length > 0,
          component: componentFiles.length > 0,
        },
        total: vitest.numTotalTests,
        passed: vitest.numPassedTests,
        skipped: vitest.numPendingTests,
        failed: vitest.numFailedTests,
      },
      playwright: {
        specFiles: playwrightFiles.length,
        total: playwrightTests,
        passed: playwrightStats.expected ?? 0,
        skipped: playwrightStats.skipped ?? 0,
        failed: playwrightStats.unexpected ?? 0,
      },
    },
    null,
    2,
  ),
);
