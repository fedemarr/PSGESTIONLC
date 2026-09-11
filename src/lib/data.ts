import "server-only";
import { createClient, hasSupabaseEnv } from "./supabase/server";
import type {
  Activacion,
  CajaMovimiento,
  Cobro,
  Config,
  Gasto3T,
  GastoFijo,
  Jugador,
  Partido,
} from "./types";

export const TEMPORADA = 2026;

const CONFIG_DEFAULT: Config = {
  id: 1,
  monto_global: 20000,
  temporada_activa: TEMPORADA,
  saldo_inicial_mp: 0,
  saldo_inicial_efectivo: 0,
};

/** true si todavía no hay Supabase conectado — las páginas muestran estado vacío. */
export function dbConectada(): boolean {
  return hasSupabaseEnv();
}

export async function getConfig(): Promise<Config> {
  if (!hasSupabaseEnv()) return CONFIG_DEFAULT;
  const sb = createClient();
  const { data } = await sb.from("config").select("*").eq("id", 1).maybeSingle();
  return (data as Config) ?? CONFIG_DEFAULT;
}

export async function getJugadores(): Promise<Jugador[]> {
  if (!hasSupabaseEnv()) return [];
  const sb = createClient();
  const { data } = await sb
    .from("jugadores")
    .select("*")
    .eq("temporada", TEMPORADA)
    .order("nombre");
  return (data as Jugador[]) ?? [];
}

export async function getPartidos(): Promise<Partido[]> {
  if (!hasSupabaseEnv()) return [];
  const sb = createClient();
  const { data } = await sb
    .from("partidos")
    .select("*")
    .eq("temporada", TEMPORADA)
    .order("fecha");
  return (data as Partido[]) ?? [];
}

export async function getCobros(): Promise<Cobro[]> {
  if (!hasSupabaseEnv()) return [];
  const sb = createClient();
  const { data } = await sb.from("cobros").select("*");
  return (data as Cobro[]) ?? [];
}

export async function getGastos3T(): Promise<Gasto3T[]> {
  if (!hasSupabaseEnv()) return [];
  const sb = createClient();
  const { data } = await sb.from("gastos_3t").select("*");
  return (data as Gasto3T[]) ?? [];
}

export async function getGastosFijos(): Promise<GastoFijo[]> {
  if (!hasSupabaseEnv()) return [];
  const sb = createClient();
  const { data } = await sb.from("gastos_fijos").select("*");
  return (data as GastoFijo[]) ?? [];
}

export async function getActivaciones(): Promise<Activacion[]> {
  if (!hasSupabaseEnv()) return [];
  const sb = createClient();
  const { data } = await sb.from("jugador_activaciones").select("*");
  return (data as Activacion[]) ?? [];
}

export async function getCajaMovimientos(): Promise<CajaMovimiento[]> {
  if (!hasSupabaseEnv()) return [];
  const sb = createClient();
  const { data } = await sb
    .from("caja_movimientos")
    .select("*")
    .eq("temporada", TEMPORADA)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false });
  return (data as CajaMovimiento[]) ?? [];
}
