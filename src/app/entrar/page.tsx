import { redirect } from "next/navigation";
import FormaAcceso from "@/components/FormaAcceso";
import { haySupabase, COLEGIO } from "@/lib/config";

export const metadata = { title: "Entrar" };
export const dynamic = "force-dynamic";

export default async function Entrar({
  searchParams,
}: {
  searchParams: Promise<{ destino?: string }>;
}) {
  if (!haySupabase()) redirect("/");
  const { destino } = await searchParams;

  return (
    <div className="acceso">
      <div className="acceso-caja">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="acceso-escudo" src="/escudo-cnh.png" alt={COLEGIO} />
        <h1>Control de asistencia</h1>
        <p className="colegio">{COLEGIO}</p>
        <FormaAcceso destino={destino ?? "/"} />
        <p className="pie-acceso">
          Acceso exclusivo para personal del colegio.
          <br />
          Si no puedes entrar, comunícate con la dirección.
        </p>
      </div>
    </div>
  );
}
