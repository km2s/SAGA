import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx,js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Tokens da mesa virtual — variáveis CSS (canais RGB) que acompanham
        // o tema: pergaminho no claro, cripta no escuro (ver globals.css).
        bg: 'rgb(var(--mesa-bg) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--mesa-surface) / <alpha-value>)',
          2: 'rgb(var(--mesa-surface-2) / <alpha-value>)',
          3: 'rgb(var(--mesa-surface-3) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--mesa-border) / <alpha-value>)',
          bright: 'rgb(var(--mesa-border-bright) / <alpha-value>)',
        },
        gold: '#c9a22a',
        'gold-dark': '#a07818',
        'gold-deep': '#9c7a2a',
        purple: {
          DEFAULT: '#7c3aed',
          bright: '#9d5af5',
        },
        saga: {
          text: 'rgb(var(--mesa-text) / <alpha-value>)',
          muted: 'rgb(var(--mesa-muted) / <alpha-value>)',
          dim: 'rgb(var(--mesa-dim) / <alpha-value>)',
          success: '#22c55e',
          danger: '#ef4444',
          warning: '#f59e0b',
        },
        // Paleta medieval "pergaminho & cripta" — variáveis CSS (canais RGB)
        // que trocam de valor com a classe .dark (ver globals.css).
        parchment: 'rgb(var(--parchment) / <alpha-value>)',
        'parchment-deep': 'rgb(var(--parchment-deep) / <alpha-value>)',
        card: 'rgb(var(--card) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        'ink-soft': 'rgb(var(--ink-soft) / <alpha-value>)',
        wax: 'rgb(var(--wax) / <alpha-value>)',
        'wax-deep': 'rgb(var(--wax-deep) / <alpha-value>)',
        ember: 'rgb(var(--ember) / <alpha-value>)',
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
        'seal-crit-shake': {
          '0%, 100%': { transform: 'translate(0,0) rotate(0deg)' },
          '20%': { transform: 'translate(-1px,1px) rotate(-2deg)' },
          '40%': { transform: 'translate(1px,-1px) rotate(2deg)' },
          '60%': { transform: 'translate(-1px,0) rotate(-1deg)' },
          '80%': { transform: 'translate(1px,0) rotate(1deg)' },
        },
      },
      animation: {
        pulse: 'pulse 2s infinite',
        flicker: 'flicker 4s ease-in-out infinite',
        'float-slow': 'float-slow 6s ease-in-out infinite',
        'ink-in': 'ink-in 0.9s ease-out both',
        'seal-crit-shake': 'seal-crit-shake 0.4s ease-in-out 1',
      },
    },
  },
  plugins: [],
} satisfies Config
