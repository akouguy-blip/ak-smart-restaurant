/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts,js}'],
  theme: {
    extend: {
      colors: {
        ak: {
          bg: '#0B0908',
          card: '#141210',
          gold: '#C9A876',
          'gold-dim': '#8E7A57',
          cream: '#EFE6D8',
          mute: '#7A7268',
          border: '#1F1C18',
        },
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
