/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
    "./public/**/*.html",
    "./src/**/*.html"
  ],
  theme: {
    extend: {
      colors:{
        'title':'#474747',
        'bgDefault':'#f9f9f9',
      }
    },
  },
  plugins: [],
}