import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: 'var(--ink)',
        parchment: 'var(--parchment)',
        'parchment-dim': 'var(--parchment-dim)',
        clay: 'var(--clay)',
        moss: 'var(--moss)',
        gold: 'var(--gold)',
        wine: 'var(--wine)',
      },
      fontFamily: {
        display: ['var(--font-poppins)', 'sans-serif'],
        body: ['var(--font-montserrat)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
