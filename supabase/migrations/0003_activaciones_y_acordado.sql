-- ============================================================
-- 0003 — Períodos de activación de jugador + monto acordado en cobros
-- Correr DESPUÉS de 0002. Idempotente.
-- ============================================================

-- ---------- jugador_activaciones ----------
create table if not exists jugador_activaciones (
  id         uuid primary key default gen_random_uuid(),
  jugador_id uuid not null references jugadores(id) on delete cascade,
  fecha_alta date not null,
  fecha_baja date,
  created_at timestamptz not null default now(),
  constraint jugador_activaciones_rango check (fecha_baja is null or fecha_baja >= fecha_alta)
);
create index if not exists jugador_activaciones_jugador_idx on jugador_activaciones (jugador_id);

alter table jugador_activaciones enable row level security;
drop policy if exists jugador_activaciones_rw on jugador_activaciones;
create policy jugador_activaciones_rw on jugador_activaciones for all to authenticated using (true) with check (true);

-- Backfill: cada jugador actualmente activo recibe un período abierto desde
-- el arranque de temporada. Los que ya estaban inactivos en el seed no
-- reciben período (nunca generaron deuda automática, y sus cobros
-- históricos —si los hubiera— igual se siguen mostrando siempre).
insert into jugador_activaciones (jugador_id, fecha_alta, fecha_baja)
select j.id, '2026-01-01'::date, null
from jugadores j
where j.activo = true
  and not exists (select 1 from jugador_activaciones a where a.jugador_id = j.id);

-- ---------- cobros.monto_acordado ----------
alter table cobros add column if not exists monto_acordado boolean not null default false;
