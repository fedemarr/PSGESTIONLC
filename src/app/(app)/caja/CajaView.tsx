"use client";

import { useMemo, useState } from "react";
import type { CajaMovimiento, FormaPago, MovTipo } from "@/lib/types";
import { fmt, fmtS, fmtFecha } from "@/lib/format";
import { saldoFondo, totalPorFondo } from "@/lib/business";
import { crearMovimientoManual, eliminarMovimiento } from "./actions";

export function CajaView({ movimientos }: { movimientos: CajaMovimiento[] }) {
  const [fondo, setFondo] = useState<"" | FormaPago>("");
  const [tipo, setTipo] = useState<"" | MovTipo>("");
  const [origen, setOrigen] = useState("");
  const [q, setQ] = useState("");
  const [modal, setModal] = useState<null | { tipo: MovTipo; fondo: FormaPago }>(null);

  const sMP = saldoFondo(movimientos, "MP");
  const sEF = saldoFondo(movimientos, "Efectivo");

  // saldo corrido (orden cronológico)
  const corrido = useMemo(() => {
    const asc = [...movimientos].sort(
      (a, b) => a.fecha.localeCompare(b.fecha) || a.created_at.localeCompare(b.created_at),
    );
    const map = new Map<string, { mp: number; ef: number }>();
    let mp = 0;
    let ef = 0;
    for (const m of asc) {
      if (m.fondo === "MP") mp += m.tipo === "Ingreso" ? m.monto : -m.monto;
      else ef += m.tipo === "Ingreso" ? m.monto : -m.monto;
      map.set(m.id, { mp, ef });
    }
    return map;
  }, [movimientos]);

  const filtrados = useMemo(() => {
    const term = q.toLowerCase();
    return [...movimientos]
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.created_at.localeCompare(a.created_at))
      .filter((m) => !fondo || m.fondo === fondo)
      .filter((m) => !tipo || m.tipo === tipo)
      .filter((m) => !origen || m.origen === origen)
      .filter((m) => !term || m.concepto.toLowerCase().includes(term));
  }, [movimientos, fondo, tipo, origen, q]);

  const origenes = [...new Set(movimientos.map((m) => m.origen))];

  return (
    <div>
      <div className="mb-4 grid gap-3.5 md:grid-cols-2">
        <FondoCard nombre="💳 Mercado Pago" sub="Cuenta de Toro (Francisco Spaventa)" color="#009EE3"
          saldo={sMP} ing={totalPorFondo(movimientos, "MP", "Ingreso")} egr={totalPorFondo(movimientos, "MP", "Egreso")}
          count={movimientos.filter((m) => m.fondo === "MP").length}
          onIngreso={() => setModal({ tipo: "Ingreso", fondo: "MP" })}
          onEgreso={() => setModal({ tipo: "Egreso", fondo: "MP" })}
        />
        <FondoCard nombre="💵 Efectivo" sub="Dinero en mano — tesorero" color="#375623"
          saldo={sEF} ing={totalPorFondo(movimientos, "Efectivo", "Ingreso")} egr={totalPorFondo(movimientos, "Efectivo", "Egreso")}
          count={movimientos.filter((m) => m.fondo === "Efectivo").length}
          onIngreso={() => setModal({ tipo: "Ingreso", fondo: "Efectivo" })}
          onEgreso={() => setModal({ tipo: "Egreso", fondo: "Efectivo" })}
        />
      </div>

      <div className="mb-4 flex items-center justify-between rounded-lg bg-[var(--azul)] px-5 py-3.5 text-white">
        <div>
          <div className="text-[11px] opacity-65">TOTAL DISPONIBLE</div>
          <div className="text-[26px] font-extrabold">{fmtS(sMP + sEF)}</div>
        </div>
        <div className="flex gap-5 text-right text-[13px]">
          <div>
            <div className="text-[10px] opacity-60">MP</div>
            <div className="font-bold text-[#7FDBFF]">{fmtS(sMP)}</div>
          </div>
          <div>
            <div className="text-[10px] opacity-60">Efectivo</div>
            <div className="font-bold text-[#A8E6CF]">{fmtS(sEF)}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Historial de movimientos</div>
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--borde)] p-3 px-4">
          <Chips value={fondo} onChange={(v) => setFondo(v as "" | FormaPago)} options={[["", "Todos"], ["MP", "💳 MP"], ["Efectivo", "💵 Efectivo"]]} />
          <Chips value={tipo} onChange={(v) => setTipo(v as "" | MovTipo)} options={[["", "Todos"], ["Ingreso", "⬆ Ingresos"], ["Egreso", "⬇ Egresos"]]} />
          <select className="input max-w-[150px]" value={origen} onChange={(e) => setOrigen(e.target.value)}>
            <option value="">Todos los orígenes</option>
            {origenes.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <input className="input max-w-[160px]" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Concepto</th>
                <th>Origen</th>
                <th>Tipo</th>
                <th>Fondo</th>
                <th className="!text-right">Monto</th>
                <th className="!text-right">Saldo MP</th>
                <th className="!text-right">Saldo Ef.</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((m) => {
                const s = corrido.get(m.id) ?? { mp: 0, ef: 0 };
                const ing = m.tipo === "Ingreso";
                return (
                  <tr key={m.id} style={{ borderLeft: `3px solid ${ing ? "var(--verde)" : "var(--rojo)"}` }}>
                    <td className="whitespace-nowrap font-semibold text-neutral-600">{fmtFecha(m.fecha)}</td>
                    <td>{m.concepto}</td>
                    <td>
                      <span className="badge badge-gris">{m.origen}</span>
                    </td>
                    <td>
                      <span className={`badge ${ing ? "badge-verde" : "badge-rojo"}`}>{m.tipo}</span>
                    </td>
                    <td>
                      <span className="badge badge-azul">{m.fondo === "MP" ? "💳 MP" : "💵 Ef."}</span>
                    </td>
                    <td className="!text-right font-extrabold" style={{ color: ing ? "var(--verde)" : "var(--rojo)" }}>
                      {ing ? "+" : "-"}
                      {fmt(m.monto)}
                    </td>
                    <td className="!text-right text-[11px] text-neutral-500">{fmtS(s.mp)}</td>
                    <td className="!text-right text-[11px] text-neutral-500">{fmtS(s.ef)}</td>
                    <td>
                      {m.origen === "Manual" && (
                        <button
                          className="btn btn-ghost !px-2 !py-1 !text-[var(--rojo)]"
                          onClick={() => confirm("¿Eliminar este movimiento?") && eliminarMovimiento(m.id)}
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-neutral-400">
                    Sin movimientos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && <MovModal init={modal} onClose={() => setModal(null)} />}
    </div>
  );
}

function FondoCard(props: {
  nombre: string;
  sub: string;
  color: string;
  saldo: number;
  ing: number;
  egr: number;
  count: number;
  onIngreso: () => void;
  onEgreso: () => void;
}) {
  return (
    <div className="card">
      <div className="px-4 py-3.5 text-white" style={{ background: props.color }}>
        <div className="text-[15px] font-extrabold">{props.nombre}</div>
        <div className="text-[11px] opacity-80">{props.sub}</div>
      </div>
      <div className="border-b border-[var(--borde)] px-4 py-3.5">
        <div className="text-[11px] text-neutral-500">Saldo actual</div>
        <div className="text-[26px] font-extrabold" style={{ color: props.saldo >= 0 ? "var(--verde)" : "var(--rojo)" }}>
          {fmtS(props.saldo)}
        </div>
      </div>
      <div className="flex border-b border-[var(--borde)] text-center">
        <Mini label="Ingresos" value={fmt(props.ing)} tone="verde" />
        <Mini label="Egresos" value={fmt(props.egr)} tone="rojo" />
        <Mini label="Movimientos" value={String(props.count)} />
      </div>
      <div className="flex gap-2 p-3 px-3.5">
        <button className="btn text-xs text-white" style={{ background: props.color }} onClick={props.onIngreso}>
          ⬆ Ingreso
        </button>
        <button className="btn btn-ghost text-xs" onClick={props.onEgreso}>
          ⬇ Egreso
        </button>
      </div>
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: "verde" | "rojo" }) {
  return (
    <div className="flex-1 border-r border-[var(--borde)] px-3 py-2 last:border-r-0">
      <div className="text-[10px] text-neutral-500">{label}</div>
      <div
        className="text-[13px] font-bold"
        style={{ color: tone === "verde" ? "var(--verde)" : tone === "rojo" ? "var(--rojo)" : undefined }}
      >
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
            value === v ? "bg-[var(--azul)] text-white" : "bg-white text-neutral-600 border border-[var(--borde)]"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function MovModal({ init, onClose }: { init: { tipo: MovTipo; fondo: FormaPago }; onClose: () => void }) {
  const [tipo, setTipo] = useState<MovTipo>(init.tipo);
  const [fondo, setFondo] = useState<FormaPago>(init.fondo);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function action(formData: FormData) {
    setSaving(true);
    setError(null);
    const res = await crearMovimientoManual(formData);
    if (res?.error) {
      setError(res.error);
      setSaving(false);
      return;
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <form action={action} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between rounded-t-xl px-4 py-3 text-white"
          style={{ background: tipo === "Ingreso" ? "var(--verde)" : "var(--rojo)" }}>
          <h2 className="text-[15px] font-bold">Movimiento manual</h2>
          <button type="button" onClick={onClose} className="opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
        <div className="space-y-3 p-4">
          <div className="flex gap-2">
            {(["Ingreso", "Egreso"] as MovTipo[]).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setTipo(t)}
                className={`flex-1 rounded-lg border-2 px-3 py-2 text-[13px] font-semibold ${
                  tipo === t
                    ? t === "Ingreso"
                      ? "border-[var(--verde)] bg-[var(--verde-clr)] text-[var(--verde)]"
                      : "border-[var(--rojo)] bg-[var(--rojo-clr)] text-[var(--rojo)]"
                    : "border-[var(--borde)]"
                }`}
              >
                {t === "Ingreso" ? "⬆ Ingreso" : "⬇ Egreso"}
              </button>
            ))}
            <input type="hidden" name="tipo" value={tipo} />
          </div>
          <div>
            <span className="label">Concepto *</span>
            <input name="concepto" required className="input mt-1" placeholder="Descripción del movimiento" />
          </div>
          <div>
            <span className="label">Monto ($) *</span>
            <input name="monto" type="number" required className="input mt-1" placeholder="0" />
          </div>
          <div className="flex gap-2">
            {(["MP", "Efectivo"] as FormaPago[]).map((f) => (
              <button
                type="button"
                key={f}
                onClick={() => setFondo(f)}
                className={`flex-1 rounded-lg border-2 px-3 py-2 text-[13px] font-semibold ${
                  fondo === f ? "border-[var(--azul-med)] bg-[var(--azul-clr)] text-[var(--azul)]" : "border-[var(--borde)]"
                }`}
              >
                {f === "MP" ? "💳 MP" : "💵 Efectivo"}
              </button>
            ))}
            <input type="hidden" name="fondo" value={fondo} />
          </div>
          <div>
            <span className="label">Fecha *</span>
            <input name="fecha" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="input mt-1" />
          </div>
          <div>
            <span className="label">Observaciones</span>
            <input name="obs" className="input mt-1" />
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
