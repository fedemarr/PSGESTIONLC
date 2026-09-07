import { Stub } from "@/components/Stub";

export default function GastosFijosPage() {
  return (
    <Stub
      title="Gastos Fijos"
      descripcion="Lavandería, entretiempo y gastos extras — aplica a todos los partidos (locales y visitantes). Tres tabs con tabla y modal unificado."
      puntos={[
        "Tab Lavandería: cantidad × precio unitario = total (cálculo con preview)",
        "Tab Entretiempo: detalle libre + total",
        "Tab Extras: concepto + monto",
        "Estado: Pagado / Pendiente / Parcial",
        "Cada registro pagado → egreso automático en Caja con el origen correspondiente",
      ]}
    />
  );
}
