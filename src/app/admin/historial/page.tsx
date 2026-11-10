import Link from "next/link";
import { redirect } from "next/navigation";
import Encabezado from "@/components/Encabezado";
import { historialAusencias, perfilActual } from "@/lib/datos";
import { fechaNumerica, hoy, sumarDias } from "@/lib/fechas";
import { NIVELES, type Nivel } from "@/lib/tipos";

export const metadata = { title: "Historial" };
export const dynamic = "force-dynamic";

const ETIQUETA: Record<string, string> = {
  ausente: "Falta",
  justificado: "Con permiso",
  retardo: "Retardo",
};

type Fila = Awaited<ReturnType<typeof historialAusencias>>[number];

/** Resumen y tabla de un solo nivel. */
function SeccionNivel({ titulo, filas }: { titulo: string; filas: Fila[] }) {
  const faltas = filas.filter((f) => f.estatus === "ausente").length;
  const permisos = filas.filter((f) => f.estatus === "justificado").length;
  const retardos = filas.filter((f) => f.estatus === "retardo").length;
  const avisados = filas.filter((f) => f.notificado).length;
  const alumnos = new Set(
    filas.filter((f) => f.estatus === "ausente").map((f) => `${f.grupo}|${f.alumno}`)
  ).size;

  return (
    <section style={{ marginBottom: 30 }}>
      <h2 style={{ fontSize: 18, fontWeight: 680, margin: "0 0 10px" }}>{titulo}</h2>

      <div className="resumen">
        <span className="chip rojo">
          <i className="punto" />{faltas} {faltas === 1 ? "falta" : "faltas"}
        </span>
        <span className="chip gris">
          <i className="punto" />{alumnos} {alumnos === 1 ? "alumno con falta" : "alumnos con falta"}
        </span>
        <span className="chip verde">
          <i className="punto" />{avisados} con aviso enviado
        </span>
        {permisos > 0 && (
          <span className="chip gris"><i className="punto" />{permisos} con permiso</span>
        )}
        {retardos > 0 && (
          <span className="chip gris">
            <i className="punto" />{retardos} {retardos === 1 ? "retardo" : "retardos"}
          </span>
        )}
      </div>

      {filas.length === 0 ? (
        <div className="tarjeta">
          <div className="vacio">No hay faltas registradas en {titulo} en este periodo.</div>
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
    </section>
  );
}

export default async function Historial({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string; nivel?: string }>;
}) {
  const perfil = await perfilActual();
  if (!perfil) redirect("/salir");

  const { desde: d, hasta: h, nivel: n } = await searchParams;
  const valida = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null);
  const hasta = valida(h) ?? hoy();
  const desde = valida(d) ?? sumarDias(hasta, -29);
  const soloNivel: Nivel | null =
    n === "secundaria" || n === "preparatoria" ? n : null;

  const filas = await historialAusencias(desde, hasta);
  const visibles = NIVELES.filter((x) => !soloNivel || x.valor === soloNivel);

  const vinculo = (nivel: Nivel | null) =>
    `/admin/historial?desde=${desde}&hasta=${hasta}${nivel ? `&nivel=${nivel}` : ""}`;

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
          Del {fechaNumerica(desde)} al {fechaNumerica(hasta)}. Secundaria y
          Preparatoria se muestran por separado, cada una con sus propios datos.
        </p>

        <form className="tarjeta" method="get">
          {soloNivel && <input type="hidden" name="nivel" value={soloNivel} />}
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

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
          <Link
            className={`btn btn-chico ${soloNivel === null ? "btn-principal" : "btn-neutro"}`}
            href={vinculo(null)}
          >
            Ambos niveles
          </Link>
          {NIVELES.map((x) => (
            <Link
              key={x.valor}
              className={`btn btn-chico ${soloNivel === x.valor ? "btn-principal" : "btn-neutro"}`}
              href={vinculo(x.valor)}
            >
              Solo {x.nombre}
            </Link>
          ))}
        </div>

        {visibles.map((x) => (
          <SeccionNivel
            key={x.valor}
            titulo={x.nombre}
            filas={filas.filter((f) => f.nivel === x.valor)}
          />
        ))}
      </main>
    </>
  );
}
