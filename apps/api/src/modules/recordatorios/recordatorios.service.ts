import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../core/mail/mail.service';

/** URL del sitio (web) para el enlace del correo. En producción, nannies.mx. */
const WEB_URL = process.env.WEB_URL ?? 'https://nannies.mx';

/** Un correo es "real" (buzón de contacto) si no es un login @nannies.mx. */
function esCorreoReal(email?: string | null): email is string {
  return !!email && email.includes('@') && !email.toLowerCase().endsWith('@nannies.mx');
}

@Injectable()
export class RecordatoriosService {
  private readonly logger = new Logger(RecordatoriosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  /**
   * Envía a cada nannie activa (o en prueba) el recordatorio para marcar su
   * disponibilidad. Prefiere el correo personal (Nannie.email); si está vacío,
   * cae al correo de login cuando ese login es un correo real (formato viejo,
   * no @nannies.mx). Las que no tienen ningún correo usable se omiten.
   */
  async disponibilidadSemanal() {
    const nannies = await this.prisma.nannie.findMany({
      where: { estado: { in: ['ACTIVA', 'PRUEBA'] } },
      include: { usuario: { select: { email: true } } },
    });

    let enviados = 0;
    let sinCorreo = 0;
    let fallidos = 0;

    for (const n of nannies) {
      const destino = esCorreoReal(n.email)
        ? n.email
        : esCorreoReal(n.usuario?.email)
          ? n.usuario!.email
          : null;
      if (!destino) {
        sinCorreo++;
        continue;
      }
      const ok = await this.mail.recordatorioDisponibilidad(destino, n.nombre, `${WEB_URL}/login`);
      if (ok) enviados++;
      else fallidos++;
    }

    this.logger.log(
      `Recordatorio disponibilidad: ${enviados} enviados, ${sinCorreo} sin correo, ${fallidos} fallidos (de ${nannies.length}).`,
    );
    return { total: nannies.length, enviados, sinCorreo, fallidos };
  }
}
