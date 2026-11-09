"use client";

import { useState } from "react";
import type { Nivel } from "@/lib/tipos";

interface Estado {
  ok: boolean;
  error?: string;
  cuenta?: string;
  destino?: string;
}

export default function ProbarCorreo({
  correoSecundaria,
  correoPreparatoria,
}: {
  correoSecundaria: string;
  correoPreparatoria: string;
}) {
  const [destino, setDestino] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [estado, setEstado] = useState<Record<string, Estado>>({});

  async function probar(nivel: Nivel, conEnvio: boolean) {
    const llave = `${nivel}-${conEnvio ? "envio" : "conexion"}`;
    setOcupado(llave);
    try {
      const res = await fetch("/api/probar-correo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nivel, destino: conEnvio ? destino.trim() : undefined }),
      });
      const datos = (await res.json()) as Estado;
      setEstado((p) => ({ ...p, [nivel]: datos }));
    } catch {
      setEstado((p) => ({ ...p, [nivel]: { ok: false, error: "No se pudo conectar." } }));
    } finally {
      setOcupado(null);
    }
  }

  const bloque = (nivel: Nivel, cuenta: string, titulo: string) => {
    const r = estado[nivel];
    return (
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontWeight: 600, fontSize: 14.5 }}>{titulo}</div>
            <div style={{ fontSize: 12.5, color: "var(--gris-500)" }}>{cuenta}</div>
          </div>
          <button
            className="btn btn-neutro btn-chico"
            disabled={ocupado !== null}
            onClick={() => probar(nivel, false)}
          >
            {ocupado === `${nivel}-conexion` ? "Probando…" : "Probar acceso"}
          </button>
          <button
            className="btn btn-principal btn-chico"
            disabled={ocupado !== null || !destino.trim()}
            onClick={() => probar(nivel, true)}
          >
            {ocupado === `${nivel}-envio` ? "Enviando…" : "Enviar prueba"}
          </button>
        </div>
        {r && (
          <div className={`aviso-caja ${r.ok ? "ok" : "error"}`} style={{ marginBottom: 0 }}>
            {r.ok
              ? r.destino
                ? `Correo de prueba enviado a ${r.destino}. Revisa la bandeja (y la carpeta de spam la primera vez).`
                : "Usuario y contraseña correctos. La cuenta puede enviar."
              : r.error}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="tarjeta">
      <h2>Probar el correo</h2>
      <p className="sub">
        Verifica que cada cuenta puede enviar, sin molestar a ningún padre de familia.
      </p>

      <div className="campo">
        <label className="etiqueta" htmlFor="destino">
          Tu correo, para recibir la prueba
        </label>
        <input
          id="destino" className="control" type="email" value={destino}
          onChange={(e) => setDestino(e.target.value)}
          placeholder="direccion@cnhtijuana.edu.mx"
        />
        <p className="pista">
          &quot;Probar acceso&quot; solo revisa la contraseña y no manda nada.
          &quot;Enviar prueba&quot; te manda un aviso de ejemplo a esta dirección.
        </p>
      </div>

      {bloque("secundaria", correoSecundaria, "Secundaria")}
      {bloque("preparatoria", correoPreparatoria, "Preparatoria")}
    </div>
  );
}
