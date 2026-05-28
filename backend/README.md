# Backend Deployment

This folder is the Render backend root for Talme HRMS. It contains the API route handlers, Prisma schema/migrations, service modules, and the custom Node server used by Render.

Render should use this folder as the service root:

```text
Root Directory: backend
Build Command: npm install && npx prisma generate && npm run build
Start Command: npx prisma migrate deploy && npm start
```

The server exposes:

```text
GET /health
GET /api/*
POST /api/*
PATCH /api/*
DELETE /api/*
```

Set `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`, and `FRONTEND_URL` in Render. `FRONTEND_URL` should be your Vercel frontend URL so browser calls from Vercel can reach this backend through CORS.

The frontend should set:

```text
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
```
