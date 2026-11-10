import { haySupabase, hayLlaveServicio, LIMITE_CUENTAS } from "./config";
import { supabaseAdmin } from "./supabase/servidor";
import type { Perfil } from "./tipos";

export interface CupoCuentas {
  usadas: number;
  limite: number;
  libres: number;
  lleno: boolean;
}

function armarCupo(usadas: number): CupoCuentas {
  const libres = Math.max(0, LIMITE_CUENTAS - usadas);
  return { usadas, limite: LIMITE_CUENTAS, libres, lleno: libres === 0 };
}

/** Todas las cuentas del sistema, activas y suspendidas. */
export async function listarUsuarios(): Promise<Perfil[]> {
  if (!haySupabase() || !hayLlaveServicio()) return [];
  const { data, error } = await supabaseAdmin()
    .from("perfiles")
    .select("id, nombre, email, rol, activo")
    .order("nombre");
  if (error) throw new Error(error.message);
  return (data ?? []) as Perfil[];
}

/**
 * Cuántos lugares se han ocupado. Cada cuenta ocupa un lugar,
 * esté activa o suspendida.
 */
export async function cupoCuentas(): Promise<CupoCuentas> {
  if (!haySupabase() || !hayLlaveServicio()) return armarCupo(0);
  const { count, error } = await supabaseAdmin()
    .from("perfiles")
    .select("id", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return armarCupo(count ?? 0);
}
