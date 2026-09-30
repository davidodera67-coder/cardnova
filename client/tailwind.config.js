/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        fog: "#EDEFF3",
        fogDeep: "#E2E5EC",
        ink: "#14171C",
        coral: "#FF5A36",
        blue: "#1C3FAA",
        brass: "#B08D57",
        mist: "#8A8F98",
      },
    },
  },
  plugins: [],
};
