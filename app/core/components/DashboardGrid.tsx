'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import LoadIcon from '@/utils/LoadIcon'
import { Button } from "@/components/ui/button"
import { ArrowLeft } from 'lucide-react'
import type { AppModule } from '@/types/users'

interface DashboardGridProps {
  modules: AppModule[]
}

export function DashboardGrid({ modules }: DashboardGridProps) {
  // 1. Agrupar módulos por carpeta
  const groupedModules = useMemo(() => {
    const groups: Record<string, AppModule[]> = {}
    
    // Primero ordenamos los módulos por su campo 'order'
    const modulesSortedByOrder = [...modules].sort((a, b) => (a.order || 999) - (b.order || 999))

    modulesSortedByOrder.forEach(mod => {
      // Si no tiene carpeta, asignamos "General"
      const folderName = mod.folder || 'General'
      if (!groups[folderName]) groups[folderName] = []
      groups[folderName].push(mod)
    })

    return groups
  }, [modules])

  // 2. Obtener nombres de carpetas y ORDENAR ALFABÉTICAMENTE
  const folderNames = useMemo(() => {
    return Object.keys(groupedModules).sort((a, b) => 
      // localeCompare asegura que "Álbum" vaya antes que "Banco" correctamente en español
      a.localeCompare(b, 'es', { sensitivity: 'base' })
    )
  }, [groupedModules])
  
  // 3. Lógica de Auto-Skip (igual que antes)
  const [activeFolder, setActiveFolder] = useState<string | null>(
    folderNames.length === 1 ? folderNames[0] : null
  )

  // --- RENDERIZADO ---

  // VISTA A: Lista de Apps (dentro de una carpeta o modo directo)
  if (activeFolder) {
    const showBackButton = folderNames.length > 1 
    const currentModules = groupedModules[activeFolder] || []

    return (
      <div className="space-y-6">
        {showBackButton && (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-4 duration-300">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setActiveFolder(null)}
              className="text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Volver a Carpetas
            </Button>
            <h3 className="text-xl font-semibold text-slate-700">
              {activeFolder === 'General' ? 'Aplicaciones' : activeFolder}
            </h3>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 animate-in zoom-in-95 duration-300">
          {currentModules.map((mod) => (
            <ModuleCard key={mod.id} mod={mod} />
          ))}
        </div>
      </div>
    )
  }

  // VISTA B: Lista de Carpetas
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 animate-in fade-in duration-500">
      {folderNames.map((folder) => (
        <Card 
          key={folder}
          onClick={() => setActiveFolder(folder)}
          className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer border-slate-200 group bg-slate-50/50"
        >
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="p-3 bg-white rounded-xl text-indigo-500 shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
              <LoadIcon name="Folder" className="h-8 w-8" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                {folder === 'General' ? 'Aplicaciones Generales' : folder}
              </CardTitle>
              <CardDescription className="text-slate-500">
                {groupedModules[folder].length} {groupedModules[folder].length === 1 ? 'aplicación' : 'aplicaciones'}
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}

function ModuleCard({ mod }: { mod: AppModule }) {
  const iconName = mod.icon || 'Box'
  const href = mod.key.startsWith('/') ? mod.key : `/${mod.key}`

  return (
    <Link href={href}>
      <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer h-full border-slate-200 group overflow-hidden bg-white">
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="p-3 bg-slate-100 rounded-xl text-slate-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
            <LoadIcon name={iconName} className="h-8 w-8" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
              {mod.name}
            </CardTitle>
            <CardDescription className="line-clamp-2 text-slate-500 text-sm mt-1">
              {mod.description || 'Acceder al módulo'}
            </CardDescription>
          </div>
        </CardHeader>
      </Card>
    </Link>
  )
}