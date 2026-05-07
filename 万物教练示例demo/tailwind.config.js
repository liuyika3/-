/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        appbg: '#F6F7F9',
      },
      boxShadow: {
        card: '0 8px 18px rgba(15, 23, 42, 0.08)',
      },
      borderRadius: {
        phone: '24px',
      },
    },
  },
  plugins: [],
}

