/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./views/**/*.ejs", // Ensure this path includes your ejs files
    "./src/stylesheets/*.css",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
