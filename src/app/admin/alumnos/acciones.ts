"use server";

import { revalidatePath } from "next/cache";
import { haySupabase } from "@/lib/config";
import { obtenerGrupos, perfilActual } from "@/lib/datos";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { ALUMNOS_DEMO } from "@/lib/demo";
import { tipoTitulo } from "@/lib/importar";

/**
 * ALTAS Y BAJAS A MANO
 * Para cuando entra o se va un alumno a mitad del ciclo y no vale la pena
 * volver a subir todo el Excel.
 *
 * Dar de baja NO borra al alumno: solo lo quita de las listas. Sus faltas
 * y avisos anteriores se conservan en el historial, y se puede reactivar.
 */

type Resultado = { ok: boolean; mensaje: string };

export interface AlumnoDeGrupo {
  id: string;
  nombre_completo: string;
  correos: string[];
  activo: boolean;
}

const MAX_CORREOS = 4;

const limpio = (s: unknown): string => String(s ?? "").replace(/\s+/g, " ").trim();
const esCorreo = (s: string) => /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(s);

/** Mismo criterio que la carga de Excel: sin acentos ni mayúsculas. */
const llaveNombre = (a: { apellido_paterno: string; apellido_materno: string; nombre: string }) =>
  [a.apellido_paterno, a.apellido_materno, a.nombre]
    .join("|")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const nombreCompleto = (a: { apellido_paterno: string; apellido_materno: string; nombre: string }) =>
  [a.apellido_paterno, a.apellido_materno, a.nombre].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();

async function revisarPermiso(): Promise<Resultado | null> {
  const perfil = await perfilActual();
  if (!perfil) return { ok: false, mensaje: "Tu sesión expiró. Vuelve a entrar." };
  if (perfil.rol !== "admin") {
    return { ok: false, mensaje: "Solo un administrador puede hacer esto." };
  }
  return null;
}

function refrescar() {
  revalidatePath("/admin/alumnos");
  revalidatePath("/lista", "layout");
}

/* ==================================================================== */
/*  LISTA DE UN GRUPO (activos y dados de baja)                         */
/* ==================================================================== */

export async function accionAlumnosDeGrupo(
  grupoId: string
): Promise<{ ok: boolean; mensaje?: string; alumnos: AlumnoDeGrupo[] }> {
  const sinPermiso = await revisarPermiso();
  if (sinPermiso) return { ...sinPermiso, alumnos: [] };
  if (!grupoId) return { ok: true, alumnos: [] };

  if (!haySupabase()) {
    return {
      ok: true,
      alumnos: ALUMNOS_DEMO.filter((a) => a.grupo_id === grupoId).map((a) => ({
        id: a.id, nombre_completo: a.nombre_completo, correos: a.correos, activo: true,
      })),
    };
  }

  const sb = await supabaseServidor();
  const { data, error } = await sb
    .from("alumnos")
    .select("id, nombre, apellido_paterno, apellido_materno, activo, tutores(email)")
    .eq("grupo_id", grupoId);
  if (error) return { ok: false, mensaje: error.message, alumnos: [] };

  type Fila = {
    id: string; nombre: string; apellido_paterno: string; apellido_materno: string;
    activo: boolean; tutores: { email: string }[] | null;
  };
  const alumnos = ((data ?? []) as unknown as Fila[])
    .map((a) => ({
      id: a.id,
      nombre_completo: nombreCompleto(a),
      correos: (a.tutores ?? []).map((t) => t.email),
      activo: a.activo,
    }))
    .sort((x, y) => x.nombre_completo.localeCompare(y.nombre_completo, "es"));

  return { ok: true, alumnos };
}

/* ==================================================================== */
/*  ALTA                                                                */
/* ==================================================================== */

export async function accionAgregarAlumno(datos: {
  grupo_id: string;
  apellido_paterno: string;
  apellido_materno: string;
  nombre: string;
  correos: string;
  /** El usuario ya vio el aviso de "hay otro con el mismo nombre" y aceptó. */
  aceptarRepetido?: boolean;
}): Promise<Resultado & { confirmar?: boolean }> {
  const sinPermiso = await revisarPermiso();
  if (sinPermiso) return sinPermiso;
  if (!haySupabase()) {
    return { ok: false, mensaje: "En modo demostración no se guardan alumnos." };
  }

  const apellido_paterno = tipoTitulo(limpio(datos.apellido_paterno));
  const apellido_materno = tipoTitulo(limpio(datos.apellido_materno));
  const nombre = tipoTitulo(limpio(datos.nombre));

  if (!apellido_paterno) return { ok: false, mensaje: "Falta el apellido paterno." };
  if (!nombre) return { ok: false, mensaje: "Falta el nombre del alumno." };

  const grupos = [
    ...(await obtenerGrupos("secundaria")),
    ...(await obtenerGrupos("preparatoria")),
  ];
  const grupo = grupos.find((g) => g.id === datos.grupo_id);
  if (!grupo) return { ok: false, mensaje: "Elige el grupo del alumno." };

  // --- Correos: separados por coma, punto y coma, espacio o renglón ---
  const correos: string[] = [];
  for (const c of String(datos.correos ?? "").split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean)) {
    if (!esCorreo(c)) return { ok: false, mensaje: `Este correo no es válido: ${c}` };
    if (!correos.some((x) => x.toLowerCase() === c.toLowerCase())) correos.push(c);
  }
  if (correos.length > MAX_CORREOS) {
    return { ok: false, mensaje: `Máximo ${MAX_CORREOS} correos por alumno.` };
  }

  const sb = await supabaseServidor();

  // --- ¿Ya existe alguien con ese nombre? ----------------------------
  // Se revisa toda la lista (por partes de 1000, que es el tope de
  // Supabase) comparando sin acentos ni mayúsculas.
  type Existente = {
    id: string; grupo_id: string; nombre: string; apellido_paterno: string;
    apellido_materno: string; activo: boolean;
  };
  const llave = llaveNombre({ apellido_paterno, apellido_materno, nombre });
  const iguales: Existente[] = [];
  const PARTE = 1000;
  for (let i = 0; i < 50; i++) {
    const { data: parte, error } = await sb
      .from("alumnos")
      .select("id, grupo_id, nombre, apellido_paterno, apellido_materno, activo")
      .order("id")
      .range(i * PARTE, (i + 1) * PARTE - 1);
    if (error) return { ok: false, mensaje: `No se pudo revisar la lista actual: ${error.message}` };
    for (const a of (parte ?? []) as Existente[]) {
      if (llaveNombre(a) === llave) iguales.push(a);
    }
    if (!parte || parte.length < PARTE) break;
  }

  const enEsteGrupo = iguales.find((a) => a.grupo_id === grupo.id);
  if (enEsteGrupo) {
    return {
      ok: false,
      mensaje: enEsteGrupo.activo
        ? `${nombreCompleto(enEsteGrupo)} ya está en la lista de ${grupo.nombre}.`
        : `${nombreCompleto(enEsteGrupo)} ya existe en ${grupo.nombre}, pero está dado de baja. ` +
          `Búscalo abajo en "Dados de baja" y presiona Reactivar.`,
    };
  }

  const enOtro = iguales.find((a) => a.activo);
  if (enOtro && !datos.aceptarRepetido) {
    const otro = grupos.find((g) => g.id === enOtro.grupo_id);
    return {
      ok: false,
      confirmar: true,
      mensaje:
        `Ya hay un alumno activo con ese mismo nombre en ${otro?.nombre ?? "otro grupo"}. ` +
        `Si es el mismo alumno que cambió de grupo, primero dalo de baja allá. ` +
        `Si es otra persona con el mismo nombre, puedes agregarlo de todos modos.`,
    };
  }

  // --- Guardar -------------------------------------------------------
  const { data: creado, error: errAlta } = await sb
    .from("alumnos")
    .insert({
      grupo_id: grupo.id, matricula: null,
      nombre, apellido_paterno, apellido_materno, activo: true,
    })
    .select("id")
    .single();
  if (errAlta || !creado) {
    return { ok: false, mensaje: `No se pudo guardar al alumno: ${errAlta?.message ?? "sin respuesta"}` };
  }

  if (correos.length) {
    const { error: errCorreos } = await sb.from("tutores").insert(
      correos.map((email) => ({
        alumno_id: creado.id, nombre: "", email, telefono: null, notificar: true,
      }))
    );
    if (errCorreos) {
      // No dejar a medias a un alumno sin sus correos: se deshace el alta.
      await sb.from("alumnos").delete().eq("id", creado.id);
      return { ok: false, mensaje: `No se pudieron guardar los correos, así que no se agregó al alumno: ${errCorreos.message}` };
    }
  }

  refrescar();
  const quien = nombreCompleto({ apellido_paterno, apellido_materno, nombre });
  return {
    ok: true,
    mensaje: correos.length
      ? `${quien} quedó en ${grupo.nombre}. Los avisos llegarán a: ${correos.join(", ")}.`
      : `${quien} quedó en ${grupo.nombre}, pero SIN correo de tutor: no se le podrá avisar a nadie si falta.`,
  };
}

/* ==================================================================== */
/*  BAJA Y REACTIVACIÓN                                                 */
/* ==================================================================== */

async function cambiarEstado(id: string, activo: boolean): Promise<Resultado> {
  const sinPermiso = await revisarPermiso();
  if (sinPermiso) return sinPermiso;
  if (!haySupabase()) {
    return { ok: false, mensaje: "En modo demostración no se guardan cambios." };
  }
  if (!id) return { ok: false, mensaje: "Falta elegir al alumno." };

  const sb = await supabaseServidor();
  const { data, error } = await sb
    .from("alumnos")
    .update({ activo })
    .eq("id", id)
    .select("nombre, apellido_paterno, apellido_materno");
  if (error) return { ok: false, mensaje: error.message };
  if (!data || data.length === 0) {
    return { ok: false, mensaje: "No se encontró al alumno. Actualiza la página e inténtalo otra vez." };
  }

  refrescar();
  const quien = nombreCompleto(data[0] as { nombre: string; apellido_paterno: string; apellido_materno: string });
  return {
    ok: true,
    mensaje: activo
      ? `${quien} volvió a la lista.`
      : `${quien} quedó dado de baja. Ya no aparece en la lista ni se le mandan avisos.`,
  };
}

export async function accionBajaAlumno(id: string): Promise<Resultado> {
  return cambiarEstado(id, false);
}

export async function accionReactivarAlumno(id: string): Promise<Resultado> {
  return cambiarEstado(id, true);
}
