# HireFlow — Data Dictionary

## 1. Requisition

Represents an approved job opening within an organization.

| Field             | Type     | Required | Constraints / Description                                 |
| ----------------- | -------- | -------- | --------------------------------------------------------- |
| requisition_id    | String   | Yes      | Primary key. Format: REQ-2026-000001                      |
| title             | String   | Yes      | Job title                                                 |
| department        | String   | Yes      | Hiring department                                         |
| location          | String   | Yes      | Job location                                              |
| employment_type   | Enum     | Yes      | FULL_TIME, PART_TIME, CONTRACT, INTERN                    |
| min_salary        | Decimal  | Yes      | Minimum approved salary                                   |
| max_salary        | Decimal  | Yes      | Maximum approved salary; must be >= min_salary            |
| openings          | Integer  | Yes      | Must be greater than 0                                    |
| hiring_manager_id | String   | Yes      | Foreign key to HiringManager                              |
| status            | Enum     | Yes      | DRAFT, PENDING_APPROVAL, OPEN, ON_HOLD, CLOSED, CANCELLED |
| created_at        | DateTime | Yes      | Record creation timestamp                                 |
| updated_at        | DateTime | Yes      | Last update timestamp                                     |

## 2. HiringManager

Represents an employee responsible for a requisition.

| Field             | Type     | Required | Constraints / Description      |
| ----------------- | -------- | -------- | ------------------------------ |
| hiring_manager_id | String   | Yes      | Primary key                    |
| employee_id       | String   | Yes      | Unique foreign key to Employee |
| full_name         | String   | Yes      | Manager's name                 |
| email             | String   | Yes      | Unique, valid email            |
| department        | String   | Yes      | Manager's department           |
| designation       | String   | Yes      | Job designation                |
| is_active         | Boolean  | Yes      | Defaults to true               |
| created_at        | DateTime | Yes      | Record creation timestamp      |

**Relationship:** One Employee can have zero or one HiringManager profile.

## 3. Candidate

Represents a person applying for job opportunities.

| Field            | Type     | Required | Constraints / Description        |
| ---------------- | -------- | -------- | -------------------------------- |
| candidate_id     | String   | Yes      | Primary key. Format: CAND-000001 |
| full_name        | String   | Yes      | Candidate's name                 |
| email            | String   | Yes      | Unique, valid email              |
| phone            | String   | No       | Contact number                   |
| location         | String   | No       | Candidate's location             |
| experience_years | Decimal  | Yes      | Must be >= 0                     |
| current_company  | String   | No       | Current or previous company      |
| resume_url       | String   | No       | Resume reference                 |
| created_at       | DateTime | Yes      | Record creation timestamp        |

## 4. Application

Connects a candidate to a requisition.

| Field          | Type     | Required | Constraints / Description                                                        |
| -------------- | -------- | -------- | -------------------------------------------------------------------------------- |
| application_id | String   | Yes      | Primary key. Format: APP-<candidate-id>-<req-id>                                 |
| candidate_id   | String   | Yes      | Foreign key to Candidate                                                         |
| requisition_id | String   | Yes      | Foreign key to Requisition                                                       |
| current_stage  | Enum     | Yes      | APPLIED, SCREENING, TECHNICAL, MANAGERIAL, HR, OFFER, HIRED, REJECTED, WITHDRAWN |
| status         | Enum     | Yes      | ACTIVE, REJECTED, WITHDRAWN, HIRED                                               |
| applied_at     | DateTime | Yes      | Application submission timestamp                                                 |
| updated_at     | DateTime | Yes      | Last update timestamp                                                            |

**Constraints:**

- A candidate can apply to a particular requisition only once.
- Candidate and requisition must exist before an application is created.
- Stage transitions must follow the defined workflow rules.

## 5. SkillRequirement

Defines the skills and expected proficiency for a requisition.

| Field                | Type     | Required | Constraints / Description                |
| -------------------- | -------- | -------- | ---------------------------------------- |
| skill_requirement_id | String   | Yes      | Primary key                              |
| requisition_id       | String   | Yes      | Foreign key to Requisition               |
| skill_name           | String   | Yes      | Example: JavaScript, SQL, React          |
| minimum_level        | Enum     | Yes      | BEGINNER, INTERMEDIATE, ADVANCED, EXPERT |
| is_mandatory         | Boolean  | Yes      | Whether the skill is required            |
| weight               | Decimal  | Yes      | Evaluation weight, greater than 0        |
| created_at           | DateTime | Yes      | Record creation timestamp                |

**Constraint:** Skill weights for a requisition must be validated and normalized before calculating an overall skill score.

---

# Workflow Entities

## 6. InterviewPanel

Represents a group of interviewers assigned to a requisition.

| Field          | Type     | Required | Constraints / Description   |
| -------------- | -------- | -------- | --------------------------- |
| panel_id       | String   | Yes      | Primary key                 |
| requisition_id | String   | Yes      | Foreign key to Requisition  |
| panel_name     | String   | Yes      | Name of the interview panel |
| description    | String   | No       | Panel purpose               |
| is_active      | Boolean  | Yes      | Defaults to true            |
| created_at     | DateTime | Yes      | Creation timestamp          |

## 7. Availability

Stores the available time slots of an interviewer.

| Field           | Type     | Required | Constraints / Description             |
| --------------- | -------- | -------- | ------------------------------------- |
| availability_id | String   | Yes      | Primary key                           |
| interviewer_id  | String   | Yes      | Foreign key to Employee               |
| start_time      | DateTime | Yes      | Availability start                    |
| end_time        | DateTime | Yes      | Availability end; must be after start |
| status          | Enum     | Yes      | AVAILABLE, UNAVAILABLE, BOOKED        |
| created_at      | DateTime | Yes      | Creation timestamp                    |

**Rules:**

- Availability periods must have valid start and end times.
- Interview scheduling must check interviewer availability.
- Overlapping availability records should be handled consistently.

## 8. Interview

Represents a scheduled interview for an application.

| Field          | Type     | Required | Constraints / Description                             |
| -------------- | -------- | -------- | ----------------------------------------------------- |
| interview_id   | String   | Yes      | Primary key. Format: INT-2026-000001                  |
| application_id | String   | Yes      | Foreign key to Application                            |
| panel_id       | String   | Yes      | Foreign key to InterviewPanel                         |
| start_time     | DateTime | Yes      | Scheduled start                                       |
| end_time       | DateTime | Yes      | Must be after start                                   |
| interview_type | Enum     | Yes      | TECHNICAL, MANAGERIAL, HR, SCREENING                  |
| status         | Enum     | Yes      | SCHEDULED, COMPLETED, CANCELLED, RESCHEDULED, NO_SHOW |
| meeting_link   | String   | No       | Online meeting URL                                    |
| created_at     | DateTime | Yes      | Creation timestamp                                    |

**Rules:**

- Interviewers must be available during the scheduled slot.
- An interviewer cannot be booked for overlapping interviews.
- Withdrawn or rejected applications cannot receive new interviews.
- Rescheduling must preserve previous scheduling history.

## 9. Scorecard

Stores structured feedback from an interviewer.

| Field                 | Type     | Required | Constraints / Description                               |
| --------------------- | -------- | -------- | ------------------------------------------------------- |
| scorecard_id          | String   | Yes      | Primary key. Format: SCORE-<interview-id>-<reviewer-id> |
| interview_id          | String   | Yes      | Foreign key to Interview                                |
| reviewer_id           | String   | Yes      | Foreign key to Employee                                 |
| technical_score       | Decimal  | Yes      | Score from 0 to 10                                       |
| communication_score   | Decimal  | Yes      | Score from 0 to 10                                       |
| problem_solving_score | Decimal  | Yes      | Score from 0 to 10                                       |
| recommendation        | Enum     | Yes      | STRONG_YES, YES, MAYBE, NO, STRONG_NO                   |
| comments              | String   | No       | Interviewer feedback                                    |
| submitted_at          | DateTime | Yes      | Submission timestamp                                    |

**Rules:**

- One reviewer can submit only one scorecard per interview.
- Scorecards must be submitted before the application advances beyond the relevant interview stage.
- Scores must remain within the 1–5 range.
- Evaluation criteria must be relevant to the requisition and interview type.

## 10. Offer

Represents a job offer made to a candidate.

| Field          | Type     | Required | Constraints / Description                                                       |
| -------------- | -------- | -------- | ------------------------------------------------------------------------------- |
| offer_id       | String   | Yes      | Primary key. Format: OFF-2026-000001                                            |
| application_id | String   | Yes      | Foreign key to Application                                                      |
| offered_salary | Decimal  | Yes      | Must be greater than 0                                                          |
| currency       | String   | Yes      | Example: INR                                                                    |
| joining_date   | Date     | Yes      | Proposed joining date                                                           |
| status         | Enum     | Yes      | DRAFT, PENDING_APPROVAL, APPROVED, SENT, ACCEPTED, REJECTED, EXPIRED, WITHDRAWN |
| created_at     | DateTime | Yes      | Creation timestamp                                                              |
| updated_at     | DateTime | Yes      | Last update timestamp                                                           |

**Rules:**

- Offered salary must be checked against the requisition's approved salary band.
- An offer must receive required approvals before being sent.
- Offer status changes must be recorded in audit history.
- Multiple historical offers may exist, but only one active offer is allowed per application.

## 11. Approval

Tracks approval decisions for requisitions and offers.

| Field          | Type     | Required | Constraints / Description   |
| -------------- | -------- | -------- | --------------------------- |
| approval_id    | String   | Yes      | Primary key                 |
| offer_id       | String   | No       | Foreign key to Offer        |
| requisition_id | String   | No       | Foreign key to Requisition  |
| approver_id    | String   | Yes      | Foreign key to Employee     |
| approval_type  | Enum     | Yes      | REQUISITION, OFFER          |
| decision       | Enum     | Yes      | PENDING, APPROVED, REJECTED |
| comments       | String   | No       | Approval notes              |
| decided_at     | DateTime | No       | Set when a decision is made |
| created_at     | DateTime | Yes      | Creation timestamp          |

**Constraint:** Exactly one of offer_id or requisition_id must be populated, matching approval_type.

---

# Supporting Entities

## 12. Employee

Represents an internal employee, including interviewers, approvers and administrators.

| Field       | Type     | Required | Constraints / Description                        |
| ----------- | -------- | -------- | ------------------------------------------------ |
| employee_id | String   | Yes      | Primary key                                      |
| full_name   | String   | Yes      | Employee's name                                  |
| email       | String   | Yes      | Unique, valid email                              |
| department  | String   | Yes      | Department                                       |
| role        | Enum     | Yes      | HR, HIRING_MANAGER, INTERVIEWER, APPROVER, ADMIN |
| is_active   | Boolean  | Yes      | Defaults to true                                 |
| created_at  | DateTime | Yes      | Record creation timestamp                        |

## 13. PanelMember

Connects employees to interview panels.

| Field           | Type     | Required | Constraints / Description     |
| --------------- | -------- | -------- | ----------------------------- |
| panel_member_id | String   | Yes      | Primary key                   |
| panel_id        | String   | Yes      | Foreign key to InterviewPanel |
| employee_id     | String   | Yes      | Foreign key to Employee       |
| assigned_at     | DateTime | Yes      | Assignment timestamp          |

**Constraint:** An employee can be assigned to a panel only once.

## 14. InterviewParticipant

Connects individual interviewers to scheduled interviews.

| Field          | Type   | Required | Constraints / Description |
| -------------- | ------ | -------- | ------------------------- |
| participant_id | String | Yes      | Primary key               |
| interview_id   | String | Yes      | Foreign key to Interview  |
| employee_id    | String | Yes      | Foreign key to Employee   |
| role           | Enum   | Yes      | LEAD, PANELIST, OBSERVER  |

**Constraint:** An employee can participate in an interview only once.

## 15. ApplicationStageEvent

Maintains the complete history of application stage transitions.

| Field          | Type     | Required | Constraints / Description              |
| -------------- | -------- | -------- | -------------------------------------- |
| event_id       | String   | Yes      | Primary key                            |
| application_id | String   | Yes      | Foreign key to Application             |
| from_stage     | String   | No       | Previous stage; null for initial stage |
| to_stage       | String   | Yes      | New stage                              |
| changed_by     | String   | Yes      | Foreign key to Employee                |
| reason         | String   | No       | Reason for transition                  |
| changed_at     | DateTime | Yes      | Transition timestamp                   |

**Rule:** Stage history is append-only. Existing events must not be overwritten.

## 16. AuditLog

Records important system actions for traceability.

| Field       | Type     | Required | Constraints / Description                           |
| ----------- | -------- | -------- | --------------------------------------------------- |
| audit_id    | String   | Yes      | Primary key                                         |
| employee_id | String   | No       | Foreign key to Employee                             |
| entity_type | String   | Yes      | Entity being changed                                |
| entity_id   | String   | Yes      | ID of the affected record                           |
| action      | Enum     | Yes      | CREATE, UPDATE, DELETE, APPROVE, REJECT, RESCHEDULE |
| old_value   | JSON     | No       | Previous values                                     |
| new_value   | JSON     | No       | Updated values                                      |
| created_at  | DateTime | Yes      | Event timestamp                                     |

---

# Global Database Constraints

1. Every entity must have a unique primary key.
2. Every foreign key must reference an existing record.
3. Candidate email and employee email must be unique.
4. Candidate-requisition combinations must be unique.
5. All dates must follow valid chronological order.
6. Salary values must be non-negative and consistent with approved bands.
7. Interview start time must be earlier than end time.
8. Interviewers cannot have overlapping scheduled interviews.
9. Application stage transitions must follow defined business rules.
10. Historical events must not be silently overwritten or deleted.
11. Approval records must reference exactly one target entity.
12. Synthetic anomaly records must carry explicit ground-truth labels and must not be confused with valid baseline records.
