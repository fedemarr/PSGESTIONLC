"use server";

import { revalidatePath } from "next/cache";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { TEMPORADA } from "@/lib/data";
import type { Grupo3T } from "@/lib/types";

const REVALIDATE = ["/jugadores", "/cobros", "/inicio", "/presupuesto"];
function revalidateAll() {
  REVALIDATE.forEach((p) => revalidatePath(p));
}

function parse(formData: FormData) {
  return {
    nombre: String(formData.get("nombre") ?? "").trim(),
    apodo: String(formData.get("apodo") ?? "").trim(),
    grupo: String(formData.get("grupo") ?? "") as Grupo3T,
    posicion: String(formData.get("posicion") ?? "").trim(),
    camada: formData.get("camada") ? Number(formData.get("camada")) : null,
    obs: String(formData.get("obs") ?? "").trim(),
  };
}

export async function crearJugador(formData: FormData) {
  if (!hasSupabaseEnv()) return { error: "DB no conectada" };
  const d = parse(formData);
  const fechaAlta = String(formData.get("fecha_alta") ?? "").trim() || new Date().toISOString().slice(0, 10);
  if (!d.nombre || !d.grupo) return { error: "Nombre y grupo son obligatorios" };

  const sb = createClient();
  const { data, error } = await sb
    .from("jugadores")
    .insert({ ...d, activo: true, temporada: TEMPORADA })
    .select("id")
    .single();
  if (error) return { error: error.message };

  const { error: errAct } = await sb
    .from("jugador_activaciones")
    .insert({ jugador_id: data.id, fecha_alta: fechaAlta, fecha_baja: null });
  if (errAct) return { error: errAct.message };

  revalidateAll();
}

export async function actualizarJugador(id: string, formData: FormData) {
  if (!hasSupabaseEnv()) return { error: "DB no conectada" };
  const d = parse(formData);
  if (!d.nombre || !d.grupo) return { error: "Nombre y grupo son obligatorios" };
  const sb = createClient();
  const { error } = await sb.from("jugadores").update(d).eq("id", id);
  if (error) return { error: error.message };
  revalidateAll();
}

/** Da de baja al jugador desde `fecha`: cierra su período de activación abierto. */
export async function darDeBaja(id: string, fecha: string) {
  if (!hasSupabaseEnv()) return { error: "DB no conectada" };
  const sb = createClient();
  const { error: errAct } = await sb
    .from("jugador_activaciones")
    .update({ fecha_baja: fecha })
    .eq("jugador_id", id)
    .is("fecha_baja", null);
  if (errAct) return { error: errAct.message };
  const { error } = await sb.from("jugadores").update({ activo: false }).eq("id", id);
  if (error) return { error: error.message };
  revalidateAll();
}

/** Reactiva al jugador desde `fecha`: abre un nuevo período de activación. */
export async function reactivar(id: string, fecha: string) {
  if (!hasSupabaseEnv()) return { error: "DB no conectada" };
  const sb = createClient();
  const { error: errAct } = await sb
    .from("jugador_activaciones")
    .insert({ jugador_id: id, fecha_alta: fecha, fecha_baja: null });
  if (errAct) return { error: errAct.message };
  const { error } = await sb.from("jugadores").update({ activo: true }).eq("id", id);
  if (error) return { error: error.message };
  revalidateAll();
}
