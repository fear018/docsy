import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

const asArray = (config) => (Array.isArray(config) ? config : [config]);

const config = [
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] },
  ...asArray(coreWebVitals),
  ...asArray(typescript),
  {
    // eslint-plugin-react's auto-detection uses an ESLint 9 API that ESLint 10 dropped.
    // Pinning the version here skips detection entirely.
    settings: { react: { version: '19.3' } },
  },
];

export default config;
