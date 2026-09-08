import { signOut } from "@/app/login/actions";

export function Topbar({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 flex h-[54px] items-center justify-between gap-2 border-b border-[var(--borde)] bg-white pl-14 pr-3 shadow-sm md:px-6">
      <div className="truncate text-[15px] font-extrabold text-[var(--azul)] md:text-[17px]">{title}</div>
      <div className="flex flex-shrink-0 items-center gap-2 md:gap-3">
        <span className="hidden text-xs text-neutral-400 sm:inline">Temporada 2026</span>
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
