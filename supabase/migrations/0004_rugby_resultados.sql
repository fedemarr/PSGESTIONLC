-- ============================================================
-- 0004 — Resultados deportivos: formaciones, acciones, ajustes
-- Correr DESPUÉS de 0003. Idempotente.
-- ============================================================

do $$ begin
  create type rugby_categoria as enum ('Primera','Intermedia','Pre-intermedia');
exception when duplicate_object then null; end $$;
do $$ begin
  create type rugby_equipo as enum ('cedros','rival');
exception when duplicate_object then null; end $$;
do $$ begin
  create type rugby_accion_tipo as enum ('try','conv','penal','am','rj');
exception when duplicate_object then null; end $$;

-- ---------- FORMACIONES ----------
-- Una fila por jugador convocado a un partido+categoría. puesto 1-15 = titular
-- en ese puesto; puesto null = suplente (puede haber varios).
create table if not exists formaciones (
  id         uuid primary key default gen_random_uuid(),
  partido_id uuid not null references partidos(id) on delete cascade,
  categoria  rugby_categoria not null,
  jugador_id uuid not null references jugadores(id) on delete cascade,
  puesto     int check (puesto is null or (puesto >= 1 and puesto <= 15)),
  capitan    boolean not null default false,
  created_at timestamptz not null default now(),
  unique (partido_id, categoria, jugador_id)
);
create unique index if not exists formaciones_puesto_uk
  on formaciones (partido_id, categoria, puesto) where puesto is not null;
create index if not exists formaciones_jugador_idx on formaciones (jugador_id);

-- ---------- ACCIONES DE PARTIDO ----------
create table if not exists acciones_partido (
  id         uuid primary key default gen_random_uuid(),
  partido_id uuid not null references partidos(id) on delete cascade,
  categoria  rugby_categoria not null,
  equipo     rugby_equipo not null,
  tipo       rugby_accion_tipo not null,
  jugador_id uuid references jugadores(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists acciones_partido_pc_idx on acciones_partido (partido_id, categoria);
create index if not exists acciones_partido_jugador_idx on acciones_partido (jugador_id);

-- ---------- AJUSTE MANUAL DE RESULTADO ----------
create table if not exists ajustes_resultado (
  id         uuid primary key default gen_random_uuid(),
  partido_id uuid not null references partidos(id) on delete cascade,
  categoria  rugby_categoria not null,
  pts_cedros int not null default 0,
  pts_rival  int not null default 0,
  created_at timestamptz not null default now(),
  unique (partido_id, categoria)
);

alter table formaciones       enable row level security;
alter table acciones_partido  enable row level security;
alter table ajustes_resultado enable row level security;

do $$
declare t text;
begin
  foreach t in array array['formaciones','acciones_partido','ajustes_resultado']
  loop
    execute format('drop policy if exists %I_rw on %I', t, t);
    execute format('create policy %I_rw on %I for all to authenticated using (true) with check (true)', t, t);
  end loop;
end $$;
