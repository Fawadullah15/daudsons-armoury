import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'theme-bg': '#0A0B0D',
        'theme-surface': '#14161A',
        'theme-surface-2': '#1C1F24',
        'theme-steel': '#8A9099',
        'theme-text': '#F2F0EB',
        'theme-brass': '#C8A24A',
        'theme-signal': '#E4572E',
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'brass-glow': '0 0 25px rgba(200, 162, 74, 0.25)',
        'signal-glow': '0 0 25px rgba(228, 87, 46, 0.35)',
      },
    },
  },
  plugins: [],
};

export default config;
