const fs = require("fs");
const path = require("path");
const generatedClientPath =
  process.env.HIRE_FLOW_PRISMA_CLIENT || "../../src/generated/prisma";
const { Prisma, PrismaClient } = require(generatedClientPath);
const prisma = new PrismaClient();

const fieldRules = {
  "Requisition.requisitionId": "Immutable ID; format REQ-2026-000001 with a six-digit counter.",
  "Candidate.candidateId": "Immutable ID; format CAND-000001 with a six-digit counter.",
  "Application.applicationId": "Immutable composite ID; format APP-<candidate-id>-<requisition-id>.",
  "Application.currentStage": "Must follow the documented linear workflow; REJECTED and WITHDRAWN are terminal.",
  "Application.status": "Must agree with HIRED, REJECTED, or WITHDRAWN terminal stage.",
  "Interview.interviewId": "Immutable ID; format INT-2026-000001 with a six-digit counter.",
  "Scorecard.scorecardId": "Immutable composite ID; format SCORE-<interview-id>-<reviewer-id>.",
  "Offer.offerId": "Immutable ID; format OFF-2026-000001 with a six-digit counter.",
  "Requisition.minSalary": "INR per year; must be non-negative and no greater than maxSalary.",
  "Requisition.maxSalary": "INR per year; must be greater than or equal to minSalary.",
  "Requisition.openings": "Whole number; must be greater than zero.",
  "Candidate.experienceYears": "Years; decimal precision 1; must be non-negative.",
  "SkillRequirement.weight": "Relative weight points; must be positive.",
  "Availability.startTime": "UTC timestamp; must be in the future when created.",
  "Availability.endTime": "UTC timestamp; must be after startTime.",
  "Interview.startTime": "UTC timestamp; must be in the future.",
  "Interview.endTime": "UTC timestamp; must be after startTime.",
  "Interview.status": "Only SCHEDULED interviews participate in conflict checks; changes are audit-recorded.",
  "Scorecard.technicalScore": "Score on a 0-10 scale.",
  "Scorecard.communicationScore": "Score on a 0-10 scale.",
  "Scorecard.problemSolvingScore": "Score on a 0-10 scale.",
  "Scorecard.recommendation": "Derived from weighted rubric scores: >=8 STRONG_YES, >=7 YES, >=5 MAYBE, >=3 NO, otherwise STRONG_NO.",
  "ScorecardItem.score": "Rubric score on a 0-10 scale.",
  "EvaluationCriterion.weight": "Relative rubric weight points; must be positive.",
  "Offer.baseSalary": "INR per year; must be positive and within the requisition compensation band.",
  "Offer.bonus": "INR per year; optional and must be non-negative.",
  "Offer.status": "Must follow the approval, send, response, withdrawal, and expiry lifecycle.",
  "Approval.approvalType": "Must match the single populated offerId or requisitionId target.",
  "Approval.decidedAt": "UTC timestamp; absent while PENDING and required after a decision.",
  "ApplicationStageEvent.changedAt": "UTC event timestamp; records a stage transition without replacing prior events.",
};

const escape = (value) => String(value ?? "-").replace(/\|/g, "\\|");
const enumValues = new Map(
  Prisma.dmmf.datamodel.enums.map((item) => [
    item.name,
    item.values.map((value) => value.name),
  ]),
);

const getCardinality = (modelName, field, models) => {
  const target = models[field.type] || Object.values(models).find(
    (candidate) => candidate.name === field.type,
  );
  const counterpart = target?.fields.find(
      (candidate) =>
        candidate.kind === "object" &&
        candidate.type === modelName &&
        candidate.relationName === field.relationName,
    );

  if (field.isList) return "1:N";
  if (counterpart?.isList) return "N:1";
  return "1:1";
};

const fieldType = (field) => {
  if (!field.nativeType) return field.type;
  const [, args] = field.nativeType;
  return args?.length
    ? `${field.type}(${args.join(", ")})`
    : field.type;
};

const fieldDefault = (value) => {
  if (value && typeof value === "object" && value.name) {
    return `${value.name}(${(value.args || []).join(", ")})`;
  }
  return JSON.stringify(value);
};

const generateMarkdown = (models) => {
  let markdown = `# HireFlow Data Dictionary

Generated from the Prisma schema. Field types, requiredness, defaults, enum choices, uniqueness, foreign keys, and relationship cardinality are schema-derived; the validation column documents additional application rules.

## Effective dates and lifecycle history

Availability and interview rows use \`startTime\`/\`endTime\` intervals. There are no separate \`effectiveFrom\`/\`effectiveTo\` version columns. Every successful application stage change creates an \`ApplicationStageEvent\`; interview and offer changes are recorded in \`AuditLog\` with old/new values where applicable. PostgreSQL uses timestamp-without-time-zone columns; application and export values are interpreted as UTC, so configure the database session timezone as UTC.

`;

  for (const [modelName, model] of Object.entries(models)) {
    markdown += `## ${modelName}\n\n`;
    markdown +=
      "| Field | Type | Required | Allowed values / default | Unique / relationship | Unit and validation |\n";
    markdown += "|---|---|---|---|---|---|\n";

    for (const field of model.fields) {
      const details = [];
      if (field.isId) details.push("Primary key");
      if (field.isUnique) details.push("Unique");
      if (field.kind === "object") {
        const cardinality = getCardinality(modelName, field, models);
        details.push(
          `${cardinality} ${field.type}${field.isRequired ? "" : " (optional)"}`,
        );
      }
      if (field.relationFromFields?.length) {
        details.push(`FK: ${field.relationFromFields.join(", ")}`);
      }
      const allowed =
        field.kind === "enum"
          ? enumValues.get(field.type).join(", ")
          : field.hasDefaultValue
            ? `Default: ${fieldDefault(field.default)}`
            : "-";
      const required =
        field.kind === "object" && field.isList
          ? "No (zero or more)"
          : field.isRequired
            ? "Yes"
            : "No";
      const validation =
        fieldRules[`${modelName}.${field.name}`] ||
        (field.kind === "scalar" && field.type === "DateTime"
          ? "UTC timestamp."
          : "-");

      markdown +=
        `| ${escape(field.name)} | ${escape(fieldType(field))}` +
        ` | ${escape(required)}` +
        ` | ${escape(allowed)}` +
        ` | ${escape(details.join("; "))}` +
        ` | ${escape(validation)} |\n`;
    }

    if (model.uniqueFields?.length) {
      markdown += `\nComposite unique constraints: ${model.uniqueFields
        .map((fields) => `\`${fields.join(" + ")}\``)
        .join(", ")}.\n`;
    }
    markdown += "\n";
  }

  markdown += `## Application lifecycle

Allowed forward transitions are APPLIED → SCREENING → TECHNICAL → MANAGERIAL → HR → OFFER → HIRED. REJECTED and WITHDRAWN are terminal decision stages. Progression requires the prior interview to be completed and every assigned non-observer interviewer to have a scorecard; HIRED requires an accepted offer.

## Cross-record validation

- Applications are unique per candidate/requisition pair.
- Each foreign key and enum value is checked against the Prisma schema by \`validateData.js\`.
- Requisition compensation bands must be ordered; offer base salary must fall within the related band.
- Interview and availability end times must be later than start times.
- Approval must reference exactly one target, matching \`approvalType\`.
- Scorecard recommendations are derived from weighted active rubric criteria, not independently assigned.
- Known exception records are labeled separately in \`ground_truth.csv\` and \`ground_truth.json\`; labels are not included in operational feature exports.
`;

  return markdown;
};

const run = async () => {
  try {
    const models = prisma._runtimeDataModel?.models;
    if (!models) throw new Error("Prisma runtime model metadata unavailable.");

    const markdown = generateMarkdown(models);
    const outputs = [
      path.join(__dirname, "../../docs/DATA_DICTIONARY.md"),
      path.join(__dirname, "../../../docs/data-dictionary.md"),
    ];
    for (const outputPath of outputs) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, markdown);
    }
    console.log("Data dictionaries generated successfully.");
    console.log(`Models documented: ${Object.keys(models).length}`);
  } catch (error) {
    console.error("Data dictionary generation failed:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
};

if (require.main === module) run();

module.exports = { generateMarkdown, getCardinality };
