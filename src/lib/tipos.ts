export type Nivel = "secundaria" | "preparatoria";
export type EstatusAsistencia = "presente" | "ausente" | "justificado" | "retardo";
export type RolUsuario = "admin" | "coordinador";

export interface Grupo {
  id: string;
  nivel: Nivel;
  clave: string;
  nombre: string;
  orden: number;
  activo: boolean;
}

export interface Tutor {
  id: string;
  alumno_id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  parentesco: string | null;
  notificar: boolean;
}

export interface Alumno {
  id: string;
  grupo_id: string;
  matricula: string | null;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  activo: boolean;
}

export interface Justificacion {
  id: string;
  alumno_id: string;
  fecha_inicio: string; // YYYY-MM-DD
  fecha_fin: string;
  motivo: string;
  cancelada: boolean;
  creado_en: string;
}

/** Renglón de la lista de pase de lista, ya resuelto para una fecha. */
export interface RenglonLista {
  alumno_id: string;
  nombre_completo: string;
  matricula: string | null;
  correos: string[];
  /** Permiso vigente para esta fecha — el renglón va en gris y bloqueado. */
  justificacion: { id: string; motivo: string; fecha_inicio: string; fecha_fin: string } | null;
  /** Lo ya guardado hoy, si es que ya se pasó lista. */
  estatus: EstatusAsistencia | null;
  notificado: boolean;
}

export interface Perfil {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  activo: boolean;
}

export const NIVELES: { valor: Nivel; nombre: string; corto: string }[] = [
  { valor: "secundaria", nombre: "Secundaria", corto: "Sec" },
  { valor: "preparatoria", nombre: "Preparatoria", corto: "Prepa" },
];

export function etiquetaNivel(n: Nivel): string {
  return n === "secundaria" ? "Secundaria" : "Preparatoria";
}
