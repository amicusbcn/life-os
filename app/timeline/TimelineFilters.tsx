'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { X, Filter } from 'lucide-react'

interface TagData { id: string; name: string }
interface PersonData { id: string; name: string }

export function TimelineFilters({ allTags, allPeople }: { allTags: TagData[], allPeople: PersonData[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Leemos el estado actual de la URL
  const currentTag = searchParams.get('tag') || 'all'
  const currentPerson = searchParams.get('person') || 'all'

  // Función para actualizar la URL sin recargar todo
  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/timeline?${params.toString()}`)
  }

  const clearFilters = () => {
    router.push('/timeline')
  }

  const hasFilters = currentTag !== 'all' || currentPerson !== 'all'

  return (
    <div className="bg-white border-b border-slate-200 px-4 py-3 sticky top-[60px] z-10 flex gap-2 overflow-x-auto no-scrollbar items-center">
      
      {/* Icono decorativo */}
      <div className="text-slate-300 mr-1">
        <Filter className="h-4 w-4" />
      </div>

      {/* FILTRO ETIQUETAS */}
      <Select value={currentTag} onValueChange={(val) => updateFilter('tag', val)}>
        <SelectTrigger className={`h-8 text-xs w-[130px] rounded-full border-dashed ${currentTag !== 'all' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold' : 'text-slate-500'}`}>
          <SelectValue placeholder="Etiqueta" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas las etiquetas</SelectItem>
          {allTags.map(t => (
            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* FILTRO PERSONAS */}
      <Select value={currentPerson} onValueChange={(val) => updateFilter('person', val)}>
        <SelectTrigger className={`h-8 text-xs w-[130px] rounded-full border-dashed ${currentPerson !== 'all' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold' : 'text-slate-500'}`}>
          <SelectValue placeholder="Persona" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas las personas</SelectItem>
          {allPeople.map(p => (
            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* BOTÓN LIMPIAR (Solo si hay filtros) */}
      {hasFilters && (
        <Button 
            variant="ghost" size="icon" onClick={clearFilters} 
            className="h-8 w-8 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50"
        >
            <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}