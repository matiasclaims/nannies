// Genera los PDFs del manual por rol desde la fuente única (src/lib/manual.ts).
// Uso: node scripts/gen-manual-pdf.mjs   (desde apps/web)
// Requiere Chrome instalado (usa --headless --print-to-pdf). Repetible: correr
// al actualizar el manual de cualquier módulo.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const web = resolve(here, '..');
const tmp = join(web, '.manual-tmp');
const publicDir = join(web, 'public');

const CHROME =
  process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

mkdirSync(tmp, { recursive: true });

// 1) Compilar la fuente TS (sin imports) a ESM.
execFileSync('npx', ['tsc', join('src', 'lib', 'manual.ts'), '--outDir', tmp, '--module', 'esnext', '--target', 'es2020', '--skipLibCheck'], {
  cwd: web,
  stdio: 'inherit',
  shell: true,
});
const { MANUAL } = await import(pathToFileURL(join(tmp, 'manual.js')).href);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function seccionHtml(s) {
  return `<section>
    <h3>${esc(s.titulo)}</h3>
    ${s.intro ? `<p>${esc(s.intro)}</p>` : ''}
    ${s.pasos ? `<ol>${s.pasos.map((p) => `<li>${esc(p)}</li>`).join('')}</ol>` : ''}
    ${s.nota ? `<p class="nota"><strong>Nota:</strong> ${esc(s.nota)}</p>` : ''}
  </section>`;
}

function docHtml(rolLabel, publico) {
  const caps = MANUAL.map(
    (c) => `<div class="cap">
      <h2>${esc(c.modulo)} · ${esc(c.nombre)}</h2>
      ${(c.contenido[publico] || []).map(seccionHtml).join('')}
    </div>`,
  ).join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #0F172A; margin: 0; }
    .head { border-bottom: 3px solid #0CC0DF; padding: 0 0 10px; margin: 0 0 18px; }
    .head h1 { font-size: 20px; margin: 0; }
    .head .rol { display: inline-block; margin-top: 4px; font-size: 12px; color: #fff; background: #0CC0DF; border-radius: 999px; padding: 2px 10px; }
    .cap { break-inside: avoid; margin: 0 0 22px; }
    .cap h2 { font-size: 16px; color: #0CC0DF; border-bottom: 1px solid #E6EDF5; padding-bottom: 4px; }
    section { break-inside: avoid; margin: 0 0 12px; }
    h3 { font-size: 13px; margin: 10px 0 4px; }
    p { font-size: 12px; line-height: 1.5; margin: 4px 0; }
    ol { font-size: 12px; line-height: 1.5; margin: 4px 0 4px 18px; padding: 0; }
    li { margin: 2px 0; }
    .nota { background: #F4F7FB; border-left: 3px solid #9DCD5A; padding: 6px 10px; border-radius: 4px; color: #334155; }
  </style></head><body>
    <div class="head"><h1>Manual de usuario · Nannies Child Care</h1><div class="rol">${esc(rolLabel)}</div></div>
    ${caps}
  </body></html>`;
}

const salidas = [
  { rol: 'Directora', publico: 'coordinacion', pdf: 'manual-directora.pdf' },
  { rol: 'Subdirectora', publico: 'coordinacion', pdf: 'manual-subdirectora.pdf' },
  { rol: 'Nannie', publico: 'nannie', pdf: 'manual-nannie.pdf' },
];

for (const s of salidas) {
  const htmlPath = join(tmp, s.pdf.replace('.pdf', '.html'));
  writeFileSync(htmlPath, docHtml(s.rol, s.publico), 'utf8');
  execFileSync(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-pdf-header-footer',
      `--print-to-pdf=${join(publicDir, s.pdf)}`,
      pathToFileURL(htmlPath).href,
    ],
    { stdio: 'inherit' },
  );
  console.log('PDF generado:', s.pdf);
}

rmSync(tmp, { recursive: true, force: true });
console.log('Listo: 3 PDFs regenerados en public/.');
