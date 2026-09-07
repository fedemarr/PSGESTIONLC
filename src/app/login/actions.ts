"use server";

import { redirect } from "next/navigation";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";

export async function signIn(formData: FormData): Promise<{ error: string } | void> {
  if (!hasSupabaseEnv()) {
    return { error: "Falta configurar Supabase (.env.local)." };
  }
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/inicio") || "/inicio";

  const sb = createClient();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { error: "Email o contraseña incorrectos." };
  redirect(next);
}

export async function signOut() {
  if (hasSupabaseEnv()) {
    const sb = createClient();
    await sb.auth.signOut();
  }
  redirect("/login");
}
