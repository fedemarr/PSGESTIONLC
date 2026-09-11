"use client";

import { useEffect, useMemo, useState } from "react";
import type { Formacion, Grupo3T, Jugador, Partido, RugbyCategoria } from "@/lib/types";
import { GRUPO_META, fechaCorta } from "@/lib/format";
import { CATEGORIAS, CATEGORIA_META, titularesDe, suplentesDe } from "@/lib/rugby";
import { guardarFormacion, borrarFormacion } from "./actions";

interface Puesto {
  num: number;
  label: string;
  seccion: string;
}
const PUESTOS: Puesto[] = [
  { num: 1, label: "Pilar izquierdo", seccion: "Primera línea" },
  { num: 2, label: "Hooker", seccion: "Primera línea" },
  { num: 3, label: "Pilar derecho", seccion: "Primera línea" },
  { num: 4, label: "Segunda línea", seccion: "Segunda línea" },
  { num: 5, label: "Segunda línea", seccion: "Segunda línea" },
  { num: 6, label: "Tercera línea (6)", seccion: "Tercera línea" },
  { num: 7, label: "Tercera línea (7)", seccion: "Tercera línea" },
  { num: 8, label: "Tercera línea — N°8", seccion: "Tercera línea" },
  { num: 9, label: "Medio scrum", seccion: "Backs" },
  { num: 10, label: "Apertura", seccion: "Backs" },
  { num: 11, label: "Wing izquierdo", seccion: "Backs" },
  { num: 12, label: "Centro", seccion: "Backs" },
  { num: 13, label: "Centro", seccion: "Backs" },
  { num: 14, label: "Wing derecho", seccion: "Backs" },
  { num: 15, label: "Fullback", seccion: "Backs" },
];
const SECCIONES = ["Primera línea", "Segunda línea", "Tercera línea", "Backs"];
const GRUPOS: Grupo3T[] = ["Sabores express", "Mc Donalds", "Whisky"];

function buildEstado(formaciones: Formacion[], partidoId: string, categoria: RugbyCategoria) {
  const tit = titularesDe(formaciones, partidoId, categoria);
  const sup = suplentesDe(formaciones, partidoId, categoria);
  const titulares: (string | null)[] = Array(15).fill(null);
  let capitan: string | null = null;
  for (const f of tit) {
    if (f.puesto) titulares[f.puesto - 1] = f.jugador_id;
    if (f.capitan) capitan = f.jugador_id;
  }
  const suplentes: (string | null)[] = sup.map((f) => f.jugador_id);
  if (sup.some((f) => f.capitan)) capitan = sup.find((f) => f.capitan)!.jugador_id;
  return { titulares, suplentes, capitan };
}

export function FormacionesView({
  partidos,
  jugadores,
  formaciones,
}: {
  partidos: Partido[];
  jugadores: Jugador[];
  formaciones: Formacion[];
}) {
  const ordenados = useMemo(() => [...partidos].sort((a, b) => a.fecha.localeCompare(b.fecha)), [partidos]);
  const hoy = new Date().toISOString().slice(0, 10);
  const [partidoId, setPartidoId] = useState<string>(
    ordenados.find((p) => p.fecha >= hoy)?.id ?? ordenados[ordenados.length - 1]?.id ?? "",
  );
  const [categoria, setCategoria] = useState<RugbyCategoria>("Primera");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const partido = ordenados.find((p) => p.id === partidoId);
  const jugadorById = useMemo(() => new Map(jugadores.map((j) => [j.id, j])), [jugadores]);

  const derived = useMemo(() => buildEstado(formaciones, partidoId, categoria), [formaciones, partidoId, categoria]);
  const [titulares, setTitulares] = useState(derived.titulares);
  const [suplentes, setSuplentes] = useState(derived.suplentes);
  const [capitan, setCapitan] = useState(derived.capitan);
  useEffect(() => {
    setTitulares(derived.titulares);
    setSuplentes(derived.suplentes);
    setCapitan(derived.capitan);
    setError(null);
  }, [derived]);

  const usados = new Set([...titulares, ...suplentes].filter(Boolean) as string[]);
  const cantTitulares = titulares.filter(Boolean).length;
  const cantSuplentes = suplentes.filter(Boolean).length;
  const completo = cantTitulares === 15;

  function opcionesPara(actual: string | null) {
    return GRUPOS.map((g) => ({
      grupo: g,
      jugs: jugadores.filter((j) => j.grupo === g && (j.id === actual || !usados.has(j.id))),
    })).filter((x) => x.jugs.length > 0);
  }

  function setTitular(idx: number, jugId: string | null) {
    setTitulares((prev) => {
      const next = [...prev];
      const anterior = next[idx];
      next[idx] = jugId;
      if (anterior && anterior === capitan && anterior !== jugId) setCapitan(null);
      return next;
    });
  }
  function setSuplente(idx: number, jugId: string | null) {
    setSuplentes((prev) => {
      const next = [...prev];
      next[idx] = jugId;
      return next;
    });
  }
  function quitarSuplente(idx: number) {
    setSuplentes((prev) => prev.filter((_, i) => i !== idx));
  }
  function toggleCapitan(jugId: string | null) {
    if (!jugId) return;
    setCapitan((c) => (c === jugId ? null : jugId));
  }

  async function guardar() {
    if (!partido) return;
    setSaving(true);
    setError(null);
    const fd = new FormData();
    fd.set("data", JSON.stringify({ titulares, suplentes, capitan }));
    const res = await guardarFormacion(partido.id, categoria, fd);
    setSaving(false);
    if (res?.error) {
      setError(res.error);
      return;
    }
    setToast(`Formación ${categoria} guardada para ${partido.rival}`);
    setTimeout(() => setToast(null), 2500);
  }

  return (
    <div>
      <div className="card mb-4 flex flex-wrap items-center gap-3 p-3 px-4">
        <div className="flex flex-col gap-1">
          <span className="label">Partido</span>
          <select value={partidoId} onChange={(e) => setPartidoId(e.target.value)} className="input min-w-[240px]">
            {ordenados.map((p) => (
              <option key={p.id} value={p.id}>
                {fechaCorta(p.fecha)} — {p.rival} ({p.tipo})
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="label">Categoría</span>
          <div className="flex gap-1.5">
            {CATEGORIAS.map((c) => (
              <button
                key={c}
                onClick={() => setCategoria(c)}
                className="rounded-full border-2 px-3 py-1.5 text-[12px] font-bold"
                style={
                  categoria === c
                    ? { borderColor: CATEGORIA_META[c].color, background: CATEGORIA_META[c].bg, color: CATEGORIA_META[c].color }
                    : { borderColor: "var(--borde)" }
                }
              >
                {CATEGORIA_META[c].short}
              </button>
            ))}
          </div>
        </div>
        <span className="ml-auto text-[12px]" style={{ color: completo ? "var(--verde)" : "var(--muted, #888)" }}>
          {cantTitulares}/15 titulares cargados
        </span>
      </div>

      {!partido ? (
        <div className="card p-10 text-center text-neutral-400">Cargá partidos primero en el módulo Partidos.</div>
      ) : (
        <div className="grid gap-3.5 lg:grid-cols-[1fr_240px]">
          <div>
            <div className="card mb-3.5">
              <div className="card-header">
                Titulares <span className="opacity-70">{cantTitulares} / 15</span>
              </div>
              <div className="p-3">
                {SECCIONES.map((sec) => (
                  <div key={sec} className="mb-2.5">
                    <div className="mb-1 pl-10 text-[10px] font-bold uppercase tracking-wide text-neutral-400">{sec}</div>
                    {PUESTOS.filter((p) => p.seccion === sec).map((p) => {
                      const idx = p.num - 1;
                      const val = titulares[idx];
                      const jug = val ? jugadorById.get(val) : null;
                      const esCap = !!val && capitan === val;
                      return (
                        <div key={p.num} className="grid grid-cols-[32px_100px_1fr_28px_28px] items-center gap-2 border-b border-neutral-100 py-1.5 last:border-0 sm:grid-cols-[32px_120px_1fr_28px_28px]">
                          <div
                            className="grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold text-white"
                            style={{ background: esCap ? "var(--azul)" : "#0D2B45" }}
                            title={esCap ? "Capitán" : undefined}
                          >
                            {p.num}
                          </div>
                          <div className="truncate rounded bg-[var(--gris)] px-2 py-1 text-[11px] text-neutral-500" title={p.label}>
                            {p.label}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <select
                              value={val ?? ""}
                              onChange={(e) => setTitular(idx, e.target.value || null)}
                              className="input !py-1.5 text-[12px]"
                              style={val ? { borderColor: "var(--verde)", background: "#F0FFF4", color: "var(--verde)" } : undefined}
                            >
                              <option value="">— Seleccionar —</option>
                              {opcionesPara(val).map(({ grupo, jugs }) => (
                                <optgroup key={grupo} label={GRUPO_META[grupo].short}>
                                  {jugs.map((j) => (
                                    <option key={j.id} value={j.id}>
                                      {j.nombre}
                                      {j.apodo ? ` (${j.apodo})` : ""}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                            {jug && (
                              <span className="badge shrink-0" style={{ background: GRUPO_META[jug.grupo].bg, color: GRUPO_META[jug.grupo].color }}>
                                {GRUPO_META[jug.grupo].short.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleCapitan(val)}
                            disabled={!val}
                            title="Capitán"
                            className="grid h-7 w-7 place-items-center rounded border-2 text-[12px] font-bold disabled:opacity-30"
                            style={esCap ? { borderColor: "var(--azul)", background: "var(--azul)", color: "#fff" } : { borderColor: "var(--borde)" }}
                          >
                            C
                          </button>
                          <button
                            type="button"
                            onClick={() => setTitular(idx, null)}
                            className="grid h-7 w-7 place-items-center rounded-full text-neutral-300 hover:bg-[var(--rojo-clr)] hover:text-[var(--rojo)]"
                            title="Quitar"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                Suplentes <span className="opacity-70">{cantSuplentes}</span>
              </div>
              <div className="p-3">
                {suplentes.length === 0 && <p className="py-2 text-[12px] italic text-neutral-400">Sin suplentes cargados todavía</p>}
                {suplentes.map((val, i) => {
                  const jug = val ? jugadorById.get(val) : null;
                  return (
                    <div key={i} className="grid grid-cols-[32px_1fr_28px] items-center gap-2 border-b border-neutral-100 py-1.5 last:border-0">
                      <div className="grid h-7 w-7 place-items-center rounded-full bg-neutral-400 text-[9px] font-bold text-white">SUP</div>
                      <div className="flex items-center gap-1.5">
                        <select
                          value={val ?? ""}
                          onChange={(e) => setSuplente(i, e.target.value || null)}
                          className="input !py-1.5 text-[12px]"
                          style={val ? { borderColor: "var(--verde)", background: "#F0FFF4", color: "var(--verde)" } : undefined}
                        >
                          <option value="">— Seleccionar —</option>
                          {opcionesPara(val).map(({ grupo, jugs }) => (
                            <optgroup key={grupo} label={GRUPO_META[grupo].short}>
                              {jugs.map((j) => (
                                <option key={j.id} value={j.id}>
                                  {j.nombre}
                                  {j.apodo ? ` (${j.apodo})` : ""}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                        {jug && (
                          <span className="badge shrink-0" style={{ background: GRUPO_META[jug.grupo].bg, color: GRUPO_META[jug.grupo].color }}>
                            {GRUPO_META[jug.grupo].short.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => quitarSuplente(i)}
                        className="grid h-7 w-7 place-items-center rounded-full text-neutral-300 hover:bg-[var(--rojo-clr)] hover:text-[var(--rojo)]"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setSuplentes((s) => [...s, null])}
                  className="mt-2 w-full rounded-lg border-2 border-dashed border-[var(--borde)] py-2 text-[12px] font-semibold text-neutral-500 hover:border-[var(--azul)] hover:text-[var(--azul)]"
                >
                  + Agregar suplente
                </button>
              </div>
            </div>
          </div>

          {/* RESUMEN */}
          <div className="card sticky top-[70px] self-start">
            <div className="card-header">Resumen</div>
            <div className="max-h-[70vh] overflow-y-auto p-3">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-neutral-400">Titulares</div>
              {PUESTOS.map((p, i) => {
                const val = titulares[i];
                const jug = val ? jugadorById.get(val) : null;
                return (
                  <div key={p.num} className="flex items-center gap-1.5 border-b border-neutral-100 py-1 text-[11px] last:border-0">
                    <span
                      className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[9px] font-bold text-white"
                      style={{ background: val ? "#0D2B45" : "#ddd" }}
                    >
                      {p.num}
                    </span>
                    <span className="truncate">{jug ? jug.nombre + (capitan === val ? " (C)" : "") : <span className="italic text-neutral-300">—</span>}</span>
                  </div>
                );
              })}
              {suplentes.length > 0 && (
                <>
                  <div className="mb-1 mt-2.5 text-[10px] font-bold uppercase tracking-wide text-neutral-400">Suplentes</div>
                  {suplentes.map((val, i) => {
                    const jug = val ? jugadorById.get(val) : null;
                    return (
                      <div key={i} className="flex items-center gap-1.5 border-b border-neutral-100 py-1 text-[11px] last:border-0">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-neutral-400 text-[9px] font-bold text-white">S</span>
                        <span className="truncate">{jug ? jug.nombre : <span className="italic text-neutral-300">—</span>}</span>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {partido && (
        <div className="sticky bottom-0 mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--borde)] bg-white p-3 px-4 shadow-md">
          <span className="text-[12px]" style={{ color: completo ? "var(--verde)" : "var(--muted, #888)" }}>
            {completo ? `✓ Formación completa — ${cantTitulares} titulares, ${cantSuplentes} suplentes` : `Faltan ${15 - cantTitulares} titulares para poder guardar`}
          </span>
          <div className="flex items-center gap-2">
            {error && <span className="text-[12px] font-semibold text-[var(--rojo)]">{error}</span>}
            <button
              className="btn btn-ghost text-xs !text-[var(--rojo)]"
              onClick={() => confirm("¿Borrar toda la formación de esta categoría?") && borrarFormacion(partido.id, categoria)}
            >
              Borrar formación
            </button>
            <button className="btn btn-primary" disabled={!completo || saving} onClick={guardar}>
              {saving ? "Guardando…" : "Guardar formación"}
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-[var(--verde)] px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg">
          ✅ {toast}
        </div>
      )}
    </div>
  );
}
