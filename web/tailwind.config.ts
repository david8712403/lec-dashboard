import type { Config } from 'tailwindcss';

export default {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './App.tsx',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2f6a5b',
        secondary: '#5b6c66',
        accent: '#b88632',
        success: '#2e7d5b',
        danger: '#b6514a',
      },
    },
  },
  plugins: [],
} satisfies Config;
