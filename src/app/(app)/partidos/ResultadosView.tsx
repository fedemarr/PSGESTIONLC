"use client";

import { useMemo, useState } from "react";
import type { AccionPartido, AccionTipo, AjusteResultado, Formacion, Jugador, Partido, RugbyCategoria } from "@/lib/types";
import { fmt, fechaDisplay, GRUPO_META } from "@/lib/format";
import { CATEGORIAS, CATEGORIA_META, resultadoCategoria, resultadoWLE, titularesDe, suplentesDe } from "@/lib/rugby";
import { agregarAccion, quitarAccion, setAjuste, quitarAjuste } from "./resultadosActions";

const TIPO_LABEL: Record<AccionTipo, string> = {
  try: "🏉 Try",
  conv: "✅ Conv.",
  penal: "🎯 Penal",
  am: "🟨 Amarilla",
  rj: "🟥 Roja",
};
const TIPO_PUNTOS: Record<AccionTipo, number> = { try: 5, conv: 2, penal: 3, am: 0, rj: 0 };
const TIPO_BG: Record<AccionTipo, string> = {
  try: "#EBF3FB",
  conv: "#EAF4EE",
  penal: "#FDF1EC",
  am: "#FEF3C7",
  rj: "#FCE4D6",
};
const TIPO_FG: Record<AccionTipo, string> = {
  try: "#1F4E79",
  conv: "#375623",
  penal: "#843C0C",
  am: "#92400E",
  rj: "#C00000",
};

export function ResultadosView({
  partidos,
  jugadores,
  formaciones,
  acciones,
  ajustes,
}: {
  partidos: Partido[];
  jugadores: Jugador[];
  formaciones: Formacion[];
  acciones: AccionPartido[];
  ajustes: AjusteResultado[];
}) {
  const [catFiltro, setCatFiltro] = useState<RugbyCategoria | "">("");
  const [abierto, setAbierto] = useState<string | null>(null);

  const jugadorById = useMemo(() => new Map(jugadores.map((j) => [j.id, j])), [jugadores]);
  const ordenados = useMemo(() => [...partidos].sort((a, b) => a.fecha.localeCompare(b.fecha)), [partidos]);

  const cats = catFiltro ? [catFiltro] : CATEGORIAS;
  let jugadosCount = 0,
    gan = 0,
    per = 0,
    emp = 0,
    ptsF = 0,
    ptsC = 0;
  for (const p of ordenados) {
    if (!p.jugado) continue;
    let tc = 0,
      tr = 0,
      hay = false;
    for (const cat of cats) {
      const acs = acciones.filter((a) => a.partido_id === p.id && a.categoria === cat);
      const aj = ajustes.some((a) => a.partido_id === p.id && a.categoria === cat);
      if (!acs.length && !aj) continue;
      const r = resultadoCategoria(p.id, cat, acciones, ajustes);
      tc += r.cedros;
      tr += r.rival;
      hay = true;
    }
    if (!hay) continue;
    jugadosCount++;
    if (tc > tr) gan++;
    else if (tc < tr) per++;
    else emp++;
    ptsF += tc;
    ptsC += tr;
  }

  return (
    <div>
      <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
        <Kpi label="Partidos jugados" value={jugadosCount} />
        <Kpi label={`Ganados${catFiltro ? " (" + CATEGORIA_META[catFiltro].short + ")" : ""}`} value={gan} tone="verde" />
        <Kpi label="Perdidos" value={per} tone="rojo" />
        <Kpi label="Empatados" value={emp} tone="amarillo" />
        <Kpi label="Puntos a favor" value={ptsF} tone="azul" />
        <Kpi label="Puntos en contra" value={ptsC} tone="rojo" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-[12px] font-semibold text-neutral-500">Ver por categoría:</span>
        <CatChip label="Todos" activo={catFiltro === ""} onClick={() => setCatFiltro("")} color="#0D2B45" bg="#0D2B45" white />
        {CATEGORIAS.map((c) => (
          <CatChip key={c} label={CATEGORIA_META[c].short} activo={catFiltro === c} onClick={() => setCatFiltro(c)} color={CATEGORIA_META[c].color} bg={CATEGORIA_META[c].bg} />
        ))}
      </div>

      {ordenados.length === 0 ? (
        <div className="card p-10 text-center text-neutral-400">Sin partidos cargados.</div>
      ) : (
        <div className="space-y-2.5">
          {ordenados.map((p) => {
            const open = abierto === p.id;
            const catsConDatos = catFiltro ? [catFiltro] : CATEGORIAS;
            let tc = 0,
              tr = 0,
              hay = false;
            catsConDatos.forEach((cat) => {
              const acs = acciones.filter((a) => a.partido_id === p.id && a.categoria === cat);
              const aj = ajustes.some((a) => a.partido_id === p.id && a.categoria === cat);
              if (!acs.length && !aj) return;
              const r = resultadoCategoria(p.id, cat, acciones, ajustes);
              tc += r.cedros;
              tr += r.rival;
              hay = true;
            });
            const res = hay ? resultadoWLE(tc, tr) : null;

            return (
              <div key={p.id} className="card overflow-hidden">
                <button
                  onClick={() => setAbierto(open ? null : p.id)}
                  className={`flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left ${open ? "text-white" : "hover:bg-[var(--gris)]"}`}
                  style={open ? { background: "#0D2B45" } : undefined}
                >
                  <div className="min-w-[46px] text-[17px] font-extrabold">{fechaDisplay(p.fecha)}</div>
                  <div>
                    <div className="text-[14px] font-bold">vs {p.rival}</div>
                    <div className={`text-[11px] ${open ? "opacity-60" : "text-neutral-400"}`}>
                      {p.tipo} · {p.jugado ? "Jugado" : "Próximo"}
                    </div>
                  </div>
                  <span className={`badge ${p.tipo === "Local" ? "badge-verde" : "badge-azul"}`}>{p.tipo}</span>
                  {hay && res && (
                    <span className={`badge ${res === "W" ? "badge-verde" : res === "L" ? "badge-rojo" : "badge-amarillo"}`}>
                      {res === "W" ? "Victoria" : res === "L" ? "Derrota" : "Empate"}
                    </span>
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    {hay ? (
                      <>
                        <ScoreBlock label="Cedros" value={tc} tone={res === "W" ? "verde" : res === "L" ? "rojo" : "azul"} dark={open} />
                        <span className={open ? "text-white/30" : "text-neutral-300"}>—</span>
                        <ScoreBlock label={p.rival} value={tr} tone={res === "L" ? "verde" : res === "W" ? "rojo" : "azul"} dark={open} />
                      </>
                    ) : p.jugado ? (
                      <span className="text-[11px] italic text-neutral-400">Cargá acciones</span>
                    ) : null}
                  </div>
                  <span className={open ? "text-white/60" : "text-neutral-400"}>{open ? "▲" : "▼"}</span>
                </button>

                {open && (
                  <CategoriaTabs
                    partido={p}
                    jugadores={jugadores}
                    jugadorById={jugadorById}
                    formaciones={formaciones}
                    acciones={acciones}
                    ajustes={ajustes}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CategoriaTabs({
  partido,
  jugadores,
  jugadorById,
  formaciones,
  acciones,
  ajustes,
}: {
  partido: Partido;
  jugadores: Jugador[];
  jugadorById: Map<string, Jugador>;
  formaciones: Formacion[];
  acciones: AccionPartido[];
  ajustes: AjusteResultado[];
}) {
  const [cat, setCat] = useState<RugbyCategoria>("Primera");
  return (
    <div className="border-t border-[var(--borde)]">
      <div className="flex border-b border-[var(--borde)]">
        {CATEGORIAS.map((c) => {
          const meta = CATEGORIA_META[c];
          const activo = cat === c;
          const acs = acciones.filter((a) => a.partido_id === partido.id && a.categoria === c);
          const r = resultadoCategoria(partido.id, c, acciones, ajustes);
          return (
            <button
              key={c}
              onClick={() => setCat(c)}
              className="flex-1 border-b-[3px] px-2 py-2.5 text-center text-[12px] font-bold"
              style={activo ? { color: meta.color, borderColor: meta.color, background: meta.bg } : { borderColor: "transparent", color: "#888" }}
            >
              {meta.short}
              {acs.length > 0 && <span className="ml-1 font-normal opacity-65">· {r.cedros}pts</span>}
            </button>
          );
        })}
      </div>
      <div className="p-4">
        <ResultadoCategoria
          partido={partido}
          categoria={cat}
          jugadores={jugadores}
          jugadorById={jugadorById}
          formaciones={formaciones}
          acciones={acciones}
          ajustes={ajustes}
        />
      </div>
    </div>
  );
}

function ResultadoCategoria({
  partido,
  categoria,
  jugadores,
  jugadorById,
  formaciones,
  acciones,
  ajustes,
}: {
  partido: Partido;
  categoria: RugbyCategoria;
  jugadores: Jugador[];
  jugadorById: Map<string, Jugador>;
  formaciones: Formacion[];
  acciones: AccionPartido[];
  ajustes: AjusteResultado[];
}) {
  const [modal, setModal] = useState<{ equipo: "cedros" | "rival"; tipo: AccionTipo } | null>(null);

  const acs = acciones.filter((a) => a.partido_id === partido.id && a.categoria === categoria);
  const acC = acs.filter((a) => a.equipo === "cedros");
  const acR = acs.filter((a) => a.equipo === "rival");
  const res = resultadoCategoria(partido.id, categoria, acciones, ajustes);
  const aj = ajustes.find((a) => a.partido_id === partido.id && a.categoria === categoria);
  const titulares = titularesDe(formaciones, partido.id, categoria);
  const suplentes = suplentesDe(formaciones, partido.id, categoria);
  const form = [...titulares, ...suplentes].map((f) => jugadorById.get(f.jugador_id)).filter((j): j is Jugador => !!j);
  const resultadoLbl = res.cedros > res.rival ? "Victoria" : res.cedros < res.rival ? "Derrota" : "Empate";

  const listaJugadores = form.length > 0 ? form : jugadores;

  return (
    <div>
      {partido.jugado && (
        <>
          <div className="mb-3 flex items-center justify-center gap-4 rounded-lg border border-[var(--borde)] bg-[var(--gris)] p-3.5">
            <div className="text-center">
              <div className="mb-1.5 text-[11px] font-bold uppercase text-neutral-400">Los Cedros</div>
              <div className="text-[28px] font-extrabold" style={{ color: res.cedros > res.rival ? "var(--verde)" : res.cedros < res.rival ? "var(--rojo)" : "var(--azul)" }}>
                {res.cedros}
              </div>
            </div>
            <div className="text-[22px] font-light text-neutral-300">—</div>
            <div className="text-center">
              <div className="mb-1.5 text-[11px] font-bold uppercase text-neutral-400">{partido.rival}</div>
              <div className="text-[28px] font-extrabold" style={{ color: res.rival > res.cedros ? "var(--verde)" : res.rival < res.cedros ? "var(--rojo)" : "var(--azul)" }}>
                {res.rival}
              </div>
            </div>
            <div className="min-w-[120px] text-center text-[11px] leading-relaxed text-neutral-500">
              {res.cedros === 0 && res.rival === 0 ? (
                <span className="text-neutral-300">Sin acciones</span>
              ) : (
                <>
                  <strong>{resultadoLbl}</strong> {Math.abs(res.cedros - res.rival) > 0 && `por ${Math.abs(res.cedros - res.rival)} pts`}
                  <br />
                  {res.ajustado ? <span className="text-[#7D6608]">⚠️ Ajustado</span> : "Desde acciones"}
                </>
              )}
            </div>
          </div>

          <div className={`mb-3 flex flex-wrap items-center gap-2 rounded-lg p-2.5 text-[12px] ${aj ? "border border-[#FFD966] bg-[var(--amarillo)]" : "border border-dashed border-neutral-200 bg-neutral-50"}`}>
            {aj ? (
              <>
                <span className="font-semibold text-[#7D6608]">⚠️ Ajuste manual —</span>
                <span>Cedros:</span>
                <input
                  type="number"
                  defaultValue={aj.pts_cedros}
                  onBlur={(e) => setAjuste(partido.id, categoria, Number(e.target.value) || 0, aj.pts_rival)}
                  className="w-14 rounded border border-[#7D6608] px-1.5 py-1 text-center font-bold"
                />
                <span>{partido.rival}:</span>
                <input
                  type="number"
                  defaultValue={aj.pts_rival}
                  onBlur={(e) => setAjuste(partido.id, categoria, aj.pts_cedros, Number(e.target.value) || 0)}
                  className="w-14 rounded border border-[#7D6608] px-1.5 py-1 text-center font-bold"
                />
                <button className="ml-1 rounded border border-[#7D6608] px-2 py-1 text-[11px] font-bold text-[#7D6608]" onClick={() => quitarAjuste(partido.id, categoria)}>
                  Quitar
                </button>
              </>
            ) : (
              <>
                <span className="text-neutral-500">¿El resultado final difiere de las acciones?</span>
                <button
                  className="rounded border border-neutral-400 px-2 py-1 text-[11px] font-bold text-neutral-600"
                  onClick={() => setAjuste(partido.id, categoria, res.cedros, res.rival)}
                >
                  Ajustar manualmente
                </button>
              </>
            )}
          </div>
          {form.length === 0 && (
            <div className="mb-3 rounded-lg border border-[#FFD966] bg-[var(--amarillo)] p-2.5 text-[12px] text-[#7D6608]">
              ⚠️ Sin formación cargada para {CATEGORIA_META[categoria].short}. Se muestra todo el plantel.
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <EquipoCard
              titulo="🏡 Los Cedros"
              pts={res.cedros}
              color="var(--azul-clr)"
              fg="var(--azul)"
              acciones={acC}
              rival={false}
              onAdd={(tipo) => setModal({ equipo: "cedros", tipo })}
              jugadorById={jugadorById}
            />
            <EquipoCard
              titulo={`🚌 ${partido.rival}`}
              pts={res.rival}
              color="var(--rojo-clr)"
              fg="var(--rojo)"
              acciones={acR}
              rival
              onAdd={(tipo) => setModal({ equipo: "rival", tipo })}
              jugadorById={jugadorById}
            />
          </div>
        </>
      )}
      {!partido.jugado && <p className="py-4 text-center text-[13px] text-neutral-400">Este partido todavía no se jugó.</p>}

      {modal && (
        <AccionModal
          equipo={modal.equipo}
          tipo={modal.tipo}
          jugadores={listaJugadores}
          rival={partido.rival}
          categoria={categoria}
          onClose={() => setModal(null)}
          onGuardar={async (jugId) => {
            await agregarAccion(partido.id, categoria, modal.equipo, modal.tipo, jugId);
            setModal(null);
          }}
        />
      )}
    </div>
  );
}

function EquipoCard({
  titulo,
  pts,
  color,
  fg,
  acciones,
  rival,
  onAdd,
  jugadorById,
}: {
  titulo: string;
  pts: number;
  color: string;
  fg: string;
  acciones: AccionPartido[];
  rival: boolean;
  onAdd: (tipo: AccionTipo) => void;
  jugadorById: Map<string, Jugador>;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--borde)]">
      <div className="flex items-center justify-between px-3 py-2 text-[12px] font-bold" style={{ background: color, color: fg }}>
        <span>{titulo}</span>
        <span className="text-[16px] font-extrabold">{pts} pts</span>
      </div>
      <div className="min-h-[48px] px-3 py-1.5">
        {acciones.length === 0 && <div className="py-2 text-[11px] italic text-neutral-300">Sin acciones</div>}
        {acciones.map((a) => (
          <div key={a.id} className="flex items-center gap-1.5 border-b border-neutral-100 py-1.5 text-[12px] last:border-0">
            <span className="whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ background: TIPO_BG[a.tipo], color: TIPO_FG[a.tipo] }}>
              {TIPO_LABEL[a.tipo]}
            </span>
            {TIPO_PUNTOS[a.tipo] > 0 && <span className="text-[10px] font-semibold text-neutral-400">+{TIPO_PUNTOS[a.tipo]}</span>}
            <span className="flex-1 font-medium">{a.jugador_id ? jugadorById.get(a.jugador_id)?.nombre ?? "—" : rival ? "Rival" : "—"}</span>
            <button onClick={() => quitarAccion(a.id)} className="text-[11px] text-neutral-300 hover:text-[var(--rojo)]">
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5 border-t border-[var(--borde)] p-2.5">
        <AddBtn tipo="try" onClick={() => onAdd("try")} />
        <AddBtn tipo="conv" onClick={() => onAdd("conv")} />
        <AddBtn tipo="penal" onClick={() => onAdd("penal")} />
        {!rival && (
          <>
            <AddBtn tipo="am" onClick={() => onAdd("am")} />
            <AddBtn tipo="rj" onClick={() => onAdd("rj")} />
          </>
        )}
      </div>
    </div>
  );
}

function AddBtn({ tipo, onClick }: { tipo: AccionTipo; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-md border-2 border-dashed px-2.5 py-1 text-[11px] font-bold transition-colors hover:border-solid"
      style={{ color: TIPO_FG[tipo], borderColor: TIPO_BG[tipo] }}
    >
      {tipo === "am" ? "🟨" : tipo === "rj" ? "🟥" : TIPO_LABEL[tipo]}
    </button>
  );
}

function AccionModal({
  equipo,
  tipo,
  jugadores,
  rival,
  categoria,
  onClose,
  onGuardar,
}: {
  equipo: "cedros" | "rival";
  tipo: AccionTipo;
  jugadores: Jugador[];
  rival: string;
  categoria: RugbyCategoria;
  onClose: () => void;
  onGuardar: (jugadorId: string | null) => void | Promise<void>;
}) {
  const [jugId, setJugId] = useState("");
  const [saving, setSaving] = useState(false);
  const necesitaJugador = equipo === "cedros";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between rounded-t-xl px-4 py-3 text-white" style={{ background: TIPO_FG[tipo] === "#843C0C" ? "#843C0C" : "#0D2B45" }}>
          <h2 className="text-[15px] font-bold">
            {TIPO_LABEL[tipo]} · {CATEGORIA_META[categoria].short}
          </h2>
          <button onClick={onClose} className="opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
        <div className="space-y-3 p-4">
          <div
            className="rounded-md p-2 text-[11px] leading-relaxed"
            style={{ background: TIPO_BG[tipo], color: TIPO_FG[tipo] }}
          >
            {tipo === "am" || tipo === "rj"
              ? "Solo registro. Sin impacto en puntuación."
              : !necesitaJugador
                ? `Acción de ${rival} — sin jugador.`
                : "Elegí quién anotó."}
          </div>
          {necesitaJugador && (
            <div>
              <span className="label">Jugador</span>
              <select value={jugId} onChange={(e) => setJugId(e.target.value)} className="input mt-1">
                <option value="">— Seleccionar —</option>
                {jugadores.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.nombre}
                    {j.apodo ? ` (${j.apodo})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--borde)] px-4 py-3">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              await onGuardar(necesitaJugador ? jugId || null : null);
            }}
          >
            {saving ? "Guardando…" : "Agregar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone?: "verde" | "rojo" | "azul" | "amarillo" }) {
  const color =
    tone === "verde" ? "var(--verde)" : tone === "rojo" ? "var(--rojo)" : tone === "azul" ? "var(--azul)" : tone === "amarillo" ? "#7D6608" : undefined;
  return (
    <div className="stat-card">
      <div className="stat-value" style={{ color, fontSize: 18 }}>
        {value}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function CatChip({
  label,
  activo,
  onClick,
  color,
  bg,
  white,
}: {
  label: string;
  activo: boolean;
  onClick: () => void;
  color: string;
  bg: string;
  white?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border-2 px-3.5 py-1.5 text-[12px] font-bold transition-colors"
      style={
        activo
          ? { background: bg, color: white ? "#fff" : color, borderColor: color }
          : { background: "#fff", color: "#666", borderColor: "var(--borde)" }
      }
    >
      {label}
    </button>
  );
}

function ScoreBlock({ label, value, tone, dark }: { label: string; value: number; tone: "verde" | "rojo" | "azul"; dark?: boolean }) {
  const color = dark ? "#fff" : tone === "verde" ? "var(--verde)" : tone === "rojo" ? "var(--rojo)" : "var(--azul)";
  return (
    <div className="text-center">
      <div className={`text-[9px] font-bold uppercase ${dark ? "text-white/50" : "text-neutral-400"}`}>{label}</div>
      <div className="text-[20px] font-extrabold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
