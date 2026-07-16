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
        marca: '0 20px 50px -12px rgba(203, 108, 230, 0.25)',
      },
      borderRadius: {
        xl: '0.9rem',
        '2xl': '1.25rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '50%': { transform: 'translate(14px, -24px)' },
        },
        'float-alt': {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '50%': { transform: 'translate(-18px, -16px)' },
        },
        bob: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s ease-out both',
        'pop-in': 'pop-in 0.7s ease-out both',
        float: 'float 9s ease-in-out infinite',
        'float-alt': 'float-alt 11s ease-in-out infinite',
        bob: 'bob 4.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
