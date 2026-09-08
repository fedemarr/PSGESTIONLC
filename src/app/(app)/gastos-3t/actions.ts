"use server";

import { revalidatePath } from "next/cache";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { FormaPago, Grupo3T } from "@/lib/types";

const REVALIDATE = ["/gastos-3t", "/cobros", "/caja", "/inicio", "/presupuesto", "/jugadores"];

function parse(formData: FormData) {
  const grupoComprador = String(formData.get("grupo_comprador") ?? "");
  return {
    comprador: String(formData.get("comprador") ?? "").trim(),
    es_jugador_plantel: formData.get("es_jugador_plantel") === "true",
    grupo_comprador: (grupoComprador || null) as Grupo3T | null,
    concepto: String(formData.get("concepto") ?? "").trim(),
    monto_gastado: Number(formData.get("monto_gastado") ?? 0),
    monto_pagado: Number(formData.get("monto_pagado") ?? 0),
    forma_pago: String(formData.get("forma_pago") ?? "MP") as FormaPago,
    obs: String(formData.get("obs") ?? "").trim(),
  };
}

export async function crearGasto3T(partidoId: string, grupoTurno: Grupo3T, formData: FormData) {
  if (!hasSupabaseEnv()) return { error: "DB no conectada" };
  const d = parse(formData);
  if (!d.comprador || !d.concepto || !d.monto_gastado) {
    return { error: "Completá comprador, concepto y monto gastado." };
  }
  const sb = createClient();
  const { error } = await sb.from("gastos_3t").insert({
    partido_id: partidoId,
    grupo_turno: grupoTurno,
    ...d,
  });
  if (error) return { error: error.message };
  REVALIDATE.forEach((p) => revalidatePath(p));
}

export async function actualizarGasto3T(id: string, formData: FormData) {
  if (!hasSupabaseEnv()) return { error: "DB no conectada" };
  const d = parse(formData);
  if (!d.comprador || !d.concepto || !d.monto_gastado) {
    return { error: "Completá comprador, concepto y monto gastado." };
  }
  const sb = createClient();
  const { error } = await sb.from("gastos_3t").update(d).eq("id", id);
  if (error) return { error: error.message };
  REVALIDATE.forEach((p) => revalidatePath(p));
}

export async function eliminarGasto3T(id: string) {
  if (!hasSupabaseEnv()) return;
  const sb = createClient();
  await sb.from("gastos_3t").delete().eq("id", id);
  REVALIDATE.forEach((p) => revalidatePath(p));
}
