# Helia Diagnostics — Reporting Platform

A role-based text reporting app for **Helia Diagnostics**, built with **Next.js (App Router)**, **TypeScript (strict)**, **Tailwind CSS**, **Prisma**, and **PostgreSQL**.

Three roles, switchable via a mock-auth toggle in the header. Every mutation is **RBAC-gated on the server** before it touches the database.

| Role | Capabilities |
| --- | --- |
| **Admin** | User management (create/edit/role), Template manager, "Destruction Override" hard-delete console |
| **Receptionist** | Patient registration (auto UHID `HELIA-1001…`), Print Hub → A4 letterhead print page |
| **Radiologist** | Active worklist + side-by-side interactive editor; pick a template to inject default text, then approve |

## Architecture

```
prisma/
  schema.prisma        # User, Patient, Template, Report + enums (UUID PKs)
  seed.ts              # demo users (hashed pw), templates, patients, 1 approved report
src/
  lib/
    auth.ts            # requireRole / withRole — server-side RBAC gate
    session.ts         # mock-auth role cookie + getCurrentUser
    prisma.ts          # client w/ DATABASE_URL→POSTGRES_URL→PRISMA_DATABASE_URL fallback
    uhid.ts            # transactional sequential UHID generator
    prisma-errors.ts   # constraint-error → friendly message
    types.ts, nav.ts   # shared enums/labels + role-based nav
  app/
    actions/           # server actions, each role-locked via withRole():
                       #   users.ts (ADMIN) templates.ts (ADMIN) admin.ts hardDelete (ADMIN)
                       #   patients.ts (RECEPTIONIST) reports.ts (RADIOLOGIST) auth.ts (switcher)
    admin/{users,templates,records}/   receptionist/{,print,print/[reportId]}/   radiologist/
  components/          # shared ui/* + admin/* receptionist/* radiologist/*
```

### Data model (all ids are UUID)
- **User** — `id, name, email (unique), password, role(ADMIN|RECEPTIONIST|RADIOLOGIST), createdAt`
- **Patient** — `id, uhid (unique, HELIA-####), name, age, gender, createdAt`
- **Template** — `id, title (unique), modality(XRAY|CT|MRI|USG), defaultFindings, defaultImpression`
- **Report** — `id, patientId, templateId?, radiologistId?, status(DRAFT|APPROVED), findings, impression, createdMonthYear(YYYY-MM), createdAt, approvedAt?`

### RBAC
`src/lib/auth.ts` exposes `requireRole`/`withRole`. Every mutating action calls it **before** any DB write, so authorization is enforced server-side regardless of the UI. Example: a non-receptionist calling `createPatient` gets `"This action requires the RECEPTIONIST role."`

## Getting started

```bash
export PATH="/Users/nihalreddygurrala/Workspace/.tools/node-v22.14.0-darwin-arm64/bin:$PATH"
npm install
cp .env.example .env        # set DATABASE_URL
npm run db:push             # create tables
npm run db:seed             # demo data (all accounts password: "helia123")
npm run dev                 # http://localhost:3000  (or ./dev.sh on port 3100)
```

Pages degrade to a "Database unavailable" notice (`safeQuery`) instead of crashing when the DB is unreachable.

## Notes
- **Mock auth**: the active role lives in an `httpOnly` cookie (`src/lib/session.ts`). The `User.password` column (bcrypt-hashed) is the seam for real credential auth later.
- **Print**: `/receptionist/print/[reportId]` renders an A4 `.print-sheet`; the toolbar and app chrome are `.no-print`, so `window.print()` yields a clean, border-free letterhead.
