import type { Config } from 'tailwindcss'

// Fletcher's palette — Culture Space deck.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F2EFE6',
        pine: '#35705E',
        ink: '#1C1A17',
        navy: '#28305C',
        terracotta: '#B56A43',
        ochre: '#C99A3B',
        walnut: '#4E3424',
        stone: '#9A968C',
      },
      fontFamily: {
        serif: ['Fraunces', 'Cormorant', 'Georgia', 'serif'],
        sans: ['Inter', 'Work Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 1px 2px rgba(28,26,23,0.06), 0 8px 24px rgba(28,26,23,0.06)',
      },
    },
  },
  plugins: [],
} satisfies Config
