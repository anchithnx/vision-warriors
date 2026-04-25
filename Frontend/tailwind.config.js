/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        crimson: {
          50:  '#fff1f1',
          100: '#ffdede',
          200: '#ffbcbc',
          300: '#ff8e8e',
          400: '#ff5252',
          500: '#ff1f1f',
          600: '#e60000',
          700: '#c00000',
          800: '#9d0000',
          900: '#820000',
        },
      },
      keyframes: {
        'scan-line': {
          '0%':   { top: '0%',   opacity: '1' },
          '90%':  { top: '100%', opacity: '1' },
          '100%': { top: '100%', opacity: '0' },
        },
        'pulse-ring': {
          '0%':   { transform: 'scale(1)',   opacity: '0.6' },
          '100%': { transform: 'scale(2.2)', opacity: '0' },
        },
        'slide-up': {
          '0%':   { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',     opacity: '1' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'bounce-in': {
          '0%':   { transform: 'scale(0.8)', opacity: '0' },
          '60%':  { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)',   opacity: '1' },
        },
        'progress-fill': {
          '0%':   { width: '0%' },
          '100%': { width: '100%' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'scan-line':    'scan-line 2.2s ease-in-out infinite',
        'pulse-ring':   'pulse-ring 1.5s ease-out infinite',
        'slide-up':     'slide-up 0.5s ease-out forwards',
        'fade-in':      'fade-in 0.4s ease-out forwards',
        'shimmer':      'shimmer 2s linear infinite',
        'bounce-in':    'bounce-in 0.6s ease-out forwards',
        'float':        'float 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
