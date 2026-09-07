"use client";

import { useMemo, useState } from "react";
import type { Grupo3T, Jugador } from "@/lib/types";
import { fmt, GRUPO_META } from "@/lib/format";
import { crearJugador, actualizarJugador, toggleActivoJugador } from "./actions";

const GRUPOS: Grupo3T[] = ["Sabores express", "Mc Donalds", "Whisky"];
const POSICIONES = [
  "Pilar izquierdo (1)", "Hooker (2)", "Pilar derecho (3)",
  "Segunda línea (4)", "Segunda línea (5)",
  "Tercera línea (6)", "Tercera línea (7)", "Tercera línea - N8",
  "Medio scrum (9)", "Apertura (10)", "Wing izquierdo (11)",
  "Centro (12)", "Centro (13)", "Wing derecho (14)", "Fullback (15)",
];

type Agrup = "grupo" | "camada" | "alfa";

export function JugadoresView({
  jugadores,
  deudas,
}: {
  jugadores: Jugador[];
  deudas: Record<string, number>;
}) {
  const [q, setQ] = useState("");
  const [grupo, setGrupo] = useState<Grupo3T | "">("");
  const [estado, setEstado] = useState<"" | "activo" | "inactivo">("");
  const [agrup, setAgrup] = useState<Agrup>("grupo");
  const [editing, setEditing] = useState<Jugador | null>(null);
  const [creating, setCreating] = useState(false);

  const activos = jugadores.filter((j) => j.activo);
  const conDeuda = activos.filter((j) => (deudas[j.id] ?? 0) < 0);

  const filtrados = useMemo(() => {
    const term = q.toLowerCase();
    return jugadores.filter((j) => {
      if (term && !j.nombre.toLowerCase().includes(term) && !j.apodo.toLowerCase().includes(term)) return false;
      if (grupo && j.grupo !== grupo) return false;
      if (estado === "activo" && !j.activo) return false;
      if (estado === "inactivo" && j.activo) return false;
      return true;
    });
  }, [jugadores, q, grupo, estado]);

  const grupos = useMemo(() => {
    const map = new Map<string, Jugador[]>();
    if (agrup === "grupo") {
      GRUPOS.forEach((g) => map.set(g, []));
      filtrados.forEach((j) => map.get(j.grupo)?.push(j));
    } else if (agrup === "camada") {
      [...filtrados]
        .sort((a, b) => (b.camada ?? 0) - (a.camada ?? 0))
        .forEach((j) => {
          const k = j.camada ? String(j.camada) : "Sin camada";
          if (!map.has(k)) map.set(k, []);
          map.get(k)!.push(j);
        });
    } else {
      map.set("Todos", [...filtrados].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    }
    return [...map.entries()].filter(([, arr]) => arr.length);
  }, [filtrados, agrup]);

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Plantel activo" value={activos.length} />
        <Stat label="Con deuda" value={conDeuda.length} tone="rojo" />
        <Stat label="Al día" value={activos.length - conDeuda.length} tone="verde" />
        {GRUPOS.map((g) => (
          <Stat key={g} label={GRUPO_META[g].short} value={activos.filter((j) => j.grupo === g).length} />
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          className="input max-w-[220px]"
          placeholder="🔍 Buscar nombre o apodo…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Chips value={grupo} onChange={(v) => setGrupo(v as Grupo3T | "")} options={[["", "Todos"], ...GRUPOS.map((g) => [g, GRUPO_META[g].short] as [string, string])]} />
        <Chips value={estado} onChange={(v) => setEstado(v as "" | "activo" | "inactivo")} options={[["", "Todos"], ["activo", "Activos"], ["inactivo", "Inactivos"]]} />
        <Chips value={agrup} onChange={(v) => setAgrup(v as Agrup)} options={[["grupo", "Por grupo"], ["camada", "Por camada"], ["alfa", "Alfabético"]]} />
        <button className="btn btn-primary ml-auto" onClick={() => setCreating(true)}>
          + Alta jugador
        </button>
      </div>

      {grupos.length === 0 && (
        <div className="card p-10 text-center text-neutral-400">Sin jugadores con esos filtros.</div>
      )}

      {grupos.map(([key, lista]) => (
        <div key={key} className="card mb-3.5">
          <div
            className="px-4 py-2.5 text-[12px] font-bold text-white"
            style={{ background: agrup === "grupo" ? GRUPO_META[key as Grupo3T]?.color ?? "#1F4E79" : "#1F4E79" }}
          >
            {key} <span className="font-normal opacity-70">({lista.length})</span>
          </div>
          <table className="table-base">
            <thead>
              <tr>
                <th>Jugador</th>
                <th>Apodo</th>
                <th>Camada</th>
                <th>Posición</th>
                <th>Estado</th>
                <th>Deuda</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((j) => {
                const d = deudas[j.id] ?? 0;
                return (
                  <tr key={j.id} className={j.activo ? "" : "opacity-50"}>
                    <td className="font-bold">{j.nombre}</td>
                    <td className="text-[12px] text-neutral-400">{j.apodo || "—"}</td>
                    <td>{j.camada ?? "—"}</td>
                    <td className="text-[12px]">{j.posicion || "—"}</td>
                    <td>
                      <span className={`badge ${j.activo ? "badge-verde" : "badge-gris"}`}>
                        {j.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${d < 0 ? "badge-rojo" : d === 0 ? "badge-gris" : "badge-verde"}`}>
                        {d < 0 ? fmt(d) : d === 0 ? "Al día" : "+" + fmt(d)}
                      </span>
                    </td>
                    <td className="text-right">
                      <button className="btn btn-ghost !px-2 !py-1" onClick={() => setEditing(j)}>
                        ✏️
                      </button>
                      <button
                        className="btn btn-ghost !px-2 !py-1"
                        onClick={() => toggleActivoJugador(j.id, !j.activo)}
                        title={j.activo ? "Dar de baja" : "Reactivar"}
                      >
                        {j.activo ? "🚫" : "↩️"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}

      {(creating || editing) && (
        <JugadorModal
          jugador={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: "rojo" | "verde" }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div
        className="stat-value"
        style={{ color: tone === "rojo" ? "var(--rojo)" : tone === "verde" ? "var(--verde)" : undefined }}
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

function JugadorModal({ jugador, onClose }: { jugador: Jugador | null; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function action(formData: FormData) {
    setSaving(true);
    setError(null);
    const res = jugador ? await actualizarJugador(jugador.id, formData) : await crearJugador(formData);
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
        className="w-full max-w-md rounded-xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between rounded-t-xl bg-[var(--azul)] px-4 py-3 text-white">
          <h2 className="text-[15px] font-bold">{jugador ? "Editar jugador" : "Alta de jugador"}</h2>
          <button type="button" onClick={onClose} className="opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4">
          <Field className="col-span-2" label="Apellido y nombre *">
            <input name="nombre" required defaultValue={jugador?.nombre} className="input" placeholder="Lopez Juan Ignacio" />
          </Field>
          <Field label="Apodo">
            <input name="apodo" defaultValue={jugador?.apodo} className="input" placeholder="JLO" />
          </Field>
          <Field label="Camada">
            <input name="camada" type="number" defaultValue={jugador?.camada ?? ""} className="input" placeholder="2001" />
          </Field>
          <Field label="Grupo 3T *">
            <select name="grupo" required defaultValue={jugador?.grupo ?? ""} className="input">
              <option value="">Seleccionar…</option>
              {GRUPOS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Posición">
            <select name="posicion" defaultValue={jugador?.posicion ?? ""} className="input">
              <option value="">Seleccionar…</option>
              {POSICIONES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
          <Field className="col-span-2" label="Observaciones">
            <input name="obs" defaultValue={jugador?.obs} className="input" />
          </Field>
          <label className="col-span-2 flex items-center gap-2 text-[13px]">
            <input type="checkbox" name="activo" defaultChecked={jugador ? jugador.activo : true} />
            Activo
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
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <span className="label">{label}</span>
      {children}
    </div>
  );
}
