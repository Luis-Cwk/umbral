-- Umbral: schema + seed. Pegar entero en SQL Editor de Supabase y Run.

create extension if not exists pgcrypto;

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  venue text,
  starts_at timestamptz,
  price_cents integer not null default 1,
  currency text not null default 'MXN',
  status text not null default 'open' check (status in ('open', 'closed')),
  public_token text not null unique,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists guests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  phone text,
  status text not null default 'invited'
    check (status in ('invited', 'charge_issued', 'paid', 'admitted', 'expired', 'late', 'duplicate', 'canceled')),
  created_at timestamptz not null default now()
);

create table if not exists charges (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  guest_id uuid not null references guests(id) on delete cascade,
  provider_qr_id text not null unique,
  qr_string text,
  qr_image text,
  amount_cents integer not null,
  concept text not null,
  num_ref text not null,
  status text not null default 'issued'
    check (status in ('issued', 'paid', 'expired', 'late', 'canceled')),
  expires_at timestamptz not null,
  paid_at timestamptz,
  transaction_id text unique,
  created_at timestamptz not null default now()
);

create table if not exists webhook_events (
  id uuid primary key default gen_random_uuid(),
  webhook_id text not null unique,
  event_type text not null,
  transaction_id text,
  payload jsonb not null,
  result text not null,
  processed_at timestamptz not null default now()
);

create index if not exists idx_guests_event on guests(event_id);
create index if not exists idx_charges_guest on charges(guest_id);
create index if not exists idx_charges_event on charges(event_id);
create index if not exists idx_charges_provider_qr on charges(provider_qr_id);
create index if not exists idx_charges_transaction on charges(transaction_id);

-- === seed ===
insert into events (
  id, name, venue, starts_at, price_cents, currency, status, public_token, is_demo
) values (
  '00000000-0000-0000-0000-000000000001',
  'Función demo Umbral',
  'Foro CDMX',
  '2026-11-15 13:00:00-06',
  1,
  'MXN',
  'open',
  'demo-token',
  true
) on conflict (id) do update set
  name = excluded.name,
  venue = excluded.venue,
  starts_at = excluded.starts_at,
  price_cents = excluded.price_cents,
  public_token = excluded.public_token,
  is_demo = excluded.is_demo;

insert into guests (id, event_id, name, status) values
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Ana', 'invited'),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Luis', 'invited'),
  ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'Sol', 'invited'),
  ('00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', 'Mar', 'invited'),
  ('00000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001', 'Noa', 'invited')
on conflict (id) do update set
  name = excluded.name,
  event_id = excluded.event_id,
  status = excluded.status;
