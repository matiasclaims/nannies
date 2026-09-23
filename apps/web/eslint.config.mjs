import next from 'eslint-config-next';

// Config plana de ESLint 9 para Next 16 (ya no existe `next lint`).
// eslint-config-next v16 exporta directamente un arreglo de config plana.
const eslintConfig = [
  ...next,
  {
    ignores: ['.next/**', 'node_modules/**', '.manual-tmp/**'],
  },
  {
    // Reglas nuevas del React Compiler que Next 16 activó como error: marcan
    // patrones legítimos ya existentes (p. ej. sincronizar estado desde
    // localStorage en un effect). Se dejan como aviso, no bloquean el lint.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
    },
  },
];

export default eslintConfig;
