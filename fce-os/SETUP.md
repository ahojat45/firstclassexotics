# FCE OS Module 1 Setup (Supabase + Netlify)

This module uses Supabase for Postgres + Storage and Netlify Functions for backend APIs.

## 1) Create Supabase Project
1. Create a Supabase account and a new project (region near California).
2. Save these values from Project Settings -> API:
   - `SUPABASE_URL` (Project URL)
   - `SUPABASE_ANON_KEY` (public key; not used by functions yet, but keep for future client-side usage)
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only key for Netlify Functions)

## 2) Run DB Migration
1. Open Supabase SQL Editor.
2. Run [fce-os/db/migrations/001_module1_customer_lead_core.sql](db/migrations/001_module1_customer_lead_core.sql).
3. Confirm tables exist:
   - `lead_sources`
   - `customers`
   - `leads`
   - `lead_stage_history`
   - `documents`

## 3) Create Storage Bucket
1. Supabase -> Storage -> Create bucket.
2. Name: `fce-os-documents`
3. Set bucket to **Private**.

## 4) Configure Netlify Env Vars
Set these in Netlify Site Settings -> Environment Variables:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `SUPABASE_STORAGE_BUCKET` = `fce-os-documents`
- `FCE_OS_DASHBOARD_PASSWORD` = (new admin password, not `FCE2026`)
- `FCE_OS_SESSION_SECRET` = long random string (at least 32 chars)

## 5) Deploy and Access
1. Push to `main`.
2. Open dashboard at `/fce-os/index.html`.
3. Login with `FCE_OS_DASHBOARD_PASSWORD`.

## 6) Netlify Forms Intake Wiring
`netlify/functions/submission-created.js` listens for Netlify form submission events.
- For form `booking`, it auto-creates a lead in stage `New` with source `Website`.
- Existing homepage booking UX is unchanged.

## Quick Smoke Test Checklist
1. Login succeeds and dashboard loads.
2. Add manual lead from Quick Add form.
3. Move lead stages via drag and stage picker.
4. Search customers and open detail view.
5. Upload DL + insurance doc with expiration dates.
6. Submit live booking form; verify new lead appears in `New` with source `Website`.
