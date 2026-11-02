const test = require("node:test");
const assert = require("node:assert/strict");
const { getStageGateError } = require("../src/services/applicationStageRules");

const completedScreening = (overrides = {}) => ({
  interviewType: "SCREENING",
  status: "COMPLETED",
  participants: [
    { employeeId: "EMP-1", role: "LEAD" },
    { employeeId: "EMP-2", role: "PANELIST" },
    { employeeId: "EMP-3", role: "OBSERVER" },
  ],
  scorecards: [
    { reviewerId: "EMP-1" },
    { reviewerId: "EMP-2" },
  ],
  ...overrides,
});

test("requires a completed interview before advancing to technical", () => {
  assert.match(
    getStageGateError("TECHNICAL", [], false),
    /completed screening interview/i,
  );
  assert.match(
    getStageGateError(
      "TECHNICAL",
      [completedScreening({ status: "SCHEDULED" })],
      false,
    ),
    /must be completed/i,
  );
});

test("requires a scorecard from each assigned non-observer interviewer", () => {
  assert.match(
    getStageGateError(
      "TECHNICAL",
      [completedScreening({ scorecards: [{ reviewerId: "EMP-1" }] })],
      false,
    ),
    /every assigned screening interviewer/i,
  );
});

test("allows advancement when all assigned interviewers submitted reviews", () => {
  assert.equal(
    getStageGateError("TECHNICAL", [completedScreening()], false),
    null,
  );
});

test("ignores cancelled interviews and observer scorecards are not required", () => {
  const cancelledInterview = completedScreening({ status: "CANCELLED" });
  const reviewedInterview = completedScreening({
    participants: [{ employeeId: "EMP-1", role: "LEAD" }],
    scorecards: [{ reviewerId: "EMP-1" }],
  });

  assert.equal(
    getStageGateError(
      "TECHNICAL",
      [cancelledInterview, reviewedInterview],
      false,
    ),
    null,
  );
});

test("requires an accepted offer before advancing to hired", () => {
  assert.match(
    getStageGateError("HIRED", [], false),
    /accepted offer is required/i,
  );
  assert.equal(getStageGateError("HIRED", [], true), null);
});

test("does not add review gates to entry or terminal decision stages", () => {
  assert.equal(getStageGateError("SCREENING", [], false), null);
  assert.equal(getStageGateError("REJECTED", [], false), null);
  assert.equal(getStageGateError("WITHDRAWN", [], false), null);
});
