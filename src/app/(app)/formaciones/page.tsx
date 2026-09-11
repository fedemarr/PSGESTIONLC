import { Topbar } from "@/components/Topbar";
import { getFormaciones, getJugadores, getPartidos } from "@/lib/data";
import { FormacionesView } from "./FormacionesView";

export const dynamic = "force-dynamic";

export default async function FormacionesPage() {
  const [partidos, jugadores, formaciones] = await Promise.all([getPartidos(), getJugadores(), getFormaciones()]);
  return (
    <>
      <Topbar title="Formaciones" />
      <main className="p-4 md:p-6">
        <FormacionesView partidos={partidos} jugadores={jugadores.filter((j) => j.activo)} formaciones={formaciones} />
      </main>
    </>
  );
}
