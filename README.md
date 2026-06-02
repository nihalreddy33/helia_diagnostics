# Helia Diagnostics — Reporting Platform

A text-based medical reporting web app built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **Prisma**, and **PostgreSQL**.

It supports three roles, switchable via a mock-auth toggle in the header:

| Role | Workflow |
| --- | --- |
| **Reception / Staff** | Register patients & assign a target modality (`/reception`) |
| **Radiologist** | Pick a patient, load a scan template, edit findings/impression, submit for review (`/radiologist`) |
| **Admin / Reviewer** | Review the pending queue, edit, and **Approve & Lock** (`/admin`); browse the month-wise archive (`/archive`) |

## Stack & structure

```
prisma/
  schema.prisma        # User, Patient, Template, Report + enums
  seed.ts              # demo users, templates, patients, one approved report
src/
  lib/                 # prisma client, mock session, shared types/helpers
  app/
    actions/           # server actions: patients, reports, auth
    reception|radiologist|admin|archive/  # role pages
  components/          # UI (forms, queues, header, primitives)
```

### Data model

- **User** — `id, name, email, role(ADMIN|RADIOLOGIST|RECEPTION)`
- **Patient** — `id, uhid, name, age, gender, createdAt` (+ `targetModality`)
- **Template** — `id, title, modality(XRAY|CT|MRI|USG), defaultFindings, defaultImpression`
- **Report** — `id, patientId, templateId, status(DRAFT|PENDING_REVIEW|APPROVED), findings, impression, createdMonthYear(YYYY-MM), radiologistId, createdAt, approvedAt`

### Server actions

- `createPatient` — validated patient intake.
- `saveReport` — create/update a report as `DRAFT` or `PENDING_REVIEW`; refuses to edit locked reports.
- `approveReport` — applies final edits, sets `APPROVED` + `approvedAt`.
- `getReportsByMonth` / archive page — fetch approved reports filtered by month & free-text search.

All actions return a typed `ActionResult<T>` (`{ ok: true, data } | { ok: false, error }`).

## Getting started

```bash
# 1. Use the project-local Node (v22)
export PATH="/Users/nihalreddygurrala/Workspace/.tools/node-v22.14.0-darwin-arm64/bin:$PATH"

# 2. Install
npm install

# 3. Configure the database
cp .env.example .env        # then edit DATABASE_URL
npm run db:push             # create tables
npm run db:seed             # demo data

# 4. Run
npm run dev                 # http://localhost:3000
```

> Without a reachable PostgreSQL the UI still renders — each page degrades to a
> "Database unavailable" notice instead of crashing.

## Notes

- **Mock auth**: the active role lives in an `httpOnly` cookie set by the header's role switcher. Swap `src/lib/session.ts` for a real auth provider in production.
- `targetModality` on `Patient` is a small extension of the core spec so Reception's "target modality" has a home and the radiologist can pre-filter templates.
