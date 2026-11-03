
# HireFlow — Business Rules

## 1. Purpose

This document describes the business rules governing HireFlow’s recruitment workflow. These rules define how requisitions, candidates, applications, interviews, evaluations, and offers should behave.

The goal is to maintain consistent recruitment data, prevent invalid workflow changes, and clarify the responsibilities of HR, hiring managers, and interviewers.

## 2. User Roles and Responsibilities

HireFlow supports role-based responsibilities.

| Role | Main responsibility |
|---|---|
| HR | Coordinate recruitment activities, manage candidate applications, schedule interviews, and manage offer workflows |
| Hiring Manager | Define hiring requirements, review candidates, and make hiring decisions |
| Interviewer | Participate in interviews and submit structured evaluations |

Users should only perform actions permitted by their assigned role. Access to sensitive recruitment information should be limited to authorized users.

## 3. Requisition Rules

1. A requisition represents a hiring requirement for a position.
2. A requisition should contain the information needed to identify and understand the role.
3. Each requisition should be associated with a responsible hiring manager.
4. A requisition should have a defined status.
5. Applications should be associated with an existing requisition.
6. A requisition that is closed should not accept new applications unless it is reopened through an authorized action.
7. Changes to requisition status should be reflected consistently wherever the requisition is displayed.

## 4. Candidate and Application Rules

1. Candidate information should be stored separately from application information.
2. A candidate may apply to more than one requisition.
3. Each application must reference an existing candidate and requisition.
4. An application should represent a candidate’s progress for one specific requisition.
5. Application status should follow the configured recruitment stages.
6. An application should not reference a nonexistent candidate or requisition.
7. Duplicate applications for the same candidate and requisition should be prevented or handled according to the application’s defined duplicate policy.
8. A candidate’s application status should not be changed without an authorized action.

## 5. Recruitment Stage Rules

1. Each application has a current recruitment stage and lifecycle status.
2. Normal transitions are APPLIED → SCREENING → TECHNICAL → MANAGERIAL → HR → OFFER → HIRED. REJECTED and WITHDRAWN are terminal decisions.
3. Before moving beyond an interview stage, the required interview must be completed and every assigned non-observer interviewer must submit a rubric scorecard.
4. An accepted offer is required before an application can become HIRED.
5. Invalid stage transitions are rejected by the backend.
6. Every successful stage change creates an ApplicationStageEvent and an audit record.
7. Rejected or withdrawn applications cannot continue through active stages unless explicitly reopened.

## 6. Interview Scheduling Rules

1. An interview must be associated with a valid application.
2. An interview must have a defined date, time, and duration.
3. An interview should include the required interviewer or panel members.
4. Interview scheduling should consider interviewer availability.
5. Every non-observer interviewer must have availability for the complete interview interval.
6. An interviewer must not be assigned to overlapping scheduled interviews.
7. Invalid or conflicting interview times should be rejected.
8. Changes to interview schedules should be captured with previous and new times in the audit history.
9. Cancelled interviews should not be treated as active scheduled interviews.
10. Interview details should be accessible only to authorized users.

## 7. Interview Evaluation Rules

1. An evaluation must be associated with the relevant interview and application.
2. Evaluations should use structured fields rather than relying only on unstructured feedback.
3. Required evaluation fields should be validated before submission.
4. Interviewers should submit feedback for interviews they are authorized to evaluate.
5. Evaluation records should remain associated with the correct candidate and requisition.
6. Hiring decisions should consider the available evaluation information.
7. Evaluation data should not be silently overwritten when the system requires a history of submitted feedback.

## 8. Offer Rules

1. An offer must be associated with a valid application.
2. An offer should only be initiated for a candidate who has reached the appropriate hiring decision stage.
3. Offer details should be validated before submission.
4. Offers requiring approval should not be finalized before the required approval is recorded.
5. An offer should have a defined status.
6. Offer status changes should follow the configured offer workflow.
7. Rejected, withdrawn, or expired offers should not be treated as active offers.
8. Offer information should only be accessible to authorized users.

## 9. Data Integrity Rules

1. Required fields must be provided before a record is created.
2. Related records must reference valid entities.
3. Invalid identifiers should return an appropriate error.
4. Data should not be duplicated unnecessarily across related records.
5. Updates should preserve valid relationships between entities.
6. Database constraints and backend validation should work together to protect data integrity.
7. Failed operations should not leave partially updated records.

## 10. Error Handling Rules

The system should handle invalid operations consistently.

Examples include:

- Missing required information.
- Invalid or nonexistent record identifiers.
- Unauthorized actions.
- Invalid application-stage transitions.
- Interview scheduling conflicts.
- Invalid offer approval actions.

Errors should provide enough information for the user or client application to understand why an operation failed, without exposing sensitive internal details.

## 11. Audit and Traceability

Where audit history is implemented:

1. Important recruitment decisions should be traceable.
2. Relevant events may include requisition updates, application-stage changes, interview scheduling changes, evaluation submissions, and offer decisions.
3. Event records should identify the affected entity and the action performed.
4. Audit history should not be treated as a substitute for the current state of a record.
5. Audit information should be protected from unauthorized modification.

## 12. Rule Enforcement

Business rules should be enforced primarily by the backend, because frontend validation alone can be bypassed.

The frontend may provide immediate validation and helpful messages, while the backend remains responsible for validating requests, permissions, workflow transitions, and data integrity.

Database constraints should be used where appropriate to enforce relationships and required data.

## 13. Rule Verification

Business rules should be verified through API tests, database checks, and workflow testing.

Important scenarios include:

- Creating a requisition with valid and invalid data.
- Creating an application for an existing requisition and candidate.
- Rejecting invalid application-stage transitions.
- Preventing unauthorized actions.
- Detecting conflicting interview schedules.
- Validating interview evaluation submissions.
- Enforcing required offer approvals.
- Confirming that failed operations do not corrupt related records.

Only rules that have been implemented and tested should be reported as verified.

## 14. Scope and Limitations

Some rules depend on the current implementation and may require further refinement, including:

- Reopening or cancelling recruitment records.
- Effective-dated versions of master data; current availability/interviews use explicit UTC intervals, while workflow changes use timestamped events.

These rules should be updated as the application evolves and as additional business requirements are clarified.

## 15. Synthetic dataset generation

The ordered generator creates parent records before dependent records, uses a fixed shared seed and configurable counts, advances applications through the same stage gates, creates all required rubric reviews for progressed applications, and generates offers through the approval service. It then injects labeled exception fixtures in a separate ground-truth file. Dataset validation checks schema-derived keys, foreign keys, enums, lifecycle and date rules, joins, scorecard arithmetic, and exact labeled entity matches. It does not silently treat an injected exception as a valid baseline record.
