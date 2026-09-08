"use client";

import { useMemo, useState } from "react";
import type { Gasto3T, Grupo3T, Jugador, Partido, FormaPago } from "@/lib/types";
import { fmt, fechaCorta, GRUPO_META } from "@/lib/format";
import { grupoTurnoPartido, montoPartido, partidosLocales, saldoCompra3T } from "@/lib/business";
import { crearGasto3T, actualizarGasto3T, eliminarGasto3T } from "./actions";

const GRUPOS: Grupo3T[] = ["Sabores express", "Mc Donalds", "Whisky"];

interface Bloque {
  partido: Partido;
  turno: Grupo3T;
  monto3T: number;
  gastos: Gasto3T[];
}

export function Gastos3TView({
  partidos,
  jugadores,
  gastos,
  montoGlobal,
}: {
  partidos: Partido[];
  jugadores: Jugador[];
  gastos: Gasto3T[];
  montoGlobal: number;
}) {
  const [filtroTurno, setFiltroTurno] = useState<"" | Grupo3T>("");
  const [abierto, setAbierto] = useState<Record<string, boolean>>({});
  const [modal, setModal] = useState<{ bloque: Bloque; gasto?: Gasto3T } | null>(null);

  const bloques: Bloque[] = useMemo(
    () =>
      partidosLocales(partidos).map((p, i) => ({
        partido: p,
        turno: grupoTurnoPartido(p, i),
        monto3T: montoPartido(p, montoGlobal),
        gastos: gastos.filter((g) => g.partido_id === p.id),
      })),
    [partidos, gastos, montoGlobal],
  );

  const visibles = filtroTurno ? bloques.filter((b) => b.turno === filtroTurno) : bloques;

  const totalGastado = gastos.reduce((s, g) => s + g.monto_gastado, 0);
  const totalPagado = gastos.reduce((s, g) => s + g.monto_pagado, 0);

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Total gastado" value={fmt(totalGastado)} tone="rojo" />
        <Stat label="Total pagado" value={fmt(totalPagado)} tone="verde" />
        <Stat label="Pendiente de reintegro" value={fmt(totalGastado - totalPagado)} tone="rojo" />
      </div>

      <div className="mb-4 flex flex-wrap gap-1">
        {([["", "Todos"], ...GRUPOS.map((g) => [g, GRUPO_META[g].short] as [string, string])] as [string, string][]).map(
          ([v, l]) => (
            <button
              key={v}
              onClick={() => setFiltroTurno(v as "" | Grupo3T)}
              className={`rounded-full px-2.5 py-1 text-[12px] font-semibold transition-colors ${
                filtroTurno === v ? "bg-[var(--azul)] text-white" : "border border-[var(--borde)] bg-white text-neutral-600"
              }`}
            >
              {l}
            </button>
          ),
        )}
      </div>

      {visibles.length === 0 && (
        <div className="card p-10 text-center text-neutral-400">No hay partidos locales con ese grupo.</div>
      )}

      <div className="space-y-3">
        {visibles.map((b) => {
          const gastado = b.gastos.reduce((s, g) => s + g.monto_gastado, 0);
          const pagado = b.gastos.reduce((s, g) => s + g.monto_pagado, 0);
          const pend = gastado - pagado;
          const meta = GRUPO_META[b.turno];
          const open = abierto[b.partido.id] ?? b.gastos.length > 0;
          const compradoresPlantel = new Set(
            b.gastos.filter((g) => g.es_jugador_plantel).map((g) => g.comprador),
          );
          const jugsTurno = jugadores.filter((j) => j.activo && j.grupo === b.turno);

          return (
            <div key={b.partido.id} className="card">
              <button
                onClick={() => setAbierto((s) => ({ ...s, [b.partido.id]: !open }))}
                className="flex w-full flex-wrap items-center gap-2 px-4 py-3 text-left hover:bg-[var(--gris)]"
              >
                <span className="text-[12px] font-extrabold text-[var(--azul)]">3T {fechaCorta(b.partido.fecha)}</span>
                <span className="text-[14px] font-extrabold">vs {b.partido.rival}</span>
                <span
                  className="rounded-full border px-2.5 py-0.5 text-[11px] font-bold"
                  style={{ background: meta.bg, color: meta.color, borderColor: meta.color + "55" }}
                >
                  {b.turno}
                </span>
                <span className="flex-1" />
                {gastado > 0 && <span className="text-[12px] font-bold text-[var(--rojo)]">-{fmt(gastado)}</span>}
                {pend > 0 ? (
                  <span className="badge badge-rojo">{fmt(pend)} pendiente</span>
                ) : gastado > 0 ? (
                  <span className="badge badge-verde">Saldado</span>
                ) : null}
                <span className="text-neutral-400">{open ? "▾" : "▸"}</span>
              </button>

              {open && (
                <div className="border-t border-[var(--borde)]">
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-[12px] text-neutral-500">
                      Grupo de turno: <strong style={{ color: meta.color }}>{b.turno}</strong> · Monto 3T {fmt(b.monto3T)}
                    </span>
                    <button className="btn btn-primary !py-1 text-xs" onClick={() => setModal({ bloque: b })}>
                      + Registrar
                    </button>
                  </div>

                  {b.gastos.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="table-base min-w-[720px]">
                        <thead>
                          <tr>
                            <th>Quién</th>
                            <th>Plantel</th>
                            <th>Concepto</th>
                            <th className="!text-right">Gastó</th>
                            <th className="!text-right">Pagado</th>
                            <th className="!text-right">Pendiente</th>
                            <th>Cubre 3T</th>
                            <th>Forma</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {b.gastos.map((g) => {
                            const pendG = g.monto_gastado - g.monto_pagado;
                            const s = saldoCompra3T(g.monto_gastado, b.monto3T);
                            return (
                              <tr key={g.id}>
                                <td className="font-bold">{g.comprador}</td>
                                <td>
                                  {g.es_jugador_plantel ? (
                                    <span className="badge badge-verde">Plantel</span>
                                  ) : (
                                    <span className="badge badge-gris">Externo</span>
                                  )}
                                </td>
                                <td>{g.concepto}</td>
                                <td className="!text-right font-bold">{fmt(g.monto_gastado)}</td>
                                <td className="!text-right text-[var(--verde)]">{fmt(g.monto_pagado)}</td>
                                <td
                                  className="!text-right font-bold"
                                  style={{ color: pendG > 0 ? "var(--rojo)" : "var(--verde)" }}
                                >
                                  {pendG > 0 ? fmt(pendG) : "✓"}
                                </td>
                                <td className="text-[11px]">
                                  {!g.es_jugador_plantel ? (
                                    <span className="text-neutral-400">—</span>
                                  ) : s.estado === "saldado" ? (
                                    <span className="text-[var(--verde)]">Saldado</span>
                                  ) : s.estado === "reintegro" ? (
                                    <span className="text-[var(--azul-med)]">Reintegro {fmt(s.monto)}</span>
                                  ) : (
                                    <span className="text-[var(--rojo)]">Debe {fmt(s.monto)}</span>
                                  )}
                                </td>
                                <td>
                                  <span className="badge badge-azul">{g.forma_pago}</span>
                                </td>
                                <td className="whitespace-nowrap text-right">
                                  <button
                                    className="btn btn-ghost !px-2 !py-1"
                                    onClick={() => setModal({ bloque: b, gasto: g })}
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    className="btn btn-ghost !px-2 !py-1 !text-[var(--rojo)]"
                                    onClick={() => confirm("¿Eliminar este gasto?") && eliminarGasto3T(g.id)}
                                  >
                                    ✕
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="px-4 py-6 text-center text-[13px] text-neutral-400">Sin gastos registrados aún.</div>
                  )}

                  <div className="border-t border-[var(--borde)] px-4 py-3">
                    <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-neutral-400">
                      Grupo de turno ({jugsTurno.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {jugsTurno.map((j) => {
                        const compro = compradoresPlantel.has(j.nombre);
                        return (
                          <span
                            key={j.id}
                            className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                            style={{
                              background: compro ? meta.bg : "#f0f0f0",
                              color: compro ? meta.color : "#999",
                            }}
                          >
                            {compro ? "✓ " : ""}
                            {j.apodo || j.nombre.split(" ")[0]}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {modal && (
        <GastoModal
          bloque={modal.bloque}
          gasto={modal.gasto}
          jugadores={jugadores.filter((j) => j.activo)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "rojo" | "verde" }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color: tone === "rojo" ? "var(--rojo)" : "var(--verde)" }}>
        {value}
      </div>
    </div>
  );
}

function GastoModal({
  bloque,
  gasto,
  jugadores,
  onClose,
}: {
  bloque: Bloque;
  gasto?: Gasto3T;
  jugadores: Jugador[];
  onClose: () => void;
}) {
  const inicial = gasto
    ? gasto.es_jugador_plantel
      ? gasto.comprador
      : gasto.concepto // placeholder; se resetea abajo
    : "";
  const [sel, setSel] = useState<string>(
    gasto ? (gasto.es_jugador_plantel ? `jug:${gasto.comprador}` : "__externo__") : "",
  );
  const [extNombre, setExtNombre] = useState(gasto && !gasto.es_jugador_plantel ? gasto.comprador : "");
  const [gastado, setGastado] = useState(gasto ? String(gasto.monto_gastado) : "");
  const [pagado, setPagado] = useState(gasto ? String(gasto.monto_pagado) : "");
  const [forma, setForma] = useState<FormaPago>(gasto?.forma_pago ?? "MP");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  void inicial;

  const delTurno = jugadores.filter((j) => j.grupo === bloque.turno);
  const otros = jugadores.filter((j) => j.grupo !== bloque.turno);

  const esExterno = sel === "__externo__" || sel === "__fondo__";
  const jugSel = sel.startsWith("jug:") ? jugadores.find((j) => j.nombre === sel.slice(4)) : undefined;
  const g = Number(gastado) || 0;
  const s = saldoCompra3T(g, bloque.monto3T);
  const preview = !g
    ? null
    : esExterno
      ? "Externo / fondo — no descuenta el 3T de ningún jugador."
      : s.estado === "saldado"
        ? "Compra exacta — 3T saldado."
        : s.estado === "reintegro"
          ? `Compró de más: el fondo le reintegra ${fmt(s.monto)}.`
          : `Compró de menos: debe ${fmt(s.monto)} de diferencia.`;

  async function action(formData: FormData) {
    setSaving(true);
    setError(null);
    let comprador = "";
    let esPlantel = false;
    let grupoComprador = "";
    if (esExterno) {
      comprador = extNombre.trim() || (sel === "__fondo__" ? "Fondo del club" : "Externo");
    } else if (jugSel) {
      comprador = jugSel.nombre;
      esPlantel = true;
      grupoComprador = jugSel.grupo;
    } else {
      setError("Elegí quién compró.");
      setSaving(false);
      return;
    }
    formData.set("comprador", comprador);
    formData.set("es_jugador_plantel", String(esPlantel));
    formData.set("grupo_comprador", grupoComprador);
    formData.set("forma_pago", forma);
    const res = gasto
      ? await actualizarGasto3T(gasto.id, formData)
      : await crearGasto3T(bloque.partido.id, bloque.turno, formData);
    if (res?.error) {
      setError(res.error);
      setSaving(false);
      return;
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <form
        action={action}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-xl bg-white shadow-2xl"
      >
        <div
          className="flex items-center justify-between rounded-t-xl px-4 py-3 text-white"
          style={{ background: GRUPO_META[bloque.turno].color }}
        >
          <h2 className="text-[15px] font-bold">
            Gasto 3T — {fechaCorta(bloque.partido.fecha)} vs {bloque.partido.rival}
          </h2>
          <button type="button" onClick={onClose} className="opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
        <div className="space-y-3 p-4">
          <div className="rounded-md bg-[var(--gris)] px-3 py-2 text-[12px]">
            Grupo de turno: <strong style={{ color: GRUPO_META[bloque.turno].color }}>{bloque.turno}</strong> · Monto 3T{" "}
            <strong>{fmt(bloque.monto3T)}</strong>
          </div>

          <div>
            <span className="label">¿Quién compró?</span>
            <select value={sel} onChange={(e) => setSel(e.target.value)} className="input mt-1">
              <option value="">Seleccionar…</option>
              <optgroup label={`Grupo de turno — ${bloque.turno}`}>
                {delTurno.map((j) => (
                  <option key={j.id} value={`jug:${j.nombre}`}>
                    {j.nombre}
                    {j.apodo ? ` (${j.apodo})` : ""}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Otros jugadores">
                {otros.map((j) => (
                  <option key={j.id} value={`jug:${j.nombre}`}>
                    {j.nombre}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Fuera del plantel">
                <option value="__externo__">Externo / invitado</option>
                <option value="__fondo__">Fondo del club</option>
              </optgroup>
            </select>
          </div>

          {esExterno && (
            <div>
              <span className="label">Nombre</span>
              <input
                value={extNombre}
                onChange={(e) => setExtNombre(e.target.value)}
                className="input mt-1"
                placeholder="Ej: Stefano, Máquina…"
              />
            </div>
          )}

          <div>
            <span className="label">Concepto</span>
            <input name="concepto" defaultValue={gasto?.concepto} className="input mt-1" placeholder="Bondiola, bebidas, hielo…" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="label">Total gastado ($)</span>
              <input
                name="monto_gastado"
                type="number"
                value={gastado}
                onChange={(e) => setGastado(e.target.value)}
                className="input mt-1"
                placeholder="0"
              />
            </div>
            <div>
              <span className="label">Ya reintegrado ($)</span>
              <input
                name="monto_pagado"
                type="number"
                value={pagado}
                onChange={(e) => setPagado(e.target.value)}
                className="input mt-1"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <span className="label">Forma de pago</span>
            <div className="mt-1 flex gap-2">
              {(["MP", "Efectivo"] as FormaPago[]).map((f) => (
                <button
                  type="button"
                  key={f}
                  onClick={() => setForma(f)}
                  className={`flex-1 rounded-lg border-2 px-3 py-2 text-[13px] font-semibold ${
                    forma === f ? "border-[var(--azul-med)] bg-[var(--azul-clr)] text-[var(--azul)]" : "border-[var(--borde)]"
                  }`}
                >
                  {f === "MP" ? "💳 MP" : "💵 Efectivo"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="label">Observaciones</span>
            <input name="obs" defaultValue={gasto?.obs} className="input mt-1" />
          </div>

          {preview && (
            <div
              className="rounded-md px-3 py-2 text-center text-[13px] font-bold"
              style={{
                background: s.estado === "debe" && !esExterno ? "var(--rojo-clr)" : "var(--verde-clr)",
                color: s.estado === "debe" && !esExterno ? "var(--rojo)" : "var(--verde)",
              }}
            >
              {preview}
            </div>
          )}
          {error && <div className="rounded-md bg-[var(--rojo-clr)] px-3 py-2 text-xs text-[var(--rojo)]">{error}</div>}
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--borde)] px-4 py-3">
          <button type="button" onClick={onClose} className="btn btn-ghost">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? "Guardando…" : "Registrar gasto"}
          </button>
        </div>
      </form>
    </div>
  );
}
