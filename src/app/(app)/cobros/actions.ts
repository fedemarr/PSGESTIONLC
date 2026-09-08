"use server";

import { revalidatePath } from "next/cache";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { FormaPago, Presencia } from "@/lib/types";

const REVALIDATE = ["/cobros", "/caja", "/inicio", "/presupuesto", "/jugadores"];

export async function guardarCobro(jugadorId: string, partidoId: string, formData: FormData) {
  if (!hasSupabaseEnv()) return { error: "DB no conectada" };
  const presencia = String(formData.get("presencia") ?? "jugo") as Presencia;
  const forma = String(formData.get("forma") ?? "MP") as FormaPago;
  const obs = String(formData.get("obs") ?? "").trim();
  const monto = presencia === "ausente" ? 0 : Number(formData.get("monto") ?? 0);

  if (presencia !== "ausente" && monto <= 0) {
    return { error: "Ingresá el monto pagado (o marcá Ausente)." };
  }

  const sb = createClient();
  const { error } = await sb
    .from("cobros")
    .upsert(
      { jugador_id: jugadorId, partido_id: partidoId, presencia, monto, forma, es_compra: false, obs },
      { onConflict: "jugador_id,partido_id" },
    );
  if (error) return { error: error.message };
  REVALIDATE.forEach((p) => revalidatePath(p));
}

export async function eliminarCobro(jugadorId: string, partidoId: string) {
  if (!hasSupabaseEnv()) return;
  const sb = createClient();
  await sb.from("cobros").delete().eq("jugador_id", jugadorId).eq("partido_id", partidoId);
  REVALIDATE.forEach((p) => revalidatePath(p));
}
