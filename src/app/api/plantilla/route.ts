import { plantillaExcel } from "@/lib/importar";

export const runtime = "nodejs";

export async function GET() {
  const buffer = await plantillaExcel();
  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="Plantilla alumnos - Asistencia CNH.xlsx"',
    },
  });
}
