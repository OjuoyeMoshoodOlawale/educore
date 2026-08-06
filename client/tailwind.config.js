/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#1E3A5F', dark: '#16304d', 50: '#EAF0F6' },
        accent: { DEFAULT: '#D4A017', 50: '#FBF3DE' },
        success: '#2E7D32',
        danger: { DEFAULT: '#C62828', light: '#FBEAEA' }
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] }
    }
  },
  plugins: []
};
