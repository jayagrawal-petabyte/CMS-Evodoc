#  Developer Guide

this is a clinic management system. Three kinds of users:

- **Patients** book appointments, watch their place in the live queue, see past prescriptions.
- **Receptionists** run the front desk — walk-ins, the token queue, billing, doctor schedules, branding.
- **Doctors** work a queue of patients and run consultations through an EMR-style worksheet that ends in a signed PDF prescription.

It's built as a single-clinic deployment: one frontend + one backend per clinic, all pointed at a shared Supabase database, with every row tagged by `CLINIC_ID`. So "multi-tenant" here means "many isolated deployments sharing one DB," not "one app serving many clinics."

---

## The stack (and the one weird decision)

**Monorepo**, pnpm workspaces:

```
CMS_Final/
├── frontend/          Next.js 14 (App Router) + TypeScript + Tailwind
├── backend/           Fastify 4 + TypeScript
├── packages/shared/   @cms/shared — Zod schemas shared by both
└── docs/              you are here
```

Frontend leans on: Tailwind, Radix primitives (shadcn-style components under `components/ui`), axios, react-hook-form + zod, date-fns, lucide-react, and `@supabase/supabase-js` purely for realtime.

Backend: Fastify 4, `@supabase/supabase-js` (service-role key), bcrypt, jsonwebtoken, zod, pdf-lib for prescriptions, and the usual `@fastify/{cookie,cors,multipart,rate-limit}`.

### Why we talk to Supabase over REST instead of Prisma

Here's the weird part. There's a `prisma/schema.prisma` in the backend and a `@prisma/client` dependency, but **we don't use Prisma at runtime.** Every query goes through the Supabase JS client (`backend/src/plugins/supabase.ts`), which hits Supabase's REST API over HTTPS (port 443).

Why? The original dev machine's ISP blocks outbound port **5432** (Postgres' direct port), and the pooler ports didn't authenticate either. A direct Prisma connection was a non-starter. The Supabase REST API runs on 443, which nothing blocks, so that's what we use.

Prisma still earns its keep for **schema modelling and migration SQL generation** — we write the schema in `schema.prisma`, run `prisma migrate diff` to get DDL, and paste that into the Supabase SQL editor. But `@prisma/client` never opens a socket in production. Keep that in mind: if you add a table, you update the Prisma schema *and* write the SQL by hand (more on this below).

---

## Getting it running locally

### Prereqs
- Node 18+ and **pnpm** (the repo is a pnpm workspace; npm/yarn will fight you)
- A Supabase project (free tier is fine)

### 1. Install
```bash
pnpm install
```
If you hit `ERR_PNPM_IGNORED_BUILDS`, run `pnpm approve-builds` and approve everything (bcrypt and friends need their native build steps).

### 2. Environment

Copy the example files and fill in real values:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Backend needs (`backend/.env`):
```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<publishable/anon key>
SUPABASE_SERVICE_ROLE_KEY=<service-role secret — server only!>
JWT_SECRET=<random>
JWT_REFRESH_SECRET=<a DIFFERENT random>
CLINIC_ID=clinic-001
PORT=4000
FRONTEND_URL=http://localhost:3000
```

Frontend (`frontend/.env.local`) — note these are public, so only the anon key goes here, never the service-role secret:
```
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
NEXT_PUBLIC_CLINIC_ID=clinic-001
```

The real `.env` files are gitignored. Don't commit them, and don't paste secrets anywhere else.

### 3. Database

There's no automatic migration runner (because we don't have a direct DB connection — see above). You apply SQL by hand in the **Supabase SQL editor**:

1. First, the base schema. Generate it from Prisma:
   ```bash
   cd backend
   npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
   ```
   Paste the output into the SQL editor and run it. That creates the 16 core tables.
2. Then run the incremental migrations in `backend/prisma/migrations/`, **in numeric order**: `002` → `008`. Each is a plain `.sql` file you copy/paste. They're idempotent (lots of `IF NOT EXISTS` / `IF EXISTS` guards), so re-running is safe.

> Heads up: `004_emr_fields.sql` and the old `004_visit_attachments.sql` once collided on numbering — the latter was deleted and folded into `005`. If you see a stray `004_visit_attachments`, ignore/delete it.

### 4. Storage buckets

Create these four buckets in Supabase → Storage. The public/private split matters:

| Bucket          | Visibility | Holds                              |
|-----------------|------------|------------------------------------|
| `clinic-assets` | **public** | doctor avatars, clinic logo        |
| `prescriptions` | private    | signed prescription PDFs           |
| `lab-reports`   | private    | uploaded lab reports               |
| `visit-files`   | private    | consultation file attachments (PHI)|

The private ones are served through short-lived signed URLs. If you forget to create one, uploads to it fail with a `Bucket not found` 404 — that's the tell.

### 5. Seed accounts

Seed a patient/doctor/receptionist via SQL (passwords are bcrypt-hashed; the seed SQL uses the `pgcrypto` extension to hash inline). The demo logins are:

| Role          | Login page      | Phone        | Password    |
|---------------|-----------------|--------------|-------------|
| Patient       | `/`             | 9876543210   | patient123  |
| Doctor        | `/auth/doctor`  | 9000000001   | doctor123   |
| Receptionist  | `/auth/admin`   | 9000000003   | recep123    |

### 6. Run it

Two terminals:
```bash
# terminal 1
pnpm dev:backend     # Fastify on :4000 (ts-node-dev, hot-reload)

# terminal 2
pnpm dev:frontend    # Next on :3000
```

> Only ever run **one** frontend dev server. Two `next dev` processes against the same `frontend/` clobber the shared `.next` cache and Tailwind silently stops compiling — pages render as raw unstyled HTML. If that happens: stop everything, `rm -rf frontend/.next`, start one server, hard-refresh.

The backend builds `@cms/shared` from its `dist`, so if you change a shared schema, run `pnpm --filter shared build` and restart the backend (ts-node-dev won't pick up `node_modules` changes on its own).

---

## How auth works

Phone + password login. The backend tries the phone against Patient → Doctor → Receptionist tables (first match wins), bcrypt-compares the password, and on success issues two JWTs:

- **Access token** — 15 min, returned in the response body. The frontend stashes it in a (JS-readable) `__access` cookie and sends it as `Authorization: Bearer ...`.
- **Refresh token** — 7 days, set as an **httpOnly** cookie scoped to `/auth/refresh`.

When the access token 401s, the axios interceptor (`frontend/lib/api.ts`) quietly calls `/auth/refresh`, gets a new access token, and retries the original request. If refresh fails, it bounces you to login.

Routing is role-aware in two places:
- **`frontend/middleware.ts`** guards `/admin`, `/doctor`, `/patient`, `/my` and the auth pages. It decodes the JWT from the cookie and redirects: logged-out users to the right login page, and logged-in users who wander into the wrong portal back to their own home. `/book` is intentionally left open so guests can browse before signing in.
- **Backend** — every protected route uses the `authenticate` preHandler (verifies the JWT *and* checks its `clinicId` matches this deployment) plus `requireRole([...])` where needed.

Sign-out lives in the auth context (`frontend/lib/auth-context.tsx`) as `signOut()`: it revokes the refresh cookie via `/auth/logout`, clears local state + the access cookie, and hard-redirects to the role's login page.

There's also a **demo mode** on the login screens ("click to fill") that mints fake local tokens so you can click through the UI without a backend. Those fake tokens won't pass backend verification, so demo mode is for poking at the frontend only.

---

## Frontend tour

App Router, with route groups. The `(patient)` group doesn't change the URL — it's just there to organize patient-facing pages.

```
app/
├── page.tsx                     /              patient login (the landing page)
├── auth/
│   ├── doctor, admin, login     role-specific logins
│   └── register                 patient signup
├── patient/
│   ├── home                     dashboard with quick-action cards
│   ├── appointments             upcoming/past, cancel
│   └── profile                  edit personal + medical details
├── (patient)/
│   ├── book/[doctorId]          slot picker
│   └── my/{queue,history}       live token tracker, prescription history
├── book                         doctor directory (browse + filter)
├── admin/                       receptionist portal (sidebar layout in layout.tsx)
│   ├── (index) dashboard, queue, walkin, appointments, patients,
│   │   doctors, schedule, billing, reports, audit, settings
└── doctor/
    ├── (index) queue dashboard
    ├── consult/[visitId]        the EMR worksheet — the main event
    ├── calendar, analytics, profile
```

Components worth knowing:
- `components/ui/*` — the design system (Radix + CVA). Themed entirely off CSS variables in `app/globals.css` mapped through `tailwind.config.ts`.
- `components/doctor/EMRWorksheet.tsx` — the consultation screen. Three panels: patient summary + history (left), the clinical worksheet (center), live tools like the consult timer and quick templates (right). **This replaced the older `ConsultationWorksheet.tsx`**, which is still in the tree but unused — don't extend it.
- `components/doctor/MedicineSearch.tsx` + `lib/medicines.ts` — local medicine autocomplete (no external drug API; it's a curated in-repo list with common doses/frequencies).
- `components/admin/TokenQueuePanel.tsx` — the receptionist's live queue with all the state-machine buttons.
- `components/notifications/NotificationBell.tsx` — in-app notifications, currently backed by localStorage.

State is deliberately low-tech: React context for auth, local component state everywhere else, axios for data. No Redux, no react-query.

---

## Backend API reference

Everything is plain JSON over HTTP. `authenticate` = needs a valid bearer token; roles in brackets = `requireRole`.

**Auth** (`routes/auth.ts`) — login/register are rate-limited to 10/min per IP.
```
POST /auth/login            phone + password → { accessToken, user }, sets refresh cookie
POST /auth/register         patient self-signup
POST /auth/refresh          refresh cookie → new access token
POST /auth/logout           clears refresh cookie
GET  /auth/me               [auth] current user claims
```

**Doctors & specializations** (`routes/doctors.ts`)
```
GET  /doctors               public; ?active=true to filter
GET  /doctors/:id           public; includes schedules
POST /doctors               [Receptionist]
PUT  /doctors/:id           [Receptionist]
PUT  /doctors/:id/avatar    [Receptionist] multipart → clinic-assets bucket
GET  /doctors/:id/schedule
PUT  /doctors/:id/schedule  [Receptionist] replace-all weekly schedule
GET  /specializations
POST /specializations       [Receptionist]
```

**Patients** (`routes/patients.ts`)
```
GET    /patients                 [Receptionist|Doctor] ?search= (sanitized)
GET    /patients/lookup          [Receptionist] by ?phone=
GET    /patients/:id             [auth] patient can only read self
PUT    /patients/:id             [auth] patient can only edit self
GET/POST/DELETE /patients/:id/allergies
GET/POST/DELETE /patients/:id/medications
GET    /patients/:id/prescriptions   medical history
```

**Appointments** (`routes/appointments.ts`)
```
GET   /appointments           [auth] role-scoped; ?date / ?startDate&endDate / ?doctorId
GET   /appointments/booked     taken slots for a doctor+date
POST  /appointments           [Patient] book — 409 if the slot is taken
PATCH /appointments/:id/status [Receptionist|Doctor]
```

**Tokens / the live queue** (`routes/tokens.ts`)
```
GET  /tokens/today            [auth] doctor sees own queue with patient data
GET  /tokens/queue            [auth] reception view — all live (non-terminal) tokens
GET  /tokens/my-today         [Patient] my token + how many are ahead
POST /tokens/next             [Receptionist] call next (Arrived first, then Waiting)
POST /tokens/:id/arrive       [Receptionist] mark present
POST /tokens/:id/hold         [Receptionist] pause (stepped away)
POST /tokens/:id/resume       [Receptionist] back to waiting
POST /tokens/:id/skip         [Receptionist]
POST /tokens/:id/recall       [Receptionist] call a skipped one now
POST /tokens/:id/abandon      [Receptionist] left-without-being-seen (terminal)
POST /tokens/:id/start-visit  [Doctor] open/create the consultation
POST /tokens/walkin           [Receptionist] register a walk-in (creates patient if new)
```

**Visits / consultation** (`routes/visits.ts`)
```
GET    /visits                 [Doctor] today's visits
GET    /visits/:id             [auth] patient can only read own visit
GET    /visits/:id/history     past visits for the patient (for "copy last Rx")
GET    /visits/:id/attachments [Doctor|Receptionist] signed URLs
POST   /visits/attachments     [Doctor] multipart → visit-files bucket
DELETE /visits/attachments/:id [Doctor]
```

**Prescriptions** (`routes/prescriptions.ts`)
```
PUT  /prescriptions/draft       [Doctor] auto-saved draft (diagnosis, vitals, drugs, etc.)
POST /prescriptions/finalize    [Doctor] generate PDF, sign, complete the visit + token
GET  /prescriptions/:id/download
```

**Lab reports** (`routes/lab-reports.ts`), **billing** (`routes/billing.ts`), **clinic/branding** (`routes/clinic.ts`), **stats** (`routes/stats.ts`), **audit** (`routes/audit.ts`) round it out — invoices with create/pay, theme + logo, dashboard + analytics numbers, and an action log.

Services under `backend/src/services/`: `storage.service.ts` (Supabase Storage wrapper — upload, public/signed URLs, delete), `prescription-pdf.service.ts` (pdf-lib), `slot-generation.service.ts`, `token-queue.service.ts`. Helpers in `src/lib/`: `date.ts` (`getQueueDate()`), `sanitize.ts` (`sanitizeSearch()`).

---

## The database

Sixteen tables come from the Prisma schema, three more were added later via raw SQL.

**Core (from `schema.prisma`):** `Clinic`, `ClinicTheme`, `Patient`, `Doctor`, `Receptionist`, `Specialization`, `DoctorSchedule`, `Appointment`, `TokenSequence`, `Token`, `Visit`, `Allergy`, `ActiveMedication`, `LabReport`, `PrescriptionDraft`, `Prescription`.

**Added by migrations:** `Invoice` + `AuditLog` (`002`), `VisitAttachment` (`005`).

Rough shape of the important ones:

- **Patient / Doctor / Receptionist** — accounts. `passwordHash` (bcrypt), phone, plus profile fields. Unique on `(clinicId, phone)`.
- **DoctorSchedule** — weekly recurring availability (`dayOfWeek`, start/end time, `slotDurationMinutes`, `isActive`). Slots are generated *from* this on the fly, not stored.
- **Appointment** — a booked slot (`slotStart`, `slotEnd`, `source` = Online/WalkIn, `status`). Unique on `(clinicId, doctorId, slotStart)` — that constraint is what actually prevents double-booking.
- **TokenSequence** — per-day counter so token numbers reset daily.
- **Token** — a patient's place in the day's queue: `tokenNumber`, `queueDate`, `status`, `source`. The status machine is the heart of the reception flow (see below).
- **Visit** — one consultation. Links appointment/patient/doctor/token, has a `version` for optimistic locking and a `status` (Open → Completed).
- **PrescriptionDraft** — autosaved work-in-progress, including an `emrData` JSONB blob for the richer EMR fields (chief complaint, symptoms, vitals, investigations, advice, follow-up).
- **Prescription** — the finalized, signed record. Unique on `visitId` (one Rx per visit).

The migration files, in order, and what each fixed:

| File | What it does |
|------|--------------|
| `002_billing_audit.sql`        | `Invoice` + `AuditLog` tables |
| `003_patient_address.sql`      | adds `address` to Patient |
| `004_emr_fields.sql`           | `emrData` JSONB on PrescriptionDraft; `tokenId`/`version` on Visit |
| `005_visit_attachments.sql`    | `VisitAttachment` table |
| `006_visit_attachment_safety.sql` | guards in case an older attachment table existed |
| `007_fix_id_defaults.sql`      | **the big one** — see gotchas |
| `008_fix_fk_column_types.sql`  | relax some FK columns from `UUID` to `TEXT` |

### Two database quirks you must internalize

**1. IDs aren't all UUIDs.** The seed data uses readable IDs like `doctor-001`, `patient-001`, `clinic-001`. Newer rows get real UUIDs (gen_random_uuid). So ID columns are `TEXT`, and **Zod schemas must not enforce `.uuid()`** on `doctorId`/`patientId` — use `.min(1)`. When you add a table that references a patient or doctor, make those FK columns `TEXT`, not `UUID`, or inserts will blow up on `invalid input syntax for type uuid` (this is exactly what `008` fixed for Invoice and VisitAttachment).

**2. Prisma-generated tables had no DB-level `id` default.** Prisma normally generates UUIDs in *its client*, not the database. Since we insert via the REST API (no Prisma client), every insert was sending a null `id` → `NOT NULL` violation. `007_fix_id_defaults.sql` adds `DEFAULT gen_random_uuid()` to every table that takes runtime inserts. If you create a new table by hand, give `id` a default yourself — the new-table SQL in `002`/`005` already does this with `gen_random_uuid()`.

---

## Key workflows

### Booking
Patient browses `/book`, picks a doctor, lands on `/book/[doctorId]`. The slot picker reads the doctor's `DoctorSchedule`, generates slots client-side, and greys out anything already in `/appointments/booked`. On confirm, `POST /appointments` creates the appointment **and** assigns a token for today. If two people grab the same slot, the `(clinicId, doctorId, slotStart)` unique constraint rejects the loser with a clean `409` — that's our concurrency guard, no row-locking needed.

### The token queue state machine
A token moves through these states:

```
Waiting → Arrived → Called → (visit) → Completed
   │         │         │
   ├─────────┴───── Skipped ──(recall)──► Called
   ├──────────────► OnHold ──(resume)──► Waiting
   └──────────────► Abandoned   (left without being seen — terminal)
```

- Walk-ins start at **Arrived** (they're physically at the desk). Online bookings start at **Waiting** until reception marks them arrived.
- `POST /tokens/next` calls Arrived patients first, then Waiting, and never auto-calls Hold/Skip/Abandon.
- **Abandoned** is deliberate: don't *delete* no-shows (it wrecks the daily analytics) — close them out as LWBS instead.
- Finalizing a prescription completes both the visit *and* its token, so a finished patient drops out of the active queue and the consultation can't be reopened (a completed visit's EMR is read-only — if you ever see "greyed fields you can't edit," you opened a finished visit).

### Consultation → prescription
Doctor hits **Start** on a queued patient → `start-visit` creates a `Visit` → routes to `/doctor/consult/[visitId]`. The EMR worksheet autosaves a draft to `/prescriptions/draft` as you type (debounced). When you **Finalize & Sign**, the backend: checks it isn't already finalized (returns 409 if so), generates the PDF with pdf-lib, uploads it to the private `prescriptions` bucket, writes the `Prescription` row, then marks the visit + token Completed and hands back a signed download URL. Patients see the result under `/my/history`.

### Realtime queue
The live "now serving / you're #N" experience uses **Supabase Realtime** (`postgres_changes` on the `Token` table), not SignalR or websockets we run ourselves. The frontend subscribes with the anon key and reacts to any insert/update on tokens. You need to enable Realtime for the `Token` table in the Supabase dashboard for this to fire.

---

## Security notes

A few things were tightened; worth knowing so you don't regress them:

- `authenticate` rejects tokens whose `clinicId` ≠ this deployment's `CLINIC_ID`.
- Visit reads (`/visits/:id`, `/visits/:id/history`) check ownership — a patient can only read their own; PHI downloads are scoped by clinic.
- Patient search input is run through `sanitizeSearch()` before being interpolated into a PostgREST `.or(...)` filter (otherwise it's injectable).
- Auth routes are rate-limited (`@fastify/rate-limit`, 10/min); login does a dummy bcrypt compare on unknown phones so you can't enumerate accounts by timing.
- Attachments live in a **private** bucket and are handed out as signed URLs, never public links.
- Secrets live only in `.env` — service-role key is backend-only and never shipped to the browser.

Still open / known tradeoffs: the access token sits in a JS-readable cookie (short-lived, refresh is httpOnly), logout is stateless (no server-side token blocklist), and refresh doesn't re-check that the account is still active. Fine for now; flagged for later.

---

## Gotchas (the stuff that'll actually bite you)

- **Port 5432 / Prisma:** don't try to "fix" the missing Prisma DB connection. It's intentional — we go through REST. See the stack section.
- **`@fastify/rate-limit` version:** this project is on Fastify **4**, so you need `@fastify/rate-limit@^9`. v10/v11 want Fastify 5 and the server won't boot (`FST_ERR_PLUGIN_VERSION_MISMATCH`).
- **`queueDate` is a local date, on purpose.** Use `getQueueDate()` from `lib/date.ts` everywhere you read or write a token's `queueDate`. The naive `new Date().toISOString().split('T')[0]` gives the *UTC* date, and `setHours(0,0,0,0).toISOString()` gives the *previous* UTC day in any positive-offset timezone (e.g. IST). Those two disagreeing once made the doctor's queue silently always-empty. Don't reintroduce it.
- **ts-node-dev + rapid edits:** saving a bunch of backend files in quick succession can make ts-node-dev lose the race for port 4000 and die with `EADDRINUSE`. Just restart `pnpm dev:backend`.
- **Two frontends = broken CSS.** Covered above, but it's worth repeating because the symptom (unstyled page) looks scary and isn't a code bug. One `next dev`, clean `.next`, hard refresh.
- **Tailwind theme colors:** `tailwind.config.ts` maps theme colors with `hsl(var(--x))`. The CSS variables hold *bare* HSL numbers (`221 83% 53%`), so the `hsl()` wrapper is mandatory — drop it and `bg-primary` renders transparent (invisible buttons, invisible selected sidebar text). Been there.
- **Adding a table:** update `schema.prisma` for documentation, but you also have to write the actual SQL migration by hand (give `id` a `gen_random_uuid()` default, make patient/doctor FK columns `TEXT`), run it in the Supabase SQL editor, and bump the migration number.

---

## Testing

There's no formal test runner wired up, but there are two pragmatic end-to-end harnesses in `backend/` that hit the live API and check persistence:

- `e2e-full.py` — exercises every portal's workflows + the token state machine + security guards, writes a pass/fail report to `e2e-report.txt`.
- `verify-security.py` — focused checks for the IDOR/injection/rate-limit/enumeration fixes.

Run them with the backend up: `python e2e-full.py`. Handy as a smoke test after any backend change. (They're gitignored along with their output.)

Type-checking is your other safety net — `npx tsc --noEmit` in both `backend/` and `frontend/` before you call something done.

---

## Where to add things

- **New API endpoint:** add it to the relevant file in `backend/src/routes/`, register the route if it's a new file in `server.ts`, and put request/response shapes in `packages/shared` as Zod schemas so both sides share types.
- **New page:** drop it under `app/<portal>/...`. If it's behind auth, the middleware matcher already covers `/admin`, `/doctor`, `/patient`, `/my` — make sure your path falls under one of those or add it.
- **New UI component:** primitives go in `components/ui` (keep them theme-variable driven), feature components in `components/<portal>`.
- **Shared validation/types:** `packages/shared/src/schemas` → rebuild with `pnpm --filter shared build` → restart the backend.

