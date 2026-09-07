import { Topbar } from "@/components/Topbar";
import { getConfig, getPartidos } from "@/lib/data";
import { PartidosView } from "./PartidosView";

export const dynamic = "force-dynamic";

export default async function PartidosPage() {
  const [partidos, config] = await Promise.all([getPartidos(), getConfig()]);
  return (
    <>
      <Topbar title="Partidos" />
      <main className="p-6">
        <PartidosView partidos={partidos} montoGlobal={config.monto_global} />
      </main>
    </>
  );
}
