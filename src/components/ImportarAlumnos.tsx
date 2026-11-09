"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Fila {
  hoja: string;
  renglon: number;
  grupo_texto: string | null;
  grupo_id: string | null;
  grupo_nombre: string | null;
  matricula: string | null;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  correos: string[];
  problemas: string[];
}

interface Hoja {
  nombre: string;
  grupo_nombre: string | null;
  conEncabezados: boolean;
  alumnos: number;
  problema: string | null;
}

interface Previo {
  ok: boolean;
  filas: Fila[];
  hojas: Hoja[];
  validas: number;
  conProblemas: number;
  total: number;
  truncado: boolean;
  mensaje?: string;
}

interface Aplicado {
  ok: boolean;
  insertados?: number;
  actualizados?: number;
  correos?: number;
  sinCorreo?: number;
  omitidos?: number;
  errores?: string[];
  mensaje?: string;
  modoDemo?: boolean;
}

export default function ImportarAlumnos() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previo, setPrevio] = useState<Previo | null>(null);
  const [aplicado, setAplicado] = useState<Aplicado | null>(null);
  const [cargando, setCargando] = useState(false);
  const [nombreArchivo, setNombreArchivo] = useState("");

  async function mandar(modo: "previo" | "aplicar") {
    const archivo = inputRef.current?.files?.[0];
    if (!archivo) return;
    setCargando(true);
    if (modo === "aplicar") setAplicado(null);

    const fd = new FormData();
    fd.append("archivo", archivo);
    fd.append("modo", modo);

    try {
      const res = await fetch("/api/importar", { method: "POST", body: fd });
      const datos = await res.json();
      if (modo === "previo") setPrevio(datos);
      else {
        setAplicado(datos);
        if (datos.ok) { setPrevio(null); router.refresh(); }
      }
    } catch {
      const err = { ok: false, mensaje: "No se pudo subir el archivo. Revisa tu internet." };
      if (modo === "previo") {
        setPrevio({ ...err, filas: [], hojas: [], validas: 0, conProblemas: 0, total: 0, truncado: false });
      } else setAplicado(err);
    } finally {
      setCargando(false);
    }
  }

  function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    setAplicado(null);
    setPrevio(null);
    setNombreArchivo(e.target.files?.[0]?.name ?? "");
    if (e.target.files?.[0]) mandar("previo");
  }

  const hojasMalas = previo?.hojas.filter((h) => h.problema) ?? [];

  return (
    <>
      <div className="tarjeta">
        <h2>Cargar alumnos desde Excel</h2>
        <p className="sub">
          Funciona con el formato del colegio: <strong>una hoja por grupo</strong>,
          el nombre del alumno en una columna y el correo del tutor en otra.
          No hacen falta encabezados.
        </p>

        <div className="aviso-caja ok" style={{ marginBottom: 18 }}>
          Los nombres de las hojas se interpretan solos: <code>SEC 1A</code>,{" "}
          <code>PREPA 1RO</code>, <code>PREPA 5TO</code>. También acepta un solo
          listado con columna de grupo —{" "}
          <a href="/api/plantilla" download>ver ejemplo</a>.
        </div>

        <div className="campo">
          <label className="etiqueta" htmlFor="archivo">Archivo de Excel (.xlsx)</label>
          <input
            ref={inputRef} id="archivo" className="control" type="file"
            accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={elegir}
          />
          <p className="pista">
            Si un alumno ya existe (misma matrícula, o mismo nombre y grupo) se
            actualiza en lugar de duplicarse. Los correos del tutor se
            reemplazan por los del archivo.
          </p>
        </div>

        {cargando && !previo && <p className="pista">Leyendo el archivo…</p>}
      </div>

      {previo && !previo.ok && (
        <div className="aviso-caja error">{previo.mensaje ?? "No se pudo leer el archivo."}</div>
      )}

      {previo?.ok && (
        <>
          <div className="tarjeta">
            <h2>Hojas encontradas</h2>
            <p className="sub">{nombreArchivo}</p>

            <div className="resumen" style={{ marginBottom: 16 }}>
              <span className="chip verde"><i className="punto" />{previo.validas} alumnos listos</span>
              {previo.conProblemas > 0 && (
                <span className="chip rojo"><i className="punto" />{previo.conProblemas} con observaciones</span>
              )}
              <span className="chip gris"><i className="punto" />{previo.hojas.length} hojas</span>
            </div>

            {hojasMalas.length > 0 && (
              <div className="aviso-caja alerta">
                <strong>Revisa estas hojas:</strong>
                <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                  {hojasMalas.map((h) => (
                    <li key={h.nombre}>{h.nombre} — {h.problema}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="tabla-marco">
              <div className="tabla-scroll">
                <table className="tabla">
                  <thead>
                    <tr><th>Hoja del Excel</th><th>Grupo detectado</th><th>Alumnos</th></tr>
                  </thead>
                  <tbody>
                    {previo.hojas.map((h) => (
                      <tr key={h.nombre} style={h.problema ? { background: "var(--rojo-100)" } : undefined}>
                        <td><code>{h.nombre}</code></td>
                        <td className="nowrap">
                          {h.grupo_nombre ? (
                            <strong>{h.grupo_nombre}</strong>
                          ) : (
                            <span style={{ color: "var(--rojo-700)" }}>no reconocido</span>
                          )}
                        </td>
                        <td className="nowrap">{h.alumnos}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="tarjeta">
            <h2>Revisión de alumnos</h2>
            <p className="sub">
              {previo.truncado
                ? `Se muestran los primeros ${previo.filas.length} de ${previo.total}; se cargarán todos.`
                : `${previo.total} alumnos en total.`}
            </p>

            <div className="tabla-marco" style={{ marginBottom: 18 }}>
              <div className="tabla-scroll" style={{ maxHeight: 380, overflowY: "auto" }}>
                <table className="tabla">
                  <thead>
                    <tr><th>Alumno</th><th>Grupo</th><th>Correo del tutor</th><th>Observaciones</th></tr>
                  </thead>
                  <tbody>
                    {previo.filas.map((f, i) => (
                      <tr key={`${f.hoja}-${f.renglon}-${i}`}
                          style={!f.grupo_id ? { background: "var(--rojo-100)" } : undefined}>
                        <td>
                          {[f.apellido_paterno, f.apellido_materno, f.nombre].filter(Boolean).join(" ") || "—"}
                        </td>
                        <td className="nowrap">
                          {f.grupo_nombre ?? (
                            <span style={{ color: "var(--rojo-700)" }}>{f.grupo_texto}</span>
                          )}
                        </td>
                        <td style={{ fontSize: 12.5 }}>
                          {f.correos.length ? f.correos.join(", ") : (
                            <span style={{ color: "var(--rojo-700)" }}>—</span>
                          )}
                        </td>
                        <td style={{ fontSize: 12.5, color: "var(--gris-700)" }}>
                          {f.problemas.join("; ") || "✓"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <button
              className="btn btn-principal btn-ancho"
              disabled={cargando || previo.validas === 0}
              onClick={() => mandar("aplicar")}
            >
              {cargando ? "Guardando…" : `Cargar ${previo.validas} alumnos`}
            </button>
          </div>
        </>
      )}

      {aplicado && (
        <div className={`aviso-caja ${aplicado.ok ? "ok" : "error"}`}>
          {aplicado.mensaje ? (
            aplicado.mensaje
          ) : (
            <>
              <strong>Listo.</strong> {aplicado.insertados} alumnos nuevos,{" "}
              {aplicado.actualizados} actualizados, {aplicado.correos} correos de tutor
              {aplicado.sinCorreo ? `, ${aplicado.sinCorreo} sin correo` : ""}.
              {aplicado.errores && aplicado.errores.length > 0 && (
                <ul style={{ margin: "10px 0 0", paddingLeft: 18 }}>
                  {aplicado.errores.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
