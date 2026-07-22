# Talme HRMS System Architecture

```mermaid
flowchart TB
  subgraph Clients["Client Applications"]
    AdminWeb["Admin / HR Web App\nNext.js App Router pages"]
    EmployeeWeb["Employee Portal\n/employee-portal, /employee-app"]
    VendorWeb["Vendor Portal\n/vendor-portal"]
    AndroidApp["Android Employee App\nCapacitor WebView"]
  end

  subgraph Frontend["Frontend Service: hrms-talme-frontend"]
    NextPages["React UI Components\ncomponents/pages, components/features"]
    ApiClient["API Client\nlib/api-client.js, lib/api-actions.js"]
    NextApi["Next.js API Routes\napp/api/*"]
    LocalFallback["Local / Ephemeral Store\nlib/local-api-store.js"]
    PrismaStore["Frontend Prisma Store\nlib/prisma-store.js"]
    PdfRoutes["PDF / Export Routes\npayslip, salary slips, letters, reports"]
  end

  subgraph Backend["Backend Service: talme-hrms-backend"]
    Express["Express Server\nbackend/server.js"]
    Auth["Auth & Session Tokens\nbcrypt + HMAC token"]
    ResourceApi["Resource APIs\n/api/:resource, /api/:resource/:id"]
    DomainModules["Domain Modules\nemployees, leave, attendance,\npayroll, recruitment, vendors,\napprovals, documents, reports"]
    Uploads["Upload Handling\npublic/uploads"]
    EmailJobs["Email Automation\nwelcome, leave status,\nnotifications, salary slips"]
    SharePointSync["ATS SharePoint Sync\nMicrosoft Graph workbook import/export"]
  end

  subgraph Data["Persistence Layer"]
    Postgres[("PostgreSQL Database")]
    Prisma["Prisma ORM\nbackend/prisma/schema.prisma"]
    SeedData["Seed / Demo Data\nbackend/prisma/seed.mjs,\nbackend/data/recruitment"]
    UploadStore[("Uploaded Files\nlocal storage or configured provider")]
  end

  subgraph External["External Services"]
    Render["Render Hosting\nfrontend + backend services"]
    SMTP["SMTP / Gmail / Resend\nEmail delivery"]
    Graph["Microsoft Graph / SharePoint\nATS workbook"]
  end

  AdminWeb --> NextPages
  EmployeeWeb --> NextPages
  VendorWeb --> NextPages
  AndroidApp --> EmployeeWeb

  NextPages --> ApiClient
  ApiClient --> NextApi
  ApiClient -. configured NEXT_PUBLIC_API_URL/API_BASE_URL .-> Express

  NextApi -->|proxy when backend URL is configured| Express
  NextApi -->|direct DB fallback when DATABASE_URL exists| PrismaStore
  NextApi -->|development fallback| LocalFallback
  NextApi --> PdfRoutes

  PrismaStore --> Prisma
  PdfRoutes --> Prisma

  Express --> Auth
  Express --> ResourceApi
  Express --> DomainModules
  Express --> Uploads
  Express --> EmailJobs
  Express --> SharePointSync

  ResourceApi --> Prisma
  DomainModules --> Prisma
  Auth --> Prisma
  Uploads --> UploadStore
  EmailJobs --> SMTP
  SharePointSync --> Graph
  SharePointSync --> Prisma

  Prisma --> Postgres
  SeedData --> Prisma
  Render --> Frontend
  Render --> Backend
```

## Main Request Flow

1. Users access the Next.js UI through the HR/admin web app, employee portal, vendor portal, or the Capacitor Android shell.
2. UI components call `lib/api-actions.js`, which resolves API URLs through `lib/api-client.js`.
3. Requests normally hit `app/api/*` in the Next.js service.
4. Next.js API routes proxy to the Express backend when `NEXT_PUBLIC_API_URL` or `API_BASE_URL` is configured.
5. If no backend URL is configured, the Next.js routes can use `lib/prisma-store.js` with `DATABASE_URL`, or a development-only local fallback store.
6. The Express backend handles authentication, CRUD resources, dashboards, reports, payroll, uploads, notifications, and ATS SharePoint sync.
7. Prisma persists HRMS data in PostgreSQL using the models in `backend/prisma/schema.prisma`.

## Core Business Modules

- Workforce: employees, users, roles, attendance, punch activity, shifts, leave requests, documents.
- Recruitment / ATS: candidates, job openings, recruiters, harmonized roles, offers, SharePoint workbook sync.
- Payroll: salary data, payslip PDFs, salary slip sharing, payroll release and summary.
- Vendor management: vendors, vendor workers, invoices, invoice parties, vendor portal.
- Operations: approvals, notifications, settings, activity/audit logs, dashboard, reports, exports, global search.

## Deployment View

```mermaid
flowchart LR
  Browser["Browser / Android WebView"] --> Frontend["Render Web Service\nhrms-talme-frontend\nNext.js"]
  Frontend -->|API proxy or direct API calls| Backend["Render Web Service\ntalme-hrms-backend\nExpress"]
  Frontend -->|optional direct Prisma access| DB[("PostgreSQL")]
  Backend --> DB
  Backend --> Mail["SMTP / Gmail / Resend"]
  Backend --> MSGraph["Microsoft Graph / SharePoint"]
```

