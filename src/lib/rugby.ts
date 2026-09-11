import type {
  AccionPartido,
  AccionTipo,
  AjusteResultado,
  Formacion,
  Grupo3T,
  Jugador,
  Partido,
  RugbyCategoria,
} from "./types";

export const PTS_ACCION: Record<AccionTipo, number> = { try: 5, conv: 2, penal: 3, am: 0, rj: 0 };
export const CATEGORIAS: RugbyCategoria[] = ["Primera", "Intermedia", "Pre-intermedia"];

export const CATEGORIA_META: Record<RugbyCategoria, { color: string; bg: string; short: string }> = {
  Primera: { color: "#1F4E79", bg: "#EBF3FB", short: "Primera" },
  Intermedia: { color: "#375623", bg: "#EAF4EE", short: "Intermedia" },
  "Pre-intermedia": { color: "#843C0C", bg: "#FDF1EC", short: "Pre" },
};

export interface Resultado {
  cedros: number;
  rival: number;
  ajustado: boolean;
}

export function puntosDeAcciones(acciones: AccionPartido[], partidoId: string, categoria: RugbyCategoria, equipo: "cedros" | "rival"): number {
  return acciones
    .filter((a) => a.partido_id === partidoId && a.categoria === categoria && a.equipo === equipo)
    .reduce((s, a) => s + PTS_ACCION[a.tipo], 0);
}

/** Resultado de un partido+categoría: el ajuste manual manda si existe, si no se calcula de las acciones. */
export function resultadoCategoria(
  partidoId: string,
  categoria: RugbyCategoria,
  acciones: AccionPartido[],
  ajustes: AjusteResultado[],
): Resultado {
  const aj = ajustes.find((a) => a.partido_id === partidoId && a.categoria === categoria);
  if (aj) return { cedros: aj.pts_cedros, rival: aj.pts_rival, ajustado: true };
  return {
    cedros: puntosDeAcciones(acciones, partidoId, categoria, "cedros"),
    rival: puntosDeAcciones(acciones, partidoId, categoria, "rival"),
    ajustado: false,
  };
}

export type WLE = "W" | "L" | "E";
export function resultadoWLE(cedros: number, rival: number): WLE {
  return cedros > rival ? "W" : cedros < rival ? "L" : "E";
}

/** ¿Esa categoría tiene algo cargado (acciones o ajuste) para ese partido? */
export function categoriaConDatos(partidoId: string, categoria: RugbyCategoria, acciones: AccionPartido[], ajustes: AjusteResultado[]): boolean {
  return (
    ajustes.some((a) => a.partido_id === partidoId && a.categoria === categoria) ||
    acciones.some((a) => a.partido_id === partidoId && a.categoria === categoria)
  );
}

export function formacionDe(formaciones: Formacion[], partidoId: string, categoria: RugbyCategoria): Formacion[] {
  return formaciones.filter((f) => f.partido_id === partidoId && f.categoria === categoria);
}

export function titularesDe(formaciones: Formacion[], partidoId: string, categoria: RugbyCategoria): Formacion[] {
  return formacionDe(formaciones, partidoId, categoria)
    .filter((f) => f.puesto != null)
    .sort((a, b) => (a.puesto ?? 0) - (b.puesto ?? 0));
}

export function suplentesDe(formaciones: Formacion[], partidoId: string, categoria: RugbyCategoria): Formacion[] {
  return formacionDe(formaciones, partidoId, categoria).filter((f) => f.puesto == null);
}

export function jugadoresConvocados(formaciones: Formacion[], partidoId: string, categoria: RugbyCategoria): Set<string> {
  return new Set(formacionDe(formaciones, partidoId, categoria).map((f) => f.jugador_id));
}

// ── Scoring / estadísticas por jugador ──────────────────────────────────

export interface ScoringJugador {
  tries: number;
  conv: number;
  penales: number;
  puntos: number;
  am: number;
  rj: number;
}

export function scoringJugador(jugadorId: string, acciones: AccionPartido[]): ScoringJugador {
  const propias = acciones.filter((a) => a.equipo === "cedros" && a.jugador_id === jugadorId);
  const out: ScoringJugador = { tries: 0, conv: 0, penales: 0, puntos: 0, am: 0, rj: 0 };
  for (const a of propias) {
    if (a.tipo === "try") out.tries++;
    else if (a.tipo === "conv") out.conv++;
    else if (a.tipo === "penal") out.penales++;
    else if (a.tipo === "am") out.am++;
    else if (a.tipo === "rj") out.rj++;
    out.puntos += PTS_ACCION[a.tipo];
  }
  return out;
}

export interface HistorialFormacion {
  partido: Partido;
  categoria: RugbyCategoria;
  ptsCedros: number;
  ptsRival: number;
  res: WLE;
  ptsAportados: number;
  am: number;
  rj: number;
}

export interface ResumenFormaciones {
  total: number;
  gan: number;
  per: number;
  emp: number;
  hist: HistorialFormacion[];
}

/** Partidos en los que el jugador estuvo convocado (formación), con resultado y aporte. */
export function resumenFormaciones(
  jugadorId: string,
  partidos: Partido[],
  formaciones: Formacion[],
  acciones: AccionPartido[],
  ajustes: AjusteResultado[],
): ResumenFormaciones {
  const hist: HistorialFormacion[] = [];
  let gan = 0,
    per = 0,
    emp = 0;
  for (const p of partidos) {
    if (!p.jugado) continue;
    for (const cat of CATEGORIAS) {
      if (!jugadoresConvocados(formaciones, p.id, cat).has(jugadorId)) continue;
      const r = resultadoCategoria(p.id, cat, acciones, ajustes);
      const res = resultadoWLE(r.cedros, r.rival);
      if (res === "W") gan++;
      else if (res === "L") per++;
      else emp++;
      const propias = acciones.filter((a) => a.partido_id === p.id && a.categoria === cat && a.equipo === "cedros" && a.jugador_id === jugadorId);
      const ptsAportados = propias.reduce((s, a) => s + PTS_ACCION[a.tipo], 0);
      hist.push({
        partido: p,
        categoria: cat,
        ptsCedros: r.cedros,
        ptsRival: r.rival,
        res,
        ptsAportados,
        am: propias.filter((a) => a.tipo === "am").length,
        rj: propias.filter((a) => a.tipo === "rj").length,
      });
    }
  }
  hist.sort((a, b) => a.partido.fecha.localeCompare(b.partido.fecha));
  return { total: gan + per + emp, gan, per, emp, hist };
}

// ── Tabla de puntos (ranking de la temporada) ───────────────────────────

export interface FilaTablaPuntos {
  jugadorId: string;
  nombre: string;
  apodo: string;
  grupo: Grupo3T;
  tries: number;
  conv: number;
  penales: number;
  puntos: number;
  am: number;
  rj: number;
  partidosJugados: number;
  ganados: number;
  pctGanados: number;
  ptsPorPartido: number;
}

export function tablaPuntos(args: {
  jugadores: Jugador[];
  partidos: Partido[];
  formaciones: Formacion[];
  acciones: AccionPartido[];
  ajustes: AjusteResultado[];
  categoria?: RugbyCategoria | "";
}): FilaTablaPuntos[] {
  const { jugadores, partidos, formaciones, acciones, ajustes, categoria } = args;
  const jugadoresById = new Map(jugadores.map((j) => [j.id, j]));
  const cats = categoria ? [categoria] : CATEGORIAS;

  const filas = new Map<string, FilaTablaPuntos>();
  const ensure = (id: string) => {
    let f = filas.get(id);
    if (!f) {
      const j = jugadoresById.get(id);
      f = {
        jugadorId: id,
        nombre: j?.nombre ?? "?",
        apodo: j?.apodo ?? "",
        grupo: j?.grupo ?? "Mc Donalds",
        tries: 0,
        conv: 0,
        penales: 0,
        puntos: 0,
        am: 0,
        rj: 0,
        partidosJugados: 0,
        ganados: 0,
        pctGanados: 0,
        ptsPorPartido: 0,
      };
      filas.set(id, f);
    }
    return f;
  };

  for (const p of partidos) {
    if (!p.jugado) continue;
    for (const cat of cats) {
      // acciones (puntuación y tarjetas)
      for (const a of acciones) {
        if (a.partido_id !== p.id || a.categoria !== cat || a.equipo !== "cedros" || !a.jugador_id) continue;
        const f = ensure(a.jugador_id);
        if (a.tipo === "try") f.tries++;
        else if (a.tipo === "conv") f.conv++;
        else if (a.tipo === "penal") f.penales++;
        else if (a.tipo === "am") f.am++;
        else if (a.tipo === "rj") f.rj++;
        f.puntos += PTS_ACCION[a.tipo];
      }
      // partidos jugados / ganados según formación
      const r = resultadoCategoria(p.id, cat, acciones, ajustes);
      const res = resultadoWLE(r.cedros, r.rival);
      for (const jugadorId of jugadoresConvocados(formaciones, p.id, cat)) {
        const f = ensure(jugadorId);
        f.partidosJugados++;
        if (res === "W") f.ganados++;
      }
    }
  }

  return [...filas.values()]
    .filter((f) => f.partidosJugados > 0 || f.puntos > 0)
    .map((f) => ({
      ...f,
      pctGanados: f.partidosJugados ? Math.round((f.ganados / f.partidosJugados) * 100) : 0,
      ptsPorPartido: f.partidosJugados ? Math.round((f.puntos / f.partidosJugados) * 10) / 10 : 0,
    }));
}
