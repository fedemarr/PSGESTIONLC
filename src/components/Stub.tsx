import { Topbar } from "@/components/Topbar";

export function Stub({
  title,
  descripcion,
  puntos,
}: {
  title: string;
  descripcion: string;
  puntos: string[];
}) {
  return (
    <>
      <Topbar title={title} />
      <main className="p-6">
        <div className="card mx-auto max-w-2xl p-8">
          <div className="mb-2 text-2xl">🚧</div>
          <h2 className="mb-1 text-lg font-extrabold text-[var(--azul)]">Módulo en construcción</h2>
          <p className="mb-4 text-[13px] text-neutral-600">{descripcion}</p>
          <div className="text-[12px] font-bold uppercase tracking-wide text-neutral-400">Pendiente de portar</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-neutral-700">
            {puntos.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <p className="mt-4 text-[12px] text-neutral-500">
            La lógica de negocio ya está en <code>src/lib/business.ts</code> y los datos se leen desde{" "}
            <code>src/lib/data.ts</code>. Falta la UI interactiva.
          </p>
        </div>
      </main>
    </>
  );
}
