-- Tabela de dispositivos (cada ESP32 cadastrado)
create table if not exists devices (
  id        text primary key,
  name      text not null,
  location  text
);

-- Tabela de leituras (histórico)
create table if not exists readings (
  id          bigint generated always as identity primary key,
  device_id   text not null references devices(id),
  metric      text not null,           -- grandeza, ex: 'soil_moisture'
  value       numeric not null,
  unit        text not null,           -- ex: '%'
  alert       boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Índice para consultas rápidas de "última leitura" e "histórico"
create index if not exists idx_readings_device_metric_time
  on readings (device_id, metric, created_at desc);

-- Cadastra o dispositivo da horta
insert into devices (id, name, location)
values ('horta-01', 'Sensor de umidade da horta', 'Canteiro 1')
on conflict (id) do nothing;

-- Segurança: ativa RLS (Row Level Security)
alter table devices  enable row level security;
alter table readings enable row level security;

-- Permissões para a Edge Function (service_role)
grant usage on schema public to service_role;
grant select, insert, update, delete on table public.devices  to service_role;
grant select, insert, update, delete on table public.readings to service_role;
grant usage, select on all sequences in schema public to service_role;
