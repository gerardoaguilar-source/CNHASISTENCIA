"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { accionCrearUsuario } from "@/app/admin/usuarios/acciones";

export default function FormaUsuario({ lleno, limite }: { lleno: boolean; limite: number }) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [rol, setRol] = useState("coordinador");
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null);

  if (lleno) {
    return (
      <div className="aviso-caja alerta" style={{ marginBottom: 0 }}>
        <strong>Ya se ocuparon los {limite} lugares.</strong> No se pueden dar
        de alta más cuentas hasta que se amplíe el límite en la configuración
        de la app.
      </div>
    );
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setResultado(null);
    startTransition(async () => {
      const r = await accionCrearUsuario({ nombre, email, clave, rol });
      setResultado(r);
      if (r.ok) {
        setNombre(""); setEmail(""); setClave(""); setRol("coordinador");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={enviar}>
      {resultado && (
        <div className={`aviso-caja ${resultado.ok ? "ok" : "error"}`} role="status">
          {resultado.mensaje}
        </div>
      )}

      <div className="fila-campos">
        <div className="campo">
          <label className="etiqueta" htmlFor="u-nombre">Nombre completo</label>
          <input
            id="u-nombre" className="control" required value={nombre}
            autoComplete="off" onChange={(e) => setNombre(e.target.value)}
          />
        </div>
        <div className="campo">
          <label className="etiqueta" htmlFor="u-email">Correo</label>
          <input
            id="u-email" className="control" type="email" inputMode="email"
            required value={email} autoComplete="off"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nombre@cnhtijuana.edu.mx"
          />
        </div>
      </div>

      <div className="fila-campos">
        <div className="campo">
          <label className="etiqueta" htmlFor="u-clave">Contraseña</label>
          <input
            id="u-clave" className="control" type="text" required minLength={8}
            value={clave} autoComplete="off"
            onChange={(e) => setClave(e.target.value)}
          />
          <div className="pista">
            Mínimo 8 caracteres. Hay que dársela a la persona; con ella entra.
          </div>
        </div>
        <div className="campo">
          <label className="etiqueta" htmlFor="u-rol">Tipo de acceso</label>
          <select
            id="u-rol" className="control" value={rol}
            onChange={(e) => setRol(e.target.value)}
          >
            <option value="coordinador">Coordinador — pasa lista y registra permisos</option>
            <option value="admin">Administrador — además carga alumnos y da de alta cuentas</option>
          </select>
        </div>
      </div>

      <button className="btn btn-principal" disabled={pendiente}>
        {pendiente ? "Creando…" : "Crear cuenta"}
      </button>
    </form>
  );
}
