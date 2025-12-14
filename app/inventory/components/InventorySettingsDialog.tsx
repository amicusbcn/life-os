// app/inventory/components/InventorySettingsDialog.tsx
'use client'

import React, { useState, useMemo } from "react"
import { createCategory, deleteCategory, updateCategory, createLocation, deleteLocation, updateLocation} from "@/app/inventory/actions"
import { InventorySettingsDialogProps,LocationWithLevel,InventoryCategory, InventoryLocation,InventoryMenuProps, CloneableElementProps } from "@/types/inventory"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuLabel,DropdownMenuSeparator,DropdownMenuTrigger} from "@/components/ui/dropdown-menu"
import { Settings, Plus, Trash2, Loader2,MapPin, Tag, CornerDownRight,FolderTree,MoreVertical,Pencil, Check, X} from "lucide-react"

// --- SUB-COMPONENTE: FILA DE CATEGORÍA (Lectura/Edición) ---
function CategoryRow({ category }: { category: InventoryCategory }) {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Estados temporales para la edición
  const [tempName, setTempName] = useState(category.name)
  const [tempIcon, setTempIcon] = useState(category.icon || '📦')

  const handleSave = async () => {
    setLoading(true)
    const formData = new FormData()
    formData.append('id', category.id)
    formData.append('name', tempName)
    formData.append('icon', tempIcon)

    try {
        const res = await updateCategory(formData)
        if (res.success) {
            setIsEditing(false)
        } else {
            alert(res.error)
        }
    } catch (e) { console.error(e) } 
    finally { setLoading(false) }
  }

  const handleCancel = () => {
    setTempName(category.name)
    setTempIcon(category.icon || '📦')
    setIsEditing(false)
  }

  const handleDelete = async () => {
    if(!confirm("¿Borrar categoría?")) return
    await deleteCategory(category.id)
  }

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg border border-slate-100 bg-white shadow-sm group hover:border-indigo-100 transition-all min-h-[50px]">
       
       {isEditing ? (
         <>
            {/* --- MODO EDICIÓN --- */}
            <Input 
              value={tempIcon}
              onChange={(e) => setTempIcon(e.target.value)}
              className="h-8 w-10 text-center px-0 text-lg bg-slate-50"
              maxLength={2}
              autoFocus
            />
            <Input 
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              className="flex-1 h-8 text-sm"
            />
            <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={handleSave} disabled={loading} className="h-8 w-8 text-green-600 hover:bg-green-50">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4" />}
                </Button>
                <Button size="icon" variant="ghost" onClick={handleCancel} disabled={loading} className="h-8 w-8 text-slate-400 hover:bg-slate-100">
                    <X className="h-4 w-4" />
                </Button>
            </div>
         </>
       ) : (
         <>
            {/* --- MODO LECTURA --- */}
            <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-lg border border-slate-100 shadow-sm shrink-0">
               {category.icon || '📦'}
            </div>
            <span className="flex-1 text-sm font-medium text-slate-700 truncate">{category.name}</span>
            
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="icon" variant="ghost" onClick={() => setIsEditing(true)} className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50">
                    <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" onClick={handleDelete} className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50">
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </div>
         </>
       )}
    </div>
  )
}

// --- SUB-COMPONENTE: FILA DE UBICACIÓN (Lectura/Edición + Indentación) ---

function LocationRow({ location }: { location: LocationWithLevel }) {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [tempName, setTempName] = useState(location.name)

  const handleSave = async () => {
    setLoading(true)
    const formData = new FormData()
    formData.append('id', location.id)
    formData.append('name', tempName)

    try {
        const res = await updateLocation(formData)
        if (res.success) setIsEditing(false)
        else alert(res.error)
    } catch (e) { console.error(e) } 
    finally { setLoading(false) }
  }

  const handleCancel = () => {
      setTempName(location.name)
      setIsEditing(false)
  }

  const handleDelete = async () => {
    if(!confirm("¿Borrar ubicación?")) return
    await deleteLocation(location.id)
  }

  return (
    <div className="flex items-center justify-between p-2 rounded-lg border border-slate-100 bg-white shadow-sm group hover:border-indigo-100 transition-colors min-h-[46px]">
        
        {/* La indentación siempre es visible para mantener la estructura visual */}
        <div style={{ paddingLeft: `${location.level * 16}px` }} className="flex items-center shrink-0 mr-2">
          {location.level > 0 ? (
              <CornerDownRight className="h-4 w-4 text-slate-300" />
          ) : (
              <FolderTree className="h-4 w-4 text-slate-800" />
          )}
        </div>

        {isEditing ? (
            <>
              {/* --- MODO EDICIÓN --- */}
              <Input 
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="flex-1 h-8 text-sm mr-2"
                  autoFocus
              />
              <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" onClick={handleSave} disabled={loading} className="h-8 w-8 text-green-600 hover:bg-green-50">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={handleCancel} disabled={loading} className="h-8 w-8 text-slate-400 hover:bg-slate-100">
                      <X className="h-4 w-4" />
                  </Button>
              </div>
            </>
        ) : (
            <>
              {/* --- MODO LECTURA --- */}
              <span className={`flex-1 truncate text-sm ${location.level === 0 ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                {location.name}
              </span>

              <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" onClick={() => setIsEditing(true)} className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50">
                      <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={handleDelete} className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50">
                      <Trash2 className="h-3.5 w-3.5" />
                  </Button>
              </div>
            </>
        )}
    </div>
  )
}


// --- COMPONENTE PRINCIPAL (Sin cambios lógicos, solo estructura) ---


export function InventorySettingsDialog({ categories, locations,children }: InventorySettingsDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const childElement = children as React.ReactElement<CloneableElementProps>;

  // 🚨 Handler para prevenir el cierre del menú y abrir el diálogo
    const newOnSelect = (e: Event) => {
        e.preventDefault(); // Previene el cierre automático del DropdownMenu
        
        // Ejecutar el onSelect original si existía
        const originalOnSelect = (childElement.props as CloneableElementProps).onSelect;
        if (typeof originalOnSelect === 'function') {
            originalOnSelect(e);
        }
        
        setOpen(true); // Abre el diálogo
    };
    
    // Clonamos el child e inyectamos el onSelect
    const trigger = React.cloneElement(childElement, {
        onSelect: newOnSelect,
        onClick: (e: React.MouseEvent) => e.stopPropagation(), // Detiene la propagación del click
    } as React.PropsWithChildren<CloneableElementProps>);
  // --- LÓGICA DE ÁRBOL ---
  const sortedLocations = useMemo(() => {
    const roots = locations.filter((l) => !l.parent_id)
    const buildTree = (parentId: string, level: number): LocationWithLevel[] => {
        const children = locations
            .filter(l => l.parent_id === parentId)
            .sort((a, b) => a.name.localeCompare(b.name)); 
        let result: LocationWithLevel[] = [];
        for (const child of children) {
            result.push({ ...child, level });
            result = [...result, ...buildTree(child.id, level + 1)]; 
        }
        return result;
    }
    let result: LocationWithLevel[] = []
    roots.sort((a, b) => a.name.localeCompare(b.name)).forEach(root => {
        result.push({ ...root, level: 0 });
        result = [...result, ...buildTree(root.id, 1)];
    });
    const processedIds = new Set(result.map(r => r.id))
    const orphans = locations.filter(l => !processedIds.has(l.id))
    if (orphans.length > 0) orphans.forEach(o => result.push({ ...o, level: 0 }))
    return result
  }, [locations])
  // ----------------------

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>, action: (formData: FormData) => Promise<any>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    try {
      const result = await action(formData)
      if (result?.error) alert(result.error)
      else e.currentTarget.reset()
    } catch (error) { console.error(error) } 
    finally { setLoading(false) }
  }

  return (
    <>
      {trigger}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md h-[600px] flex flex-col rounded-xl p-0 overflow-hidden bg-white">
          <DialogHeader className="p-4 pb-2 border-b border-slate-100">
            <DialogTitle>Configuración de Inventario</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="locations" className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-2">
              <TabsList className="grid w-full grid-cols-2 bg-slate-100">
                <TabsTrigger value="categories" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Tag className="w-4 h-4 mr-2"/> Categorías
                </TabsTrigger>
                <TabsTrigger value="locations" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <MapPin className="w-4 h-4 mr-2"/> Ubicaciones
                </TabsTrigger>
              </TabsList>
            </div>

            {/* --- PANEL CATEGORÍAS --- */}
            <TabsContent value="categories" className="flex-1 flex flex-col gap-0 overflow-hidden m-0 data-[state=inactive]:hidden">
               <div className="flex-1 overflow-y-auto p-4 space-y-2">
                   {categories.length === 0 && <p className="text-center text-sm text-slate-400 mt-10">Sin categorías</p>}
                   {categories.map((cat) => (
                     <CategoryRow key={cat.id} category={cat} />
                   ))}
               </div>
               
               <div className="p-3 border-t border-slate-100 bg-slate-50">
                  <form onSubmit={(e) => handleCreate(e, createCategory)} className="flex gap-2">
                      <Input name="icon" placeholder="📦" className="w-12 text-center bg-white h-10 px-0" maxLength={2} />
                      <Input name="name" placeholder="Nueva categoría..." required className="bg-white h-10 flex-1" />
                      <Button type="submit" size="icon" disabled={loading} className="bg-slate-900 h-10 w-10 shrink-0">
                          {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Plus className="h-5 w-5"/>}
                      </Button>
                  </form>
               </div>
            </TabsContent>

            {/* --- PANEL UBICACIONES --- */}
            <TabsContent value="locations" className="flex-1 flex flex-col gap-0 overflow-hidden m-0 data-[state=inactive]:hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                 {locations.length === 0 && <p className="text-center text-sm text-slate-400 mt-10">Sin ubicaciones</p>}
                 {sortedLocations.map((loc) => (
                   <LocationRow key={loc.id} location={loc} />
                 ))}
              </div>

              <div className="p-3 border-t border-slate-100 bg-slate-50">
                  <form onSubmit={(e) => handleCreate(e, createLocation)} className="flex flex-col gap-2">
                      <p className="text-xs font-semibold text-slate-400 uppercase ml-1">Nueva Ubicación</p>
                      <div className="flex gap-2">
                          <div className="relative w-1/3 min-w-[120px]">
                              <select 
                                  name="parent_id" 
                                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                                  defaultValue="no-parent"
                              >
                                  <option value="no-parent">📍 Raíz</option>
                                  {sortedLocations.map((loc) => (
                                      <option key={loc.id} value={loc.id}>
                                          {"\u00A0\u00A0".repeat(loc.level)} ↳ {loc.name}
                                      </option>
                                  ))}
                              </select>
                          </div>
                          <Input name="name" placeholder="Nombre..." required disabled={loading} className="flex-1 bg-white h-10" />
                          <Button type="submit" size="icon" disabled={loading} className="shrink-0 bg-slate-900 h-10 w-10">
                              {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Plus className="h-5 w-5"/>}
                          </Button>
                      </div>
                  </form>
              </div>
            </TabsContent>

          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  )
}