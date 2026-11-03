# HireFlow Data Dictionary

Generated from the Prisma schema. Field types, requiredness, defaults, enum choices, uniqueness, foreign keys, and relationship cardinality are schema-derived; the validation column documents additional application rules.

## Effective dates and lifecycle history

Availability and interview rows use `startTime`/`endTime` intervals. There are no separate `effectiveFrom`/`effectiveTo` version columns. Every successful application stage change creates an `ApplicationStageEvent`; interview and offer changes are recorded in `AuditLog` with old/new values where applicable. PostgreSQL uses timestamp-without-time-zone columns; application and export values are interpreted as UTC, so configure the database session timezone as UTC.

## Employee

| Field | Type | Required | Allowed values / default | Unique / relationship | Unit and validation |
|---|---|---|---|---|---|
| employeeId | String | Yes | - | Primary key | - |
| fullName | String | Yes | - |  | - |
| email | String | Yes | - | Unique | - |
| department | String | Yes | - |  | - |
| role | EmployeeRole | Yes | HR, HIRING_MANAGER, INTERVIEWER, APPROVER, ADMIN, OPERATIONS |  | - |
| isActive | Boolean | Yes | Default: true |  | - |
| createdAt | DateTime | Yes | Default: now() |  | UTC timestamp. |
| availabilities | Availability | No (zero or more) | - | 1:N Availability | - |
| panelMemberships | PanelMember | No (zero or more) | - | 1:N PanelMember | - |
| interviewParticipations | InterviewParticipant | No (zero or more) | - | 1:N InterviewParticipant | - |
| scorecards | Scorecard | No (zero or more) | - | 1:N Scorecard | - |
| approvals | Approval | No (zero or more) | - | 1:N Approval | - |
| stageChanges | ApplicationStageEvent | No (zero or more) | - | 1:N ApplicationStageEvent | - |
| auditLogs | AuditLog | No (zero or more) | - | 1:N AuditLog | - |
| hiringManagerProfile | HiringManager | No | - | 1:1 HiringManager (optional) | - |

## HiringManager

| Field | Type | Required | Allowed values / default | Unique / relationship | Unit and validation |
|---|---|---|---|---|---|
| hiringManagerId | String | Yes | - | Primary key | - |
| employeeId | String | Yes | - | Unique | - |
| designation | String | Yes | - |  | - |
| isActive | Boolean | Yes | Default: true |  | - |
| createdAt | DateTime | Yes | Default: now() |  | UTC timestamp. |
| employee | Employee | Yes | - | 1:1 Employee; FK: employeeId | - |
| requisitions | Requisition | No (zero or more) | - | 1:N Requisition | - |

## Requisition

| Field | Type | Required | Allowed values / default | Unique / relationship | Unit and validation |
|---|---|---|---|---|---|
| requisitionId | String | Yes | - | Primary key | Immutable ID; format REQ-2026-000001 with a six-digit counter. |
| title | String | Yes | - |  | - |
| department | String | Yes | - |  | - |
| location | String | Yes | - |  | - |
| employmentType | EmploymentType | Yes | FULL_TIME, PART_TIME, CONTRACT, INTERN |  | - |
| minSalary | Decimal(12, 2) | Yes | - |  | INR per year; must be non-negative and no greater than maxSalary. |
| maxSalary | Decimal(12, 2) | Yes | - |  | INR per year; must be greater than or equal to minSalary. |
| openings | Int | Yes | - |  | Whole number; must be greater than zero. |
| hiringManagerId | String | Yes | - |  | - |
| status | RequisitionStatus | Yes | DRAFT, PENDING_APPROVAL, OPEN, ON_HOLD, CLOSED, CANCELLED |  | - |
| createdAt | DateTime | Yes | Default: now() |  | UTC timestamp. |
| updatedAt | DateTime | Yes | - |  | UTC timestamp. |
| skillRequirements | SkillRequirement | No (zero or more) | - | 1:N SkillRequirement | - |
| interviewPanels | InterviewPanel | No (zero or more) | - | 1:N InterviewPanel | - |
| evaluationCriteria | EvaluationCriterion | No (zero or more) | - | 1:N EvaluationCriterion | - |
| approvals | Approval | No (zero or more) | - | 1:N Approval | - |
| hiringManager | HiringManager | Yes | - | N:1 HiringManager; FK: hiringManagerId | - |
| applications | Application | No (zero or more) | - | 1:N Application | - |

## Candidate

| Field | Type | Required | Allowed values / default | Unique / relationship | Unit and validation |
|---|---|---|---|---|---|
| candidateId | String | Yes | - | Primary key | Immutable ID; format CAND-000001 with a six-digit counter. |
| fullName | String | Yes | - |  | - |
| email | String | Yes | - | Unique | - |
| phone | String | No | - |  | - |
| location | String | No | - |  | - |
| experienceYears | Decimal(4, 1) | Yes | - |  | Years; decimal precision 1; must be non-negative. |
| currentCompany | String | No | - |  | - |
| resumeUrl | String | No | - |  | - |
| createdAt | DateTime | Yes | Default: now() |  | UTC timestamp. |
| applications | Application | No (zero or more) | - | 1:N Application | - |

## Application

| Field | Type | Required | Allowed values / default | Unique / relationship | Unit and validation |
|---|---|---|---|---|---|
| applicationId | String | Yes | - | Primary key | Immutable composite ID; format APP-<candidate-id>-<requisition-id>. |
| candidateId | String | Yes | - |  | - |
| requisitionId | String | Yes | - |  | - |
| currentStage | ApplicationStage | Yes | APPLIED, SCREENING, TECHNICAL, MANAGERIAL, HR, OFFER, HIRED, REJECTED, WITHDRAWN |  | Must follow the documented linear workflow; REJECTED and WITHDRAWN are terminal. |
| status | ApplicationStatus | Yes | ACTIVE, REJECTED, WITHDRAWN, HIRED |  | Must agree with HIRED, REJECTED, or WITHDRAWN terminal stage. |
| appliedAt | DateTime | Yes | Default: now() |  | UTC timestamp. |
| updatedAt | DateTime | Yes | - |  | UTC timestamp. |
| interviews | Interview | No (zero or more) | - | 1:N Interview | - |
| offers | Offer | No (zero or more) | - | 1:N Offer | - |
| stageEvents | ApplicationStageEvent | No (zero or more) | - | 1:N ApplicationStageEvent | - |
| candidate | Candidate | Yes | - | N:1 Candidate; FK: candidateId | - |
| requisition | Requisition | Yes | - | N:1 Requisition; FK: requisitionId | - |

Composite unique constraints: `candidateId + requisitionId`.

## SkillRequirement

| Field | Type | Required | Allowed values / default | Unique / relationship | Unit and validation |
|---|---|---|---|---|---|
| skillRequirementId | String | Yes | - | Primary key | - |
| requisitionId | String | Yes | - |  | - |
| skillName | String | Yes | - |  | - |
| minimumLevel | SkillLevel | Yes | BEGINNER, INTERMEDIATE, ADVANCED, EXPERT |  | - |
| isMandatory | Boolean | Yes | Default: true |  | - |
| weight | Decimal(5, 2) | Yes | - |  | Relative weight points; must be positive. |
| createdAt | DateTime | Yes | Default: now() |  | UTC timestamp. |
| requisition | Requisition | Yes | - | N:1 Requisition; FK: requisitionId | - |

## InterviewPanel

| Field | Type | Required | Allowed values / default | Unique / relationship | Unit and validation |
|---|---|---|---|---|---|
| panelId | String | Yes | - | Primary key | - |
| requisitionId | String | Yes | - |  | - |
| panelName | String | Yes | - |  | - |
| description | String | No | - |  | - |
| isActive | Boolean | Yes | Default: true |  | - |
| createdAt | DateTime | Yes | Default: now() |  | UTC timestamp. |
| requisition | Requisition | Yes | - | N:1 Requisition; FK: requisitionId | - |
| members | PanelMember | No (zero or more) | - | 1:N PanelMember | - |
| interviews | Interview | No (zero or more) | - | 1:N Interview | - |

## PanelMember

| Field | Type | Required | Allowed values / default | Unique / relationship | Unit and validation |
|---|---|---|---|---|---|
| panelMemberId | String | Yes | - | Primary key | - |
| panelId | String | Yes | - |  | - |
| employeeId | String | Yes | - |  | - |
| assignedAt | DateTime | Yes | Default: now() |  | UTC timestamp. |
| panel | InterviewPanel | Yes | - | N:1 InterviewPanel; FK: panelId | - |
| employee | Employee | Yes | - | N:1 Employee; FK: employeeId | - |

Composite unique constraints: `panelId + employeeId`.

## Availability

| Field | Type | Required | Allowed values / default | Unique / relationship | Unit and validation |
|---|---|---|---|---|---|
| availabilityId | String | Yes | - | Primary key | - |
| interviewerId | String | Yes | - |  | - |
| startTime | DateTime | Yes | - |  | UTC timestamp; must be in the future when created. |
| endTime | DateTime | Yes | - |  | UTC timestamp; must be after startTime. |
| status | AvailabilityStatus | Yes | AVAILABLE, UNAVAILABLE, BOOKED |  | - |
| createdAt | DateTime | Yes | Default: now() |  | UTC timestamp. |
| interviewer | Employee | Yes | - | N:1 Employee; FK: interviewerId | - |

## Interview

| Field | Type | Required | Allowed values / default | Unique / relationship | Unit and validation |
|---|---|---|---|---|---|
| interviewId | String | Yes | - | Primary key | Immutable ID; format INT-2026-000001 with a six-digit counter. |
| applicationId | String | Yes | - |  | - |
| panelId | String | Yes | - |  | - |
| startTime | DateTime | Yes | - |  | UTC timestamp; must be in the future. |
| endTime | DateTime | Yes | - |  | UTC timestamp; must be after startTime. |
| interviewType | InterviewType | Yes | TECHNICAL, MANAGERIAL, HR, SCREENING |  | - |
| status | InterviewStatus | Yes | SCHEDULED, COMPLETED, CANCELLED, RESCHEDULED, NO_SHOW |  | Only SCHEDULED interviews participate in conflict checks; changes are audit-recorded. |
| meetingLink | String | No | - |  | - |
| createdAt | DateTime | Yes | Default: now() |  | UTC timestamp. |
| application | Application | Yes | - | N:1 Application; FK: applicationId | - |
| panel | InterviewPanel | Yes | - | N:1 InterviewPanel; FK: panelId | - |
| participants | InterviewParticipant | No (zero or more) | - | 1:N InterviewParticipant | - |
| scorecards | Scorecard | No (zero or more) | - | 1:N Scorecard | - |

## InterviewParticipant

| Field | Type | Required | Allowed values / default | Unique / relationship | Unit and validation |
|---|---|---|---|---|---|
| participantId | String | Yes | - | Primary key | - |
| interviewId | String | Yes | - |  | - |
| employeeId | String | Yes | - |  | - |
| role | ParticipantRole | Yes | LEAD, PANELIST, OBSERVER |  | - |
| interview | Interview | Yes | - | N:1 Interview; FK: interviewId | - |
| employee | Employee | Yes | - | N:1 Employee; FK: employeeId | - |

Composite unique constraints: `interviewId + employeeId`.

## Scorecard

| Field | Type | Required | Allowed values / default | Unique / relationship | Unit and validation |
|---|---|---|---|---|---|
| scorecardId | String | Yes | - | Primary key | Immutable composite ID; format SCORE-<interview-id>-<reviewer-id>. |
| interviewId | String | Yes | - |  | - |
| reviewerId | String | Yes | - |  | - |
| technicalScore | Decimal(4, 2) | Yes | - |  | Score on a 0-10 scale. |
| communicationScore | Decimal(4, 2) | Yes | - |  | Score on a 0-10 scale. |
| problemSolvingScore | Decimal(4, 2) | Yes | - |  | Score on a 0-10 scale. |
| recommendation | ScoreRecommendation | Yes | STRONG_YES, YES, MAYBE, NO, STRONG_NO |  | Derived from weighted rubric scores: >=8 STRONG_YES, >=7 YES, >=5 MAYBE, >=3 NO, otherwise STRONG_NO. |
| comments | String | No | - |  | - |
| submittedAt | DateTime | Yes | Default: now() |  | UTC timestamp. |
| items | ScorecardItem | No (zero or more) | - | 1:N ScorecardItem | - |
| interview | Interview | Yes | - | N:1 Interview; FK: interviewId | - |
| reviewer | Employee | Yes | - | N:1 Employee; FK: reviewerId | - |

Composite unique constraints: `interviewId + reviewerId`.

## EvaluationCriterion

| Field | Type | Required | Allowed values / default | Unique / relationship | Unit and validation |
|---|---|---|---|---|---|
| criterionId | String | Yes | Default: cuid(1) | Primary key | - |
| requisitionId | String | Yes | - |  | - |
| name | String | Yes | - |  | - |
| description | String | No | - |  | - |
| category | String | Yes | - |  | - |
| weight | Decimal(5, 2) | Yes | - |  | Relative rubric weight points; must be positive. |
| isRequired | Boolean | Yes | Default: true |  | - |
| isActive | Boolean | Yes | Default: true |  | - |
| createdAt | DateTime | Yes | Default: now() |  | UTC timestamp. |
| requisition | Requisition | Yes | - | N:1 Requisition; FK: requisitionId | - |
| scorecardItems | ScorecardItem | No (zero or more) | - | 1:N ScorecardItem | - |

## ScorecardItem

| Field | Type | Required | Allowed values / default | Unique / relationship | Unit and validation |
|---|---|---|---|---|---|
| itemId | String | Yes | Default: cuid(1) | Primary key | - |
| scorecardId | String | Yes | - |  | - |
| criterionId | String | Yes | - |  | - |
| score | Decimal(4, 2) | Yes | - |  | Rubric score on a 0-10 scale. |
| comments | String | No | - |  | - |
| scorecard | Scorecard | Yes | - | N:1 Scorecard; FK: scorecardId | - |
| criterion | EvaluationCriterion | Yes | - | N:1 EvaluationCriterion; FK: criterionId | - |

Composite unique constraints: `scorecardId + criterionId`.

## Offer

| Field | Type | Required | Allowed values / default | Unique / relationship | Unit and validation |
|---|---|---|---|---|---|
| offerId | String | Yes | Default: cuid(1) | Primary key | Immutable ID; format OFF-2026-000001 with a six-digit counter. |
| applicationId | String | Yes | - |  | - |
| version | Int | Yes | Default: 1 |  | - |
| baseSalary | Decimal(12, 2) | Yes | - |  | INR per year; must be positive and within the requisition compensation band. |
| bonus | Decimal(12, 2) | No | - |  | INR per year; optional and must be non-negative. |
| currency | String | Yes | Default: "INR" |  | - |
| status | OfferStatus | Yes | DRAFT, PENDING_APPROVAL, APPROVED, SENT, ACCEPTED, REJECTED, WITHDRAWN, EXPIRED |  | Must follow the approval, send, response, withdrawal, and expiry lifecycle. |
| createdAt | DateTime | Yes | Default: now() |  | UTC timestamp. |
| sentAt | DateTime | No | - |  | UTC timestamp. |
| respondedAt | DateTime | No | - |  | UTC timestamp. |
| application | Application | Yes | - | N:1 Application; FK: applicationId | - |
| approvals | Approval | No (zero or more) | - | 1:N Approval | - |

Composite unique constraints: `applicationId + version`.

## Approval

| Field | Type | Required | Allowed values / default | Unique / relationship | Unit and validation |
|---|---|---|---|---|---|
| approvalId | String | Yes | Default: cuid(1) | Primary key | - |
| offerId | String | No | - |  | - |
| requisitionId | String | No | - |  | - |
| approverId | String | Yes | - |  | - |
| approvalType | ApprovalType | Yes | REQUISITION, OFFER |  | Must match the single populated offerId or requisitionId target. |
| status | ApprovalStatus | Yes | PENDING, APPROVED, REJECTED |  | - |
| comments | String | No | - |  | - |
| requestedAt | DateTime | Yes | Default: now() |  | UTC timestamp. |
| decidedAt | DateTime | No | - |  | UTC timestamp; absent while PENDING and required after a decision. |
| offer | Offer | No | - | N:1 Offer (optional); FK: offerId | - |
| requisition | Requisition | No | - | N:1 Requisition (optional); FK: requisitionId | - |
| approver | Employee | Yes | - | N:1 Employee; FK: approverId | - |

## ApplicationStageEvent

| Field | Type | Required | Allowed values / default | Unique / relationship | Unit and validation |
|---|---|---|---|---|---|
| eventId | String | Yes | Default: cuid(1) | Primary key | - |
| applicationId | String | Yes | - |  | - |
| fromStage | String | No | - |  | - |
| toStage | String | Yes | - |  | - |
| changedById | String | No | - |  | - |
| reason | String | No | - |  | - |
| changedAt | DateTime | Yes | Default: now() |  | UTC event timestamp; records a stage transition without replacing prior events. |
| application | Application | Yes | - | N:1 Application; FK: applicationId | - |
| changedBy | Employee | No | - | N:1 Employee (optional); FK: changedById | - |

## AuditLog

| Field | Type | Required | Allowed values / default | Unique / relationship | Unit and validation |
|---|---|---|---|---|---|
| auditLogId | String | Yes | Default: cuid(1) | Primary key | - |
| actorId | String | No | - |  | - |
| action | String | Yes | - |  | - |
| entityType | String | Yes | - |  | - |
| entityId | String | Yes | - |  | - |
| details | Json | No | - |  | - |
| createdAt | DateTime | Yes | Default: now() |  | UTC timestamp. |
| actor | Employee | No | - | N:1 Employee (optional); FK: actorId | - |

## IdCounter

| Field | Type | Required | Allowed values / default | Unique / relationship | Unit and validation |
|---|---|---|---|---|---|
| name | String | Yes | - | Primary key | - |
| value | Int | Yes | Default: 0 |  | - |
| updatedAt | DateTime | Yes | - |  | UTC timestamp. |

## Application lifecycle

Allowed forward transitions are APPLIED → SCREENING → TECHNICAL → MANAGERIAL → HR → OFFER → HIRED. REJECTED and WITHDRAWN are terminal decision stages. Progression requires the prior interview to be completed and every assigned non-observer interviewer to have a scorecard; HIRED requires an accepted offer.

## Cross-record validation

- Applications are unique per candidate/requisition pair.
- Each foreign key and enum value is checked against the Prisma schema by `validateData.js`.
- Requisition compensation bands must be ordered; offer base salary must fall within the related band.
- Interview and availability end times must be later than start times.
- Approval must reference exactly one target, matching `approvalType`.
- Scorecard recommendations are derived from weighted active rubric criteria, not independently assigned.
- Known exception records are labeled separately in `ground_truth.csv` and `ground_truth.json`; labels are not included in operational feature exports.
