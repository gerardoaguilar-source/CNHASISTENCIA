"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  accionCambiarClave, accionCambiarEstado, accionCambiarRol,
} from "@/app/admin/usuarios/acciones";
import type { RolUsuario } from "@/lib/tipos";

export default function AccionesUsuario({
  id, nombre, rol, activo,
}: { id: string; nombre: string; rol: RolUsuario; activo: boolean }) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [modo, setModo] = useState<"nada" | "suspender" | "clave">("nada");
  const [clave, setClave] = useState("");
  const [aviso, setAviso] = useState<{ ok: boolean; mensaje: string } | null>(null);

  function correr(tarea: () => Promise<{ ok: boolean; mensaje: string }>) {
    setAviso(null);
    startTransition(async () => {
      const r = await tarea();
      setAviso(r);
      if (r.ok) {
        setModo("nada");
        setClave("");
        router.refresh();
      }
    });
  }

  const estiloAviso = {
    fontSize: 12, marginTop: 6,
    color: aviso?.ok ? "var(--verde-700)" : "var(--rojo-700)",
  } as const;

  return (
    <div>
      {modo === "nada" && (
        <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
          <button
            className="btn btn-neutro btn-chico" disabled={pendiente}
            onClick={() => correr(() => accionCambiarRol(id, rol === "admin" ? "coordinador" : "admin"))}
          >
            {rol === "admin" ? "Hacer coordinador" : "Hacer administrador"}
          </button>
          <button
            className="btn btn-neutro btn-chico" disabled={pendiente}
            onClick={() => { setAviso(null); setModo("clave"); }}
          >
            Cambiar contraseña
          </button>
          {activo ? (
            <button
              className="btn btn-neutro btn-chico" disabled={pendiente}
              onClick={() => { setAviso(null); setModo("suspender"); }}
            >
              Suspender
            </button>
          ) : (
            <button
              className="btn btn-neutro btn-chico" disabled={pendiente}
              onClick={() => correr(() => accionCambiarEstado(id, true))}
            >
              Reactivar
            </button>
          )}
        </span>
      )}

      {modo === "suspender" && (
        <span style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "var(--gris-500)" }}>
            ¿Quitarle el acceso a {nombre}?
          </span>
          <button
            className="btn btn-alerta btn-chico" disabled={pendiente}
            onClick={() => correr(() => accionCambiarEstado(id, false))}
          >
            {pendiente ? "…" : "Sí, suspender"}
          </button>
          <button className="btn btn-neutro btn-chico" onClick={() => setModo("nada")}>No</button>
        </span>
      )}

      {modo === "clave" && (
        <form
          style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}
          onSubmit={(e) => { e.preventDefault(); correr(() => accionCambiarClave(id, clave)); }}
        >
          <input
            className="control" style={{ width: 190, padding: "7px 10px", fontSize: 13 }}
            type="text" required minLength={8} value={clave} autoComplete="off"
            placeholder="Nueva contraseña"
            aria-label={`Nueva contraseña para ${nombre}`}
            onChange={(e) => setClave(e.target.value)}
          />
          <button className="btn btn-principal btn-chico" disabled={pendiente}>
            {pendiente ? "…" : "Guardar"}
          </button>
          <button type="button" className="btn btn-neutro btn-chico" onClick={() => setModo("nada")}>
            Cancelar
          </button>
        </form>
      )}

      {aviso && <div style={estiloAviso} role="status">{aviso.mensaje}</div>}
    </div>
  );
}
