import type { Config } from 'tailwindcss';

/**
 * Piel "Claro" — paleta de marca Nannies (validada por la clienta).
 * Acento azul #0CC0DF; rosa/morado/verde/rojo para KPIs y estados.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        marca: {
          rosa: '#FF66C4',
          azul: '#0CC0DF',
          morado: '#CB6CE6',
          verde: '#9DCD5A',
          rojo: '#FF5757',
        },
        // Superficies de la piel "Claro"
        fondo: '#F4F7FB',
        panel: '#FFFFFF',
        borde: '#E6EDF5',
        texto: {
          fuerte: '#0F172A',
          suave: '#64748B',
        },
      },
      boxShadow: {
        card: '0 1px 3px rgba(15, 23, 42, 0.06), 0 8px 24px rgba(15, 23, 42, 0.05)',
      },
      borderRadius: {
        xl: '0.9rem',
        '2xl': '1.25rem',
      },
    },
  },
  plugins: [],
};

export default config;
