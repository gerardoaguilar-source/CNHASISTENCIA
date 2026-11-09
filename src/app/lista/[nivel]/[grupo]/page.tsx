import Link from "next/link";
import { notFound } from "next/navigation";
import Encabezado from "@/components/Encabezado";
import PaseDeLista from "@/components/PaseDeLista";
import { grupoPorClave, obtenerLista } from "@/lib/datos";
import { haySupabase, correoDe } from "@/lib/config";
import { etiquetaNivel, type Nivel } from "@/lib/tipos";
import { fechaLarga, hoy } from "@/lib/fechas";

export const dynamic = "force-dynamic";

export default async function Lista({
  params,
  searchParams,
}: {
  params: Promise<{ nivel: string; grupo: string }>;
  searchParams: Promise<{ fecha?: string }>;
}) {
  const { nivel, grupo } = await params;
  const { fecha: fechaParam } = await searchParams;
  if (nivel !== "secundaria" && nivel !== "preparatoria") notFound();
  const n = nivel as Nivel;

  const g = await grupoPorClave(n, decodeURIComponent(grupo));
  if (!g) notFound();

  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(fechaParam ?? "") ? fechaParam! : hoy();
  const renglones = await obtenerLista(g.id, fecha);

  return (
    <>
      <Encabezado />
      <main className="hoja">
        <nav className="migas">
          <Link href="/">Inicio</Link>
          <span className="sep">›</span>
          <Link href={`/lista/${n}`}>{etiquetaNivel(n)}</Link>
          <span className="sep">›</span>
          <span>{g.nombre}</span>
        </nav>

        <div className="fecha-hoy">📅 {fechaLarga(fecha)}</div>

        <h1 className="titulo">{g.nombre}</h1>
        <p className="entrada">
          Toca el nombre de cada alumno que <strong>no asistió</strong>. Los que
          tienen permiso aparecen en gris y no se pueden marcar.
        </p>

        <PaseDeLista
          grupoId={g.id}
          grupoNombre={g.nombre}
          nivel={n}
          fecha={fecha}
          renglones={renglones}
          modoDemo={!haySupabase()}
          remitente={correoDe(n)}
        />
      </main>
    </>
  );
}
