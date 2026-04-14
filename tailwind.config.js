/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        amber: {
          350: '#FBB830',
        },
      },
    },
  },
  plugins: [],
}
