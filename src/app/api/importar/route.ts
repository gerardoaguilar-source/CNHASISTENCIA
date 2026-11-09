import { NextResponse } from "next/server";
import { haySupabase } from "@/lib/config";
import { supabaseServidor, supabaseAdmin } from "@/lib/supabase/servidor";
import { obtenerGrupos, perfilActual } from "@/lib/datos";
import { leerExcel, type FilaImportada } from "@/lib/importar";

export const runtime = "nodejs";
export const maxDuration = 60;

const TROZO = 400;
function trozos<T>(lista: T[], tam = TROZO): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < lista.length; i += tam) out.push(lista.slice(i, i + tam));
  return out;
}

const llaveNombre = (f: { grupo_id: string | null; apellido_paterno: string; apellido_materno: string; nombre: string }) =>
  [f.grupo_id, f.apellido_paterno, f.apellido_materno, f.nombre]
    .join("|")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

export async function POST(req: Request) {
  const perfil = await perfilActual();
  if (!perfil || perfil.rol !== "admin") {
    return NextResponse.json({ ok: false, mensaje: "No tienes permiso para esto." }, { status: 403 });
  }

  const forma = await req.formData();
  const archivo = forma.get("archivo");
  const modo = String(forma.get("modo") ?? "previo");

  if (!(archivo instanceof File)) {
    return NextResponse.json({ ok: false, mensaje: "No se recibió ningún archivo." }, { status: 400 });
  }
  if (archivo.size > 12 * 1024 * 1024) {
    return NextResponse.json({ ok: false, mensaje: "El archivo pesa más de 12 MB." }, { status: 400 });
  }

  const grupos = [
    ...(await obtenerGrupos("secundaria")),
    ...(await obtenerGrupos("preparatoria")),
  ];

  let resumen;
  try {
    resumen = await leerExcel(await archivo.arrayBuffer(), grupos);
  } catch (e) {
    return NextResponse.json(
      { ok: false, mensaje: `No se pudo leer el archivo: ${e instanceof Error ? e.message : e}` },
      { status: 400 }
    );
  }

  if (modo === "previo") {
    // La vista previa no necesita los 1000 renglones completos.
    return NextResponse.json({
      ok: true,
      hojas: resumen.hojas,
      validas: resumen.validas,
      conProblemas: resumen.conProblemas,
      total: resumen.filas.length,
      filas: resumen.filas.slice(0, 250),
      truncado: resumen.filas.length > 250,
    });
  }

  /* ================================================================ */
  /*  APLICAR                                                         */
  /* ================================================================ */
  if (!haySupabase()) {
    return NextResponse.json({
      ok: true, modoDemo: true, insertados: 0, actualizados: 0,
      omitidos: resumen.filas.length,
      mensaje: "Modo demostración: el archivo se leyó bien, pero todavía no hay base de datos donde guardarlo.",
    });
  }

  const sb = await supabaseServidor();
  const admin = supabaseAdmin();

  const buenas = resumen.filas.filter(
    (f: FilaImportada) => f.grupo_id && (f.nombre || f.apellido_paterno)
  );
  if (!buenas.length) {
    return NextResponse.json({
      ok: false,
      mensaje: "No se reconoció ningún alumno con grupo válido. Revisa los nombres de las hojas.",
    });
  }

  const errores: string[] = [];

  // --- 1. Lo que ya existe, en una sola consulta --------------------
  const { data: existentes, error: errLectura } = await sb
    .from("alumnos")
    .select("id, grupo_id, matricula, nombre, apellido_paterno, apellido_materno");
  if (errLectura) {
    return NextResponse.json({ ok: false, mensaje: `No se pudo leer la lista actual: ${errLectura.message}` }, { status: 500 });
  }

  type Existente = {
    id: string; grupo_id: string; matricula: string | null;
    nombre: string; apellido_paterno: string; apellido_materno: string;
  };
  const porMatricula = new Map<string, string>();
  const porNombre = new Map<string, string>();
  for (const a of (existentes ?? []) as Existente[]) {
    if (a.matricula) porMatricula.set(a.matricula.trim().toLowerCase(), a.id);
    porNombre.set(llaveNombre(a), a.id);
  }

  // --- 2. Separar altas de actualizaciones --------------------------
  const nuevos: Record<string, unknown>[] = [];
  const cambios: Record<string, unknown>[] = [];
  const vistos = new Set<string>();

  for (const f of buenas) {
    const llave = llaveNombre(f);
    if (vistos.has(llave)) {
      errores.push(`Repetido en el archivo: ${f.apellido_paterno} ${f.nombre} (hoja ${f.hoja})`);
      continue;
    }
    vistos.add(llave);

    const id =
      (f.matricula ? porMatricula.get(f.matricula.trim().toLowerCase()) : undefined) ??
      porNombre.get(llave);

    const datos = {
      grupo_id: f.grupo_id!,
      matricula: f.matricula,
      nombre: f.nombre,
      apellido_paterno: f.apellido_paterno,
      apellido_materno: f.apellido_materno,
      activo: true,
    };
    if (id) cambios.push({ id, ...datos });
    else nuevos.push(datos);
  }

  // --- 3. Guardar en lotes ------------------------------------------
  const idsPorLlave = new Map<string, string>();
  let insertados = 0;
  let actualizados = 0;

  for (const lote of trozos(nuevos)) {
    const { data, error } = await admin
      .from("alumnos")
      .insert(lote)
      .select("id, grupo_id, nombre, apellido_paterno, apellido_materno");
    if (error) { errores.push(`Alta de alumnos: ${error.message}`); continue; }
    insertados += data?.length ?? 0;
    for (const a of (data ?? []) as Existente[]) idsPorLlave.set(llaveNombre(a), a.id);
  }

  for (const lote of trozos(cambios)) {
    const { error } = await admin.from("alumnos").upsert(lote, { onConflict: "id" });
    if (error) { errores.push(`Actualización: ${error.message}`); continue; }
    actualizados += lote.length;
    for (const a of lote as unknown as Existente[]) idsPorLlave.set(llaveNombre(a), a.id);
  }

  // --- 4. Tutores: reemplazar los correos de quienes traían ---------
  const conCorreo = buenas.filter((f) => f.correos.length > 0);
  const idsAfectados = conCorreo
    .map((f) => idsPorLlave.get(llaveNombre(f)))
    .filter((x): x is string => Boolean(x));

  for (const lote of trozos(idsAfectados)) {
    const { error } = await admin.from("tutores").delete().in("alumno_id", lote);
    if (error) errores.push(`Limpieza de correos: ${error.message}`);
  }

  const tutores: Record<string, unknown>[] = [];
  for (const f of conCorreo) {
    const id = idsPorLlave.get(llaveNombre(f));
    if (!id) continue;
    f.correos.forEach((email, i) => {
      tutores.push({
        alumno_id: id,
        nombre: i === 0 ? (f.tutor ?? "") : "",
        email,
        telefono: i === 0 ? f.telefono : null,
        notificar: true,
      });
    });
  }

  let correosGuardados = 0;
  for (const lote of trozos(tutores)) {
    const { error } = await admin.from("tutores").insert(lote);
    if (error) errores.push(`Alta de correos: ${error.message}`);
    else correosGuardados += lote.length;
  }

  return NextResponse.json({
    ok: errores.length === 0,
    insertados,
    actualizados,
    correos: correosGuardados,
    sinCorreo: buenas.filter((f) => f.correos.length === 0).length,
    omitidos: resumen.filas.length - buenas.length,
    errores: errores.slice(0, 20),
  });
}
