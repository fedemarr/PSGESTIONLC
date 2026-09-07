-- ============================================================
-- Tesorería Los Cedros Rugby — Esquema base
-- Correr en el SQL Editor de Supabase (o via supabase db push).
-- ============================================================

-- ---------- ENUMS ----------
do $$ begin
  create type grupo_3t     as enum ('Sabores express','Mc Donalds','Whisky');
exception when duplicate_object then null; end $$;
do $$ begin
  create type partido_tipo as enum ('Local','Visitante');
exception when duplicate_object then null; end $$;
do $$ begin
  create type forma_pago   as enum ('MP','Efectivo');
exception when duplicate_object then null; end $$;
do $$ begin
  create type presencia    as enum ('jugo','nojugo','ausente');
exception when duplicate_object then null; end $$;
do $$ begin
  create type mov_tipo     as enum ('Ingreso','Egreso');
exception when duplicate_object then null; end $$;
do $$ begin
  create type gf_estado    as enum ('Pagado','Pendiente','Parcial');
exception when duplicate_object then null; end $$;
do $$ begin
  create type gf_categoria as enum ('lavanderia','entretiempo','extra');
exception when duplicate_object then null; end $$;

-- ---------- CONFIG (singleton) ----------
create table if not exists config (
  id                int primary key default 1,
  monto_global      numeric not null default 20000,
  temporada_activa  int     not null default 2026,
  saldo_inicial_mp        numeric not null default 0,
  saldo_inicial_efectivo  numeric not null default 0,
  constraint config_singleton check (id = 1)
);
insert into config (id) values (1) on conflict (id) do nothing;

-- ---------- JUGADORES ----------
create table if not exists jugadores (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  apodo      text not null default '',
  camada     int,
  grupo      grupo_3t not null,
  posicion   text not null default '',
  activo     boolean not null default true,
  obs        text not null default '',
  temporada  int not null default 2026,
  created_at timestamptz not null default now(),
  unique (nombre, temporada)
);
create index if not exists jugadores_grupo_idx on jugadores (temporada, grupo);

-- ---------- PARTIDOS ----------
create table if not exists partidos (
  id         uuid primary key default gen_random_uuid(),
  fecha      date not null,
  rival      text not null,
  tipo       partido_tipo not null,
  monto_3t   numeric,                 -- null => usa config.monto_global
  jugado     boolean not null default false,
  obs        text not null default '',
  temporada  int not null default 2026,
  created_at timestamptz not null default now()
);
create index if not exists partidos_fecha_idx on partidos (temporada, fecha);

-- ---------- COBROS 3T ----------
create table if not exists cobros (
  id         uuid primary key default gen_random_uuid(),
  jugador_id uuid not null references jugadores(id) on delete cascade,
  partido_id uuid not null references partidos(id) on delete cascade,
  presencia  presencia not null default 'jugo',
  monto      numeric not null default 0,
  forma      forma_pago not null default 'MP',
  es_compra  boolean not null default false,
  obs        text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (jugador_id, partido_id)
);
create index if not exists cobros_partido_idx on cobros (partido_id);

-- ---------- GASTOS 3T ----------
create table if not exists gastos_3t (
  id                 uuid primary key default gen_random_uuid(),
  partido_id         uuid not null references partidos(id) on delete cascade,
  grupo_turno        grupo_3t,
  comprador          text not null,
  es_jugador_plantel boolean not null default false,
  grupo_comprador    grupo_3t,
  concepto           text not null default '',
  monto_gastado      numeric not null default 0,
  monto_pagado       numeric not null default 0,
  forma_pago         forma_pago not null default 'MP',
  obs                text not null default '',
  created_at         timestamptz not null default now()
);
create index if not exists gastos_3t_partido_idx on gastos_3t (partido_id);

-- ---------- GASTOS FIJOS (lavandería / entretiempo / extras) ----------
create table if not exists gastos_fijos (
  id                 uuid primary key default gen_random_uuid(),
  partido_id         uuid not null references partidos(id) on delete cascade,
  categoria          gf_categoria not null,
  cantidad_camisetas int,            -- solo lavandería
  precio_unitario    numeric,        -- solo lavandería
  detalle            text,           -- entretiempo (texto libre de ítems)
  concepto           text,           -- extra (texto libre)
  total              numeric not null default 0,
  pagado_a           text not null default '',
  fecha_pago         date,
  forma              forma_pago not null default 'MP',
  estado             gf_estado not null default 'Pagado',
  obs                text not null default '',
  created_at         timestamptz not null default now()
);
create index if not exists gastos_fijos_partido_idx on gastos_fijos (categoria, partido_id);

-- ---------- CAJA ----------
create table if not exists caja_movimientos (
  id            uuid primary key default gen_random_uuid(),
  fecha         date not null,
  concepto      text not null,
  origen        text not null default 'Manual',  -- Cobro 3T | Gasto 3T | Lavanderia | Entretiempo | Extra | Manual | Ajuste
  tipo          mov_tipo not null,
  fondo         forma_pago not null,             -- MP | Efectivo
  monto         numeric not null,
  referencia_id uuid,                            -- id del cobro/gasto que lo generó (si aplica)
  temporada     int not null default 2026,
  created_at    timestamptz not null default now()
);
create index if not exists caja_fecha_idx on caja_movimientos (temporada, fecha desc);
create index if not exists caja_ref_idx   on caja_movimientos (referencia_id);

-- ---------- updated_at trigger para cobros ----------
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end $$ language plpgsql;
drop trigger if exists cobros_updated_at on cobros;
create trigger cobros_updated_at before update on cobros
  for each row execute function set_updated_at();

-- ============================================================
-- RLS: acceso solo a usuarios autenticados (login único de Lautaro).
-- Si preferís sin login por ahora, cambiá 'authenticated' por 'anon, authenticated'.
-- ============================================================
alter table config            enable row level security;
alter table jugadores         enable row level security;
alter table partidos          enable row level security;
alter table cobros            enable row level security;
alter table gastos_3t         enable row level security;
alter table gastos_fijos      enable row level security;
alter table caja_movimientos  enable row level security;

do $$
declare t text;
begin
  foreach t in array array['config','jugadores','partidos','cobros','gastos_3t','gastos_fijos','caja_movimientos']
  loop
    execute format('drop policy if exists %I_rw on %I', t, t);
    execute format(
      'create policy %I_rw on %I for all to authenticated using (true) with check (true)', t, t);
  end loop;
end $$;
