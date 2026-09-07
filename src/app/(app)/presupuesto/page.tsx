import { Topbar } from "@/components/Topbar";
import {
  getCobros,
  getConfig,
  getGastos3T,
  getGastosFijos,
  getJugadores,
  getPartidos,
} from "@/lib/data";
import { presupuestoPorPartido } from "@/lib/business";
import { fmt, fechaCorta } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PresupuestoPage() {
  const [partidos, jugadores, cobros, gastos3t, gastosFijos, config] = await Promise.all([
    getPartidos(),
    getJugadores(),
    getCobros(),
    getGastos3T(),
    getGastosFijos(),
    getConfig(),
  ]);

  const filas = presupuestoPorPartido({
    partidos,
    jugadores,
    cobros,
    gastos3t,
    gastosFijos,
    montoGlobal: config.monto_global,
  });

  const sum = (k: keyof (typeof filas)[number]) =>
    filas.reduce((s, f) => s + (typeof f[k] === "number" ? (f[k] as number) : 0), 0);

  const Row = ({
    label,
    values,
    total,
    className = "",
    money = true,
  }: {
    label: string;
    values: (number | null)[];
    total: number | null;
    className?: string;
    money?: boolean;
  }) => (
    <tr className={className}>
      <td className="sticky left-0 z-10 whitespace-nowrap bg-inherit px-3 py-1.5 font-semibold">{label}</td>
      {values.map((v, i) => (
        <td key={i} className="px-3 py-1.5 text-right">
          {v === null ? <span className="text-neutral-300">—</span> : money ? fmt(v) : v}
        </td>
      ))}
      <td className="px-3 py-1.5 text-right font-bold">{total === null ? "—" : fmt(total)}</td>
    </tr>
  );

  return (
    <>
      <Topbar title="Presupuesto" />
      <main className="p-6">
        <div className="card">
          <div className="card-header">Presupuesto real 2026 — por partido</div>
          {filas.length === 0 ? (
            <div className="p-10 text-center text-neutral-400">Sin partidos cargados.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr className="bg-[var(--azul)] text-white">
                    <th className="sticky left-0 z-10 bg-[var(--azul)] px-3 py-2 text-left">Concepto</th>
                    {filas.map((f) => (
                      <th key={f.partido.id} className="px-3 py-2 text-right">
                        {fechaCorta(f.partido.fecha)}
                        <span className={`ml-1 badge ${f.local ? "badge-verde" : "badge-azul"}`}>
                          {f.local ? "L" : "V"}
                        </span>
                        <div className="font-normal opacity-60">{f.partido.rival.slice(0, 10)}</div>
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-[var(--azul)] text-[11px] font-bold text-white">
                    <td className="sticky left-0 z-10 bg-[var(--azul)] px-3 py-1">▶ INGRESOS</td>
                    <td colSpan={filas.length + 1} />
                  </tr>
                  <Row
                    className="bg-[#F0FBF4]"
                    label="💳 Cobros 3T"
                    values={filas.map((f) => (f.futuro ? null : f.local ? f.cobrado : null))}
                    total={sum("cobrado")}
                  />
                  <tr className="bg-[var(--azul)] text-[11px] font-bold text-white">
                    <td className="sticky left-0 z-10 bg-[var(--azul)] px-3 py-1">▶ GASTOS</td>
                    <td colSpan={filas.length + 1} />
                  </tr>
                  <Row className="bg-[#FDF5F5]" label="🍺 Gasto 3T" values={filas.map((f) => (f.futuro ? null : f.local ? f.gasto3t : null))} total={sum("gasto3t")} />
                  <Row className="bg-[#FDF5F5]" label="👕 Lavandería" values={filas.map((f) => (f.futuro ? null : f.lavanderia))} total={sum("lavanderia")} />
                  <Row className="bg-[#FDF5F5]" label="🧃 Entretiempo" values={filas.map((f) => (f.futuro ? null : f.entretiempo))} total={sum("entretiempo")} />
                  <Row className="bg-[#FDF5F5]" label="📋 Extras" values={filas.map((f) => (f.futuro ? null : f.extras))} total={sum("extras")} />
                  <Row className="bg-[#FDF5F5] font-bold" label="Total gastos" values={filas.map((f) => (f.futuro ? null : f.totalGastos))} total={sum("totalGastos")} />
                  <Row className="bg-[var(--amarillo)] font-extrabold" label="💰 Resultado" values={filas.map((f) => (f.futuro ? null : f.resultado))} total={sum("resultado")} />
                  <Row className="bg-[var(--rojo-clr)] font-bold" label="⚠️ Deuda pendiente" values={filas.map((f) => (f.futuro ? null : f.deuda || null))} total={sum("deuda") || null} />
                </tbody>
              </table>
            </div>
          )}
        </div>
        <p className="mt-3 text-[12px] text-neutral-500">
          Las columnas grises (—) son partidos futuros. El tab <strong>Estimado</strong> (proyección editable) queda pendiente.
        </p>
      </main>
    </>
  );
}
