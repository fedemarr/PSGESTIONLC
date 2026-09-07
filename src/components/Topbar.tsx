import { signOut } from "@/app/login/actions";

export function Topbar({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 flex h-[54px] items-center justify-between border-b border-[var(--borde)] bg-white px-6 shadow-sm">
      <div className="text-[17px] font-extrabold text-[var(--azul)]">{title}</div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-neutral-400">Temporada 2026</span>
        {action}
        <form action={signOut}>
          <button className="btn btn-ghost !py-1 text-xs" type="submit">
            Salir
          </button>
        </form>
      </div>
    </header>
  );
}
