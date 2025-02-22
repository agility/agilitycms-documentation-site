module.exports = {
  //mode: "jit",
  content: ["./pages/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  darkMode: false, // or 'media' or 'class'
  theme: {
    container: {
      screens: {
        sm: "1200px",
        md: "1200px",
        lg: "1200px",
        xl: "1200px",
      },
    },
    borderWidth: {
      DEFAULT: "1px",
      0: "0",
      2: "2px",
      3: "3px",
      4: "4px",
      6: "6px",
      8: "8px",
    },
    fontFamily: {
      fontFamily: {
        sans: ['var(--font-mulish)']
      },
      muli: ['var(--font-mulish)', "sans-serif"],
      mono: [
        "Menlo",
        "Monaco",
        "Consolas",
        '"Liberation Mono"',
        '"Courier New"',
        "monospace",
      ],
    },
    extend: {
      width: {
        15.1: "15.1rem",
      },
      colors: {
        transparent: "transparent",
        purple: "#4600A8",
        brightPurple: "#6D06FF",
        lightPurple: "#5800d4",
        offwhite: "#F1F5F9",
        lightGray: "#F4F7FA",
        darkGray: "#8D9FB1",
        darkerGray: "#2A3846",
        darkestGray: "#25303D",
        black: "#171b20",
      },
      gridTemplateColumns: {
        'fullWidth': '256px 1fr',
      }
    },
  },
  variants: {
    extend: {},
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("@tailwindcss/forms"),
    require("@tailwindcss/aspect-ratio"),
    require("nightwind"),
    require("tailwindcss-nested-groups"),
  ],
};
