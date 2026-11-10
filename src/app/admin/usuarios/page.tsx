import Link from "next/link";
import { redirect } from "next/navigation";
import Encabezado from "@/components/Encabezado";
import FormaUsuario from "@/components/FormaUsuario";
import AccionesUsuario from "@/components/AccionesUsuario";
import { perfilActual } from "@/lib/datos";
import { haySupabase, hayLlaveServicio } from "@/lib/config";
import { cupoCuentas, listarUsuarios } from "@/lib/usuarios";
import type { Perfil } from "@/lib/tipos";

export const metadata = { title: "Usuarios" };
export const dynamic = "force-dynamic";

export default async function Usuarios() {
  const perfil = await perfilActual();
  if (!perfil) redirect("/salir");
  if (perfil.rol !== "admin") redirect("/");

  const demo = !haySupabase();
  const sinLlave = !demo && !hayLlaveServicio();

  let usuarios: Perfil[] = [perfil];
  let cupo = await cupoCuentas();
  if (!demo && !sinLlave) {
    usuarios = await listarUsuarios();
  } else {
    cupo = { ...cupo, usadas: 1, libres: cupo.limite - 1 };
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
          Quién puede entrar a pasar lista y quién puede administrar. Las
          cuentas solo se crean aquí; nadie puede registrarse por su cuenta.
        </p>

        <div className={`aviso-caja ${cupo.lleno ? "alerta" : "ok"}`}>
          <strong>
            {cupo.usadas} de {cupo.limite} cuentas ocupadas.
          </strong>{" "}
          {cupo.lleno
            ? "Ya no quedan lugares."
            : cupo.libres === 1
              ? "Queda 1 lugar."
              : `Quedan ${cupo.libres} lugares.`}{" "}
          Las cuentas suspendidas también ocupan lugar.
        </div>

        {demo && (
          <div className="aviso-caja alerta">
            <strong>Modo demostración.</strong> Aquí se ve cómo funciona, pero
            las cuentas no se guardan hasta conectar Supabase.
          </div>
        )}
        {sinLlave && (
          <div className="aviso-caja error">
            <strong>Falta la llave de servicio.</strong> En Vercel → Settings →
            Environment Variables hay que cargar{" "}
            <code>SUPABASE_SERVICE_ROLE_KEY</code> y volver a publicar. Sin
            ella no se pueden crear ni modificar cuentas.
          </div>
        )}

        <div className="tarjeta">
          <h2>Dar de alta a alguien</h2>
          <p className="sub">
            El <em>coordinador</em> (prefecto) pasa lista y registra permisos.
            El <em>administrador</em> además carga alumnos y da de alta cuentas.
          </p>
          <FormaUsuario lleno={cupo.lleno} limite={cupo.limite} />
        </div>

        <div className="tabla-marco">
          <div className="tabla-scroll">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Nombre</th><th>Correo</th><th>Acceso</th><th>Estado</th><th>Cambios</th>
                </tr>
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
                    <td>
                      {u.id === perfil.id ? (
                        <span style={{ fontSize: 12, color: "var(--gris-500)" }}>Tu cuenta</span>
                      ) : (
                        <AccionesUsuario id={u.id} nombre={u.nombre} rol={u.rol} activo={u.activo} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
