// app/recipes/[slug]/layout.tsx
// Este archivo ayuda a Next.js a reconocer la ruta dinámica

import React from 'react';

export default function DynamicRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    // Simplemente devuelve los hijos sin añadir divs complejos
    <>{children}</> 
  );
}