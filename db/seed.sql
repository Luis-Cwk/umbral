insert into events (
  id,
  name,
  venue,
  starts_at,
  price_cents,
  currency,
  status,
  public_token,
  is_demo
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
