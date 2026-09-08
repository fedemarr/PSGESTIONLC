-- ============================================================
-- 0002 — grupo_turno en partidos + Caja automática (triggers)
-- Correr DESPUÉS de 0001. Idempotente.
-- ============================================================

-- ---------- grupo de turno de cocina por partido local ----------
alter table partidos add column if not exists grupo_turno grupo_3t;

-- ============================================================
-- CAJA AUTOMÁTICA
-- Cada movimiento de dinero mantiene un registro en caja_movimientos
-- vinculado por referencia_id. Re-guardar reemplaza; borrar elimina.
--
-- OJO: los movimientos históricos del seed NO tienen referencia_id, así
-- que estos triggers no los tocan. Si editás un cobro/gasto histórico
-- desde la app se generará un movimiento nuevo (puede duplicar el
-- agregado histórico — reconciliá en Caja si pasa).
-- ============================================================

-- ---------- COBROS -> Caja (Ingreso) ----------
create or replace function sync_caja_cobro() returns trigger as $$
declare v_row record;
begin
  v_row := coalesce(new, old);
  delete from caja_movimientos where referencia_id = v_row.id and origen = 'Cobro 3T';
  if tg_op = 'DELETE' then return old; end if;

  -- Sólo pagos reales (no compras, no ausentes) generan ingreso.
  if new.presencia <> 'ausente' and new.monto > 0 and new.es_compra = false then
    insert into caja_movimientos (fecha, concepto, origen, tipo, fondo, monto, referencia_id, temporada)
    select p.fecha,
           'Cobro 3T ' || to_char(p.fecha, 'DD/MM') || ' vs ' || p.rival || ' — ' || j.nombre,
           'Cobro 3T', 'Ingreso', new.forma, new.monto, new.id, p.temporada
    from partidos p join jugadores j on j.id = new.jugador_id
    where p.id = new.partido_id;
  end if;
  return new;
end $$ language plpgsql;

drop trigger if exists trg_sync_caja_cobro on cobros;
create trigger trg_sync_caja_cobro
  after insert or update or delete on cobros
  for each row execute function sync_caja_cobro();

-- ---------- GASTOS 3T -> Caja (Egreso: reintegro / pago al comprador) ----------
create or replace function sync_caja_gasto3t() returns trigger as $$
declare v_row record;
begin
  v_row := coalesce(new, old);
  delete from caja_movimientos where referencia_id = v_row.id and origen = 'Gasto 3T';
  if tg_op = 'DELETE' then return old; end if;

  if new.monto_pagado > 0 then
    insert into caja_movimientos (fecha, concepto, origen, tipo, fondo, monto, referencia_id, temporada)
    select coalesce(p.fecha, current_date),
           'Gasto 3T ' || to_char(p.fecha, 'DD/MM') || ' — ' || new.comprador ||
             case when new.concepto <> '' then ' (' || new.concepto || ')' else '' end,
           'Gasto 3T', 'Egreso', new.forma_pago, new.monto_pagado, new.id, p.temporada
    from partidos p where p.id = new.partido_id;
  end if;
  return new;
end $$ language plpgsql;

drop trigger if exists trg_sync_caja_gasto3t on gastos_3t;
create trigger trg_sync_caja_gasto3t
  after insert or update or delete on gastos_3t
  for each row execute function sync_caja_gasto3t();

-- ---------- GASTOS FIJOS -> Caja (Egreso) ----------
create or replace function sync_caja_gasto_fijo() returns trigger as $$
declare
  v_row record;
  v_origen text;
begin
  v_row := coalesce(new, old);
  delete from caja_movimientos
   where referencia_id = v_row.id and origen in ('Lavanderia', 'Entretiempo', 'Extra');
  if tg_op = 'DELETE' then return old; end if;

  v_origen := case new.categoria
                when 'lavanderia'  then 'Lavanderia'
                when 'entretiempo' then 'Entretiempo'
                else 'Extra' end;

  if new.estado = 'Pagado' and new.total > 0 then
    insert into caja_movimientos (fecha, concepto, origen, tipo, fondo, monto, referencia_id, temporada)
    select coalesce(new.fecha_pago, p.fecha, current_date),
           v_origen || ' ' || to_char(p.fecha, 'DD/MM') || ' vs ' || p.rival ||
             case when new.pagado_a <> '' then ' — ' || new.pagado_a else '' end,
           v_origen, 'Egreso', new.forma, new.total, new.id, p.temporada
    from partidos p where p.id = new.partido_id;
  end if;
  return new;
end $$ language plpgsql;

drop trigger if exists trg_sync_caja_gasto_fijo on gastos_fijos;
create trigger trg_sync_caja_gasto_fijo
  after insert or update or delete on gastos_fijos
  for each row execute function sync_caja_gasto_fijo();
