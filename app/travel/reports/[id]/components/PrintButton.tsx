'use client' // <--- Esto es lo que permite el onClick

export function PrintButton() {
  return (
    <button 
      onClick={() => window.print()}
      className="fixed bottom-10 right-10 bg-indigo-600 text-white p-4 rounded-full shadow-lg print:hidden hover:bg-indigo-700 transition-colors z-50 flex items-center justify-center"
      title="Imprimir reporte"
    >
      <span className="text-xl">🖨️</span>
      <span className="ml-2 font-bold">Imprimir</span>
    </button>
  );
}