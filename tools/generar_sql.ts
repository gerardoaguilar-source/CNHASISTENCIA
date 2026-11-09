/**
 * Convierte el Excel del colegio en un archivo .sql listo para pegar
 * en Supabase → SQL Editor.
 *
 *   npx tsx tools/generar_sql.ts <archivo.xlsx> > supabase/03_alumnos.sql
 */
import { readFileSync } from "fs";
import { leerExcel } from "../src/lib/importar";
import type { Grupo } from "../src/lib/tipos";

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

/** Texto: una cadena vacía se queda como '' (las columnas de nombre son NOT NULL). */
const qt = (s: string | null) => `'${(s ?? "").replace(/'/g, "''")}'`;
/** Opcional: vacío se convierte en NULL (correo, matrícula). */
const q = (s: string | null) => (s == null || s === "" ? "null" : `'${s.replace(/'/g, "''")}'`);

async function main() {
  const ruta = process.argv[2];
  if (!ruta) { console.error("Uso: npx tsx tools/generar_sql.ts <archivo.xlsx>"); process.exit(1); }

  const buf = readFileSync(ruta);
  const r = await leerExcel(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
    GRUPOS
  );

  const buenas = r.filas.filter((f) => f.grupo_id);
  const malas = r.filas.filter((f) => !f.grupo_id);
  const porId = new Map(GRUPOS.map((g) => [g.id, g]));

  const L: string[] = [];
  L.push("-- =====================================================================");
  L.push("--  ASISTENCIA CNH — carga de alumnos y correos de tutores");
  L.push(`--  Generado desde: ${ruta.split("/").pop()}`);
  L.push(`--  ${buenas.length} alumnos · ${r.hojas.length} hojas`);
  L.push("--  Ejecutar DESPUÉS de 01_schema.sql y 02_seed_grupos.sql");
  L.push("--  Se puede volver a ejecutar sin duplicar: compara grupo + nombre.");
  L.push("-- =====================================================================");
  L.push("");
  if (malas.length) {
    L.push(`-- ⚠️  ${malas.length} renglones quedaron fuera por grupo no reconocido:`);
    for (const f of malas.slice(0, 20)) {
      L.push(`--     hoja "${f.hoja}" renglón ${f.renglon}: ${f.apellido_paterno} ${f.nombre}`);
    }
    L.push("");
  }

  L.push("begin;");
  L.push("");
  L.push("create temp table _carga (");
  L.push("  nivel text, clave text, pat text, mat text, nom text, correo text");
  L.push(") on commit drop;");
  L.push("");
  L.push("insert into _carga (nivel, clave, pat, mat, nom, correo) values");

  const valores: string[] = [];
  for (const f of buenas) {
    const g = porId.get(f.grupo_id!)!;
    const base = `  (${qt(g.nivel)}, ${qt(g.clave)}, ${qt(f.apellido_paterno)}, ${qt(f.apellido_materno)}, ${qt(f.nombre)}`;
    if (f.correos.length === 0) valores.push(`${base}, null)`);
    else for (const correo of f.correos) valores.push(`${base}, ${q(correo)})`);
  }
  L.push(valores.join(",\n") + ";");
  L.push("");
  L.push("-- Alta de alumnos que todavía no existen");
  L.push("insert into alumnos (grupo_id, nombre, apellido_paterno, apellido_materno, activo)");
  L.push("select distinct g.id, c.nom, c.pat, c.mat, true");
  L.push("from _carga c");
  L.push("join grupos g on g.clave = c.clave and g.nivel = c.nivel::nivel_escolar");
  L.push("where not exists (");
  L.push("  select 1 from alumnos a");
  L.push("  where a.grupo_id = g.id and a.nombre = c.nom");
  L.push("    and a.apellido_paterno = c.pat and a.apellido_materno = c.mat");
  L.push(");");
  L.push("");
  L.push("-- Correos de los tutores");
  L.push("insert into tutores (alumno_id, email, notificar)");
  L.push("select a.id, lower(c.correo), true");
  L.push("from _carga c");
  L.push("join grupos g on g.clave = c.clave and g.nivel = c.nivel::nivel_escolar");
  L.push("join alumnos a on a.grupo_id = g.id and a.nombre = c.nom");
  L.push("  and a.apellido_paterno = c.pat and a.apellido_materno = c.mat");
  L.push("where c.correo is not null");
  L.push("on conflict do nothing;");
  L.push("");
  L.push("commit;");
  L.push("");
  L.push("-- Comprobación: cuántos alumnos quedaron en cada grupo");
  L.push("select g.nivel, g.nombre as grupo, count(a.id) as alumnos,");
  L.push("       count(distinct t.alumno_id) as con_correo");
  L.push("from grupos g");
  L.push("left join alumnos a on a.grupo_id = g.id and a.activo");
  L.push("left join tutores t on t.alumno_id = a.id");
  L.push("group by g.nivel, g.nombre, g.orden order by g.nivel, g.orden;");

  console.log(L.join("\n"));
  console.error(`✓ ${buenas.length} alumnos, ${valores.length} renglones de carga`);
}

main();
