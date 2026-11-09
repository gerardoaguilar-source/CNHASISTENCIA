import Link from "next/link";
import { notFound } from "next/navigation";
import Encabezado from "@/components/Encabezado";
import { obtenerGrupos, conteoPorGrupo } from "@/lib/datos";
import { etiquetaNivel, type Nivel } from "@/lib/tipos";
import { fechaLarga, hoy } from "@/lib/fechas";

export const dynamic = "force-dynamic";

export default async function Grupos({
  params,
}: {
  params: Promise<{ nivel: string }>;
}) {
  const { nivel } = await params;
  if (nivel !== "secundaria" && nivel !== "preparatoria") notFound();
  const n = nivel as Nivel;

  const [grupos, conteo] = await Promise.all([obtenerGrupos(n), conteoPorGrupo(n)]);

  return (
    <>
      <Encabezado />
      <main className="hoja">
        <nav className="migas">
          <Link href="/">Inicio</Link>
          <span className="sep">›</span>
          <span>{etiquetaNivel(n)}</span>
        </nav>

        <div className="fecha-hoy">📅 {fechaLarga(hoy())}</div>

        <h1 className="titulo">{etiquetaNivel(n)} — elige el grupo</h1>
        <p className="entrada">
          Toca el grupo donde estás parada para ver su lista de alumnos.
        </p>

        {grupos.length === 0 ? (
          <div className="tarjeta">
            <div className="vacio">
              Todavía no hay grupos activos en {etiquetaNivel(n).toLowerCase()}.
              <br />
              Se dan de alta en Administración → Grupos.
            </div>
          </div>
        ) : (
          <div className="rejilla-grupos">
            {grupos.map((g) => (
              <Link
                key={g.id}
                className="grupo"
                href={`/lista/${n}/${g.clave.toLowerCase()}`}
              >
                <div className="grupo-clave">{g.nombre}</div>
                <div className="grupo-conteo">
                  {conteo[g.id] ?? 0}{" "}
                  {(conteo[g.id] ?? 0) === 1 ? "alumno" : "alumnos"}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
