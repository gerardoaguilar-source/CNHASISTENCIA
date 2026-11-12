import "server-only";

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { COLEGIO } from "@/lib/config";
import { fechaNumerica } from "@/lib/fechas";
import { NIVELES, type Nivel } from "@/lib/tipos";

/** Un renglón del historial, tal como lo entrega historialAusencias(). */
export interface FilaHistorial {
  fecha: string;
  alumno: string;
  grupo: string;
  nivel: Nivel | null;
  estatus: string;
  notificado: boolean;
}

/** Un permiso vigente en el periodo, para la sección de justificados. */
export interface FilaJustificado {
  alumno: string;
  grupo: string;
  nivel: Nivel;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string;
}

const ETIQUETA: Record<string, string> = {
  ausente: "Falta",
  justificado: "Con permiso",
  retardo: "Retardo",
};

// Hoja tamaño carta, en puntos.
const ANCHO = 612;
const ALTO = 792;
const MARGEN = 42;
const UTIL = ANCHO - MARGEN * 2;
const PISO = 50; // debajo de esto va el pie de página

const COLUMNAS = [
  { titulo: "Fecha", ancho: 64 },
  { titulo: "Alumno", ancho: 226 },
  { titulo: "Grupo", ancho: 86 },
  { titulo: "Estatus", ancho: 72 },
  { titulo: "Aviso a padres", ancho: 80 },
];
const COLUMNAS_JUSTIF = [
  { titulo: "Alumno", ancho: 172 },
  { titulo: "Grupo", ancho: 78 },
  { titulo: "Permiso", ancho: 118 },
  { titulo: "Motivo", ancho: 160 },
];
const ALTO_RENGLON = 17;

const VERDE = rgb(0.06, 0.37, 0.2);
const NEGRO = rgb(0.1, 0.1, 0.1);
const GRIS = rgb(0.42, 0.42, 0.42);
const LINEA = rgb(0.85, 0.85, 0.85);
const FONDO = rgb(0.95, 0.96, 0.95);

function plural(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`;
}

function resumen(filas: FilaHistorial[]): string {
  const faltas = filas.filter((f) => f.estatus === "ausente");
  const alumnos = new Set(faltas.map((f) => `${f.grupo}|${f.alumno}`)).size;
  const avisados = filas.filter((f) => f.notificado).length;
  const permisos = filas.filter((f) => f.estatus === "justificado").length;
  const retardos = filas.filter((f) => f.estatus === "retardo").length;
  const partes = [
    plural(faltas.length, "falta", "faltas"),
    plural(alumnos, "alumno con falta", "alumnos con falta"),
    `${avisados} con aviso enviado`,
  ];
  if (permisos > 0) partes.push(`${permisos} con permiso`);
  if (retardos > 0) partes.push(plural(retardos, "retardo", "retardos"));
  return partes.join("   ·   ");
}

/**
 * PDF del historial de faltas con Secundaria y Preparatoria juntas en un
 * solo archivo: resumen general y luego una tabla por nivel.
 */
export async function pdfHistorial(d: {
  filas: FilaHistorial[];
  justificados?: FilaJustificado[];
  desde: string;
  hasta: string;
  generado: string; // fecha de hoy, YYYY-MM-DD
  escudo?: Uint8Array | null;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Historial de faltas — ${COLEGIO}`);
  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const negrita = await doc.embedFont(StandardFonts.HelveticaBold);

  let escudo: PDFImage | null = null;
  if (d.escudo) {
    try { escudo = await doc.embedPng(d.escudo); } catch { escudo = null; }
  }

  // Las fuentes estándar del PDF no traen todos los caracteres; lo que no
  // exista se cambia por "?" para que el archivo nunca falle por un nombre.
  const permitidos = new Set(normal.getCharacterSet());
  const limpiar = (s: string) =>
    Array.from(s.replace(/\s+/g, " ").trim())
      .map((c) => (permitidos.has(c.codePointAt(0)!) ? c : "?"))
      .join("");

  /** Recorta el texto con "…" si no cabe en el ancho dado. */
  const ajustar = (s: string, fuente: PDFFont, tam: number, ancho: number) => {
    let t = limpiar(s);
    if (fuente.widthOfTextAtSize(t, tam) <= ancho) return t;
    while (t.length > 1 && fuente.widthOfTextAtSize(t + "…", tam) > ancho) t = t.slice(0, -1);
    return t.trimEnd() + "…";
  };

  /** Parte el texto en renglones que quepan en el ancho (máximo `tope`). */
  const partir = (s: string, fuente: PDFFont, tam: number, ancho: number, tope = 4) => {
    const lineas: string[] = [];
    let actual = "";
    for (const palabra of limpiar(s).split(" ")) {
      const prueba = actual ? `${actual} ${palabra}` : palabra;
      if (!actual || fuente.widthOfTextAtSize(prueba, tam) <= ancho) actual = prueba;
      else { lineas.push(actual); actual = palabra; }
    }
    if (actual) lineas.push(actual);
    if (lineas.length > tope) {
      lineas.length = tope;
      lineas[tope - 1] += "…";
    }
    return lineas.map((l) => ajustar(l, fuente, tam, ancho));
  };

  let pagina: PDFPage = doc.addPage([ANCHO, ALTO]);
  let y = ALTO - MARGEN;

  const texto = (
    s: string, x: number, yy: number, tam: number,
    fuente: PDFFont = normal, color = NEGRO
  ) => pagina.drawText(limpiar(s), { x, y: yy, size: tam, font: fuente, color });

  const nuevaPagina = () => {
    pagina = doc.addPage([ANCHO, ALTO]);
    y = ALTO - MARGEN;
  };

  const encabezadoTabla = (columnas = COLUMNAS) => {
    pagina.drawRectangle({ x: MARGEN, y: y - 18, width: UTIL, height: 18, color: FONDO });
    let x = MARGEN + 6;
    for (const c of columnas) {
      texto(c.titulo, x, y - 12.5, 8.5, negrita, GRIS);
      x += c.ancho;
    }
    y -= 18;
  };

  /* ---------- Encabezado del documento ---------- */
  const todas = d.filas.filter((f) => f.nivel !== null);
  let xTitulo = MARGEN;
  if (escudo) {
    const alto = 50;
    const ancho = (escudo.width / escudo.height) * alto;
    pagina.drawImage(escudo, { x: MARGEN, y: y - alto, width: ancho, height: alto });
    xTitulo += ancho + 12;
  }
  texto(COLEGIO, xTitulo, y - 14, 15, negrita, VERDE);
  texto("Historial de faltas — Secundaria y Preparatoria", xTitulo, y - 31, 11.5, negrita);
  texto(
    `Del ${fechaNumerica(d.desde)} al ${fechaNumerica(d.hasta)}   ·   Generado el ${fechaNumerica(d.generado)}`,
    xTitulo, y - 46, 9.5, normal, GRIS
  );
  y -= 62;
  pagina.drawLine({
    start: { x: MARGEN, y }, end: { x: ANCHO - MARGEN, y }, thickness: 1.2, color: VERDE,
  });
  y -= 18;

  texto("Total de ambos niveles", MARGEN, y, 10, negrita);
  y -= 14;
  texto(resumen(todas), MARGEN, y, 9.5);
  y -= 26;

  /* ---------- Una sección por nivel ---------- */
  for (const nivel of NIVELES) {
    const filas = todas
      .filter((f) => f.nivel === nivel.valor)
      .sort((a, b) =>
        b.fecha.localeCompare(a.fecha) ||
        a.grupo.localeCompare(b.grupo, "es", { numeric: true }) ||
        a.alumno.localeCompare(b.alumno, "es")
      );

    // Que el título no quede solo al final de una hoja.
    if (y - (16 + 16 + 18 + ALTO_RENGLON * 2) < PISO) nuevaPagina();

    texto(nivel.nombre, MARGEN, y - 4, 13, negrita, VERDE);
    y -= 20;
    texto(resumen(filas), MARGEN, y, 9.5, normal, GRIS);
    y -= 12;

    if (filas.length === 0) {
      y -= 8;
      texto(`No hay faltas registradas en ${nivel.nombre} en este periodo.`, MARGEN, y, 10, normal, GRIS);
      y -= 30;
      continue;
    }

    encabezadoTabla();
    for (const f of filas) {
      if (y - ALTO_RENGLON < PISO) {
        nuevaPagina();
        texto(`${nivel.nombre} (continuación)`, MARGEN, y - 4, 10, negrita, VERDE);
        y -= 14;
        encabezadoTabla();
      }
      const celdas = [
        fechaNumerica(f.fecha),
        f.alumno,
        f.grupo,
        ETIQUETA[f.estatus] ?? f.estatus,
        f.notificado ? "Enviado" : "—",
      ];
      let x = MARGEN + 6;
      celdas.forEach((c, i) => {
        const col = COLUMNAS[i];
        texto(ajustar(c, normal, 9.5, col.ancho - 8), x, y - 12, 9.5);
        x += col.ancho;
      });
      y -= ALTO_RENGLON;
      pagina.drawLine({
        start: { x: MARGEN, y }, end: { x: ANCHO - MARGEN, y }, thickness: 0.5, color: LINEA,
      });
    }
    y -= 28;
  }

  /* ---------- Justificados (al final) ---------- */
  {
    const ordenNivel = (n: Nivel) => NIVELES.findIndex((x) => x.valor === n);
    const justif = [...(d.justificados ?? [])].sort((a, b) =>
      ordenNivel(a.nivel) - ordenNivel(b.nivel) ||
      a.grupo.localeCompare(b.grupo, "es", { numeric: true }) ||
      a.alumno.localeCompare(b.alumno, "es") ||
      a.fecha_inicio.localeCompare(b.fecha_inicio)
    );
    const unDia = d.desde === d.hasta;
    const titulo = unDia
      ? `Justificados del día ${fechaNumerica(d.desde)}`
      : "Justificados del periodo";

    if (y - (16 + 16 + 18 + ALTO_RENGLON * 2) < PISO) nuevaPagina();

    texto(titulo, MARGEN, y - 4, 13, negrita, VERDE);
    y -= 20;
    texto(
      justif.length === 0
        ? "Ningún alumno con permiso."
        : `${plural(justif.length, "permiso", "permisos")}   ·   Secundaria y Preparatoria`,
      MARGEN, y, 9.5, normal, GRIS
    );
    y -= 12;

    if (justif.length > 0) {
      encabezadoTabla(COLUMNAS_JUSTIF);
      for (const j of justif) {
        const motivo = partir(j.motivo || "—", normal, 9.5, COLUMNAS_JUSTIF[3].ancho - 8);
        const altoFila = ALTO_RENGLON + (motivo.length - 1) * 11;
        if (y - altoFila < PISO) {
          nuevaPagina();
          texto("Justificados (continuación)", MARGEN, y - 4, 10, negrita, VERDE);
          y -= 14;
          encabezadoTabla(COLUMNAS_JUSTIF);
        }
        const vigencia = j.fecha_inicio === j.fecha_fin
          ? fechaNumerica(j.fecha_inicio)
          : `${fechaNumerica(j.fecha_inicio)} al ${fechaNumerica(j.fecha_fin)}`;
        const celdas = [j.alumno, j.grupo, vigencia];
        let x = MARGEN + 6;
        celdas.forEach((c, i) => {
          const col = COLUMNAS_JUSTIF[i];
          texto(ajustar(c, normal, 9.5, col.ancho - 8), x, y - 12, 9.5);
          x += col.ancho;
        });
        motivo.forEach((l, i) => texto(l, x, y - 12 - i * 11, 9.5));
        y -= altoFila;
        pagina.drawLine({
          start: { x: MARGEN, y }, end: { x: ANCHO - MARGEN, y }, thickness: 0.5, color: LINEA,
        });
      }
    }
  }

  /* ---------- Pie con número de página ---------- */
  const paginas = doc.getPages();
  paginas.forEach((p, i) => {
    const pie = `Página ${i + 1} de ${paginas.length}`;
    p.drawText(limpiar(`${COLEGIO} — Historial de faltas`), {
      x: MARGEN, y: 28, size: 8, font: normal, color: GRIS,
    });
    p.drawText(pie, {
      x: ANCHO - MARGEN - normal.widthOfTextAtSize(pie, 8), y: 28,
      size: 8, font: normal, color: GRIS,
    });
  });

  return doc.save();
}
