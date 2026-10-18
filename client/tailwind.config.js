/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#0B0D0C',
        surface: {
          DEFAULT: '#121614',
          2: '#1A1F1C',
        },
        border: {
          DEFAULT: '#2E3532',
        },
        content: {
          primary: '#F4F6F5',
          secondary: '#9AA5A0',
          muted: '#6B7671',
        },
        brand: {
          DEFAULT: '#15803D',
          hover: '#16A34A',
          subtle: '#052E16',
        },
        status: {
          success: '#22C55E',
          warning: '#F59E0B',
          danger: '#EF4444',
          info: '#3B82F6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
