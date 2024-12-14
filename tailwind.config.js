/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primaryColor: '#787878',
        sendColor:'#e9e8f5',
        chatbotHeaderColor:'#28c1b8',
        botBackgroundColor:'#d8d5fc'
      },
      borderWidth: {
        12: '12px', // Custom width
      },
      maxHeight: {
        'custom': '600px', 
      },
      width: {
        '84': '22rem', 
      },
    },
  },
  plugins: [],
};
