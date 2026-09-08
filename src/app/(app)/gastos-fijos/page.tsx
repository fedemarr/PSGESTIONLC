import { Topbar } from "@/components/Topbar";
import { getGastosFijos, getPartidos } from "@/lib/data";
import { GastosFijosView } from "./GastosFijosView";

export const dynamic = "force-dynamic";

export default async function GastosFijosPage() {
  const [partidos, gastos] = await Promise.all([getPartidos(), getGastosFijos()]);
  return (
    <>
      <Topbar title="Gastos Fijos" />
      <main className="p-4 md:p-6">
        <GastosFijosView partidos={partidos} gastos={gastos} />
      </main>
    </>
  );
}
