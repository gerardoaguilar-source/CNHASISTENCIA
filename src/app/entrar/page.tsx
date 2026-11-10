import { redirect } from "next/navigation";
import FormaAcceso from "@/components/FormaAcceso";
import { haySupabase, COLEGIO } from "@/lib/config";

export const metadata = { title: "Entrar" };
export const dynamic = "force-dynamic";

export default async function Entrar({
  searchParams,
}: {
  searchParams: Promise<{ destino?: string; aviso?: string }>;
}) {
  if (!haySupabase()) redirect("/");
  const { destino, aviso } = await searchParams;

  return (
    <div className="acceso">
      <div className="acceso-caja">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="acceso-escudo" src="/escudo-cnh.png" alt={COLEGIO} />
        <h1>Control de asistencia</h1>
        <p className="colegio">{COLEGIO}</p>
        {aviso === "suspendida" && (
          <div className="aviso-caja alerta" role="alert" style={{ textAlign: "left" }}>
            <strong>Tu cuenta está suspendida.</strong> El correo y la
            contraseña son correctos, pero la cuenta no tiene acceso.
            Comunícate con la dirección para que la reactiven.
          </div>
        )}
        <FormaAcceso destino={destino && !destino.startsWith("/salir") ? destino : "/"} />
        <p className="pie-acceso">
          Acceso exclusivo para personal del colegio.
          <br />
          Si no puedes entrar, comunícate con la dirección.
        </p>
      </div>
    </div>
  );
}
