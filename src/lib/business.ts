import type { Activacion, Cobro, Gasto3T, GastoFijo, Jugador, Partido, Grupo3T, CajaMovimiento, FormaPago } from "./types";

/** ¿El jugador tenía una activación vigente en esa fecha (alta <= fecha <= baja o sin baja)? */
export function activoEnFecha(activaciones: Activacion[], jugadorId: string, fecha: string): boolean {
  return activaciones.some(
    (a) => a.jugador_id === jugadorId && a.fecha_alta <= fecha && (!a.fecha_baja || a.fecha_baja >= fecha),
  );
}

/** Rotación de cocina para partidos locales: Mc Donalds -> Whisky -> Sabores. */
export const ROTACION_GRUPOS: Grupo3T[] = ["Mc Donalds", "Whisky", "Sabores express"];
export function grupoTurno(indiceLocal: number): Grupo3T {
  return ROTACION_GRUPOS[indiceLocal % 3];
}

/** Grupo de turno de un partido local: el guardado, o el sugerido por rotación. */
export function grupoTurnoPartido(partido: Partido, indiceLocal: number): Grupo3T {
  return partido.grupo_turno ?? grupoTurno(indiceLocal);
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
  | "pendiente" // sin datos cargados para ese partido / partido futuro, o jugador no estaba activo
  | "debe"      // jugó y no pagó
  | "saldado"   // pagó el monto o más
  | "parcial"   // pagó algo pero falta
  | "compra"    // cubrió con compra (>= 3T)
  | "acordado"  // monto acordado con el jugador — sin deuda, sea cual sea el monto
  | "ausente";  // no estuvo

export interface CeldaCobro {
  estado: EstadoCelda;
  monto: number | null; // lo que se muestra en la celda
  diff: number;         // pagado - monto3T (negativo = falta)
}

/** Estado de una celda que YA tiene un cobro registrado. */
function estadoCeldaCobro(cobro: Cobro, monto3T: number): CeldaCobro {
  if (cobro.presencia === "ausente") return { estado: "ausente", monto: null, diff: 0 };
  if (cobro.monto_acordado) return { estado: "acordado", monto: cobro.monto, diff: 0 };
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

/** @deprecated usar estadoCeldaJugador — se mantiene por compatibilidad de firma. */
export function estadoCelda(
  cobro: Cobro | undefined,
  monto3T: number,
  _partido: Partido,
  _partidoTieneCobros: boolean,
): CeldaCobro {
  if (cobro) return estadoCeldaCobro(cobro, monto3T);
  return { estado: "pendiente", monto: null, diff: 0 };
}

/**
 * Suma de compras (Gastos 3T) por jugador del plantel y partido.
 * key: `${comprador}:${partido_id}` -> total monto_gastado.
 */
export function comprasMontoMap(gastos3t: Gasto3T[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const g of gastos3t) {
    if (!g.es_jugador_plantel) continue;
    const k = `${g.comprador}:${g.partido_id}`;
    m.set(k, (m.get(k) ?? 0) + g.monto_gastado);
  }
  return m;
}

/**
 * Estado de la celda combinando el cobro explícito, las compras del jugador y
 * si estaba activo (dado de alta) en la fecha del partido.
 * Prioridad: un cobro ya registrado SIEMPRE se muestra, esté o no activo el
 * jugador en esa fecha. Sin cobro, las compras cubren el 3T. Sin nada de eso,
 * solo genera deuda si el jugador estaba activo ese día.
 */
export function estadoCeldaJugador(args: {
  cobro?: Cobro;
  comprasMonto: number;
  monto3T: number;
  partido: Partido;
  partidoConRegistros: boolean; // hay cobros o compras cargados para ese partido
  activoEnFecha: boolean;       // el jugador tenía una activación vigente esa fecha
}): CeldaCobro {
  const { cobro, comprasMonto, monto3T, partido, partidoConRegistros, activoEnFecha: activoFecha } = args;
  if (cobro) return estadoCeldaCobro(cobro, monto3T);
  if (comprasMonto > 0) {
    const diff = comprasMonto - monto3T;
    return diff >= 0
      ? { estado: "compra", monto: monto3T, diff }
      : { estado: "parcial", monto: comprasMonto, diff };
  }
  const activo = partido.jugado && partidoConRegistros && activoFecha;
  return activo
    ? { estado: "debe", monto: monto3T, diff: -monto3T }
    : { estado: "pendiente", monto: null, diff: 0 };
}

const SIN_DEUDA: EstadoCelda[] = ["ausente", "pendiente", "saldado", "compra", "acordado"];

/** Deuda acumulada de un jugador (negativo = debe). */
export function deudaJugador(
  jugador: Jugador,
  partidos: Partido[],
  cobrosByJugPartido: Map<string, Cobro>,
  montoGlobal: number,
  partidosConRegistros: Set<string>,
  comprasMap: Map<string, number> = new Map(),
  activaciones: Activacion[] = [],
): number {
  return partidosLocales(partidos).reduce((sum, p) => {
    const m = montoPartido(p, montoGlobal);
    const e = estadoCeldaJugador({
      cobro: cobrosByJugPartido.get(`${jugador.id}:${p.id}`),
      comprasMonto: comprasMap.get(`${jugador.nombre}:${p.id}`) ?? 0,
      monto3T: m,
      partido: p,
      partidoConRegistros: partidosConRegistros.has(p.id),
      activoEnFecha: activoEnFecha(activaciones, jugador.id, p.fecha),
    });
    if (SIN_DEUDA.includes(e.estado)) return sum;
    if (e.estado === "parcial") return sum + e.diff;
    return sum - m;
  }, 0);
}

/** Saldo de una compra de Gasto 3T respecto del monto del 3T. */
export function saldoCompra3T(montoGastado: number, monto3T: number): {
  estado: "saldado" | "reintegro" | "debe";
  monto: number; // reintegro que le debe el fondo, o diferencia que debe el jugador
} {
  const diff = montoGastado - monto3T;
  if (diff === 0) return { estado: "saldado", monto: 0 };
  if (diff > 0) return { estado: "reintegro", monto: diff };
  return { estado: "debe", monto: -diff };
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
  activaciones?: Activacion[];
}): FilaPresupuesto[] {
  const { partidos, jugadores, cobros, gastos3t, gastosFijos, montoGlobal, activaciones = [] } = args;
  // Cualquier jugador con historial (cobro o compra) cuenta, no solo los activos hoy —
  // así el presupuesto de un partido viejo no cambia si después se dio de baja a alguien.
  const jugadoresConCobro = new Set(cobros.map((c) => c.jugador_id));
  const jugadoresConCompra = new Set(gastos3t.filter((g) => g.es_jugador_plantel).map((g) => g.comprador));
  const relevantes = jugadores.filter(
    (j) => j.activo || jugadoresConCobro.has(j.id) || jugadoresConCompra.has(j.nombre),
  );
  const cobrosByJugPartido = new Map(cobros.map((c) => [`${c.jugador_id}:${c.partido_id}`, c]));
  const comprasMap = comprasMontoMap(gastos3t);
  const partidosConRegistros = new Set<string>([
    ...cobros.map((c) => c.partido_id),
    ...gastos3t.filter((g) => g.es_jugador_plantel).map((g) => g.partido_id),
  ]);

  return [...partidos]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((p) => {
      const local = p.tipo === "Local";
      const m = montoPartido(p, montoGlobal);

      let cobrado = 0;
      let deberian = 0;
      if (local) {
        for (const j of relevantes) {
          const c = cobrosByJugPartido.get(`${j.id}:${p.id}`);
          const comprasMonto = comprasMap.get(`${j.nombre}:${p.id}`) ?? 0;
          const e = estadoCeldaJugador({
            cobro: c,
            comprasMonto,
            monto3T: m,
            partido: p,
            partidoConRegistros: partidosConRegistros.has(p.id),
            activoEnFecha: activoEnFecha(activaciones, j.id, p.fecha),
          });
          if (e.estado === "pendiente" || e.estado === "ausente") continue;
          if (e.estado === "acordado") {
            deberian += c!.monto;
            cobrado += c!.monto;
            continue;
          }
          deberian += m;
          if (c && c.presencia !== "ausente") {
            cobrado += c.es_compra ? Math.min(c.monto, m) : c.monto;
          } else if (!c && comprasMonto > 0) {
            cobrado += Math.min(comprasMonto, m);
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
