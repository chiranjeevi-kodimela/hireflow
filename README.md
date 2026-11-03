# HireFlow

HireFlow is a hiring workflow app for managing requisitions, candidates and applications, interview availability and scheduling, structured evaluations, offers, and approvals. The React dashboard talks to an Express API backed by PostgreSQL and Prisma.

## Features

- Requisition and candidate/application tracking with stage history.
- Interview panels, interviewer availability, conflict checks, cancellation, and rescheduling.
- Rubric-based scorecards with criteria validation and derived weighted recommendations.
- Compensation-band validation, approval decisions, and offer lifecycle history.
- Audit events and dashboard hiring-funnel and timing metrics.
- Seed-data scripts and CSV/JSON exports with a separate anomaly ground-truth file.

## Requirements

- Node.js 20.19+ or 22.12+ (required by the installed Vite 8 toolchain).
- PostgreSQL.
- npm.

## Run locally

1. Install frontend dependencies:

   ```sh
   npm install
   ```

2. Configure the backend:

   ```sh
   cd backend
   npm install
   copy .env.example .env
   ```

   Set `DATABASE_URL` in `backend/.env` to a PostgreSQL database you control. On macOS/Linux, use `cp .env.example .env` instead of `copy`.

3. Generate the Prisma client and apply migrations:

   ```sh
   npx prisma generate
   npx prisma migrate deploy
   ```

4. Start the API and frontend in separate terminals:

   ```sh
   # from backend/
   npm run dev
   ```

   ```sh
   # from the repository root
   npm run dev
   ```

   The frontend uses `http://localhost:5000/api` by default. Set `VITE_API_URL` in a root `.env` file to point it at another API URL. Check `http://localhost:5000/api/health` to verify the API and database connection.

## Tests and checks

From the repository root:

```sh
npm run lint
npm run build
```

From `backend/`:

```sh
npm test
```

The backend tests use Node's built-in test runner and do not require a database.

## Synthetic data and exports

The ordered generator is `backend/scripts/generator/generateDataset.js`. It requires an empty disposable PostgreSQL database, an up-to-date Prisma client, and a configured `DATABASE_URL`. Apply migrations and generate the client, then run from `backend/`:

```sh
npx prisma migrate deploy
npx prisma generate
npm run generate:data
```

Default seeded baseline: 200 requisitions, 5,000 candidates, 8,000 applications, and 2,000 total interviews. Interview count includes screening and three later-stage interview rounds for 100 fully reviewed applications. It also generates a rescheduled interview and one labeled incomplete scorecard. Baseline records are generated first; labeled anomalies are injected after normal workflows. The synthetic employee set includes HR, hiring managers, interviewers, approvers, and an operations partner.

The shared generator settings are `HIRE_FLOW_SEED`, `HIRE_FLOW_REQUISITIONS`, `HIRE_FLOW_CANDIDATES`, `HIRE_FLOW_APPLICATIONS`, `HIRE_FLOW_INTERVIEWS`, `HIRE_FLOW_FOLLOWUP_APPLICATIONS`, and `HIRE_FLOW_CALENDAR_START` (UTC date; defaults to tomorrow). For example, on PowerShell:

```powershell
$env:HIRE_FLOW_SEED = "20261022"
$env:HIRE_FLOW_REQUISITIONS = "20"
$env:HIRE_FLOW_CANDIDATES = "500"
$env:HIRE_FLOW_APPLICATIONS = "800"
$env:HIRE_FLOW_INTERVIEWS = "200"
$env:HIRE_FLOW_FOLLOWUP_APPLICATIONS = "10"
$env:HIRE_FLOW_CALENDAR_START = "2026-11-04"
npm run generate:data
```

Total interviews equal screening interviews plus three follow-up rounds per follow-up application. Use `HIRE_FLOW_EXPORT_DIR` to select an export directory; by default it is `backend/exports/seed-<seed>`. The generator does not reset or delete database records. It aborts if the database is not empty or if the selected output directory already contains ground truth. CSV, JSON, SQL inserts, a source manifest, ground truth, and a validation report are written to that directory. Validation checks all schema-declared primary/unique keys, foreign keys and enums, plus workflow, dates, joins, score derivation, and exact ground-truth entity matches.

To demonstrate repeatability, run the same seed, scale, and calendar start against two separate empty databases, with distinct `HIRE_FLOW_EXPORT_DIR` values. Then compare logical row counts and checksums (timestamps and generated audit surrogate IDs are normalized):

```sh
npm run compare:exports -- ..\exports\repro-a ..\exports\repro-b
```

The checked-in `backend/exports/` files predate this expanded generator and are not evidence of a current reproducibility run; regenerate them using the steps above. See [the business rules](./docs/business-rules.md), [the data dictionary](./docs/data-dictionary.md), [the ER diagram](./docs/er-diagram.md), and [the backend schema dictionary](./backend/docs/DATA_DICTIONARY.md).

## Submission context

See [reviewer notes](./docs/SUBMISSION_NOTES.md) for assumptions, implementation decisions, trade-offs, verification evidence, work history, and known limitations. See [AI usage and prompt history](./docs/AI_USAGE.md) for the prompt summary, disclosure of AI assistance, and what was validated.

## Data provenance

The checked-in dataset is synthetic and uses reserved `.test` email addresses and example resume URLs. No external candidate or employee data is required to run the application.
