"use server";

import { revalidatePath } from "next/cache";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { FormaPago, GFCategoria, GFEstado } from "@/lib/types";

const REVALIDATE = ["/gastos-fijos", "/caja", "/inicio", "/presupuesto"];

function parse(formData: FormData) {
  const categoria = String(formData.get("categoria") ?? "extra") as GFCategoria;
  const cantidad = formData.get("cantidad_camisetas") ? Number(formData.get("cantidad_camisetas")) : null;
  const precio = formData.get("precio_unitario") ? Number(formData.get("precio_unitario")) : null;
  const totalInput = Number(formData.get("total") ?? 0);
  const total = categoria === "lavanderia" ? (cantidad ?? 0) * (precio ?? 0) : totalInput;

  return {
    partido_id: String(formData.get("partido_id") ?? ""),
    categoria,
    cantidad_camisetas: categoria === "lavanderia" ? cantidad : null,
    precio_unitario: categoria === "lavanderia" ? precio : null,
    detalle: categoria === "entretiempo" ? String(formData.get("detalle") ?? "").trim() : null,
    concepto: categoria === "extra" ? String(formData.get("concepto") ?? "").trim() : null,
    total,
    pagado_a: String(formData.get("pagado_a") ?? "").trim(),
    fecha_pago: String(formData.get("fecha_pago") ?? "") || null,
    forma: String(formData.get("forma") ?? "MP") as FormaPago,
    estado: String(formData.get("estado") ?? "Pagado") as GFEstado,
    obs: String(formData.get("obs") ?? "").trim(),
  };
}

export async function crearGastoFijo(formData: FormData) {
  if (!hasSupabaseEnv()) return { error: "DB no conectada" };
  const d = parse(formData);
  if (!d.partido_id) return { error: "Elegí el partido." };
  if (!d.total) return { error: "El total tiene que ser mayor a 0." };
  const sb = createClient();
  const { error } = await sb.from("gastos_fijos").insert(d);
  if (error) return { error: error.message };
  REVALIDATE.forEach((p) => revalidatePath(p));
}

export async function actualizarGastoFijo(id: string, formData: FormData) {
  if (!hasSupabaseEnv()) return { error: "DB no conectada" };
  const d = parse(formData);
  if (!d.partido_id) return { error: "Elegí el partido." };
  if (!d.total) return { error: "El total tiene que ser mayor a 0." };
  const sb = createClient();
  const { error } = await sb.from("gastos_fijos").update(d).eq("id", id);
  if (error) return { error: error.message };
  REVALIDATE.forEach((p) => revalidatePath(p));
}

export async function eliminarGastoFijo(id: string) {
  if (!hasSupabaseEnv()) return;
  const sb = createClient();
  await sb.from("gastos_fijos").delete().eq("id", id);
  REVALIDATE.forEach((p) => revalidatePath(p));
}
