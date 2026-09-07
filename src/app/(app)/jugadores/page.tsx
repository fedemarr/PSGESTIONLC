import { Topbar } from "@/components/Topbar";
import { getCobros, getConfig, getJugadores, getPartidos } from "@/lib/data";
import { deudaJugador } from "@/lib/business";
import { JugadoresView } from "./JugadoresView";

export const dynamic = "force-dynamic";

export default async function JugadoresPage() {
  const [jugadores, partidos, cobros, config] = await Promise.all([
    getJugadores(),
    getPartidos(),
    getCobros(),
    getConfig(),
  ]);

  const cobrosByJugPartido = new Map(cobros.map((c) => [`${c.jugador_id}:${c.partido_id}`, c]));
  const partidosConCobros = new Set(cobros.map((c) => c.partido_id));

  const deudas: Record<string, number> = {};
  for (const j of jugadores) {
    deudas[j.id] = deudaJugador(j, partidos, cobrosByJugPartido, config.monto_global, partidosConCobros);
  }

  return (
    <>
      <Topbar title="Jugadores" />
      <main className="p-6">
        <JugadoresView jugadores={jugadores} deudas={deudas} />
      </main>
    </>
  );
}
