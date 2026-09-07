import type { Grupo3T } from "./types";

/** $12.345 — siempre valor absoluto (para montos que no llevan signo). */
export function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return "$" + Math.abs(Math.round(n)).toLocaleString("es-AR");
}

/** $-12.345 — conserva el signo (para saldos). */
export function fmtS(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return (n < 0 ? "-" : "") + fmt(n);
}

/** 2026-03-14 -> 14/3/2026 */
export function fmtFecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${parseInt(d)}/${parseInt(m)}/${y}`;
}

/** 2026-03-14 -> 14/3 */
export function fechaCorta(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${parseInt(d)}/${parseInt(m)}`;
}

const MESES = ["", "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export function fechaDisplay(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${parseInt(d)} ${MESES[parseInt(m)]}`;
}

const MESES_LARGO = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
export function mesLabel(iso: string): string {
  const [y, m] = iso.split("-");
  return `${MESES_LARGO[parseInt(m)]} ${y}`;
}

export const GRUPO_META: Record<Grupo3T, { color: string; bg: string; short: string }> = {
  "Sabores express": { color: "#1F4E79", bg: "#D9E1F2", short: "Sabores" },
  "Mc Donalds": { color: "#375623", bg: "#E2EFDA", short: "Mc Donalds" },
  "Whisky": { color: "#843C0C", bg: "#FCE4D6", short: "Whisky" },
};

export function grupoColor(g: Grupo3T | null | undefined): string {
  return g ? GRUPO_META[g].color : "#1F4E79";
}

/** Estado del partido según su fecha. */
export function estadoPartido(p: { fecha: string; jugado: boolean }): "hoy" | "jugado" | "proximo" {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fp = new Date(p.fecha + "T00:00:00");
  if (fp.getTime() === hoy.getTime()) return "hoy";
  if (fp < hoy || p.jugado) return "jugado";
  return "proximo";
}
