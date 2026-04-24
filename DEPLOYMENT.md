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
STORAGE_PROVIDER=local or s3
AWS_REGION=ap-south-1
S3_BUCKET_NAME=your-bucket
S3_ACCESS_KEY_ID=your-key
S3_SECRET_ACCESS_KEY=your-secret
S3_ENDPOINT=optional-for-s3-compatible-storage
S3_PUBLIC_BASE_URL=optional-public-base-url
S3_FORCE_PATH_STYLE=false
RESEND_API_KEY=your-resend-key
EMAIL_FROM=Talme <no-reply@yourdomain.com>
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_SMS_FROM=+1...
TWILIO_WHATSAPP_FROM=whatsapp:+1...
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

- Real Prisma database models for users, employees, leave, attendance, vendor workers, documents, approvals, settings, ATS candidates, VMS vendors, payroll invoices, and audit logs.
- Cloud-ready upload architecture with local and S3-compatible storage providers.
- External notification delivery hooks for email via Resend and SMS/WhatsApp via Twilio.
- Credentials authentication with active/inactive user control.
- Role-based page access for Enterprise Admin, Operations Manager, Finance Approver, and Recruiter.
- CRUD tables with search, filter, sorting, pagination, bulk delete, CSV import/export, and approval actions.
- Audit logging for create, update, delete, import, approve, and bulk delete flows.
- Employee self-service, vendor portal, approval inbox, compliance vault, company policy settings, and executive reports.

## Production Hardening Checklist

- Rotate `AUTH_SECRET` and all seeded passwords before launch.
- Move from SQLite to PostgreSQL before deploying to Vercel, Azure App Service, AWS, or Render.
- Add company SSO if this will be used by employees outside a closed demo.
- Add file storage for payslips, invoices, statutory documents, and vendor KYC attachments.
- Configure `RESEND_API_KEY` and Twilio sender numbers before using live notification delivery.
- Switch `STORAGE_PROVIDER` to `s3` and provide bucket credentials for persistent production uploads.
- Add record-level permissions if different plants, regions, or clients should not see each other's data.
