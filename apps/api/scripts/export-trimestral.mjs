// EXPORTACIÓN TRIMESTRAL DE NEGOCIO a CSV (abre en Excel). SOLO LECTURA.
//
// Todo corre dentro de UNA transacción `READ ONLY` (Postgres rechaza cualquier
// escritura) con snapshot REPEATABLE READ (cifras consistentes entre archivos).
// Volumen chico (miles de filas): unos segundos de CPU; aun así, correr en
// horario de baja carga.
//
// ANONIMIZACIÓN: nannies → NANNIE-NN, familias → FAMILIA-NNNN, servicios →
// SERV-NNNNN, paquetes → PAQ-<folio>. NO se exportan nombres de familias ni de
// niños, direcciones, teléfonos, correos, notas libres ni comentarios textuales.
// El motivo de cancelación sale REDACTADO (nombres/correos/teléfonos → [NOMBRE]
// /[CORREO]/[TEL]). La clave código→nombre de nannies va en un archivo aparte
// marcado CONFIDENCIAL (no compartirlo junto con los datos).
//
// El pago a la nannie NO se guarda por servicio (salvo overrides): se recalcula
// con el motor compilado (dist) y se marca "calculado".
//
// Uso (VPS, desde /var/www/nannies/apps/api; requiere el API construido):
//   node scripts/export-trimestral.mjs                       (21-sep-2026 → 30-nov-2026)
//   node scripts/export-trimestral.mjs --desde=2026-09-21 --hasta=2026-11-30 --out=/root/export
//
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

if (!process.env.DATABASE_URL && existsSync('.env')) {
  for (const l of readFileSync('.env', 'utf8').split('\n')) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      let v = m[2].trim();
      if ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'"))) v = v.slice(1, -1);
      process.env[m[1]] = v;
    }
  }
}

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=').slice(1).join('=');
const DESDE = arg('desde') || '2026-09-21';
const HASTA = arg('hasta') || '2026-11-30';
const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
const OUT = arg('out') || join(tmpdir(), `nannies-export-${stamp}`);

await import('reflect-metadata').catch(() => {});
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

// Motor compilado (mismo cálculo que ve Finanzas en pantalla).
const pick = (m, k) => m[k] ?? m.default?.[k];
let pagoDeServicio, reglaPorNumero, FinanzasService;
try {
  const dist = (p) => import(new URL(`../dist/${p}`, import.meta.url));
  pagoDeServicio = pick(await dist('modules/finanzas/pago-servicio.js'), 'pagoDeServicio');
  reglaPorNumero = pick(await dist('modules/nannies/incidencias.catalogo.js'), 'reglaPorNumero');
  FinanzasService = pick(await dist('modules/finanzas/finanzas.service.js'), 'FinanzasService');
} catch (e) {
  console.error(`\nERROR: no se pudo cargar el motor compilado (dist): ${e.message}\nCorre el build del API y reintenta.\n`);
  process.exit(1);
}
if (!pagoDeServicio || !reglaPorNumero || !FinanzasService) {
  console.error('\nERROR: el motor compilado (dist) no expone lo esperado. Corre el build del API y reintenta.\n');
  process.exit(1);
}

// ---------- utilidades ----------
const DIA = 86_400_000;
const d0 = (s) => new Date(`${s}T00:00:00.000Z`);
const ymd = (d) => d.toISOString().slice(0, 10);
const INI = d0(DESDE);
const FIN = new Date(d0(HASTA).getTime() + DIA); // exclusivo
const enPeriodo = (fecha) => fecha >= INI && fecha < FIN;
const fmtMX = (d) =>
  d
    ? new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false,
      }).format(d)
    : '';
const aMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const horasBloque = (ini, fin) => { const a = aMin(ini); let b = aMin(fin); if (b <= a) b += 1440; return (b - a) / 60; };
const inicioMX = (fecha, hhmm) => new Date(`${ymd(fecha)}T${hhmm}:00-06:00`); // México sin horario de verano
const r1 = (n) => (n == null || Number.isNaN(n) ? '' : Math.round(n * 10) / 10);
const r2 = (n) => (n == null || n === '' || Number.isNaN(Number(n)) ? '' : Math.round(Number(n) * 100) / 100);
const sn = (b) => (b == null ? '' : b ? 'Sí' : 'No');
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const inicioSemana = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - d.getUTCDay() * DIA);
const codigo = (pref, ancho) => {
  const m = new Map();
  return (id) => {
    if (id == null) return '';
    if (!m.has(id)) m.set(id, `${pref}-${String(m.size + 1).padStart(ancho, '0')}`);
    return m.get(id);
  };
};
const csvEsc = (v) => { const s = v == null ? '' : String(v); return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

const resumen = [];
const avisos = [];
const rango = (fechas) => {
  const v = fechas.filter(Boolean).sort();
  return v.length ? `${v[0]} → ${v[v.length - 1]}` : '—';
};
const escribir = (archivo, headers, filas, fechas = []) => {
  const csv = [headers, ...filas].map((r) => r.map(csvEsc).join(',')).join('\r\n');
  writeFileSync(join(OUT, archivo), '﻿' + csv, 'utf8');
  resumen.push({ archivo, filas: filas.length, rango: rango(fechas) });
};

// Redacción de texto libre (motivo de cancelación).
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const STOP = new Set(['del', 'las', 'los', 'de', 'la', 'el', 'y', 'mama', 'papa', 'familia', 'sra', 'sr', 'senora', 'senor',
  'nina', 'nino', 'bebe', 'con', 'por', 'para', 'que', 'una', 'uno', 'san', 'santa', 'mis', 'sus', 'tus']);

mkdirSync(OUT, { recursive: true });

await prisma.$transaction(
  async (tx) => {
    await tx.$executeRawUnsafe('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
    const [{ transaction_read_only: ro }] = await tx.$queryRawUnsafe('SHOW transaction_read_only');
    if (ro !== 'on') throw new Error('La transacción no quedó en SOLO LECTURA; se aborta sin exportar.');

    // ---------- catálogos y códigos ----------
    const nannies = await tx.nannie.findMany({
      select: {
        id: true, nombre: true, plaza: true, zonas: true, rangoPermanente: true, nivelTarifaMesActual: true,
        serviciosAcumulados: true, estado: true, creadoEn: true, actualizadoEn: true,
        usuario: { select: { activo: true } },
        coloniasTrabajo: { select: { dias: true, colonia: { select: { municipio: true } } } },
      },
      orderBy: [{ creadoEn: 'asc' }, { id: 'asc' }],
    });
    const cNannie = codigo('NANNIE', 2);
    for (const n of nannies) cNannie(n.id);
    const nivelActual = new Map(nannies.map((n) => [n.id, n.nivelTarifaMesActual]));
    const estadoNannie = new Map(nannies.map((n) => [n.id, n.estado]));

    const cierres = await tx.cierreMes.findMany({ orderBy: [{ anio: 'asc' }, { mes: 'asc' }] });
    const nivelDelMes = new Map(cierres.map((c) => [`${c.nannieId}|${c.anio}|${c.mes}`, c.nivelAsignado]));

    const [fams, ninos, usuarios] = await Promise.all([
      tx.familia.findMany({ select: { nombreContacto: true, apellido: true } }),
      tx.nino.findMany({ select: { nombre: true, apellidos: true } }),
      tx.usuario.findMany({ select: { nombre: true } }),
    ]);
    const NOMBRES = new Set();
    for (const t of [...fams.flatMap((f) => [f.nombreContacto, f.apellido]), ...ninos.flatMap((x) => [x.nombre, x.apellidos]),
      ...usuarios.map((u) => u.nombre), ...nannies.map((n) => n.nombre)]) {
      for (const w of (t || '').split(/[^A-Za-zÀ-ÿ]+/)) {
        const k = norm(w);
        if (k.length >= 3 && !STOP.has(k)) NOMBRES.add(k);
      }
    }
    const redactar = (txt) =>
      (txt || '')
        .replace(/[^\s@,;()]+@[^\s@,;()]+\.[^\s@,;()]+/g, '[CORREO]')
        .replace(/\+?\d[\d\s-]{6,}\d/g, '[TEL]')
        .replace(/[A-Za-zÀ-ÿ]+/g, (w) => (NOMBRES.has(norm(w)) ? '[NOMBRE]' : w));

    // ---------- servicios (periodo + histórico) ----------
    const servicios = await tx.servicio.findMany({
      where: { fecha: { lt: FIN } },
      include: {
        coloniaToluca: { select: { municipio: true, colonia: true } },
        paquete: { select: { folio: true, horasTotales: true } },
        finanza: true,
        evaluacion: { select: { calificacion: true, volveriaContratar: true, comentario: true, respondidoEn: true, creadoEn: true } },
        ofertas: { select: { nannieId: true, respuesta: true } },
      },
      orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }, { id: 'asc' }],
    });
    const cServ = codigo('SERV', 5);
    const cFam = codigo('FAMILIA', 4);
    for (const s of servicios) { cServ(s.id); cFam(s.familiaId); }
    const paq = (s) => (s.paquete ? `PAQ-${s.paquete.folio}` : '');
    const colonia = (s) => (s.coloniaToluca ? `${s.coloniaToluca.municipio} · ${s.coloniaToluca.colonia}` : '');
    const periodo = servicios.filter((s) => enPeriodo(s.fecha));
    const historico = servicios.filter((s) => s.fecha < INI);

    // 1. SERVICIOS
    escribir(
      '01_servicios.csv',
      ['servicio', 'fecha', 'dia_semana', 'hora_inicio', 'hora_fin', 'duracion_horas', 'tipo_servicio', 'formato', 'paquete',
        'plaza', 'zona', 'colonia_toluca', 'num_ninos', 'estado', 'nannie', 'familia', 'creado_en', 'completado_en',
        'ultima_actualizacion', 'horas_entre_creacion_e_inicio', 'motivo_cancelacion_redactado', 'cancelacion_cobrada',
        'estado_cobro', 'es_desborde', 'cobro_familia'],
      periodo.map((s) => [
        cServ(s.id), ymd(s.fecha), DIAS[s.fecha.getUTCDay()], s.horaInicio, s.horaFin, s.duracionHoras, s.tipoServicio,
        s.formato, paq(s), s.plaza, s.zona, colonia(s), s.numNinos, s.estado, cNannie(s.nannieId), cFam(s.familiaId),
        fmtMX(s.creadoEn), fmtMX(s.completadoEn), fmtMX(s.actualizadoEn),
        r1((inicioMX(s.fecha, s.horaInicio) - s.creadoEn) / 3_600_000),
        s.estado === 'CANCELADO' ? redactar(s.motivoCancelacion) : '', s.estado === 'CANCELADO' ? sn(s.canceladaCobrada) : '',
        s.estadoCobro, sn(s.esDesborde), r2(s.finanza?.cobroFamilia),
      ]),
      periodo.map((s) => ymd(s.fecha)),
    );

    // 1b. SERVICIOS HISTÓRICO (antes del periodo; no mezclar)
    escribir(
      '01b_servicios_HISTORICO.csv',
      ['servicio', 'fecha', 'duracion_horas', 'tipo_servicio', 'formato', 'paquete', 'plaza', 'zona', 'estado', 'nannie',
        'familia', 'origen', 'cobro_familia', 'pago_nannie_guardado'],
      historico.map((s) => [
        cServ(s.id), ymd(s.fecha), s.duracionHoras, s.tipoServicio, s.formato, paq(s), s.plaza, s.zona, s.estado,
        cNannie(s.nannieId), cFam(s.familiaId),
        s.esHistorico ? 'importado (Querétaro)' : s.id.startsWith('hs-') ? 'importado (Excel cuentas)' : 'migrado / previo al arranque',
        r2(s.finanza?.cobroFamilia), r2(s.finanza?.pagoNannie),
      ]),
      historico.map((s) => ymd(s.fecha)),
    );

    // 2. OFERTAS Y RESPUESTAS
    const ofertas = await tx.ofertaRespuesta.findMany({
      where: { servicio: { fecha: { gte: INI, lt: FIN } } },
      include: { servicio: { select: { id: true, fecha: true, horaInicio: true, creadoEn: true, estado: true, nannieId: true } } },
      orderBy: [{ fechaRespuesta: 'asc' }, { id: 'asc' }],
    });
    const cOf = codigo('OF', 4);
    const filasOf = ofertas.map((o) => {
      const ini = inicioMX(o.servicio.fecha, o.servicio.horaInicio);
      return [
        cOf(o.id), cServ(o.servicioId), cNannie(o.nannieId), o.respuesta === 'ACEPTO' ? 'Aceptó' : 'Rechazó',
        fmtMX(o.fechaRespuesta), fmtMX(o.servicio.creadoEn), fmtMX(ini),
        r1((o.fechaRespuesta - o.servicio.creadoEn) / 3_600_000), r1((ini - o.fechaRespuesta) / 3_600_000),
        o.servicio.estado, sn(o.servicio.nannieId !== o.nannieId),
      ];
    });
    // Ofertas vigentes sin respuesta (el sistema no crea fila hasta que la nannie responde).
    let pendientes = 0;
    for (const s of periodo) {
      if (s.estado !== 'OFERTADO' || !s.nannieId) continue;
      if (s.ofertas.some((o) => o.nannieId === s.nannieId)) continue;
      pendientes++;
      filasOf.push([
        `OF-PEND-${String(pendientes).padStart(3, '0')}`, cServ(s.id), cNannie(s.nannieId), 'Pendiente', '', fmtMX(s.creadoEn),
        fmtMX(inicioMX(s.fecha, s.horaInicio)), '', '', s.estado, 'No',
      ]);
    }
    escribir(
      '02_ofertas.csv',
      ['oferta', 'servicio', 'nannie', 'respuesta', 'fecha_respuesta', 'fecha_oferta_APROX_creacion_servicio', 'inicio_servicio',
        'horas_para_responder_APROX', 'horas_de_anticipacion_respuesta', 'estado_actual_servicio', 'servicio_quedo_con_otra_nannie'],
      filasOf,
      ofertas.map((o) => ymd(o.fechaRespuesta)),
    );
    const sinOferta = periodo.filter((s) => ['ACEPTADO', 'COMPLETADO'].includes(s.estado) && s.nannieId
      && !s.ofertas.some((o) => o.nannieId === s.nannieId && o.respuesta === 'ACEPTO')).length;
    if (sinOferta) avisos.push(`02_ofertas: ${sinOferta} servicios asignados/completados del periodo NO tienen respuesta de oferta registrada (asignación directa o reasignación por coordinación). La tasa de rechazo solo describe lo que pasó por oferta.`);

    // 3. FINANZAS POR SERVICIO (+ pago calculado)
    const calc = (s, nivel) =>
      s.nannieId && !s.esHistorico && nivel
        ? pagoDeServicio(s.tipoServicio, s.duracionHoras, s.formato, nivel, {
            paqueteHoras: s.paquete?.horasTotales, ludotecaMontaje: s.ludotecaMontaje, plaza: s.plaza, zona: s.zona,
          })
        : { monto: null };
    let sinNivelMes = 0;
    escribir(
      '03_finanzas_servicio.csv',
      ['servicio', 'fecha', 'estado', 'formato', 'paquete', 'plaza', 'nannie', 'familia', 'cobro_familia', 'tarifa_dia', 'tarifa_noche',
        'ajuste_cobro', 'descuento_nannie', 'comision', 'comision_beneficiaria', 'estado_cobro', 'adeudo_por_definir',
        'pago_guardado_override', 'pago_CALCULADO_nivel_vigente', 'nivel_vigente_hoy', 'pago_CALCULADO_nivel_del_mes',
        'nivel_del_mes_segun_cierre', 'pago_neto_usado', 'origen_pago'],
      periodo.map((s) => {
        const f = s.finanza;
        const nv = s.nannieId ? nivelActual.get(s.nannieId) : null;
        const clave = s.nannieId ? `${s.nannieId}|${s.fecha.getUTCFullYear()}|${s.fecha.getUTCMonth() + 1}` : '';
        const nm = s.nannieId ? nivelDelMes.get(clave) ?? null : null;
        if (s.nannieId && !nm && s.plaza !== 'QUERETARO') sinNivelMes++;
        const override = f?.pagoNannie != null ? Number(f.pagoNannie) : null;
        const pv = calc(s, nv).monto;
        const pm = calc(s, nm ?? nv).monto;
        const desc = f?.descuentoNannie ? Number(f.descuentoNannie) : 0;
        const base = override ?? pv;
        return [
          cServ(s.id), ymd(s.fecha), s.estado, s.formato, paq(s), s.plaza, cNannie(s.nannieId), cFam(s.familiaId),
          r2(f?.cobroFamilia), r2(f?.tarifaDia), r2(f?.tarifaNoche), r2(f?.ajuste), r2(f?.descuentoNannie), r2(f?.comision),
          cNannie(f?.comisionBeneficiarioId), s.estadoCobro, sn(s.estadoCobro === 'POR_DEFINIR'),
          r2(override), r2(pv), nv ?? '', r2(pm), nm ?? (s.nannieId ? 'sin cierre (usa vigente)' : ''),
          base == null ? '' : r2(base - desc),
          !s.nannieId ? 'sin nannie' : override != null ? 'guardado (override)' : pv == null ? 'sin tarifa en tabulador' : 'calculado',
        ];
      }),
      periodo.map((s) => ymd(s.fecha)),
    );
    if (sinNivelMes) avisos.push(`03_finanzas: ${sinNivelMes} servicios de Toluca caen en un mes sin cierre registrado para su nannie; "nivel del mes" usa el nivel vigente.`);

    // 4. NÓMINA SEMANAL (mismo cálculo que la pantalla de Finanzas)
    const fin = new FinanzasService(tx);
    const filasNom = [];
    const semanas = [];
    for (let w = inicioSemana(INI); w < FIN; w = new Date(w.getTime() + 7 * DIA)) semanas.push(w);
    for (const w of semanas) {
      const r = await fin.nomina(ymd(w), ymd(new Date(w.getTime() + 6 * DIA)));
      for (const g of r.nannies) {
        const conMonto = g.servicios.filter((x) => x.monto != null);
        const neto = conMonto.reduce((a, x) => a + x.monto, 0);
        const desc = conMonto.reduce((a, x) => a + (x.descuento ?? 0), 0);
        const bonos = g.bonos.reduce((a, x) => a + x.monto, 0);
        const com = g.comisiones.reduce((a, x) => a + x.monto, 0);
        filasNom.push([
          cNannie(g.nannieId), ymd(w), ymd(new Date(w.getTime() + 6 * DIA)), g.servicios.length,
          g.servicios.length - conMonto.length, r2(neto + desc), r2(desc), r2(bonos), r2(com), r2(g.total),
          sn(g.pagado), g.nivel,
        ]);
      }
    }
    escribir(
      '04_nomina_semanal.csv',
      ['nannie', 'semana_inicio_dom', 'semana_fin_sab', 'servicios_completados', 'servicios_sin_tarifa', 'monto_bruto_servicios',
        'descuentos', 'bonos', 'comisiones', 'monto_neto_total', 'marcado_pagado', 'nivel_usado_en_calculo_(vigente_hoy)'],
      filasNom,
      filasNom.map((f) => f[1]),
    );

    // 5. PAQUETES
    const paquetes = await tx.paquete.findMany({
      where: { fechaContratacion: { lt: FIN } },
      include: { servicios: { select: { fecha: true, estado: true, duracionHoras: true, nannieId: true, plaza: true } } },
      orderBy: { folio: 'asc' },
    });
    const filaPaq = (p) => {
      const vivas = p.servicios.filter((x) => x.estado !== 'CANCELADO' && x.estado !== 'RECHAZADO');
      const comp = p.servicios.filter((x) => x.estado === 'COMPLETADO');
      return [
        `PAQ-${p.folio}`, cFam(p.familiaId), [...new Set(p.servicios.map((x) => x.plaza))].join('; '), p.horasTotales,
        p.horasConsumidas, comp.reduce((a, x) => a + x.duracionHoras, 0),
        comp.filter((x) => enPeriodo(x.fecha)).reduce((a, x) => a + x.duracionHoras, 0), r2(p.precioTotal),
        fmtMX(p.fechaContratacion), p.estado, r2(p.comision), cNannie(p.comisionBeneficiarioId), sn(p.asignacionManual),
        vivas.length, comp.length, new Set(vivas.map((x) => x.nannieId).filter(Boolean)).size,
        sn(p.fechaContratacion >= INI),
      ];
    };
    const hdrPaq = ['paquete', 'familia', 'plaza', 'horas_compradas', 'horas_consumidas_registradas_(programadas)', 'horas_completadas_total',
      'horas_completadas_en_periodo', 'precio', 'fecha_contratacion', 'estado', 'comision', 'comision_beneficiaria',
      'asignacion_manual', 'sesiones_vigentes', 'sesiones_completadas', 'nannies_distintas', 'contratado_en_periodo'];
    const paqPeriodo = paquetes.filter((p) => p.fechaContratacion >= INI || p.servicios.some((x) => enPeriodo(x.fecha)));
    const paqHist = paquetes.filter((p) => !paqPeriodo.includes(p));
    escribir('05_paquetes.csv', hdrPaq, paqPeriodo.map(filaPaq), paqPeriodo.map((p) => ymd(p.fechaContratacion)));
    escribir('05b_paquetes_HISTORICO.csv', hdrPaq, paqHist.map(filaPaq), paqHist.map((p) => ymd(p.fechaContratacion)));

    // 6. INCIDENCIAS
    const incid = await tx.incidencia.findMany({ orderBy: [{ fecha: 'asc' }, { id: 'asc' }] });
    const incPer = incid.filter((i) => i.fecha >= INI && i.fecha < FIN);
    if (incid.length !== incPer.length) avisos.push(`06_incidencias: ${incid.length - incPer.length} incidencias quedan fuera del periodo y no se exportaron.`);
    const cInc = codigo('INC', 3);
    escribir(
      '06_incidencias.csv',
      ['incidencia', 'nannie', 'regla', 'situacion', 'tipo', 'fecha_registro', 'estado', 'aplicada_en', 'strike_activo_hoy'],
      incPer.map((i) => {
        const r = reglaPorNumero(i.regla);
        const tipo = !r ? 'regla fuera de catálogo' : r.noCulposa ? 'Justificada (no penaliza)' : r.esStrike ? 'Strike' : `Directa: ${r.tipo ?? ''}`;
        return [cInc(i.id), cNannie(i.nannieId), i.regla, r?.situacion ?? '', tipo, fmtMX(i.fecha), i.estado, fmtMX(i.aplicadaEn),
          sn(i.estado === 'ACUMULANDO' && !!r?.esStrike)];
      }),
      incPer.map((i) => ymd(i.fecha)),
    );

    // 7. EVALUACIONES DE PAPÁS
    const conEval = periodo.filter((s) => s.evaluacion);
    const cEv = codigo('EV', 4);
    escribir(
      '07_evaluaciones_papas.csv',
      ['evaluacion', 'servicio', 'paquete', 'nannie', 'familia', 'fecha_servicio', 'enlace_generado_en', 'respondida', 'respondido_en',
        'calificacion_1_10', 'volveria_contratar', 'tiene_comentario'],
      conEval.map((s) => {
        const e = s.evaluacion;
        return [cEv(s.id), cServ(s.id), paq(s), cNannie(s.nannieId), cFam(s.familiaId), ymd(s.fecha), fmtMX(e.creadoEn),
          sn(e.respondidoEn != null), fmtMX(e.respondidoEn), e.calificacion ?? '', sn(e.volveriaContratar),
          sn(!!(e.comentario && e.comentario.trim()))];
      }),
      conEval.map((s) => ymd(s.fecha)),
    );

    // 8. DISPONIBILIDAD SEMANAL POR NANNIE
    const disp = await tx.disponibilidad.findMany({
      where: { fecha: { gte: INI, lt: FIN } },
      select: { nannieId: true, fecha: true, horaInicio: true, horaFin: true, estado: true, creadoEn: true },
    });
    const agg = new Map();
    const celda = (nid, w) => {
      const k = `${nid}|${ymd(w)}`;
      if (!agg.has(k)) agg.set(k, { nid, w, disp: 0, bloq: 0, bloques: 0, dias: new Set(), primera: null, asig: 0, nAsig: 0 });
      return agg.get(k);
    };
    for (const d of disp) {
      const c = celda(d.nannieId, inicioSemana(d.fecha));
      const h = horasBloque(d.horaInicio, d.horaFin);
      if (d.estado === 'DISPONIBLE') c.disp += h; else c.bloq += h;
      c.bloques++; c.dias.add(ymd(d.fecha));
      if (!c.primera || d.creadoEn < c.primera) c.primera = d.creadoEn;
    }
    for (const s of periodo) {
      if (!s.nannieId || !['ACEPTADO', 'COMPLETADO'].includes(s.estado)) continue;
      const c = celda(s.nannieId, inicioSemana(s.fecha));
      c.asig += s.duracionHoras; c.nAsig++;
    }
    for (const n of nannies) {
      if (n.estado === 'BAJA') continue; // las de baja solo aparecen si tienen datos
      for (const w of semanas) celda(n.id, w);
    }
    const filasDisp = [...agg.values()]
      .sort((a, b) => cNannie(a.nid).localeCompare(cNannie(b.nid)) || a.w - b.w)
      .map((c) => {
        const recon = c.disp + c.asig;
        return [cNannie(c.nid), estadoNannie.get(c.nid) ?? '', ymd(c.w), c.bloques, c.dias.size, r1(c.disp), r1(c.bloq), c.nAsig,
          r1(c.asig), r1(recon), recon > 0 ? r1((c.asig / recon) * 100) : '', fmtMX(c.primera),
          c.primera ? r1((c.w - c.primera) / DIA) : ''];
      });
    escribir(
      '08_disponibilidad_semanal.csv',
      ['nannie', 'estado_nannie_hoy', 'semana_inicio_dom', 'bloques_registrados', 'dias_con_registro', 'horas_disponibles_restantes',
        'horas_bloqueadas', 'servicios_asignados', 'horas_asignadas', 'horas_disponibles_RECONSTRUIDAS_APROX', 'pct_ocupacion_APROX',
        'primera_captura_de_la_semana', 'dias_de_anticipacion_captura'],
      filasDisp,
      filasDisp.map((f) => f[2]),
    );

    // 9. NANNIES (catálogo)
    const compPer = new Map();
    for (const s of periodo) {
      if (s.estado !== 'COMPLETADO' || !s.nannieId) continue;
      const c = compPer.get(s.nannieId) ?? { n: 0, h: 0 };
      c.n++; c.h += s.duracionHoras; compPer.set(s.nannieId, c);
    }
    escribir(
      '09_nannies.csv',
      ['nannie', 'plaza', 'zonas_queretaro', 'colonias_toluca', 'colonias_con_dias_definidos', 'municipios', 'rango_actual',
        'nivel_mes_actual', 'servicios_de_por_vida', 'estado', 'cuenta_activa', 'alta_registro_en_sistema',
        'ultima_actualizacion_APROX_baja', 'servicios_completados_periodo', 'horas_completadas_periodo'],
      nannies.map((n) => [
        cNannie(n.id), n.plaza, n.plaza === 'QUERETARO' ? n.zonas.join('; ') : '', n.coloniasTrabajo.length,
        n.coloniasTrabajo.filter((c) => c.dias.length).length,
        [...new Set(n.coloniasTrabajo.map((c) => c.colonia.municipio))].join('; '), n.rangoPermanente, n.nivelTarifaMesActual,
        n.serviciosAcumulados, n.estado, n.usuario ? sn(n.usuario.activo) : 'sin cuenta', fmtMX(n.creadoEn),
        n.estado === 'BAJA' ? fmtMX(n.actualizadoEn) : '', compPer.get(n.id)?.n ?? 0, compPer.get(n.id)?.h ?? 0,
      ]),
      nannies.map((n) => ymd(n.creadoEn)),
    );

    // 10. CIERRES DE MES (nivel asignado por mes; para interpretar pagos)
    escribir(
      '10_cierres_mes.csv',
      ['nannie', 'anio', 'mes_que_entra', 'horas_mes_previo', 'nivel_asignado', 'ejecutado_en'],
      cierres.map((c) => [cNannie(c.nannieId), c.anio, c.mes, r2(c.horasMesPrevio), c.nivelAsignado, fmtMX(c.creadoEn)]),
      cierres.map((c) => `${c.anio}-${String(c.mes).padStart(2, '0')}`),
    );

    // CLAVE (CONFIDENCIAL): código → nombre de nannie
    writeFileSync(
      join(OUT, '00_CLAVE_nannies_CONFIDENCIAL.csv'),
      '﻿' + [['codigo', 'nombre', 'plaza', 'estado'], ...nannies.map((n) => [cNannie(n.id), n.nombre, n.plaza, n.estado])]
        .map((r) => r.map(csvEsc).join(',')).join('\r\n'),
      'utf8',
    );

    // Avisos de completitud
    const futuros = periodo.filter((s) => inicioMX(s.fecha, s.horaInicio) > new Date()).length;
    if (futuros) avisos.push(`01_servicios: ${futuros} servicios del periodo son FUTUROS (aún no ocurren); su estado puede cambiar.`);
    const pasadosAbiertos = periodo.filter((s) => ['OFERTADO', 'ACEPTADO'].includes(s.estado) && inicioMX(s.fecha, s.horaFin) < new Date()).length;
    if (pasadosAbiertos) avisos.push(`01_servicios: ${pasadosAbiertos} servicios ya pasaron pero siguen OFERTADO/ACEPTADO (nadie los marcó completados): no entran a nómina ni a horas completadas.`);
    const sinTarifa = filasNom.reduce((a, f) => a + f[4], 0);
    if (sinTarifa) avisos.push(`04_nomina: ${sinTarifa} servicios completados sin tarifa en el tabulador (no suman al monto).`);
  },
  { maxWait: 10_000, timeout: 300_000 },
);

// ---------- resumen ----------
const lineas = [
  `EXPORTACIÓN TRIMESTRAL · periodo ${DESDE} → ${HASTA} · generada ${new Date().toISOString()}`,
  `Carpeta: ${OUT}`,
  '',
  'Archivo                              Filas   Rango de fechas en los datos',
  ...resumen.map((r) => `${r.archivo.padEnd(36)} ${String(r.filas).padStart(6)}   ${r.rango}`),
  '',
  'AVISOS:',
  ...(avisos.length ? avisos.map((a) => `- ${a}`) : ['- (ninguno)']),
  '',
  'NO SE REGISTRA EN EL SISTEMA (no se pudo exportar):',
  '- Hora en que se OFERTÓ un servicio: se usa la creación del servicio como aproximación (falla si se re-ofertó después).',
  '- Hora de CANCELACIÓN: no existe; "ultima_actualizacion" es solo aproximación.',
  '- Monto aplicado POR INCIDENCIA: el descuento va al servicio (descuento_nannie en 03), sin liga a la incidencia.',
  '- Fecha de BAJA de nannie: no existe; se da la última actualización como aproximación.',
  '- Pago a la nannie por servicio: no se guarda (salvo overrides); va CALCULADO con el nivel vigente y con el del mes.',
  '- Disponibilidad original: al aceptar un servicio se consume; las horas "reconstruidas" son aproximadas.',
  '',
  'El archivo 00_CLAVE_nannies_CONFIDENCIAL.csv trae nombres reales: no compartirlo junto con los datos.',
];
writeFileSync(join(OUT, '00_RESUMEN.txt'), lineas.join('\r\n'), 'utf8');
console.log('\n' + lineas.join('\n') + '\n');
await prisma.$disconnect();
