"use server";

import { revalidatePath } from "next/cache";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { AccionTipo, RugbyCategoria, RugbyEquipo } from "@/lib/types";

const REVALIDATE = ["/partidos", "/jugadores"];
function revalidateAll() {
  REVALIDATE.forEach((p) => revalidatePath(p));
}

export async function agregarAccion(
  partidoId: string,
  categoria: RugbyCategoria,
  equipo: RugbyEquipo,
  tipo: AccionTipo,
  jugadorId: string | null,
) {
  if (!hasSupabaseEnv()) return { error: "DB no conectada" };
  const sb = createClient();
  const { error } = await sb.from("acciones_partido").insert({
    partido_id: partidoId,
    categoria,
    equipo,
    tipo,
    jugador_id: jugadorId,
  });
  if (error) return { error: error.message };
  revalidateAll();
}

export async function quitarAccion(id: string) {
  if (!hasSupabaseEnv()) return;
  const sb = createClient();
  await sb.from("acciones_partido").delete().eq("id", id);
  revalidateAll();
}

export async function setAjuste(partidoId: string, categoria: RugbyCategoria, ptsCedros: number, ptsRival: number) {
  if (!hasSupabaseEnv()) return { error: "DB no conectada" };
  const sb = createClient();
  const { error } = await sb
    .from("ajustes_resultado")
    .upsert(
      { partido_id: partidoId, categoria, pts_cedros: ptsCedros, pts_rival: ptsRival },
      { onConflict: "partido_id,categoria" },
    );
  if (error) return { error: error.message };
  revalidateAll();
}

export async function quitarAjuste(partidoId: string, categoria: RugbyCategoria) {
  if (!hasSupabaseEnv()) return;
  const sb = createClient();
  await sb.from("ajustes_resultado").delete().eq("partido_id", partidoId).eq("categoria", categoria);
  revalidateAll();
}
