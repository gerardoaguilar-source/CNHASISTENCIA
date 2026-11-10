import { historialAusencias, perfilActual } from "@/lib/datos";
import { hoy, sumarDias } from "@/lib/fechas";
import { pdfHistorial } from "@/lib/pdf/historial";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Descarga el historial de faltas en PDF. Siempre trae Secundaria y
 * Preparatoria juntas, en un solo archivo, para el periodo indicado.
 */
export async function GET(req: Request) {
  const perfil = await perfilActual();
  if (!perfil) return new Response("Sesión no válida.", { status: 401 });

  const url = new URL(req.url);
  const valida = (s: string | null) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null);
  const hasta = valida(url.searchParams.get("hasta")) ?? hoy();
  const desde = valida(url.searchParams.get("desde")) ?? sumarDias(hasta, -29);

  const filas = await historialAusencias(desde, hasta);

  // El escudo es un archivo público de la app; si no se puede leer, el PDF
  // sale igual, sin escudo.
  let escudo: Uint8Array | null = null;
  try {
    const r = await fetch(new URL("/escudo-cnh.png", url.origin));
    if (r.ok) escudo = new Uint8Array(await r.arrayBuffer());
  } catch {
    escudo = null;
  }

  const pdf = await pdfHistorial({ filas, desde, hasta, generado: hoy(), escudo });

  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Historial de faltas CNH ${desde} a ${hasta}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
