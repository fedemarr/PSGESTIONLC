import { Topbar } from "@/components/Topbar";
import { getCajaMovimientos } from "@/lib/data";
import { CajaView } from "./CajaView";

export const dynamic = "force-dynamic";

export default async function CajaPage() {
  const movimientos = await getCajaMovimientos();
  return (
    <>
      <Topbar title="Caja" />
      <main className="p-4 md:p-6">
        <CajaView movimientos={movimientos} />
      </main>
    </>
  );
}
