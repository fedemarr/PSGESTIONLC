// Genera supabase/seed.sql a partir de "datos_cedros_v2 (1).xlsx".
// Uso:  node scripts/generate-seed.mjs
// Solo usa builtins de Node (lee el .xlsx como zip a mano).

import fs from "node:fs";
import zlib from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const XLSX = path.join(ROOT, "datos_cedros_v2 (1).xlsx");
const OUT = path.join(ROOT, "supabase", "seed.sql");
const TEMPORADA = 2026;

// ---------- mini lector de .xlsx (zip: central directory) ----------
function readXlsx(file) {
  const buf = fs.readFileSync(file);
  const u16 = (o) => buf.readUInt16LE(o);
  const u32 = (o) => buf.readUInt32LE(o);
  let eocd = -1;
  for (let p = buf.length - 22; p >= 0; p--) if (u32(p) === 0x06054b50) { eocd = p; break; }
  if (eocd < 0) throw new Error("EOCD no encontrado (¿xlsx válido?)");
  let p = u32(eocd + 16);
  const count = u16(eocd + 10);
  const files = {};
  for (let n = 0; n < count; n++) {
    if (u32(p) !== 0x02014b50) break;
    const method = u16(p + 10);
    const csize = u32(p + 20);
    const nlen = u16(p + 28), elen = u16(p + 30), clen = u16(p + 32);
    const lho = u32(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nlen);
    const lnlen = u16(lho + 26), lelen = u16(lho + 28);
    const dstart = lho + 30 + lnlen + lelen;
    let data = buf.subarray(dstart, dstart + csize);
    data = method === 8 ? zlib.inflateRawSync(data) : data;
    files[name] = data.toString("utf8");
    p += 46 + nlen + elen + clen;
  }
  return files;
}

function colToNum(c) { let n = 0; for (const ch of c) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; }

function parseSheet(xml, shared) {
  const rows = [];
  for (const rm of xml.matchAll(/<row[^>]*\br="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const rIdx = +rm[1];
    const cells = [];
    for (const cm of rm[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cm[1], inner = cm[2] || "";
      const rMatch = attrs.match(/\br="([A-Z]+)\d+"/); if (!rMatch) continue;
      const col = colToNum(rMatch[1]);
      const t = (attrs.match(/\bt="([^"]+)"/) || [])[1] || "n";
      const vMatch = inner.match(/<v>([\s\S]*?)<\/v>/);
      const isMatch = inner.match(/<t[^>]*>([\s\S]*?)<\/t>/);
      let val = "";
      if (t === "inlineStr" && isMatch) val = isMatch[1];
      else if (vMatch) val = t === "s" ? shared[+vMatch[1]] : vMatch[1];
      cells[col] = val;
    }
    rows[rIdx] = cells;
  }
  return rows;
}

const files = readXlsx(XLSX);
const shared = [...files["xl/sharedStrings.xml"].matchAll(/<si>([\s\S]*?)<\/si>/g)]
  .map((m) => [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join(""));
const wbNames = [...files["xl/workbook.xml"].matchAll(/<sheet[^>]*name="([^"]+)"[^>]*\/>/g)].map((m) => m[1]);
const S = {};
wbNames.forEach((nm, i) => { S[nm] = parseSheet(files[`xl/worksheets/sheet${i + 1}.xml`], shared); });

// ---------- helpers ----------
const clean = (s) => (s == null ? "" : String(s))
  .replace(/&apos;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
const num = (s) => { const n = parseFloat(clean(s).replace(/[^0-9.-]/g, "")); return isNaN(n) ? 0 : n; };
const q = (s) => `'${clean(s).replace(/'/g, "''")}'`;
const qn = (v) => (v === null || v === undefined || v === "" ? "null" : v);
const grupoNorm = (g) => {
  const x = clean(g).toLowerCase();
  if (x.startsWith("sabor")) return "Sabores express";
  if (x.startsWith("mc")) return "Mc Donalds";
  if (x.startsWith("whis")) return "Whisky";
  return null;
};

const out = [];
out.push("-- Generado por scripts/generate-seed.mjs — NO editar a mano.");
out.push("-- Correr DESPUÉS de 0001_schema.sql. Idempotente por claves naturales.");
out.push("begin;");
out.push("");
out.push(`update config set monto_global = 20000, temporada_activa = ${TEMPORADA}, saldo_inicial_mp = 97216.84, saldo_inicial_efectivo = 18000 where id = 1;`);
out.push("");

// ---------- JUGADORES ----------
const jugRows = S["Jugadores"].slice(5).filter((r) => r && clean(r[0]));
out.push("-- JUGADORES");
for (const r of jugRows) {
  const nombre = clean(r[0]);
  const apodo = clean(r[1]);
  const grupo = grupoNorm(r[2]) || "Sabores express";
  const pos = clean(r[3]);
  const activo = /inact|baja/i.test(clean(r[5])) ? "false" : "true";
  const obs = clean(r[6]);
  out.push(
    `insert into jugadores (nombre, apodo, grupo, posicion, activo, obs, temporada) values ` +
    `(${q(nombre)}, ${q(apodo)}, ${q(grupo)}, ${q(pos)}, ${activo}, ${q(obs)}, ${TEMPORADA}) ` +
    `on conflict (nombre, temporada) do update set apodo=excluded.apodo, grupo=excluded.grupo, ` +
    `posicion=excluded.posicion, activo=excluded.activo, obs=excluded.obs;`
  );
}
out.push("");

// ---------- PARTIDOS ----------
const fixRows = S["Fixture"].slice(5).filter((r) => r && /^\d{4}-\d\d-\d\d$/.test(clean(r[0])));
out.push("-- PARTIDOS");
out.push("create unique index if not exists partidos_natural_uk on partidos (temporada, fecha, rival);");
for (const r of fixRows) {
  const fecha = clean(r[0]);
  const rival = clean(r[1]);
  const tipo = clean(r[2]) === "Visitante" ? "Visitante" : "Local";
  const montoRaw = num(r[3]);
  const monto = tipo === "Local" && montoRaw ? montoRaw : null;
  const jugado = /^si$/i.test(clean(r[4])) ? "true" : "false";
  const obs = fecha === "2026-08-29" ? "Cambió de visitante a local" : "";
  out.push(
    `insert into partidos (fecha, rival, tipo, monto_3t, jugado, obs, temporada) values ` +
    `(${q(fecha)}, ${q(rival)}, ${q(tipo)}, ${qn(monto)}, ${jugado}, ${q(obs)}, ${TEMPORADA}) ` +
    `on conflict (temporada, fecha, rival) do update set tipo=excluded.tipo, monto_3t=excluded.monto_3t, ` +
    `jugado=excluded.jugado, obs=excluded.obs;`
  );
}
out.push("");

// ---------- COBROS ----------
const cobRows = S["Cobros 3T"].slice(5).filter((r) => r && clean(r[0]) && /^\d{4}-\d\d-\d\d$/.test(clean(r[1])));
out.push("-- COBROS 3T (histórico)");
for (const r of cobRows) {
  const nombre = clean(r[0]).replace(/\bAcuna\b/, "Acuña");
  const fecha = clean(r[1]);
  const rival = clean(r[2]);
  const monto = num(r[4]);
  let forma = clean(r[5]); if (forma !== "MP" && forma !== "Efectivo") forma = "MP";
  const pRaw = clean(r[6]).toLowerCase();
  const presencia = pRaw.startsWith("jug") ? "jugo" : pRaw.startsWith("no") ? "nojugo" : "ausente";
  const esCompra = /^si$/i.test(clean(r[7])) ? "true" : "false";
  const obs = clean(r[8]);
  out.push(
    `insert into cobros (jugador_id, partido_id, presencia, monto, forma, es_compra, obs) ` +
    `select j.id, p.id, ${q(presencia)}, ${monto}, ${q(forma)}, ${esCompra}, ${q(obs)} ` +
    `from jugadores j, partidos p ` +
    `where j.nombre = ${q(nombre)} and j.temporada = ${TEMPORADA} ` +
    `and p.fecha = ${q(fecha)} and p.rival = ${q(rival)} and p.temporada = ${TEMPORADA} ` +
    `on conflict (jugador_id, partido_id) do update set monto=excluded.monto, forma=excluded.forma, ` +
    `presencia=excluded.presencia, es_compra=excluded.es_compra, obs=excluded.obs;`
  );
}
out.push("");

// ---------- GASTOS 3T ----------
const g3Rows = S["Gastos 3T"].slice(5).filter((r) => r && /^\d{4}-\d\d-\d\d$/.test(clean(r[0])));
out.push("-- GASTOS 3T (histórico)");
for (const r of g3Rows) {
  const fecha = clean(r[0]);
  const rival = clean(r[1]);
  const grupoTurno = grupoNorm(r[2]);
  const compradorRaw = clean(r[3]);
  const comprador = compradorRaw.replace(/\s*\([^)]*\)\s*$/, "").trim();
  const esJug = /^si$/i.test(clean(r[4])) ? "true" : "false";
  const concepto = clean(r[5]);
  const gastado = num(r[6]);
  const pagado = num(r[7]);
  let forma = clean(r[8]); if (forma !== "MP" && forma !== "Efectivo") forma = "MP";
  const obs = clean(r[9]);
  out.push(
    `insert into gastos_3t (partido_id, grupo_turno, comprador, es_jugador_plantel, concepto, monto_gastado, monto_pagado, forma_pago, obs) ` +
    `select p.id, ${grupoTurno ? q(grupoTurno) : "null"}, ${q(comprador)}, ${esJug}, ${q(concepto)}, ${gastado}, ${pagado}, ${q(forma)}, ${q(obs)} ` +
    `from partidos p where p.fecha = ${q(fecha)} and p.rival = ${q(rival)} and p.temporada = ${TEMPORADA};`
  );
}
out.push("");

// ---------- GASTOS FIJOS ----------
const gf = S["Gastos Fijos"];
function sectionRows(label) {
  const idx = gf.findIndex((r) => r && clean(r[0]).toUpperCase() === label);
  const rows = [];
  if (idx < 0) return rows;
  for (let i = idx + 2; i < gf.length; i++) {
    const r = gf[i]; if (!r) continue;
    const c0 = clean(r[0]); if (!c0) continue;
    if (/^[A-ZÁÉÍÓÚ ]{5,}$/.test(c0) && !/^\d/.test(c0)) break;
    if (!/^\d{4}-\d\d-\d\d$/.test(c0)) continue;
    rows.push(r);
  }
  return rows;
}
const estado = (s) => { s = clean(s); return /pagad/i.test(s) ? "Pagado" : /parcial/i.test(s) ? "Parcial" : /pend/i.test(s) ? "Pendiente" : "Pagado"; };
const forma = (s) => (clean(s) === "Efectivo" ? "Efectivo" : "MP");

out.push("-- GASTOS FIJOS: LAVANDERÍA");
for (const r of sectionRows("LAVANDERIA")) {
  const fecha = clean(r[0]), rival = clean(r[2]);
  const cam = num(r[3]), pu = num(r[4]);
  const total = num(r[5]) || cam * pu;
  out.push(
    `insert into gastos_fijos (partido_id, categoria, cantidad_camisetas, precio_unitario, total, pagado_a, fecha_pago, forma, estado, obs) ` +
    `select p.id, 'lavanderia', ${cam}, ${pu}, ${total}, ${q(clean(r[6]))}, ${r[7] ? q(clean(r[7])) : "null"}, ${q(forma(r[8]))}, ${q(estado(r[9]))}, ${q(clean(r[10]))} ` +
    `from partidos p where p.fecha = ${q(fecha)} and p.rival = ${q(rival)} and p.temporada = ${TEMPORADA};`
  );
}
out.push("");
out.push("-- GASTOS FIJOS: ENTRETIEMPO");
for (const r of sectionRows("ENTRETIEMPO")) {
  const fecha = clean(r[0]), rival = clean(r[2]);
  out.push(
    `insert into gastos_fijos (partido_id, categoria, detalle, total, pagado_a, fecha_pago, forma, estado, obs) ` +
    `select p.id, 'entretiempo', ${q(clean(r[3]))}, ${num(r[4])}, ${q(clean(r[5]))}, ${r[6] ? q(clean(r[6])) : "null"}, ${q(forma(r[7]))}, ${q(estado(r[8]))}, ${q(clean(r[9]))} ` +
    `from partidos p where p.fecha = ${q(fecha)} and p.rival = ${q(rival)} and p.temporada = ${TEMPORADA};`
  );
}
out.push("");
out.push("-- GASTOS FIJOS: EXTRAS");
for (const r of sectionRows("GASTOS EXTRAS")) {
  const fecha = clean(r[0]), rival = clean(r[2]);
  out.push(
    `insert into gastos_fijos (partido_id, categoria, concepto, total, pagado_a, fecha_pago, forma, estado, obs) ` +
    `select p.id, 'extra', ${q(clean(r[3]))}, ${num(r[4])}, ${q(clean(r[5]))}, ${r[6] ? q(clean(r[6])) : "null"}, ${q(forma(r[7]))}, ${q(estado(r[8]))}, ${q(clean(r[9]))} ` +
    `from partidos p where p.fecha = ${q(fecha)} and p.rival = ${q(rival)} and p.temporada = ${TEMPORADA};`
  );
}
out.push("");

// ---------- CAJA ----------
const cjRows = S["Caja"].slice(5).filter((r) => r && /^\d{4}-\d\d-\d\d$/.test(clean(r[0])));
out.push("-- CAJA (movimientos históricos)");
for (const r of cjRows) {
  const fecha = clean(r[0]);
  const concepto = clean(r[1]) + (clean(r[6]) ? ` — ${clean(r[6])}` : "");
  const tipo = /ingreso/i.test(clean(r[2])) ? "Ingreso" : "Egreso";
  const fondo = /efect/i.test(clean(r[3])) ? "Efectivo" : "MP";
  const monto = num(r[4]);
  const origen = clean(r[5]) || "Manual";
  out.push(
    `insert into caja_movimientos (fecha, concepto, origen, tipo, fondo, monto, temporada) values ` +
    `(${q(fecha)}, ${q(concepto)}, ${q(origen)}, ${q(tipo)}, ${q(fondo)}, ${monto}, ${TEMPORADA});`
  );
}
out.push("");
out.push("commit;");
out.push("");

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out.join("\n"), "utf8");

const counts = {
  jugadores: jugRows.length, partidos: fixRows.length, cobros: cobRows.length,
  gastos_3t: g3Rows.length,
  lavanderia: sectionRows("LAVANDERIA").length,
  entretiempo: sectionRows("ENTRETIEMPO").length,
  extras: sectionRows("GASTOS EXTRAS").length,
  caja: cjRows.length,
};
console.log("seed.sql escrito en", path.relative(ROOT, OUT));
console.table(counts);
