"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECCIONES: { titulo: string; items: { href: string; label: string; icon: string }[] }[] = [
  {
    titulo: "Principal",
    items: [
      { href: "/inicio", label: "Inicio", icon: "🏠" },
      { href: "/caja", label: "Caja", icon: "💰" },
      { href: "/presupuesto", label: "Presupuesto", icon: "📊" },
    ],
  },
  {
    titulo: "Partidos",
    items: [
      { href: "/partidos", label: "Partidos", icon: "🏉" },
      { href: "/cobros", label: "Cobros 3T", icon: "💳" },
    ],
  },
  {
    titulo: "Gastos",
    items: [
      { href: "/gastos-3t", label: "Gastos 3T", icon: "🍺" },
      { href: "/gastos-fijos", label: "Gastos Fijos", icon: "👕" },
    ],
  },
  {
    titulo: "Plantel",
    items: [{ href: "/jugadores", label: "Jugadores", icon: "👥" }],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-y-0 left-0 z-40 flex w-[220px] flex-col overflow-y-auto bg-[var(--azul)] text-white">
      <div className="border-b border-white/15 px-4 pb-3.5 pt-5">
        <div className="text-[15px] font-extrabold leading-tight">Los Cedros Rugby</div>
        <div className="mt-1 text-[11px] opacity-60">Tesorería 2026</div>
      </div>
      {SECCIONES.map((sec) => (
        <div key={sec.titulo} className="pt-3">
          <div className="px-3.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider opacity-40">
            {sec.titulo}
          </div>
          {sec.items.map((it) => {
            const active = pathname === it.href || pathname.startsWith(it.href + "/");
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`flex items-center gap-2.5 border-l-[3px] px-3.5 py-2.5 text-[13px] transition-colors ${
                  active
                    ? "border-[#BDD7EE] bg-white/15 font-bold opacity-100"
                    : "border-transparent opacity-80 hover:bg-white/10 hover:opacity-100"
                }`}
              >
                <span className="w-[18px] text-center text-[15px]">{it.icon}</span>
                {it.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
