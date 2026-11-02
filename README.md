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

The generator scripts are in `backend/scripts/generator/`; generated CSV, JSON, SQL, validation results, source manifest, and anomaly labels are in `backend/exports/`. They require a configured PostgreSQL database and generated Prisma client. The seed used by the current generator scripts is `20261022`. The scripts are separate database-backed steps, not a single clean-reset command; run only against a disposable database. Interview generation currently creates screening interviews only. `generateOffers.js` now processes applications already at the OFFER stage; it does not fabricate later-stage interviews or bypass the review gates.

The checked-in export set reports 5,001 candidates, 201 requisitions, 8,000 applications, and 2,000 interviews. The candidate and requisition totals include deliberate anomaly fixtures, so they are not exactly the requested 5,000/200 baseline counts. The current generator scripts also do not expose a shared scale parameter or provide a verified two-run checksum comparison. These are known data-generation gaps; do not treat the checked-in exports as evidence that those acceptance criteria have passed.

The checked-in validation report currently has no detected integrity issues and identifies all five labelled anomaly types. Its validator does not yet verify every schema foreign key, enum, lifecycle transition, or date-order rule. The checked-in generated schema dictionary also predates the fix for its missing model headings; rerun `node scripts/generator/generateDataDictionary.js` from `backend/` after installing backend dependencies and configuring the database to refresh it.

The five deliberate anomaly labels are recorded separately in `backend/exports/ground_truth.csv` and `backend/exports/ground_truth.json`. See [the business rules](./docs/business-rules.md), [the data dictionary](./docs/data-dictionary.md), [the ER diagram](./docs/er-diagram.md), and [the backend-generated schema dictionary](./backend/docs/DATA_DICTIONARY.md) for workflow, relationships, and data details.

## Submission context

See [reviewer notes](./docs/SUBMISSION_NOTES.md) for assumptions, implementation decisions, trade-offs, verification evidence, work history, and known limitations. See [AI usage and prompt history](./docs/AI_USAGE.md) for the prompt summary, disclosure of AI assistance, and what was validated.

## Data provenance

The checked-in dataset is synthetic and uses reserved `.test` email addresses and example resume URLs. No external candidate or employee data is required to run the application.
