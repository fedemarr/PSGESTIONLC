import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import {
  getCajaMovimientos,
  getCobros,
  getConfig,
  getJugadores,
  getPartidos,
} from "@/lib/data";
import { deudaJugador, saldoFondo } from "@/lib/business";
import { fmt, fmtS, fmtFecha, fechaCorta } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InicioPage() {
  const [jugadores, partidos, cobros, config, movs] = await Promise.all([
    getJugadores(),
    getPartidos(),
    getCobros(),
    getConfig(),
    getCajaMovimientos(),
  ]);

  const sMP = saldoFondo(movs, "MP");
  const sEF = saldoFondo(movs, "Efectivo");

  const cobrosByJugPartido = new Map(cobros.map((c) => [`${c.jugador_id}:${c.partido_id}`, c]));
  const partidosConCobros = new Set(cobros.map((c) => c.partido_id));

  const deudores = jugadores
    .filter((j) => j.activo)
    .map((j) => ({
      j,
      deuda: deudaJugador(j, partidos, cobrosByJugPartido, config.monto_global, partidosConCobros),
    }))
    .filter((x) => x.deuda < 0)
    .sort((a, b) => a.deuda - b.deuda);

  const hoy = new Date().toISOString().slice(0, 10);
  const prox = [...partidos].sort((a, b) => a.fecha.localeCompare(b.fecha)).find((p) => p.fecha >= hoy);

  const ultimos = [...movs].slice(0, 8);

  return (
    <>
      <Topbar title="Inicio" />
      <main className="p-4 md:p-6">
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Stat label="Fondo MP" value={fmtS(sMP)} tone={sMP < 0 ? "rojo" : "verde"} sub="Mercado Pago" />
          <Stat label="Fondo Efectivo" value={fmtS(sEF)} tone={sEF < 0 ? "rojo" : "verde"} sub="En mano" />
          <Stat label="Total disponible" value={fmtS(sMP + sEF)} tone={sMP + sEF < 0 ? "rojo" : "verde"} sub="MP + Efectivo" />
          <Stat label="Con deuda" value={deudores.length} tone="rojo" sub="jugadores" />
          <Stat
            label="Próximo partido"
            value={prox ? `${fechaCorta(prox.fecha)} vs ${prox.rival}` : "—"}
            sub={prox?.tipo ?? ""}
            small
          />
        </div>

        <div className="grid gap-3.5 lg:grid-cols-2">
          <div className="card">
            <div className="card-header !bg-[var(--azul-med)]">Deudores activos</div>
            {deudores.length === 0 ? (
              <div className="p-10 text-center text-neutral-400">✅ Sin deudores</div>
            ) : (
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Jugador</th>
                    <th>Grupo</th>
                    <th className="!text-right">Deuda</th>
                  </tr>
                </thead>
                <tbody>
                  {deudores.slice(0, 10).map(({ j, deuda }) => (
                    <tr key={j.id}>
                      <td className="font-bold">{j.nombre}</td>
                      <td className="text-[12px] text-neutral-500">{j.grupo}</td>
                      <td className="!text-right">
                        <span className="badge badge-rojo">{fmt(deuda)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <Link href="/cobros" className="block border-t border-[var(--borde)] p-2.5 text-center text-[12px] text-[var(--azul-med)] hover:underline">
              Ver grilla de cobros →
            </Link>
          </div>

          <div className="card">
            <div className="card-header">Últimos movimientos</div>
            {ultimos.length === 0 ? (
              <div className="p-10 text-center text-neutral-400">📋 Sin movimientos</div>
            ) : (
              <div>
                {ultimos.map((m) => (
                  <div key={m.id} className="flex items-center justify-between border-b border-neutral-100 px-4 py-2 text-[12px]">
                    <span className="flex-1 truncate">{m.concepto}</span>
                    <span className="mx-2 text-neutral-400">{fmtFecha(m.fecha)}</span>
                    <span className="font-bold" style={{ color: m.tipo === "Ingreso" ? "var(--verde)" : "var(--rojo)" }}>
                      {m.tipo === "Ingreso" ? "+" : "-"}
                      {fmt(m.monto)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <Link href="/caja" className="block border-t border-[var(--borde)] p-2.5 text-center text-[12px] text-[var(--azul-med)] hover:underline">
              Ver caja completa →
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
  small,
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "rojo" | "verde";
  small?: boolean;
}) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div
        className={`stat-value ${small ? "!text-[13px]" : ""}`}
        style={{ color: tone === "rojo" ? "var(--rojo)" : tone === "verde" ? "var(--verde)" : undefined }}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-neutral-400">{sub}</div>}
    </div>
  );
}
