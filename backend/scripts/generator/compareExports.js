const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const volatileFields = new Set([
  "createdAt",
  "updatedAt",
  "appliedAt",
  "assignedAt",
  "submittedAt",
  "requestedAt",
  "decidedAt",
  "changedAt",
  "sentAt",
  "respondedAt",
  "completedAt",
  "startedAt",
  "generatedAt",
  "auditLogId",
]);

const omitTimestampFields = (value) => {
  if (Array.isArray(value)) {
    return value.map(omitTimestampFields);
  }
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !volatileFields.has(key) && key !== "approvalId")
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, omitTimestampFields(item)]),
  );
};

const hashRecords = (records) => {
  const canonicalRecords = records
    .map(omitTimestampFields)
    .map((record) => JSON.stringify(record))
    .sort();
  return crypto
    .createHash("sha256")
    .update(canonicalRecords.join("\n"))
    .digest("hex");
};

const readSnapshot = (directory) => {
  const manifestPath = path.join(directory, "source_manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Missing source_manifest.json in ${directory}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const entities = new Map();
  for (const entity of manifest.entities) {
    const filePath = path.join(directory, entity.jsonFile);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing export file: ${filePath}`);
    }

    const records = JSON.parse(fs.readFileSync(filePath, "utf8"));
    entities.set(entity.entity, {
      count: records.length,
      checksum: hashRecords(records),
    });
  }
  const groundTruthPath = path.join(directory, "ground_truth.json");
  if (fs.existsSync(groundTruthPath)) {
    const records = JSON.parse(fs.readFileSync(groundTruthPath, "utf8"));
    entities.set("ground_truth", {
      count: records.length,
      checksum: hashRecords(records),
    });
  }
  return entities;
};

const compare = (firstPath, secondPath) => {
  const first = readSnapshot(path.resolve(firstPath));
  const second = readSnapshot(path.resolve(secondPath));
  const names = [...new Set([...first.keys(), ...second.keys()])].sort();
  let matches = true;

  for (const name of names) {
    const left = first.get(name);
    const right = second.get(name);
    const match =
      left?.count === right?.count && left?.checksum === right?.checksum;
    if (!match) matches = false;
    console.log(
      `${match ? "MATCH" : "DIFF"} ${name}: ${left?.count ?? "missing"} / ${right?.count ?? "missing"} rows`,
    );
    if (left && right) {
      console.log(`  SHA-256 ${left.checksum} / ${right.checksum}`);
    }
  }

  if (!matches) {
    throw new Error("Export snapshots differ.");
  }
};

if (require.main === module) {
  const [first, second] = process.argv.slice(2);
  if (!first || !second) {
    console.error(
      "Usage: node scripts/generator/compareExports.js <first-export-dir> <second-export-dir>",
    );
    process.exitCode = 2;
  } else {
    try {
      compare(first, second);
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  }
}

module.exports = { compare, hashRecords };
