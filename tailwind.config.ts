import type { Config } from "tailwindcss";

const config: Config = {
  // 1. IMPORTANTE: Revisa que estas rutas incluyan donde tienes tus componentes
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}", // Añade esta si usas carpeta src
  ],
  theme: {
    extend: {
      // 2. Aquí puedes añadir colores personalizados, 
      // pero si dejas el objeto 'colors' vacío dentro de extend, 
      // Tailwind cargará todos los colores por defecto.
      colors: {
        // Ejemplo de color personalizado si quisieras uno muy específico:
        // brand: "#0070f3",
      },
    },
  },
  plugins: [], 
};

export default config;