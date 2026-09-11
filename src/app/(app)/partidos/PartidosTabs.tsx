"use client";

import { useState } from "react";
import type { AccionPartido, AjusteResultado, Formacion, Jugador, Partido } from "@/lib/types";
import { PartidosView } from "./PartidosView";
import { ResultadosView } from "./ResultadosView";
import { TablaPuntosView } from "./TablaPuntosView";

const TABS = [
  { id: "fixture", label: "🗓 Fixture" },
  { id: "resultados", label: "🏉 Resultados" },
  { id: "tabla", label: "🏆 Tabla de puntos" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function PartidosTabs({
  partidos,
  montoGlobal,
  jugadores,
  formaciones,
  acciones,
  ajustes,
}: {
  partidos: Partido[];
  montoGlobal: number;
  jugadores: Jugador[];
  formaciones: Formacion[];
  acciones: AccionPartido[];
  ajustes: AjusteResultado[];
}) {
  const [tab, setTab] = useState<TabId>("fixture");

  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-[var(--borde)]">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px rounded-t-md border-b-2 px-4 py-2 text-[13px] font-semibold transition-colors ${
              tab === t.id ? "border-[var(--azul)] bg-[var(--azul-clr)] text-[var(--azul)]" : "border-transparent text-neutral-500 hover:bg-[var(--gris)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "fixture" && <PartidosView partidos={partidos} montoGlobal={montoGlobal} />}
      {tab === "resultados" && (
        <ResultadosView partidos={partidos} jugadores={jugadores} formaciones={formaciones} acciones={acciones} ajustes={ajustes} />
      )}
      {tab === "tabla" && (
        <TablaPuntosView jugadores={jugadores} partidos={partidos} formaciones={formaciones} acciones={acciones} ajustes={ajustes} />
      )}
    </div>
  );
}
