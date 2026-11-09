import { NextResponse } from "next/server";
import { perfilActual } from "@/lib/datos";
import { correoDe } from "@/lib/config";
import { probarCuenta, enviarCorreo } from "@/lib/correo/enviar";
import { asuntoAviso, htmlAviso, textoAviso } from "@/lib/correo/plantilla";
import type { Nivel } from "@/lib/tipos";
import { hoy } from "@/lib/fechas";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const perfil = await perfilActual();
  if (!perfil || perfil.rol !== "admin") {
    return NextResponse.json({ ok: false, error: "No tienes permiso para esto." }, { status: 403 });
  }

  const { nivel, destino } = (await req.json()) as { nivel: Nivel; destino?: string };
  if (nivel !== "secundaria" && nivel !== "preparatoria") {
    return NextResponse.json({ ok: false, error: "Nivel no válido." }, { status: 400 });
  }

  // Sin destino: solo verifica usuario y contraseña, no manda nada.
  if (!destino) {
    const r = await probarCuenta(nivel);
    return NextResponse.json({ ...r, cuenta: correoDe(nivel) });
  }

  // Con destino: manda un aviso de ejemplo a esa dirección.
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(destino)) {
    return NextResponse.json({ ok: false, error: "La dirección de prueba no es válida." }, { status: 400 });
  }

  const datos = {
    alumno: "Alumno De Prueba Ejemplo",
    grupo: nivel === "secundaria" ? "1° A" : "1er Semestre",
    nivel,
    fecha: hoy(),
    urlEscudo: `${new URL(req.url).origin}/escudo-cnh.png`,
  };

  const r = await enviarCorreo({
    nivel,
    para: [destino],
    asunto: `[PRUEBA] ${asuntoAviso(datos)}`,
    html: htmlAviso(datos),
    texto: textoAviso(datos),
  });

  return NextResponse.json({ ...r, cuenta: correoDe(nivel), destino });
}
