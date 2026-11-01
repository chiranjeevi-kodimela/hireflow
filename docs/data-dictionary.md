
# HireFlow — Data Dictionary

## 1. Requisition

Represents an approved job opening within an organization.

| Field | Type | Required | Constraints / Description |
|---|---|---|---|
| requisition_id | String | Yes | Primary key. Format: REQ-2026-000001 |
| title | String | Yes | Job title |
| department | String | Yes | Hiring department |
| location | String | Yes | Job location |
| employment_type | Enum | Yes | FULL_TIME, PART_TIME, CONTRACT, INTERN |
| min_salary | Decimal | Yes | Minimum approved salary |
| max_salary | Decimal | Yes | Maximum approved salary; must be >= min_salary |
| openings | Integer | Yes | Must be greater than 0 |
| hiring_manager_id | String | Yes | Foreign key to HiringManager |
| status | Enum | Yes | DRAFT, PENDING_APPROVAL, OPEN, ON_HOLD, CLOSED, CANCELLED |
| created_at | DateTime | Yes | Record creation timestamp |
| updated_at | DateTime | Yes | Last update timestamp |

## 2. HiringManager

Represents an employee responsible for a requisition.

| Field | Type | Required | Constraints / Description |
|---|---|---|---|
| hiring_manager_id | String | Yes | Primary key |
| full_name | String | Yes | Manager's name |
| email | String | Yes | Unique, valid email |
| department | String | Yes | Manager's department |
| designation | String | Yes | Job designation |
| is_active | Boolean | Yes | Defaults to true |
| created_at | DateTime | Yes | Record creation timestamp |

## 3. Candidate

Represents a person applying for job opportunities.

| Field | Type | Required | Constraints / Description |
|---|---|---|---|
| candidate_id | String | Yes | Primary key. Format: CAND-000001 |
| full_name | String | Yes | Candidate's name |
| email | String | Yes | Unique, valid email |
| phone | String | No | Contact number |
| location | String | No | Candidate's location |
| experience_years | Decimal | Yes | Must be >= 0 |
| current_company | String | No | Current or previous company |
| resume_url | String | No | Resume reference |
| created_at | DateTime | Yes | Record creation timestamp |

## 4. Application

Connects a candidate to a requisition.

| Field | Type | Required | Constraints / Description |
|---|---|---|---|
| application_id | String | Yes | Primary key. Format: APP-<candidate-id>-<req-id> |
| candidate_id | String | Yes | Foreign key to Candidate |
| requisition_id | String | Yes | Foreign key to Requisition |
| current_stage | Enum | Yes | APPLIED, SCREENING, TECHNICAL, MANAGERIAL, HR, OFFER, HIRED, REJECTED, WITHDRAWN |
| status | Enum | Yes | ACTIVE, REJECTED, WITHDRAWN, HIRED |
| applied_at | DateTime | Yes | Application submission timestamp |
| updated_at | DateTime | Yes | Last update timestamp |

**Constraint:** A candidate can apply to a particular requisition only once.

## 5. SkillRequirement

Defines the skills and expected proficiency for a requisition.

| Field | Type | Required | Constraints / Description |
|---|---|---|---|
| skill_requirement_id | String | Yes | Primary key |
| requisition_id | String | Yes | Foreign key to Requisition |
| skill_name | String | Yes | Example: JavaScript, SQL, React |
| minimum_level | Enum | Yes | BEGINNER, INTERMEDIATE, ADVANCED, EXPERT |
| is_mandatory | Boolean | Yes | Whether the skill is required |
| weight | Decimal | Yes | Evaluation weight, greater than 0 |
| created_at | DateTime | Yes | Record creation timestamp |

**Constraint:** Skill weights for a requisition must be validated and normalized before calculating an overall skill score.
