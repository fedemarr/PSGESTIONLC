export type Grupo3T = "Sabores express" | "Mc Donalds" | "Whisky";
export type PartidoTipo = "Local" | "Visitante";
export type FormaPago = "MP" | "Efectivo";
export type Presencia = "jugo" | "nojugo" | "ausente";
export type MovTipo = "Ingreso" | "Egreso";
export type GFEstado = "Pagado" | "Pendiente" | "Parcial";
export type GFCategoria = "lavanderia" | "entretiempo" | "extra";

export interface Config {
  id: number;
  monto_global: number;
  temporada_activa: number;
  saldo_inicial_mp: number;
  saldo_inicial_efectivo: number;
}

export interface Jugador {
  id: string;
  nombre: string;
  apodo: string;
  camada: number | null;
  grupo: Grupo3T;
  posicion: string;
  activo: boolean;
  obs: string;
  temporada: number;
  created_at: string;
}

export interface Partido {
  id: string;
  fecha: string;
  rival: string;
  tipo: PartidoTipo;
  monto_3t: number | null;
  jugado: boolean;
  obs: string;
  grupo_turno: Grupo3T | null;
  temporada: number;
  created_at: string;
}

export interface Cobro {
  id: string;
  jugador_id: string;
  partido_id: string;
  presencia: Presencia;
  monto: number;
  forma: FormaPago;
  es_compra: boolean;
  monto_acordado: boolean;
  obs: string;
  created_at: string;
  updated_at: string;
}

/** Período en el que un jugador estuvo activo (genera deuda automática). */
export interface Activacion {
  id: string;
  jugador_id: string;
  fecha_alta: string;
  fecha_baja: string | null;
  created_at: string;
}

export interface Gasto3T {
  id: string;
  partido_id: string;
  grupo_turno: Grupo3T | null;
  comprador: string;
  es_jugador_plantel: boolean;
  grupo_comprador: Grupo3T | null;
  concepto: string;
  monto_gastado: number;
  monto_pagado: number;
  forma_pago: FormaPago;
  obs: string;
  created_at: string;
}

export interface GastoFijo {
  id: string;
  partido_id: string;
  categoria: GFCategoria;
  cantidad_camisetas: number | null;
  precio_unitario: number | null;
  detalle: string | null;
  concepto: string | null;
  total: number;
  pagado_a: string;
  fecha_pago: string | null;
  forma: FormaPago;
  estado: GFEstado;
  obs: string;
  created_at: string;
}

export interface CajaMovimiento {
  id: string;
  fecha: string;
  concepto: string;
  origen: string;
  tipo: MovTipo;
  fondo: FormaPago;
  monto: number;
  referencia_id: string | null;
  temporada: number;
  created_at: string;
}
