import { Sidebar } from "@/components/Sidebar";
import { dbConectada } from "@/lib/data";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="ml-[220px] flex min-h-screen flex-col">
        {!dbConectada() && (
          <div className="bg-[var(--amarillo)] px-6 py-2 text-[12px] text-[#856404]">
            ⚠️ Base de datos no conectada todavía. Cargá <code>.env.local</code> con las claves de Supabase
            y corré <code>supabase/migrations/0001_schema.sql</code> + <code>supabase/seed.sql</code>.
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
