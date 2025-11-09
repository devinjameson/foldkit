/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'terminal-green': '#00ff41',
        'terminal-green-dim': '#00aa2b',
        'terminal-bg': '#0a0a0a',
        'terminal-red': '#ff2200',
        'terminal-red-dim': '#aa1500',
      },
      fontFamily: {
        terminal: ['VT323', 'monospace'],
      },
    },
  },
  plugins: [],
}
