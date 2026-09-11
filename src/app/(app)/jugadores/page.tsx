import { Topbar } from "@/components/Topbar";
import { getActivaciones, getCobros, getConfig, getGastos3T, getJugadores, getPartidos } from "@/lib/data";
import { comprasMontoMap, deudaJugador } from "@/lib/business";
import { JugadoresView } from "./JugadoresView";

export const dynamic = "force-dynamic";

export default async function JugadoresPage() {
  const [jugadores, partidos, cobros, gastos3t, activaciones, config] = await Promise.all([
    getJugadores(),
    getPartidos(),
    getCobros(),
    getGastos3T(),
    getActivaciones(),
    getConfig(),
  ]);

  const cobrosByJugPartido = new Map(cobros.map((c) => [`${c.jugador_id}:${c.partido_id}`, c]));
  const comprasMap = comprasMontoMap(gastos3t);
  const partidosConRegistros = new Set<string>([
    ...cobros.map((c) => c.partido_id),
    ...gastos3t.filter((g) => g.es_jugador_plantel).map((g) => g.partido_id),
  ]);

  const deudas: Record<string, number> = {};
  for (const j of jugadores) {
    deudas[j.id] = deudaJugador(
      j,
      partidos,
      cobrosByJugPartido,
      config.monto_global,
      partidosConRegistros,
      comprasMap,
      activaciones,
    );
  }

  return (
    <>
      <Topbar title="Jugadores" />
      <main className="p-4 md:p-6">
        <JugadoresView
          jugadores={jugadores}
          deudas={deudas}
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
