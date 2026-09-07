"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "./actions";

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/inicio";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function action(formData: FormData) {
    setLoading(true);
    setError(null);
    const res = await signIn(formData);
    if (res?.error) {
      setError(res.error);
      setLoading(false);
    }
  }

  return (
    <form
      action={action}
      className="w-full max-w-sm rounded-xl border border-[var(--borde)] bg-white p-6 shadow-lg"
    >
      <div className="mb-1 text-lg font-extrabold text-[var(--azul)]">Los Cedros Rugby</div>
      <div className="mb-5 text-xs text-neutral-500">Tesorería 2026 — ingreso</div>

      <input type="hidden" name="next" value={next} />
      <label className="label">Email</label>
      <input name="email" type="email" required className="input mb-3 mt-1" placeholder="lautaro@..." />
      <label className="label">Contraseña</label>
      <input name="password" type="password" required className="input mb-4 mt-1" placeholder="••••••••" />

      {error && (
        <div className="mb-3 rounded-md bg-[var(--rojo-clr)] px-3 py-2 text-xs text-[var(--rojo)]">{error}</div>
      )}

      <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center">
        {loading ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-[var(--gris)] px-4">
      <Suspense fallback={<div className="text-sm text-neutral-400">Cargando…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
