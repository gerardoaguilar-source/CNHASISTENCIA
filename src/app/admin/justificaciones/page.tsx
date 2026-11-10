import Link from "next/link";
import { redirect } from "next/navigation";
import Encabezado from "@/components/Encabezado";
import FormaJustificacion from "@/components/FormaJustificacion";
import BotonCancelar from "@/components/BotonCancelar";
import { listarJustificaciones, perfilActual } from "@/lib/datos";
import { fechaNumerica, hoy, diasEntre } from "@/lib/fechas";

export const metadata = { title: "Permisos" };
export const dynamic = "force-dynamic";

export default async function Justificaciones({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string }>;
}) {
  const perfil = await perfilActual();
  if (!perfil) redirect("/salir");

  const { ver } = await searchParams;
  const soloVigentes = ver !== "todos";
  const h = hoy();
  const lista = await listarJustificaciones(soloVigentes, h);

  return (
    <>
      <Encabezado />
      <main className="hoja">
        <nav className="migas">
          <Link href="/">Inicio</Link>
          <span className="sep">›</span>
          <Link href="/admin">Administración</Link>
          <span className="sep">›</span>
          <span>Permisos</span>
        </nav>

        <h1 className="titulo">Permisos y justificaciones</h1>
        <p className="entrada">
          Cuando un padre avisa que su hijo faltará —un día, una semana, un mes—
          se registra aquí. Mientras dure el permiso, el alumno aparece en gris
          en la lista, no se puede marcar y <strong>no se le manda correo</strong>.
        </p>

        <FormaJustificacion hoyISO={h} />

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "26px 0 12px" }}>
          <h2 style={{ fontSize: 16, fontWeight: 660, margin: 0, flex: 1 }}>
            {soloVigentes ? "Vigentes hoy" : "Todos los permisos"}
          </h2>
          <Link
            className="btn btn-neutro btn-chico"
            href={soloVigentes ? "/admin/justificaciones?ver=todos" : "/admin/justificaciones"}
          >
            {soloVigentes ? "Ver todos" : "Ver solo vigentes"}
          </Link>
        </div>

        {lista.length === 0 ? (
          <div className="tarjeta">
            <div className="vacio">
              {soloVigentes
                ? "Ningún alumno tiene permiso vigente hoy."
                : "Todavía no se ha registrado ningún permiso."}
            </div>
          </div>
        ) : (
          <div className="tabla-marco">
            <div className="tabla-scroll">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Alumno</th>
                    <th>Grupo</th>
                    <th>Periodo</th>
                    <th>Motivo</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((j) => {
                    const vigente = h >= j.fecha_inicio && h <= j.fecha_fin;
                    const futuro = j.fecha_inicio > h;
                    return (
                      <tr key={j.id}>
                        <td>
                          <strong>{j.alumno_nombre}</strong>
                          <div style={{ fontSize: 12, color: "var(--gris-500)", marginTop: 2 }}>
                            {vigente ? "🔒 bloqueado hoy" : futuro ? "⏳ próximo" : "✔ concluido"}
                          </div>
                        </td>
                        <td className="nowrap">{j.grupo_nombre}</td>
                        <td className="nowrap">
                          {fechaNumerica(j.fecha_inicio)} — {fechaNumerica(j.fecha_fin)}
                          <div style={{ fontSize: 12, color: "var(--gris-500)", marginTop: 2 }}>
                            {diasEntre(j.fecha_inicio, j.fecha_fin)} días
                          </div>
                        </td>
                        <td>{j.motivo || <span style={{ color: "var(--gris-300)" }}>—</span>}</td>
                        <td className="nowrap">
                          <BotonCancelar id={j.id} alumno={j.alumno_nombre} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
