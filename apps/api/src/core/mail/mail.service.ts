import { Injectable, Logger } from '@nestjs/common';

/**
 * Envío de correo vía Resend (REST). Degradación elegante: si no hay
 * RESEND_API_KEY configurada, `enviar` devuelve false y el flujo sigue (el alta
 * muestra la contraseña temporal como respaldo). Sin dependencias externas.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly apiKey = process.env.RESEND_API_KEY;
  private readonly from = process.env.MAIL_FROM ?? 'Nannies Child Care <onboarding@resend.dev>';

  get configurado(): boolean {
    return !!this.apiKey;
  }

  async enviar(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.apiKey) {
      this.logger.warn('RESEND_API_KEY no configurada: correo NO enviado.');
      return false;
    }
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: this.from, to, subject, html }),
      });
      if (!r.ok) {
        this.logger.error(`Resend respondió ${r.status}: ${await r.text()}`);
        return false;
      }
      return true;
    } catch (e) {
      this.logger.error(`Error enviando correo: ${String(e)}`);
      return false;
    }
  }

  /** Correo de bienvenida a una nannie recién dada de alta (con su acceso). */
  async bienvenidaNannie(
    to: string,
    nombre: string,
    tempPassword: string,
    urlLogin: string,
  ): Promise<boolean> {
    const html = `
      <div style="font-family:Segoe UI,Arial,sans-serif;color:#0F172A;max-width:520px;margin:auto">
        <h2 style="color:#0CC0DF">Bienvenida a Nannies Child Care, ${escapar(nombre)}</h2>
        <p>Tu cuenta ya está creada. Estos son tus datos de acceso:</p>
        <p style="background:#F4F7FB;border-radius:8px;padding:12px 16px">
          <strong>Usuario:</strong> ${escapar(to)}<br>
          <strong>Contraseña temporal:</strong> <code style="font-size:16px">${escapar(tempPassword)}</code>
        </p>
        <p>Por seguridad, el sistema te pedirá <strong>cambiar tu contraseña</strong> en tu primer ingreso.</p>
        <p><a href="${escapar(urlLogin)}" style="background:#0CC0DF;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;display:inline-block">Entrar al sistema</a></p>
        <p style="color:#64748B;font-size:12px">Si no esperabas este correo, ignóralo.</p>
      </div>`;
    return this.enviar(to, 'Tu acceso a Nannies Child Care', html);
  }
}

function escapar(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
