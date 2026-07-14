/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,vue}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        primary: { DEFAULT: '#6C63FF', light: '#9D97FF', dark: '#4A42E0' },
        background: '#F8F6FF',
        surface: '#F0EDFF',
        txt: { DEFAULT: '#2D2B55', secondary: '#8B87B0', hint: '#B8B5D0' },
        success: '#4ECDC4',
        warning: '#FFB347',
        error: '#FF6B6B',
        income: '#4ECDC4',
        expense: '#FF6B6B',
      },
      fontFamily: { sans: ['"Noto Sans SC"', 'sans-serif'] },
      borderRadius: { '2xl': '16px', '3xl': '20px' },
    },
  },
  plugins: [],
};
