import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { cuentaDe, copiaOculta } from "../config";
import type { Nivel } from "../tipos";

export interface ResultadoEnvio {
  ok: boolean;
  id?: string;
  error?: string;
}

const transportes = new Map<string, Transporter>();

function transporte(usuario: string, clave: string): Transporter {
  const llave = usuario;
  const existente = transportes.get(llave);
  if (existente) return existente;

  const t = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE ?? "true") === "true",
    auth: { user: usuario, pass: clave.replace(/\s+/g, "") },
    pool: true,
    maxConnections: 1,
    maxMessages: 50,
  });
  transportes.set(llave, t);
  return t;
}

/**
 * Envía el aviso desde la cuenta del nivel correspondiente:
 * secundaria@cnhtijuana.edu.mx o prepa@cnhtijuana.edu.mx.
 * Sin credenciales configuradas no envía nada y devuelve ok (modo demo).
 */
export async function enviarCorreo(opciones: {
  nivel: Nivel;
  para: string[];
  asunto: string;
  html: string;
  texto: string;
}): Promise<ResultadoEnvio> {
  const cuenta = cuentaDe(opciones.nivel);

  if (!cuenta.usuario || !cuenta.clave) {
    return { ok: true, id: "demo-sin-envio" };
  }

  try {
    const bcc = copiaOculta();
    const info = await transporte(cuenta.usuario, cuenta.clave).sendMail({
      from: `"${cuenta.nombre}" <${cuenta.usuario}>`,
      to: opciones.para,
      ...(bcc.length ? { bcc } : {}),
      replyTo: cuenta.usuario,
      subject: opciones.asunto,
      html: opciones.html,
      text: opciones.texto,
    });
    return { ok: true, id: info.messageId };
  } catch (e) {
    return { ok: false, error: mensajeDeError(e) };
  }
}

/** Traduce los errores de SMTP más comunes a algo accionable. */
function mensajeDeError(e: unknown): string {
  const texto = e instanceof Error ? e.message : String(e);
  if (/invalid login|username and password not accepted|535/i.test(texto)) {
    return "Google rechazó el usuario o la contraseña de aplicación. Revisa que la cuenta tenga verificación en dos pasos y que la contraseña de 16 caracteres sea la correcta.";
  }
  if (/limit|quota|550 5\.4\.5/i.test(texto)) {
    return "Se alcanzó el límite diario de envío de Google para esta cuenta. Los avisos restantes se pueden mandar mañana.";
  }
  if (/ETIMEDOUT|ECONNREFUSED|ENOTFOUND|ECONNRESET/i.test(texto)) {
    return "No se pudo conectar al servidor de correo de Google. Puede ser una interrupción momentánea; intenta de nuevo en un minuto.";
  }
  return texto;
}

/** Prueba la conexión sin mandar nada — para el botón de diagnóstico. */
export async function probarCuenta(nivel: Nivel): Promise<ResultadoEnvio> {
  const cuenta = cuentaDe(nivel);
  if (!cuenta.usuario || !cuenta.clave) {
    return { ok: false, error: "No hay credenciales configuradas para este nivel." };
  }
  try {
    await transporte(cuenta.usuario, cuenta.clave).verify();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: mensajeDeError(e) };
  }
}
