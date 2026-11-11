"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Botón para bajar el PDF del historial.
 *
 * En computadora se comporta como un vínculo normal de descarga.
 *
 * En celular o tableta (y sobre todo con la app instalada en la pantalla de
 * inicio) abrir el PDF directo deja a la persona atrapada: el PDF ocupa toda
 * la pantalla y no hay botón para regresar. Por eso ahí el PDF se baja "por
 * dentro", sin salir de la página, y se muestran las opciones: guardar o
 * compartir, descargar, y cerrar.
 */
export default function DescargarPdf({
  href,
  nombre,
  children,
}: {
  href: string;
  nombre: string;
  children: React.ReactNode;
}) {
  const [estado, setEstado] = useState<"inicio" | "preparando" | "listo" | "error">("inicio");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [liga, setLiga] = useState<string | null>(null);
  const [puedeCompartir, setPuedeCompartir] = useState(false);
  const [instaladaEnIOS, setInstaladaEnIOS] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const ligaRef = useRef<string | null>(null);

  // Libera el archivo de la memoria al salir de la página.
  useEffect(() => {
    return () => {
      if (ligaRef.current) URL.revokeObjectURL(ligaRef.current);
    };
  }, []);

  // Si cambia el periodo, el PDF que estaba listo ya no corresponde.
  useEffect(() => {
    cerrar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [href]);

  function cerrar() {
    if (ligaRef.current) URL.revokeObjectURL(ligaRef.current);
    ligaRef.current = null;
    setLiga(null);
    setArchivo(null);
    setMensaje("");
    setEstado("inicio");
  }

  function esMovil() {
    const instalada =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const tactil = window.matchMedia("(pointer: coarse)").matches;
    return instalada || tactil;
  }

  async function alTocar(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!esMovil()) return; // computadora: descarga normal
    e.preventDefault();
    if (estado === "preparando") return;

    setEstado("preparando");
    setMensaje("");
    try {
      const r = await fetch(href, { credentials: "same-origin", cache: "no-store" });
      const tipo = r.headers.get("Content-Type") ?? "";
      if (r.status === 401) throw new Error("La sesión se cerró. Vuelve a entrar e inténtalo de nuevo.");
      if (!r.ok || !tipo.includes("pdf")) throw new Error("No se pudo preparar el PDF. Inténtalo de nuevo.");

      const blob = await r.blob();
      const f = new File([blob], nombre, { type: "application/pdf" });
      const url = URL.createObjectURL(f);
      if (ligaRef.current) URL.revokeObjectURL(ligaRef.current);
      ligaRef.current = url;

      const esIOS =
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      const instalada =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;

      setArchivo(f);
      setLiga(url);
      setPuedeCompartir(
        typeof navigator.share === "function" &&
          typeof navigator.canShare === "function" &&
          navigator.canShare({ files: [f] })
      );
      setInstaladaEnIOS(esIOS && instalada);
      setEstado("listo");
    } catch (err) {
      setMensaje(
        err instanceof Error && err.message && !/fetch|network|load failed/i.test(err.message)
          ? err.message
          : "No se pudo preparar el PDF. Revisa la conexión e inténtalo de nuevo."
      );
      setEstado("error");
    }
  }

  async function compartir() {
    if (!archivo) return;
    try {
      await navigator.share({ files: [archivo], title: nombre.replace(/\.pdf$/i, "") });
    } catch {
      // La persona cerró el menú sin elegir nada: no pasa nada.
    }
  }

  // En iPhone/iPad con la app instalada, "Descargar" directo vuelve a abrir el
  // PDF a pantalla completa; ahí se guarda desde el menú de compartir.
  const mostrarDescarga = liga && !(instaladaEnIOS && puedeCompartir);

  return (
    <>
      {estado !== "listo" && (
        <a
          className="btn btn-principal btn-ancho"
          href={href}
          download
          onClick={alTocar}
          aria-busy={estado === "preparando"}
        >
          {estado === "preparando" ? "Preparando PDF…" : children}
        </a>
      )}

      {estado === "error" && (
        <p role="alert" style={{ fontSize: 13, color: "var(--rojo-700)", margin: "10px 0 0" }}>
          {mensaje}
        </p>
      )}

      {estado === "listo" && (
        <div role="group" aria-label="Opciones del PDF">
          <p style={{ fontSize: 14, fontWeight: 620, margin: "0 0 10px" }}>
            El PDF está listo. ¿Qué quieres hacer?
          </p>
          <div style={{ display: "grid", gap: 8 }}>
            {puedeCompartir && (
              <button type="button" className="btn btn-principal btn-ancho" onClick={compartir}>
                Guardar o compartir
              </button>
            )}
            {mostrarDescarga && (
              <a
                className={`btn btn-ancho ${puedeCompartir ? "btn-neutro" : "btn-principal"}`}
                href={liga}
                download={nombre}
              >
                Descargar al dispositivo
              </a>
            )}
            <button type="button" className="btn btn-neutro btn-ancho" onClick={cerrar}>
              Cerrar
            </button>
          </div>
          {puedeCompartir && (
            <p className="pista" style={{ marginTop: 10 }}>
              “Guardar o compartir” abre el menú del dispositivo: Guardar en
              Archivos, Imprimir, WhatsApp, Correo, AirDrop y más.
            </p>
          )}
        </div>
      )}
    </>
  );
}
