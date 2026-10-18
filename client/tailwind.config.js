/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#0B0D0C',
        surface: '#121614',
        'surface-2': '#1A1F1C',
        'border-default': '#2E3532',
        border: '#2E3532',
        primary: '#F4F6F5',
        secondary: '#9AA5A0',
        muted: '#6B7671',
        brand: '#15803D',
        'brand-hover': '#16A34A',
        'brand-subtle': '#052E16',
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#3B82F6',
      },
      textColor: {
        primary: '#F4F6F5',
        secondary: '#9AA5A0',
        muted: '#6B7671',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
