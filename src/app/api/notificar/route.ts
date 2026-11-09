import { NextResponse } from "next/server";
import { haySupabase, correoDe } from "@/lib/config";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { estadoDemo, ALUMNOS_DEMO, GRUPOS_DEMO } from "@/lib/demo";
import { enviarCorreo } from "@/lib/correo/enviar";
import { asuntoAviso, htmlAviso, textoAviso } from "@/lib/correo/plantilla";
import type { Nivel } from "@/lib/tipos";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Peticion {
  grupo_id: string;
  nivel: Nivel;
  fecha: string;
  ausentes: string[];
  presentes: string[];
  justificados: string[];
  notificar: boolean;
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: Request) {
  let cuerpo: Peticion;
  try {
    cuerpo = (await req.json()) as Peticion;
  } catch {
    return NextResponse.json(
      { ok: false, enviados: 0, sinCorreo: [], fallidos: [], mensaje: "Petición inválida." },
      { status: 400 }
    );
  }

  const { grupo_id, nivel, fecha, ausentes = [], presentes = [], justificados = [], notificar } = cuerpo;

  if (!grupo_id || !fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return NextResponse.json(
      { ok: false, enviados: 0, sinCorreo: [], fallidos: [], mensaje: "Faltan datos del grupo o la fecha." },
      { status: 400 }
    );
  }

  const origen = new URL(req.url).origin;
  const urlEscudo = `${origen}/escudo-cnh.png`;

  /* ================================================================ */
  /*  MODO DEMO                                                       */
  /* ================================================================ */
  if (!haySupabase()) {
    const st = estadoDemo();
    const grupo = GRUPOS_DEMO.find((g) => g.id === grupo_id);

    presentes.forEach((id) => st.asistencia.set(`${id}|${fecha}`, { estatus: "presente", notificado: false }));
    justificados.forEach((id) => st.asistencia.set(`${id}|${fecha}`, { estatus: "justificado", notificado: false }));

    const sinCorreo: string[] = [];
    let enviados = 0;

    for (const id of ausentes) {
      const a = ALUMNOS_DEMO.find((x) => x.id === id);
      if (!a) continue;
      const puede = notificar && a.correos.length > 0;
      if (notificar && a.correos.length === 0) sinCorreo.push(a.nombre_completo);
      if (puede) {
        enviados++;
        st.notificaciones.push({
          alumno_id: id, fecha, destinatarios: a.correos,
          remitente: correoDe(nivel), asunto: asuntoAviso({
            alumno: a.nombre_completo, grupo: grupo?.nombre ?? "", nivel, fecha,
          }),
          estatus: "enviado", creado_en: new Date().toISOString(),
        });
      }
      st.asistencia.set(`${id}|${fecha}`, { estatus: "ausente", notificado: puede });
    }

    return NextResponse.json({ ok: true, enviados, sinCorreo, fallidos: [] });
  }

  /* ================================================================ */
  /*  MODO REAL                                                       */
  /* ================================================================ */
  const sb = await supabaseServidor();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, enviados: 0, sinCorreo: [], fallidos: [], mensaje: "Tu sesión expiró. Vuelve a entrar." },
      { status: 401 }
    );
  }

  // --- 1. Guardar la asistencia del día -----------------------------
  const filas = [
    ...presentes.map((id) => ({ alumno_id: id, estatus: "presente" as const })),
    ...justificados.map((id) => ({ alumno_id: id, estatus: "justificado" as const })),
    ...ausentes.map((id) => ({ alumno_id: id, estatus: "ausente" as const })),
  ].map((f) => ({
    ...f, grupo_id, fecha, registrado_por: user.id, actualizado_en: new Date().toISOString(),
  }));

  if (filas.length) {
    const { error } = await sb.from("asistencia").upsert(filas, { onConflict: "alumno_id,fecha" });
    if (error) {
      return NextResponse.json(
        { ok: false, enviados: 0, sinCorreo: [], fallidos: [], mensaje: `No se pudo guardar la lista: ${error.message}` },
        { status: 500 }
      );
    }
  }

  if (!notificar || ausentes.length === 0) {
    return NextResponse.json({ ok: true, enviados: 0, sinCorreo: [], fallidos: [] });
  }

  // --- 2. Datos de los ausentes y sus tutores ------------------------
  const [{ data: alumnos }, { data: tutores }, { data: grupoRow }, { data: yaEnviados }] =
    await Promise.all([
      sb.from("alumnos").select("id, nombre, apellido_paterno, apellido_materno").in("id", ausentes),
      sb.from("tutores").select("alumno_id, email").in("alumno_id", ausentes).eq("notificar", true),
      sb.from("grupos").select("nombre").eq("id", grupo_id).single(),
      sb.from("notificaciones").select("alumno_id").in("alumno_id", ausentes)
        .eq("fecha", fecha).eq("estatus", "enviado"),
    ]);

  const nombreGrupo = (grupoRow as { nombre: string } | null)?.nombre ?? "";
  const yaAvisados = new Set((yaEnviados ?? []).map((n) => (n as { alumno_id: string }).alumno_id));

  const correosDe = new Map<string, string[]>();
  for (const t of (tutores ?? []) as { alumno_id: string; email: string }[]) {
    correosDe.set(t.alumno_id, [...(correosDe.get(t.alumno_id) ?? []), t.email]);
  }
  const nombreDe = new Map<string, string>();
  for (const a of (alumnos ?? []) as Record<string, string>[]) {
    nombreDe.set(
      a.id,
      [a.apellido_paterno, a.apellido_materno, a.nombre].filter(Boolean).join(" ").replace(/\s+/g, " ").trim()
    );
  }

  // --- 3. Enviar --------------------------------------------------
  const remitente = correoDe(nivel);
  const sinCorreo: string[] = [];
  const fallidos: { alumno: string; error: string }[] = [];
  const bitacora: Record<string, unknown>[] = [];
  let enviados = 0;

  for (const id of ausentes) {
    const alumno = nombreDe.get(id);
    if (!alumno) continue;
    if (yaAvisados.has(id)) continue;

    const para = correosDe.get(id) ?? [];
    if (para.length === 0) {
      sinCorreo.push(alumno);
      continue;
    }

    const datos = { alumno, grupo: nombreGrupo, nivel, fecha, urlEscudo };
    const asunto = asuntoAviso(datos);
    const r = await enviarCorreo({
      nivel, para, asunto,
      html: htmlAviso(datos),
      texto: textoAviso(datos),
    });

    bitacora.push({
      alumno_id: id, fecha, destinatarios: para, remitente, asunto,
      estatus: r.ok ? "enviado" : "error",
      proveedor_id: r.id ?? null, error: r.error ?? null, enviado_por: user.id,
    });

    if (r.ok) enviados++;
    else fallidos.push({ alumno, error: r.error ?? "error desconocido" });

    await espera(450); // respeta el límite de la API de correo
  }

  if (bitacora.length) await sb.from("notificaciones").insert(bitacora);

  return NextResponse.json({ ok: true, enviados, sinCorreo, fallidos });
}
