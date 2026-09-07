import type { Cobro, Gasto3T, GastoFijo, Jugador, Partido, Grupo3T, CajaMovimiento, FormaPago } from "./types";

/** Rotación de cocina para partidos locales: Mc Donalds -> Whisky -> Sabores. */
export const ROTACION_GRUPOS: Grupo3T[] = ["Mc Donalds", "Whisky", "Sabores express"];
export function grupoTurno(indiceLocal: number): Grupo3T {
  return ROTACION_GRUPOS[indiceLocal % 3];
}

/** Monto de 3T que aplica a un partido (override propio o global). */
export function montoPartido(p: Partido, montoGlobal: number): number {
  return p.monto_3t ?? montoGlobal;
}

export function partidosLocales(partidos: Partido[]): Partido[] {
  return partidos
    .filter((p) => p.tipo === "Local")
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export type EstadoCelda =
  | "pendiente" // sin datos cargados para ese partido / partido futuro
  | "debe"      // jugó y no pagó
  | "saldado"   // pagó el monto o más
  | "parcial"   // pagó algo pero falta
  | "compra"    // cubrió con compra (>= 3T)
  | "ausente";  // no estuvo

export interface CeldaCobro {
  estado: EstadoCelda;
  monto: number | null; // lo que se muestra en la celda
  diff: number;         // pagado - monto3T (negativo = falta)
}

/**
 * Estado de la celda jugador x partido.
 * `partidoTieneCobros`: true si ese partido ya tiene al menos un cobro cargado.
 * Un partido jugado sin ningún cobro cargado se considera "pendiente" (no genera deuda todavía).
 */
export function estadoCelda(
  cobro: Cobro | undefined,
  monto3T: number,
  partido: Partido,
  partidoTieneCobros: boolean
): CeldaCobro {
  const activo = partido.jugado && partidoTieneCobros;
  if (!cobro) {
    if (!activo) return { estado: "pendiente", monto: null, diff: 0 };
    return { estado: "debe", monto: monto3T, diff: -monto3T };
  }
  if (cobro.presencia === "ausente") return { estado: "ausente", monto: null, diff: 0 };
  const diff = cobro.monto - monto3T;
  if (cobro.es_compra) {
    return diff >= 0
      ? { estado: "compra", monto: monto3T, diff }
      : { estado: "parcial", monto: cobro.monto, diff };
  }
  if (cobro.monto >= monto3T) return { estado: "saldado", monto: cobro.monto, diff };
  if (cobro.monto > 0) return { estado: "parcial", monto: cobro.monto, diff };
  return { estado: "debe", monto: monto3T, diff: -monto3T };
}

/** Deuda acumulada de un jugador (negativo = debe). */
export function deudaJugador(
  jugador: Jugador,
  partidos: Partido[],
  cobrosByJugPartido: Map<string, Cobro>,
  montoGlobal: number,
  partidosConCobros: Set<string>
): number {
  return partidosLocales(partidos).reduce((sum, p) => {
    const m = montoPartido(p, montoGlobal);
    const c = cobrosByJugPartido.get(`${jugador.id}:${p.id}`);
    const e = estadoCelda(c, m, p, partidosConCobros.has(p.id));
    if (e.estado === "ausente" || e.estado === "pendiente") return sum;
    if (e.estado === "saldado" || e.estado === "compra") return sum;
    if (e.estado === "parcial") return sum + e.diff;
    return sum - m;
  }, 0);
}

// ---------- Caja ----------
export function saldoFondo(movs: CajaMovimiento[], fondo: FormaPago): number {
  return movs
    .filter((m) => m.fondo === fondo)
    .reduce((s, m) => s + (m.tipo === "Ingreso" ? m.monto : -m.monto), 0);
}
export function totalPorFondo(movs: CajaMovimiento[], fondo: FormaPago, tipo: "Ingreso" | "Egreso"): number {
  return movs.filter((m) => m.fondo === fondo && m.tipo === tipo).reduce((s, m) => s + m.monto, 0);
}

// ---------- Presupuesto (real) ----------
export interface FilaPresupuesto {
  partido: Partido;
  local: boolean;
  futuro: boolean;
  cobrado: number;
  gasto3t: number;
  lavanderia: number;
  entretiempo: number;
  extras: number;
  totalGastos: number;
  resultado: number;
  deuda: number;
}

export function presupuestoPorPartido(args: {
  partidos: Partido[];
  jugadores: Jugador[];
  cobros: Cobro[];
  gastos3t: Gasto3T[];
  gastosFijos: GastoFijo[];
  montoGlobal: number;
}): FilaPresupuesto[] {
  const { partidos, jugadores, cobros, gastos3t, gastosFijos, montoGlobal } = args;
  const activos = jugadores.filter((j) => j.activo);
  const cobrosByJugPartido = new Map(cobros.map((c) => [`${c.jugador_id}:${c.partido_id}`, c]));
  const partidosConCobros = new Set(cobros.map((c) => c.partido_id));

  return [...partidos]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((p) => {
      const local = p.tipo === "Local";
      const m = montoPartido(p, montoGlobal);

      let cobrado = 0;
      let deberian = 0;
      if (local) {
        for (const j of activos) {
          const c = cobrosByJugPartido.get(`${j.id}:${p.id}`);
          const e = estadoCelda(c, m, p, partidosConCobros.has(p.id));
          if (e.estado === "pendiente" || e.estado === "ausente") continue;
          deberian += m;
          if (c && c.presencia !== "ausente") {
            cobrado += c.es_compra ? Math.min(c.monto, m) : c.monto;
          }
        }
      }

      const gasto3t = local
        ? gastos3t.filter((g) => g.partido_id === p.id).reduce((s, g) => s + g.monto_gastado, 0)
        : 0;
      const lav = gastosFijos.filter((g) => g.partido_id === p.id && g.categoria === "lavanderia").reduce((s, g) => s + g.total, 0);
      const et = gastosFijos.filter((g) => g.partido_id === p.id && g.categoria === "entretiempo").reduce((s, g) => s + g.total, 0);
      const ex = gastosFijos.filter((g) => g.partido_id === p.id && g.categoria === "extra").reduce((s, g) => s + g.total, 0);
      const totalGastos = gasto3t + lav + et + ex;

      return {
        partido: p,
        local,
        futuro: !p.jugado,
        cobrado,
        gasto3t,
        lavanderia: lav,
        entretiempo: et,
        extras: ex,
        totalGastos,
        resultado: cobrado - totalGastos,
        deuda: Math.max(0, deberian - cobrado),
      };
    });
}
