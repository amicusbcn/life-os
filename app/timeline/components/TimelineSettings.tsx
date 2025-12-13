// app/timeline/components/TimelineSettings.tsx
'use client'

import React, { useState, useRef } from 'react'
import { updateTag, deleteTag, updatePerson, deletePerson } from '../actions' 
import { TimelineTag, TimelinePerson } from '@/types/timeline' 
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Settings, Trash2, Save, Tag, Users, Upload } from 'lucide-react'
import imageCompression from 'browser-image-compression'

interface CloneableElementProps {
    onClick?: (e: React.MouseEvent) => void;
    // Añadimos onSelect, que es el hook que usa Radix/Shadcn para manejar la interacción de ítems
    onSelect?: (e: Event) => void; 
}
// Este componente solo recibe props y actúa como botón.
// Ahora es un componente cliente y puede ser pasado como prop.
export const SettingsTrigger = (props: any) => (
    <Button 
        variant="ghost" 
        size="icon" 
        {...props} 
        className="h-8 w-8 hover:bg-slate-100 rounded-full text-slate-500"
    >
        <Settings className="h-5 w-5" />
    </Button>
);
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

// --- FILA DE PERSONA (Con Compresión) ---
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

  // Subir Avatar (COMPRIMIDO)
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const originalFile = e.target.files?.[0]
    if (!originalFile) return

    setUploading(true)

    try {
      // 1. Opciones de compresión (Agresiva para avatares pequeños)
      const options = {
        maxSizeMB: 0.2,          // Máx 200KB
        maxWidthOrHeight: 500,   // Máx 500px
        useWebWorker: true,
        fileType: 'image/jpeg'
      }

      // 2. Comprimir
      const compressedFile = await imageCompression(originalFile, options)
      
      // 3. Preparar envío
      const formData = new FormData()
      formData.append('id', person.id)
      formData.append('name', name)
      // Enviamos el fichero comprimido
      formData.append('avatar_file', compressedFile, 'avatar.jpg') 

      const res = await updatePerson(formData)
      
      if (res?.error) alert(res.error)

    } catch (error) {
      console.error("Error comprimiendo:", error)
      alert("No se pudo procesar la imagen.")
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if(confirm('¿Borrar a esta persona?')) await deletePerson(person.id)
  }

  return (
    <div className="flex items-center gap-3 mb-3 bg-white p-2 rounded border border-slate-100 shadow-sm">
      <div className="relative group cursor-pointer" onClick={() => !uploading && fileInputRef.current?.click()}>
        <input 
            type="file" ref={fileInputRef} className="hidden" accept="image/*" 
            onChange={handleAvatarChange} disabled={uploading}
        />
        <Avatar className="h-10 w-10 border border-slate-200">
            <AvatarImage src={person.avatar_url} className="object-cover" />
            <AvatarFallback className="bg-indigo-50 text-indigo-700 font-bold text-xs">
                {uploading ? '...' : person.name.substring(0,2).toUpperCase()}
            </AvatarFallback>
        </Avatar>
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

export function TimelineSettings({ allTags, allPeople,children }: { allTags: TimelineTag[], allPeople: TimelinePerson[],
    children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  // 🚨 PASO 1: Aserción de tipo para el elemento hijo
    const childElement = children as React.ReactElement<CloneableElementProps>;

    // 🚨 PASO 2: Implementar el nuevo onClick
    const newOnClick = (e: React.MouseEvent) => {
        // Usamos una verificación de tipo de función explícita, que es más segura
        if (typeof childElement.props.onClick === 'function') {
            e.stopPropagation();
            childElement.props.onClick(e);
        }
        setOpen(true);
    };

const newOnSelect = (e: Event) => {
    // 1. Prevenir el comportamiento por defecto de 'onSelect' (que es cerrar el menú)
    e.preventDefault(); 
    
    // 2. Ejecutar el onSelect original si existía
    const originalOnSelect = (childElement.props as CloneableElementProps).onSelect;
    if (typeof originalOnSelect === 'function') {
        originalOnSelect(e);
    }
    
    // 3. Abrir el diálogo
    setOpen(true);
};


// Clonamos el child para inyectarle el nuevo onSelect.
const trigger = React.cloneElement(childElement, {
    // 🚨 Inyectamos la función en onSelect
    onSelect: newOnSelect,
    
    // Opcional: También podemos añadir un onClick simple para compatibilidad, 
    // pero onSelect debería ser suficiente para manejar el clic y prevenir el cierre.
    onClick: (e: React.MouseEvent) => e.stopPropagation(), 

} as React.PropsWithChildren<CloneableElementProps>);

  return (
    <>
    {trigger}
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