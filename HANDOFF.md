# First Class Exotics — Handoff Document
**Last Updated:** July 9, 2026
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
- Fleet addition is complete across landing pages:
  - `index.html` already updated in prior session (Corvette C8 3LT Z51 + Escalade ESV + booking dropdown additions)
  - `rent-mclaren-orange-county.html` now includes 2019 McLaren 570S (Miami Blue), 2025 Artura Spider, and 2024 Artura Coupe cards
  - `rent-g63-orange-county.html` now includes Mercedes-Benz Brabus 800 G-Wagon card (authentic conversion copy)
- Recrawl checkpoint remains **July 9-16**.
  - `exotic-car-rental-irvine.html`
  - `exotic-car-rental-huntington-beach.html`
  - `exotic-car-rental-laguna-beach.html`
  - `exotic-car-rental-newport-beach.html` (includes Corona del Mar section)
- No standalone Corona del Mar page (intentional doorway-risk control).

- Future city pages (Anaheim, Costa Mesa, LA, Beverly Hills) must follow this exact naming pattern.

- `rent-porsche-orange-county.html`
- `rent-g63-orange-county.html`

- URL: `/blog-publisher.html`
- Password: `FCE2026`
- **Paste Article mode only** for production publishing (do not use AI Draft topic box for final content).
- Multi-image upload writes to: `images/blog/{slug}/`
- Slug-exists guard active (prevents duplicate post/card)
- Sitemap auto-append active on publish
  - Commit: `1d8e92c`
- Model configuration:
  - `claude-haiku-4-5-20251001`
  - `max_tokens: 1024`

- `ferrari-296-speciale`
- `lamborghini-urus-se-2026`
### Homepage Status
  - ID `2c1fd891-04c1-41e3-b373-10268396653b`
  - ID `e190139a-b69b-47b3-9345-57192bd5ce39`
- Homepage `AutoRental` JSON-LD includes `AggregateRating` = **5.0 / 75**
## 🧭 Roadmap + Pacing Rules

- Next order:
  1. Anaheim + Costa Mesa
  3. Model-level car pages

- If it is `blog-publisher.html`, that is intentional.

---


### Completed July 6, 2026
- Fleet page task is CLOSED.

### Still Pending (carry forward)
- Verify GSC "Excluded by noindex" page is `blog-publisher.html` (intentional). If any other page, remove the noindex.
- Next city landing page batch (max 2-3/week): Anaheim + Costa Mesa, then LA + Beverly Hills, then model-level car pages.

- Run FCE operations on it for 2-3 months.
- Then productize for OC/LA fleet-owner network.

### Updated Module Order (supersedes previous scope order)
- Customer records (contact info, notes, rental history)
- Lead pipeline with stages (New -> Contacted -> Quoted -> Booked -> Lost)
### Module 2 — Rental Operations
- Digital rental agreements (customer fills on phone)
- Condition photos at pickup/return
- Deposit tracking (hold -> release)
- Signed agreement auto-converts lead -> customer

### Module 3 — Revenue Layer
- Automated follow-ups
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
- Infrastructure is complete: Supabase project `fce-os` created, migration run, all 5 tables verified, private bucket `fce-os-documents` created, all 6 Netlify env vars set, and the site redeployed.
- Three fix commits are deployed on `main`: `4866522` (auto-seed lead sources), `dd491b6` (expose intake errors), `e45db08` (Supabase fetch diagnostics).
- Remaining blocker is timing-only: rerun the booking submission test after Netlify's DNS cache expires.
- Retest window: about 30-60 minutes from the last failed booking submission.
- Detailed step-by-step is in `fce-os/SETUP.md`.

### Current End-to-End State
- Browser-side DNS resolves the Supabase hostname.
- The deployed Netlify function still hits a cached NXDOMAIN on the Supabase hostname from its resolver path.
- No code or config changes are needed at this point.
- Next action is a single booking submission retest after the DNS cache window.

### Exact Retest Steps
1. Wait until at least 30-60 minutes have elapsed since the last failed booking submission.
2. Open the live booking form at `https://www.firstclassexotics.com/#booking`.
3. Submit one fresh test booking using the normal site form, or run this exact command once if testing from terminal:

```bash
curl -s -X POST https://www.firstclassexotics.com/.netlify/functions/submission-created \
  -H 'Content-Type: application/json' \
  --data '{"form_name":"booking","payload":{"data":{"first-name":"Test","last-name":"Lead","phone":"+1 949 555 0101","email":"test@example.com","vehicle":"Ferrari F8 Spider","start-date":"2026-07-10","end-date":"2026-07-12","delivery":"Delivery - Orange County","message":"End-to-end verification test"}}}'
```

4. Confirm the function returns success with no Supabase DNS error.
5. Open `https://www.firstclassexotics.com/fce-os/index.html` and sign in with the FCE OS dashboard password from Netlify env vars.
6. Verify the new lead appears in the CRM pipeline under `New` with source `Website`.
7. If the lead appears, the Module 1 booking intake flow is complete.

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

---

## FCE OS Module 2 - Phase A (Shipped July 7, 2026)

Scope shipped in isolated FCE OS paths only (`fce-os/*`, `netlify/functions/fce-os-*`).

## ✅ July 9, 2026 Session

### Fleet — 2 Mercedes added (LIVE & verified)
- **2026 Mercedes-Maybach GLS 600 (White)** — 550 HP / 4.8s / 4.0L Biturbo V8 + EQ Boost. Drive folder `1zhJLRcPh_m86EkJ79VvAOXQ2Zt43phD9` (5 photos). Front-exterior hero ID: `13jzLAqtSgjd5NKi-sTd1eFKhnWZZeatL`.
- **Mercedes-AMG G63 (Silver, no year)** — 577 HP / 4.5s / 4.0L Biturbo V8. Drive folder `1h_4Kpf39lcG_UKl8_yHZuLom5ZPgqoOS` (3 photos). Front-exterior hero ID: `1cxrM_meWONuvfq7hTjErrZyidgwXo-g1`.
- Added to `index.html`, `rent-maybach-orange-county.html`, `rent-g63-orange-county.html`, and the Mercedes-Benz booking dropdown, each with a full click-through Drive gallery.
- Commits: `c90c5b3` (add) + `42c10ab` (hero reorder). **RULE: the card hero image must be the front-facing EXTERIOR shot, not an interior — verify before shipping.**

### Brevo 15%-off subscribe popup — FIXED (was silently failing ~30 days)
- Root cause was NOT code: Brevo Security → Authorized IPs had "Blocking unauthorized IP addresses" ON for API keys, rejecting Netlify's serverless IPs. Fixed in the Brevo account (Deactivate for API keys).
- `netlify/functions/subscribe.js` now requires name+email+phone, writes `CELL_PHONE` + `SMS_CONSENT` ('yes'/'no') to Brevo list `[2]` via `BREVO_API_KEY`, and does NOT use Brevo's gated `SMS` attribute. Popup shows success only on `r.ok`. Commits `e6c8623` + `c6070fe`. Verified live.
- Two custom Brevo contact attributes were created: `CELL_PHONE` (text), `SMS_CONSENT` (text).
- To actually send texts later: needs Brevo SMS credits (currently 0) or export consented `CELL_PHONE` numbers to an SMS tool. TCPA: only text contacts with `SMS_CONSENT='yes'`.
- The same IP fix very likely revived the Phase A.5 customer signing-agreement emails (they fail silently by design) — run one live signing test to confirm.

### Open items (carryover)
- Attorney review of Rental Agreement v2 (launch bottleneck for FCE OS signing flow) — still pending; no legal text goes live until then.
- Live A.5 signing test to confirm signed-PDF email now delivers.
- SEO: indexing is NOT the bottleneck and being "indexed" ≠ ranking #1. The next real lever for #1 is the **Google Business Profile / Maps local pack + reviews (at 76)**, not the GSC Pages report. GSC recrawl window is July 9–16.

### DB Migration
- Added `fce-os/db/migrations/002_module2_agreements_core.sql` with `agreements` table:
  - Tokenized public signing flow (`token_hash`, `token_expires_at`)
  - Agreement lifecycle states (`draft`, `sent`, `viewed`, `signed`, `voided`)
  - Prefill snapshot fields from customer/lead
  - Signature metadata (`signature_typed_name`, storage path, signed timestamp, IP, user-agent)
  - Deposit tracking fields (`deposit_amount_cents`, `deposit_status`, hold/release timestamps)
- Migration includes required explicit grant:
  - `grant select, insert, update, delete on table agreements to service_role;`

### New Functions
- `netlify/functions/fce-os-agreements-create.js`
  - Auth-protected dashboard API to create agreement from customer/lead and return tokenized mobile link.
- `netlify/functions/fce-os-agreements-get-public.js`
  - Public token endpoint for customer mobile agreement view.
- `netlify/functions/fce-os-agreements-sign-public.js`
  - Public token endpoint to capture typed-name + drawn signature artifact to `fce-os-documents`.
  - On success: auto-converts lifecycle via existing Module 1 primitives:
    - lead -> `Booked`
    - customer status `lead` -> `customer`
    - stage history entry recorded
  - Guardrails:
    - rejects expired links
    - rejects voided agreements
    - rejects already-signed agreements
    - idempotent by design (second submit never overwrites signed record)

### Dashboard + Public UI
- Dashboard integration added in `fce-os/index.html` + `fce-os/app.js`:
  - Create mobile signing link from customer detail panel
  - View latest agreement status summary
- Added public signer page: `fce-os/agreement.html` + `fce-os/agreement.js`
  - Mobile-friendly agreement review
  - Typed name + canvas signature capture
  - `noindex` meta tag present on purpose
  - Not listed in `sitemap.xml` on purpose

### E2E Verification
- Phase A E2E was verified live on July 7, 2026.

## FCE OS Module 2 - Phase A.5 (Shipped July 7, 2026)

### DB Migration
- Added `fce-os/db/migrations/003_rental_terms.sql` to extend `agreements` with:
  - `daily_rate_cents`, `total_price_cents`
  - `miles_included_per_day`, `mileage_overage_rate_cents`
  - `fuel_terms`, `pickup_time`, `return_time`, `additional_driver_names`
  - signed-copy delivery tracking fields (`signed_pdf_*`, `signed_email_*`, `manual_resend_required`)
- Migration includes required explicit grant at the end:
  - `grant select, insert, update, delete on table agreements to service_role;`

### Migration application rule (CRITICAL)
- Ali/Claude must run migration SQL manually in Supabase SQL Editor before deploy goes live.
- Never assume migrations are auto-applied by deploy.
- If migration is missing, dashboard/functions can 500 in production (this happened July 7 when migration 002 was not applied).

### Phase A.5 behavior
- Agreement creation now requires daily rate, total price, miles/day, deposit, pickup datetime, and return datetime before a signing link can be created.
- Signing page renders a Rental Terms table plus config-driven numbered sections with required initials checkboxes.
- Signing is fail-open for customer UX:
  - Signature + stage automation commit first.
  - Signed PDF generation and Brevo send run after commit.
  - If PDF/email fails, signing still succeeds and agreement is flagged for manual resend in dashboard.
- Contract-language slot is ready for attorney-approved text replacement; placeholder language remains in place until legal approval.

## Next Up (Phase B)
- Pickup/return condition photo workflow (document types + upload UI)
- Deposit hold/release operations UI and status controls
- Agreement artifact export flow (PDF/receipt style output)
- Dashboard filter for `manual_resend_required` agreements so ops can triage failed PDF/email deliveries faster
