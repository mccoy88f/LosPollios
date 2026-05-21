import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        /** Verde istituzionale — header, primari, link */
        brand: {
          50: '#eef6f2',
          100: '#d5ebe3',
          200: '#a8d4c4',
          300: '#6bb894',
          400: '#3d8f6a',
          500: '#1a6b4a',
          600: '#0f5238',
          700: '#084530',
          800: '#063C25',
          900: '#042f1c',
          950: '#021a10',
        },
        /** Arancione — accenti, focus, evidenziazioni UI */
        accent: {
          50: '#fef8ed',
          100: '#fdecd4',
          200: '#f9d5a5',
          300: '#f4b86b',
          400: '#eca032',
          500: '#E18901',
          600: '#c47301',
          700: '#a35d01',
          800: '#824901',
          900: '#6a3c01',
          950: '#3d2a00',
        },
      },
    },
  },
  plugins: [],
}

export default config
