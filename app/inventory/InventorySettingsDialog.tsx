'use client'

import { useState, useMemo } from "react"
import { createCategory, deleteCategory, createLocation, deleteLocation } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Settings, Plus, Trash2, Loader2, MapPin, Tag, CornerDownRight } from "lucide-react"

export function InventorySettingsDialog({ categories, locations }: any) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // --- LÓGICA DE ÁRBOL PARA UBICACIONES ---
  // Organizamos la lista plana para visualización: Padre -> Hijo
  const sortedLocations = useMemo(() => {
    const roots = locations.filter((l: any) => !l.parent_id)
    const children = locations.filter((l: any) => l.parent_id)
    
    let result: any[] = []
    
    // Función recursiva simple (soporta varios niveles)
    const addNode = (node: any, level: number) => {
       result.push({ ...node, level })
       const myChildren = children.filter((c: any) => c.parent_id === node.id)
       myChildren.forEach((child: any) => addNode(child, level + 1))
    }

    roots.forEach((root: any) => addNode(root, 0))
    
    // Añadimos al final los huérfanos por si acaso falla la integridad
    const processedIds = new Set(result.map(r => r.id))
    const orphans = locations.filter((l: any) => !processedIds.has(l.id))
    orphans.forEach((o: any) => result.push({ ...o, level: 0 }))

    return result
  }, [locations])
  // ----------------------------------------

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>, action: any) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    try {
      await action(formData)
      e.currentTarget.reset()
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, action: any) => {
    if (!confirm("¿Borrar? Se quitará de los items.")) return
    setLoading(true)
    try { await action(id) } catch (error) { console.error(error) } finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-200 -mr-2">
          <Settings className="h-5 w-5 text-slate-600" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md h-[80vh] flex flex-col rounded-xl">
        <DialogHeader>
          <DialogTitle>Configuración</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="locations" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="locations">Ubicaciones</TabsTrigger>
            <TabsTrigger value="categories">Categorías</TabsTrigger>
          </TabsList>

          {/* --- PESTAÑA UBICACIONES (Con Jerarquía) --- */}
          <TabsContent value="locations" className="flex-1 flex flex-col gap-4 overflow-hidden pt-4 mt-0">
            {/* Formulario Añadir */}
            <form onSubmit={(e) => handleCreate(e, createLocation)} className="flex flex-col gap-2 shrink-0 bg-slate-50 p-3 rounded-lg border border-slate-100">
               <p className="text-xs font-bold text-slate-500 uppercase">Nueva Ubicación</p>
               <div className="flex gap-2">
                 <Input name="name" placeholder="Nombre (ej: Cajón cables)" required disabled={loading} className="bg-white" />
                 <Button type="submit" size="icon" disabled={loading} className="shrink-0 bg-slate-900">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Plus className="h-4 w-4"/>}
                 </Button>
               </div>
               
               {/* Select de Padre */}
               <select name="parent_id" className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm" defaultValue="no-parent">
                  <option value="no-parent">Es una ubicación principal (Raíz)</option>
                  {sortedLocations.map((loc: any) => (
                    <option key={loc.id} value={loc.id}>
                       {/* Truco visual para el desplegable */}
                       {"\u00A0\u00A0".repeat(loc.level)} ↳ {loc.name}
                    </option>
                  ))}
               </select>
            </form>
            
            {/* Lista Jerárquica */}
            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
               {locations.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Sin ubicaciones</p>}
               {sortedLocations.map((loc: any) => (
                 <div key={loc.id} className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 border border-transparent hover:border-slate-100 text-sm group transition-colors">
                    <div className="flex items-center gap-2" style={{ paddingLeft: `${loc.level * 20}px` }}>
                      {loc.level > 0 ? <CornerDownRight className="h-3 w-3 text-slate-300" /> : <MapPin className="h-4 w-4 text-indigo-400" />}
                      <span className={`${loc.level === 0 ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                        {loc.name}
                      </span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 text-slate-300 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDelete(loc.id, deleteLocation)}
                      disabled={loading}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                 </div>
               ))}
            </div>
          </TabsContent>

          {/* --- PESTAÑA CATEGORÍAS (Igual que antes) --- */}
          <TabsContent value="categories" className="flex-1 flex flex-col gap-4 overflow-hidden pt-4 mt-0">
             <form onSubmit={(e) => handleCreate(e, createCategory)} className="flex gap-2 shrink-0">
              <Input name="name" placeholder="Nueva categoría..." required disabled={loading} />
              <Button type="submit" size="icon" disabled={loading} className="shrink-0 bg-slate-900">
                {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Plus className="h-4 w-4"/>}
              </Button>
            </form>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
               {categories.map((cat: any) => (
                 <div key={cat.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 text-sm group">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-slate-400" />
                      <span className="font-medium text-slate-700">{cat.name}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 text-slate-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(cat.id, deleteCategory)}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                 </div>
               ))}
            </div>
          </TabsContent>

        </Tabs>
      </DialogContent>
    </Dialog>
  )
}