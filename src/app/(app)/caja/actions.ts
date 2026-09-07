"use server";

import { revalidatePath } from "next/cache";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { TEMPORADA } from "@/lib/data";
import type { FormaPago, MovTipo } from "@/lib/types";

export async function crearMovimientoManual(formData: FormData) {
  if (!hasSupabaseEnv()) return { error: "DB no conectada" };
  const concepto = String(formData.get("concepto") ?? "").trim();
  const monto = Number(formData.get("monto") ?? 0);
  const tipo = String(formData.get("tipo") ?? "Ingreso") as MovTipo;
  const fondo = String(formData.get("fondo") ?? "MP") as FormaPago;
  const fecha = String(formData.get("fecha") ?? "");
  const obs = String(formData.get("obs") ?? "").trim();
  if (!concepto || !monto || !fecha) return { error: "Completá concepto, monto y fecha" };

  const sb = createClient();
  const { error } = await sb.from("caja_movimientos").insert({
    fecha,
    concepto: obs ? `${concepto} — ${obs}` : concepto,
    origen: "Manual",
    tipo,
    fondo,
    monto,
    temporada: TEMPORADA,
  });
  if (error) return { error: error.message };
  revalidatePath("/caja");
  revalidatePath("/inicio");
}

export async function eliminarMovimiento(id: string) {
  if (!hasSupabaseEnv()) return;
  const sb = createClient();
  // Solo se pueden borrar los manuales desde acá.
  await sb.from("caja_movimientos").delete().eq("id", id).eq("origen", "Manual");
  revalidatePath("/caja");
  revalidatePath("/inicio");
}
