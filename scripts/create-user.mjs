// Crea (o actualiza) el usuario de login en Supabase Auth.
// Uso: node scripts/create-user.mjs <email> <password>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const line of fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const email = process.argv[2];
const password = process.argv[3];
if (!email || !password) {
  console.error("Uso: node scripts/create-user.mjs <email> <password>");
  process.exit(1);
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: list } = await sb.auth.admin.listUsers();
const existing = list?.users?.find((u) => u.email === email);

if (existing) {
  const { error } = await sb.auth.admin.updateUserById(existing.id, { password, email_confirm: true });
  if (error) throw error;
  console.log("Usuario actualizado:", email);
} else {
  const { error } = await sb.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  console.log("Usuario creado:", email);
}
