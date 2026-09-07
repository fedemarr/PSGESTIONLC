# Tesorería — Los Cedros Rugby 2026

App web para la tesorería del club: cobros del tercer tiempo (3T), gastos, lavandería,
entretiempo y caja (Mercado Pago + Efectivo).

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind · Supabase (Postgres + Auth) · Vercel.

> **Datos del club fuera del repo.** Este repositorio es público, así que el Excel, el seed
> generado (`supabase/seed.sql`), la carpeta `docs/` y el prototipo HTML **no se versionan**
> (ver `.gitignore`). Se comparten por separado. Con el Excel en la raíz, `npm run seed:gen`
> regenera el seed localmente.

---

## Puesta en marcha (local)

```bash
npm install
cp .env.local.example .env.local   # completar con las claves de Supabase
npm run dev                        # http://localhost:3000
```

Sin `.env.local` la app igual levanta: se ve la estructura con un aviso de "base de datos no conectada".

---

## Base de datos (Supabase)

Proyecto: `ifgrmirvtrvnvifevbgp` (region sa-east-1). **Ya está creado, migrado y con el seed cargado.**

Las credenciales van en `.env.local` (no se commitea):

```
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY   -> usa la app
SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_URL                -> usan los scripts de abajo
```

### Scripts

```bash
npm run db:migrate     # corre supabase/migrations/*.sql
npm run db:seed        # regenera el seed del Excel y lo carga (idempotente)
npm run db:check       # cuenta filas por tabla + saldo por fondo
node scripts/db.mjs sql "select ..."          # consulta suelta
node scripts/create-user.mjs <email> <pass>   # crea/actualiza el usuario de login
```

### Login (usuario único)

Creado: **`lautaro@loscedros.rugby`** / contraseña **`cedros2026`**.
Cambiala con `node scripts/create-user.mjs lautaro@loscedros.rugby <nueva-pass>`
o desde **Authentication → Users** en el dashboard.

Las políticas RLS dan acceso total a cualquier usuario autenticado; `anon` no lee nada.

---

## Deploy en Vercel

1. Subir el repo a GitHub.
2. Importar el proyecto en Vercel (detecta Next.js solo).
3. **Environment Variables**: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Deploy.

---

## Estructura

```
src/
  app/
    (app)/                  layout con sidebar + guard de auth
      inicio/               dashboard (saldos, deudores, últimos movimientos)
      jugadores/            ABM del plantel                        ✅ funcional
      partidos/             fixture en cards + monto 3T global     ✅ funcional
      caja/                 fondos MP/Efectivo + historial         ✅ funcional
      presupuesto/          tabla real por partido                 ✅ (solo lectura)
      cobros/               grilla 3T                              🚧 stub
      gastos-3t/            gastos de comida del 3T                🚧 stub
      gastos-fijos/         lavandería / entretiempo / extras      🚧 stub
    login/                  pantalla de ingreso
  components/               Sidebar, Topbar, Stub
  lib/
    types.ts               tipos de las tablas
    format.ts              formato de moneda / fechas / colores de grupo
    business.ts            lógica: rotación de grupos, estado de celda, deuda, saldos, presupuesto
    data.ts               queries de lectura (Server Components)
    supabase/             clientes browser / server / middleware
supabase/
  migrations/0001_schema.sql
  seed.sql                 generado por scripts/generate-seed.mjs
scripts/generate-seed.mjs  parsea el .xlsx y arma el seed
docs/                      spec original, caja histórica y prototipo HTML
```

## Reglas de negocio (resumen)

- Partido **Local** → activa cobros 3T + gastos 3T + fila de presupuesto. **Visitante** → solo gastos fijos.
- Monto 3T: hay un **global** configurable; cada partido puede tener override propio.
- Un jugador que jugó y no tiene registro de pago → **debe** el monto del 3T. Ausente → no genera deuda.
- Compra que cubre el 3T → celda "compra"; si compró de más el fondo le reintegra, si compró de menos debe la diferencia.
- Todo movimiento de dinero genera un registro en **Caja** (MP o Efectivo). Los manuales son para ajustes/saldos iniciales.

> Nota de datos: el fondo Efectivo del seed arranca en negativo porque la planilla de Caja del
> Excel no tiene todos los cobros en efectivo. Cargar un movimiento de ajuste con el saldo real.
