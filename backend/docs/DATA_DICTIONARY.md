# HireFlow Data Dictionary

Generated from the Prisma database schema.

This document describes the database entities, field types, constraints, and relationships.

## undefined

| Field | Type | Required | Key / Relationship |
|---|---|---|---|
| employeeId | String | Yes | Primary key |
| fullName | String | Yes |  |
| email | String | Yes | Unique |
| department | String | Yes |  |
| role | EmployeeRole | Yes |  |
| isActive | Boolean | Yes |  |
| createdAt | DateTime | Yes |  |
| availabilities | Availability | Yes | Relation: Availability (one-to-many) |
| panelMemberships | PanelMember | Yes | Relation: PanelMember (one-to-many) |
| interviewParticipations | InterviewParticipant | Yes | Relation: InterviewParticipant (one-to-many) |
| scorecards | Scorecard | Yes | Relation: Scorecard (one-to-many) |
| approvals | Approval | Yes | Relation: Approval (one-to-many) |
| stageChanges | ApplicationStageEvent | Yes | Relation: ApplicationStageEvent (one-to-many) |
| auditLogs | AuditLog | Yes | Relation: AuditLog (one-to-many) |
| hiringManagerProfile | HiringManager | No | Relation: HiringManager (related record) |

## undefined

| Field | Type | Required | Key / Relationship |
|---|---|---|---|
| hiringManagerId | String | Yes | Primary key |
| employeeId | String | Yes | Unique |
| designation | String | Yes |  |
| isActive | Boolean | Yes |  |
| createdAt | DateTime | Yes |  |
| employee | Employee | Yes | Relation: Employee (related record); Foreign key: employeeId |
| requisitions | Requisition | Yes | Relation: Requisition (one-to-many) |

## undefined

| Field | Type | Required | Key / Relationship |
|---|---|---|---|
| requisitionId | String | Yes | Primary key |
| title | String | Yes |  |
| department | String | Yes |  |
| location | String | Yes |  |
| employmentType | EmploymentType | Yes |  |
| minSalary | Decimal | Yes |  |
| maxSalary | Decimal | Yes |  |
| openings | Int | Yes |  |
| hiringManagerId | String | Yes |  |
| status | RequisitionStatus | Yes |  |
| createdAt | DateTime | Yes |  |
| updatedAt | DateTime | Yes |  |
| skillRequirements | SkillRequirement | Yes | Relation: SkillRequirement (one-to-many) |
| interviewPanels | InterviewPanel | Yes | Relation: InterviewPanel (one-to-many) |
| evaluationCriteria | EvaluationCriterion | Yes | Relation: EvaluationCriterion (one-to-many) |
| approvals | Approval | Yes | Relation: Approval (one-to-many) |
| hiringManager | HiringManager | Yes | Relation: HiringManager (related record); Foreign key: hiringManagerId |
| applications | Application | Yes | Relation: Application (one-to-many) |

## undefined

| Field | Type | Required | Key / Relationship |
|---|---|---|---|
| candidateId | String | Yes | Primary key |
| fullName | String | Yes |  |
| email | String | Yes | Unique |
| phone | String | No |  |
| location | String | No |  |
| experienceYears | Decimal | Yes |  |
| currentCompany | String | No |  |
| resumeUrl | String | No |  |
| createdAt | DateTime | Yes |  |
| applications | Application | Yes | Relation: Application (one-to-many) |

## undefined

| Field | Type | Required | Key / Relationship |
|---|---|---|---|
| applicationId | String | Yes | Primary key |
| candidateId | String | Yes |  |
| requisitionId | String | Yes |  |
| currentStage | ApplicationStage | Yes |  |
| status | ApplicationStatus | Yes |  |
| appliedAt | DateTime | Yes |  |
| updatedAt | DateTime | Yes |  |
| interviews | Interview | Yes | Relation: Interview (one-to-many) |
| offers | Offer | Yes | Relation: Offer (one-to-many) |
| stageEvents | ApplicationStageEvent | Yes | Relation: ApplicationStageEvent (one-to-many) |
| candidate | Candidate | Yes | Relation: Candidate (related record); Foreign key: candidateId |
| requisition | Requisition | Yes | Relation: Requisition (related record); Foreign key: requisitionId |

## undefined

| Field | Type | Required | Key / Relationship |
|---|---|---|---|
| skillRequirementId | String | Yes | Primary key |
| requisitionId | String | Yes |  |
| skillName | String | Yes |  |
| minimumLevel | SkillLevel | Yes |  |
| isMandatory | Boolean | Yes |  |
| weight | Decimal | Yes |  |
| createdAt | DateTime | Yes |  |
| requisition | Requisition | Yes | Relation: Requisition (related record); Foreign key: requisitionId |

## undefined

| Field | Type | Required | Key / Relationship |
|---|---|---|---|
| panelId | String | Yes | Primary key |
| requisitionId | String | Yes |  |
| panelName | String | Yes |  |
| description | String | No |  |
| isActive | Boolean | Yes |  |
| createdAt | DateTime | Yes |  |
| requisition | Requisition | Yes | Relation: Requisition (related record); Foreign key: requisitionId |
| members | PanelMember | Yes | Relation: PanelMember (one-to-many) |
| interviews | Interview | Yes | Relation: Interview (one-to-many) |

## undefined

| Field | Type | Required | Key / Relationship |
|---|---|---|---|
| panelMemberId | String | Yes | Primary key |
| panelId | String | Yes |  |
| employeeId | String | Yes |  |
| assignedAt | DateTime | Yes |  |
| panel | InterviewPanel | Yes | Relation: InterviewPanel (related record); Foreign key: panelId |
| employee | Employee | Yes | Relation: Employee (related record); Foreign key: employeeId |

## undefined

| Field | Type | Required | Key / Relationship |
|---|---|---|---|
| availabilityId | String | Yes | Primary key |
| interviewerId | String | Yes |  |
| startTime | DateTime | Yes |  |
| endTime | DateTime | Yes |  |
| status | AvailabilityStatus | Yes |  |
| createdAt | DateTime | Yes |  |
| interviewer | Employee | Yes | Relation: Employee (related record); Foreign key: interviewerId |

## undefined

| Field | Type | Required | Key / Relationship |
|---|---|---|---|
| interviewId | String | Yes | Primary key |
| applicationId | String | Yes |  |
| panelId | String | Yes |  |
| startTime | DateTime | Yes |  |
| endTime | DateTime | Yes |  |
| interviewType | InterviewType | Yes |  |
| status | InterviewStatus | Yes |  |
| meetingLink | String | No |  |
| createdAt | DateTime | Yes |  |
| application | Application | Yes | Relation: Application (related record); Foreign key: applicationId |
| panel | InterviewPanel | Yes | Relation: InterviewPanel (related record); Foreign key: panelId |
| participants | InterviewParticipant | Yes | Relation: InterviewParticipant (one-to-many) |
| scorecards | Scorecard | Yes | Relation: Scorecard (one-to-many) |

## undefined

| Field | Type | Required | Key / Relationship |
|---|---|---|---|
| participantId | String | Yes | Primary key |
| interviewId | String | Yes |  |
| employeeId | String | Yes |  |
| role | ParticipantRole | Yes |  |
| interview | Interview | Yes | Relation: Interview (related record); Foreign key: interviewId |
| employee | Employee | Yes | Relation: Employee (related record); Foreign key: employeeId |

## undefined

| Field | Type | Required | Key / Relationship |
|---|---|---|---|
| scorecardId | String | Yes | Primary key |
| interviewId | String | Yes |  |
| reviewerId | String | Yes |  |
| technicalScore | Decimal | Yes |  |
| communicationScore | Decimal | Yes |  |
| problemSolvingScore | Decimal | Yes |  |
| recommendation | ScoreRecommendation | Yes |  |
| comments | String | No |  |
| submittedAt | DateTime | Yes |  |
| items | ScorecardItem | Yes | Relation: ScorecardItem (one-to-many) |
| interview | Interview | Yes | Relation: Interview (related record); Foreign key: interviewId |
| reviewer | Employee | Yes | Relation: Employee (related record); Foreign key: reviewerId |

## undefined

| Field | Type | Required | Key / Relationship |
|---|---|---|---|
| criterionId | String | Yes | Primary key |
| requisitionId | String | Yes |  |
| name | String | Yes |  |
| description | String | No |  |
| category | String | Yes |  |
| weight | Decimal | Yes |  |
| isRequired | Boolean | Yes |  |
| isActive | Boolean | Yes |  |
| createdAt | DateTime | Yes |  |
| requisition | Requisition | Yes | Relation: Requisition (related record); Foreign key: requisitionId |
| scorecardItems | ScorecardItem | Yes | Relation: ScorecardItem (one-to-many) |

## undefined

| Field | Type | Required | Key / Relationship |
|---|---|---|---|
| itemId | String | Yes | Primary key |
| scorecardId | String | Yes |  |
| criterionId | String | Yes |  |
| score | Decimal | Yes |  |
| comments | String | No |  |
| scorecard | Scorecard | Yes | Relation: Scorecard (related record); Foreign key: scorecardId |
| criterion | EvaluationCriterion | Yes | Relation: EvaluationCriterion (related record); Foreign key: criterionId |

## undefined

| Field | Type | Required | Key / Relationship |
|---|---|---|---|
| offerId | String | Yes | Primary key |
| applicationId | String | Yes |  |
| version | Int | Yes |  |
| baseSalary | Decimal | Yes |  |
| bonus | Decimal | No |  |
| currency | String | Yes |  |
| status | OfferStatus | Yes |  |
| createdAt | DateTime | Yes |  |
| sentAt | DateTime | No |  |
| respondedAt | DateTime | No |  |
| application | Application | Yes | Relation: Application (related record); Foreign key: applicationId |
| approvals | Approval | Yes | Relation: Approval (one-to-many) |

## undefined

| Field | Type | Required | Key / Relationship |
|---|---|---|---|
| approvalId | String | Yes | Primary key |
| offerId | String | No |  |
| requisitionId | String | No |  |
| approverId | String | Yes |  |
| approvalType | ApprovalType | Yes |  |
| status | ApprovalStatus | Yes |  |
| comments | String | No |  |
| requestedAt | DateTime | Yes |  |
| decidedAt | DateTime | No |  |
| offer | Offer | No | Relation: Offer (related record); Foreign key: offerId |
| requisition | Requisition | No | Relation: Requisition (related record); Foreign key: requisitionId |
| approver | Employee | Yes | Relation: Employee (related record); Foreign key: approverId |

## undefined

| Field | Type | Required | Key / Relationship |
|---|---|---|---|
| eventId | String | Yes | Primary key |
| applicationId | String | Yes |  |
| fromStage | String | No |  |
| toStage | String | Yes |  |
| changedById | String | No |  |
| reason | String | No |  |
| changedAt | DateTime | Yes |  |
| application | Application | Yes | Relation: Application (related record); Foreign key: applicationId |
| changedBy | Employee | No | Relation: Employee (related record); Foreign key: changedById |

## undefined

| Field | Type | Required | Key / Relationship |
|---|---|---|---|
| auditLogId | String | Yes | Primary key |
| actorId | String | No |  |
| action | String | Yes |  |
| entityType | String | Yes |  |
| entityId | String | Yes |  |
| details | Json | No |  |
| createdAt | DateTime | Yes |  |
| actor | Employee | No | Relation: Employee (related record); Foreign key: actorId |

## undefined

| Field | Type | Required | Key / Relationship |
|---|---|---|---|
| name | String | Yes | Primary key |
| value | Int | Yes |  |
| updatedAt | DateTime | Yes |  |

