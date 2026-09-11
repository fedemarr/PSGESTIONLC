import type { Grupo3T } from "./types";
import type { EstadoCelda } from "./business";

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

/** Estilo visual de cada estado de celda de Cobros (grilla, drawer, modal). */
export const CELDA_META: Record<EstadoCelda, { bg: string; fg: string; label: string; border?: string }> = {
  saldado: { bg: "#D5F5E3", fg: "#1E8449", label: "Saldado" },
  debe: { bg: "#FDECEA", fg: "#C00000", label: "Debe" },
  parcial: { bg: "#FFF2CC", fg: "#856404", label: "Parcial" },
  compra: { bg: "#D6EAF8", fg: "#1A5276", label: "Compra" },
  acordado: { bg: "#D1FAE5", fg: "#065F46", label: "Acordado", border: "#6EE7B7" },
  ausente: { bg: "#F5F5F5", fg: "#9aa0a6", label: "Ausente" },
  pendiente: { bg: "#FFFFFF", fg: "#cfcfcf", label: "" },
};

/** Estado del partido según su fecha. */
export function estadoPartido(p: { fecha: string; jugado: boolean }): "hoy" | "jugado" | "proximo" {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fp = new Date(p.fecha + "T00:00:00");
  if (fp.getTime() === hoy.getTime()) return "hoy";
  if (fp < hoy || p.jugado) return "jugado";
  return "proximo";
}
