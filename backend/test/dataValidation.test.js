const test = require("node:test");
const assert = require("node:assert/strict");
const {
  findSchemaIssues,
  groundTruthMatches,
} = require("../scripts/generator/dataValidation");
const { getCardinality } = require("../scripts/generator/generateDataDictionary");

test("validates schema enums, composite foreign keys, and uniqueness", () => {
  const models = [
    {
      name: "Parent",
      fields: [
        { name: "parentId", kind: "scalar", type: "String", isId: true, isRequired: true },
      ],
      uniqueFields: [],
    },
    {
      name: "Child",
      fields: [
        { name: "childId", kind: "scalar", type: "String", isId: true, isRequired: true },
        { name: "parentId", kind: "scalar", type: "String", isRequired: true },
        { name: "state", kind: "enum", type: "State", isRequired: true },
        {
          name: "parent",
          kind: "object",
          type: "Parent",
          relationFromFields: ["parentId"],
          relationToFields: ["parentId"],
        },
      ],
      uniqueFields: [["parentId", "state"]],
    },
  ];
  const issues = findSchemaIssues({
    models,
    recordsByModel: new Map([
      ["Parent", [{ parentId: "P-1" }]],
      [
        "Child",
        [
          { childId: "C-1", parentId: "P-1", state: "BAD" },
          { childId: "C-2", parentId: "MISSING", state: "BAD" },
          { childId: "C-3", parentId: "P-1", state: "BAD" },
        ],
      ],
    ]),
    enumValues: new Map([["State", ["GOOD"]]]),
  });

  assert.ok(issues.some((issue) => issue.check.includes("allowed values")));
  assert.ok(issues.some((issue) => issue.check.includes("foreign key")));
  assert.ok(issues.some((issue) => issue.check.includes("unique constraint")));
});

test("requires exact ground-truth entity matches", () => {
  const label = {
    type: "OFFER_EXCEEDS_SALARY_BAND",
    entityId: "OFF-000001",
    relatedEntityId: null,
  };
  assert.equal(
    groundTruthMatches(
      [{ ...label, entityId: "OFF-000002" }],
      label,
    ),
    false,
  );
  assert.equal(groundTruthMatches([{ ...label }], label), true);
});

test("matches double-booking labels without depending on pair order", () => {
  assert.equal(
    groundTruthMatches(
      [
        {
          type: "INTERVIEWER_DOUBLE_BOOKED",
          entityId: "INT-2",
          relatedEntityId: "INT-1",
        },
      ],
      {
        type: "INTERVIEWER_DOUBLE_BOOKED",
        entityId: "INT-1",
        relatedEntityId: "INT-2",
      },
    ),
    true,
  );
});

test("documents many-to-one relations from runtime Prisma model metadata", () => {
  const relationName = "ParentToChild";
  const models = {
    Parent: {
      fields: [
        {
          kind: "object",
          type: "Child",
          relationName,
          isList: true,
        },
      ],
    },
    Child: {
      fields: [
        {
          kind: "object",
          type: "Parent",
          relationName,
          isList: false,
        },
      ],
    },
  };

  assert.equal(
    getCardinality("Child", models.Child.fields[0], models),
    "N:1",
  );
  assert.equal(
    getCardinality("Parent", models.Parent.fields[0], models),
    "1:N",
  );
});
