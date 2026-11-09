"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { accionCancelarJustificacion } from "@/app/admin/acciones";

export default function BotonCancelar({ id, alumno }: { id: string; alumno: string }) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [confirmando, setConfirmando] = useState(false);

  if (!confirmando) {
    return (
      <button className="btn btn-neutro btn-chico" onClick={() => setConfirmando(true)}>
        Cancelar
      </button>
    );
  }

  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
      <span style={{ fontSize: 12, color: "var(--gris-500)" }}>¿Seguro?</span>
      <button
        className="btn btn-alerta btn-chico"
        disabled={pendiente}
        onClick={() =>
          startTransition(async () => {
            await accionCancelarJustificacion(id);
            router.refresh();
          })
        }
        aria-label={`Confirmar cancelación del permiso de ${alumno}`}
      >
        {pendiente ? "…" : "Sí"}
      </button>
      <button className="btn btn-neutro btn-chico" onClick={() => setConfirmando(false)}>
        No
      </button>
    </span>
  );
}
