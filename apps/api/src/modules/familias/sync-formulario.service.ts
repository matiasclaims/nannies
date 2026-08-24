import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SyncFormularioDto } from './dto/sync-formulario.dto';

/** Normaliza para comparar títulos/valores: sin acentos, minúsculas, 1 espacio. */
function norm(s: unknown): string {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
function texto(a: unknown): string | undefined {
  const v = Array.isArray(a) ? a.filter(Boolean).join(', ') : String(a ?? '');
  return v.trim() || undefined;
}
function lista(a: unknown): string[] {
  const arr = Array.isArray(a) ? a : String(a ?? '').split(/[,;]/);
  return arr.map((x) => String(x).trim()).filter(Boolean);
}
/** "Sí/No" → boolean; texto largo que empieza en sí/no también. */
function siNo(a: unknown): boolean | undefined {
  const n = norm(a);
  if (!n) return undefined;
  if (n.startsWith('si')) return true;
  if (n.startsWith('no')) return false;
  return undefined;
}
/** Edad en texto ("3 años 5 meses") → años (0-18) o undefined. */
function anios(a: unknown): number | undefined {
  const s = norm(a);
  const m = /(\d+)\s*a[nñ]o/.exec(s) ?? /(\d+)/.exec(s);
  if (!m) return undefined;
  const n = Number(m[1]);
  return Number.isInteger(n) && n >= 0 && n <= 18 ? n : undefined;
}

@Injectable()
export class SyncFormularioService {
  private readonly log = new Logger('SyncFormulario');
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Recibe una respuesta del formulario de familias (vía Apps Script) y crea la
   * familia + sus peques. Plaza = TOLUCA por defecto (coordinación la corrige).
   * Por correo: si ya existe una familia con ese correo, la ACTUALIZA en lugar
   * de duplicarla (ver `actualizar`).
   */
  async recibir(dto: SyncFormularioDto) {
    if (!process.env.FORM_SYNC_TOKEN || dto.token !== process.env.FORM_SYNC_TOKEN) {
      throw new ForbiddenException('Token inválido.');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const familia: any = { plaza: 'TOLUCA', email: dto.email?.trim() || undefined, areasATrabajar: [] as string[] };
    const peques: Record<string, unknown>[] = [];
    let peque: Record<string, unknown> | null = null;

    for (const it of dto.items) {
      const t = norm(it.title);
      const a = it.answer;

      // Marcador de peque: el título "Nombre" a secas (el de la familia es "Nombre de la mamá…").
      if (t === 'nombre') {
        if (peque) peques.push(peque);
        peque = { nombre: texto(a) };
        continue;
      }

      if (!peque) {
        // --- Bloque de la familia ---
        if (t.includes('numero de emergencia')) familia.numeroEmergencia = texto(a);
        else if (t.includes('nombre de la mama') || t.includes('papa o responsable')) familia.nombreContacto = texto(a);
        else if (t.includes('direccion completa')) familia.direccion = texto(a);
        else if (t.includes('expectativas')) familia.expectativas = texto(a);
        else if (t.includes('reglas especificas')) familia.reglasEspecificas = texto(a);
        else if (t.includes('adulto responsable')) familia.adultoResponsablePresente = siNo(a);
        else if (t.includes('mascotas')) familia.mascotas = texto(a);
        else if (t.includes('que area')) familia.areasATrabajar = lista(a);
        else if (t.includes('reglamento de padres')) familia.consentimientoReglamento = Boolean(texto(a));
        else if (t.includes('cobertura medica')) familia.consentimientoMedico = Boolean(texto(a));
        else if (t.includes('aviso de privacidad')) familia.consentimientoPrivacidad = Boolean(texto(a));
        else if (t.includes('no tienen autorizacion para compartir') || t.includes('triangular con la agencia'))
          familia.consentimientoConfidencialidad = Boolean(texto(a));
        else if (t.includes('material audiovisual')) familia.autorizacionAudiovisual = texto(a);
      } else {
        // --- Bloque del peque en curso ---
        if (t.includes('edad')) peque.edad = anios(a);
        else if (t.includes('reaccionar tu peque con personas nuevas') || t.includes('personas nuevas'))
          peque.reaccionAnteLoNuevo = texto(a);
        else if (t.includes('caracter de tu peque') || t.includes('describan el caracter')) peque.caracter = texto(a);
        else if (t.includes('rutinas')) peque.rutinas = texto(a);
        else if (t.includes('tematicas de interes')) peque.tematicasInteres = texto(a);
        else if (t.includes('condicion de salud')) peque.salud = texto(a);
        else if (t.includes('restricciones de television') || t.includes('restricciones de')) peque.restriccionesPantalla = texto(a);
        else if (t.includes('conductas de riesgo')) peque.conductasRiesgo = texto(a);
        else if (t.includes('cambiar pana') || t.includes('autorizada a cambiar')) peque.autorizacionCambioPanal = siNo(a);
      }
    }
    if (peque) peques.push(peque);

    const nombreDelForm = familia.nombreContacto as string | undefined;
    const ninos = peques.filter((p) => p.nombre);

    // Mismo correo → ACTUALIZA la familia existente, no la duplica (Paula, 2026-08:
    // hay mamás que llenan el formulario varias veces para actualizarlo).
    if (familia.email) {
      const existe = await this.prisma.familia.findFirst({
        where: { email: familia.email },
        select: { id: true },
      });
      if (existe) {
        await this.actualizar(existe.id, familia, nombreDelForm, ninos);
        this.log.log(`Familia actualizada desde formulario: ${existe.id} (${ninos.length} peques).`);
        return { creada: false, actualizada: true, familiaId: existe.id, peques: ninos.length };
      }
    }

    familia.nombreContacto = nombreDelForm || familia.email || 'Sin nombre';
    const creada = await this.prisma.$transaction(async (tx) => {
      const fam = await tx.familia.create({ data: familia });
      if (ninos.length)
        await tx.nino.createMany({
          data: ninos.map((n) => ({ familiaId: fam.id, ...n })) as Prisma.NinoCreateManyInput[],
        });
      return fam;
    });
    this.log.log(`Familia creada desde formulario: ${creada.id} (${ninos.length} peques).`);
    return { creada: true, actualizada: false, familiaId: creada.id, peques: ninos.length };
  }

  /** Actualiza una familia existente con lo último del formulario (mismo correo).
   *  No toca la plaza (coordinación pudo corregirla); no borra lo que la mamá
   *  dejó en blanco; empata peques por nombre (actualiza / agrega, nunca borra);
   *  y deja una nota en la bitácora para que coordinación lo note. */
  private async actualizar(
    familiaId: string,
    familia: Record<string, unknown>,
    nombreDelForm: string | undefined,
    ninos: Record<string, unknown>[],
  ) {
    // La plaza, el correo y el nombre/áreas se tratan aparte para no pisarlos.
    const { plaza, email, nombreContacto, areasATrabajar, ...resto } = familia;
    void plaza;
    void email;
    void nombreContacto;
    const data: Record<string, unknown> = { ...resto };
    if (nombreDelForm) data.nombreContacto = nombreDelForm; // solo si el form lo trajo
    if (Array.isArray(areasATrabajar) && areasATrabajar.length) data.areasATrabajar = areasATrabajar;

    await this.prisma.$transaction(async (tx) => {
      await tx.familia.update({ where: { id: familiaId }, data });

      const existentes = await tx.nino.findMany({
        where: { familiaId },
        select: { id: true, nombre: true },
      });
      for (const n of ninos) {
        const { nombre, ...campos } = n;
        const match = existentes.find((e) => norm(e.nombre) === norm(nombre));
        if (match) {
          await tx.nino.update({ where: { id: match.id }, data: campos as Prisma.NinoUpdateInput });
        } else {
          await tx.nino.create({
            data: { familiaId, nombre, ...campos } as Prisma.NinoUncheckedCreateInput,
          });
        }
      }

      await tx.notaFamilia.create({
        data: {
          familiaId,
          texto: 'La familia actualizó sus datos desde el formulario previo al servicio.',
          autorNombre: 'Formulario',
        },
      });
    });
  }
}
