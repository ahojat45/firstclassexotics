-- FCE OS Module 2 Phase A.5: Rental terms + signed copy delivery
-- Run manually in Supabase SQL editor before deploying code that depends on these columns.

alter table agreements
  add column if not exists daily_rate_cents integer,
  add column if not exists total_price_cents integer,
  add column if not exists miles_included_per_day integer,
  add column if not exists mileage_overage_rate_cents integer,
  add column if not exists fuel_terms text,
  add column if not exists pickup_time timestamptz,
  add column if not exists return_time timestamptz,
  add column if not exists additional_driver_names text,
  add column if not exists signed_pdf_storage_bucket text,
  add column if not exists signed_pdf_storage_path text,
  add column if not exists signed_pdf_generated_at timestamptz,
  add column if not exists signed_pdf_error text,
  add column if not exists signed_email_sent_at timestamptz,
  add column if not exists signed_email_error text,
  add column if not exists manual_resend_required boolean not null default false;

grant select, insert, update, delete on table agreements to service_role;
