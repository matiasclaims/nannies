import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Publico } from './core/auth/decorators/publico.decorator';

/**
 * Endpoint de salud público (200). Sirve para un pinger externo (UptimeRobot /
 * cron-job.org) que mantiene despierta la instancia gratis de Render (evita el
 * spin-down de ~15 min). Sin auth y sin rate-limit para que el monitor quede
 * verde y no cuente contra el throttler.
 */
@Controller('health')
export class HealthController {
  @Publico()
  @SkipThrottle()
  @Get()
  estado() {
    return { ok: true, servicio: 'nannies-api' };
  }
}
