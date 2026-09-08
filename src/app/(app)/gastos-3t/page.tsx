import { Topbar } from "@/components/Topbar";
import { getConfig, getGastos3T, getJugadores, getPartidos } from "@/lib/data";
import { Gastos3TView } from "./Gastos3TView";

export const dynamic = "force-dynamic";

export default async function Gastos3TPage() {
  const [partidos, jugadores, gastos3t, config] = await Promise.all([
    getPartidos(),
    getJugadores(),
    getGastos3T(),
    getConfig(),
  ]);

  return (
    <>
      <Topbar title="Gastos 3T" />
      <main className="p-4 md:p-6">
        <Gastos3TView
          partidos={partidos}
          jugadores={jugadores}
          gastos={gastos3t}
          montoGlobal={config.monto_global}
        />
      </main>
    </>
  );
}
