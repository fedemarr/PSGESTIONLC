"use server";

import { revalidatePath } from "next/cache";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { TEMPORADA } from "@/lib/data";
import type { Grupo3T, PartidoTipo } from "@/lib/types";

function parse(formData: FormData) {
  const tipo = String(formData.get("tipo") ?? "Local") as PartidoTipo;
  const montoRaw = formData.get("monto_3t");
  const grupoTurno = String(formData.get("grupo_turno") ?? "");
  return {
    fecha: String(formData.get("fecha") ?? ""),
    rival: String(formData.get("rival") ?? "").trim(),
    tipo,
    monto_3t: tipo === "Local" && montoRaw ? Number(montoRaw) : null,
    jugado: formData.get("jugado") === "on" || formData.get("jugado") === "true",
    obs: String(formData.get("obs") ?? "").trim(),
    grupo_turno: tipo === "Local" && grupoTurno ? (grupoTurno as Grupo3T) : null,
  };
}

export async function crearPartido(formData: FormData) {
  if (!hasSupabaseEnv()) return { error: "DB no conectada" };
  const d = parse(formData);
  if (!d.fecha || !d.rival) return { error: "Fecha y rival son obligatorios" };
  const sb = createClient();
  const { error } = await sb.from("partidos").insert({ ...d, temporada: TEMPORADA });
  if (error) return { error: error.message };
  revalidatePath("/partidos");
  revalidatePath("/cobros");
  revalidatePath("/presupuesto");
}

export async function actualizarPartido(id: string, formData: FormData) {
  if (!hasSupabaseEnv()) return { error: "DB no conectada" };
  const d = parse(formData);
  if (!d.fecha || !d.rival) return { error: "Fecha y rival son obligatorios" };
  const sb = createClient();
  const { error } = await sb.from("partidos").update(d).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/partidos");
  revalidatePath("/cobros");
  revalidatePath("/presupuesto");
}

export async function eliminarPartido(id: string) {
  if (!hasSupabaseEnv()) return;
  const sb = createClient();
  await sb.from("partidos").delete().eq("id", id);
  revalidatePath("/partidos");
}

export async function setMontoGlobal(monto: number) {
  if (!hasSupabaseEnv()) return;
  const sb = createClient();
  await sb.from("config").update({ monto_global: monto }).eq("id", 1);
  revalidatePath("/partidos");
  revalidatePath("/cobros");
  revalidatePath("/presupuesto");
}
