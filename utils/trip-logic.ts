export type TripDisplayStatus = 'planned' | 'active' | 'completed' | 'closed'

interface TripLogicResult {
  displayStatus: TripDisplayStatus
  label: string
  className: string
  canClose: boolean // Nueva propiedad para tu regla de validación
}

export function getTripVisuals(trip: { start_date: string; end_date: string; status: string }): TripLogicResult {
  const today = new Date().toISOString().split('T')[0]
  
  // 1. Si está CERRADO en base de datos, fin de la historia.
  if (trip.status === 'closed') {
    return {
      displayStatus: 'closed',
      label: '🔒 Cerrado',
      className: 'bg-slate-200 text-slate-600 border-slate-300 line-through decoration-slate-400',
      canClose: false // Ya está cerrado
    }
  }

  // 2. Si está ABIERTO ('open' o cualquier cosa antigua), calculamos según fechas:
  
  // CASO A: FUTURO (Planificado)
  if (trip.start_date > today) {
    return {
      displayStatus: 'planned',
      label: '📅 Planificado',
      className: 'bg-orange-100 text-orange-700 border-orange-200',
      canClose: false // REGLA DE ORO: No puedes cerrar un viaje que no ha empezado
    }
  }

  // CASO B: PASADO (Realizado)
  if (trip.end_date < today) {
    return {
      displayStatus: 'completed',
      label: '🛬 Realizado',
      className: 'bg-blue-100 text-blue-700 border-blue-200',
      canClose: true // Este sí se puede cerrar
    }
  }

  // CASO C: PRESENTE (En curso)
  return {
    displayStatus: 'active',
    label: '🚀 En curso',
    className: 'bg-green-100 text-green-700 border-green-200',
    canClose: true // Puedes cerrarlo si quieres (ej: acabaste antes de tiempo hoy)
  }
}