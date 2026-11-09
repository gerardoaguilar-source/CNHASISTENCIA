import { readFileSync } from "fs";
import { leerExcel, interpretarGrupo } from "../src/lib/importar";
import type { Grupo } from "../src/lib/tipos";

// Los 12 grupos activos, tal como los crea 02_seed_grupos.sql
const GRUPOS: Grupo[] = [
  ["secundaria", "1A", "1° A", 11], ["secundaria", "1B", "1° B", 12], ["secundaria", "1C", "1° C", 13],
  ["secundaria", "2A", "2° A", 21], ["secundaria", "2B", "2° B", 22], ["secundaria", "2C", "2° C", 23],
  ["secundaria", "3A", "3° A", 31], ["secundaria", "3B", "3° B", 32], ["secundaria", "3C", "3° C", 33],
  ["preparatoria", "1SEM", "1er Semestre", 10],
  ["preparatoria", "3SEM", "3er Semestre", 30],
  ["preparatoria", "5SEM", "5to Semestre", 50],
].map(([nivel, clave, nombre, orden]) => ({
  id: `g-${clave}`, nivel, clave, nombre, orden, activo: true,
})) as Grupo[];

async function main() {
  const ruta = process.argv[2];
  const buf = readFileSync(ruta);
  const r = await leerExcel(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
    GRUPOS
  );

  console.log("=== HOJAS ===");
  for (const h of r.hojas) {
    const estado = h.problema ? `❌ ${h.problema}` : "✓";
    console.log(
      `  ${h.nombre.padEnd(14)} → ${(h.grupo_nombre ?? "—").padEnd(16)} ` +
      `${String(h.alumnos).padStart(4)} alumnos  ${estado}`
    );
  }

  console.log("\n=== ALUMNOS (primeros 8) ===");
  for (const f of r.filas.slice(0, 8)) {
    const nom = [f.apellido_paterno, f.apellido_materno, f.nombre].filter(Boolean).join(" ");
    console.log(
      `  ${f.hoja.padEnd(12)} ${nom.padEnd(38)} ${f.correos.join(", ").padEnd(40)} ${f.problemas.join("; ")}`
    );
  }

  console.log("\n=== RESUMEN ===");
  console.log(`  total:            ${r.filas.length}`);
  console.log(`  válidos:          ${r.validas}`);
  console.log(`  con observación:  ${r.conProblemas}`);

  // --- comprobaciones ---
  const fallos: string[] = [];
  const esperaGrupos = [
    ["SEC 1A", "1° A"], ["SEC 1B", "1° B"], ["SEC 1C", "1° C"],
    ["SEC 2A", "2° A"], ["SEC 2B", "2° B"], ["SEC 2C", "2° C"],
    ["SEC 3A", "3° A"], ["SEC 3B", "3° B"], ["SEC 3C", "3° C"],
    ["PREPA 1R0", "1er Semestre"], ["PREPA 3RO", "3er Semestre"], ["PREPA 50", "5to Semestre"],
  ];
  for (const [hoja, grupo] of esperaGrupos) {
    const h = r.hojas.find((x) => x.nombre === hoja);
    if (!h) { fallos.push(`falta la hoja ${hoja}`); continue; }
    if (h.grupo_nombre !== grupo) fallos.push(`${hoja} → esperaba "${grupo}", dio "${h.grupo_nombre}"`);
  }

  // Variantes de escritura que deben funcionar igual
  const variantes: [string, string][] = [
    ["SEC 1A", "1A"], ["Sec 1a", "1A"], ["SECUNDARIA 2B", "2B"], ["1° A", "1A"],
    ["PREPA 1RO", "1SEM"], ["PREPA 1R0", "1SEM"], ["PREPA 50", "5SEM"],
    ["PREPA 5TO", "5SEM"], ["prepa 3ro", "3SEM"], ["3er Semestre", "3SEM"],
  ];
  for (const [texto, clave] of variantes) {
    const got = interpretarGrupo(texto).clave;
    if (got !== clave) fallos.push(`interpretarGrupo("${texto}") → "${got}", esperaba "${clave}"`);
  }

  const primero = r.filas[0];
  if (primero.apellido_paterno !== "Aguirre" || primero.nombre !== "Gustavo") {
    fallos.push(`no partió bien el nombre: ${JSON.stringify(primero)}`);
  }
  const largo = r.filas.find((f) => f.nombre === "Janeth Isabella");
  if (!largo || largo.apellido_paterno !== "Arteaga" || largo.apellido_materno !== "Suarez") {
    fallos.push("no manejó bien un nombre de dos palabras");
  }
  const dosPalabras = r.filas.find((f) => f.apellido_paterno === "Alcibia");
  if (!dosPalabras || dosPalabras.nombre !== "Erick" || dosPalabras.apellido_materno !== "") {
    fallos.push("no manejó bien 'ALCIBIA ERICK' (solo dos palabras)");
  }
  const apostrofe = r.filas.find((f) => f.nombre.includes("D'"));
  if (!apostrofe) fallos.push("perdió el apóstrofe de D'LISSE");
  if (r.filas.some((f) => f.correos.length === 0)) fallos.push("algún alumno quedó sin correo");
  if (r.validas !== r.filas.length) fallos.push("algún alumno quedó sin grupo");

  console.log("\n=== VEREDICTO ===");
  if (fallos.length) { console.log("FALLOS:\n - " + fallos.join("\n - ")); process.exit(1); }
  console.log("TODO BIEN ✓");
  if (apostrofe) console.log(`  (apóstrofe conservado: ${apostrofe.nombre})`);
}

main();
