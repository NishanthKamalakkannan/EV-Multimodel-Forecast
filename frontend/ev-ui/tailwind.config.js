/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1b4332",
        accent: "#2d6a4f",
        soft: "#d8f3dc",
        bg: "#f5f7fa"
      }
    }
  },
  plugins: [],
};
