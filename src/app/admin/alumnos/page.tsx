import Link from "next/link";
import { redirect } from "next/navigation";
import Encabezado from "@/components/Encabezado";
import ImportarAlumnos from "@/components/ImportarAlumnos";
import { conteoPorGrupo, obtenerGrupos, perfilActual } from "@/lib/datos";

export const metadata = { title: "Alumnos" };
export const dynamic = "force-dynamic";

export default async function Alumnos() {
  const perfil = await perfilActual();
  if (!perfil) redirect("/salir");
  if (perfil.rol !== "admin") redirect("/");

  const [sec, prepa, cSec, cPrepa] = await Promise.all([
    obtenerGrupos("secundaria"),
    obtenerGrupos("preparatoria"),
    conteoPorGrupo("secundaria"),
    conteoPorGrupo("preparatoria"),
  ]);
  const conteo = { ...cSec, ...cPrepa };
  const total = [...sec, ...prepa].reduce((s, g) => s + (conteo[g.id] ?? 0), 0);

  return (
    <>
      <Encabezado />
      <main className="hoja">
        <nav className="migas">
          <Link href="/">Inicio</Link>
          <span className="sep">›</span>
          <Link href="/admin">Administración</Link>
          <span className="sep">›</span>
          <span>Alumnos</span>
        </nav>

        <h1 className="titulo">Alumnos y correos de tutores</h1>
        <p className="entrada">
          Hay <strong>{total}</strong> alumnos registrados en {sec.length + prepa.length} grupos.
        </p>

        <ImportarAlumnos />

        <div className="tarjeta">
          <h2>Alumnos por grupo</h2>
          <p className="sub">Así quedó la distribución después de la última carga.</p>
          <div className="tabla-marco">
            <div className="tabla-scroll">
              <table className="tabla">
                <thead>
                  <tr><th>Nivel</th><th>Grupo</th><th>Clave en Excel</th><th>Alumnos</th></tr>
                </thead>
                <tbody>
                  {[...sec, ...prepa].map((g) => (
                    <tr key={g.id}>
                      <td className="nowrap" style={{ textTransform: "capitalize" }}>{g.nivel}</td>
                      <td className="nowrap"><strong>{g.nombre}</strong></td>
                      <td className="nowrap"><code>{g.clave}</code></td>
                      <td className="nowrap">
                        {conteo[g.id] ?? 0}
                        {(conteo[g.id] ?? 0) === 0 && (
                          <span style={{ color: "var(--gris-300)" }}> — vacío</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
