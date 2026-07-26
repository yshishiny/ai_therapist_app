/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Organic Design System — indigo/gold variant (Clinician Workspace)
        organic: {
          bg: '#eff0f4',        // Ground
          surface: '#e0e2ea',   // Cards/surfaces
          text: '#1b1e28',      // Primary text
          neutral: {
            100: '#f7f8fa',
            200: '#eceef3',
            300: '#d9dce4',
            400: '#bcc1cc',
            500: '#9ba1af',
            600: '#7d8391',
            700: '#5f6573',
            800: '#444956',
            900: '#2b2f39',
          },
          // Indigo primary — DEFAULT matches the 600 step, so bare
          // `bg-organic-accent` and `bg-organic-accent-600` are the same color.
          accent: {
            DEFAULT: '#5262ad',
            100: '#eef0fb',
            200: '#d9dff6',
            300: '#b6c0ec',
            400: '#8e9cdd',
            500: '#6c7cc9',
            600: '#5262ad',
            700: '#3e4c8a',
            800: '#2b3562',
            900: '#1b213e',
          },
          // Gold secondary — DEFAULT matches the 500 step.
          'accent-2': {
            DEFAULT: '#c9903d',
            100: '#fdf3e0',
            200: '#f8e3bb',
            300: '#efc98a',
            400: '#e0aa5d',
            500: '#c9903d',
            600: '#a9742a',
            700: '#85591f',
            800: '#5f3f16',
            900: '#3d280d',
          },
          danger: '#b23b2d',
        },
      },
      fontFamily: {
        heading: ['Caprasimo', 'serif'],
        body: ['Figtree', 'sans-serif'],
        sans: ['Figtree', 'sans-serif'],
      },
      fontSize: {
        xs: ['11px', { lineHeight: '1.3' }],
        sm: ['13px', { lineHeight: '1.4' }],
        base: ['15px', { lineHeight: '1.5' }],
        lg: ['16px', { lineHeight: '1.6' }],
        xl: ['20px', { lineHeight: '1.4' }],
        '2xl': ['25px', { lineHeight: '1.2' }],
        '3xl': ['32px', { lineHeight: '1.12', letterSpacing: '-0.015em' }],
        '4xl': ['42px', { lineHeight: '1.12', letterSpacing: '-0.015em' }],
        '5xl': ['52px', { lineHeight: '1.12', letterSpacing: '-0.015em' }],
      },
      spacing: {
        'organic-xs': '4.4px',
        'organic-sm': '8.8px',
        'organic-md': '13.2px',
        'organic-lg': '17.6px',
        'organic-xl': '26.4px',
        'organic-2xl': '35.2px',
      },
      borderRadius: {
        'organic-tile': '12px',
        'organic-card': '24px',
        'organic-pill': '999px',
      },
      boxShadow: {
        'organic-sm': '0 1px 2px rgba(43, 47, 57, 0.14)',
        'organic-md': '0 3px 12px rgba(43, 47, 57, 0.14)',
        'organic-lg': '0 16px 40px rgba(43, 47, 57, 0.2)',
      },
      backgroundImage: {
        'gradient-accent': 'linear-gradient(135deg, #5262ad, #8e9cdd)',
        'gradient-sage': 'linear-gradient(135deg, #c9903d, #e0aa5d)',
      },
    },
  },
  plugins: [],
}
