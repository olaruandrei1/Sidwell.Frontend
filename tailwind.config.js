/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: 'var(--color-terminal-bg)',
          surface: 'var(--color-terminal-surface)',
          'surface-light': 'var(--color-terminal-surface-light)',
          border: 'var(--color-terminal-border)',
          accent: 'var(--color-terminal-accent)',
          up: 'var(--color-terminal-up)',
          down: 'var(--color-terminal-down)',
          purple: '#8B5CF6',
          cyan: '#38BDF8',
        }
      },
      fontFamily: {
        sans: ['"Inter"', '"Plus Jakarta Sans"', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Fira Code', 'monospace'],
        serif: ['"Playfair Display"', 'serif'],
      },
      boxShadow: {
        'glow-accent': 'var(--shadow-glow-accent)',
        'glow-up': '0 0 20px -4px rgba(34, 197, 94, 0.3)',
        'glow-down': '0 0 20px -4px rgba(239, 68, 68, 0.3)',
      }
    },
  },
  plugins: [],
}
