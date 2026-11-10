import type { Nivel } from "./tipos";

export const COLEGIO =
  process.env.NEXT_PUBLIC_NOMBRE_COLEGIO || "Colegio Niños Héroes";
export const TELEFONO_COLEGIO =
  process.env.NEXT_PUBLIC_TELEFONO_COLEGIO || "";
export const ZONA_HORARIA = process.env.ZONA_HORARIA || "America/Tijuana";

/**
 * LÍMITE DE CUENTAS
 * Cuántas personas pueden tener cuenta para entrar a la app. Al llegar a
 * este número ya no se puede dar de alta a nadie más desde
 * Administración → Usuarios. Las cuentas suspendidas también cuentan.
 *
 * Para subirlo hay que cambiar el número en DOS lugares:
 *   1. aquí, y volver a publicar la app;
 *   2. en supabase/04_limite_cuentas.sql, y volver a ejecutarlo en Supabase.
 */
export const LIMITE_CUENTAS = 100;

/** ¿Está la llave de servicio? Hace falta para dar de alta usuarios. */
export function hayLlaveServicio(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** La app corre en MODO DEMO mientras no haya credenciales de Supabase. */
export function haySupabase(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export interface CuentaCorreo {
  usuario: string;
  clave: string;
  nombre: string;
}

/**
 * Cada nivel manda desde su propia cuenta de Google Workspace.
 * La contraseña es una "contraseña de aplicación" de 16 caracteres,
 * no la contraseña normal de la cuenta.
 */
export function cuentaDe(nivel: Nivel): CuentaCorreo {
  if (nivel === "secundaria") {
    return {
      usuario: process.env.CORREO_SECUNDARIA || "",
      clave: process.env.CLAVE_SECUNDARIA || "",
      nombre: `${COLEGIO} — Secundaria`,
    };
  }
  return {
    usuario: process.env.CORREO_PREPARATORIA || "",
    clave: process.env.CLAVE_PREPARATORIA || "",
    nombre: `${COLEGIO} — Preparatoria`,
  };
}

/** ¿Hay al menos un nivel listo para enviar? */
export function hayCorreo(): boolean {
  return Boolean(
    (process.env.CORREO_SECUNDARIA && process.env.CLAVE_SECUNDARIA) ||
      (process.env.CORREO_PREPARATORIA && process.env.CLAVE_PREPARATORIA)
  );
}

export function correoDe(nivel: Nivel): string {
  return cuentaDe(nivel).usuario ||
    (nivel === "secundaria"
      ? "secundaria@cnhtijuana.edu.mx"
      : "prepa@cnhtijuana.edu.mx");
}

export function copiaOculta(): string[] {
  return (process.env.COPIA_OCULTA || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
