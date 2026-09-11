import { Topbar } from "@/components/Topbar";
import { getAccionesPartido, getAjustesResultado, getConfig, getFormaciones, getJugadores, getPartidos } from "@/lib/data";
import { PartidosTabs } from "./PartidosTabs";

export const dynamic = "force-dynamic";

export default async function PartidosPage() {
  const [partidos, jugadores, formaciones, acciones, ajustes, config] = await Promise.all([
    getPartidos(),
    getJugadores(),
    getFormaciones(),
    getAccionesPartido(),
    getAjustesResultado(),
    getConfig(),
  ]);
  return (
    <>
      <Topbar title="Partidos" />
      <main className="p-4 md:p-6">
        <PartidosTabs
          partidos={partidos}
          montoGlobal={config.monto_global}
          jugadores={jugadores.filter((j) => j.activo)}
          formaciones={formaciones}
          acciones={acciones}
          ajustes={ajustes}
        />
      </main>
    </>
  );
}
