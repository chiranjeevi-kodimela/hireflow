const fs = require("fs");
const path = require("path");
const prisma = require("../../src/config/database");

const escape = (value) => String(value ?? "-").replace(/\|/g, "\\|");

const run = async () => {
  try {
    const models = prisma._runtimeDataModel?.models;

    if (!models) {
      throw new Error("Prisma runtime model metadata unavailable.");
    }

    const docsDir = path.join(__dirname, "../../docs");
    fs.mkdirSync(docsDir, { recursive: true });

    let markdown = `# HireFlow Data Dictionary

Generated from the Prisma database schema.

This document describes the database entities, field types, constraints, and relationships.

`;

    for (const [modelName, model] of Object.entries(models)) {
      markdown += `## ${modelName}\n\n`;
      markdown += `| Field | Type | Required | Key / Relationship |\n`;
      markdown += `|---|---|---|---|\n`;

      for (const field of model.fields) {
        let key = [];

        if (field.isId) key.push("Primary key");
        if (field.isUnique) key.push("Unique");

        if (field.kind === "object") {
          key.push(
            `Relation: ${field.type}` +
              (field.isList ? " (one-to-many)" : " (related record)"),
          );
        }

        if (field.relationFromFields?.length) {
          key.push(`Foreign key: ${field.relationFromFields.join(", ")}`);
        }

        markdown +=
          `| ${escape(field.name)} | ${escape(field.type)}` +
          ` | ${field.isRequired ? "Yes" : "No"}` +
          ` | ${escape(key.join("; "))} |\n`;
      }

      markdown += "\n";
    }

    const outputPath = path.join(docsDir, "DATA_DICTIONARY.md");

    fs.writeFileSync(outputPath, markdown);

    console.log("Data dictionary generated successfully.");
    console.log(outputPath);
    console.log(`Models documented: ${Object.keys(models).length}`);
  } catch (error) {
    console.error("Data dictionary generation failed:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
};

run();
