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
        'gold-deep': '#9c7a2a',
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
        // Paleta medieval "pergaminho & cripta" (template Saga)
        parchment: '#f3e9d2',
        'parchment-deep': '#e6d5ac',
        ink: '#33291d',
        'ink-soft': '#5f5040',
        wax: '#8f3a24',
        'wax-deep': '#6a2817',
        ember: '#d9662b',
        crypt: '#16171f',
        'crypt-deep': '#0b0c11',
      },
      fontFamily: {
        'cinzel-deco': ['"Cinzel Decorative"', 'serif'],
        cinzel: ['Cinzel', 'serif'],
        cormorant: ['"Cormorant Garamond"', 'serif'],
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
        flicker: {
          '0%, 100%': { opacity: '1' },
          '45%': { opacity: '0.88' },
          '50%': { opacity: '0.96' },
          '55%': { opacity: '0.9' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-8px) rotate(0.5deg)' },
        },
        'ink-in': {
          '0%': { opacity: '0', transform: 'translateY(12px)', filter: 'blur(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)', filter: 'blur(0)' },
        },
      },
      animation: {
        pulse: 'pulse 2s infinite',
        flicker: 'flicker 4s ease-in-out infinite',
        'float-slow': 'float-slow 6s ease-in-out infinite',
        'ink-in': 'ink-in 0.9s ease-out both',
      },
    },
  },
  plugins: [],
} satisfies Config
