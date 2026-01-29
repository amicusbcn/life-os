// /components/layout/AppLauncher.tsx
'use client'

import React from 'react'
import Link from 'next/link'
import { 
  Popover, PopoverContent, PopoverTrigger 
} from "@/components/ui/popover"
import { LayoutGrid } from "lucide-react"
import { Button } from "@/components/ui/button"
import LoadIcon from "@/utils/LoadIcon"
import { AppModule } from '@/types/users'


export function AppSelector({ modules }: { modules: AppModule[] }) {
  if (!modules || modules.length <= 1) {
    return null;
  }
  // 1. Agrupar módulos por la columna "Folder"
  const groupedModules = modules.reduce((acc, mod) => {
    const folder = mod.folder || 'General' // Cambiado 'Otros' por 'General' para que quede mejor
    if (!acc[folder]) acc[folder] = []
    acc[folder].push(mod)
    return acc
  }, {} as Record<string, AppModule[]>)

  // 2. Comprobar si hay más de una carpeta
  const folders = Object.keys(groupedModules)
  const showFolderTitles = folders.length > 1

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-slate-100 transition-colors">
          <LayoutGrid className="h-5 w-5 text-slate-600" />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-4 mr-4 shadow-xl border-slate-200 rounded-2xl" align="end">
        <div className="space-y-6">
          {Object.entries(groupedModules).map(([folder, folderModules]) => (
            <div key={folder} className="space-y-3">
              {/* 3. Solo mostramos el título si hay más de una carpeta */}
              {showFolderTitles && (
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2">
                  {folder}
                </h4>
              )}
              
              <div className="grid grid-cols-3 gap-2">
                {folderModules.map((mod) => (
                  <Link 
                    key={mod.key} 
                    href={`/${mod.key}`}
                    className="group flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-indigo-50 transition-all duration-200"
                  >
                    <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-white border border-slate-100 shadow-sm group-hover:border-indigo-200 group-hover:shadow-md group-hover:shadow-indigo-100 transition-all">
                      <LoadIcon name={mod.icon || 'AppWindow'} className="h-6 w-6 text-slate-600 group-hover:text-indigo-600" />
                    </div>
                    <span className="text-[10px] font-medium text-slate-600 group-hover:text-indigo-700 text-center truncate w-full px-1">
                      {mod.name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}