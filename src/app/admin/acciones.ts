"use server";

import { revalidatePath } from "next/cache";
import {
  buscarAlumnos, cancelarJustificacion, crearJustificacion, perfilActual,
} from "@/lib/datos";

export async function accionBuscarAlumnos(texto: string) {
  const perfil = await perfilActual();
  if (!perfil) return [];
  return buscarAlumnos(texto);
}

export async function accionCrearJustificacion(datos: {
  alumno_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string;
}): Promise<{ ok: boolean; mensaje: string }> {
  const perfil = await perfilActual();
  if (!perfil) return { ok: false, mensaje: "Tu sesión expiró. Vuelve a entrar." };

  const { alumno_id, fecha_inicio, fecha_fin, motivo } = datos;
  if (!alumno_id) return { ok: false, mensaje: "Falta elegir al alumno." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha_inicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fecha_fin)) {
    return { ok: false, mensaje: "Las fechas no son válidas." };
  }
  if (fecha_fin < fecha_inicio) {
    return { ok: false, mensaje: "La fecha final no puede ser anterior a la inicial." };
  }

  try {
    await crearJustificacion({
      alumno_id, fecha_inicio, fecha_fin,
      motivo: motivo.trim(), perfil_id: perfil.id,
    });
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : "No se pudo guardar." };
  }

  revalidatePath("/admin/justificaciones");
  revalidatePath("/lista", "layout");
  return { ok: true, mensaje: "Permiso registrado. El alumno ya aparece bloqueado en su lista." };
}

export async function accionCancelarJustificacion(id: string): Promise<{ ok: boolean; mensaje: string }> {
  const perfil = await perfilActual();
  if (!perfil) return { ok: false, mensaje: "Tu sesión expiró." };
  try {
    await cancelarJustificacion(id);
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : "No se pudo cancelar." };
  }
  revalidatePath("/admin/justificaciones");
  revalidatePath("/lista", "layout");
  return { ok: true, mensaje: "Permiso cancelado." };
}
