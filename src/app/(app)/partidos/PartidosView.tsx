"use client";

import { useMemo, useState } from "react";
import type { Partido, PartidoTipo } from "@/lib/types";
import { fmt, fechaDisplay, mesLabel, estadoPartido } from "@/lib/format";
import { crearPartido, actualizarPartido, eliminarPartido, setMontoGlobal } from "./actions";

export function PartidosView({ partidos, montoGlobal }: { partidos: Partido[]; montoGlobal: number }) {
  const [tipo, setTipo] = useState<"" | PartidoTipo>("");
  const [estado, setEstado] = useState<"" | "proximo" | "jugado">("");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Partido | null>(null);
  const [creating, setCreating] = useState(false);
  const [monto, setMonto] = useState(montoGlobal);

  const locales = partidos.filter((p) => p.tipo === "Local").length;
  const jugados = partidos.filter((p) => p.jugado).length;

  const lista = useMemo(() => {
    const term = q.toLowerCase();
    return [...partidos]
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .filter((p) => (!tipo || p.tipo === tipo))
      .filter((p) => {
        if (estado === "jugado") return p.jugado;
        if (estado === "proximo") return !p.jugado;
        return true;
      })
      .filter((p) => !term || p.rival.toLowerCase().includes(term));
  }, [partidos, tipo, estado, q]);

  const porMes = useMemo(() => {
    const map = new Map<string, Partido[]>();
    lista.forEach((p) => {
      const k = mesLabel(p.fecha);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(p);
    });
    return [...map.entries()];
  }, [lista]);

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total partidos" value={partidos.length} sub={`${locales} locales · ${partidos.length - locales} visitantes`} />
        <Stat label="Locales" value={locales} tone="verde" sub="con 3T" />
        <Stat label="Visitantes" value={partidos.length - locales} sub="solo gastos" />
        <Stat label="Jugados" value={jugados} sub={`${partidos.length - jugados} por jugar`} />
      </div>

      <div className="card mb-4 flex flex-wrap items-center gap-4 p-3 px-4">
        <span className="text-[12px] font-bold text-[var(--azul)]">⚙️ Monto 3T global</span>
        <input
          type="number"
          className="input max-w-[130px]"
          value={monto}
          onChange={(e) => setMonto(Number(e.target.value))}
        />
        <button className="btn btn-ghost" onClick={() => setMontoGlobal(monto)}>
          Guardar
        </button>
        <span className="text-[12px] text-neutral-500">Aplica a partidos futuros sin monto propio.</span>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Chips value={tipo} onChange={(v) => setTipo(v as "" | PartidoTipo)} options={[["", "Todos"], ["Local", "🏠 Locales"], ["Visitante", "🚌 Visitantes"]]} />
        <Chips value={estado} onChange={(v) => setEstado(v as "" | "proximo" | "jugado")} options={[["", "Todos"], ["proximo", "🟠 Próximos"], ["jugado", "✅ Jugados"]]} />
        <input className="input max-w-[170px]" placeholder="Buscar rival…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn btn-primary ml-auto" onClick={() => setCreating(true)}>
          + Nuevo partido
        </button>
      </div>

      {porMes.length === 0 && <div className="card p-10 text-center text-neutral-400">Sin partidos.</div>}

      {porMes.map(([mes, ps]) => (
        <div key={mes} className="mb-4">
          <div className="mb-2 border-b border-[var(--borde)] pb-1.5 text-[12px] font-bold uppercase tracking-wide text-neutral-500">
            {mes}
          </div>
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {ps.map((p) => {
              const est = estadoPartido(p);
              const local = p.tipo === "Local";
              const m = p.monto_3t ?? montoGlobal;
              return (
                <div key={p.id} className="card transition-shadow hover:shadow-md">
                  <div
                    className="h-1"
                    style={{ background: est !== "jugado" ? "#843C0C" : local ? "#375623" : "#2E75B6" }}
                  />
                  <div className="flex items-start justify-between p-3.5">
                    <div>
                      <div className="text-[11px] font-bold uppercase text-neutral-400">{fechaDisplay(p.fecha)}</div>
                      <div className="text-[15px] font-extrabold">vs {p.rival}</div>
                      {p.obs && <div className="mt-0.5 text-[11px] text-neutral-400">{p.obs}</div>}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`badge ${local ? "badge-verde" : "badge-azul"}`}>{local ? "🏠 Local" : "🚌 Visit."}</span>
                      <span className={`badge ${est === "hoy" ? "badge-rojo" : est === "jugado" ? "badge-gris" : "badge-amarillo"}`}>
                        {est === "hoy" ? "HOY 🔥" : est === "jugado" ? "Jugado" : "Próximo"}
                      </span>
                    </div>
                  </div>
                  {local ? (
                    <div className="flex justify-between border-y border-[var(--borde)] bg-[var(--gris)] px-3.5 py-1.5 text-[12px]">
                      <span className="text-neutral-500">Monto 3T</span>
                      <span className="font-extrabold text-[var(--azul)]">{fmt(m)}/persona</span>
                    </div>
                  ) : (
                    <div className="border-t border-[var(--borde)] bg-[var(--azul-clr)] px-3.5 py-1.5 text-[12px] text-[var(--azul)]">
                      🚌 Visitante — sin cobros de 3T
                    </div>
                  )}
                  <div className="flex justify-end gap-1.5 p-2 px-3.5">
                    <button className="btn btn-ghost !py-1 text-xs" onClick={() => setEditing(p)}>
                      ✏️ Editar
                    </button>
                    <button
                      className="btn btn-ghost !py-1 text-xs !text-[var(--rojo)]"
                      onClick={() => {
                        if (confirm(`¿Eliminar partido vs ${p.rival}?`)) eliminarPartido(p.id);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {(creating || editing) && (
        <PartidoModal
          partido={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: number | string; sub?: string; tone?: "verde" }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color: tone === "verde" ? "var(--verde)" : undefined }}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-neutral-400">{sub}</div>}
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

function PartidoModal({ partido, onClose }: { partido: Partido | null; onClose: () => void }) {
  const [tipo, setTipo] = useState<PartidoTipo>(partido?.tipo ?? "Local");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function action(formData: FormData) {
    setSaving(true);
    setError(null);
    const res = partido ? await actualizarPartido(partido.id, formData) : await crearPartido(formData);
    if (res?.error) {
      setError(res.error);
      setSaving(false);
      return;
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <form action={action} onClick={(e) => e.stopPropagation()} className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between rounded-t-xl bg-[var(--azul)] px-4 py-3 text-white">
          <h2 className="text-[15px] font-bold">{partido ? `Editar — vs ${partido.rival}` : "Agregar partido"}</h2>
          <button type="button" onClick={onClose} className="opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
          <div className="col-span-2 flex gap-2">
            {(["Local", "Visitante"] as PartidoTipo[]).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setTipo(t)}
                className={`flex-1 rounded-lg border-2 px-3 py-2 text-[13px] font-semibold ${
                  tipo === t
                    ? t === "Local"
                      ? "border-[var(--verde)] bg-[var(--verde-clr)] text-[var(--verde)]"
                      : "border-[var(--azul-med)] bg-[var(--azul-clr)] text-[var(--azul)]"
                    : "border-[var(--borde)]"
                }`}
              >
                {t === "Local" ? "🏠 Local" : "🚌 Visitante"}
              </button>
            ))}
            <input type="hidden" name="tipo" value={tipo} />
          </div>
          <Field label="Fecha *">
            <input name="fecha" type="date" required defaultValue={partido?.fecha} className="input" />
          </Field>
          <Field label="Rival *">
            <input name="rival" required defaultValue={partido?.rival} className="input" placeholder="Banco Hipotecario" />
          </Field>
          {tipo === "Local" && (
            <Field label="Monto 3T ($)">
              <input
                name="monto_3t"
                type="number"
                defaultValue={partido?.monto_3t ?? ""}
                className="input"
                placeholder="Vacío = usa el global"
              />
            </Field>
          )}
          <Field label="Observaciones">
            <input name="obs" defaultValue={partido?.obs} className="input" />
          </Field>
          <label className="col-span-2 flex items-center gap-2 text-[13px]">
            <input type="checkbox" name="jugado" defaultChecked={partido?.jugado ?? false} />
            Ya se jugó
          </label>
          {error && (
            <div className="col-span-2 rounded-md bg-[var(--rojo-clr)] px-3 py-2 text-xs text-[var(--rojo)]">{error}</div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--borde)] px-4 py-3">
          <button type="button" onClick={onClose} className="btn btn-ghost">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? "Guardando…" : "Guardar partido"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="label">{label}</span>
      {children}
    </div>
  );
}
