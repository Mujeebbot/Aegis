import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // ─── Color Tokens ────────────────────────────────────────────────────────
      colors: {
        'aegis-black':      '#080808',
        'aegis-void':       '#0a0a08',
        'aegis-surface':    '#0d0d0a',
        'aegis-raised':     '#111110',
        'aegis-border':     '#242420',
        'aegis-subtle':     '#3a3a34',
        'aegis-dim':        '#5a5a50',
        'aegis-muted':      '#7a7a6c',
        'aegis-off':        '#a0a090',
        'aegis-white':      '#f4f4f0',

        // Green — the signature Aegis color
        'aegis-lime':       '#a8e063',
        'aegis-lime-bright':'#c5f57a',
        'aegis-lime-dim':   '#6aaf2a',

        // Accent
        'aegis-cyan':       '#5be4c8',
        'aegis-amber':      '#e8a040',
        'aegis-red':        '#e05050',
      },

      // ─── Typography ──────────────────────────────────────────────────────────
      fontFamily: {
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
      },

      fontSize: {
        // Display scale
        'display-2xl': ['clamp(3rem, 6vw, 5rem)',   { lineHeight: '1', letterSpacing: '-0.03em', fontWeight: '700' }],
        'display-xl':  ['clamp(2rem, 4.5vw, 3.5rem)', { lineHeight: '1.05', letterSpacing: '-0.025em' }],
        'display-lg':  ['clamp(1.75rem, 3.5vw, 2.75rem)', { lineHeight: '1.1', letterSpacing: '-0.02em' }],

        // Label scale — monospace technical labels
        'label-sm': ['0.6875rem', { lineHeight: '1', letterSpacing: '0.08em' }],
        'label-xs': ['0.5625rem', { lineHeight: '1', letterSpacing: '0.1em' }],
      },

      // ─── Shadows ──────────────────────────────────────────────────────────────
      boxShadow: {
        'lime-sm': '0 0 8px rgba(168, 224, 99, 0.3)',
        'lime-md': '0 0 16px rgba(168, 224, 99, 0.4)',
        'lime-lg': '0 0 40px rgba(168, 224, 99, 0.3)',
        'inner-lime': '0 0 24px rgba(168, 224, 99, 0.05) inset',
        'panel': '0 1px 20px rgba(0,0,0,0.6)',
      },

      // ─── Animation ────────────────────────────────────────────────────────────
      keyframes: {
        orbit: {
          from: { transform: 'rotate(0deg)' },
          to:   { transform: 'rotate(360deg)' },
        },
        'orbit-reverse': {
          from: { transform: 'rotate(0deg)' },
          to:   { transform: 'rotate(-360deg)' },
        },
        drift: {
          '0%':   { transform: 'translate(-50%, -50%) scale(1)' },
          '50%':  { transform: 'translate(-48%, -52%) scale(1.04)' },
          '100%': { transform: 'translate(-52%, -48%) scale(0.97)' },
        },
        'ping-slow': {
          '0%':      { transform: 'scale(1)', opacity: '0.6' },
          '75%, 100%': { transform: 'scale(1.8)', opacity: '0' },
        },
      },
      animation: {
        'orbit-slow':    'orbit 20s linear infinite',
        'orbit-fast':    'orbit 8s linear infinite',
        'orbit-reverse': 'orbit-reverse 30s linear infinite',
        'drift':         'drift 12s ease-in-out infinite alternate',
        'ping-slow':     'ping-slow 2.5s cubic-bezier(0,0,0.2,1) infinite',
      },

      // ─── Border Radius ────────────────────────────────────────────────────────
      borderRadius: {
        'sm': '4px',
        'DEFAULT': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
      },

      // ─── Spacing ──────────────────────────────────────────────────────────────
      maxWidth: {
        '8xl': '88rem',
      },
    },
  },
  plugins: [],
}

export default config
