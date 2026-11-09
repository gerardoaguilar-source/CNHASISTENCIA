import Link from "next/link";
import { redirect } from "next/navigation";
import Encabezado from "@/components/Encabezado";
import { perfilActual } from "@/lib/datos";
import { haySupabase } from "@/lib/config";
import { supabaseServidor } from "@/lib/supabase/servidor";
import type { Perfil } from "@/lib/tipos";

export const metadata = { title: "Usuarios" };
export const dynamic = "force-dynamic";

export default async function Usuarios() {
  const perfil = await perfilActual();
  if (!perfil) redirect("/entrar");
  if (perfil.rol !== "admin") redirect("/");

  let usuarios: Perfil[] = [];
  if (haySupabase()) {
    const sb = await supabaseServidor();
    const { data } = await sb.from("perfiles").select("*").order("nombre");
    usuarios = (data ?? []) as Perfil[];
  } else {
    usuarios = [perfil];
  }

  return (
    <>
      <Encabezado />
      <main className="hoja">
        <nav className="migas">
          <Link href="/">Inicio</Link>
          <span className="sep">›</span>
          <Link href="/admin">Administración</Link>
          <span className="sep">›</span>
          <span>Usuarios</span>
        </nav>

        <h1 className="titulo">Usuarios del sistema</h1>
        <p className="entrada">
          Quién puede entrar a pasar lista y quién puede administrar.
        </p>

        <div className="aviso-caja ok">
          <strong>Dos tipos de acceso.</strong> El <em>coordinador</em> pasa
          lista y registra permisos. El <em>administrador</em> además carga
          alumnos y da de alta usuarios.
        </div>

        <div className="tabla-marco" style={{ marginBottom: 18 }}>
          <div className="tabla-scroll">
            <table className="tabla">
              <thead>
                <tr><th>Nombre</th><th>Correo</th><th>Acceso</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id}>
                    <td><strong>{u.nombre}</strong></td>
                    <td>{u.email}</td>
                    <td className="nowrap">
                      {u.rol === "admin" ? "Administrador" : "Coordinador"}
                    </td>
                    <td className="nowrap">
                      {u.activo ? (
                        <span style={{ color: "var(--verde-700)", fontWeight: 600 }}>Activo</span>
                      ) : (
                        <span style={{ color: "var(--gris-500)" }}>Suspendido</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="tarjeta">
          <h2>Dar de alta a alguien</h2>
          <p className="sub">Se hace desde el panel de Supabase, una sola vez por persona.</p>
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.75, color: "var(--gris-700)" }}>
            <li>Entrar a <strong>supabase.com</strong> → el proyecto del colegio.</li>
            <li>Menú <strong>Authentication → Users → Add user</strong>.</li>
            <li>Poner el correo y una contraseña temporal. Marcar <em>Auto Confirm User</em>.</li>
            <li>
              El usuario aparece aquí como <em>Coordinador</em>. Para volverlo
              administrador: <strong>Table Editor → perfiles</strong>, cambiar la
              columna <code>rol</code> a <code>admin</code>.
            </li>
            <li>Para quitarle el acceso sin borrarlo, poner <code>activo</code> en falso.</li>
          </ol>
        </div>
      </main>
    </>
  );
}
