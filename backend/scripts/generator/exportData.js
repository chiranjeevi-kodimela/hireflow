const fs = require("fs");
const path = require("path");
const prisma = require("../../src/config/database");
const config = require("./config");
const { getExportDir } = require("./paths");

const quoteIdentifier = (identifier) =>
  `"${identifier.replace(/"/g, '""')}"`;

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

const toSQLValue = (value, fieldType) => {
  if (value === null || value === undefined) return "NULL";
  if (fieldType === "Json") {
    return `${quoteLiteral(JSON.stringify(value))}::jsonb`;
  }
  if (value instanceof Date) {
    return `${quoteLiteral(value.toISOString())}::timestamptz`;
  }
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  if (typeof value === "object" && typeof value.toString === "function") {
    return quoteLiteral(value.toString());
  }
  return quoteLiteral(String(value));
};

const quoteLiteral = (value) => `'${value.replace(/'/g, "''")}'`;

const toSQL = (records, modelName, model) => {
  if (records.length === 0) return "";
  const fields = model.fields.filter(
    (field) => field.kind === "scalar" || field.kind === "enum",
  );
  const columns = fields.filter((field) =>
    records.some((record) => Object.hasOwn(record, field.name)),
  );
  const statements = [];

  for (let offset = 0; offset < records.length; offset += 500) {
    const batch = records.slice(offset, offset + 500);
    const values = batch.map(
      (record) =>
        `(${columns
          .map((field) => toSQLValue(record[field.name], field.type))
          .join(", ")})`,
    );
    statements.push(
      `INSERT INTO ${quoteIdentifier(modelName)} (${columns
        .map((field) => quoteIdentifier(field.name))
        .join(", ")}) VALUES\n${values.join(",\n")};`,
    );
  }

  return statements.join("\n\n");
};

const run = async () => {
  const exportDir = getExportDir();
  const csvDir = path.join(exportDir, "csv");
  const jsonDir = path.join(exportDir, "json");
  const runtimeModels = prisma._runtimeDataModel.models;

  try {
    fs.mkdirSync(csvDir, { recursive: true });
    fs.mkdirSync(jsonDir, { recursive: true });

    const manifest = [];
    const sqlStatements = ["SET TIME ZONE 'UTC';", "BEGIN;"];

    for (const modelName of models) {
      const model = prisma[modelName];
      const schemaEntry = Object.entries(runtimeModels).find(
        ([name]) => name.toLowerCase() === modelName.toLowerCase(),
      );
      const [schemaModelName, schemaModel] = schemaEntry || [];

      if (!model || !schemaModel || typeof model.findMany !== "function") {
        throw new Error(`Prisma model not found: ${modelName}`);
      }

      const records = await model.findMany({
        orderBy: undefined,
      });

      const jsonPath = path.join(jsonDir, `${modelName}.json`);
      const csvPath = path.join(csvDir, `${modelName}.csv`);

      fs.writeFileSync(jsonPath, JSON.stringify(records, null, 2));

      fs.writeFileSync(csvPath, toCSV(records));
      sqlStatements.push(toSQL(records, schemaModelName, schemaModel));

      manifest.push({
        entity: modelName,
        recordCount: records.length,
        jsonFile: `json/${modelName}.json`,
        csvFile: `csv/${modelName}.csv`,
      });

      console.log(`${modelName}: ${records.length} records exported`);
    }

    sqlStatements.push("COMMIT;");
    fs.writeFileSync(
      path.join(exportDir, "hireflow.sql"),
      `${sqlStatements.filter(Boolean).join("\n\n")}\n`,
    );

    fs.writeFileSync(
      path.join(exportDir, "source_manifest.json"),
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          seed: config.seed,
          calendarStart: config.calendarStart,
          requestedCounts: {
            requisitions: config.requisitions,
            candidates: config.candidates,
            applications: config.applications,
            interviews: config.interviews,
          },
          format: ["CSV", "JSON", "SQL"],
          sqlFile: "hireflow.sql",
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
