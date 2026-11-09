import "server-only";
import ExcelJS from "exceljs";
import type { Grupo, Nivel } from "./tipos";

export interface FilaImportada {
  hoja: string;
  renglon: number;
  grupo_texto: string | null;
  grupo_id: string | null;
  grupo_nombre: string | null;
  matricula: string | null;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  correos: string[];
  tutor: string | null;
  telefono: string | null;
  problemas: string[];
}

export interface HojaLeida {
  nombre: string;
  grupo_nombre: string | null;
  conEncabezados: boolean;
  alumnos: number;
  problema: string | null;
}

export interface ResumenImportacion {
  filas: FilaImportada[];
  hojas: HojaLeida[];
  validas: number;
  conProblemas: number;
}

/* ==================================================================== */
/*  Utilidades                                                          */
/* ==================================================================== */

const norm = (s: unknown): string =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const limpio = (s: unknown): string => String(s ?? "").replace(/\s+/g, " ").trim();

const esCorreo = (s: string) => /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(s.trim());

/** ExcelJS devuelve objetos para fórmulas, hipervínculos y texto enriquecido. */
function valorCelda(c: unknown): string {
  if (c == null) return "";
  if (typeof c === "object") {
    const o = c as Record<string, unknown>;
    if (typeof o.text === "string") return o.text;
    if (typeof o.result === "string" || typeof o.result === "number") return String(o.result);
    if (Array.isArray(o.richText)) {
      return (o.richText as { text: string }[]).map((t) => t.text).join("");
    }
    if (o.hyperlink && typeof o.hyperlink === "string") {
      return String(o.hyperlink).replace(/^mailto:/i, "");
    }
    return "";
  }
  return String(c);
}

/**
 * Interpreta de dónde es un grupo, ya venga del nombre de la hoja
 * ("SEC 1A", "PREPA 1R0", "PREPA 50") o de una columna ("1° A", "3er Semestre").
 * Tolerante a erratas: en preparatoria basta el primer dígito.
 */
export function interpretarGrupo(texto: string): { nivel: Nivel | null; clave: string } {
  const t = norm(texto);
  if (!t) return { nivel: null, clave: "" };

  let nivel: Nivel | null = null;
  let resto = t;

  if (/^(secundaria|secu|sec)/.test(t)) {
    nivel = "secundaria";
    resto = t.replace(/^(secundaria|secu|sec)/, "");
  } else if (/^(preparatoria|prepa|prep|bachillerato|bachi)/.test(t)) {
    nivel = "preparatoria";
    resto = t.replace(/^(preparatoria|prepa|prep|bachillerato|bachi)/, "");
  }
  resto = resto.replace(/^(grupo|grado|semestre|sem)/, "");

  const digito = resto.match(/\d/)?.[0] ?? "";

  if (nivel === "preparatoria") {
    // "1r0", "3ro", "50", "1", "1sem" → todo depende del primer dígito.
    return digito ? { nivel, clave: `${digito}SEM` } : { nivel, clave: "" };
  }

  if (nivel === "secundaria") {
    const letra = resto.replace(/\d/g, "").match(/[abc]/)?.[0];
    return digito && letra
      ? { nivel, clave: `${digito}${letra.toUpperCase()}` }
      : { nivel, clave: "" };
  }

  // Sin prefijo de nivel: deducir por la forma.
  if (/sem/.test(resto) && digito) return { nivel: "preparatoria", clave: `${digito}SEM` };
  const sec = resto.match(/^(\d)[^a-z0-9]*([abc])$/);
  if (sec) return { nivel: "secundaria", clave: `${sec[1]}${sec[2].toUpperCase()}` };

  return { nivel: null, clave: texto.toUpperCase().replace(/[^A-Z0-9]/g, "") };
}

const PARTICULAS = new Set(["de", "del", "la", "las", "los", "y", "e", "da", "dos", "van", "von"]);

/** "AGUIRRE MARTORELL GUSTAVO" → "Aguirre Martorell Gustavo" (respeta D'Lisse, O'Brien). */
export function tipoTitulo(texto: string): string {
  return texto
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((palabra, i) => {
      if (i > 0 && PARTICULAS.has(palabra)) return palabra;
      return palabra
        .split("'")
        .map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1) : p))
        .join("'");
    })
    .join(" ");
}

/** Convención mexicana: APELLIDO PATERNO · MATERNO · NOMBRE(S). */
export function partirNombre(completo: string) {
  const partes = completo.split(" ").filter(Boolean);
  if (partes.length >= 3) {
    return {
      apellido_paterno: partes[0],
      apellido_materno: partes[1],
      nombre: partes.slice(2).join(" "),
    };
  }
  if (partes.length === 2) {
    return { apellido_paterno: partes[0], apellido_materno: "", nombre: partes[1] };
  }
  return { apellido_paterno: "", apellido_materno: "", nombre: partes.join(" ") };
}

function columna(encabezados: string[], ...claves: string[]): number {
  for (const clave of claves) {
    const i = encabezados.findIndex((h) => norm(h) === norm(clave));
    if (i >= 0) return i;
  }
  for (const clave of claves) {
    const i = encabezados.findIndex((h) => norm(h) && norm(h).includes(norm(clave)));
    if (i >= 0) return i;
  }
  return -1;
}

const PALABRAS_ENC = [
  "grupo", "grado", "semestre", "seccion", "matricula", "nombre", "nombres",
  "alumno", "apellido", "paterno", "materno", "correo", "email", "mail",
  "tutor", "telefono", "celular", "padre", "madre", "responsable",
];

/* ==================================================================== */
/*  Lectura                                                             */
/* ==================================================================== */

export async function leerExcel(
  buffer: ArrayBuffer,
  grupos: Grupo[]
): Promise<ResumenImportacion> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  if (!wb.worksheets.length) throw new Error("El archivo no tiene ninguna hoja de cálculo.");

  // Índice de grupos por nivel+clave y por clave sola
  const porNivelClave = new Map<string, Grupo>();
  const porClave = new Map<string, Grupo>();
  for (const g of grupos) {
    const i = interpretarGrupo(`${g.nivel} ${g.clave}`);
    const clave = i.clave || g.clave.toUpperCase();
    porNivelClave.set(`${g.nivel}|${clave}`, g);
    if (!porClave.has(clave)) porClave.set(clave, g);
  }

  const buscarGrupo = (texto: string): Grupo | null => {
    const { nivel, clave } = interpretarGrupo(texto);
    if (!clave) return null;
    if (nivel) return porNivelClave.get(`${nivel}|${clave}`) ?? null;
    return porClave.get(clave) ?? null;
  };

  const filas: FilaImportada[] = [];
  const hojas: HojaLeida[] = [];

  for (const hoja of wb.worksheets) {
    if (hoja.state === "hidden" || hoja.state === "veryHidden") continue;

    const grupoHoja = buscarGrupo(hoja.name);
    const antes = filas.length;

    // ---- ¿tiene renglón de encabezados? ----
    let filaEnc = 0;
    let mejor = 0;
    for (let i = 1; i <= Math.min(10, hoja.rowCount); i++) {
      const celdas = (hoja.getRow(i).values as unknown[]).slice(1).map((v) => limpio(valorCelda(v)));
      let puntos = 0;
      for (const c of celdas) {
        if (!c || c.length > 40) continue;
        const n = norm(c);
        if (PALABRAS_ENC.some((p) => n.includes(norm(p)))) puntos++;
      }
      if (puntos > mejor) { mejor = puntos; filaEnc = i; }
    }
    const conEncabezados = mejor >= 2;

    let iGrupo = -1, iMat = -1, iCompleto = -1, iPaterno = -1, iMaterno = -1,
        iNombre = -1, iTutor = -1, iTel = -1;
    let iCorreos: number[] = [];
    let primeraFila = 1;

    if (conEncabezados) {
      const enc = (hoja.getRow(filaEnc).values as unknown[]).slice(1).map((v) => limpio(valorCelda(v)));
      iCorreos = enc
        .map((h, i) => ({ h: norm(h), i }))
        .filter(({ h }) => h.includes("correo") || h.includes("email") || h.includes("mail"))
        .map(({ i }) => i);
      const sinCorreos = enc.map((h, i) => (iCorreos.includes(i) ? "" : h));

      iGrupo = columna(sinCorreos, "grupo", "clave", "grado", "semestre", "seccion");
      iMat = columna(sinCorreos, "matricula", "matrícula", "clave del alumno", "no control");
      iTutor = columna(sinCorreos, "tutor", "responsable", "madre", "padre");
      iTel = columna(sinCorreos, "telefono", "teléfono", "celular", "tel");

      iCompleto = columna(sinCorreos, "nombre completo", "nombre del alumno", "alumno");
      const sinCompleto = sinCorreos.map((h, i) => (i === iCompleto ? "" : h));
      iPaterno = columna(sinCompleto, "apellido paterno", "paterno", "apellidos");
      iMaterno = columna(sinCompleto, "apellido materno", "materno");
      iNombre = columna(sinCompleto, "nombres", "nombre(s)", "nombre");
      primeraFila = filaEnc + 1;
    } else {
      // Hoja sin encabezados: se deduce por el contenido.
      const conteoCorreo: Record<number, number> = {};
      const conteoTexto: Record<number, number> = {};
      const limite = Math.min(hoja.rowCount, 60);
      for (let i = 1; i <= limite; i++) {
        const celdas = (hoja.getRow(i).values as unknown[]).slice(1);
        celdas.forEach((c, j) => {
          const v = limpio(valorCelda(c));
          if (!v) return;
          if (v.split(/[;,/\s]+/).some(esCorreo)) conteoCorreo[j] = (conteoCorreo[j] ?? 0) + 1;
          else if (/[a-zñáéíóúü]/i.test(v)) conteoTexto[j] = (conteoTexto[j] ?? 0) + 1;
        });
      }
      iCorreos = Object.entries(conteoCorreo)
        .filter(([, n]) => n > 0)
        .map(([j]) => Number(j));
      const mejorTexto = Object.entries(conteoTexto).sort((a, b) => b[1] - a[1])[0];
      iCompleto = mejorTexto ? Number(mejorTexto[0]) : 0;
      primeraFila = 1;
    }

    // ---- renglones ----
    for (let i = primeraFila; i <= hoja.rowCount; i++) {
      const celdas = (hoja.getRow(i).values as unknown[]).slice(1);
      if (celdas.every((c) => limpio(valorCelda(c)) === "")) continue;
      const val = (idx: number) => (idx >= 0 ? limpio(valorCelda(celdas[idx])) : "");

      const problemas: string[] = [];

      // --- nombre ---
      let paterno = val(iPaterno);
      let materno = val(iMaterno);
      let nombre = val(iNombre);
      if (!paterno && !materno) {
        const completo = iCompleto >= 0 ? val(iCompleto) : nombre;
        const p = partirNombre(completo);
        paterno = p.apellido_paterno; materno = p.apellido_materno; nombre = p.nombre;
      }
      paterno = tipoTitulo(paterno); materno = tipoTitulo(materno); nombre = tipoTitulo(nombre);
      if (!nombre && !paterno) continue;   // renglón de adorno, no es alumno

      // --- grupo: primero la columna, si no la hoja ---
      const textoGrupo = val(iGrupo);
      const g = (textoGrupo ? buscarGrupo(textoGrupo) : null) ?? grupoHoja;
      if (!g) {
        problemas.push(
          textoGrupo
            ? `no se reconoce el grupo "${textoGrupo}"`
            : `no se reconoce el grupo de la hoja "${hoja.name}"`
        );
      }

      // --- correos ---
      const correos: string[] = [];
      for (const ic of iCorreos) {
        for (const trozo of val(ic).split(/[;,/\s]+/)) {
          const c = trozo.trim();
          if (!c) continue;
          if (esCorreo(c)) {
            const bajo = c.toLowerCase();
            if (!correos.includes(bajo)) correos.push(bajo);
          } else {
            problemas.push(`correo inválido "${c}"`);
          }
        }
      }
      if (correos.length === 0) problemas.push("sin correo de tutor");

      filas.push({
        hoja: hoja.name,
        renglon: i,
        grupo_texto: textoGrupo || hoja.name,
        grupo_id: g?.id ?? null,
        grupo_nombre: g?.nombre ?? null,
        matricula: val(iMat) || null,
        nombre, apellido_paterno: paterno, apellido_materno: materno,
        correos,
        tutor: val(iTutor) ? tipoTitulo(val(iTutor)) : null,
        telefono: val(iTel) || null,
        problemas,
      });
    }

    hojas.push({
      nombre: hoja.name,
      grupo_nombre: grupoHoja?.nombre ?? null,
      conEncabezados,
      alumnos: filas.length - antes,
      problema: !grupoHoja && filas.length - antes > 0
        ? "No se pudo identificar a qué grupo corresponde esta hoja."
        : filas.length - antes === 0
        ? "No se encontraron alumnos en esta hoja."
        : null,
    });
  }

  return {
    filas,
    hojas,
    validas: filas.filter((f) => f.grupo_id).length,
    conProblemas: filas.filter((f) => f.problemas.length > 0).length,
  };
}

/* ==================================================================== */
/*  Plantilla de ejemplo                                                */
/* ==================================================================== */

export async function plantillaExcel(): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Asistencia CNH";

  const encabezar = (h: ExcelJS.Worksheet) => {
    h.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    h.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF063D1F" } };
    h.getRow(1).height = 22;
    h.getRow(1).alignment = { vertical: "middle" };
    h.views = [{ state: "frozen", ySplit: 1 }];
  };

  // Formato A: una hoja por grupo, sin encabezados (como lo tiene el colegio)
  const ejemplos: [string, string[][]][] = [
    ["SEC 1A", [
      ["AGUIRRE MARTORELL GUSTAVO", "mama.aguirre@ejemplo.com"],
      ["ARTEAGA SUAREZ JANETH ISABELLA", "papa.arteaga@ejemplo.com"],
    ]],
    ["PREPA 1RO", [
      ["AVALOS ESCOBOZA XAVIER ALONSO", "tutor.avalos@ejemplo.com"],
    ]],
  ];
  for (const [nombre, filas] of ejemplos) {
    const h = wb.addWorksheet(nombre);
    h.columns = [{ width: 42 }, { width: 34 }, { width: 34 }];
    filas.forEach((f) => h.addRow(f));
  }

  // Formato B: una sola hoja con columna de grupo
  const b = wb.addWorksheet("Formato con encabezados");
  b.columns = [
    { header: "Grupo", key: "g", width: 14 },
    { header: "Matrícula", key: "m", width: 14 },
    { header: "Nombre completo", key: "n", width: 40 },
    { header: "Correo 1", key: "c1", width: 32 },
    { header: "Correo 2", key: "c2", width: 32 },
  ];
  encabezar(b);
  b.addRow({ g: "1A", m: "1A-001", n: "AGUIRRE MARTORELL GUSTAVO", c1: "mama@ejemplo.com", c2: "papa@ejemplo.com" });
  b.addRow({ g: "3SEM", m: "", n: "AGUILAR ROBLES ARLETH RUBI", c1: "tutor@ejemplo.com", c2: "" });

  const g = wb.addWorksheet("Claves de grupo");
  g.columns = [
    { header: "Nivel", key: "n", width: 16 },
    { header: "Nombre de hoja o clave", key: "c", width: 34 },
    { header: "Corresponde a", key: "d", width: 24 },
  ];
  encabezar(g);
  [
    ["Secundaria", "SEC 1A · SEC 1B · SEC 1C", "1° A, 1° B, 1° C"],
    ["Secundaria", "SEC 2A · SEC 2B · SEC 2C", "2° A, 2° B, 2° C"],
    ["Secundaria", "SEC 3A · SEC 3B · SEC 3C", "3° A, 3° B, 3° C"],
    ["Preparatoria", "PREPA 1RO · PREPA 1 · 1SEM", "1er Semestre"],
    ["Preparatoria", "PREPA 3RO · PREPA 3 · 3SEM", "3er Semestre"],
    ["Preparatoria", "PREPA 5TO · PREPA 5 · 5SEM", "5to Semestre"],
  ].forEach(([n, c, d]) => g.addRow({ n, c, d }));

  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}
