'use client'

import { useState, useRef } from 'react'
import { updateTag, deleteTag, updatePerson, deletePerson } from './actions'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { MoreVertical, Settings, Trash2, Save, Tag, Users, Upload, UserCircle } from 'lucide-react'

// --- FILA DE ETIQUETA (Con Color) ---
function TagRow({ tag }: { tag: any }) {
  const [name, setName] = useState(tag.name)
  const [color, setColor] = useState(tag.color || '#4f46e5')
  const [isChanged, setIsChanged] = useState(false)

  const handleSave = async () => {
    await updateTag(tag.id, name, color)
    setIsChanged(false)
  }

  const handleDelete = async () => {
    if(confirm('¿Borrar esta etiqueta?')) await deleteTag(tag.id)
  }

  return (
    <div className="flex items-center gap-2 mb-3 bg-white p-2 rounded border border-slate-100 shadow-sm">
      <input 
        type="color" 
        value={color} 
        onChange={(e) => { setColor(e.target.value); setIsChanged(true) }}
        className="h-8 w-8 p-0.5 rounded cursor-pointer border-0 bg-transparent"
        title="Cambiar color"
      />
      <Input 
        value={name} 
        onChange={(e) => { setName(e.target.value); setIsChanged(true) }} 
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

// --- FILA DE PERSONA (Con Avatar) ---
function PersonRow({ person }: { person: any }) {
  const [name, setName] = useState(person.name)
  const [isChanged, setIsChanged] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Guardar cambio de nombre
  const handleNameSave = async () => {
    const formData = new FormData()
    formData.append('id', person.id)
    formData.append('name', name)
    
    await updatePerson(formData)
    setIsChanged(false)
  }

  // Subir Avatar al seleccionar archivo
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('id', person.id)
    formData.append('name', name) // Enviamos el nombre también por si acaso
    formData.append('avatar_file', file)

    await updatePerson(formData)
    setUploading(false)
  }

  const handleDelete = async () => {
    if(confirm('¿Borrar a esta persona?')) await deletePerson(person.id)
  }

  return (
    <div className="flex items-center gap-3 mb-3 bg-white p-2 rounded border border-slate-100 shadow-sm">
      
      {/* AVATAR CLICKABLE */}
      <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
        <input 
            type="file" ref={fileInputRef} className="hidden" accept="image/*" 
            onChange={handleAvatarChange}
        />
        <Avatar className="h-10 w-10 border border-slate-200">
            <AvatarImage src={person.avatar_url} className="object-cover" />
            <AvatarFallback className="bg-indigo-50 text-indigo-700 font-bold text-xs">
                {uploading ? '...' : person.name.substring(0,2).toUpperCase()}
            </AvatarFallback>
        </Avatar>
        {/* Overlay de subida al pasar ratón */}
        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Upload className="h-3 w-3 text-white" />
        </div>
      </div>

      <Input 
        value={name} 
        onChange={(e) => { setName(e.target.value); setIsChanged(true) }} 
        className="flex-1 h-9"
      />

      {isChanged && (
        <Button size="icon" variant="ghost" onClick={handleNameSave} className="h-8 w-8 text-green-600 hover:bg-green-50">
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
export function TimelineSettings({ allTags, allPeople }: { allTags: any[], allPeople: any[] }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="-mr-2 text-slate-500 hover:bg-slate-100 rounded-full">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setOpen(true)} className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" /> Configurar Etiquetas y Personas
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px] h-[80vh] flex flex-col bg-slate-50">
          <DialogHeader>
            <DialogTitle>Configuración</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="tags" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2 mb-4 bg-white">
              <TabsTrigger value="tags" className="gap-2"><Tag className="h-4 w-4"/> Etiquetas</TabsTrigger>
              <TabsTrigger value="people" className="gap-2"><Users className="h-4 w-4"/> Personas</TabsTrigger>
            </TabsList>
            
            <TabsContent value="tags" className="flex-1 overflow-y-auto pr-1">
               <div className="space-y-1 p-1">
                 {allTags.map(tag => <TagRow key={tag.id} tag={tag} />)}
                 {allTags.length === 0 && <p className="text-center text-sm text-slate-400 mt-4">No hay etiquetas creadas.</p>}
               </div>
            </TabsContent>
            
            <TabsContent value="people" className="flex-1 overflow-y-auto pr-1">
               <div className="space-y-1 p-1">
                 {allPeople.map(p => <PersonRow key={p.id} person={p} />)}
                 {allPeople.length === 0 && <p className="text-center text-sm text-slate-400 mt-4">No hay personas creadas.</p>}
               </div>
            </TabsContent>
          </Tabs>

        </DialogContent>
      </Dialog>
    </>
  )
}