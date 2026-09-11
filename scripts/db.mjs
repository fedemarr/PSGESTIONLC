// Runner de SQL contra Supabase. Uso:
//   node scripts/db.mjs migrate           -> corre supabase/migrations/*.sql en orden
//   node scripts/db.mjs seed              -> corre supabase/seed.sql
//   node scripts/db.mjs sql "select 1"    -> ejecuta una consulta suelta
//   node scripts/db.mjs check             -> resumen de filas por tabla
//
// Lee SUPABASE_DB_URL de .env.local

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// --- cargar .env.local a mano ---
const envPath = path.join(ROOT, ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const CONN = process.env.SUPABASE_DB_URL;
if (!CONN) {
  console.error("Falta SUPABASE_DB_URL en .env.local");
  process.exit(1);
}

const cmd = process.argv[2];

async function withClient(fn) {
  const client = new pg.Client({ connectionString: CONN, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function runFile(client, file) {
  const sql = fs.readFileSync(file, "utf8");
  process.stdout.write(`→ ${path.relative(ROOT, file)} … `);
  await client.query(sql);
  console.log("ok");
}

async function main() {
  if (cmd === "migrate") {
    const dir = path.join(ROOT, "supabase", "migrations");
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
    await withClient(async (c) => {
      for (const f of files) await runFile(c, path.join(dir, f));
    });
  } else if (cmd === "seed") {
    if (process.argv[3] !== "--force") {
      console.error(
        "⚠️  seed.sql TRUNCA cobros / gastos_3t / gastos_fijos / caja_movimientos.\n" +
        "   El sistema está en uso real — esto borraría datos cargados por Lautaro.\n" +
        "   Si estás seguro, corré: node scripts/db.mjs seed --force",
      );
      process.exit(1);
    }
    await withClient((c) => runFile(c, path.join(ROOT, "supabase", "seed.sql")));
  } else if (cmd === "sql") {
    const q = process.argv[3];
    await withClient(async (c) => {
      const r = await c.query(q);
      console.table(r.rows);
    });
  } else if (cmd === "check") {
    await withClient(async (c) => {
      const tablas = ["config", "jugadores", "partidos", "cobros", "gastos_3t", "gastos_fijos", "caja_movimientos"];
      const out = {};
      for (const t of tablas) {
        const r = await c.query(`select count(*)::int as n from ${t}`);
        out[t] = r.rows[0].n;
      }
      console.table(out);
      const saldo = await c.query(`
        select fondo,
               sum(case when tipo='Ingreso' then monto else -monto end)::numeric as saldo
        from caja_movimientos group by fondo`);
      console.table(saldo.rows);
    });
  } else {
    console.log("Comandos: migrate | seed | sql \"<query>\" | check");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("\nERROR:", e.message);
  process.exit(1);
});
