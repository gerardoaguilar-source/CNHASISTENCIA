import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type GalletasAEscribir = { name: string; value: string; options?: CookieOptions }[];

const PUBLICAS = ["/entrar", "/auth"];

export async function middleware(req: NextRequest) {
  // Modo demo: sin Supabase no hay sesión que revisar.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.next();
  }

  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (lista: GalletasAEscribir) => {
          lista.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          lista.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ruta = req.nextUrl.pathname;
  const esPublica = PUBLICAS.some((p) => ruta.startsWith(p));

  if (!user && !esPublica) {
    const url = req.nextUrl.clone();
    url.pathname = "/entrar";
    url.searchParams.set("destino", ruta);
    return NextResponse.redirect(url);
  }

  if (user && ruta === "/entrar") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:png|jpg|jpeg|svg|ico|webmanifest)$).*)",
  ],
};
