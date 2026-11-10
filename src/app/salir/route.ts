import { NextResponse } from "next/server";
import { haySupabase } from "@/lib/config";
import { supabaseServidor } from "@/lib/supabase/servidor";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const destino = new URL("/entrar", req.url);

  if (haySupabase()) {
    const sb = await supabaseServidor();

    // Si la persona sí inició sesión pero su cuenta no está activa, la app
    // la manda aquí. Se le avisa por qué, en vez de regresarla en silencio.
    const { data: { user } } = await sb.auth.getUser();
    if (user) {
      const { data } = await sb
        .from("perfiles").select("activo").eq("id", user.id).maybeSingle();
      if (!data || !data.activo) destino.searchParams.set("aviso", "suspendida");
    }

    await sb.auth.signOut();
  }
  return NextResponse.redirect(destino);
}
