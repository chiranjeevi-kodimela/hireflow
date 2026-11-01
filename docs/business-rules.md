# HireFlow — Business Rules

## 1. Requisition Management

- A requisition must be created by an authorized hiring manager or HR employee.
- Every requisition must have a title, department, location, salary range and number of openings.
- Minimum salary cannot exceed maximum salary.
- A requisition must be approved before it becomes OPEN.
- Only OPEN requisitions can receive new applications.
- CLOSED and CANCELLED requisitions cannot accept applications.
- Every requisition must have at least one defined skill requirement before approval.

## 2. Candidate and Application Management

- A candidate must have a valid email address.
- A candidate can apply to the same requisition only once.
- An application must reference an existing candidate and requisition.
- An application can only be created for an OPEN requisition.
- Every application begins at the APPLIED stage.
- Application status and current stage must remain consistent.
- A rejected or withdrawn application cannot proceed to another stage.
- A candidate can apply to different requisitions independently.

## 3. Application Stage Transitions

Allowed normal workflow:

APPLIED → SCREENING → TECHNICAL → MANAGERIAL → HR → OFFER → HIRED

Additional outcomes:

- Any active stage may transition to REJECTED.
- A candidate may withdraw from any active stage.
- A withdrawn application cannot be reactivated automatically.
- A rejected application cannot be reopened without an authorized administrative action.

Stage gate requirements:

| Transition             | Required condition                         |
| ---------------------- | ------------------------------------------ |
| APPLIED → SCREENING    | Application is valid                       |
| SCREENING → TECHNICAL  | Screening review completed                 |
| TECHNICAL → MANAGERIAL | Required technical scorecards submitted    |
| MANAGERIAL → HR        | Managerial evaluation completed            |
| HR → OFFER             | HR review completed and candidate selected |
| OFFER → HIRED          | Offer accepted and joining confirmed       |

- Every transition must create an ApplicationStageEvent.
- Invalid transitions must be rejected by the backend.
- The application’s current_stage must reflect its latest valid event.

## 4. Interview Scheduling

- An interview can only be scheduled for an active application.
- Every interview must have a valid start and end time.
- Every interview must belong to an interview panel.
- Every scheduled interview must have at least one participant.
- Participants must be active employees.
- Every participant must have availability covering the complete interview slot.
- An interviewer cannot attend two overlapping interviews.
- An interview cannot be scheduled outside the interviewer's available time.
- Cancelled interviews do not block future scheduling.
- Rescheduling must retain the original interview history.
- Time comparisons must use a consistent timezone strategy.

## 5. Interview Evaluation

- Each interviewer can submit one scorecard per interview.
- A scorecard must reference an existing interview and reviewer.
- Reviewers must be assigned participants in that interview.
- Technical, communication and problem-solving scores must be between 1 and 5.
- Every completed interview must have the required scorecards.
- Evaluation criteria must be relevant to the requisition and interview type.
- A candidate cannot advance beyond an interview stage until the required evaluations are submitted.
- Submitted scorecards must retain their original submission history.

## 6. Offer Management

- An offer can only be created for an eligible application.
- An application must complete the required interview and HR stages before an offer is created.
- Offered salary must be greater than zero.
- Offered salary must be within the requisition's approved salary range.
- An offer outside the approved range must be flagged for exception handling.
- An offer must receive all required approvals before it can be sent.
- Only approved offers can transition to SENT.
- An accepted offer can lead to the application becoming HIRED.
- Declined, expired or withdrawn offers must retain their history.
- Only one active offer may exist for an application.

## 7. Approval Management

- Every approval must reference exactly one requisition or offer.
- Only authorized employees can approve or reject requests.
- An approver cannot approve their own request where separation of duties is required.
- Approval decisions must include the approver and decision timestamp.
- Rejected approvals must include a reason.
- Offers cannot be sent while required approvals are pending.
- Approval history must not be overwritten.

## 8. Audit and Traceability

The system must record important actions, including:

- Requisition creation and status changes.
- Application creation and stage transitions.
- Interview scheduling, cancellation and rescheduling.
- Scorecard submission.
- Offer creation and status changes.
- Approval decisions.

Each audit record should capture:

- Actor responsible for the action.
- Entity type and entity ID.
- Action performed.
- Previous value, where applicable.
- New value, where applicable.
- Timestamp.

Audit history must be append-only for normal application operations.

## 9. Exception Handling

The system must identify and report the following deliberate anomaly cases:

| Issue Type                    | Description                                         | Expected System Response                              |
| ----------------------------- | --------------------------------------------------- | ----------------------------------------------------- |
| STAGE_WITHOUT_REVIEW          | Candidate advances without required evaluation      | Block transition and flag issue                       |
| INTERVIEWER_DOUBLE_BOOKED     | Interviewer assigned to overlapping interviews      | Reject scheduling and flag conflict                   |
| OFFER_ABOVE_BAND              | Offer exceeds approved salary range                 | Block normal approval or require documented exception |
| WITHDRAWN_CANDIDATE_SCHEDULED | Withdrawn candidate still has a scheduled interview | Flag and cancel invalid future interview              |
| IRRELEVANT_EVALUATION         | Scorecard contains criteria unrelated to the role   | Flag scorecard for review                             |

Anomaly records must have:

- A unique issue ID.
- An issue type.
- A reference to the affected record.
- A description.
- Expected outcome.
- Ground-truth label.

Synthetic anomaly records must be separated from normal baseline records.

## 10. Recruitment Metrics

The system should calculate:

| Metric                    | Calculation                                                   |
| ------------------------- | ------------------------------------------------------------- |
| Total Requisitions        | Count of requisitions                                         |
| Open Requisitions         | Count where status = OPEN                                     |
| Total Applications        | Count of applications                                         |
| Interview Conversion Rate | Applications reaching interview / eligible applications × 100 |
| Offer Rate                | Offers created / applications × 100                           |
| Offer Acceptance Rate     | Accepted offers / offers sent × 100                           |
| Hiring Rate               | Hired applications / total applications × 100                 |
| Average Time to Hire      | Average days between application and hire                     |
| Interview Conflict Count  | Number of detected scheduling conflicts                       |
| Pending Approvals         | Count of approvals with PENDING decision                      |

Metrics must be calculated from actual records, not independently generated random values.

## 11. Data Generation Rules

- Use a fixed random seed: 20261022.
- Generate master records before dependent records.
- Generate baseline records using valid business rules.
- Generate deliberate anomalies separately.
- Use deterministic IDs.
- Derive statuses and calculated values from source records.
- Generate ground_truth.csv and ground_truth.json separately.
- Validate primary keys, foreign keys, enums, date ranges and workflow transitions.
- Running the generator twice with the same seed and configuration must produce identical outputs.
