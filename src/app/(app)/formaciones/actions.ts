"use server";

import { revalidatePath } from "next/cache";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { RugbyCategoria } from "@/lib/types";

const REVALIDATE = ["/formaciones", "/partidos", "/jugadores"];
function revalidateAll() {
  REVALIDATE.forEach((p) => revalidatePath(p));
}

interface FormacionPayload {
  titulares: (string | null)[]; // 15 posiciones, id de jugador o null
  suplentes: (string | null)[];
  capitan: string | null;
}

export async function guardarFormacion(partidoId: string, categoria: RugbyCategoria, formData: FormData) {
  if (!hasSupabaseEnv()) return { error: "DB no conectada" };
  let payload: FormacionPayload;
  try {
    payload = JSON.parse(String(formData.get("data") ?? "{}"));
  } catch {
    return { error: "Datos inválidos" };
  }
  const titularesLlenos = payload.titulares.filter(Boolean) as string[];
  if (titularesLlenos.length < 15) {
    return { error: `Faltan titulares: tenés ${titularesLlenos.length}/15.` };
  }
  if (new Set(titularesLlenos).size !== 15) {
    return { error: "Hay un jugador repetido en los titulares." };
  }

  const rows = [
    ...payload.titulares.map((jid, i) =>
      jid
        ? { partido_id: partidoId, categoria, jugador_id: jid, puesto: i + 1, capitan: jid === payload.capitan }
        : null,
    ),
    ...payload.suplentes
      .filter((jid): jid is string => !!jid)
      .map((jid) => ({ partido_id: partidoId, categoria, jugador_id: jid, puesto: null, capitan: jid === payload.capitan })),
  ].filter((r): r is NonNullable<typeof r> => r !== null);

  const sb = createClient();
  const { error: errDel } = await sb.from("formaciones").delete().eq("partido_id", partidoId).eq("categoria", categoria);
  if (errDel) return { error: errDel.message };
  const { error } = await sb.from("formaciones").insert(rows);
  if (error) return { error: error.message };
  revalidateAll();
}

export async function borrarFormacion(partidoId: string, categoria: RugbyCategoria) {
  if (!hasSupabaseEnv()) return;
  const sb = createClient();
  await sb.from("formaciones").delete().eq("partido_id", partidoId).eq("categoria", categoria);
  revalidateAll();
}
