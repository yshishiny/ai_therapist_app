/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Organic Design System
        organic: {
          bg: '#f5ead8',        // Ground
          surface: '#ebddc5',   // Cards/surfaces
          text: '#201e1d',      // Primary text
          accent: '#c67139',    // Terracotta primary
          'accent-2': '#7a8a5e', // Sage secondary
          neutral: {
            100: '#f9f4ed',
            200: '#eee7db',
            300: '#dcd3c4',
            400: '#c0b6a5',
            500: '#a19786',
            600: '#82796a',
            700: '#645c50',
            800: '#474238',
            900: '#2e2b25',
          },
          accent: {
            100: '#fff2eb',
            200: '#ffe1d0',
            300: '#ffc6a5',
            400: '#f6a06b',
            500: '#d67f48',
            600: '#b2622d',
            700: '#8c491a',
            800: '#643312',
            900: '#402310',
          },
          'accent-2': {
            100: '#f0fae1',
            200: '#e1eecc',
            300: '#ccdbb2',
            400: '#aebf92',
            500: '#8fa073',
            600: '#728157',
            700: '#56633f',
            800: '#3d472b',
            900: '#272e1b',
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
        'organic-sm': '0 1px 2px rgba(46, 43, 37, 0.14)',
        'organic-md': '0 3px 12px rgba(46, 43, 37, 0.12)',
        'organic-lg': '0 16px 40px rgba(46, 43, 37, 0.2)',
      },
      backgroundImage: {
        'gradient-accent': 'linear-gradient(135deg, #c67139, #d67f48)',
        'gradient-sage': 'linear-gradient(135deg, #7a8a5e, #8fa073)',
      },
    },
  },
  plugins: [],
}
