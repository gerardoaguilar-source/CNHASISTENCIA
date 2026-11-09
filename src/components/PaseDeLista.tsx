"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Nivel, RenglonLista } from "@/lib/tipos";
import { fechaCorta } from "@/lib/fechas";

interface Props {
  grupoId: string;
  grupoNombre: string;
  nivel: Nivel;
  fecha: string;
  renglones: RenglonLista[];
  modoDemo: boolean;
  remitente: string;
}

interface Resultado {
  ok: boolean;
  enviados: number;
  sinCorreo: string[];
  fallidos: { alumno: string; error: string }[];
  mensaje?: string;
}

export default function PaseDeLista({
  grupoId, grupoNombre, nivel, fecha, renglones, modoDemo, remitente,
}: Props) {
  const router = useRouter();

  const bloqueados = useMemo(
    () => new Set(renglones.filter((r) => r.justificacion).map((r) => r.alumno_id)),
    [renglones]
  );

  const [ausentes, setAusentes] = useState<Set<string>>(
    () => new Set(renglones.filter((r) => r.estatus === "ausente").map((r) => r.alumno_id))
  );
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  const yaNotificado = renglones.some((r) => r.notificado);

  function alternar(id: string) {
    if (bloqueados.has(id) || enviando) return;
    setResultado(null);
    setAusentes((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  }

  const listaAusentes = renglones.filter((r) => ausentes.has(r.alumno_id));
  const totalJustificados = renglones.filter((r) => r.justificacion).length;
  const totalPresentes = renglones.length - listaAusentes.length - totalJustificados;
  const sinCorreo = listaAusentes.filter((r) => r.correos.length === 0);

  async function enviar(notificar: boolean) {
    setEnviando(true);
    setResultado(null);
    try {
      const res = await fetch("/api/notificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grupo_id: grupoId,
          nivel,
          fecha,
          ausentes: [...ausentes],
          presentes: renglones
            .filter((r) => !ausentes.has(r.alumno_id) && !bloqueados.has(r.alumno_id))
            .map((r) => r.alumno_id),
          justificados: [...bloqueados],
          notificar,
        }),
      });
      const datos = (await res.json()) as Resultado;
      setResultado(datos);
      setConfirmando(false);
      if (datos.ok) router.refresh();
    } catch {
      setResultado({
        ok: false, enviados: 0, sinCorreo: [], fallidos: [],
        mensaje: "No se pudo conectar. Revisa tu internet e intenta de nuevo.",
      });
      setConfirmando(false);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <div className="resumen">
        <span className="chip verde"><i className="punto" />{totalPresentes} presentes</span>
        <span className="chip rojo"><i className="punto" />{listaAusentes.length} ausentes</span>
        {totalJustificados > 0 && (
          <span className="chip gris"><i className="punto" />{totalJustificados} con permiso</span>
        )}
      </div>

      {yaNotificado && !resultado && (
        <div className="aviso-caja ok">
          Hoy ya se enviaron avisos para este grupo. Si marcas a alguien más y
          vuelves a notificar, <strong>solo se avisará a los nuevos</strong>.
        </div>
      )}

      {resultado && (
        <div className={`aviso-caja ${resultado.ok ? "ok" : "error"}`}>
          {resultado.mensaje ? (
            <>{resultado.mensaje}</>
          ) : (
            <>
              <strong>Lista guardada.</strong>{" "}
              {resultado.enviados > 0
                ? `Se avisó a los padres de ${resultado.enviados} ${
                    resultado.enviados === 1 ? "alumno" : "alumnos"
                  }.`
                : "No se envió ningún correo."}
              {resultado.sinCorreo.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  ⚠️ Sin correo registrado: {resultado.sinCorreo.join(", ")}.
                </div>
              )}
              {resultado.fallidos.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  ❌ No salió el correo de:{" "}
                  {resultado.fallidos.map((f) => f.alumno).join(", ")}.
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="lista">
        {renglones.map((r, i) => {
          const bloqueado = Boolean(r.justificacion);
          const marcado = ausentes.has(r.alumno_id);
          return (
            <button
              key={r.alumno_id}
              type="button"
              className={`renglon ${bloqueado ? "bloqueado" : ""} ${marcado ? "ausente" : ""}`}
              onClick={() => alternar(r.alumno_id)}
              disabled={bloqueado}
              aria-pressed={marcado}
              aria-label={
                bloqueado
                  ? `${r.nombre_completo} — con permiso, no se puede marcar`
                  : `${r.nombre_completo} — marcar como ausente`
              }
            >
              <span className="num">{i + 1}</span>
              <span className="datos">
                <span className="nombre">{r.nombre_completo}</span>
                <span className="meta">
                  {bloqueado ? (
                    <span>
                      🔒 Permiso hasta el {fechaCorta(r.justificacion!.fecha_fin)}
                      {r.justificacion!.motivo ? ` — ${r.justificacion!.motivo}` : ""}
                    </span>
                  ) : (
                    <>
                      {r.matricula && <span>{r.matricula}</span>}
                      {r.correos.length === 0 && (
                        <span className="aviso">⚠️ sin correo de tutor</span>
                      )}
                      {r.notificado && <span>✉️ ya se avisó hoy</span>}
                    </>
                  )}
                </span>
              </span>
              {bloqueado ? (
                <span className="sello">Justificado</span>
              ) : (
                <span className="casilla">✓</span>
              )}
            </button>
          );
        })}
      </div>

      {renglones.length === 0 && (
        <div className="tarjeta">
          <div className="vacio">
            Este grupo todavía no tiene alumnos.
            <br />
            Se cargan en Administración → Alumnos.
          </div>
        </div>
      )}

      {/* ---------------- barra inferior ---------------- */}
      {renglones.length > 0 && (
        <div className="pie-fijo">
          <div className="pie-interna">
            <div className="pie-texto">
              {listaAusentes.length === 0 ? (
                <>Nadie marcado. Toca el nombre de quien <strong>no vino</strong>.</>
              ) : (
                <>
                  <strong>{listaAusentes.length}</strong>{" "}
                  {listaAusentes.length === 1 ? "ausente" : "ausentes"} en {grupoNombre}
                  {sinCorreo.length > 0 && ` · ${sinCorreo.length} sin correo`}
                </>
              )}
            </div>
            <button
              className="btn btn-neutro btn-chico"
              onClick={() => enviar(false)}
              disabled={enviando}
            >
              Solo guardar
            </button>
            <button
              className="btn btn-alerta"
              onClick={() => setConfirmando(true)}
              disabled={enviando || listaAusentes.length === 0}
            >
              {enviando ? "Enviando…" : "Notificar a padres"}
            </button>
          </div>
        </div>
      )}

      {/* ---------------- confirmación ---------------- */}
      {confirmando && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 60,
            background: "rgba(4,42,21,.55)", display: "grid",
            placeItems: "center", padding: 16,
          }}
          onClick={() => !enviando && setConfirmando(false)}
        >
          <div
            className="tarjeta"
            style={{ maxWidth: 440, width: "100%", margin: 0, maxHeight: "86dvh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Confirmar aviso a padres</h2>
            <p className="sub">
              Se enviará un correo desde <strong>{remitente}</strong> avisando
              que estos alumnos no asistieron hoy.
            </p>

            {modoDemo && (
              <div className="aviso-caja alerta">
                Modo demostración: <strong>no se enviará ningún correo real</strong>.
              </div>
            )}

            <div className="lista" style={{ marginBottom: 16 }}>
              {listaAusentes.map((r) => (
                <div key={r.alumno_id} className="renglon" style={{ cursor: "default" }}>
                  <span className="datos">
                    <span className="nombre">{r.nombre_completo}</span>
                    <span className="meta">
                      {r.correos.length > 0 ? (
                        <span>{r.correos.join(", ")}</span>
                      ) : (
                        <span className="aviso">⚠️ sin correo — no se le avisará</span>
                      )}
                    </span>
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn btn-neutro"
                style={{ flex: 1 }}
                onClick={() => setConfirmando(false)}
                disabled={enviando}
              >
                Cancelar
              </button>
              <button
                className="btn btn-alerta"
                style={{ flex: 1.4 }}
                onClick={() => enviar(true)}
                disabled={enviando}
              >
                {enviando ? "Enviando…" : `Enviar ${listaAusentes.length} aviso${listaAusentes.length === 1 ? "" : "s"}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
