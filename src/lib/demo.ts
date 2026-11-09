/**
 * MODO DEMO — datos de ejemplo en memoria.
 * Sirve para probar el flujo completo antes de conectar Supabase.
 * En cuanto existan las variables de entorno, este archivo deja de usarse.
 */
import type { Grupo, Justificacion, Nivel } from "./tipos";
import { hoy, sumarDias } from "./fechas";

export interface AlumnoDemo {
  id: string;
  grupo_id: string;
  matricula: string;
  nombre_completo: string;
  correos: string[];
}

const CLAVES: { nivel: Nivel; clave: string; nombre: string; orden: number; activo: boolean }[] = [
  { nivel: "secundaria", clave: "1A", nombre: "1° A", orden: 11, activo: true },
  { nivel: "secundaria", clave: "1B", nombre: "1° B", orden: 12, activo: true },
  { nivel: "secundaria", clave: "1C", nombre: "1° C", orden: 13, activo: true },
  { nivel: "secundaria", clave: "2A", nombre: "2° A", orden: 21, activo: true },
  { nivel: "secundaria", clave: "2B", nombre: "2° B", orden: 22, activo: true },
  { nivel: "secundaria", clave: "2C", nombre: "2° C", orden: 23, activo: true },
  { nivel: "secundaria", clave: "3A", nombre: "3° A", orden: 31, activo: true },
  { nivel: "secundaria", clave: "3B", nombre: "3° B", orden: 32, activo: true },
  { nivel: "secundaria", clave: "3C", nombre: "3° C", orden: 33, activo: true },
  { nivel: "preparatoria", clave: "1SEM", nombre: "1er Semestre", orden: 10, activo: true },
  { nivel: "preparatoria", clave: "3SEM", nombre: "3er Semestre", orden: 30, activo: true },
  { nivel: "preparatoria", clave: "5SEM", nombre: "5to Semestre", orden: 50, activo: true },
];

export const GRUPOS_DEMO: Grupo[] = CLAVES.map((g) => ({ id: `g-${g.clave}`, ...g }));

const PATERNOS = ["Aguilar", "Beltrán", "Carrillo", "Domínguez", "Escobar", "Fuentes",
  "Gallardo", "Herrera", "Ibarra", "Jiménez", "Lozano", "Medina", "Navarro", "Ochoa",
  "Pacheco", "Quintero", "Ramírez", "Sandoval", "Treviño", "Urbina", "Valenzuela", "Zepeda"];
const MATERNOS = ["Arce", "Bonilla", "Cortés", "De la Torre", "Elizondo", "Franco",
  "Gutiérrez", "Hinojosa", "Islas", "Juárez", "León", "Montes", "Nieto", "Olvera",
  "Peña", "Rangel", "Salazar", "Tapia", "Vega", "Zamudio"];
const NOMBRES_M = ["Andrés", "Bruno", "Carlos", "Diego", "Emiliano", "Fernando", "Gael",
  "Héctor", "Iker", "Joaquín", "Leonardo", "Mateo", "Nicolás", "Óscar", "Pablo", "Rodrigo", "Santiago"];
const NOMBRES_F = ["Ana Sofía", "Brenda", "Camila", "Daniela", "Elena", "Fernanda",
  "Gabriela", "Hilda", "Isabela", "Jimena", "Karla", "Lucía", "Mariana", "Natalia",
  "Paulina", "Regina", "Valeria", "Ximena"];

/** Generador determinista — la demo siempre se ve igual. */
function azar(semilla: number) {
  let s = semilla;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

function sinAcentos(t: string) {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z]/g, "").toLowerCase();
}

export const ALUMNOS_DEMO: AlumnoDemo[] = (() => {
  const lista: AlumnoDemo[] = [];
  GRUPOS_DEMO.forEach((g, gi) => {
    const r = azar(gi * 7919 + 13);
    const cuantos = 14 + Math.floor(r() * 8); // 14–21 alumnos
    for (let i = 0; i < cuantos; i++) {
      const paterno = PATERNOS[Math.floor(r() * PATERNOS.length)];
      const materno = MATERNOS[Math.floor(r() * MATERNOS.length)];
      const pila = r() < 0.5
        ? NOMBRES_M[Math.floor(r() * NOMBRES_M.length)]
        : NOMBRES_F[Math.floor(r() * NOMBRES_F.length)];
      const base = `${sinAcentos(pila)}.${sinAcentos(paterno)}`;
      lista.push({
        id: `a-${g.clave}-${i}`,
        grupo_id: g.id,
        matricula: `${g.clave}-${String(i + 1).padStart(3, "0")}`,
        nombre_completo: `${paterno} ${materno} ${pila}`,
        correos: r() < 0.35
          ? [`${base}.mama@ejemplo.com`, `${base}.papa@ejemplo.com`]
          : [`${base}.tutor@ejemplo.com`],
      });
    }
    lista.sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo, "es"));
  });
  return lista;
})();

/* ------------------------------------------------------------------ */
/*  Estado mutable de la demo (vive mientras corre el servidor)        */
/* ------------------------------------------------------------------ */

interface EstadoDemo {
  justificaciones: Justificacion[];
  asistencia: Map<string, { estatus: string; notificado: boolean }>; // `${alumno}|${fecha}`
  notificaciones: {
    alumno_id: string; fecha: string; destinatarios: string[];
    remitente: string; asunto: string; estatus: string; creado_en: string;
  }[];
}

declare global {
  // eslint-disable-next-line no-var
  var __demoCNH: EstadoDemo | undefined;
}

function arranque(): EstadoDemo {
  const h = hoy();
  const sec1a = ALUMNOS_DEMO.filter((a) => a.grupo_id === "g-1A");
  const prepa = ALUMNOS_DEMO.filter((a) => a.grupo_id === "g-1SEM");
  return {
    justificaciones: [
      {
        id: "j-demo-1",
        alumno_id: sec1a[2]?.id ?? "",
        fecha_inicio: sumarDias(h, -3),
        fecha_fin: sumarDias(h, 11),
        motivo: "Permiso solicitado por la mamá — viaje familiar",
        cancelada: false,
        creado_en: new Date().toISOString(),
      },
      {
        id: "j-demo-2",
        alumno_id: sec1a[5]?.id ?? "",
        fecha_inicio: sumarDias(h, -1),
        fecha_fin: sumarDias(h, 4),
        motivo: "Incapacidad presentada en dirección",
        cancelada: false,
        creado_en: new Date().toISOString(),
      },
      {
        id: "j-demo-3",
        alumno_id: prepa[1]?.id ?? "",
        fecha_inicio: h,
        fecha_fin: h,
        motivo: "Cita médica — avisó el papá por teléfono",
        cancelada: false,
        creado_en: new Date().toISOString(),
      },
    ].filter((j) => j.alumno_id),
    asistencia: new Map(),
    notificaciones: [],
  };
}

export function estadoDemo(): EstadoDemo {
  if (!globalThis.__demoCNH) globalThis.__demoCNH = arranque();
  return globalThis.__demoCNH;
}
