import "server-only";

import { haySupabase } from "./config";
import { supabaseServidor, supabaseAdmin } from "./supabase/servidor";
import { ALUMNOS_DEMO, GRUPOS_DEMO, estadoDemo } from "./demo";
import type {
  EstatusAsistencia, Grupo, Justificacion, Nivel, Perfil, RenglonLista,
} from "./tipos";

/* ==================================================================== */
/*  PERFIL                                                              */
/* ==================================================================== */

export async function perfilActual(): Promise<Perfil | null> {
  if (!haySupabase()) {
    return {
      id: "demo", nombre: "Usuario de demostración",
      email: "demo@cnhtijuana.edu.mx", rol: "admin", activo: true,
    };
  }
  const sb = await supabaseServidor();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb.from("perfiles").select("*").eq("id", user.id).single();
  const perfil = (data as Perfil) ?? null;
  // Cuenta suspendida: se trata igual que si no hubiera sesión.
  if (!perfil || !perfil.activo) return null;
  return perfil;
}

/* ==================================================================== */
/*  GRUPOS                                                              */
/* ==================================================================== */

export async function obtenerGrupos(nivel?: Nivel): Promise<Grupo[]> {
  if (!haySupabase()) {
    return GRUPOS_DEMO.filter((g) => g.activo && (!nivel || g.nivel === nivel))
      .sort((a, b) => a.orden - b.orden);
  }
  const sb = await supabaseServidor();
  let q = sb.from("grupos").select("*").eq("activo", true).order("orden");
  if (nivel) q = q.eq("nivel", nivel);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as Grupo[];
}

export async function grupoPorClave(nivel: Nivel, clave: string): Promise<Grupo | null> {
  const grupos = await obtenerGrupos(nivel);
  return grupos.find((g) => g.clave.toLowerCase() === clave.toLowerCase()) ?? null;
}

/** Cuántos alumnos activos tiene cada grupo (para los botones del selector). */
export async function conteoPorGrupo(nivel: Nivel): Promise<Record<string, number>> {
  if (!haySupabase()) {
    const conteo: Record<string, number> = {};
    for (const a of ALUMNOS_DEMO) conteo[a.grupo_id] = (conteo[a.grupo_id] ?? 0) + 1;
    return conteo;
  }
  const sb = await supabaseServidor();
  const grupos = await obtenerGrupos(nivel);
  const { data } = await sb
    .from("alumnos")
    .select("grupo_id")
    .eq("activo", true)
    .in("grupo_id", grupos.map((g) => g.id));
  const conteo: Record<string, number> = {};
  for (const r of (data ?? []) as { grupo_id: string }[]) {
    conteo[r.grupo_id] = (conteo[r.grupo_id] ?? 0) + 1;
  }
  return conteo;
}

/**
 * Cuántos alumnos están marcados como ausentes en cada grupo en una fecha
 * (lo ya guardado, se haya avisado o no a los padres). Sirve para que en el
 * selector de grupos se vea de un vistazo cuántos lleva cada salón.
 */
export async function marcadosPorGrupo(
  nivel: Nivel, fecha: string
): Promise<Record<string, number>> {
  const conteo: Record<string, number> = {};
  if (!haySupabase()) {
    estadoDemo().asistencia.forEach((v, k) => {
      const [alumnoId, f] = k.split("|");
      if (f !== fecha || v.estatus !== "ausente") return;
      const a = ALUMNOS_DEMO.find((x) => x.id === alumnoId);
      const g = a && GRUPOS_DEMO.find((x) => x.id === a.grupo_id);
      if (!a || !g || g.nivel !== nivel) return;
      conteo[a.grupo_id] = (conteo[a.grupo_id] ?? 0) + 1;
    });
    return conteo;
  }
  const sb = await supabaseServidor();
  const grupos = await obtenerGrupos(nivel);
  if (!grupos.length) return conteo;
  const { data, error } = await sb
    .from("asistencia")
    .select("grupo_id")
    .eq("fecha", fecha)
    .eq("estatus", "ausente")
    .in("grupo_id", grupos.map((g) => g.id));
  if (error) throw new Error(error.message);
  for (const r of (data ?? []) as { grupo_id: string }[]) {
    conteo[r.grupo_id] = (conteo[r.grupo_id] ?? 0) + 1;
  }
  return conteo;
}

/* ==================================================================== */
/*  LISTA DEL GRUPO EN UNA FECHA                                        */
/* ==================================================================== */

export async function obtenerLista(grupoId: string, fecha: string): Promise<RenglonLista[]> {
  if (!haySupabase()) {
    const st = estadoDemo();
    return ALUMNOS_DEMO.filter((a) => a.grupo_id === grupoId).map((a) => {
      const j = st.justificaciones.find(
        (x) => !x.cancelada && x.alumno_id === a.id &&
               fecha >= x.fecha_inicio && fecha <= x.fecha_fin
      );
      const reg = st.asistencia.get(`${a.id}|${fecha}`);
      return {
        alumno_id: a.id,
        nombre_completo: a.nombre_completo,
        matricula: a.matricula,
        correos: a.correos,
        justificacion: j
          ? { id: j.id, motivo: j.motivo, fecha_inicio: j.fecha_inicio, fecha_fin: j.fecha_fin }
          : null,
        estatus: (reg?.estatus as EstatusAsistencia) ?? null,
        notificado: reg?.notificado ?? false,
      };
    });
  }

  const sb = await supabaseServidor();

  const { data: alumnos, error } = await sb
    .from("alumnos")
    .select("id, matricula, nombre, apellido_paterno, apellido_materno")
    .eq("grupo_id", grupoId)
    .eq("activo", true);
  if (error) throw new Error(error.message);

  const ids = (alumnos ?? []).map((a) => a.id as string);
  if (!ids.length) return [];

  const [{ data: tutores }, { data: justifs }, { data: asis }, { data: notifs }] =
    await Promise.all([
      sb.from("tutores").select("alumno_id, email").in("alumno_id", ids).eq("notificar", true),
      sb.from("justificaciones")
        .select("id, alumno_id, motivo, fecha_inicio, fecha_fin")
        .in("alumno_id", ids).eq("cancelada", false)
        .lte("fecha_inicio", fecha).gte("fecha_fin", fecha),
      sb.from("asistencia").select("alumno_id, estatus").in("alumno_id", ids).eq("fecha", fecha),
      sb.from("notificaciones").select("alumno_id")
        .in("alumno_id", ids).eq("fecha", fecha).eq("estatus", "enviado"),
    ]);

  const porTutor = new Map<string, string[]>();
  for (const t of (tutores ?? []) as { alumno_id: string; email: string }[]) {
    porTutor.set(t.alumno_id, [...(porTutor.get(t.alumno_id) ?? []), t.email]);
  }
  const porJustif = new Map<string, RenglonLista["justificacion"]>();
  for (const j of (justifs ?? []) as Record<string, string>[]) {
    porJustif.set(j.alumno_id, {
      id: j.id, motivo: j.motivo, fecha_inicio: j.fecha_inicio, fecha_fin: j.fecha_fin,
    });
  }
  const porEstatus = new Map<string, EstatusAsistencia>();
  for (const a of (asis ?? []) as { alumno_id: string; estatus: EstatusAsistencia }[]) {
    porEstatus.set(a.alumno_id, a.estatus);
  }
  const avisados = new Set((notifs ?? []).map((n) => (n as { alumno_id: string }).alumno_id));

  return (alumnos ?? [])
    .map((a) => ({
      alumno_id: a.id as string,
      nombre_completo: [a.apellido_paterno, a.apellido_materno, a.nombre]
        .filter(Boolean).join(" ").replace(/\s+/g, " ").trim(),
      matricula: (a.matricula as string) ?? null,
      correos: porTutor.get(a.id as string) ?? [],
      justificacion: porJustif.get(a.id as string) ?? null,
      estatus: porEstatus.get(a.id as string) ?? null,
      notificado: avisados.has(a.id as string),
    }))
    .sort((x, y) => x.nombre_completo.localeCompare(y.nombre_completo, "es"));
}

/* ==================================================================== */
/*  JUSTIFICACIONES                                                     */
/* ==================================================================== */

export interface JustificacionConAlumno extends Justificacion {
  alumno_nombre: string;
  grupo_nombre: string;
  nivel: Nivel;
}

export async function listarJustificaciones(
  soloVigentes: boolean, fecha: string
): Promise<JustificacionConAlumno[]> {
  if (!haySupabase()) {
    const st = estadoDemo();
    return st.justificaciones
      .filter((j) => !j.cancelada)
      .filter((j) => !soloVigentes || (fecha >= j.fecha_inicio && fecha <= j.fecha_fin))
      .map((j) => {
        const a = ALUMNOS_DEMO.find((x) => x.id === j.alumno_id)!;
        const g = GRUPOS_DEMO.find((x) => x.id === a?.grupo_id)!;
        return {
          ...j,
          alumno_nombre: a?.nombre_completo ?? "—",
          grupo_nombre: g?.nombre ?? "—",
          nivel: g?.nivel ?? "secundaria",
        };
      })
      .sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio));
  }

  const sb = await supabaseServidor();
  let q = sb
    .from("justificaciones")
    .select("*, alumnos(nombre, apellido_paterno, apellido_materno, grupos(nombre, nivel))")
    .eq("cancelada", false)
    .order("fecha_inicio", { ascending: false });
  if (soloVigentes) q = q.lte("fecha_inicio", fecha).gte("fecha_fin", fecha);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  type Fila = Justificacion & {
    alumnos: {
      nombre: string; apellido_paterno: string; apellido_materno: string;
      grupos: { nombre: string; nivel: Nivel };
    };
  };
  return ((data ?? []) as unknown as Fila[]).map((j) => ({
    ...j,
    alumno_nombre: [j.alumnos?.apellido_paterno, j.alumnos?.apellido_materno, j.alumnos?.nombre]
      .filter(Boolean).join(" ").trim(),
    grupo_nombre: j.alumnos?.grupos?.nombre ?? "—",
    nivel: j.alumnos?.grupos?.nivel ?? "secundaria",
  }));
}

export async function crearJustificacion(d: {
  alumno_id: string; fecha_inicio: string; fecha_fin: string; motivo: string; perfil_id?: string;
}): Promise<void> {
  if (!haySupabase()) {
    estadoDemo().justificaciones.push({
      id: `j-${Date.now()}`, alumno_id: d.alumno_id,
      fecha_inicio: d.fecha_inicio, fecha_fin: d.fecha_fin,
      motivo: d.motivo, cancelada: false, creado_en: new Date().toISOString(),
    });
    return;
  }
  const sb = await supabaseServidor();
  const { error } = await sb.from("justificaciones").insert({
    alumno_id: d.alumno_id, fecha_inicio: d.fecha_inicio,
    fecha_fin: d.fecha_fin, motivo: d.motivo, registrado_por: d.perfil_id ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function cancelarJustificacion(id: string): Promise<void> {
  if (!haySupabase()) {
    const j = estadoDemo().justificaciones.find((x) => x.id === id);
    if (j) j.cancelada = true;
    return;
  }
  const sb = await supabaseServidor();
  const { error } = await sb.from("justificaciones").update({ cancelada: true }).eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Permisos (justificaciones) no cancelados que tocan algún día del periodo.
 * Se usa en el PDF del historial, para la sección de justificados.
 */
export async function justificadosEnPeriodo(
  desde: string, hasta: string
): Promise<JustificacionConAlumno[]> {
  if (!haySupabase()) {
    const todas = await listarJustificaciones(false, hasta);
    return todas.filter((j) => j.fecha_inicio <= hasta && j.fecha_fin >= desde);
  }

  const sb = await supabaseServidor();
  const PARTE = 1000;
  const data: unknown[] = [];
  for (let i = 0; i < 50; i++) {
    const { data: parte, error } = await sb
      .from("justificaciones")
      .select("*, alumnos(nombre, apellido_paterno, apellido_materno, grupos(nombre, nivel))")
      .eq("cancelada", false)
      .lte("fecha_inicio", hasta).gte("fecha_fin", desde)
      .order("fecha_inicio")
      .order("id")
      .range(i * PARTE, (i + 1) * PARTE - 1);
    if (error) throw new Error(error.message);
    data.push(...(parte ?? []));
    if (!parte || parte.length < PARTE) break;
  }

  type Fila = Justificacion & {
    alumnos: {
      nombre: string; apellido_paterno: string; apellido_materno: string;
      grupos: { nombre: string; nivel: Nivel } | null;
    } | null;
  };
  return (data as Fila[]).map((j) => ({
    ...j,
    alumno_nombre: [j.alumnos?.apellido_paterno, j.alumnos?.apellido_materno, j.alumnos?.nombre]
      .filter(Boolean).join(" ").replace(/\s+/g, " ").trim(),
    grupo_nombre: j.alumnos?.grupos?.nombre ?? "—",
    nivel: j.alumnos?.grupos?.nivel ?? "secundaria",
  }));
}

/** Búsqueda de alumnos por nombre o matrícula — para el alta de permisos. */
export async function buscarAlumnos(texto: string, limite = 20) {
  const t = texto.trim().toLowerCase();
  if (t.length < 2) return [];

  if (!haySupabase()) {
    return ALUMNOS_DEMO
      .filter((a) =>
        a.nombre_completo.toLowerCase().includes(t) || a.matricula.toLowerCase().includes(t))
      .slice(0, limite)
      .map((a) => ({
        id: a.id,
        nombre_completo: a.nombre_completo,
        grupo_nombre: GRUPOS_DEMO.find((g) => g.id === a.grupo_id)?.nombre ?? "",
      }));
  }

  const sb = await supabaseServidor();
  const { data } = await sb
    .from("alumnos")
    .select("id, nombre, apellido_paterno, apellido_materno, matricula, grupos(nombre)")
    .eq("activo", true)
    .or(`nombre.ilike.%${t}%,apellido_paterno.ilike.%${t}%,apellido_materno.ilike.%${t}%,matricula.ilike.%${t}%`)
    .limit(limite);

  type Fila = {
    id: string; nombre: string; apellido_paterno: string;
    apellido_materno: string; grupos: { nombre: string } | null;
  };
  return ((data ?? []) as unknown as Fila[]).map((a) => ({
    id: a.id,
    nombre_completo: [a.apellido_paterno, a.apellido_materno, a.nombre].filter(Boolean).join(" ").trim(),
    grupo_nombre: a.grupos?.nombre ?? "",
  }));
}

/* ==================================================================== */
/*  HISTORIAL                                                           */
/* ==================================================================== */

export async function historialAusencias(desde: string, hasta: string) {
  if (!haySupabase()) {
    const st = estadoDemo();
    const filas: {
      fecha: string; alumno: string; grupo: string; nivel: Nivel | null;
      estatus: string; notificado: boolean; correos: string[];
    }[] = [];
    st.asistencia.forEach((v, k) => {
      const [alumnoId, fecha] = k.split("|");
      if (fecha < desde || fecha > hasta) return;
      if (v.estatus === "presente") return;
      const a = ALUMNOS_DEMO.find((x) => x.id === alumnoId);
      if (!a) return;
      filas.push({
        fecha, alumno: a.nombre_completo,
        grupo: GRUPOS_DEMO.find((g) => g.id === a.grupo_id)?.nombre ?? "",
        nivel: GRUPOS_DEMO.find((g) => g.id === a.grupo_id)?.nivel ?? null,
        estatus: v.estatus, notificado: v.notificado, correos: a.correos,
      });
    });
    return filas.sort((x, y) => y.fecha.localeCompare(x.fecha));
  }

  const sb = await supabaseServidor();

  // Supabase entrega máximo 1000 renglones por consulta: se pide por partes
  // para que el historial (y su PDF) salga completo aunque haya más.
  const PARTE = 1000;
  const MAX_PARTES = 50;

  const data: unknown[] = [];
  for (let i = 0; i < MAX_PARTES; i++) {
    const { data: parte, error } = await sb
      .from("asistencia")
      .select("fecha, estatus, alumno_id, alumnos(nombre, apellido_paterno, apellido_materno, grupos(nombre, nivel))")
      .gte("fecha", desde).lte("fecha", hasta)
      .neq("estatus", "presente")
      .order("fecha", { ascending: false })
      .order("alumno_id")
      .range(i * PARTE, (i + 1) * PARTE - 1);
    if (error) throw new Error(error.message);
    data.push(...(parte ?? []));
    if (!parte || parte.length < PARTE) break;
  }

  const notifs: unknown[] = [];
  for (let i = 0; i < MAX_PARTES; i++) {
    const { data: parte, error } = await sb
      .from("notificaciones")
      .select("alumno_id, fecha, destinatarios, estatus")
      .gte("fecha", desde).lte("fecha", hasta)
      .order("fecha", { ascending: false })
      .order("id")
      .range(i * PARTE, (i + 1) * PARTE - 1);
    if (error) throw new Error(error.message);
    notifs.push(...(parte ?? []));
    if (!parte || parte.length < PARTE) break;
  }

  const avisados = new Map<string, string[]>();
  for (const n of notifs as { alumno_id: string; fecha: string; destinatarios: string[]; estatus: string }[]) {
    if (n.estatus === "enviado") avisados.set(`${n.alumno_id}|${n.fecha}`, n.destinatarios);
  }

  type Fila = {
    fecha: string; estatus: string; alumno_id?: string;
    alumnos: {
      nombre: string; apellido_paterno: string; apellido_materno: string;
      grupos: { nombre: string; nivel: Nivel } | null;
    } | null;
  };
  return (data as Fila[]).map((r) => ({
    fecha: r.fecha,
    alumno: [r.alumnos?.apellido_paterno, r.alumnos?.apellido_materno, r.alumnos?.nombre]
      .filter(Boolean).join(" ").trim(),
    grupo: r.alumnos?.grupos?.nombre ?? "",
    nivel: r.alumnos?.grupos?.nivel ?? null,
    estatus: r.estatus,
    notificado: avisados.has(`${r.alumno_id}|${r.fecha}`),
    correos: avisados.get(`${r.alumno_id}|${r.fecha}`) ?? [],
  }));
}

export { supabaseAdmin };
