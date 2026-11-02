# Reviewer notes

## Problem and scope

HireFlow is a hiring workflow application. Its intended lifecycle connects approved requisitions and role criteria to candidate applications, interviews and availability, structured reviews, offers, and approvals. The application stores explicit stage events and audit records so that decisions can be traced.

The current implementation is a React/Vite frontend with an Express API, Prisma data model, and PostgreSQL persistence. See the [ER diagram](./er-diagram.md), [business rules](./business-rules.md), and [data dictionary](./data-dictionary.md) for the domain model and intended rules.

## Assumptions and decisions

- Application stages follow the documented linear workflow. Rejection and withdrawal remain available as terminal decisions.
- Before an application advances past an interview stage, each non-observer interviewer on every non-cancelled interview of that type must have submitted a scorecard. Cancelled interviews do not satisfy the gate.
- Marking an application HIRED requires an accepted offer. Rejection and withdrawal do not require a completed interview.
- Reviewer and participant checks use the interview's stored participants. This is intentionally a stage gate, not a new authorization system.
- Synthetic data uses reserved `.test` addresses and example resume URLs; no external personal data is needed.
- Compensation and scorecard ranges follow the values enforced by the current services (offer salary within the requisition band; scorecard values from 0 to 10).

## Trade-offs

- Stage validation is performed inside the existing database transaction before the application update and append-only stage event. This preserves the existing service/API design while keeping the decision and history write together.
- This change checks the previous stage's interview records when the application advances. It does not create missing later-stage interviews, add a scale-aware generator, or claim that all generated rows pass every lifecycle check.
- Interview scheduling checks availability and overlapping scheduled interviews in the service. Deliberate anomaly fixtures intentionally violate normal business rules and are labelled in separate ground-truth exports.

## Verification

Run from the repository root / `backend` as shown:

```powershell
npm run lint
npm run build
Set-Location backend
npm test
```

The backend tests use `node:test` and cover missing interviews, incomplete reviews, fully reviewed advancement, cancelled interviews, observer exclusion, accepted-offer hiring, and terminal transitions. They exercise the pure stage-gate rule; they do not require PostgreSQL.

The latest recorded local verification passed frontend lint, frontend production build, and all 6 backend tests. The database-backed API, migrations, complete synthetic-data generation, and validation command were not run as part of that verification. The checked-in `backend/exports/validation_summary.json` is a prior generated report, not a result of a fresh run against the current code.

## Known limitations

- The checked-in dataset has 5,001 candidates and 201 requisitions, not the requested exact 5,000/200 baseline. It includes labelled anomaly fixtures.
- Generator scripts use a fixed seed in individual scripts but lack a common scale option and a single reproducibility/checksum command.
- The interview generator creates screening interviews only. Later-stage interviews and evaluations must be provided before realistic downstream progression to offers.
- The validator does not yet verify every model's foreign keys, enums, transition history, and date rules.
- The complete data dictionary is split between schema-generated field metadata and hand-maintained domain documentation; not every field currently has an explicit unit, allowed-value list, uniqueness rule, and validation rule in one document.

These are unfinished acceptance criteria, not features inferred from the presence of exported files.

## Work history

The public repository history includes earlier feature milestones, followed by this task's stage-gate and documentation work:

- `06c9773` — Complete interview scheduling and conflict prevention
- `e772d62` — Complete offer management and approval workflow
- `b2d60eb` — Complete live recruitment dashboard analytics
- `673f2ec` — Enforce hiring workflow stage gates

The latest commit adds explicit interview-review and accepted-offer gates, focused tests, and related documentation and generator fixes. These commits are visible in the public Git history.
