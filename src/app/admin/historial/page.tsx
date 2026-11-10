import Link from "next/link";
import { redirect } from "next/navigation";
import Encabezado from "@/components/Encabezado";
import { historialAusencias, perfilActual } from "@/lib/datos";
import { fechaNumerica, hoy, sumarDias } from "@/lib/fechas";

export const metadata = { title: "Historial" };
export const dynamic = "force-dynamic";

const ETIQUETA: Record<string, string> = {
  ausente: "Falta",
  justificado: "Con permiso",
  retardo: "Retardo",
};

export default async function Historial({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}) {
  const perfil = await perfilActual();
  if (!perfil) redirect("/salir");

  const { desde: d, hasta: h } = await searchParams;
  const valida = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null);
  const hasta = valida(h) ?? hoy();
  const desde = valida(d) ?? sumarDias(hasta, -29);

  const filas = await historialAusencias(desde, hasta);
  const avisados = filas.filter((f) => f.notificado).length;

  return (
    <>
      <Encabezado />
      <main className="hoja">
        <nav className="migas">
          <Link href="/">Inicio</Link>
          <span className="sep">›</span>
          <Link href="/admin">Administración</Link>
          <span className="sep">›</span>
          <span>Historial</span>
        </nav>

        <h1 className="titulo">Historial de faltas</h1>
        <p className="entrada">
          Del {fechaNumerica(desde)} al {fechaNumerica(hasta)}.
        </p>

        <form className="tarjeta" method="get">
          <div className="fila-campos">
            <div className="campo" style={{ marginBottom: 0 }}>
              <label className="etiqueta" htmlFor="desde">Desde</label>
              <input id="desde" name="desde" type="date" className="control" defaultValue={desde} />
            </div>
            <div className="campo" style={{ marginBottom: 0 }}>
              <label className="etiqueta" htmlFor="hasta">Hasta</label>
              <input id="hasta" name="hasta" type="date" className="control" defaultValue={hasta} />
            </div>
          </div>
          <button className="btn btn-principal btn-ancho" style={{ marginTop: 14 }}>
            Ver periodo
          </button>
        </form>

        <div className="resumen">
          <span className="chip rojo"><i className="punto" />{filas.length} registros</span>
          <span className="chip verde"><i className="punto" />{avisados} con aviso enviado</span>
        </div>

        {filas.length === 0 ? (
          <div className="tarjeta">
            <div className="vacio">No hay faltas registradas en este periodo.</div>
          </div>
        ) : (
          <div className="tabla-marco">
            <div className="tabla-scroll">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Fecha</th><th>Alumno</th><th>Grupo</th>
                    <th>Estatus</th><th>Aviso a padres</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f, i) => (
                    <tr key={`${f.fecha}-${f.alumno}-${i}`}>
                      <td className="nowrap">{fechaNumerica(f.fecha)}</td>
                      <td>{f.alumno}</td>
                      <td className="nowrap">{f.grupo}</td>
                      <td className="nowrap">{ETIQUETA[f.estatus] ?? f.estatus}</td>
                      <td style={{ fontSize: 12.5 }}>
                        {f.notificado ? (
                          <>
                            <span style={{ color: "var(--verde-700)", fontWeight: 600 }}>✓ enviado</span>
                            {f.correos.length > 0 && (
                              <div style={{ color: "var(--gris-500)" }}>{f.correos.join(", ")}</div>
                            )}
                          </>
                        ) : (
                          <span style={{ color: "var(--gris-500)" }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
