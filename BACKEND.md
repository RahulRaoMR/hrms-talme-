# Backend Overview

This project now uses a layered backend structure that matches the UI modules while preserving the working Next.js + Prisma app.

## Final structure

```text
/app/api
/modules
/services
/controllers
/middleware
/lib/prisma.js
```

Important design rule:

- keep the current working schema that matches the UI
- keep the current NextAuth-based authentication
- improve the backend structure without breaking the app

This project uses:

- Prisma ORM
- SQLite database
- Next.js Route Handlers under `app/api`
- Next.js Server Actions in `app/actions.js`
- Nodemailer for SMTP/Gmail email delivery
- `node-cron` for scheduled payroll email automation
- Audit logging via `AuditLog`
- Seed data bootstrapping via `lib/seed-db.js`

## Step 1: Core backend files

- `prisma/schema.prisma`
  Database models
- `lib/prisma.js`
  Prisma client singleton
- `lib/seed-db.js`
  Initial demo/seed records
- `lib/query-data.js`
  Read-side query helpers for pages
- `app/actions.js`
  Server-side mutations used by the UI
- `lib/recruitment-data.js`
  Reads normalized recruitment workbook seed files
- `scripts/extract_recruitment_workbook.py`
  Converts the SharePoint Excel workbook into JSON seed files
- `scripts/replace-recruitment-data.mjs`
  Deletes draft ATS/recruitment records and reloads real workbook data

## Step 2: Shared backend architecture

- `services/crud-service.js`
  Shared CRUD service layer for Prisma resources
- `services/emailService.js`
  Shared Nodemailer transporter and generic send helper
- `services/emailAutomation.js`
  Workflow-specific email triggers for employee, payroll, leave, and offer flows
- `services/templates/*`
  Reusable HTML templates for welcome, offer, salary, and leave emails
- `services/cron.js`
  Monthly payroll email cron registration helper
- `controllers/http-controller.js`
  Shared JSON/error handling for controllers
- `controllers/crud-controller.js`
  Shared CRUD controller generator
- `middleware/auth.js`
  API auth/access helpers built on the existing NextAuth session

## Step 3: Module folders

These backend module folders now exist:

- `modules/dashboard`
- `modules/candidate`
- `modules/employee`
- `modules/attendance`
- `modules/payroll`
- `modules/vendor`
- `modules/leave`
- `modules/approval`
- `modules/document`
- `modules/notification`
- `modules/user`
- `modules/job-opening`
- `modules/recruiter`
- `modules/harmonized-role`
- `modules/settings`
- `modules/vendor-worker`
- `modules/report`
- `modules/search`
- `modules/activity`
- `modules/hrms`
- `modules/recruitment`
- `modules/employee-portal`
- `modules/vendor-portal`
- `modules/auth`
- `modules/export`

Each module contains a small `service.js`, `controller.js`, or both.

## Step 4: Shared API backend layer

- `lib/backend-core.js`
  Shared audit logging and page revalidation
- `lib/api-route-factory.js`
  Reusable `GET/POST/PATCH/DELETE` route builder kept for compatibility
- `lib/api-resources.js`
  Resource definitions for each Prisma model

## Step 5: REST API routes

The backend now exposes these UI-level and resource-level APIs:

- `GET /api/dashboard`
- `GET /api/hrms`
- `GET /api/recruitment`
- `GET /api/reports`
- `GET /api/employee-portal`
- `GET /api/vendor-portal`
- `GET, POST /api/job-openings`
- `GET, PATCH, DELETE /api/job-openings/:id`
- `GET, POST /api/recruiters`
- `GET, PATCH, DELETE /api/recruiters/:id`
- `GET, POST /api/harmonized-roles`
- `GET, PATCH, DELETE /api/harmonized-roles/:id`
- `GET, POST /api/candidates`
- `GET, PATCH, DELETE /api/candidates/:id`
- `GET, POST /api/vendors`
- `GET, PATCH, DELETE /api/vendors/:id`
- `GET, POST /api/invoices`
- `GET, PATCH, DELETE /api/invoices/:id`
- `GET, POST /api/users`
- `GET, PATCH, DELETE /api/users/:id`
- `GET, POST /api/employees`
- `GET, PATCH, DELETE /api/employees/:id`
- `GET, POST /api/leave-requests`
- `GET, PATCH, DELETE /api/leave-requests/:id`
- `GET, POST /api/attendance-records`
- `GET, PATCH, DELETE /api/attendance-records/:id`
- `GET, POST /api/vendor-workers`
- `GET, PATCH, DELETE /api/vendor-workers/:id`
- `GET, POST /api/documents`
- `GET, PATCH, DELETE /api/documents/:id`
- `GET, POST /api/approvals`
- `GET, PATCH, DELETE /api/approvals/:id`
- `GET, POST /api/settings`
- `GET, PATCH, DELETE /api/settings/:id`
- `GET, POST /api/notifications`
- `GET, PATCH, DELETE /api/notifications/:id`
- `POST /api/notifications/:id/send`
- `POST /api/payroll/release`
- `GET, POST /api/uploads`
- `DELETE /api/uploads/:id`
- `GET /api/search`
- `GET /api/activity`
- `GET /api/bootstrap`
- `GET /api/export/[dataset]`
- `/api/pdf/[kind]`
- `/api/auth/[...nextauth]`
- `/api/auth/login`

## Step 6: How the frontend uses the backend

- Server-rendered pages read data through `lib/query-data.js`
- Client pages mutate data through `app/actions.js`
- API route handlers now delegate into a controller/service module structure
- `/recruitment/job-openings` reads real workbook-backed recruitment data from Prisma
- `/ats` and candidate detail pages use the imported candidate dataset instead of draft demo rows
- HRMS employee create now sends a welcome email when an email address is present
- ATS candidate approval now sends an offer/congratulations email when a candidate email is present
- Leave status updates now send an email to the mapped employee record when an employee email is present
- Payroll now exposes a release action plus `/api/payroll/release` for salary email dispatch

## Step 7: Recruitment workbook flow

Current recruitment import output:

- `72` job openings
- `1213` candidates
- `7` recruiters
- `24` harmonized roles

Commands:

- `npm run recruitment:extract`
  Parse `sharepoint-import.xlsx` into `data/recruitment/*.json`
- `npm run recruitment:replace`
  Delete draft ATS/recruitment rows and load the real workbook data into SQLite

## Step 8: Why this differs from the GPT suggestion

The GPT suggestion you shared recommended:

- replacing auth with raw `jsonwebtoken`
- replacing the whole schema with a new generic schema

This repo does **not** do that, intentionally:

- raw JWT auth would conflict with the current NextAuth-based login/session flow
- replacing the schema would break the current UI and imported recruitment data

Instead, this repo now uses the same cleaner SaaS-style architecture idea, but keeps the working app contracts intact.

## Step 9: Next recommended work

- Move the remaining client pages from local state refreshes to direct REST fetch hooks if you want a more API-first frontend
- Add input validation libraries like `zod` if you want stricter request validation
- Add role checks inside route handlers if you want per-endpoint authorization

## Step 10: Email automation setup

Environment variables:

- `EMAIL_SERVICE=gmail`
- `EMAIL_USER=yourmail@gmail.com`
- `EMAIL_PASS=your_app_password`
- `EMAIL_FROM="Talme HRMS <yourmail@gmail.com>"`
- optional SMTP override: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`

Implemented email files:

- `services/emailService.js`
- `services/emailAutomation.js`
- `services/templates/welcomeEmail.js`
- `services/templates/offerTemplate.js`
- `services/templates/salaryTemplate.js`
- `services/templates/leaveTemplate.js`
- `services/cron.js`

Current trigger points:

- `createEmployeeAction` and `modules/employee/service.js`
  Welcome email
- `approveCandidateAction`, `updateCandidateAction`, and `modules/candidate/service.js`
  Offer email when status moves into approved/offered
- `updateLeaveRequestAction` and `modules/leave/service.js`
  Leave status email
- `releasePayrollAction` and `POST /api/payroll/release`
  Salary release email batch
- `lib/notify.js`
  Notification center email channel now uses Nodemailer

Important note:

- `services/cron.js` registers the monthly payroll email schedule, but it should be started from a persistent Node process or platform scheduler in production


