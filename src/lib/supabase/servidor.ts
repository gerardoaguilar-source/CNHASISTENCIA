import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/** Cliente ligado a la sesión del usuario (respeta RLS). */
export async function supabaseServidor() {
  const almacen = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => almacen.getAll(),
        setAll: (lista: { name: string; value: string; options?: CookieOptions }[]) => {
          try {
            lista.forEach(({ name, value, options }) =>
              almacen.set(name, value, options)
            );
          } catch {
            // Server Component: el middleware ya refresca la sesión.
          }
        },
      },
    }
  );
}

/**
 * Cliente con llave de servicio — se salta RLS.
 * Solo para rutas de servidor: envío de correos e importación masiva.
 */
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
