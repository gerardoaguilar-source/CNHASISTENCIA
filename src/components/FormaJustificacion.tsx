"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { accionBuscarAlumnos, accionCrearJustificacion } from "@/app/admin/acciones";
import { diasEntre } from "@/lib/fechas";

interface Hallazgo { id: string; nombre_completo: string; grupo_nombre: string }

const MOTIVOS = [
  "Aviso de los padres por teléfono",
  "Cita médica",
  "Incapacidad médica presentada",
  "Viaje familiar",
  "Trámite o asunto personal",
  "Duelo familiar",
];

export default function FormaJustificacion({ hoyISO }: { hoyISO: string }) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();

  const [texto, setTexto] = useState("");
  const [hallazgos, setHallazgos] = useState<Hallazgo[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [elegido, setElegido] = useState<Hallazgo | null>(null);

  const [desde, setDesde] = useState(hoyISO);
  const [hasta, setHasta] = useState(hoyISO);
  const [motivo, setMotivo] = useState("");
  const [aviso, setAviso] = useState<{ ok: boolean; mensaje: string } | null>(null);

  async function buscar(valor: string) {
    setTexto(valor);
    setAviso(null);
    if (valor.trim().length < 2) { setHallazgos([]); return; }
    setBuscando(true);
    const r = await accionBuscarAlumnos(valor);
    setHallazgos(r);
    setBuscando(false);
  }

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!elegido) { setAviso({ ok: false, mensaje: "Primero busca y elige al alumno." }); return; }
    startTransition(async () => {
      const r = await accionCrearJustificacion({
        alumno_id: elegido.id, fecha_inicio: desde, fecha_fin: hasta, motivo,
      });
      setAviso(r);
      if (r.ok) {
        setElegido(null); setTexto(""); setHallazgos([]);
        setDesde(hoyISO); setHasta(hoyISO); setMotivo("");
        router.refresh();
      }
    });
  }

  const dias = hasta >= desde ? diasEntre(desde, hasta) : 0;

  return (
    <form className="tarjeta" onSubmit={guardar}>
      <h2>Registrar un permiso</h2>
      <p className="sub">
        Durante el rango de fechas, el alumno aparece en gris y no se le manda aviso de falta.
      </p>

      {aviso && (
        <div className={`aviso-caja ${aviso.ok ? "ok" : "error"}`}>{aviso.mensaje}</div>
      )}

      <div className="campo">
        <label className="etiqueta" htmlFor="buscar">Alumno</label>
        {elegido ? (
          <div className="seleccionado">
            <div>
              <div className="n">{elegido.nombre_completo}</div>
              <div className="g">{elegido.grupo_nombre}</div>
            </div>
            <button
              type="button" className="btn btn-neutro btn-chico"
              onClick={() => { setElegido(null); setTexto(""); }}
            >
              Cambiar
            </button>
          </div>
        ) : (
          <>
            <input
              id="buscar" className="control" value={texto} autoComplete="off"
              onChange={(e) => buscar(e.target.value)}
              placeholder="Escribe apellido, nombre o matrícula…"
            />
            {texto.trim().length >= 2 && (
              <div className="resultado-busqueda">
                {buscando && <button type="button" disabled>Buscando…</button>}
                {!buscando && hallazgos.length === 0 && (
                  <button type="button" disabled>Sin resultados</button>
                )}
                {hallazgos.map((h) => (
                  <button
                    key={h.id} type="button"
                    onClick={() => { setElegido(h); setHallazgos([]); }}
                  >
                    <div>{h.nombre_completo}</div>
                    <div className="g">{h.grupo_nombre}</div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="fila-campos">
        <div className="campo">
          <label className="etiqueta" htmlFor="desde">Desde</label>
          <input id="desde" className="control" type="date" value={desde}
            onChange={(e) => setDesde(e.target.value)} required />
        </div>
        <div className="campo">
          <label className="etiqueta" htmlFor="hasta">Hasta</label>
          <input id="hasta" className="control" type="date" value={hasta}
            min={desde} onChange={(e) => setHasta(e.target.value)} required />
        </div>
      </div>

      {dias > 0 && (
        <p className="pista" style={{ marginTop: -8, marginBottom: 14 }}>
          Cubre {dias} {dias === 1 ? "día" : "días"} naturales.
        </p>
      )}

      <div className="campo">
        <label className="etiqueta" htmlFor="motivo">Motivo</label>
        <input
          id="motivo" className="control" value={motivo} list="motivos-comunes"
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej. Aviso de la mamá — viaje familiar"
        />
        <datalist id="motivos-comunes">
          {MOTIVOS.map((m) => <option key={m} value={m} />)}
        </datalist>
        <p className="pista">
          Queda registrado quién lo autorizó y cuándo, por si después hay dudas.
        </p>
      </div>

      <button className="btn btn-principal btn-ancho" disabled={pendiente}>
        {pendiente ? "Guardando…" : "Registrar permiso"}
      </button>
    </form>
  );
}
