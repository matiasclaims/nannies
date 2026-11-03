'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Printer } from 'lucide-react';
import { api, type ReporteIncidenteDetalle } from '@/lib/api';

const fechaLarga = (iso: string) =>
  new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const money = (n: number) =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });

/** Hoja imprimible del reporte de incidente, con marca Nannies, lista para
 *  guardar como PDF y entregar a los papás (Paula). La abre coordinación. */
export default function HojaIncidentePage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ReporteIncidenteDetalle | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');

  useEffect(() => {
    api
      .incidente(id)
      .then((d) => {
        setData(d);
        setEstado('ok');
      })
      .catch(() => setEstado('error'));
  }, [id]);

  if (estado === 'error') {
    return <p className="p-8 text-center text-sm text-texto-suave">No se pudo cargar el reporte.</p>;
  }
  if (!data) {
    return <p className="p-8 text-center text-sm text-texto-suave">Cargando…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl bg-white p-8 text-texto-fuerte print:p-0">
      <header className="mb-6 flex items-center justify-between border-b border-borde pb-4">
        <Image src="/nannies-logo.png" alt="Nannies" width={120} height={48} className="h-12 w-auto" />
        <div className="text-right">
          <h1 className="text-lg font-bold text-[#17323b]">Reporte de incidencia</h1>
          <p className="text-xs capitalize text-texto-suave">{fechaLarga(data.fechaHoraIncidente)}</p>
        </div>
      </header>

      <div className="mb-5 grid grid-cols-2 gap-3 text-sm">
        <Campo label="Menor" valor={data.menor} />
        <Campo label="Padre, madre o tutor" valor={data.familia} />
        <Campo label="Fecha y hora del incidente" valor={fechaHora(data.fechaHoraIncidente)} />
        <Campo label="Lugar del incidente" valor={data.lugar} />
        <Campo label="Nannie a cargo" valor={data.nannie} />
      </div>

      <div className="space-y-3 text-sm">
        <Cita titulo="Incidente relatado por la Nannie" texto={data.relatoNannie} />
        {data.medidasInmediatas && <Bloque titulo="Medidas aplicadas inmediatamente" texto={data.medidasInmediatas} />}
        {data.evolucionMenor && <Bloque titulo="Evolución del menor" texto={data.evolucionMenor} />}
        {data.doctor && <Bloque titulo="Doctor que realizó la valoración" texto={data.doctor} />}
        {data.fechaConsulta && <Bloque titulo="Fecha de la consulta" texto={fechaLarga(data.fechaConsulta)} />}
        {data.diagnostico && <Bloque titulo="Diagnóstico" texto={data.diagnostico} />}
        {data.tratamiento && <Bloque titulo="Tratamiento indicado" texto={data.tratamiento} />}
        {data.documentacionEntregada && (
          <Bloque titulo="Documentación entregada" texto={data.documentacionEntregada} />
        )}
        {data.medidasNannies && <Bloque titulo="Medidas implementadas por Nannies" texto={data.medidasNannies} />}

        {data.coberturaAplico ? (
          <Bloque
            titulo="Cobertura médica"
            texto={`Atención médica solventada por Nannies, conforme al beneficio de cobertura médica${
              data.paquete
                ? ` incluido en el paquete de ${data.paquete.horasTotales} horas contratado el ${fechaLarga(
                    data.paquete.fechaContratacion,
                  )}`
                : ''
            }.${data.coberturaImporte != null ? ` Importe: ${money(data.coberturaImporte)} MXN.` : ''}`}
          />
        ) : (
          <Bloque
            titulo="Cobertura médica"
            texto="En este caso la cobertura médica no fue aplicable conforme a los términos del beneficio."
          />
        )}

        {data.anexos && <Bloque titulo="Anexos" texto={data.anexos} />}
      </div>

      <div className="mt-8 rounded-xl bg-fondo px-4 py-3 text-center text-xs leading-relaxed text-texto-suave print:bg-white print:px-0">
        En Nannies sabemos que cuidar a un pequeño implica una enorme responsabilidad y no la tomamos a la ligera. Nos
        comprometemos a asumir nuestra parte, aprender de cada experiencia y actuar siempre con sensibilidad, compromiso
        y responsabilidad, porque detrás de cada servicio está lo más importante para una familia: sus hijos.
      </div>

      <div className="mt-8 text-center text-sm">
        <p className="text-texto-suave">Atentamente</p>
        <p className="mt-6 font-semibold text-texto-fuerte">MCEF Paula Ileana Novales Pérez</p>
        <p className="text-xs text-texto-suave">Nannies Child Care</p>
      </div>

      {/* Botón de imprimir — se oculta al imprimir */}
      <div className="mt-6 flex justify-center print:hidden">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-marca-azul px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
        >
          <Printer className="h-4 w-4" /> Imprimir o guardar como PDF
        </button>
      </div>
    </div>
  );
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-texto-suave">{label}</p>
      <p className="font-medium text-texto-fuerte">{valor}</p>
    </div>
  );
}

function Bloque({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div>
      <p className="mb-0.5 text-xs font-semibold text-marca-azul">{titulo}</p>
      <p className="whitespace-pre-line rounded-lg bg-fondo px-3 py-2 text-texto-fuerte print:bg-white print:px-0">
        {texto}
      </p>
    </div>
  );
}

function Cita({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div>
      <p className="mb-0.5 text-xs font-semibold text-marca-azul">{titulo}</p>
      <blockquote className="whitespace-pre-line rounded-lg border-l-2 border-marca-azul bg-fondo px-3 py-2 italic text-texto-fuerte print:bg-white">
        “{texto}”
      </blockquote>
    </div>
  );
}
