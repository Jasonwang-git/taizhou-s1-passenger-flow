/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        hud: {
          bg: '#020814',
          panel: 'rgba(6, 18, 36, 0.52)',
          panelDeep: 'rgba(4, 14, 28, 0.72)',
          border: 'rgba(56, 189, 248, 0.32)',
          borderStrong: 'rgba(34, 211, 238, 0.65)',
          cyan: '#22d3ee',
          cyanDim: '#0e7490',
          warn: '#f59e0b',
          danger: '#f87171',
        },
        panel: {
          DEFAULT: 'rgba(6, 18, 36, 0.52)',
          border: 'rgba(56, 189, 248, 0.32)',
          hover: 'rgba(10, 28, 52, 0.8)',
        },
        accent: {
          cyan: '#22d3ee',
          blue: '#38bdf8',
          purple: '#a78bfa',
        },
      },
      fontFamily: {
        sans: ['"Microsoft YaHei"', '"PingFang SC"', 'system-ui', 'sans-serif'],
        mono: ['"DIN Alternate"', '"JetBrains Mono"', 'Consolas', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 28px rgba(34, 211, 238, 0.22)',
        'glow-sm': '0 0 14px rgba(34, 211, 238, 0.16)',
        'glow-lg': '0 0 48px rgba(34, 211, 238, 0.18)',
        panel: '0 12px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(34, 211, 238, 0.08)',
      },
      backgroundImage: {
        'hud-grid':
          'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(34,211,238,0.12), transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(14,116,144,0.08), transparent 40%), linear-gradient(180deg, #020814 0%, #061428 45%, #020814 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-pulse': 'glowPulse 2.8s ease-in-out infinite',
      },
      keyframes: {
        glowPulse: {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
