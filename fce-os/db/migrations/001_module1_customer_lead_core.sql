-- FCE OS Module 1: Customer & Lead Core
-- Run in Supabase SQL editor.

create extension if not exists pgcrypto;

-- Lead stage pipeline enum
create type lead_stage as enum ('New', 'Contacted', 'Quoted', 'Booked', 'Lost');

-- Customer status enum
create type customer_status as enum ('lead', 'customer');

-- Document type enum
create type document_type as enum ('dl', 'insurance');

create table if not exists lead_sources (
  id bigint generated always as identity primary key,
  code text not null unique,
  label text not null,
  requires_referred_by boolean not null default false,
  created_at timestamptz not null default now()
);

insert into lead_sources (code, label, requires_referred_by)
values
  ('Website', 'Website', false),
  ('Instagram', 'Instagram', false),
  ('Referral', 'Referral', true),
  ('Phone', 'Phone', false)
on conflict (code) do update
set label = excluded.label,
    requires_referred_by = excluded.requires_referred_by;

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  address text,
  notes text,
  source_id bigint references lead_sources(id),
  referred_by text,
  status customer_status not null default 'lead',
  requested_vehicle text,
  requested_start_date date,
  requested_end_date date,
  delivery_preference text,
  dl_document_id uuid,
  dl_expiration_date date,
  insurance_document_id uuid,
  insurance_expiration_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_customers_created_at on customers(created_at desc);
create index if not exists idx_customers_phone on customers(phone);
create index if not exists idx_customers_email on customers(email);
create index if not exists idx_customers_source on customers(source_id);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null unique references customers(id) on delete cascade,
  stage lead_stage not null default 'New',
  stage_changed_at timestamptz not null default now(),
  lost_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_leads_stage on leads(stage);
create index if not exists idx_leads_stage_changed_at on leads(stage_changed_at);

create table if not exists lead_stage_history (
  id bigint generated always as identity primary key,
  lead_id uuid not null references leads(id) on delete cascade,
  from_stage lead_stage,
  to_stage lead_stage not null,
  changed_at timestamptz not null default now(),
  changed_by text not null default 'system',
  note text
);

create index if not exists idx_history_lead_time on lead_stage_history(lead_id, changed_at desc);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  doc_type document_type not null,
  storage_bucket text not null,
  storage_path text not null,
  mime_type text,
  file_size_bytes bigint,
  expiration_date date,
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, doc_type)
);

create index if not exists idx_documents_customer on documents(customer_id);
create index if not exists idx_documents_expiration on documents(expiration_date);

alter table customers
  add constraint fk_customers_dl_document
  foreign key (dl_document_id)
  references documents(id)
  on delete set null;

alter table customers
  add constraint fk_customers_insurance_document
  foreign key (insurance_document_id)
  references documents(id)
  on delete set null;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists customers_set_updated_at on customers;
create trigger customers_set_updated_at
before update on customers
for each row execute procedure set_updated_at();

drop trigger if exists leads_set_updated_at on leads;
create trigger leads_set_updated_at
before update on leads
for each row execute procedure set_updated_at();

drop trigger if exists documents_set_updated_at on documents;
create trigger documents_set_updated_at
before update on documents
for each row execute procedure set_updated_at();

-- Use this private bucket for Module 1 docs in Supabase Storage:
-- insert into storage.buckets (id, name, public) values ('fce-os-documents', 'fce-os-documents', false)
-- on conflict (id) do nothing;
