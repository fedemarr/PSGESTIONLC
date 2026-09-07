"use server";

import { revalidatePath } from "next/cache";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { TEMPORADA } from "@/lib/data";
import type { Grupo3T } from "@/lib/types";

function parse(formData: FormData) {
  return {
    nombre: String(formData.get("nombre") ?? "").trim(),
    apodo: String(formData.get("apodo") ?? "").trim(),
    grupo: String(formData.get("grupo") ?? "") as Grupo3T,
    posicion: String(formData.get("posicion") ?? "").trim(),
    camada: formData.get("camada") ? Number(formData.get("camada")) : null,
    activo: formData.get("activo") === "on" || formData.get("activo") === "true",
    obs: String(formData.get("obs") ?? "").trim(),
  };
}

export async function crearJugador(formData: FormData) {
  if (!hasSupabaseEnv()) return { error: "DB no conectada" };
  const d = parse(formData);
  if (!d.nombre || !d.grupo) return { error: "Nombre y grupo son obligatorios" };
  const sb = createClient();
  const { error } = await sb.from("jugadores").insert({ ...d, temporada: TEMPORADA });
  if (error) return { error: error.message };
  revalidatePath("/jugadores");
}

export async function actualizarJugador(id: string, formData: FormData) {
  if (!hasSupabaseEnv()) return { error: "DB no conectada" };
  const d = parse(formData);
  if (!d.nombre || !d.grupo) return { error: "Nombre y grupo son obligatorios" };
  const sb = createClient();
  const { error } = await sb.from("jugadores").update(d).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/jugadores");
}

export async function toggleActivoJugador(id: string, activo: boolean) {
  if (!hasSupabaseEnv()) return;
  const sb = createClient();
  await sb.from("jugadores").update({ activo }).eq("id", id);
  revalidatePath("/jugadores");
}
