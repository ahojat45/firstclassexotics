-- FCE OS Module 2 Phase A: Agreements core
-- Run after 001_module1_customer_lead_core.sql

create table if not exists agreements (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  status text not null default 'sent' check (status in ('draft', 'sent', 'viewed', 'signed', 'voided')),
  token_hash text not null unique,
  token_expires_at timestamptz not null,
  sent_at timestamptz,
  viewed_at timestamptz,
  signed_at timestamptz,
  voided_at timestamptz,
  void_reason text,
  renter_full_name text not null,
  renter_email text,
  renter_phone text,
  rental_vehicle text,
  rental_start_date date,
  rental_end_date date,
  delivery_preference text,
  agreement_terms text,
  deposit_amount_cents integer not null default 0,
  deposit_status text not null default 'none' check (deposit_status in ('none', 'hold_pending', 'held', 'released')),
  deposit_held_at timestamptz,
  deposit_released_at timestamptz,
  deposit_notes text,
  signature_typed_name text,
  signature_storage_bucket text,
  signature_storage_path text,
  signed_ip text,
  signed_user_agent text,
  created_by text not null default 'dashboard',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agreements_dates_valid check (
    rental_start_date is null
    or rental_end_date is null
    or rental_end_date >= rental_start_date
  )
);

create index if not exists idx_agreements_customer_created on agreements(customer_id, created_at desc);
create index if not exists idx_agreements_lead on agreements(lead_id);
create index if not exists idx_agreements_status on agreements(status);
create index if not exists idx_agreements_token_hash on agreements(token_hash);
create index if not exists idx_agreements_token_exp on agreements(token_expires_at);

drop trigger if exists agreements_set_updated_at on agreements;
create trigger agreements_set_updated_at
before update on agreements
for each row execute procedure set_updated_at();

grant select, insert, update, delete on table agreements to service_role;