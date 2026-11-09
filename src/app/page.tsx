import Link from "next/link";
import Encabezado from "@/components/Encabezado";
import { obtenerGrupos } from "@/lib/datos";
import { haySupabase, hayCorreo } from "@/lib/config";
import { fechaLarga, hoy, esFinDeSemana } from "@/lib/fechas";

export const dynamic = "force-dynamic";

export default async function Inicio() {
  const fecha = hoy();
  const [sec, prepa] = await Promise.all([
    obtenerGrupos("secundaria"),
    obtenerGrupos("preparatoria"),
  ]);

  return (
    <>
      <Encabezado />
      <main className="hoja">
        {!haySupabase() && (
          <div className="aviso-caja alerta">
            <strong>Modo demostración.</strong> Los alumnos y correos son de
            ejemplo y <strong>no se envía ningún correo real</strong>. Al
            cargar las credenciales de Supabase, la app usa los datos del
            colegio automáticamente.
          </div>
        )}
        {haySupabase() && !hayCorreo() && (
          <div className="aviso-caja alerta">
            <strong>Falta configurar el correo.</strong> Se puede pasar lista y
            se guarda todo, pero los avisos a padres no saldrán hasta cargar las
            contraseñas de aplicación de las cuentas del colegio.
          </div>
        )}

        <div className="fecha-hoy">📅 {fechaLarga(fecha)}</div>

        {esFinDeSemana(fecha) && (
          <div className="aviso-caja alerta">
            Hoy es fin de semana. Se puede pasar lista de todos modos, pero
            revisa la fecha antes de notificar.
          </div>
        )}

        <h1 className="titulo">¿En qué nivel vas a pasar lista?</h1>
        <p className="entrada">
          Elige el nivel y después el grupo. Al terminar de marcar las faltas,
          se avisa a los padres desde la misma pantalla.
        </p>

        <div className="rejilla-niveles">
          <Link className="nivel" href="/lista/secundaria">
            <div className="nivel-flecha">›</div>
            <div className="nivel-nombre">Secundaria</div>
            <div className="nivel-detalle">
              {sec.length} {sec.length === 1 ? "grupo" : "grupos"} · 1°, 2° y 3°
            </div>
          </Link>

          <Link className="nivel prepa" href="/lista/preparatoria">
            <div className="nivel-flecha">›</div>
            <div className="nivel-nombre">Preparatoria</div>
            <div className="nivel-detalle">
              {prepa.length} {prepa.length === 1 ? "semestre" : "semestres"}
            </div>
          </Link>
        </div>
      </main>
    </>
  );
}
