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
        // Luxury Near-Black Green Hierarchy
        'aegis-black':       '#050806',
        'aegis-void':        '#07100b',
        'aegis-surface':     '#09140d',
        'aegis-raised':      '#0d1d13',
        'aegis-border':      '#162a1d',
        'aegis-subtle':      '#233e2b',
        'aegis-dim':         '#4d6955',
        'aegis-muted':       '#799280',
        'aegis-off':         '#b2c6b7',
        'aegis-white':       '#f5f8f5',

        // Explicit Luxury Green Hierarchy
        'aegis-bg-deep':     '#050806',
        'aegis-bg-base':     '#07100b',
        'aegis-bg-surface':  '#09140d',
        'aegis-bg-raised':   '#0d1d13',
        'aegis-bg-card':     '#0b1810',
        'aegis-bg-glass':    'rgba(9, 20, 13, 0.72)',
        'aegis-border-emerald': 'rgba(168, 224, 99, 0.14)',
        'aegis-border-subtle':  'rgba(255, 255, 255, 0.05)',

        // Green / Lime Accents
        'aegis-lime':        '#a8e063',
        'aegis-lime-bright': '#c5f57a',
        'aegis-lime-dim':    '#589e24',
        'aegis-emerald':     '#10b981',
        'aegis-sage':        '#1d3826',
        'aegis-forest':      '#0b1c11',

        // Functional Accents
        'aegis-cyan':        '#5be4c8',
        'aegis-amber':       '#e8a040',
        'aegis-red':         '#e05050',
      },

      // ─── Typography ──────────────────────────────────────────────────────────
      fontFamily: {
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
      },

      fontSize: {
        // Display scale
        'display-2xl': ['clamp(3rem, 6vw, 5.25rem)', { lineHeight: '0.98', letterSpacing: '-0.035em', fontWeight: '700' }],
        'display-xl':  ['clamp(2.25rem, 4.5vw, 3.75rem)', { lineHeight: '1.02', letterSpacing: '-0.03em' }],
        'display-lg':  ['clamp(1.75rem, 3.5vw, 2.75rem)', { lineHeight: '1.08', letterSpacing: '-0.025em' }],

        // Label scale — monospace technical labels
        'label-sm': ['0.6875rem', { lineHeight: '1', letterSpacing: '0.08em' }],
        'label-xs': ['0.5625rem', { lineHeight: '1', letterSpacing: '0.1em' }],
      },

      // ─── Shadows ──────────────────────────────────────────────────────────────
      boxShadow: {
        'lime-sm': '0 0 8px rgba(168, 224, 99, 0.3)',
        'lime-md': '0 0 16px rgba(168, 224, 99, 0.4)',
        'lime-lg': '0 0 40px rgba(168, 224, 99, 0.3)',
        'glow-emerald': '0 0 35px rgba(168, 224, 99, 0.16)',
        'glow-emerald-lg': '0 0 70px rgba(168, 224, 99, 0.22)',
        'inner-lime': '0 0 24px rgba(168, 224, 99, 0.05) inset',
        'glass-luxury': '0 12px 40px -10px rgba(0, 0, 0, 0.8), 0 0 1px 1px rgba(168, 224, 99, 0.12) inset',
        'panel': '0 1px 20px rgba(0,0,0,0.7)',
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
