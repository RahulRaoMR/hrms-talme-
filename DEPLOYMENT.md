# Talme HRMS Deployment Guide

This app is ready for local demos with SQLite and Prisma. For a production-grade corporate deployment, use a managed PostgreSQL database because serverless file systems do not persist SQLite reliably.

## Local Run

```bash
npm install
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
npm run dev
```

Default admin login:

```text
Email: director@talme.ai
Password: talme123
```

## Production Environment

Set these environment variables in your hosting provider:

```text
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public
AUTH_SECRET=replace-with-a-long-random-secret
```

Recommended production steps:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run build -- --webpack
npm run start
```

## Corporate Controls Included

- Real Prisma database models for users, ATS candidates, VMS vendors, payroll invoices, and audit logs.
- Credentials authentication with active/inactive user control.
- Role-based page access for Enterprise Admin, Operations Manager, Finance Approver, and Recruiter.
- CRUD tables with search, filter, sorting, pagination, bulk delete, CSV import/export, and approval actions.
- Audit logging for create, update, delete, import, approve, and bulk delete flows.

## Production Hardening Checklist

- Rotate `AUTH_SECRET` and all seeded passwords before launch.
- Move from SQLite to PostgreSQL before deploying to Vercel, Azure App Service, AWS, or Render.
- Add company SSO if this will be used by employees outside a closed demo.
- Add file storage for payslips, invoices, statutory documents, and vendor KYC attachments.
- Add record-level permissions if different plants, regions, or clients should not see each other's data.
