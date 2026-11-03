const compositeKey = (values) =>
  JSON.stringify(values.map((value) => (value instanceof Date ? value.toISOString() : value)));

const findSchemaIssues = ({ models, recordsByModel, enumValues }) => {
  const issues = [];

  for (const model of models) {
    const records = recordsByModel.get(model.name) || [];
    const uniqueFieldSets = model.fields
      .filter((field) => field.isId || field.isUnique)
      .map((field) => [field.name]);

    for (const fields of model.uniqueFields || []) {
      if (!uniqueFieldSets.some((existing) => compositeKey(existing) === compositeKey(fields))) {
        uniqueFieldSets.push(fields);
      }
    }

    for (const fields of uniqueFieldSets) {
      const seen = new Set();
      const duplicates = [];
      for (const record of records) {
        const values = fields.map((field) => record[field]);
        if (values.some((value) => value === null || value === undefined)) continue;
        const key = compositeKey(values);
        if (seen.has(key)) duplicates.push(values);
        seen.add(key);
      }
      if (duplicates.length) {
        issues.push({
          check: `${model.name} unique constraint (${fields.join(", ")})`,
          count: duplicates.length,
          examples: duplicates.slice(0, 5),
        });
      }
    }

    for (const field of model.fields) {
      if (
        (field.kind === "scalar" || field.kind === "enum") &&
        field.isRequired
      ) {
        const missing = records.filter(
          (record) =>
            record[field.name] === null || record[field.name] === undefined,
        );
        if (missing.length) {
          issues.push({
            check: `${model.name}.${field.name} required value`,
            count: missing.length,
            examples: missing.slice(0, 5).map((record) => record[model.fields.find((item) => item.isId)?.name]),
          });
        }
      }

      if (field.kind === "enum") {
        const allowed = enumValues.get(field.type) || [];
        const invalid = records.filter(
          (record) =>
            record[field.name] != null && !allowed.includes(record[field.name]),
        );
        if (invalid.length) {
          issues.push({
            check: `${model.name}.${field.name} allowed values`,
            count: invalid.length,
            examples: invalid.slice(0, 5).map((record) => record[field.name]),
          });
        }
      }

      if (field.kind !== "object" || !field.relationFromFields?.length) continue;

      const targetRecords = recordsByModel.get(field.type) || [];
      const targetFields = field.relationToFields || [];
      const targetKeys = new Set(
        targetRecords.map((record) =>
          compositeKey(targetFields.map((targetField) => record[targetField])),
        ),
      );
      const invalid = records.filter((record) => {
        const values = field.relationFromFields.map(
          (sourceField) => record[sourceField],
        );
        if (values.every((value) => value == null)) return false;
        return (
          values.some((value) => value == null) ||
          !targetKeys.has(compositeKey(values))
        );
      });

      if (invalid.length) {
        issues.push({
          check: `${model.name}.${field.name} foreign key`,
          count: invalid.length,
          examples: invalid.slice(0, 5).map((record) =>
            field.relationFromFields.map((name) => record[name]),
          ),
        });
      }
    }

    if (
      model.fields.some((field) => field.name === "startTime") &&
      model.fields.some((field) => field.name === "endTime")
    ) {
      const invalid = records.filter(
        (record) =>
          !(record.startTime instanceof Date) ||
          !(record.endTime instanceof Date) ||
          record.startTime >= record.endTime,
      );
      if (invalid.length) {
        issues.push({
          check: `${model.name} date ordering`,
          count: invalid.length,
          examples: invalid.slice(0, 5).map((record) => record[model.fields.find((field) => field.isId)?.name]),
        });
      }
    }
  }

  return issues;
};

const exactGroundTruthMatch = (detected, label) =>
  detected.some(
    (item) =>
      item.type === label.type &&
      item.entityId === label.entityId &&
      (item.relatedEntityId ?? null) === (label.relatedEntityId || null),
  );

const groundTruthMatches = (detected, label) => {
  if (label.type === "INTERVIEWER_DOUBLE_BOOKED") {
    return detected.some(
      (item) =>
        item.type === label.type &&
        [item.entityId, item.relatedEntityId].sort().join("|") ===
          [label.entityId, label.relatedEntityId].sort().join("|"),
    );
  }
  return exactGroundTruthMatch(detected, label);
};

module.exports = {
  findSchemaIssues,
  exactGroundTruthMatch,
  groundTruthMatches,
};
