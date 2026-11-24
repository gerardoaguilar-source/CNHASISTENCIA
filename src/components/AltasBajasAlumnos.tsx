"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  accionAgregarAlumno, accionAlumnosDeGrupo, accionBajaAlumno, accionReactivarAlumno,
  type AlumnoDeGrupo,
} from "@/app/admin/alumnos/acciones";

interface GrupoOpcion {
  id: string;
  nivel: string;
  nombre: string;
}

type Aviso = { ok: boolean; mensaje: string } | null;

export default function AltasBajasAlumnos({ grupos }: { grupos: GrupoOpcion[] }) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();

  const [grupoId, setGrupoId] = useState("");
  const [alumnos, setAlumnos] = useState<AlumnoDeGrupo[]>([]);
  const [cargando, setCargando] = useState(false);
  const [errorLista, setErrorLista] = useState("");

  const [paterno, setPaterno] = useState("");
  const [materno, setMaterno] = useState("");
  const [nombre, setNombre] = useState("");
  const [correos, setCorreos] = useState("");
  const [avisoAlta, setAvisoAlta] = useState<Aviso>(null);
  const [pideConfirmar, setPideConfirmar] = useState(false);

  const [confirmandoBaja, setConfirmandoBaja] = useState<string | null>(null);
  const [avisoLista, setAvisoLista] = useState<Aviso>(null);

  const grupo = grupos.find((g) => g.id === grupoId);
  const sec = grupos.filter((g) => g.nivel === "secundaria");
  const prepa = grupos.filter((g) => g.nivel === "preparatoria");
  const activos = alumnos.filter((a) => a.activo);
  const deBaja = alumnos.filter((a) => !a.activo);

  const cargar = useCallback(async (id: string) => {
    if (!id) { setAlumnos([]); return; }
    setCargando(true);
    setErrorLista("");
    try {
      const r = await accionAlumnosDeGrupo(id);
      if (r.ok) setAlumnos(r.alumnos);
      else { setAlumnos([]); setErrorLista(r.mensaje ?? "No se pudo leer la lista."); }
    } catch {
      setAlumnos([]);
      setErrorLista("No se pudo leer la lista. Revisa tu internet.");
    } finally {
      setCargando(false);
    }
  }, []);

  function elegirGrupo(id: string) {
    setGrupoId(id);
    setAvisoAlta(null);
    setAvisoLista(null);
    setPideConfirmar(false);
    setConfirmandoBaja(null);
    setAlumnos([]);
    cargar(id);
  }

  function agregar(aceptarRepetido: boolean) {
    setAvisoAlta(null);
    startTransition(async () => {
      const r = await accionAgregarAlumno({
        grupo_id: grupoId,
        apellido_paterno: paterno,
        apellido_materno: materno,
        nombre,
        correos,
        aceptarRepetido,
      });
      setAvisoAlta({ ok: r.ok, mensaje: r.mensaje });
      setPideConfirmar(Boolean(r.confirmar));
      if (r.ok) {
        setPaterno(""); setMaterno(""); setNombre(""); setCorreos("");
        await cargar(grupoId);
        router.refresh();
      }
    });
  }

  function cambiar(tarea: () => Promise<{ ok: boolean; mensaje: string }>) {
    setAvisoLista(null);
    startTransition(async () => {
      const r = await tarea();
      setAvisoLista(r);
      setConfirmandoBaja(null);
      if (r.ok) {
        await cargar(grupoId);
        router.refresh();
      }
    });
  }

  return (
    <div className="tarjeta">
      <h2>Altas y bajas a mano</h2>
      <p className="sub">
        Para cuando entra o se va un alumno a mitad del ciclo, sin tener que
        volver a subir el Excel. Elige el grupo y ahí mismo agregas o das de baja.
      </p>

      <div className="campo">
        <label className="etiqueta" htmlFor="ab-grupo">Grupo</label>
        <select
          id="ab-grupo" className="control" value={grupoId}
          onChange={(e) => elegirGrupo(e.target.value)}
        >
          <option value="">— Elige un grupo —</option>
          {sec.length > 0 && (
            <optgroup label="Secundaria">
              {sec.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
            </optgroup>
          )}
          {prepa.length > 0 && (
            <optgroup label="Preparatoria">
              {prepa.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
            </optgroup>
          )}
        </select>
      </div>

      {grupo && (
        <>
          {/* ---------------------------- ALTA ---------------------------- */}
          <h3 style={{ fontSize: 14.5, fontWeight: 660, margin: "22px 0 10px" }}>
            Agregar un alumno a {grupo.nombre}
          </h3>

          <form onSubmit={(e) => { e.preventDefault(); agregar(false); }}>
            <div className="fila-campos">
              <div className="campo">
                <label className="etiqueta" htmlFor="ab-paterno">Apellido paterno</label>
                <input
                  id="ab-paterno" className="control" required value={paterno}
                  autoComplete="off"
                  onChange={(e) => { setPaterno(e.target.value); setPideConfirmar(false); }}
                />
              </div>
              <div className="campo">
                <label className="etiqueta" htmlFor="ab-materno">Apellido materno</label>
                <input
                  id="ab-materno" className="control" value={materno}
                  autoComplete="off"
                  onChange={(e) => { setMaterno(e.target.value); setPideConfirmar(false); }}
                />
              </div>
            </div>

            <div className="fila-campos">
              <div className="campo">
                <label className="etiqueta" htmlFor="ab-nombre">Nombre(s)</label>
                <input
                  id="ab-nombre" className="control" required value={nombre}
                  autoComplete="off"
                  onChange={(e) => { setNombre(e.target.value); setPideConfirmar(false); }}
                />
              </div>
              <div className="campo">
                <label className="etiqueta" htmlFor="ab-correos">Correo del tutor</label>
                <input
                  id="ab-correos" className="control" value={correos}
                  autoComplete="off" inputMode="email"
                  placeholder="mama@ejemplo.com, papa@ejemplo.com"
                  onChange={(e) => setCorreos(e.target.value)}
                />
                <div className="pista">
                  Si son varios, sepáralos con coma. A estos correos llega el
                  aviso cuando el alumno falta.
                </div>
              </div>
            </div>

            {avisoAlta && (
              <div
                className={`aviso-caja ${avisoAlta.ok ? "ok" : pideConfirmar ? "alerta" : "error"}`}
                role="status"
              >
                {avisoAlta.mensaje}
              </div>
            )}

            <span style={{ display: "inline-flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn btn-principal" disabled={pendiente}>
                {pendiente ? "Guardando…" : "Agregar alumno"}
              </button>
              {pideConfirmar && (
                <button
                  type="button" className="btn btn-neutro" disabled={pendiente}
                  onClick={() => agregar(true)}
                >
                  Es otra persona, agregar de todos modos
                </button>
              )}
            </span>
          </form>

          {/* ---------------------------- LISTA --------------------------- */}
          <h3 style={{ fontSize: 14.5, fontWeight: 660, margin: "26px 0 10px" }}>
            Alumnos de {grupo.nombre}
            {!cargando && !errorLista && (
              <span style={{ fontWeight: 400, color: "var(--gris-500)" }}> — {activos.length}</span>
            )}
          </h3>

          {avisoLista && (
            <div className={`aviso-caja ${avisoLista.ok ? "ok" : "error"}`} role="status">
              {avisoLista.mensaje}
            </div>
          )}
          {errorLista && <div className="aviso-caja error">{errorLista}</div>}
          {cargando && <p className="pista">Leyendo la lista…</p>}

          {!cargando && !errorLista && activos.length === 0 && (
            <p className="pista">Este grupo no tiene alumnos todavía.</p>
          )}

          {!cargando && activos.length > 0 && (
            <div className="tabla-marco">
              <div className="tabla-scroll" style={{ maxHeight: 420, overflowY: "auto" }}>
                <table className="tabla">
                  <thead>
                    <tr><th>Alumno</th><th>Correo del tutor</th><th>Baja</th></tr>
                  </thead>
                  <tbody>
                    {activos.map((a) => (
                      <tr key={a.id}>
                        <td><strong>{a.nombre_completo}</strong></td>
                        <td style={{ fontSize: 12.5 }}>
                          {a.correos.length ? a.correos.join(", ") : (
                            <span style={{ color: "var(--rojo-700)" }}>sin correo</span>
                          )}
                        </td>
                        <td>
                          {confirmandoBaja === a.id ? (
                            <span style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                              <span style={{ fontSize: 12, color: "var(--gris-500)" }}>
                                ¿Dar de baja a {a.nombre_completo}?
                              </span>
                              <button
                                className="btn btn-alerta btn-chico" disabled={pendiente}
                                onClick={() => cambiar(() => accionBajaAlumno(a.id))}
                              >
                                {pendiente ? "…" : "Sí, dar de baja"}
                              </button>
                              <button
                                className="btn btn-neutro btn-chico" disabled={pendiente}
                                onClick={() => setConfirmandoBaja(null)}
                              >
                                No
                              </button>
                            </span>
                          ) : (
                            <button
                              className="btn btn-neutro btn-chico" disabled={pendiente}
                              onClick={() => { setAvisoLista(null); setConfirmandoBaja(a.id); }}
                              aria-label={`Dar de baja a ${a.nombre_completo}`}
                            >
                              Dar de baja
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ------------------------- DADOS DE BAJA ----------------------- */}
          {!cargando && deBaja.length > 0 && (
            <>
              <h3 style={{ fontSize: 14.5, fontWeight: 660, margin: "26px 0 4px" }}>
                Dados de baja
                <span style={{ fontWeight: 400, color: "var(--gris-500)" }}> — {deBaja.length}</span>
              </h3>
              <p className="pista" style={{ margin: "0 0 10px" }}>
                No aparecen al pasar lista ni reciben avisos. Sus faltas
                anteriores siguen en el historial. Si fue un error, se pueden
                regresar a la lista.
              </p>
              <div className="tabla-marco">
                <div className="tabla-scroll">
                  <table className="tabla">
                    <tbody>
                      {deBaja.map((a) => (
                        <tr key={a.id}>
                          <td style={{ color: "var(--gris-500)" }}>{a.nombre_completo}</td>
                          <td style={{ fontSize: 12.5, color: "var(--gris-500)" }}>
                            {a.correos.join(", ")}
                          </td>
                          <td>
                            <button
                              className="btn btn-neutro btn-chico" disabled={pendiente}
                              onClick={() => cambiar(() => accionReactivarAlumno(a.id))}
                              aria-label={`Reactivar a ${a.nombre_completo}`}
                            >
                              Reactivar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
