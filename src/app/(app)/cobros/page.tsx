import { Stub } from "@/components/Stub";

export default function CobrosPage() {
  return (
    <Stub
      title="Cobros 3T"
      descripcion="Grilla jugador × partido local con estado de cada celda (debe / saldado / parcial / compra / ausente) y modal para registrar el pago."
      puntos={[
        "Tabla con columnas fijas (nombre + grupo) y scroll horizontal por partido",
        "Modal de pago: presencia, monto, forma (MP/Efectivo), observaciones + preview",
        "Al guardar un cobro con monto > 0 → generar movimiento automático en Caja",
        "Reflejar las compras cargadas en Gastos 3T como celda 'compra'",
        "Columna de deuda acumulada por jugador (ya calculada en business.ts)",
      ]}
    />
  );
}
