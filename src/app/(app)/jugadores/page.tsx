import { Topbar } from "@/components/Topbar";
import { getCobros, getConfig, getGastos3T, getJugadores, getPartidos } from "@/lib/data";
import { comprasMontoMap, deudaJugador } from "@/lib/business";
import { JugadoresView } from "./JugadoresView";

export const dynamic = "force-dynamic";

export default async function JugadoresPage() {
  const [jugadores, partidos, cobros, gastos3t, config] = await Promise.all([
    getJugadores(),
    getPartidos(),
    getCobros(),
    getGastos3T(),
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
    );
  }

  return (
    <>
      <Topbar title="Jugadores" />
      <main className="p-4 md:p-6">
        <JugadoresView jugadores={jugadores} deudas={deudas} />
      </main>
    </>
  );
}
