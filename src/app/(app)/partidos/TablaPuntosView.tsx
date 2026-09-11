"use client";

import { useMemo, useState } from "react";
import type { AccionPartido, AjusteResultado, Formacion, Jugador, Partido, RugbyCategoria } from "@/lib/types";
import { fechaCorta, GRUPO_META } from "@/lib/format";
import { CATEGORIAS, CATEGORIA_META, resumenFormaciones, tablaPuntos, type FilaTablaPuntos } from "@/lib/rugby";

type Orden = "puntos" | "tries" | "pctGanados" | "ptsPorPartido" | "am" | "rj";
const ORDENES: [Orden, string][] = [
  ["puntos", "Por puntos"],
  ["tries", "Por tries"],
  ["pctGanados", "Por % ganados"],
  ["ptsPorPartido", "Por pts/partido"],
  ["am", "🟨 Amarillas"],
  ["rj", "🟥 Rojas"],
];

export function TablaPuntosView({
  jugadores,
  partidos,
  formaciones,
  acciones,
  ajustes,
}: {
  jugadores: Jugador[];
  partidos: Partido[];
  formaciones: Formacion[];
  acciones: AccionPartido[];
  ajustes: AjusteResultado[];
}) {
  const [filtro, setFiltro] = useState<RugbyCategoria | "">("");
  const [orden, setOrden] = useState<Orden>("puntos");
  const [sel, setSel] = useState<string | null>(null);

  const data = useMemo(
    () => tablaPuntos({ jugadores, partidos, formaciones, acciones, ajustes, categoria: filtro }).sort((a, b) => b[orden] - a[orden]),
    [jugadores, partidos, formaciones, acciones, ajustes, filtro, orden],
  );

  const totales = data.reduce(
    (s, d) => ({ pts: s.pts + d.puntos, t: s.t + d.tries, c: s.c + d.conv, p: s.p + d.penales, am: s.am + d.am, rj: s.rj + d.rj }),
    { pts: 0, t: 0, c: 0, p: 0, am: 0, rj: 0 },
  );

  const jugadorSel = sel ? jugadores.find((j) => j.id === sel) : null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Chip label="Todos" activo={filtro === ""} onClick={() => setFiltro("")} />
        {CATEGORIAS.map((c) => (
          <Chip key={c} label={CATEGORIA_META[c].short} activo={filtro === c} onClick={() => setFiltro(c)} />
        ))}
        <span className="mx-1 h-5 w-px bg-[var(--borde)]" />
        {ORDENES.map(([v, l]) => (
          <Chip key={v} label={l} activo={orden === v} onClick={() => setOrden(v)} />
        ))}
      </div>

      <div className="grid gap-3.5 lg:grid-cols-[1fr_320px]">
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-[12px]">
            <thead>
              <tr className="bg-[var(--azul)] text-white">
                <th className="px-2 py-2 text-left text-[10px]">#</th>
                <th className="px-2 py-2 text-left text-[10px]">Jugador</th>
                <th className="px-2 py-2 text-left text-[10px]">Gr.</th>
                <th className="px-2 py-2 text-right text-[10px]">Pts</th>
                <th className="px-2 py-2 text-right text-[10px]">Pts/P</th>
                <th className="px-2 py-2 text-right text-[10px]">Try</th>
                <th className="px-2 py-2 text-right text-[10px]">Conv</th>
                <th className="px-2 py-2 text-right text-[10px]">Pen</th>
                <th className="px-2 py-2 text-right text-[10px]">P</th>
                <th className="min-w-[90px] px-2 py-2 text-left text-[10px]">% Gan.</th>
                <th className="px-2 py-2 text-right text-[10px]">🟨</th>
                <th className="px-2 py-2 text-right text-[10px]">🟥</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d, i) => (
                <tr
                  key={d.jugadorId}
                  onClick={() => setSel(d.jugadorId)}
                  className={`cursor-pointer border-b border-neutral-100 hover:bg-[#F0F7FF] ${sel === d.jugadorId ? "bg-[var(--azul-clr)]" : ""}`}
                >
                  <td className="px-2 py-1.5">
                    <span
                      className="grid h-5 w-5 place-items-center rounded-full text-[9px] font-bold"
                      style={
                        i === 0
                          ? { background: "gold", color: "#7A5800" }
                          : i === 1
                            ? { background: "#C0C0C0", color: "#555" }
                            : i === 2
                              ? { background: "#CD7F32", color: "#fff" }
                              : { background: "var(--gris)", color: "#888" }
                      }
                    >
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 font-bold">
                    {d.nombre}
                    {d.apodo && <span className="ml-1 font-normal text-neutral-400">({d.apodo})</span>}
                  </td>
                  <td className="px-2 py-1.5">
                    <span className="badge" style={{ background: GRUPO_META[d.grupo].bg, color: GRUPO_META[d.grupo].color }}>
                      {GRUPO_META[d.grupo].short.slice(0, 2).toUpperCase()}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right text-[13px] font-extrabold text-[var(--azul)]">{d.puntos}</td>
                  <td className="px-2 py-1.5 text-right text-[11px] text-neutral-400">{d.ptsPorPartido}</td>
                  <td className="px-2 py-1.5 text-right">
                    <span className="badge" style={{ background: "#EBF3FB", color: "#1F4E79" }}>
                      {d.tries}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <span className="badge" style={{ background: "#EAF4EE", color: "#375623" }}>
                      {d.conv}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <span className="badge" style={{ background: "#FDF1EC", color: "#843C0C" }}>
                      {d.penales}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right text-[11px] text-neutral-400">{d.partidosJugados}</td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 min-w-[30px] flex-1 rounded-full bg-neutral-100">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${d.pctGanados}%`, background: d.pctGanados >= 50 ? "var(--verde)" : "var(--rojo)" }}
                        />
                      </div>
                      <span className="min-w-[28px] text-right text-[10px] font-bold" style={{ color: d.pctGanados >= 50 ? "var(--verde)" : "var(--rojo)" }}>
                        {d.pctGanados}%
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-right">{d.am > 0 ? `🟨${d.am}` : "—"}</td>
                  <td className="px-2 py-1.5 text-right">{d.rj > 0 ? `🟥${d.rj}` : "—"}</td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={12} className="py-8 text-center italic text-neutral-400">
                    Sin datos — cargá acciones y formaciones en Resultados.
                  </td>
                </tr>
              )}
            </tbody>
            {data.length > 0 && (
              <tfoot>
                <tr className="bg-[#0D2B45] text-[11px] font-bold text-white">
                  <td className="px-2 py-2" colSpan={3}>
                    Total ({data.length} jugadores)
                  </td>
                  <td className="px-2 py-2 text-right">{totales.pts}</td>
                  <td />
                  <td className="px-2 py-2 text-right">{totales.t}</td>
                  <td className="px-2 py-2 text-right">{totales.c}</td>
                  <td className="px-2 py-2 text-right">{totales.p}</td>
                  <td colSpan={2} />
                  <td className="px-2 py-2 text-right">{totales.am}</td>
                  <td className="px-2 py-2 text-right">{totales.rj}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="card sticky top-[70px] self-start">
          {!jugadorSel ? (
            <div className="p-8 text-center text-[13px] text-neutral-400">
              <div className="mb-2 text-[28px]">👆</div>
              Tocá una fila para ver la ficha deportiva del jugador
            </div>
          ) : (
            <FichaDeportiva
              jugador={jugadorSel}
              partidos={partidos}
              formaciones={formaciones}
              acciones={acciones}
              ajustes={ajustes}
              filtroCategoria={filtro}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function FichaDeportiva({
  jugador,
  partidos,
  formaciones,
  acciones,
  ajustes,
  filtroCategoria,
}: {
  jugador: Jugador;
  partidos: Partido[];
  formaciones: Formacion[];
  acciones: AccionPartido[];
  ajustes: AjusteResultado[];
  filtroCategoria: RugbyCategoria | "";
}) {
  const resumen = resumenFormaciones(jugador.id, partidos, formaciones, acciones, ajustes);
  const hist = filtroCategoria ? resumen.hist.filter((h) => h.categoria === filtroCategoria) : resumen.hist;
  const scoring = hist.reduce(
    (s, h) => ({ tries: s.tries, conv: s.conv, penales: s.penales, puntos: s.puntos + h.ptsAportados, am: s.am + h.am, rj: s.rj + h.rj }),
    { tries: 0, conv: 0, penales: 0, puntos: 0, am: 0, rj: 0 },
  );
  // tries/conv/penal breakdown: contamos desde acciones directamente para no perder el desglose
  const propias = acciones.filter((a) => a.equipo === "cedros" && a.jugador_id === jugador.id && (filtroCategoria ? a.categoria === filtroCategoria : true));
  scoring.tries = propias.filter((a) => a.tipo === "try").length;
  scoring.conv = propias.filter((a) => a.tipo === "conv").length;
  scoring.penales = propias.filter((a) => a.tipo === "penal").length;

  const total = hist.length;
  const gan = hist.filter((h) => h.res === "W").length;
  const per = hist.filter((h) => h.res === "L").length;
  const emp = hist.filter((h) => h.res === "E").length;
  const pctGan = total ? Math.round((gan / total) * 100) : 0;
  const ptsXpart = total ? Math.round((scoring.puntos / total) * 10) / 10 : 0;
  const triesXpart = total ? Math.round((scoring.tries / total) * 10) / 10 : 0;

  const ini = jugador.nombre
    .split(" ")
    .slice(0, 2)
    .reverse()
    .map((p) => p[0] ?? "")
    .join("");

  return (
    <div>
      <div className="p-4">
        <div
          className="mb-2 grid h-11 w-11 place-items-center rounded-full text-[14px] font-bold"
          style={{ background: GRUPO_META[jugador.grupo].bg, color: GRUPO_META[jugador.grupo].color }}
        >
          {ini}
        </div>
        <div className="text-[15px] font-bold">{jugador.nombre}</div>
        <div className="mb-2 text-[11px] text-neutral-400">{jugador.grupo}</div>
        <span className="badge" style={{ background: GRUPO_META[jugador.grupo].bg, color: GRUPO_META[jugador.grupo].color }}>
          {GRUPO_META[jugador.grupo].short}
        </span>
      </div>
      <div className="border-y border-[var(--borde)]">
        <StatSec titulo="🏆 Resultados">
          <StatCell v={total} l="Jugados" />
          <StatCell v={gan} l="✅ Ganados" tone="verde" />
          <StatCell v={per} l="❌ Perdidos" tone="rojo" />
          <StatCell v={emp} l="🟡 Empatados" tone="amarillo" />
        </StatSec>
        <StatSec titulo="🏉 Puntuación">
          <StatCell v={scoring.puntos} l="Puntos" tone="azul" />
          <StatCell v={scoring.tries} l="Tries" style={{ color: "#1F4E79" }} />
          <StatCell v={scoring.conv} l="Conv." style={{ color: "#375623" }} />
          <StatCell v={scoring.penales} l="Penales" style={{ color: "#843C0C" }} />
        </StatSec>
        {(scoring.am > 0 || scoring.rj > 0) && (
          <StatSec titulo="🟨🟥 Tarjetas">
            <StatCell v={scoring.am} l="🟨 Amarillas" style={{ color: "#92400E" }} />
            <StatCell v={scoring.rj} l="🟥 Rojas" tone="rojo" />
            <StatCell v={scoring.am + scoring.rj} l="Total" />
          </StatSec>
        )}
      </div>
      <div className="space-y-1.5 border-b border-[var(--borde)] p-3.5">
        <PctBar label="% Partidos ganados" val={pctGan} num={`${pctGan}%`} color={pctGan >= 50 ? "#375623" : "#C00000"} />
        <PctBar label="Pts por partido" val={Math.min((ptsXpart / 20) * 100, 100)} num={`${ptsXpart}`} color="#1F4E79" />
        <PctBar label="Tries / partido" val={Math.min(triesXpart * 100, 100)} num={`${triesXpart}`} color="#1F4E79" />
      </div>
      <div className="p-3.5">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-neutral-400">Historial de partidos</div>
        {hist.length === 0 ? (
          <p className="text-[12px] italic text-neutral-400">Sin historial disponible</p>
        ) : (
          <div className="space-y-1">
            {hist.map((h, i) => (
              <div key={i} className="grid grid-cols-[34px_1fr_auto] items-center gap-1.5 border-b border-neutral-100 py-1.5 text-[11px] last:border-0">
                <span className="font-bold text-[var(--azul)]">{fechaCorta(h.partido.fecha)}</span>
                <span className="truncate">{h.partido.rival}</span>
                <div className="flex items-center justify-end gap-1">
                  {h.ptsAportados > 0 && <span className="font-bold text-[var(--azul)]">+{h.ptsAportados}pts</span>}
                  {h.am > 0 && "🟨"}
                  {h.rj > 0 && "🟥"}
                  <span
                    className="rounded px-1 py-0.5 text-[9px] font-bold"
                    style={
                      h.res === "W"
                        ? { background: "var(--verde-clr)", color: "var(--verde)" }
                        : h.res === "L"
                          ? { background: "var(--rojo-clr)", color: "var(--rojo)" }
                          : { background: "var(--amarillo)", color: "#7D6608" }
                    }
                  >
                    {h.ptsCedros}—{h.ptsRival}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatSec({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-[var(--borde)] last:border-0">
      <div className="bg-[var(--gris)] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-neutral-400">{titulo}</div>
      <div className="grid grid-cols-4 gap-px bg-[var(--borde)]">{children}</div>
    </div>
  );
}
function StatCell({ v, l, tone, style }: { v: number; l: string; tone?: "verde" | "rojo" | "azul" | "amarillo"; style?: React.CSSProperties }) {
  const color = tone === "verde" ? "var(--verde)" : tone === "rojo" ? "var(--rojo)" : tone === "azul" ? "var(--azul)" : tone === "amarillo" ? "#7D6608" : undefined;
  return (
    <div className="bg-white px-2.5 py-2 text-center">
      <div className="text-[16px] font-bold leading-none" style={style ?? { color }}>
        {v}
      </div>
      <div className="mt-0.5 text-[10px] text-neutral-400">{l}</div>
    </div>
  );
}
function PctBar({ label, val, num, color }: { label: string; val: number; num: string; color: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="min-w-[100px] font-semibold text-neutral-500">{label}</span>
      <div className="h-1.5 flex-1 rounded-full bg-neutral-100">
        <div className="h-full rounded-full" style={{ width: `${Math.min(val, 100)}%`, background: color }} />
      </div>
      <span className="min-w-[32px] text-right text-[11px] font-bold" style={{ color }}>
        {num}
      </span>
    </div>
  );
}

function Chip({ label, activo, onClick }: { label: string; activo: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors ${
        activo ? "bg-[#0D2B45] text-white" : "border border-[var(--borde)] bg-white text-neutral-600"
      }`}
    >
      {label}
    </button>
  );
}
