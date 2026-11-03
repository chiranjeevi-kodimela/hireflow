const readPositiveInteger = (name, fallback) => {
  const raw = process.env[name];
  if (raw === undefined) return fallback;

  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return value;
};

const defaultCalendarStart = new Date(Date.now() + 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);
const calendarStart = process.env.HIRE_FLOW_CALENDAR_START || defaultCalendarStart;
const parsedCalendarStart = new Date(`${calendarStart}T00:00:00.000Z`);
if (
  !/^\d{4}-\d{2}-\d{2}$/.test(calendarStart) ||
  Number.isNaN(parsedCalendarStart.getTime()) ||
  parsedCalendarStart.toISOString().slice(0, 10) !== calendarStart
) {
  throw new Error("HIRE_FLOW_CALENDAR_START must be a YYYY-MM-DD date");
}

const config = {
  seed: readPositiveInteger("HIRE_FLOW_SEED", 20261022),
  requisitions: readPositiveInteger("HIRE_FLOW_REQUISITIONS", 200),
  candidates: readPositiveInteger("HIRE_FLOW_CANDIDATES", 5000),
  applications: readPositiveInteger("HIRE_FLOW_APPLICATIONS", 8000),
  interviews: readPositiveInteger("HIRE_FLOW_INTERVIEWS", 2000),
  followupApplications: readPositiveInteger(
    "HIRE_FLOW_FOLLOWUP_APPLICATIONS",
    100,
  ),
  calendarStart,
};

if (config.interviews <= config.followupApplications * 3) {
  throw new Error(
    "HIRE_FLOW_INTERVIEWS must exceed three times HIRE_FLOW_FOLLOWUP_APPLICATIONS",
  );
}

config.screeningInterviews =
  config.interviews - config.followupApplications * 3;

module.exports = config;
