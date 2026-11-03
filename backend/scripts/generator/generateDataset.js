const path = require("path");
const { spawnSync } = require("child_process");
const config = require("./config");
const { getExportDir } = require("./paths");

const steps = [
  "assertEmptyDatabase.js",
  "generateEmployees.js",
  "generateRequisitions.js",
  "generateRequisitionDetails.js",
  "approveRequisitions.js",
  "generateCandidates.js",
  "generateApplications.js",
  "generateInterviewPanels.js",
  "generateAvailability.js",
  "advanceApplications.js",
  "generateInterviews.js",
  "generateScorecards.js",
  "generateLaterStageInterviews.js",
  "generateOffers.js",
  "injectAnomalies.js",
  "exportData.js",
  "validateData.js",
];

if (!process.env.HIRE_FLOW_EXPORT_DIR) {
  process.env.HIRE_FLOW_EXPORT_DIR = path.join(
    __dirname,
    "../../exports",
    `seed-${config.seed}`,
  );
}

if (require("fs").existsSync(path.join(getExportDir(), "ground_truth.json"))) {
  throw new Error(
    `Ground truth already exists in ${getExportDir()}. Choose an unused HIRE_FLOW_EXPORT_DIR.`,
  );
}

for (const step of steps) {
  console.log(`\n=== ${step} ===`);
  const result = spawnSync(
    process.execPath,
    [path.join(__dirname, step)],
    {
      cwd: path.resolve(__dirname, "../.."),
      env: process.env,
      stdio: "inherit",
    },
  );

  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.exitCode = result.status || 1;
    break;
  }
}

if (process.exitCode) {
  console.error(
    `Dataset generation stopped. Seed=${config.seed}; no database reset was performed.`,
  );
}
