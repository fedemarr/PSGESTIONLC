import { Sidebar } from "@/components/Sidebar";
import { dbConectada } from "@/lib/data";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="flex min-h-screen flex-col md:ml-[220px]">
        {!dbConectada() && (
          <div className="bg-[var(--amarillo)] px-4 py-2 pl-14 text-[12px] text-[#856404] md:px-6 md:pl-6">
            ⚠️ Base de datos no conectada. Cargá <code>.env.local</code> con las claves de Supabase.
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
