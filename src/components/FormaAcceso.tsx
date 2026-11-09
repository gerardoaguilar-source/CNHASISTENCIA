"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseNavegador } from "@/lib/supabase/navegador";

export default function FormaAcceso({ destino }: { destino: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const sb = supabaseNavegador();
    const { error: err } = await sb.auth.signInWithPassword({
      email: email.trim(),
      password: clave,
    });
    if (err) {
      setError(
        err.message.toLowerCase().includes("invalid")
          ? "Correo o contraseña incorrectos."
          : err.message
      );
      setCargando(false);
      return;
    }
    router.replace(destino || "/");
    router.refresh();
  }

  return (
    <form onSubmit={entrar}>
      {error && <div className="aviso-caja error">{error}</div>}

      <div className="campo">
        <label className="etiqueta" htmlFor="email">Correo</label>
        <input
          id="email" className="control" type="email" autoComplete="username"
          inputMode="email" required value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nombre@cnhtijuana.edu.mx"
        />
      </div>

      <div className="campo">
        <label className="etiqueta" htmlFor="clave">Contraseña</label>
        <input
          id="clave" className="control" type="password"
          autoComplete="current-password" required value={clave}
          onChange={(e) => setClave(e.target.value)}
        />
      </div>

      <button className="btn btn-principal btn-ancho" disabled={cargando}>
        {cargando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
