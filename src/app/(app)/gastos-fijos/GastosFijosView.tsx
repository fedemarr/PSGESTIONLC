"use client";

import { useMemo, useState } from "react";
import type { FormaPago, GastoFijo, GFCategoria, GFEstado, Partido } from "@/lib/types";
import { fmt, fechaCorta, fmtFecha } from "@/lib/format";
import { crearGastoFijo, actualizarGastoFijo, eliminarGastoFijo } from "./actions";

const TABS: { id: GFCategoria; label: string; color: string }[] = [
  { id: "lavanderia", label: "👕 Lavandería", color: "var(--azul)" },
  { id: "entretiempo", label: "🧃 Entretiempo", color: "var(--verde)" },
  { id: "extra", label: "📋 Extras", color: "var(--naranja)" },
];

export function GastosFijosView({ partidos, gastos }: { partidos: Partido[]; gastos: GastoFijo[] }) {
  const [tab, setTab] = useState<GFCategoria>("lavanderia");
  const [estadoF, setEstadoF] = useState<"" | GFEstado>("");
  const [modal, setModal] = useState<{ categoria: GFCategoria; gasto?: GastoFijo } | null>(null);

  const partidoMap = useMemo(() => new Map(partidos.map((p) => [p.id, p])), [partidos]);
  const ordenados = useMemo(
    () => [...partidos].sort((a, b) => a.fecha.localeCompare(b.fecha)),
    [partidos],
  );

  const totales = useMemo(() => {
    const t = { lavanderia: 0, entretiempo: 0, extra: 0, pendiente: 0 };
    for (const g of gastos) {
      t[g.categoria] += g.total;
      if (g.estado !== "Pagado") t.pendiente += g.total;
    }
    return t;
  }, [gastos]);

  const filas = gastos
    .filter((g) => g.categoria === tab)
    .filter((g) => !estadoF || g.estado === estadoF)
    .sort((a, b) => {
      const pa = partidoMap.get(a.partido_id)?.fecha ?? "";
      const pb = partidoMap.get(b.partido_id)?.fecha ?? "";
      return pa.localeCompare(pb);
    });

  const totalTab = filas.reduce((s, g) => s + g.total, 0);

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Lavandería" value={fmt(totales.lavanderia)} tone="rojo" />
        <Stat label="Entretiempo" value={fmt(totales.entretiempo)} tone="rojo" />
        <Stat label="Extras" value={fmt(totales.extra)} tone="rojo" />
        <Stat label="Pendiente" value={fmt(totales.pendiente)} tone="rojo" />
      </div>

      <div className="mb-3 flex gap-1 border-b border-[var(--borde)]">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-[13px] font-semibold ${
              tab === t.id ? "border-[var(--azul)] text-[var(--azul)]" : "border-transparent text-neutral-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {([["", "Todos"], ["Pagado", "Pagado"], ["Pendiente", "Pendiente"], ["Parcial", "Parcial"]] as [string, string][]).map(
            ([v, l]) => (
              <button
                key={v}
                onClick={() => setEstadoF(v as "" | GFEstado)}
                className={`rounded-full px-2.5 py-1 text-[12px] font-semibold transition-colors ${
                  estadoF === v ? "bg-[var(--azul)] text-white" : "border border-[var(--borde)] bg-white text-neutral-600"
                }`}
              >
                {l}
              </button>
            ),
          )}
        </div>
        <button className="btn btn-primary ml-auto !py-1 text-xs" onClick={() => setModal({ categoria: tab })}>
          + Registrar
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base min-w-[820px]">
          <thead>
            <tr>
              <th>Partido</th>
              <th>Rival</th>
              {tab === "lavanderia" && (
                <>
                  <th className="!text-right">Camisetas</th>
                  <th className="!text-right">P. unit.</th>
                </>
              )}
              {tab === "entretiempo" && <th>Detalle</th>}
              {tab === "extra" && <th>Concepto</th>}
              <th className="!text-right">Total</th>
              <th>Pagado a</th>
              <th>Fecha pago</th>
              <th>Forma</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filas.map((g) => {
              const p = partidoMap.get(g.partido_id);
              return (
                <tr key={g.id}>
                  <td className="whitespace-nowrap font-bold">{p ? fechaCorta(p.fecha) : "—"}</td>
                  <td className="text-[12px]">
                    {p?.rival ?? "—"}
                    {p && (
                      <span className={`ml-1 badge ${p.tipo === "Local" ? "badge-verde" : "badge-azul"}`}>
                        {p.tipo === "Local" ? "L" : "V"}
                      </span>
                    )}
                  </td>
                  {tab === "lavanderia" && (
                    <>
                      <td className="!text-right">{g.cantidad_camisetas ?? "—"}</td>
                      <td className="!text-right">{g.precio_unitario != null ? fmt(g.precio_unitario) : "—"}</td>
                    </>
                  )}
                  {tab === "entretiempo" && <td className="text-[12px] text-neutral-600">{g.detalle || "—"}</td>}
                  {tab === "extra" && <td>{g.concepto || "—"}</td>}
                  <td className="!text-right font-extrabold">{fmt(g.total)}</td>
                  <td className="text-[12px]">{g.pagado_a || "—"}</td>
                  <td className="whitespace-nowrap text-[12px] text-neutral-500">{fmtFecha(g.fecha_pago)}</td>
                  <td>
                    <span className="badge badge-azul">{g.forma}</span>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        g.estado === "Pagado" ? "badge-verde" : g.estado === "Pendiente" ? "badge-rojo" : "badge-amarillo"
                      }`}
                    >
                      {g.estado}
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-right">
                    <button className="btn btn-ghost !px-2 !py-1" onClick={() => setModal({ categoria: tab, gasto: g })}>
                      ✏️
                    </button>
                    <button
                      className="btn btn-ghost !px-2 !py-1 !text-[var(--rojo)]"
                      onClick={() => confirm("¿Eliminar este registro?") && eliminarGastoFijo(g.id)}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
            {filas.length === 0 && (
              <tr>
                <td colSpan={11} className="py-8 text-center text-neutral-400">
                  Sin registros. Tocá “+ Registrar”.
                </td>
              </tr>
            )}
          </tbody>
          {filas.length > 0 && (
            <tfoot>
              <tr className="bg-[var(--azul)] font-bold text-white">
                <td className="px-3 py-2" colSpan={tab === "lavanderia" ? 4 : 3}>
                  TOTAL
                </td>
                <td className="px-3 py-2 text-right">{fmt(totalTab)}</td>
                <td colSpan={5} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {modal && (
        <GFModal
          categoria={modal.categoria}
          gasto={modal.gasto}
          partidos={ordenados}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "rojo" }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color: tone === "rojo" ? "var(--rojo)" : undefined }}>
        {value}
      </div>
    </div>
  );
}

function GFModal({
  categoria,
  gasto,
  partidos,
  onClose,
}: {
  categoria: GFCategoria;
  gasto?: GastoFijo;
  partidos: Partido[];
  onClose: () => void;
}) {
  const [cant, setCant] = useState(gasto?.cantidad_camisetas != null ? String(gasto.cantidad_camisetas) : "");
  const [precio, setPrecio] = useState(gasto?.precio_unitario != null ? String(gasto.precio_unitario) : "");
  const [total, setTotal] = useState(gasto && categoria !== "lavanderia" ? String(gasto.total) : "");
  const [forma, setForma] = useState<FormaPago>(gasto?.forma ?? "MP");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalLav = (Number(cant) || 0) * (Number(precio) || 0);
  const cfg = TABS.find((t) => t.id === categoria)!;

  async function action(formData: FormData) {
    setSaving(true);
    setError(null);
    formData.set("categoria", categoria);
    formData.set("forma", forma);
    const res = gasto ? await actualizarGastoFijo(gasto.id, formData) : await crearGastoFijo(formData);
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
        <div className="flex items-center justify-between rounded-t-xl px-4 py-3 text-white" style={{ background: cfg.color }}>
          <h2 className="text-[15px] font-bold">
            {gasto ? "Editar" : "Registrar"} · {cfg.label}
          </h2>
          <button type="button" onClick={onClose} className="opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
        <div className="space-y-3 p-4">
          <div>
            <span className="label">Partido</span>
            <select name="partido_id" defaultValue={gasto?.partido_id ?? ""} className="input mt-1" required>
              <option value="">Seleccionar…</option>
              {partidos.map((p) => (
                <option key={p.id} value={p.id}>
                  {fechaCorta(p.fecha)} — {p.tipo} vs {p.rival}
                </option>
              ))}
            </select>
          </div>

          {categoria === "lavanderia" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="label">Cantidad de camisetas</span>
                  <input
                    name="cantidad_camisetas"
                    type="number"
                    value={cant}
                    onChange={(e) => setCant(e.target.value)}
                    className="input mt-1"
                    placeholder="60"
                  />
                </div>
                <div>
                  <span className="label">Precio unitario ($)</span>
                  <input
                    name="precio_unitario"
                    type="number"
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    className="input mt-1"
                    placeholder="800"
                  />
                </div>
              </div>
              {totalLav > 0 && (
                <div className="rounded-md bg-[var(--azul-clr)] px-3 py-2 text-center text-[14px] font-bold text-[var(--azul)]">
                  Total: {fmt(totalLav)}
                </div>
              )}
            </>
          )}

          {categoria === "entretiempo" && (
            <>
              <div>
                <span className="label">Detalle de ítems</span>
                <input name="detalle" defaultValue={gasto?.detalle ?? ""} className="input mt-1" placeholder="Jugos x12, gomitas…" />
              </div>
              <div>
                <span className="label">Total ($)</span>
                <input
                  name="total"
                  type="number"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                  className="input mt-1"
                  placeholder="0"
                />
              </div>
            </>
          )}

          {categoria === "extra" && (
            <>
              <div>
                <span className="label">Concepto</span>
                <input name="concepto" defaultValue={gasto?.concepto ?? ""} className="input mt-1" placeholder="Hinchada, transporte…" />
              </div>
              <div>
                <span className="label">Monto ($)</span>
                <input
                  name="total"
                  type="number"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                  className="input mt-1"
                  placeholder="0"
                />
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="label">Pagado a</span>
              <input name="pagado_a" defaultValue={gasto?.pagado_a} className="input mt-1" placeholder="Tintorería, Guille…" />
            </div>
            <div>
              <span className="label">Fecha de pago</span>
              <input
                name="fecha_pago"
                type="date"
                defaultValue={gasto?.fecha_pago ?? new Date().toISOString().slice(0, 10)}
                className="input mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="label">Estado</span>
              <select name="estado" defaultValue={gasto?.estado ?? "Pagado"} className="input mt-1">
                <option>Pagado</option>
                <option>Pendiente</option>
                <option>Parcial</option>
              </select>
            </div>
            <div>
              <span className="label">Forma</span>
              <div className="mt-1 flex gap-2">
                {(["MP", "Efectivo"] as FormaPago[]).map((f) => (
                  <button
                    type="button"
                    key={f}
                    onClick={() => setForma(f)}
                    className={`flex-1 rounded-lg border-2 px-2 py-2 text-[12px] font-semibold ${
                      forma === f ? "border-[var(--azul-med)] bg-[var(--azul-clr)] text-[var(--azul)]" : "border-[var(--borde)]"
                    }`}
                  >
                    {f === "MP" ? "💳" : "💵"} {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <span className="label">Observaciones</span>
            <input name="obs" defaultValue={gasto?.obs} className="input mt-1" />
          </div>

          {error && <div className="rounded-md bg-[var(--rojo-clr)] px-3 py-2 text-xs text-[var(--rojo)]">{error}</div>}
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--borde)] px-4 py-3">
          <button type="button" onClick={onClose} className="btn btn-ghost">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
