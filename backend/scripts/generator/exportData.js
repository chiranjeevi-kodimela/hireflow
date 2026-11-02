const fs = require("fs");
const path = require("path");
const prisma = require("../../src/config/database");

const models = [
  "employee",
  "hiringManager",
  "requisition",
  "candidate",
  "application",
  "skillRequirement",
  "interviewPanel",
  "panelMember",
  "availability",
  "interview",
  "interviewParticipant",
  "scorecard",
  "evaluationCriterion",
  "scorecardItem",
  "offer",
  "approval",
  "applicationStageEvent",
  "auditLog",
  "idCounter",
];

const formatValue = (value) => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const toCSV = (records) => {
  if (records.length === 0) return "";

  const headers = [...new Set(records.flatMap(Object.keys))];

  const escapeCSV = (value) => {
    const text = formatValue(value);
    return `"${text.replace(/"/g, '""')}"`;
  };

  const rows = records.map((record) =>
    headers.map((header) => escapeCSV(record[header])).join(","),
  );

  return [headers.map(escapeCSV).join(","), ...rows].join("\n");
};

const run = async () => {
  const exportDir = path.join(__dirname, "../../exports");
  const csvDir = path.join(exportDir, "csv");
  const jsonDir = path.join(exportDir, "json");

  try {
    fs.mkdirSync(csvDir, { recursive: true });
    fs.mkdirSync(jsonDir, { recursive: true });

    const manifest = [];

    for (const modelName of models) {
      const model = prisma[modelName];

      if (!model || typeof model.findMany !== "function") {
        throw new Error(`Prisma model not found: ${modelName}`);
      }

      const records = await model.findMany({
        orderBy: undefined,
      });

      const jsonPath = path.join(jsonDir, `${modelName}.json`);
      const csvPath = path.join(csvDir, `${modelName}.csv`);

      fs.writeFileSync(jsonPath, JSON.stringify(records, null, 2));

      fs.writeFileSync(csvPath, toCSV(records));

      manifest.push({
        entity: modelName,
        recordCount: records.length,
        jsonFile: `json/${modelName}.json`,
        csvFile: `csv/${modelName}.csv`,
      });

      console.log(`${modelName}: ${records.length} records exported`);
    }

    fs.writeFileSync(
      path.join(exportDir, "source_manifest.json"),
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          format: ["CSV", "JSON"],
          entities: manifest,
          totalRecords: manifest.reduce(
            (sum, item) => sum + item.recordCount,
            0,
          ),
        },
        null,
        2,
      ),
    );

    console.log("\nDataset export completed.");
    console.log(`Export directory: ${exportDir}`);
  } catch (error) {
    console.error("Dataset export failed:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
};

run();
