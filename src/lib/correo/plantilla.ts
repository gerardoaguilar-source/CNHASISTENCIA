import { COLEGIO, TELEFONO_COLEGIO } from "../config";
import { fechaLarga } from "../fechas";
import { etiquetaNivel, type Nivel } from "../tipos";

export interface DatosAviso {
  alumno: string;
  grupo: string;
  nivel: Nivel;
  fecha: string;
  urlEscudo?: string;
}

export function asuntoAviso(d: DatosAviso): string {
  return `Aviso de inasistencia — ${d.alumno} — ${fechaLarga(d.fecha)}`;
}

export function textoAviso(d: DatosAviso): string {
  return [
    `${COLEGIO}`,
    `${etiquetaNivel(d.nivel)}`,
    ``,
    `Estimado padre, madre o tutor:`,
    ``,
    `Le informamos que el alumno ${d.alumno}, del grupo ${d.grupo}, ` +
      `no se presentó a clases el día ${fechaLarga(d.fecha)}.`,
    ``,
    `Si usted ya había avisado de esta ausencia o se trata de una situación ` +
      `justificada, le pedimos comunicarse con la dirección del plantel para ` +
      `registrar el permiso correspondiente.`,
    ``,
    TELEFONO_COLEGIO ? `Teléfono: ${TELEFONO_COLEGIO}` : ``,
    ``,
    `Agradecemos su atención.`,
    `Prefectura — 664-689-1091`,
    ``,
    `— Este correo se generó automáticamente al pasar lista. Favor de no responder a esta dirección si no es necesario.`,
  ]
    .filter((l) => l !== undefined)
    .join("\n");
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function htmlAviso(d: DatosAviso): string {
  const escudo = d.urlEscudo
    ? `<img src="${d.urlEscudo}" width="64" height="64" alt="" style="display:block;margin:0 auto 12px;border:0;">`
    : "";

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(asuntoAviso(d))}</title></head>
<body style="margin:0;padding:0;background:#F7F9F7;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F9F7;padding:24px 12px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(6,61,31,.10);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">

    <tr><td style="background:#063D1F;padding:26px 24px 22px;text-align:center;">
      ${escudo}
      <div style="color:#ffffff;font-size:17px;font-weight:700;letter-spacing:.2px;">${esc(COLEGIO)}</div>
      <div style="color:#9FD4B2;font-size:12px;letter-spacing:1px;text-transform:uppercase;margin-top:3px;">${esc(etiquetaNivel(d.nivel))}</div>
    </td></tr>
    <tr><td style="height:4px;background:#C01818;line-height:4px;font-size:0;">&nbsp;</td></tr>

    <tr><td style="padding:28px 26px 8px;">
      <div style="font-size:12px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:#C01818;margin-bottom:10px;">Aviso de inasistencia</div>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#13201A;">Estimado padre, madre o tutor:</p>
      <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#13201A;">
        Le informamos que el alumno
        <strong style="color:#063D1F;">${esc(d.alumno)}</strong>,
        del grupo <strong>${esc(d.grupo)}</strong>, no se presentó a clases el día
        <strong>${esc(fechaLarga(d.fecha))}</strong>.
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#E9F6EE;border:1px solid #CDE7D7;border-radius:10px;margin-bottom:20px;">
        <tr><td style="padding:14px 16px;font-size:13.5px;line-height:1.55;color:#0A5B2C;">
          Si usted ya había avisado de esta ausencia, o se trata de una situación
          justificada (cita médica, trámite, viaje familiar), le pedimos
          comunicarse con la dirección del plantel para registrar el permiso
          correspondiente.
          ${TELEFONO_COLEGIO ? `<br><br><strong>Teléfono:</strong> ${esc(TELEFONO_COLEGIO)}` : ""}
        </td></tr>
      </table>

      <p style="margin:0 0 6px;font-size:15px;line-height:1.6;color:#13201A;">Agradecemos su atención.</p>
      <p style="margin:0 0 26px;font-size:15px;line-height:1.6;color:#13201A;">
        <strong>Prefectura — 664-689-1091</strong>
      </p>
    </td></tr>

    <tr><td style="background:#F0F4F1;padding:16px 26px;border-top:1px solid #E2E9E4;">
      <p style="margin:0;font-size:11.5px;line-height:1.55;color:#74857B;">
        Este correo se generó automáticamente al registrar el pase de lista del día.
        Si considera que se trata de un error, favor de comunicarse con la dirección del plantel.
      </p>
    </td></tr>

  </table>
</td></tr></table>
</body></html>`;
}
