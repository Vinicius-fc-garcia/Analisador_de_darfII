/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./App.tsx",
    "./index.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        gov: {
          blue: '#003399',
          yellow: '#FFCC29',
          green: '#009C3B'
        }
      }
    },
  },
  plugins: [],
}