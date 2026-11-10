import Link from "next/link";
import { redirect } from "next/navigation";
import { COLEGIO } from "@/lib/config";
import { perfilActual } from "@/lib/datos";

export default async function Encabezado({ admin = true }: { admin?: boolean }) {
  const perfil = await perfilActual();
  // Sin perfil activo (cuenta suspendida o borrada): cerrar la sesión.
  if (!perfil) redirect("/salir");
  const esAdmin = perfil.rol === "admin";

  return (
    <header className="barra">
      <div className="barra-interna">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="barra-escudo" src="/escudo-cnh.png" alt="" />
        <Link href="/" style={{ color: "#fff", textDecoration: "none" }}>
          <div className="barra-titulo">Asistencia</div>
          <div className="barra-sub">{COLEGIO}</div>
        </Link>
        <div className="barra-crece" />
        {admin && esAdmin && (
          <Link className="barra-vinculo" href="/admin">
            Administración
          </Link>
        )}
        <Link className="barra-vinculo" href="/salir" prefetch={false}>
          Salir
        </Link>
      </div>
      <div className="franja" aria-hidden="true">
        <i /><i /><i />
      </div>
    </header>
  );
}
