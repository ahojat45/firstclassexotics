# First Class Exotics — Handoff Document
**Last Updated:** July 7, 2026
**Status:** Production Live

---

## 🚀 Site Info
- **Live URL:** https://www.firstclassexotics.com
- **Hosting:** Netlify (auto-deploy on push to `main`)
- **Domain Rule:** Netlify primary must remain `www.firstclassexotics.com`; apex 301 redirects to `www` (intentional — never change)
- **Wix:** Active only for email MX records — never touch Wix DNS
- **GitHub Repo:** ahojat45/firstclassexotics (`main`)
- **Analytics:** GA4 `G-E655N33GPP`
- **Brevo:** uses `BREVO_API_KEY` env var

---

## ✅ Current Production State (July 6)

### SEO + Indexing
- `sitemap.xml` contains **33 URLs** and is submitted to GSC.
- Recrawl checkpoint remains **July 9-16**.
- City pages are live for:
  - `exotic-car-rental-irvine.html`
  - `exotic-car-rental-huntington-beach.html`
  - `exotic-car-rental-laguna-beach.html`
  - `exotic-car-rental-newport-beach.html` (includes Corona del Mar section)
- No standalone Corona del Mar page (intentional doorway-risk control).

### CRITICAL URL Pattern Rule
- All city pages must follow: **`exotic-car-rental-{city}.html`** (city name LAST).
- Reversed pattern (example: `irvine-exotic-car-rental.html`) causes 404s and indexing failures.
- Future city pages (Anaheim, Costa Mesa, LA, Beverly Hills) must follow this exact naming pattern.

### Brand Landing Pages Live (full schema)
- `rent-lamborghini-orange-county.html`
- `rent-ferrari-orange-county.html`
- `rent-mclaren-orange-county.html`
- `rent-rolls-royce-orange-county.html`
- `rent-porsche-orange-county.html`
- `rent-g63-orange-county.html`
- `rent-maybach-orange-county.html`
- `rent-range-rover-orange-county.html`

### Blog Publisher v2
- URL: `/blog-publisher.html`
- Password: `FCE2026`
- **Paste Article mode only** for production publishing (do not use AI Draft topic box for final content).
- Multi-image upload writes to: `images/blog/{slug}/`
- Slug-exists guard active (prevents duplicate post/card)
- Sitemap auto-append active on publish
- Accent normalization fix in `buildSlug` is live (`normalize('NFD')` + combining-mark strip)
  - Commit: `1d8e92c`
- Model configuration:
  - `claude-haiku-4-5-20251001`
  - `max_tokens: 1024`

### Live Blog Slugs
- `exotic-cars-coming-orange-county-2026-2027`
- `ferrari-296-speciale`
- `lamborghini-urus-se-2026`
- `mclaren-w1`
- `oc-exotic-car-culture-guide`
- `porsche-911-gt3-rs-40`
- `lamborghini-temerario-the-huracan-era-is-ending`

### Homepage Status
- Elfsight Google Reviews widget live and paid:
  - ID `2c1fd891-04c1-41e3-b373-10268396653b`
- Elfsight Instagram widget live and paid:
  - ID `e190139a-b69b-47b3-9345-57192bd5ce39`
- Homepage `AutoRental` JSON-LD includes `AggregateRating` = **5.0 / 75**

---

## 🧭 Roadmap + Pacing Rules

### City Pages Pacing Rule
- Maximum **2-3 new city pages per week**.
- Next order:
  1. Anaheim + Costa Mesa
  2. Los Angeles + Beverly Hills
  3. Model-level car pages

### Open GSC Item
- Verify which URL is flagged as **Excluded by noindex**.
- If it is `blog-publisher.html`, that is intentional.
- If it is any real indexable page (city/brand/blog/fleet), remove noindex and push immediately.

---

## ⏳ Pending Tasks

### Completed July 6, 2026
- Fleet update DONE and verified live (commits `7c5c69f`, `20a7111`): Chevrolet Corvette C8 Z51 (3LT, White) and 2025 Cadillac Escalade ESV (Black) added to `index.html`.
- Included fleet cards with 5-image Drive lightboxes each, standard spec-line format, and booking form dropdown entries (Corvette under Chevrolet optgroup, new Cadillac optgroup for the Escalade).
- Fleet page task is CLOSED.

### Still Pending (carry forward)
- Verify GSC "Excluded by noindex" page is `blog-publisher.html` (intentional). If any other page, remove the noindex.
- GSC recrawl checkpoint July 9-16: indexed count expected to climb toward 33.
- Next city landing page batch (max 2-3/week): Anaheim + Costa Mesa, then LA + Beverly Hills, then model-level car pages.

---

## 🧩 New Project — FCE OS (Internal First)

Goal:
- Build FCE OS as First Class Exotics' internal broker-rental management software first.
- Run FCE operations on it for 2-3 months.
- Then productize for OC/LA fleet-owner network.

### Updated Module Order (supersedes previous scope order)
The CRM/customer core is now Module 1, not Module 2. Rationale: every other feature (agreements, e-sign, documents, deposits) hangs off the customer record, and the existing Netlify booking form can feed leads into the CRM from day one.

### Module 1 — Customer & Lead Core
- Customer records (contact info, notes, rental history)
- Lead pipeline with stages (New -> Contacted -> Quoted -> Booked -> Lost)
- Lead source tracking (Website, Instagram, Referral, Phone)
- Automatic lead capture from the existing `index.html` booking form via Netlify Function
- DL + insurance card uploads on the customer record with expiration-date tracking

### Module 2 — Rental Operations
- Digital rental agreements (customer fills on phone)
- E-signature
- Condition photos at pickup/return
- Deposit tracking (hold -> release)
- Signed agreement auto-converts lead -> customer

### Module 3 — Revenue Layer
- Automated follow-ups
- 90-day win-backs
- Repeat-customer tiers flagged for chauffeur/corporate upsells

### Infrastructure Note
- Site is static HTML on Netlify, so FCE OS will use Netlify Functions + a hosted database.
- Recommend evaluating Netlify-friendly options like Neon/Supabase Postgres in the build session.
- Keep FCE OS code organized so it can be separated from the marketing site later.

### Module 1 Build Status (July 6, 2026)
- Module 1 (Customer & Lead Core) is now implemented in-repo under isolated paths:
  - Frontend: `fce-os/index.html`, `fce-os/styles.css`, `fce-os/app.js`
  - DB migration: `fce-os/db/migrations/001_module1_customer_lead_core.sql`
  - Setup runbook: `fce-os/SETUP.md`
  - Backend functions: `netlify/functions/fce-os-*.js` plus `netlify/functions/submission-created.js`
- No marketing page UX changes were made.

### Module 1 Schema Summary
- `lead_sources`: Website, Instagram, Referral, Phone (+ referral requirement flag)
- `customers`: contact info, notes, source, status (`lead`/`customer`), requested vehicle/dates/delivery, DL + insurance pointers/expiration fields
- `leads`: one pipeline record per customer, stage enum (`New`, `Contacted`, `Quoted`, `Booked`, `Lost`), stage timestamp
- `lead_stage_history`: from/to stage audit trail with timestamps and actor
- `documents`: DL/insurance docs tied to customer with private storage path + expiration date

### Module 1 Features Implemented
- Password-gated CRM dashboard with server-side auth cookie session (separate from blog password)
- Pipeline board with 5 stages and lead cards showing source, requested vehicle/dates, and days-in-stage
- Stage updates via drag-and-drop and per-card stage picker
- Manual lead quick-add for Phone/Instagram/Referral (includes referred-by)
- Customer list + search (name/phone/email)
- Customer detail editor (contact, notes, requested rental fields)
- Document uploads for DL and insurance with expiration date tracking
- Expiration alert panel for expired or <=30 day DL/insurance docs
- Website booking form intake via `submission-created` function to auto-create Website leads in `New`

### FCE OS Dashboard URL + Auth
- URL: `/fce-os/index.html`
- Auth model:
  - Login posts to `/.netlify/functions/fce-os-auth-login`
  - Password env var: `FCE_OS_DASHBOARD_PASSWORD` (new password; never use `FCE2026`)
  - Session cookie signed with `FCE_OS_SESSION_SECRET` (HTTP-only, SameSite=Lax)
  - Protected API functions require valid session cookie

### Required Env Vars (Netlify)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY` (reserved for later client-side module work)
- `SUPABASE_STORAGE_BUCKET` (set to `fce-os-documents`)
- `FCE_OS_DASHBOARD_PASSWORD`
- `FCE_OS_SESSION_SECRET`

### External Setup Required Before Live E2E
- Create Supabase project + private storage bucket `fce-os-documents`
- Run migration: `fce-os/db/migrations/001_module1_customer_lead_core.sql`
- Add env vars above in Netlify
- Detailed step-by-step is in `fce-os/SETUP.md`

### Module 2 Dependencies from Module 1
- Reuse `customers` as the canonical record for agreement generation
- Reuse `leads` + `lead_stage_history` for agreement-triggered lifecycle transitions
- Extend `documents` for agreement PDFs, condition photos, and signed artifacts
- Keep `Booked` transition as the conversion anchor for rental operations workflows

---

## 🔧 Key Files
- `netlify.toml` — redirects + Netlify behavior
- `sitemap.xml` — 33 live URLs
- `index.html` — homepage + fleet cards/lightbox
- `blog.html` — blog index
- `blog-publisher.html` — publisher v2 UI (`FCE2026`)
- `netlify/functions/blog-publisher.js` — generate/publish function

## 🔐 Netlify Env Vars (already set; do not change)
- `ANTHROPIC_API_KEY`
- `GITHUB_TOKEN`
- `BREVO_API_KEY`

---

## ⚠️ Non-Negotiables
- Never touch Wix DNS/MX configuration.
- Never change apex->www canonical redirect behavior.
- All deploys happen via push to `main`.


---

## ✅ FCE OS Module 1 — VERIFIED COMPLETE (July 7, 2026)

End-to-end intake verified live on production: booking form → `submission-created` → customer + lead created in Supabase, lead lands in `New` stage and renders on the /fce-os pipeline board. Test records ("FCE OS TEST2 IGNORE") intentionally left in DB; safe to delete from the CRM.

### Supabase project (source of truth)
- Project ref: `jboscqynotjqrsqdxuwx` (20 chars — note the `q` before `dxuwx`)
- URL: `https://jboscqynotjqrsqdxuwx.supabase.co`
- Root cause of the July 6–7 "NXDOMAIN blocker": Netlify `SUPABASE_URL` contained a 19-char typo (`jboscqynotjqrsdxuwx`, missing the `q`). Corrected in Netlify July 7 and redeployed. Any 19-char version of the ref found in old notes or logs is WRONG — do not reuse it.

### DB grants rule (CRITICAL for Module 2 migrations)
- This project has "expose new tables" behavior disabled: newly created tables receive NO select/insert/update/delete grants for ANY API role — including `service_role`. Symptom: PostgREST 403 `permission denied for table X`.
- Fix applied July 7 for Module 1 tables:
  - `grant select, insert, update, delete on table customers, leads, lead_sources, lead_stage_history, documents to service_role;`
  - `grant usage, select on all sequences in schema public to service_role;`
- EVERY new Module 2 table must include the same grant to `service_role` in its migration. Keep `anon`/`authenticated` without grants (all access is server-side via Netlify Functions).

### External setup status
- All items under "External Setup Required Before Live E2E" are COMPLETE: Supabase project created, migration 001 run, private bucket `fce-os-documents` created, all env vars set in Netlify (and `SUPABASE_URL` corrected).
- Module 2 (Rental Operations) is unblocked and can start immediately.
