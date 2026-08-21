'use client';

import { useEffect, useMemo, useState } from 'react';
import { UserPlus, Search, CheckCircle2 } from 'lucide-react';
import {
  api,
  type FamiliaLite,
  type NannieLite,
  type Candidata,
  type ColoniaCat,
  type Plaza,
  type TipoServicio,
} from '@/lib/api';
import { TIPO_LABEL } from '@/lib/dominio';
import { Avatar } from '@/components/avatar';
import { NombreNannie } from '@/components/nombre-nannie';
import { HoraSelect } from '@/components/hora-select';
import { dividirDiaNoche, TARIFA_NOCHE_MIN } from '@/lib/dia-noche';
import {
  ZONAS_QRO,
  COBRO_QRO,
  NIVEL_QRO_LABEL,
  nivelesQro,
  esZonaQro,
  type NivelServicioQro,
} from '@/lib/queretaro';
import { cn } from '@/lib/utils';

const inputCls =
  'w-full rounded-xl border border-borde bg-white px-3 py-2 text-sm outline-none focus:border-marca-azul focus:ring-2 focus:ring-marca-azul/20';

const RANGO_LABEL: Record<string, string> = {
  BASE: 'Base',
  ROOKIE: 'Rookie',
  JUNIOR: 'Junior',
  SENIOR: 'Senior',
};

interface Form {
  familiaId: string;
  plaza: Plaza;
  zona: string;
  coloniaId: string;
  direccion: string;
  tipoServicio: TipoServicio;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  numNinos: number;
}

/** Describe el hueco de una coincidencia aproximada en lenguaje llano. */
function descHueco(c: Candidata): string {
  const h = (min: number) => (min % 60 === 0 ? `${min / 60} h` : `${min} min`);
  const partes: string[] = [];
  if (c.faltaInicioMin > 0) partes.push(`empieza ${h(c.faltaInicioMin)} tarde`);
  if (c.faltaFinMin > 0) partes.push(`termina ${h(c.faltaFinMin)} antes`);
  return partes.join(' y ');
}

// Menú de cobro a familias para servicios individuales (fuente "Nuestros precios").
const COBRO_OPCIONES: { precio: number; incluye: string }[] = [
  { precio: 95, incluye: 'Todos los cuidados' },
  { precio: 110, incluye: '+ Actividades planeadas' },
  { precio: 125, incluye: '+ Seguimiento cada hora' },
  { precio: 140, incluye: '+ Reporte final' },
  { precio: 160, incluye: '+ Cobertura médica' },
];

// Catálogo de estaciones de Ludoteca (fuente Catálogo Ludoteca 2026). Todas por
// hora salvo Snuggle Studio (por niño). El cobro de un servicio = suma de estaciones.
const LUDOTECA_ESTACIONES: { nombre: string; tarifa: number; porNino?: boolean }[] = [
  { nombre: 'Princess Treatment', tarifa: 450 },
  { nombre: 'The Cool Corner', tarifa: 550 },
  { nombre: 'Sensory Kit', tarifa: 450 },
  { nombre: 'Snuggle Studio (peluches)', tarifa: 195, porNino: true },
  { nombre: 'Board Games', tarifa: 450 },
  { nombre: 'Sumo Bumper Boppers', tarifa: 450 },
  { nombre: 'Friendship Bracelets', tarifa: 410 },
  { nombre: 'Art Zone', tarifa: 410 },
  { nombre: 'Baby Zone', tarifa: 450 },
  { nombre: 'My own Tote Bag', tarifa: 550 },
  { nombre: 'The Goo Station (slime)', tarifa: 450 },
  { nombre: 'Cupcake Creators', tarifa: 450 },
  { nombre: 'Mini Designer', tarifa: 550 },
  { nombre: 'Little Builders', tarifa: 410 },
  { nombre: 'Pottery Lab', tarifa: 550 },
];

function calcDuracion(ini: string, fin: string): number | null {
  const [ih, im] = ini.split(':').map(Number);
  const [fh, fm] = fin.split(':').map(Number);
  const mins = fh * 60 + fm - (ih * 60 + im);
  if (mins <= 0 || mins % 60 !== 0) return null; // solo horas completas
  return mins / 60;
}

export default function AsignacionPage() {
  const [familias, setFamilias] = useState<FamiliaLite[]>([]);
  const [nannies, setNannies] = useState<NannieLite[]>([]);
  const [catalogo, setCatalogo] = useState<ColoniaCat[]>([]);
  const [form, setForm] = useState<Form>({
    familiaId: '',
    plaza: 'TOLUCA',
    zona: '',
    coloniaId: '',
    direccion: '',
    tipoServicio: 'DAYCARE',
    fecha: '',
    horaInicio: '09:00',
    horaFin: '13:00',
    numNinos: 1,
  });
  const [candidatas, setCandidatas] = useState<Candidata[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [asignando, setAsignando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [overrideId, setOverrideId] = useState('');
  const [cobrarAPaquete, setCobrarAPaquete] = useState(true);
  // Tarifas por banda (día/noche). Ver dividirDiaNoche: la banda de noche tiene piso $125.
  const [tarifaDia, setTarifaDia] = useState(125);
  const [libreDia, setLibreDia] = useState(false);
  const [tarifaNoche, setTarifaNoche] = useState(140);
  const [libreNoche, setLibreNoche] = useState(false);
  const [cobroLudoteca, setCobroLudoteca] = useState(0);
  // Querétaro: nivel de servicio por banda (el cobro sale del tabulador por zona).
  const [nivelDiaQro, setNivelDiaQro] = useState<NivelServicioQro>('BASICO');
  const [nivelNocheQro, setNivelNocheQro] = useState<NivelServicioQro>('INTERMEDIO');

  const cargarFamilias = () => api.listarFamilias().then(setFamilias).catch(() => undefined);

  useEffect(() => {
    void cargarFamilias();
    api.listarNannies().then(setNannies).catch(() => undefined);
    api.catalogoColonias().then(setCatalogo).catch(() => undefined);
  }, []);

  // Querétaro no ofrece Ludoteca: si queda seleccionada al cambiar de plaza, reajusta.
  useEffect(() => {
    if (form.plaza === 'QUERETARO' && form.tipoServicio === 'LUDOTECA_MOVIL') {
      setForm((f) => ({ ...f, tipoServicio: 'DAYCARE' }));
    }
  }, [form.plaza, form.tipoServicio]);

  const duracion = useMemo(
    () => calcDuracion(form.horaInicio, form.horaFin),
    [form.horaInicio, form.horaFin],
  );

  // Partición día/noche del cobro (frontera 19:00). Un servicio que cruza se
  // cobra en dos bandas; el pago a la nannie no se afecta (va por duración total).
  const { horasDia, horasNoche } = useMemo(
    () => (duracion ? dividirDiaNoche(form.horaInicio, duracion) : { horasDia: 0, horasNoche: 0 }),
    [form.horaInicio, duracion],
  );
  const cobroIndividualTotal =
    (horasDia > 0 ? tarifaDia * horasDia : 0) + (horasNoche > 0 ? tarifaNoche * horasNoche : 0);

  const familiaSel = familias.find((f) => f.id === form.familiaId);
  const paquete = familiaSel?.paqueteActivo ?? null;
  const usaPaquete = paquete !== null && cobrarAPaquete;
  const esQro = form.plaza === 'QUERETARO';
  const esFiesta = form.tipoServicio === 'NANNIE_FIESTA_PLAYDATE';
  const esLudoteca = form.tipoServicio === 'LUDOTECA_MOVIL';

  // Cobro de Querétaro: por zona. Fiesta por hora; individuales con bandas por
  // nivel (día: 3 opciones; noche: solo Interm/Premium).
  const cobroQroZona = esQro && esZonaQro(form.zona) ? COBRO_QRO[form.zona] : null;
  const cobroQroTotal =
    !cobroQroZona || duracion == null
      ? 0
      : esFiesta
        ? cobroQroZona.fiestaHora * duracion
        : (horasDia > 0 ? cobroQroZona.individualHora[nivelDiaQro] * horasDia : 0) +
          (horasNoche > 0 ? cobroQroZona.individualHora[nivelNocheQro] * horasNoche : 0);

  const excedePaquete =
    usaPaquete && paquete !== null && duracion !== null ? duracion > paquete.horasRestantes : false;
  const cobroInvalido =
    !usaPaquete &&
    (esQro
      ? !esZonaQro(form.zona) // en Qro basta con elegir zona válida (niveles con default)
      : esLudoteca
        ? cobroLudoteca <= 0
        : (horasDia > 0 && tarifaDia <= 0) ||
          (horasNoche > 0 && (tarifaNoche <= 0 || tarifaNoche < TARIFA_NOCHE_MIN)) ||
          cobroIndividualTotal <= 0);
  const bloqueaOferta = excedePaquete || cobroInvalido;

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setCandidatas(null);
    setExito('');
  }

  function elegirFamilia(id: string) {
    const fam = familias.find((f) => f.id === id);
    setForm((f) => ({ ...f, familiaId: id, plaza: fam?.plaza ?? f.plaza, zona: fam?.zona ?? f.zona }));
    setCobrarAPaquete(true); // por defecto, cobrar al paquete si la familia tiene uno
    setCandidatas(null);
    setExito('');
  }

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setExito('');
    if (!form.familiaId) return setError('Elige una familia.');
    if (esQro && !form.zona.trim()) return setError('Elige la zona del servicio.');
    if (!esQro && !form.coloniaId) return setError('Elige la colonia del servicio.');
    if (duracion === null || duracion < 3)
      return setError('El horario debe ser en horas completas y de mínimo 3 horas.');
    setBuscando(true);
    try {
      const { candidatas } = await api.recomendar({
        plaza: form.plaza,
        zona: form.zona,
        coloniaId: esQro ? undefined : form.coloniaId,
        fecha: form.fecha,
        horaInicio: form.horaInicio,
        horaFin: form.horaFin,
        tipoServicio: form.tipoServicio,
      });
      setCandidatas(candidatas);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo recomendar.');
    } finally {
      setBuscando(false);
    }
  }

  async function ofertar(nannieId: string) {
    if (!nannieId || duracion === null) return;
    setError('');
    setAsignando(true);
    try {
      await api.asignar({
        familiaId: form.familiaId,
        plaza: form.plaza,
        zona: form.zona,
        coloniaId: esQro ? undefined : form.coloniaId || undefined,
        direccion: form.direccion.trim() || undefined,
        tipoServicio: form.tipoServicio,
        formato: usaPaquete ? 'PAQUETE' : 'INDIVIDUAL',
        paqueteId: usaPaquete && paquete ? paquete.id : undefined,
        tarifaDia: usaPaquete || esLudoteca || esQro || horasDia <= 0 ? undefined : tarifaDia,
        tarifaNoche: usaPaquete || esLudoteca || esQro || horasNoche <= 0 ? undefined : tarifaNoche,
        cobroTotal: !usaPaquete && esLudoteca ? cobroLudoteca : undefined,
        nivelDia: !usaPaquete && esQro && !esFiesta && horasDia > 0 ? nivelDiaQro : undefined,
        nivelNoche: !usaPaquete && esQro && !esFiesta && horasNoche > 0 ? nivelNocheQro : undefined,
        numNinos: form.numNinos,
        fecha: form.fecha,
        horaInicio: form.horaInicio,
        horaFin: form.horaFin,
        duracionHoras: duracion,
        nannieId,
      });
      const nombre =
        nannies.find((n) => n.id === nannieId)?.nombre ??
        candidatas?.find((c) => c.nannieId === nannieId)?.nombre ??
        'la nannie';
      setExito(
        `Servicio ofertado a ${nombre}. Queda pendiente de su respuesta.` +
          (usaPaquete && duracion ? ` Se descontaron ${duracion} h del paquete.` : ''),
      );
      setCandidatas(null);
      setOverrideId('');
      await cargarFamilias(); // refresca el saldo del paquete
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo asignar.');
    } finally {
      setAsignando(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-texto-fuerte">Asignación</h1>
        <p className="text-sm text-texto-suave">
          Captura un servicio y el sistema recomienda nannies según zona y disponibilidad.
        </p>
      </div>

      {exito && (
        <div className="flex items-center gap-2 rounded-2xl bg-marca-verde/15 p-4 text-sm text-[#3b6d11]">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          {exito}
        </div>
      )}

      {/* Nuevo servicio */}
      <form onSubmit={buscar} className="space-y-3 rounded-2xl bg-panel p-5 shadow-card">
        <h2 className="text-sm font-semibold text-texto-fuerte">Nuevo servicio</h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Familia">
            <div className="relative flex gap-2">
              <select
                value={form.familiaId}
                onChange={(e) => elegirFamilia(e.target.value)}
                className={inputCls}
              >
                <option value="">Elegir familia…</option>
                {familias.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nombreContacto}
                  </option>
                ))}
              </select>
              <AltaFamilia
                onCreada={(f) => {
                  setFamilias((prev) => [...prev, f]);
                  elegirFamilia(f.id);
                }}
              />
            </div>
          </Campo>

          <Campo label="Tipo de servicio">
            <select
              value={form.tipoServicio}
              onChange={(e) => set('tipoServicio', e.target.value as TipoServicio)}
              className={inputCls}
            >
              {(Object.keys(TIPO_LABEL) as TipoServicio[])
                .filter((t) => !esQro || t !== 'LUDOTECA_MOVIL')
                .map((t) => (
                  <option key={t} value={t}>
                    {TIPO_LABEL[t]}
                  </option>
                ))}
            </select>
          </Campo>

          <Campo label="Plaza">
            <select
              value={form.plaza}
              onChange={(e) => set('plaza', e.target.value as Plaza)}
              className={inputCls}
            >
              <option value="TOLUCA">Toluca</option>
              <option value="QUERETARO">Querétaro</option>
            </select>
          </Campo>

          <Campo label={esQro ? 'Zona' : 'Colonia'}>
            {esQro ? (
              <select value={form.zona} onChange={(e) => set('zona', e.target.value)} className={inputCls}>
                {!esZonaQro(form.zona) && <option value="">Elegir zona…</option>}
                {ZONAS_QRO.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            ) : (
              <SelectColonia
                catalogo={catalogo}
                coloniaId={form.coloniaId}
                className={inputCls}
                onPick={(id, label) => setForm((f) => ({ ...f, coloniaId: id, zona: label }))}
              />
            )}
          </Campo>

          <div className="sm:col-span-2">
            <Campo label="Dirección del servicio (opcional)">
              <input
                value={form.direccion}
                onChange={(e) => set('direccion', e.target.value)}
                className={inputCls}
                placeholder="Vacía = domicilio de la familia. Si es otra ubicación: dirección + referencias para llegar."
              />
            </Campo>
          </div>

          <Campo label="Fecha">
            <input
              type="date"
              required
              value={form.fecha}
              onChange={(e) => set('fecha', e.target.value)}
              className={inputCls}
            />
          </Campo>

          <Campo label="Nº de niños">
            <input
              type="number"
              min={1}
              max={8}
              value={form.numNinos}
              onChange={(e) => set('numNinos', Number(e.target.value))}
              className={inputCls}
            />
          </Campo>

          <Campo label="Desde">
            <HoraSelect value={form.horaInicio} onChange={(v) => set('horaInicio', v)} className={inputCls} />
          </Campo>

          <Campo label="Hasta">
            <HoraSelect value={form.horaFin} onChange={(v) => set('horaFin', v)} className={inputCls} />
          </Campo>
        </div>

        <p className="text-xs text-texto-suave">
          Duración:{' '}
          {duracion === null ? (
            <span className="text-marca-rojo">horas completas, mínimo 3</span>
          ) : (
            `${duracion} h`
          )}
        </p>

        {/* Cobro: paquete de horas (si la familia tiene uno activo) o suelto */}
        {paquete && (
          <div className="rounded-xl border border-borde bg-fondo p-3">
            <p className="mb-2 text-xs font-medium text-texto-suave">Cobro del servicio</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label
                className={cn(
                  'flex flex-1 cursor-pointer items-start gap-2 rounded-lg border p-2 text-xs',
                  cobrarAPaquete ? 'border-marca-azul bg-marca-azul/5' : 'border-borde',
                )}
              >
                <input
                  type="radio"
                  name="cobro"
                  checked={cobrarAPaquete}
                  onChange={() => setCobrarAPaquete(true)}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-semibold text-texto-fuerte">Descontar del paquete</span>
                  <br />
                  Quedan <strong>{paquete.horasRestantes} h</strong> de {paquete.horasTotales} h
                </span>
              </label>
              <label
                className={cn(
                  'flex flex-1 cursor-pointer items-start gap-2 rounded-lg border p-2 text-xs',
                  !cobrarAPaquete ? 'border-marca-azul bg-marca-azul/5' : 'border-borde',
                )}
              >
                <input
                  type="radio"
                  name="cobro"
                  checked={!cobrarAPaquete}
                  onChange={() => setCobrarAPaquete(false)}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-semibold text-texto-fuerte">Servicio suelto</span>
                  <br />
                  Cobro por servicio (elige el monto)
                </span>
              </label>
            </div>
            {excedePaquete && (
              <p className="mt-2 text-xs text-marca-rojo">
                El servicio ({duracion} h) excede el saldo del paquete ({paquete.horasRestantes} h).
                Reduce el horario, renueva el paquete o cóbralo como servicio suelto.
              </p>
            )}
          </div>
        )}

        {/* Querétaro: cobro por zona. Fiesta por hora; individuales con bandas
            por nivel (día: 3 opciones; noche desde 19:00: solo Interm/Premium). */}
        {!usaPaquete && esQro && (
          <div className="rounded-xl border border-borde bg-fondo p-3">
            <p className="mb-2 text-xs font-medium text-texto-suave">
              Cobro a la familia (Querétaro{form.zona ? ` · ${form.zona}` : ''})
              {!esFiesta && horasDia > 0 && horasNoche > 0 && (
                <span className="text-marca-morado"> · el horario cruza día/noche</span>
              )}
            </p>
            {!esZonaQro(form.zona) ? (
              <p className="text-xs text-marca-rojo">Elige la zona de Querétaro para tarifar.</p>
            ) : esFiesta ? (
              <p className="text-xs text-texto-suave">
                Nannie de fiesta:{' '}
                <strong className="text-texto-fuerte">${cobroQroZona!.fiestaHora}/h</strong>
                {duracion != null && ` × ${duracion} h = `}
                {duracion != null && (
                  <strong className="text-texto-fuerte">
                    ${cobroQroTotal.toLocaleString('es-MX')}
                  </strong>
                )}
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  {horasDia > 0 && (
                    <BandaNivelQro
                      label="Día (hasta 19:00)"
                      horas={horasDia}
                      zona={form.zona}
                      nivel={nivelDiaQro}
                      setNivel={setNivelDiaQro}
                      esNoche={false}
                    />
                  )}
                  {horasNoche > 0 && (
                    <BandaNivelQro
                      label="Noche (19:00–01:00)"
                      horas={horasNoche}
                      zona={form.zona}
                      nivel={nivelNocheQro}
                      setNivel={setNivelNocheQro}
                      esNoche
                    />
                  )}
                </div>
                {duracion != null && cobroQroTotal > 0 && (
                  <p className="mt-2 text-xs text-texto-suave">
                    Cobro total:{' '}
                    <strong className="text-texto-fuerte">
                      ${cobroQroTotal.toLocaleString('es-MX')}
                    </strong>
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* Cobro individual por bandas día/noche (frontera 19:00). Si el horario
            cruza, aparecen las dos bandas; cada una a su tarifa/hora. */}
        {!usaPaquete && !esLudoteca && !esQro && (
          <div className="rounded-xl border border-borde bg-fondo p-3">
            <p className="mb-2 text-xs font-medium text-texto-suave">
              Cobro a la familia (por hora)
              {horasDia > 0 && horasNoche > 0 && (
                <span className="text-marca-morado"> · el horario cruza día/noche</span>
              )}
            </p>
            <div className="space-y-2">
              {horasDia > 0 && (
                <BandaCobro
                  label="Día (hasta 19:00)"
                  horas={horasDia}
                  tarifa={tarifaDia}
                  setTarifa={setTarifaDia}
                  libre={libreDia}
                  setLibre={setLibreDia}
                  piso={0}
                />
              )}
              {horasNoche > 0 && (
                <BandaCobro
                  label="Noche (19:00–07:00)"
                  horas={horasNoche}
                  tarifa={tarifaNoche}
                  setTarifa={setTarifaNoche}
                  libre={libreNoche}
                  setLibre={setLibreNoche}
                  piso={TARIFA_NOCHE_MIN}
                />
              )}
            </div>
            {duracion !== null && cobroIndividualTotal > 0 && (
              <p className="mt-2 text-xs text-texto-suave">
                Cobro total:{' '}
                <strong className="text-texto-fuerte">
                  ${cobroIndividualTotal.toLocaleString('es-MX')}
                </strong>{' '}
                {horasDia > 0 && horasNoche > 0
                  ? `(día $${tarifaDia}×${horasDia} h + noche $${tarifaNoche}×${horasNoche} h)`
                  : horasNoche > 0
                    ? `($${tarifaNoche}/h × ${horasNoche} h de noche)`
                    : `($${tarifaDia}/h × ${horasDia} h)`}
              </p>
            )}
          </div>
        )}

        {/* Ludoteca: cobro por estaciones (varias) — se suma */}
        {!usaPaquete && esLudoteca && (
          <LudotecaPicker duracion={duracion} numNinos={form.numNinos} onTotal={setCobroLudoteca} />
        )}

        {error && <p className="text-sm text-marca-rojo">{error}</p>}

        <button
          type="submit"
          disabled={buscando}
          className="flex items-center gap-2 rounded-xl bg-marca-azul px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
        >
          <Search className="h-4 w-4" />
          {buscando ? 'Buscando…' : 'Buscar nannies disponibles'}
        </button>
      </form>

      {/* Recomendación */}
      {candidatas !== null && (
        <div className="space-y-3 rounded-2xl bg-panel p-5 shadow-card">
          <h2 className="text-sm font-semibold text-texto-fuerte">
            Recomendación ({candidatas.length})
          </h2>

          {candidatas.length === 0 ? (
            <p className="text-sm text-texto-suave">
              Ninguna nannie cumple zona + disponibilidad para ese horario. Puedes ofertar de todos
              modos a alguien más abajo (override).
            </p>
          ) : (
            <ul className="space-y-2">
              {candidatas.map((c, i) => (
                <li
                  key={c.nannieId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-borde p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar foto={c.foto} nombre={c.nombre} color={c.color} size={40} />
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-medium text-texto-fuerte">
                        {i === 0 && !c.aproximada && (
                          <span className="rounded-full bg-marca-azul/15 px-2 py-0.5 text-[10px] font-semibold text-marca-azul">
                            Sugerida
                          </span>
                        )}
                        {c.aproximada && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                            Aproximada
                          </span>
                        )}
                        <NombreNannie nombre={c.nombre} color={c.color} />
                      </p>
                      <p className="text-xs text-texto-suave">
                        Disponible {c.bloque} · {RANGO_LABEL[c.rango]} · {c.serviciosSemana} servicios esta semana
                        {c.distanciaKm != null
                          ? ` · a ${c.distanciaKm} km`
                          : c.zonas.length
                            ? ` · ${c.zonas.join(', ')}`
                            : ''}
                      </p>
                      {c.aproximada && (
                        <p className="text-xs text-amber-700">No cubre exacto: {descHueco(c)}.</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => ofertar(c.nannieId)}
                    disabled={asignando || bloqueaOferta}
                    className="shrink-0 rounded-lg bg-marca-azul px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    Ofertar
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Override */}
          <div className="rounded-xl bg-fondo p-3">
            <p className="mb-2 text-xs font-medium text-texto-suave">
              Asignar a otra nannie (override) — fuera de la recomendación:
            </p>
            <div className="flex gap-2">
              <select
                value={overrideId}
                onChange={(e) => setOverrideId(e.target.value)}
                className={cn(inputCls, 'flex-1')}
              >
                <option value="">Elegir nannie…</option>
                {nannies.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.nombre} · {n.zonas.join(', ')}
                  </option>
                ))}
              </select>
              <button
                onClick={() => ofertar(overrideId)}
                disabled={!overrideId || asignando || bloqueaOferta}
                className="shrink-0 rounded-lg border border-marca-azul px-3 py-1.5 text-xs font-semibold text-marca-azul disabled:opacity-50"
              >
                Ofertar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Una banda de cobro (día o noche): menú de tarifa/hora + "otra tarifa" libre.
 *  `piso` filtra el menú (noche = solo ≥ $125). */
function BandaCobro({
  label,
  horas,
  tarifa,
  setTarifa,
  libre,
  setLibre,
  piso,
}: {
  label: string;
  horas: number;
  tarifa: number;
  setTarifa: (n: number) => void;
  libre: boolean;
  setLibre: (b: boolean) => void;
  piso: number;
}) {
  const opciones = COBRO_OPCIONES.filter((o) => o.precio >= piso);
  return (
    <div>
      <p className="mb-1 text-[11px] font-medium text-texto-suave">
        {label} · {horas} h
      </p>
      <div className="flex flex-wrap gap-2">
        <select
          value={libre ? 'libre' : String(tarifa)}
          onChange={(e) => {
            if (e.target.value === 'libre') {
              setLibre(true);
            } else {
              setLibre(false);
              setTarifa(Number(e.target.value));
            }
          }}
          className={cn(inputCls, 'flex-1')}
        >
          {opciones.map((o) => (
            <option key={o.precio} value={o.precio}>
              ${o.precio}/h · {o.incluye}
            </option>
          ))}
          <option value="libre">Otra tarifa…</option>
        </select>
        {libre && (
          <input
            type="number"
            min={piso || 1}
            value={tarifa}
            onChange={(e) => setTarifa(Number(e.target.value))}
            className={cn(inputCls, 'w-32')}
            placeholder="Tarifa $/h"
          />
        )}
      </div>
    </div>
  );
}

/** Banda de nivel de servicio en Querétaro (día/noche). El cobro sale del
 *  tabulador por zona; de noche (desde 19:00) no está disponible Básico. */
function BandaNivelQro({
  label,
  horas,
  zona,
  nivel,
  setNivel,
  esNoche,
}: {
  label: string;
  horas: number;
  zona: string;
  nivel: NivelServicioQro;
  setNivel: (n: NivelServicioQro) => void;
  esNoche: boolean;
}) {
  const opciones = nivelesQro(esNoche);
  const rates = esZonaQro(zona) ? COBRO_QRO[zona].individualHora : null;
  return (
    <div>
      <p className="mb-1 text-[11px] font-medium text-texto-suave">
        {label} · {horas} h
      </p>
      <select
        value={nivel}
        onChange={(e) => setNivel(e.target.value as NivelServicioQro)}
        className={inputCls}
      >
        {opciones.map((n) => (
          <option key={n} value={n}>
            {NIVEL_QRO_LABEL[n]}
            {rates ? ` · $${rates[n]}/h` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Selector de estaciones de Ludoteca: varias estaciones, cobro = suma. */
function LudotecaPicker({
  duracion,
  numNinos,
  onTotal,
}: {
  duracion: number | null;
  numNinos: number;
  onTotal: (t: number) => void;
}) {
  const [items, setItems] = useState<Record<number, number>>({});

  const total = Object.entries(items).reduce(
    (s, [i, cant]) => s + LUDOTECA_ESTACIONES[Number(i)].tarifa * cant,
    0,
  );

  useEffect(() => {
    onTotal(total);
  }, [total, onTotal]);

  function toggle(i: number) {
    setItems((prev) => {
      const next = { ...prev };
      if (i in next) delete next[i];
      else next[i] = LUDOTECA_ESTACIONES[i].porNino ? Math.max(1, numNinos) : Math.max(1, duracion ?? 1);
      return next;
    });
  }

  return (
    <div className="rounded-xl border border-borde bg-fondo p-3">
      <p className="mb-2 text-xs font-medium text-texto-suave">Estaciones de Ludoteca (cobro)</p>
      <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
        {LUDOTECA_ESTACIONES.map((e, i) => {
          const sel = i in items;
          return (
            <div key={e.nombre} className="flex items-center gap-2 text-xs">
              <label className="flex flex-1 cursor-pointer items-center gap-2">
                <input type="checkbox" checked={sel} onChange={() => toggle(i)} />
                <span className={cn(sel && 'font-medium text-texto-fuerte')}>{e.nombre}</span>
                <span className="text-texto-suave">
                  ${e.tarifa}
                  {e.porNino ? '/niño' : '/h'}
                </span>
              </label>
              {sel && (
                <input
                  type="number"
                  min={1}
                  value={items[i]}
                  onChange={(ev) =>
                    setItems((prev) => ({ ...prev, [i]: Math.max(1, Number(ev.target.value)) }))
                  }
                  title={e.porNino ? 'niños' : 'horas'}
                  className="w-14 rounded-lg border border-borde bg-white px-1.5 py-0.5 text-xs outline-none focus:border-marca-azul"
                />
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-texto-suave">
        Cobro total: <strong className="text-texto-fuerte">${total.toLocaleString('es-MX')}</strong>
        {total <= 0 && <span className="text-marca-rojo"> · elige al menos una estación</span>}
      </p>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-texto-suave">{label}</span>
      {children}
    </label>
  );
}

function AltaFamilia({ onCreada }: { onCreada: (f: FamiliaLite) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState('');
  const [plaza, setPlaza] = useState<Plaza>('TOLUCA');
  const [zona, setZona] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (!nombre.trim()) return;
    setGuardando(true);
    try {
      const f = await api.crearFamilia({ nombreContacto: nombre, plaza, zona: zona || undefined });
      onCreada(f);
      setAbierto(false);
      setNombre('');
      setZona('');
    } finally {
      setGuardando(false);
    }
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        title="Nueva familia"
        className="grid h-[38px] w-10 shrink-0 place-items-center rounded-xl border border-borde text-marca-azul hover:bg-fondo"
      >
        <UserPlus className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="absolute right-0 top-11 z-20 w-64 rounded-xl border border-borde bg-panel p-3 shadow-card">
      <p className="mb-2 text-xs font-medium text-texto-fuerte">Nueva familia</p>
      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Nombre de contacto"
        className={cn(inputCls, 'mb-2')}
      />
      <div className="mb-2 flex gap-2">
        <select value={plaza} onChange={(e) => setPlaza(e.target.value as Plaza)} className={inputCls}>
          <option value="TOLUCA">Toluca</option>
          <option value="QUERETARO">Querétaro</option>
        </select>
        <input
          value={zona}
          onChange={(e) => setZona(e.target.value)}
          placeholder="Zona"
          className={inputCls}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={guardar}
          disabled={guardando || !nombre.trim()}
          className="flex-1 rounded-lg bg-marca-azul py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="rounded-lg border border-borde px-3 py-1.5 text-xs text-texto-suave"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

/** Buscador de colonia (Toluca) para el servicio. Elige del catálogo → fija
 *  la colonia (coordenadas para el match por km) y su nombre como zona. */
function SelectColonia({
  catalogo,
  coloniaId,
  onPick,
  className,
}: {
  catalogo: ColoniaCat[];
  coloniaId: string;
  onPick: (id: string, label: string) => void;
  className?: string;
}) {
  const [q, setQ] = useState('');
  const [abierto, setAbierto] = useState(false);
  const sel = catalogo.find((c) => c.id === coloniaId);
  const res = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return catalogo.filter((c) => `${c.colonia} ${c.municipio}`.toLowerCase().includes(t)).slice(0, 12);
  }, [q, catalogo]);

  return (
    <div className="relative">
      <input
        value={abierto ? q : sel ? `${sel.colonia} · ${sel.municipio}` : q}
        onChange={(e) => { setQ(e.target.value); setAbierto(true); }}
        onFocus={() => { setAbierto(true); setQ(''); }}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        placeholder="Buscar colonia…"
        className={className}
      />
      {abierto && res.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-borde bg-panel shadow-card">
          {res.map((c) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={() => { onPick(c.id, c.colonia); setAbierto(false); }}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-fondo"
            >
              <span className="text-texto-fuerte">{c.colonia}</span>
              <span className="text-xs text-texto-suave"> · {c.municipio}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
