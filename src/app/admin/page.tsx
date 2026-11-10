import Link from "next/link";
import { redirect } from "next/navigation";
import Encabezado from "@/components/Encabezado";
import ProbarCorreo from "@/components/ProbarCorreo";
import { perfilActual, listarJustificaciones } from "@/lib/datos";
import { correoDe, hayCorreo } from "@/lib/config";
import { hoy } from "@/lib/fechas";

export const metadata = { title: "Administración" };
export const dynamic = "force-dynamic";

export default async function Admin() {
  const perfil = await perfilActual();
  if (!perfil) redirect("/salir");
  if (perfil.rol !== "admin") redirect("/");

  const vigentes = await listarJustificaciones(true, hoy());

  return (
    <>
      <Encabezado />
      <main className="hoja">
        <nav className="migas">
          <Link href="/">Inicio</Link>
          <span className="sep">›</span>
          <span>Administración</span>
        </nav>

        <h1 className="titulo">Administración</h1>
        <p className="entrada">
          Permisos, alta de alumnos y revisión de lo que se ha enviado.
        </p>

        {vigentes.length > 0 && (
          <div className="aviso-caja ok">
            Hay <strong>{vigentes.length}</strong>{" "}
            {vigentes.length === 1 ? "alumno con permiso vigente" : "alumnos con permiso vigente"} el
            día de hoy. Aparecen en gris en las listas.
          </div>
        )}

        <div className="rejilla-admin">
          <Link className="ficha-admin" href="/admin/justificaciones">
            <div className="t">🔒 Permisos y justificaciones</div>
            <div className="d">
              Cuando un papá avisa que su hijo faltará unos días o un mes.
              El alumno queda bloqueado en la lista y no se le manda aviso.
            </div>
          </Link>

          <Link className="ficha-admin" href="/admin/alumnos">
            <div className="t">👥 Alumnos y correos</div>
            <div className="d">
              Cargar la lista desde Excel: nombre, grupo y correo de los papás.
              También sirve para actualizar correos a mitad del ciclo.
            </div>
          </Link>

          <Link className="ficha-admin" href="/admin/historial">
            <div className="t">📋 Historial de faltas</div>
            <div className="d">
              Qué alumnos faltaron, en qué fechas y a qué correos se les avisó.
            </div>
          </Link>

          <Link className="ficha-admin" href="/admin/usuarios">
            <div className="t">🔑 Usuarios del sistema</div>
            <div className="d">
              Quién tiene acceso para pasar lista y quién puede administrar.
            </div>
          </Link>
        </div>

        <div style={{ marginTop: 26 }}>
          {!hayCorreo() && (
            <div className="aviso-caja alerta">
              Todavía no hay contraseñas de correo configuradas. Se puede pasar
              lista y todo queda guardado, pero los avisos no saldrán.
            </div>
          )}
          <ProbarCorreo
            correoSecundaria={correoDe("secundaria")}
            correoPreparatoria={correoDe("preparatoria")}
          />
        </div>
      </main>
    </>
  );
}
