"use client";

import { useMemo, useState } from "react";
import type { AccionPartido, Activacion, AjusteResultado, Cobro, Formacion, Gasto3T, Grupo3T, Jugador, Partido } from "@/lib/types";
import { fmt, GRUPO_META, CELDA_META, fechaCorta } from "@/lib/format";
import { activoEnFecha, comprasMontoMap, estadoCeldaJugador, montoPartido, partidosLocales } from "@/lib/business";
import { resumenFormaciones } from "@/lib/rugby";
import { crearJugador, actualizarJugador, darDeBaja, reactivar } from "./actions";

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
  partidos,
  cobros,
  gastos3t,
  activaciones,
  formaciones,
  acciones,
  ajustes,
  montoGlobal,
}: {
  jugadores: Jugador[];
  deudas: Record<string, number>;
  partidos: Partido[];
  cobros: Cobro[];
  gastos3t: Gasto3T[];
  activaciones: Activacion[];
  formaciones: Formacion[];
  acciones: AccionPartido[];
  ajustes: AjusteResultado[];
  montoGlobal: number;
}) {
  const [q, setQ] = useState("");
  const [grupo, setGrupo] = useState<Grupo3T | "">("");
  const [estado, setEstado] = useState<"" | "activo" | "inactivo">("");
  const [agrup, setAgrup] = useState<Agrup>("grupo");
  const [editing, setEditing] = useState<Jugador | null>(null);
  const [creating, setCreating] = useState(false);
  const [ficha, setFicha] = useState<Jugador | null>(null);
  const [bajaReactivar, setBajaReactivar] = useState<{ jugador: Jugador; modo: "baja" | "reactivar" } | null>(null);

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
          <div className="overflow-x-auto">
          <table className="table-base min-w-[640px]">
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
                  <tr key={j.id} className={`cursor-pointer ${j.activo ? "" : "opacity-50"}`} onClick={() => setFicha(j)}>
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
                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      <button className="btn btn-ghost !px-2 !py-1" onClick={() => setEditing(j)}>
                        ✏️
                      </button>
                      <button
                        className="btn btn-ghost !px-2 !py-1"
                        onClick={() => setBajaReactivar({ jugador: j, modo: j.activo ? "baja" : "reactivar" })}
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

      {bajaReactivar && (
        <BajaReactivarModal
          jugador={bajaReactivar.jugador}
          modo={bajaReactivar.modo}
          onClose={() => setBajaReactivar(null)}
        />
      )}

      {ficha && (
        <FichaJugador
          jugador={ficha}
          deuda={deudas[ficha.id] ?? 0}
          partidos={partidos}
          cobros={cobros}
          gastos3t={gastos3t}
          activaciones={activaciones}
          formaciones={formaciones}
          acciones={acciones}
          ajustes={ajustes}
          montoGlobal={montoGlobal}
          onClose={() => setFicha(null)}
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
        className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between rounded-t-xl bg-[var(--azul)] px-4 py-3 text-white">
          <h2 className="text-[15px] font-bold">{jugador ? "Editar jugador" : "Alta de jugador"}</h2>
          <button type="button" onClick={onClose} className="opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
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
          {!jugador && (
            <Field label="Fecha de alta">
              <input name="fecha_alta" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="input" />
            </Field>
          )}
          <Field className="col-span-2" label="Observaciones">
            <input name="obs" defaultValue={jugador?.obs} className="input" />
          </Field>
          {jugador && (
            <p className="col-span-2 text-[11px] text-neutral-400">
              El estado (activo/inactivo) se maneja con los botones 🚫 / ↩️ de la tabla, no desde acá — así queda
              registrada la fecha del cambio.
            </p>
          )}
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

function BajaReactivarModal({
  jugador,
  modo,
  onClose,
}: {
  jugador: Jugador;
  modo: "baja" | "reactivar";
  onClose: () => void;
}) {
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmar() {
    setSaving(true);
    setError(null);
    const res = modo === "baja" ? await darDeBaja(jugador.id, fecha) : await reactivar(jugador.id, fecha);
    if (res?.error) {
      setError(res.error);
      setSaving(false);
      return;
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-xl bg-white shadow-2xl">
        <div
          className="rounded-t-xl px-4 py-3 text-white"
          style={{ background: modo === "baja" ? "var(--rojo)" : "var(--verde)" }}
        >
          <h2 className="text-[15px] font-bold">{modo === "baja" ? "Dar de baja" : "Reactivar"} a {jugador.nombre}</h2>
        </div>
        <div className="space-y-3 p-4">
          <p className="text-[13px] text-neutral-600">
            {modo === "baja"
              ? "Desde esta fecha en adelante, los partidos sin cobro registrado no le van a generar deuda automática. Los cobros ya cargados se siguen mostrando igual."
              : "Desde esta fecha en adelante vuelve a generar deuda automática en los partidos sin cobro registrado."}
          </p>
          <div>
            <span className="label">Fecha</span>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="input mt-1" />
          </div>
          {error && <div className="rounded-md bg-[var(--rojo-clr)] px-3 py-2 text-xs text-[var(--rojo)]">{error}</div>}
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--borde)] px-4 py-3">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={saving} onClick={confirmar}>
            {saving ? "Guardando…" : "Confirmar"}
          </button>
        </div>
      </div>
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

// ════════════════════════════ Ficha lateral (Mejora 6) ════════════════════════════

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  return (partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "");
}

function FichaJugador({
  jugador,
  deuda,
  partidos,
  cobros,
  gastos3t,
  activaciones,
  formaciones,
  acciones,
  ajustes,
  montoGlobal,
  onClose,
}: {
  jugador: Jugador;
  deuda: number;
  partidos: Partido[];
  cobros: Cobro[];
  gastos3t: Gasto3T[];
  activaciones: Activacion[];
  formaciones: Formacion[];
  acciones: AccionPartido[];
  ajustes: AjusteResultado[];
  montoGlobal: number;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"cobros" | "formaciones">("cobros");
  const locales = useMemo(() => partidosLocales(partidos), [partidos]);
  const comprasMap = useMemo(() => comprasMontoMap(gastos3t), [gastos3t]);
  const cobrosByPartido = useMemo(
    () => new Map(cobros.filter((c) => c.jugador_id === jugador.id).map((c) => [c.partido_id, c])),
    [cobros, jugador.id],
  );
  const conRegistros = useMemo(
    () =>
      new Set<string>([
        ...cobros.map((c) => c.partido_id),
        ...gastos3t.filter((g) => g.es_jugador_plantel).map((g) => g.partido_id),
      ]),
    [cobros, gastos3t],
  );

  const filas = locales.map((p) => {
    const m = montoPartido(p, montoGlobal);
    const e = estadoCeldaJugador({
      cobro: cobrosByPartido.get(p.id),
      comprasMonto: comprasMap.get(`${jugador.nombre}:${p.id}`) ?? 0,
      monto3T: m,
      partido: p,
      partidoConRegistros: conRegistros.has(p.id),
      activoEnFecha: activoEnFecha(activaciones, jugador.id, p.fecha),
    });
    return { p, e };
  });

  const relevantes = filas.filter(({ e }) => e.estado !== "pendiente");
  const jugados = relevantes.length;
  const pagados = relevantes.filter(({ e }) => ["saldado", "compra", "acordado"].includes(e.estado)).length;

  const scoring = useMemo(() => {
    const propias = acciones.filter((a) => a.equipo === "cedros" && a.jugador_id === jugador.id);
    const out = { tries: 0, conv: 0, penales: 0, puntos: 0, am: 0, rj: 0 };
    for (const a of propias) {
      if (a.tipo === "try") out.tries++;
      else if (a.tipo === "conv") out.conv++;
      else if (a.tipo === "penal") out.penales++;
      else if (a.tipo === "am") out.am++;
      else if (a.tipo === "rj") out.rj++;
      out.puntos += { try: 5, conv: 2, penal: 3, am: 0, rj: 0 }[a.tipo];
    }
    return out;
  }, [acciones, jugador.id]);

  const form = useMemo(
    () => resumenFormaciones(jugador.id, partidos, formaciones, acciones, ajustes),
    [jugador.id, partidos, formaciones, acciones, ajustes],
  );
  const enPrimera = form.hist.filter((h) => h.categoria === "Primera").length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-[420px] flex-col overflow-y-auto bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 text-white" style={{ background: GRUPO_META[jugador.grupo].color }}>
          <button onClick={onClose} className="float-right opacity-70 hover:opacity-100">
            ✕
          </button>
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/20 text-[16px] font-extrabold">
              {iniciales(jugador.nombre)}
            </div>
            <div>
              <div className="text-lg font-extrabold leading-tight">{jugador.nombre}</div>
              <div className="mt-0.5 text-[12px] opacity-85">
                {jugador.apodo && `"${jugador.apodo}" · `}
                {jugador.posicion || "Sin posición"}
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="badge" style={{ background: "rgba(255,255,255,.25)", color: "#fff" }}>
              {jugador.grupo}
            </span>
            <span className="badge" style={{ background: "rgba(255,255,255,.25)", color: "#fff" }}>
              {jugador.activo ? "Activo" : "Inactivo"}
            </span>
          </div>
        </div>

        <div className="p-4">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-neutral-400">💳 Cobros 3T</div>
          <div className="mb-3 grid grid-cols-3 gap-2 text-center">
            <MiniStat label="Partidos" value={jugados} />
            <MiniStat label="Pagados" value={pagados} tone="verde" />
            <MiniStat label="Deuda" value={deuda < 0 ? fmt(deuda) : "$0"} tone={deuda < 0 ? "rojo" : "verde"} />
          </div>

          {(scoring.tries > 0 || scoring.conv > 0 || scoring.penales > 0 || form.total > 0) && (
            <>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-neutral-400">🏉 Puntuación temporada</div>
              <div className="mb-3 grid grid-cols-4 gap-2 text-center">
                <MiniStat label="Tries" value={scoring.tries} style={{ color: "#1F4E79" }} />
                <MiniStat label="Conv." value={scoring.conv} style={{ color: "#375623" }} />
                <MiniStat label="Penales" value={scoring.penales} style={{ color: "#843C0C" }} />
                <MiniStat label="Puntos" value={scoring.puntos} tone="verde" />
              </div>

              <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-neutral-400">📋 Resultados en formación</div>
              <div className="mb-3 grid grid-cols-4 gap-2 text-center">
                <MiniStat label="Jugados" value={form.total} />
                <MiniStat label="✅ Ganados" value={form.gan} tone="verde" />
                <MiniStat label="❌ Perdidos" value={form.per} tone="rojo" />
                <MiniStat label="🟡 Empatados" value={form.emp} style={{ color: "#7D6608" }} />
              </div>

              {(scoring.am > 0 || scoring.rj > 0) && (
                <>
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-neutral-400">🟨🟥 Tarjetas temporada</div>
                  <div className="mb-3 grid grid-cols-3 gap-2 text-center">
                    <MiniStat label="🟨 Amarillas" value={scoring.am || "—"} style={{ color: "#92400E" }} />
                    <MiniStat label="🟥 Rojas" value={scoring.rj || "—"} tone="rojo" />
                    <MiniStat label="En Primera" value={enPrimera} style={{ color: "#1F4E79" }} />
                  </div>
                </>
              )}
            </>
          )}

          <div
            className="mb-4 rounded-lg p-3 text-center font-bold"
            style={{
              background: deuda < 0 ? "var(--rojo-clr)" : "var(--verde-clr)",
              color: deuda < 0 ? "var(--rojo)" : "var(--verde)",
            }}
          >
            {deuda < 0 ? `Deuda total ${fmt(deuda)}` : "Sin deuda — al día ✓"}
          </div>

          <div className="mb-3 flex gap-1 border-b border-[var(--borde)]">
            <button
              onClick={() => setTab("cobros")}
              className={`-mb-px border-b-2 px-3 py-1.5 text-[12px] font-semibold ${tab === "cobros" ? "border-[var(--azul)] text-[var(--azul)]" : "border-transparent text-neutral-400"}`}
            >
              💳 Cobros
            </button>
            <button
              onClick={() => setTab("formaciones")}
              className={`-mb-px border-b-2 px-3 py-1.5 text-[12px] font-semibold ${tab === "formaciones" ? "border-[var(--azul)] text-[var(--azul)]" : "border-transparent text-neutral-400"}`}
            >
              📋 Formaciones
            </button>
          </div>

          {tab === "cobros" ? (
            <>
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-neutral-400">Historial de cobros</div>
              {filas.length === 0 ? (
                <p className="py-6 text-center text-[13px] text-neutral-400">Sin partidos locales cargados.</p>
              ) : (
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Rival</th>
                      <th>Estado</th>
                      <th className="!text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map(({ p, e }) => {
                      const meta = CELDA_META[e.estado];
                      return (
                        <tr key={p.id}>
                          <td className="whitespace-nowrap font-bold text-[var(--azul)]">{fechaCorta(p.fecha)}</td>
                          <td className="text-[12px] text-neutral-600">{p.rival}</td>
                          <td>
                            <span className="badge" style={{ background: meta.bg, color: meta.fg }}>
                              {e.estado === "parcial" ? `Falta ${fmt(Math.abs(e.diff))}` : meta.label || "—"}
                            </span>
                          </td>
                          <td className="!text-right font-bold">{e.monto != null ? fmt(e.monto) : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </>
          ) : (
            <>
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-neutral-400">Partidos en formación</div>
              {form.hist.length === 0 ? (
                <p className="py-6 text-center text-[13px] text-neutral-400">Sin partidos en formaciones.</p>
              ) : (
                <div className="space-y-1">
                  {form.hist.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-md bg-[var(--gris)] px-2.5 py-1.5">
                      <div className="min-w-[38px] text-[11px] font-bold text-[var(--azul)]">{fechaCorta(h.partido.fecha)}</div>
                      <div className="flex-1 truncate text-[11px] text-neutral-600">{h.partido.rival}</div>
                      <span className="badge" style={{ background: "#EBF3FB", color: "#1F4E79" }}>
                        {h.categoria === "Pre-intermedia" ? "Pre" : h.categoria}
                      </span>
                      {h.am > 0 && <span className="text-[10px]">🟨×{h.am}</span>}
                      {h.rj > 0 && <span className="text-[10px]">🟥×{h.rj}</span>}
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                        style={
                          h.res === "W"
                            ? { background: "var(--verde-clr)", color: "var(--verde)" }
                            : h.res === "L"
                              ? { background: "var(--rojo-clr)", color: "var(--rojo)" }
                              : { background: "var(--amarillo)", color: "#7D6608" }
                        }
                      >
                        {h.ptsCedros}—{h.ptsRival} {h.res === "W" ? "✅" : h.res === "L" ? "❌" : "🟡"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
  style,
}: {
  label: string;
  value: string | number;
  tone?: "rojo" | "verde";
  style?: React.CSSProperties;
}) {
  return (
    <div className="rounded-md bg-[var(--gris)] p-2">
      <div className="text-[10px] text-neutral-500">{label}</div>
      <div
        className="text-[15px] font-extrabold"
        style={style ?? { color: tone === "rojo" ? "var(--rojo)" : tone === "verde" ? "var(--verde)" : "var(--azul)" }}
      >
        {value}
      </div>
    </div>
  );
}
