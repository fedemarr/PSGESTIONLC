import { Topbar } from "@/components/Topbar";
import { getActivaciones, getCobros, getConfig, getGastos3T, getJugadores, getPartidos } from "@/lib/data";
import { CobrosGrid } from "./CobrosGrid";

export const dynamic = "force-dynamic";

export default async function CobrosPage() {
  const [jugadores, partidos, cobros, gastos3t, activaciones, config] = await Promise.all([
    getJugadores(),
    getPartidos(),
    getCobros(),
    getGastos3T(),
    getActivaciones(),
    getConfig(),
  ]);

  return (
    <>
      <Topbar title="Cobros 3T" />
      <main className="p-4 md:p-6">
        <CobrosGrid
          jugadores={jugadores}
          partidos={partidos}
          cobros={cobros}
          gastos3t={gastos3t}
          activaciones={activaciones}
          montoGlobal={config.monto_global}
        />
      </main>
    </>
  );
}
