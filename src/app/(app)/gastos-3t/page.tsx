import { Stub } from "@/components/Stub";

export default function Gastos3TPage() {
  return (
    <Stub
      title="Gastos 3T"
      descripcion="Bloques colapsables por partido local con el grupo de turno (rotación automática Mc Donalds → Whisky → Sabores) y los gastos de comida de cada 3T."
      puntos={[
        "Rotación de grupo por índice de partido local (grupoTurno en business.ts)",
        "Modal de gasto: comprador (jugador del turno / otro / externo / fondo), concepto, monto, ya pagado, forma",
        "Saldo por compra: gastó == 3T (saldado) / > 3T (reintegro) / < 3T (debe diferencia)",
        "Si el comprador es del plantel → impacta el cobro de ese jugador (celda 'compra')",
        "Pagos a compradores → egreso automático en Caja",
      ]}
    />
  );
}
