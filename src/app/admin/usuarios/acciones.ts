"use server";

import { revalidatePath } from "next/cache";
import { perfilActual } from "@/lib/datos";
import { haySupabase, hayLlaveServicio, LIMITE_CUENTAS } from "@/lib/config";
import { supabaseAdmin } from "@/lib/supabase/servidor";
import { cupoCuentas } from "@/lib/usuarios";
import type { Perfil, RolUsuario } from "@/lib/tipos";

type Resultado = { ok: boolean; mensaje: string };

const CLAVE_MINIMA = 8;
const MENSAJE_LLENO =
  `Ya se ocuparon los ${LIMITE_CUENTAS} lugares. No se pueden dar de alta más cuentas.`;

/** Solo un administrador activo puede tocar las cuentas. */
async function revisarPermiso(): Promise<{ perfil: Perfil } | { error: Resultado }> {
  const perfil = await perfilActual();
  if (!perfil) return { error: { ok: false, mensaje: "Tu sesión expiró. Vuelve a entrar." } };
  if (perfil.rol !== "admin") {
    return { error: { ok: false, mensaje: "Solo un administrador puede hacer esto." } };
  }
  if (!haySupabase()) {
    return { error: { ok: false, mensaje: "En modo demostración no se guardan cuentas." } };
  }
  if (!hayLlaveServicio()) {
    return {
      error: {
        ok: false,
        mensaje: "Falta la variable SUPABASE_SERVICE_ROLE_KEY en Vercel. Sin ella no se pueden crear cuentas.",
      },
    };
  }
  return { perfil };
}

function esRol(r: string): r is RolUsuario {
  return r === "admin" || r === "coordinador";
}

export async function accionCrearUsuario(datos: {
  nombre: string;
  email: string;
  clave: string;
  rol: string;
}): Promise<Resultado> {
  const permiso = await revisarPermiso();
  if ("error" in permiso) return permiso.error;

  const nombre = datos.nombre.trim().replace(/\s+/g, " ");
  const email = datos.email.trim().toLowerCase();
  const clave = datos.clave;
  const rol = datos.rol;

  if (nombre.length < 3) return { ok: false, mensaje: "Escribe el nombre completo de la persona." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, mensaje: "El correo no es válido." };
  }
  if (clave.length < CLAVE_MINIMA) {
    return { ok: false, mensaje: `La contraseña debe tener al menos ${CLAVE_MINIMA} caracteres.` };
  }
  if (!esRol(rol)) return { ok: false, mensaje: "Elige el tipo de acceso." };

  const cupo = await cupoCuentas();
  if (cupo.lleno) return { ok: false, mensaje: MENSAJE_LLENO };

  const sb = supabaseAdmin();
  const { data: creado, error } = await sb.auth.admin.createUser({
    email,
    password: clave,
    email_confirm: true,
    user_metadata: { nombre },
  });

  if (error) {
    const texto = error.message.toLowerCase();
    if (texto.includes("already") || texto.includes("registered") || texto.includes("exists")) {
      return { ok: false, mensaje: "Ya existe una cuenta con ese correo." };
    }
    // La base de datos también cuida el límite (por si dos personas dan de
    // alta al mismo tiempo): si ya está lleno, se dice claramente.
    const despues = await cupoCuentas().catch(() => null);
    if (despues?.lleno) return { ok: false, mensaje: MENSAJE_LLENO };
    return { ok: false, mensaje: `No se pudo crear la cuenta: ${error.message}` };
  }

  // El perfil nace suspendido y como coordinador (así lo deja la base de
  // datos a cualquier cuenta que no venga de aquí). Aquí se activa y se le
  // pone el tipo de acceso elegido.
  const { error: errPerfil } = await sb
    .from("perfiles")
    .upsert({ id: creado.user.id, nombre, email, rol, activo: true });
  if (errPerfil) {
    return {
      ok: false,
      mensaje: `La cuenta se creó, pero quedó suspendida: ${errPerfil.message}. Reactívala en la lista de abajo.`,
    };
  }

  revalidatePath("/admin/usuarios");
  return {
    ok: true,
    mensaje: `Cuenta creada para ${nombre}. Ya puede entrar con su correo y la contraseña que le pusiste.`,
  };
}

/** Suspender o reactivar. Una cuenta suspendida no puede entrar ni ver nada. */
export async function accionCambiarEstado(id: string, activo: boolean): Promise<Resultado> {
  const permiso = await revisarPermiso();
  if ("error" in permiso) return permiso.error;
  if (id === permiso.perfil.id) {
    return { ok: false, mensaje: "No puedes suspender tu propia cuenta." };
  }

  const sb = supabaseAdmin();
  const { error } = await sb.from("perfiles").update({ activo }).eq("id", id);
  if (error) return { ok: false, mensaje: error.message };

  // Además se bloquea (o desbloquea) el inicio de sesión.
  const { error: errAuth } = await sb.auth.admin.updateUserById(id, {
    ban_duration: activo ? "none" : "876000h",
  });
  if (errAuth) return { ok: false, mensaje: errAuth.message };

  revalidatePath("/admin/usuarios");
  return { ok: true, mensaje: activo ? "Cuenta reactivada." : "Cuenta suspendida." };
}

export async function accionCambiarRol(id: string, rol: string): Promise<Resultado> {
  const permiso = await revisarPermiso();
  if ("error" in permiso) return permiso.error;
  if (!esRol(rol)) return { ok: false, mensaje: "Tipo de acceso no válido." };
  if (id === permiso.perfil.id) {
    return { ok: false, mensaje: "No puedes cambiar tu propio tipo de acceso." };
  }

  const { error } = await supabaseAdmin().from("perfiles").update({ rol }).eq("id", id);
  if (error) return { ok: false, mensaje: error.message };

  revalidatePath("/admin/usuarios");
  return { ok: true, mensaje: "Tipo de acceso actualizado." };
}

export async function accionCambiarClave(id: string, clave: string): Promise<Resultado> {
  const permiso = await revisarPermiso();
  if ("error" in permiso) return permiso.error;
  if (clave.length < CLAVE_MINIMA) {
    return { ok: false, mensaje: `La contraseña debe tener al menos ${CLAVE_MINIMA} caracteres.` };
  }

  const { error } = await supabaseAdmin().auth.admin.updateUserById(id, { password: clave });
  if (error) return { ok: false, mensaje: error.message };

  return { ok: true, mensaje: "Contraseña cambiada." };
}
