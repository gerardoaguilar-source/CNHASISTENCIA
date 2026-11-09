import { NextResponse } from "next/server";
import { haySupabase } from "@/lib/config";
import { supabaseServidor } from "@/lib/supabase/servidor";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (haySupabase()) {
    const sb = await supabaseServidor();
    await sb.auth.signOut();
  }
  return NextResponse.redirect(new URL("/entrar", req.url));
}
