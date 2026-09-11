"use client";

import { useMemo, useState } from "react";
import type { Activacion, Cobro, Gasto3T, Grupo3T, Jugador, Partido, FormaPago, Presencia } from "@/lib/types";
import { fmt, fechaCorta, GRUPO_META, CELDA_META } from "@/lib/format";
import {
  activoEnFecha,
  comprasMontoMap,
  estadoCeldaJugador,
  montoPartido,
  partidosLocales,
  saldoCompra3T,
  type EstadoCelda,
} from "@/lib/business";
import { guardarCobro, eliminarCobro } from "./actions";

const GRUPOS: Grupo3T[] = ["Sabores express", "Mc Donalds", "Whisky"];

export function CobrosGrid({
  jugadores,
  partidos,
  cobros,
  gastos3t,
  activaciones,
  montoGlobal,
}: {
  jugadores: Jugador[];
  partidos: Partido[];
  cobros: Cobro[];
  gastos3t: Gasto3T[];
  activaciones: Activacion[];
  montoGlobal: number;
}) {
  const [grupo, setGrupo] = useState<"" | Grupo3T>("");
  const [estadoF, setEstadoF] = useState<"" | "debe" | "ok">("");
  const [activoF, setActivoF] = useState<"" | "activo" | "inactivo">("");
  const [q, setQ] = useState("");
  const [cell, setCell] = useState<{ jugador: Jugador; partido: Partido } | null>(null);
  const [drawer, setDrawer] = useState<Jugador | null>(null);

  const locales = useMemo(() => partidosLocales(partidos), [partidos]);
  const cobrosMap = useMemo(
    () => new Map(cobros.map((c) => [`${c.jugador_id}:${c.partido_id}`, c])),
    [cobros],
  );
  const comprasMap = useMemo(() => comprasMontoMap(gastos3t), [gastos3t]);
  const conRegistros = useMemo(
    () =>
      new Set<string>([
        ...cobros.map((c) => c.partido_id),
        ...gastos3t.filter((g) => g.es_jugador_plantel).map((g) => g.partido_id),
      ]),
    [cobros, gastos3t],
  );

  const celda = (j: Jugador, p: Partido) =>
    estadoCeldaJugador({
      cobro: cobrosMap.get(`${j.id}:${p.id}`),
      comprasMonto: comprasMap.get(`${j.nombre}:${p.id}`) ?? 0,
      monto3T: montoPartido(p, montoGlobal),
      partido: p,
      partidoConRegistros: conRegistros.has(p.id),
      activoEnFecha: activoEnFecha(activaciones, j.id, p.fecha),
    });

  const deudaDe = (j: Jugador) =>
    locales.reduce((sum, p) => {
      const e = celda(j, p);
      if (["ausente", "pendiente", "saldado", "compra", "acordado"].includes(e.estado)) return sum;
      if (e.estado === "parcial") return sum + e.diff;
      return sum - montoPartido(p, montoGlobal);
    }, 0);

  // stats
  const totalCobrado = cobros
    .filter((c) => c.presencia !== "ausente" && !c.es_compra)
    .reduce((s, c) => s + c.monto, 0);
  const deudas = jugadores.map((j) => deudaDe(j));
  const conDeuda = deudas.filter((d) => d < 0).length;
  const deudaTotal = deudas.filter((d) => d < 0).reduce((s, d) => s + d, 0);

  const filas = useMemo(() => {
    const term = q.toLowerCase();
    return jugadores
      .filter((j) => !grupo || j.grupo === grupo)
      .filter((j) => !activoF || (activoF === "activo" ? j.activo : !j.activo))
      .filter((j) => !term || j.nombre.toLowerCase().includes(term) || j.apodo.toLowerCase().includes(term))
      .filter((j) => {
        if (estadoF === "debe") return deudaDe(j) < 0;
        if (estadoF === "ok") return deudaDe(j) >= 0;
        return true;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jugadores, grupo, activoF, q, estadoF, cobros, gastos3t, activaciones]);

  const totalPorPartido = (p: Partido) =>
    cobros
      .filter((c) => c.partido_id === p.id && c.presencia !== "ausente" && !c.es_compra)
      .reduce((s, c) => s + c.monto, 0);

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total cobrado" value={fmt(totalCobrado)} tone="verde" />
        <Stat label="Con deuda" value={conDeuda} tone="rojo" />
        <Stat label="Deuda total" value={fmt(deudaTotal)} tone="rojo" />
        <Stat label="Al día" value={jugadores.length - conDeuda} tone="verde" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Chips value={grupo} onChange={(v) => setGrupo(v as "" | Grupo3T)} options={[["", "Todos"], ...GRUPOS.map((g) => [g, GRUPO_META[g].short] as [string, string])]} />
        <Chips value={estadoF} onChange={(v) => setEstadoF(v as "" | "debe" | "ok")} options={[["", "Todos"], ["debe", "Con deuda"], ["ok", "Al día"]]} />
        <Chips value={activoF} onChange={(v) => setActivoF(v as "" | "activo" | "inactivo")} options={[["", "Todos"], ["activo", "Activos"], ["inactivo", "Inactivos"]]} />
        <input className="input max-w-[200px]" placeholder="Buscar jugador…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {locales.length === 0 ? (
        <div className="card p-10 text-center text-neutral-400">
          No hay partidos locales. Activá partidos en el módulo Partidos.
        </div>
      ) : (
        <div className="card">
          <div className="card-header">Cobros por jugador — tocá una celda para registrar el pago</div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr>
                  <th className="sticky left-0 z-20 min-w-[150px] bg-[var(--azul)] px-2 py-2 text-left text-white">Jugador</th>
                  <th className="sticky left-[150px] z-20 min-w-[90px] bg-[var(--azul)] px-2 py-2 text-left text-[10px] text-white">Grupo</th>
                  {locales.map((p) => (
                    <th key={p.id} className="min-w-[76px] bg-[var(--azul)] px-1.5 py-2 text-center text-[10px] text-white">
                      {fechaCorta(p.fecha)}
                      <div className="font-normal opacity-70">{fmt(montoPartido(p, montoGlobal))}</div>
                    </th>
                  ))}
                  <th className="min-w-[86px] bg-[var(--azul)] px-2 py-2 text-right text-[10px] text-white">Deuda</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((j) => {
                  const d = deudaDe(j);
                  return (
                    <tr key={j.id} className={`border-b border-neutral-100 ${j.activo ? "" : "opacity-50"}`}>
                      <td
                        className="sticky left-0 z-10 min-w-[150px] cursor-pointer border-r border-[var(--borde)] bg-white px-2 py-1.5"
                        onClick={() => setDrawer(j)}
                      >
                        <span className="font-bold">{j.nombre}</span>
                        {j.apodo && <span className="ml-1 text-[10px] text-neutral-400">({j.apodo})</span>}
                        {!j.activo && <span className="ml-1 badge badge-gris">Inactivo</span>}
                      </td>
                      <td className="sticky left-[150px] z-10 min-w-[90px] border-r border-[var(--borde)] bg-white px-2 py-1.5">
                        <span
                          className="badge"
                          style={{ background: GRUPO_META[j.grupo].bg, color: GRUPO_META[j.grupo].color }}
                        >
                          {GRUPO_META[j.grupo].short}
                        </span>
                      </td>
                      {locales.map((p) => {
                        const e = celda(j, p);
                        const st = CELDA_META[e.estado];
                        const monto = e.estado === "ausente" || e.estado === "pendiente" ? "" : fmt(e.monto);
                        const sub =
                          e.estado === "parcial" ? `Falta ${fmt(Math.abs(e.diff))}` : st.label;
                        return (
                          <td key={p.id} className="p-0.5">
                            <button
                              onClick={() => setCell({ jugador: j, partido: p })}
                              className="flex w-full flex-col items-center rounded px-1 py-1 leading-none transition-[filter] hover:brightness-95"
                              style={{
                                background: st.bg,
                                color: st.fg,
                                border: st.border ? `1.5px dashed ${st.border}` : undefined,
                              }}
                            >
                              <span className="text-[11px] font-extrabold">{monto || "·"}</span>
                              <span className="text-[9px] font-semibold">{sub}</span>
                            </button>
                          </td>
                        );
                      })}
                      <td className="px-2 py-1.5 text-right">
                        <span className={`badge ${d < 0 ? "badge-rojo" : d === 0 ? "badge-gris" : "badge-verde"}`}>
                          {d < 0 ? fmt(d) : d === 0 ? "Al día" : "+" + fmt(d)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filas.length === 0 && (
                  <tr>
                    <td colSpan={locales.length + 3} className="py-8 text-center text-neutral-400">
                      Sin jugadores con esos filtros.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-[var(--azul)] text-[11px] font-bold text-white">
                  <td className="sticky left-0 z-10 bg-[var(--azul)] px-2 py-1.5">Total cobrado</td>
                  <td className="sticky left-[150px] z-10 bg-[var(--azul)]" />
                  {locales.map((p) => (
                    <td key={p.id} className="px-1.5 py-1.5 text-center">
                      {fmt(totalPorPartido(p))}
                    </td>
                  ))}
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="flex flex-wrap gap-3 border-t border-[var(--borde)] px-4 py-2.5 text-[11px] text-neutral-500">
            {(["saldado", "debe", "parcial", "compra", "acordado", "ausente"] as EstadoCelda[]).map((k) => (
              <span key={k} className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: CELDA_META[k].bg }} />
                {CELDA_META[k].label}
              </span>
            ))}
          </div>
        </div>
      )}

      {cell &&
        (() => {
          const monto3T = montoPartido(cell.partido, montoGlobal);
          const cobroExistente = cobrosMap.get(`${cell.jugador.id}:${cell.partido.id}`);
          const comprasCelda = gastos3t.filter(
            (g) => g.es_jugador_plantel && g.comprador === cell.jugador.nombre && g.partido_id === cell.partido.id,
          );
          // Bug 4: si no hay cobro propio pero sí una compra cargada en Gastos 3T, es de solo lectura.
          return !cobroExistente && comprasCelda.length > 0 ? (
            <CompraInfo
              jugador={cell.jugador}
              partido={cell.partido}
              monto3T={monto3T}
              compras={comprasCelda}
              onClose={() => setCell(null)}
            />
          ) : (
            <CobroModal
              jugador={cell.jugador}
              partido={cell.partido}
              monto3T={monto3T}
              cobro={cobroExistente}
              onClose={() => setCell(null)}
            />
          );
        })()}

      {drawer && (
        <Drawer
          jugador={drawer}
          locales={locales}
          celda={celda}
          montoGlobal={montoGlobal}
          cobrosMap={cobrosMap}
          onClose={() => setDrawer(null)}
        />
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: "rojo" | "verde" }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color: tone === "rojo" ? "var(--rojo)" : tone === "verde" ? "var(--verde)" : undefined }}>
        {value}
      </div>
    </div>
  );
}

function Chips({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <div className="flex gap-1">
      {options.map(([v, label]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`rounded-full px-2.5 py-1 text-[12px] font-semibold transition-colors ${
            value === v ? "bg-[var(--azul)] text-white" : "border border-[var(--borde)] bg-white text-neutral-600"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** Celda cubierta por una compra de Gastos 3T (sin fila de cobro propia): solo lectura. */
function CompraInfo({
  jugador,
  partido,
  monto3T,
  compras,
  onClose,
}: {
  jugador: Jugador;
  partido: Partido;
  monto3T: number;
  compras: Gasto3T[];
  onClose: () => void;
}) {
  const total = compras.reduce((s, c) => s + c.monto_gastado, 0);
  const saldo = saldoCompra3T(total, monto3T);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between rounded-t-xl px-4 py-3 text-white" style={{ background: "#1A5276" }}>
          <h2 className="text-[15px] font-bold">Cubierto con compra</h2>
          <button type="button" onClick={onClose} className="opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
        <div className="space-y-3 p-4">
          <div className="rounded-md bg-[var(--gris)] px-3 py-2 text-[12px]">
            <strong>
              {jugador.nombre}
              {jugador.apodo ? ` (${jugador.apodo})` : ""}
            </strong>{" "}
            — {fechaCorta(partido.fecha)} vs {partido.rival}
            <div className="mt-0.5 text-neutral-500">
              Monto 3T: <strong className="text-[var(--azul)]">{fmt(monto3T)}</strong>
            </div>
          </div>
          <div className="rounded-md border border-[var(--borde)] p-2">
            {compras.map((c) => (
              <div key={c.id} className="flex justify-between border-b border-neutral-100 py-1.5 text-[12px] last:border-0">
                <span className="text-neutral-600">{c.concepto || "Compra"}</span>
                <span className="font-bold">{fmt(c.monto_gastado)}</span>
              </div>
            ))}
          </div>
          <div
            className="rounded-md px-3 py-2 text-center text-[13px] font-bold"
            style={{
              background: saldo.estado === "debe" ? "var(--rojo-clr)" : saldo.estado === "reintegro" ? "var(--azul-clr)" : "var(--verde-clr)",
              color: saldo.estado === "debe" ? "var(--rojo)" : saldo.estado === "reintegro" ? "var(--azul)" : "var(--verde)",
            }}
          >
            {saldo.estado === "saldado" && `Compra exacta (${fmt(total)}) — 3T saldado.`}
            {saldo.estado === "reintegro" && `Compró ${fmt(total)} — el fondo le reintegra ${fmt(saldo.monto)}.`}
            {saldo.estado === "debe" && `Compró ${fmt(total)} — falta ${fmt(saldo.monto)} para cubrir el 3T.`}
          </div>
          <p className="text-[11px] text-neutral-400">
            Este cobro viene de una compra cargada en <strong>Gastos 3T</strong>. Para editarlo (monto, comprador,
            reintegro), andá a ese módulo — acá es de solo lectura para no perder la referencia a la compra.
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--borde)] px-4 py-3">
          <button className="btn btn-primary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function CobroModal({
  jugador,
  partido,
  monto3T,
  cobro,
  onClose,
}: {
  jugador: Jugador;
  partido: Partido;
  monto3T: number;
  cobro?: Cobro;
  onClose: () => void;
}) {
  const [presencia, setPresencia] = useState<Presencia>(cobro?.presencia ?? "jugo");
  const [monto, setMonto] = useState<string>(
    cobro && cobro.presencia !== "ausente" ? String(cobro.monto) : String(monto3T),
  );
  const [forma, setForma] = useState<FormaPago>(cobro?.forma ?? "MP");
  const [acordado, setAcordado] = useState<boolean>(cobro?.monto_acordado ?? false);
  const [obs, setObs] = useState<string>(cobro?.obs ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const m = Number(monto) || 0;
  const diff = m - monto3T;
  const soloObs = presencia !== "ausente" && !acordado && m === 0 && obs.trim().length > 0;

  let preview: { texto: string; tono: "gris" | "acordado" | "azul" | "verde" | "rojo" } | null = null;
  if (presencia === "ausente") {
    preview = { texto: "🔘 Marcado como ausente — sin deuda.", tono: "gris" };
  } else if (acordado) {
    preview = {
      texto: m > 0 ? `✅ Monto acordado: ${fmt(m)} — sin deuda.` : "✅ Sin pago — acordado, sin deuda.",
      tono: "acordado",
    };
  } else if (m > 0) {
    if (diff > 0) preview = { texto: `💙 Pagó ${fmt(m)} — reintegro ${fmt(diff)}.`, tono: "azul" };
    else if (diff === 0) preview = { texto: `✅ Saldado — ${fmt(m)}.`, tono: "verde" };
    else preview = { texto: `🔴 Pagó ${fmt(m)} — debe ${fmt(-diff)}.`, tono: "rojo" };
  }

  const previewStyle: Record<string, { bg: string; fg: string }> = {
    gris: { bg: "#F5F5F5", fg: "#666" },
    acordado: { bg: "#F0FDF4", fg: "#166534" },
    azul: { bg: "var(--azul-clr)", fg: "var(--azul)" },
    verde: { bg: "var(--verde-clr)", fg: "var(--verde)" },
    rojo: { bg: "var(--rojo-clr)", fg: "var(--rojo)" },
  };

  async function action(formData: FormData) {
    setSaving(true);
    setError(null);
    formData.set("presencia", presencia);
    formData.set("forma", forma);
    formData.set("acordado", String(acordado));
    formData.set("monto", monto);
    formData.set("obs", obs);
    const res = await guardarCobro(jugador.id, partido.id, formData);
    if (res?.error) {
      setError(res.error);
      setSaving(false);
      return;
    }
    onClose();
  }

  const btnLabel = saving ? "Guardando…" : soloObs ? "Guardar observación" : cobro ? "Actualizar" : "Guardar";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <form
        action={action}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-xl bg-white shadow-2xl"
      >
        <div
          className="flex items-center justify-between rounded-t-xl px-4 py-3 text-white"
          style={{ background: GRUPO_META[jugador.grupo].color }}
        >
          <h2 className="text-[15px] font-bold">{cobro ? "Editar cobro" : "Registrar cobro"}</h2>
          <button type="button" onClick={onClose} className="opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
        <div className="space-y-3 p-4">
          <div className="rounded-md bg-[var(--gris)] px-3 py-2 text-[12px]">
            <strong>
              {jugador.nombre}
              {jugador.apodo ? ` (${jugador.apodo})` : ""}
            </strong>{" "}
            — {fechaCorta(partido.fecha)} vs {partido.rival}
            <div className="mt-0.5 text-neutral-500">
              Monto 3T: <strong className="text-[var(--azul)]">{fmt(monto3T)}</strong>
            </div>
          </div>

          <div>
            <span className="label">Presencia</span>
            <div className="mt-1 flex gap-1.5">
              {([
                ["jugo", "Jugó"],
                ["nojugo", "No jugó (fue)"],
                ["ausente", "Ausente"],
              ] as [Presencia, string][]).map(([v, l]) => (
                <button
                  type="button"
                  key={v}
                  onClick={() => setPresencia(v)}
                  className={`flex-1 rounded-lg border-2 px-1 py-1.5 text-[11px] font-semibold ${
                    presencia === v
                      ? v === "ausente"
                        ? "border-neutral-400 bg-neutral-100 text-neutral-600"
                        : "border-[var(--azul)] bg-[var(--azul-clr)] text-[var(--azul)]"
                      : "border-[var(--borde)]"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {presencia !== "ausente" && (
            <>
              <div>
                <span className="label">Monto pagado ($)</span>
                <div className="mt-1 flex gap-2">
                  <input
                    name="monto"
                    type="number"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    className="input flex-1"
                    placeholder="0"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setMonto(String(monto3T))}
                    className="btn btn-ghost whitespace-nowrap !px-2 text-[11px]"
                  >
                    Volver a {fmt(monto3T)}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAcordado((v) => !v)}
                className={`flex w-full items-start gap-2.5 rounded-lg border-2 p-2.5 text-left transition-colors ${
                  acordado ? "border-[#86EFAC] bg-[#F0FDF4]" : "border-[var(--borde)]"
                }`}
              >
                <span
                  className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border text-[10px] ${
                    acordado ? "border-[#16a34a] bg-[#16a34a] text-white" : "border-neutral-300"
                  }`}
                >
                  {acordado ? "✓" : ""}
                </span>
                <span>
                  <div className={`text-[12px] font-bold ${acordado ? "text-[#166534]" : ""}`}>
                    Monto acordado — sin deuda
                  </div>
                  <div className="text-[10.5px] text-neutral-500">
                    El monto ingresado es lo que se acordó. No genera diferencia ni deuda, sea cual sea el 3T.
                  </div>
                </span>
              </button>

              <div>
                <span className="label">Forma de pago</span>
                <div className="mt-1 flex gap-2">
                  {(["MP", "Efectivo"] as FormaPago[]).map((f) => (
                    <button
                      type="button"
                      key={f}
                      onClick={() => setForma(f)}
                      className={`flex-1 rounded-lg border-2 px-3 py-2 text-[13px] font-semibold ${
                        forma === f
                          ? "border-[var(--azul-med)] bg-[var(--azul-clr)] text-[var(--azul)]"
                          : "border-[var(--borde)]"
                      }`}
                    >
                      {f === "MP" ? "💳 MP" : "💵 Efectivo"}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {preview && (
            <div
              className="rounded-md px-3 py-2 text-center text-[13px] font-bold"
              style={{ background: previewStyle[preview.tono].bg, color: previewStyle[preview.tono].fg }}
            >
              {preview.texto}
            </div>
          )}

          <div>
            <span className="label">
              Observaciones <span className="font-normal text-neutral-400">· podés guardar solo la nota, sin pago</span>
            </span>
            <textarea
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              rows={2}
              className="input mt-1"
              placeholder="Ej: me dijo que paga el sábado, paga junto con Mati…"
            />
          </div>

          {error && <div className="rounded-md bg-[var(--rojo-clr)] px-3 py-2 text-xs text-[var(--rojo)]">{error}</div>}
        </div>
        <div className="flex items-center justify-between border-t border-[var(--borde)] px-4 py-3">
          {cobro ? (
            <button
              type="button"
              className="btn btn-ghost text-xs !text-[var(--rojo)]"
              onClick={async () => {
                if (confirm("¿Borrar el registro de este cobro?")) {
                  await eliminarCobro(jugador.id, partido.id);
                  onClose();
                }
              }}
            >
              Borrar registro
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {btnLabel}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Drawer({
  jugador,
  locales,
  celda,
  montoGlobal,
  cobrosMap,
  onClose,
}: {
  jugador: Jugador;
  locales: Partido[];
  celda: (j: Jugador, p: Partido) => { estado: EstadoCelda; monto: number | null; diff: number };
  montoGlobal: number;
  cobrosMap: Map<string, Cobro>;
  onClose: () => void;
}) {
  const deuda = locales.reduce((sum, p) => {
    const e = celda(jugador, p);
    if (["ausente", "pendiente", "saldado", "compra", "acordado"].includes(e.estado)) return sum;
    if (e.estado === "parcial") return sum + e.diff;
    return sum - montoPartido(p, montoGlobal);
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="h-full w-full max-w-[400px] overflow-y-auto bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 text-white" style={{ background: GRUPO_META[jugador.grupo].color }}>
          <button onClick={onClose} className="float-right opacity-70 hover:opacity-100">
            ✕
          </button>
          <div className="text-lg font-extrabold">{jugador.nombre}</div>
          <div className="mt-1 text-[12px] opacity-80">
            {jugador.apodo && `"${jugador.apodo}" · `}
            {jugador.grupo}
            {jugador.posicion && ` · ${jugador.posicion}`}
          </div>
        </div>
        <div className="p-4">
          <div
            className="mb-4 rounded-lg p-3 text-center"
            style={{ background: deuda < 0 ? "var(--rojo-clr)" : "var(--verde-clr)" }}
          >
            <div className="text-[10px] text-neutral-600">Deuda total</div>
            <div
              className="text-[20px] font-extrabold"
              style={{ color: deuda < 0 ? "var(--rojo)" : "var(--verde)" }}
            >
              {deuda < 0 ? fmt(deuda) : deuda === 0 ? "Al día" : "+" + fmt(deuda)}
            </div>
          </div>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-neutral-400">
            Historial por partido
          </div>
          <div className="space-y-1.5">
            {locales.map((p) => {
              const e = celda(jugador, p);
              const c = cobrosMap.get(`${jugador.id}:${p.id}`);
              const st = CELDA_META[e.estado];
              return (
                <div key={p.id} className="flex items-center gap-2 rounded-md bg-[var(--gris)] px-2.5 py-1.5">
                  <div className="min-w-[38px] text-[11px] font-bold text-[var(--azul)]">{fechaCorta(p.fecha)}</div>
                  <div className="flex-1 truncate text-[11px] text-neutral-600">{p.rival}</div>
                  <span
                    className="badge"
                    style={{ background: st.bg, color: st.fg }}
                  >
                    {e.estado === "parcial" ? `Falta ${fmt(Math.abs(e.diff))}` : st.label || "—"}
                  </span>
                  <div className="min-w-[54px] text-right text-[11px] font-bold">
                    {e.monto != null ? fmt(e.monto) : "—"}
                  </div>
                  <div className="w-9 text-right text-[9px] text-neutral-400">{c?.forma ?? ""}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
