// app/inventory/InventorySettings.tsx
'use client'

import { useState } from 'react'
// Asegúrate de importar tus funciones desde donde las tengas (actions.ts)
import { 
  updateCategory, deleteCategory, createCategory,
  updateLocation, deleteLocation, createLocation 
} from '@/app/inventory/actions' 
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Settings, Trash2, Save, MapPin, Tag, Plus, LayoutGrid, MoreVertical } from 'lucide-react' // <--- Asegúrate de importar MoreVertical

// --- FILA DE CATEGORÍA ---
function CategoryRow({ category }: { category: any }) {
  const [name, setName] = useState(category.name)
  const [icon, setIcon] = useState(category.icon || '📦')
  const [isChanged, setIsChanged] = useState(false)

  const handleSave = async () => {
    // 1. Creamos FormData para respetar tu lógica
    const formData = new FormData()
    formData.append('id', category.id)
    formData.append('name', name)
    formData.append('icon', icon)

    const res = await updateCategory(formData)
    if (res.success) {
        setIsChanged(false)
    } else {
        alert(res.error) // Feedback básico de error
    }
  }

  const handleDelete = async () => {
    if(!confirm("¿Borrar categoría?")) return
    await deleteCategory(category.id) // Tu delete recibe string directo, así que esto OK
  }

  return (
    <div className="flex items-center gap-2 mb-2 bg-white p-2 rounded border border-slate-100">
      <Input 
        value={icon} onChange={(e) => { setIcon(e.target.value); setIsChanged(true) }}
        className="h-8 w-10 text-center px-1 text-lg" placeholder="📦"
      />
      <Input 
        value={name} onChange={(e) => { setName(e.target.value); setIsChanged(true) }} 
        className="flex-1 h-8 text-sm" 
      />
      {isChanged && (
        <Button size="icon" variant="ghost" onClick={handleSave} className="h-8 w-8 text-green-600 hover:bg-green-50">
           <Save className="h-4 w-4" />
        </Button>
      )}
      <Button size="icon" variant="ghost" onClick={handleDelete} className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

// --- FILA DE UBICACIÓN ---
function LocationRow({ location }: { location: any }) {
  const [name, setName] = useState(location.name)
  const [isChanged, setIsChanged] = useState(false)

  const handleSave = async () => {
    // 1. Creamos FormData
    const formData = new FormData()
    formData.append('id', location.id)
    formData.append('name', name)

    const res = await updateLocation(formData)
    if (res.success) setIsChanged(false)
  }

  const handleDelete = async () => {
    if(!confirm("¿Borrar ubicación?")) return
    await deleteLocation(location.id)
  }

  return (
    <div className="flex items-center gap-2 mb-2 bg-white p-2 rounded border border-slate-100">
      {/* Mostramos una flechita visual si es hija, solo estético */}
      {location.parent_id && <span className="text-slate-300 text-xs">↳</span>}
      
      <Input 
        value={name} onChange={(e) => { setName(e.target.value); setIsChanged(true) }} 
        className="flex-1 h-8 text-sm" 
      />
      {isChanged && (
        <Button size="icon" variant="ghost" onClick={handleSave} className="h-8 w-8 text-green-600 hover:bg-green-50">
           <Save className="h-4 w-4" />
        </Button>
      )}
      <Button size="icon" variant="ghost" onClick={handleDelete} className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

// --- COMPONENTE PRINCIPAL ---
export function InventorySettings({ categories, locations }: { categories: any[], locations: any[] }) {
  const [open, setOpen] = useState(false)
  
  const [newCatName, setNewCatName] = useState('')
  const [newLocName, setNewLocName] = useState('')

  // Wrapper para crear Categoría con FormData
  const handleCreateCategory = async () => {
    if (!newCatName) return
    const formData = new FormData()
    formData.append('name', newCatName)
    // formData.append('icon', '📦') // Si decides añadir icono al crear

    await createCategory(formData)
    setNewCatName('')
  }

  // Wrapper para crear Ubicación con FormData
  const handleCreateLocation = async () => {
    if (!newLocName) return
    const formData = new FormData()
    formData.append('name', newLocName)
    formData.append('parent_id', 'no-parent') // Ojo: Tu lógica espera esto o null

    await createLocation(formData)
    setNewLocName('')
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => setOpen(true)} className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>Configurar Categorías y Ubicaciones</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[450px] h-[80vh] flex flex-col bg-slate-50">
          <DialogHeader>
            <DialogTitle>Gestionar Datos</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="categories" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2 mb-4 bg-white">
              <TabsTrigger value="categories" className="gap-2"><Tag className="h-4 w-4"/> Categorías</TabsTrigger>
              <TabsTrigger value="locations" className="gap-2"><MapPin className="h-4 w-4"/> Ubicaciones</TabsTrigger>
            </TabsList>
            
            {/* PANEL CATEGORÍAS */}
            <TabsContent value="categories" className="flex-1 overflow-y-auto pr-1 flex flex-col">
               <div className="flex-1 space-y-1 p-1">
                 {categories.map(cat => <CategoryRow key={cat.id} category={cat} />)}
               </div>
               <div className="mt-2 flex gap-2 pt-2 border-t border-slate-200">
                 <Input placeholder="Nueva categoría..." value={newCatName} onChange={e => setNewCatName(e.target.value)} />
                 <Button onClick={handleCreateCategory} disabled={!newCatName}>
                   <Plus className="h-4 w-4" />
                 </Button>
               </div>
            </TabsContent>
            
            {/* PANEL UBICACIONES */}
            <TabsContent value="locations" className="flex-1 overflow-y-auto pr-1 flex flex-col">
               <div className="flex-1 space-y-1 p-1">
                 {/* Reutilizamos la lista locations que ya pasas ordenada o plana */}
                 {locations.map(loc => <LocationRow key={loc.id} location={loc} />)}
               </div>
               <div className="mt-2 flex gap-2 pt-2 border-t border-slate-200">
                 <Input placeholder="Nueva ubicación..." value={newLocName} onChange={e => setNewLocName(e.target.value)} />
                 <Button onClick={handleCreateLocation} disabled={!newLocName}>
                   <Plus className="h-4 w-4" />
                 </Button>
               </div>
            </TabsContent>
          </Tabs>

        </DialogContent>
      </Dialog>
    </>
  )
}