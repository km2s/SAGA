import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a12',
        surface: {
          DEFAULT: '#11111e',
          2: '#191926',
          3: '#21212f',
        },
        border: {
          DEFAULT: '#2c2c42',
          bright: '#3d3d58',
        },
        gold: '#c9a22a',
        'gold-dark': '#a07818',
        purple: {
          DEFAULT: '#7c3aed',
          bright: '#9d5af5',
        },
        saga: {
          text: '#e2e2f0',
          muted: '#7878a0',
          dim: '#4a4a6a',
          success: '#22c55e',
          danger: '#ef4444',
          warning: '#f59e0b',
        },
      },
      fontFamily: {
        'cinzel-deco': ['"Cinzel Decorative"', 'serif'],
        cinzel: ['Cinzel', 'serif'],
        fell: ['"IM Fell English"', 'serif'],
        almendra: ['"Almendra SC"', 'serif'],
        sans: ['Spectral', 'serif'],
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '10px',
        lg: '16px',
      },
      backgroundImage: {
        'gradient-login':
          'radial-gradient(ellipse at 20% 80%, rgba(124,58,237,0.13) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(201,162,42,0.07) 0%, transparent 50%)',
        'gradient-gold': 'linear-gradient(135deg, #c9a22a, #f0d060, #c9a22a)',
      },
      keyframes: {
        pulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(34,197,94,0.4)' },
          '50%': { boxShadow: '0 0 0 5px rgba(34,197,94,0)' },
        },
      },
      animation: {
        pulse: 'pulse 2s infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
