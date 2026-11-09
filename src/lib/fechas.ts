import { ZONA_HORARIA } from "./config";

/** Fecha de hoy en Tijuana como YYYY-MM-DD (no UTC). */
export function hoy(): string {
  return enZona(new Date());
}

export function enZona(d: Date, zona = ZONA_HORARIA): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: zona,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => partes.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** "lunes 9 de noviembre de 2026" */
export function fechaLarga(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d));
  return `${DIAS[dt.getUTCDay()]} ${d} de ${MESES[m - 1]} de ${a}`;
}

/** "9 de noviembre" */
export function fechaCorta(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} de ${MESES[m - 1]}`;
}

/** "09/11/2026" */
export function fechaNumerica(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

export function esFinDeSemana(iso: string): boolean {
  const [a, m, d] = iso.split("-").map(Number);
  const dia = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return dia === 0 || dia === 6;
}

export function sumarDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d + dias));
  return dt.toISOString().slice(0, 10);
}

/** Días naturales que cubre un rango inclusivo. */
export function diasEntre(desde: string, hasta: string): number {
  const ms = Date.parse(hasta + "T00:00:00Z") - Date.parse(desde + "T00:00:00Z");
  return Math.round(ms / 86400000) + 1;
}

export function dentroDelRango(fecha: string, desde: string, hasta: string): boolean {
  return fecha >= desde && fecha <= hasta;
}
