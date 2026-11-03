ALTER TYPE "EmployeeRole" ADD VALUE 'OPERATIONS';

ALTER TABLE "Requisition"
ADD CONSTRAINT "Requisition_salary_band_check"
CHECK ("minSalary" >= 0 AND "maxSalary" >= "minSalary");

ALTER TABLE "Requisition"
ADD CONSTRAINT "Requisition_openings_check"
CHECK ("openings" > 0);

ALTER TABLE "Candidate"
ADD CONSTRAINT "Candidate_experience_years_check"
CHECK ("experienceYears" >= 0);

ALTER TABLE "SkillRequirement"
ADD CONSTRAINT "SkillRequirement_weight_check"
CHECK ("weight" > 0);

ALTER TABLE "Availability"
ADD CONSTRAINT "Availability_time_range_check"
CHECK ("endTime" > "startTime");

ALTER TABLE "Interview"
ADD CONSTRAINT "Interview_time_range_check"
CHECK ("endTime" > "startTime");

ALTER TABLE "Scorecard"
ADD CONSTRAINT "Scorecard_score_range_check"
CHECK (
  "technicalScore" BETWEEN 0 AND 10 AND
  "communicationScore" BETWEEN 0 AND 10 AND
  "problemSolvingScore" BETWEEN 0 AND 10
);

ALTER TABLE "EvaluationCriterion"
ADD CONSTRAINT "EvaluationCriterion_weight_check"
CHECK ("weight" > 0);

ALTER TABLE "ScorecardItem"
ADD CONSTRAINT "ScorecardItem_score_range_check"
CHECK ("score" BETWEEN 0 AND 10);

ALTER TABLE "Offer"
ADD CONSTRAINT "Offer_compensation_check"
CHECK ("baseSalary" > 0 AND ("bonus" IS NULL OR "bonus" >= 0));

ALTER TABLE "Approval"
ADD CONSTRAINT "Approval_exactly_one_target_check"
CHECK (
  ("approvalType" = 'OFFER' AND "offerId" IS NOT NULL AND "requisitionId" IS NULL) OR
  ("approvalType" = 'REQUISITION' AND "requisitionId" IS NOT NULL AND "offerId" IS NULL)
);
