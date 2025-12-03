'use client'

import { useState } from 'react'
import { createTimelineEvent, createTag, createPerson } from './actions'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Image as ImageIcon, Users, Tag, Loader2 } from 'lucide-react'

// Tipos de datos que recibimos de la base de datos
interface TagData { id: string; name: string }
interface PersonData { id: string; name: string; avatar_url?: string }

export function NewEventDialog({ allTags, allPeople }: { allTags: TagData[], allPeople: PersonData[] }) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ESTADOS DE SELECCIÓN
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedPeople, setSelectedPeople] = useState<string[]>([])
  
  // ESTADOS DE CREACIÓN RÁPIDA
  const [newTagName, setNewTagName] = useState('')
  const [newPersonName, setNewPersonName] = useState('')
  
  // Listas locales (para actualizar al crear uno nuevo sin recargar)
  const [localTags, setLocalTags] = useState(allTags)
  const [localPeople, setLocalPeople] = useState(allPeople)

  // --- HANDLERS SELECCIÓN ---
  const toggleTag = (id: string) => {
    setSelectedTags(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])
  }
  
  const togglePerson = (id: string) => {
    setSelectedPeople(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])
  }

  // --- HANDLERS CREACIÓN AL VUELO ---
  async function handleCreateTag() {
    if(!newTagName.trim()) return
    const res = await createTag(newTagName)
    if(res.success && res.tag) {
        setLocalTags([...localTags, res.tag])
        setSelectedTags([...selectedTags, res.tag.id]) // Lo auto-seleccionamos
        setNewTagName('')
    }
  }

  async function handleCreatePerson() {
    if(!newPersonName.trim()) return
    const res = await createPerson(newPersonName)
    if(res.success && res.person) {
        setLocalPeople([...localPeople, res.person])
        setSelectedPeople([...selectedPeople, res.person.id]) // Lo auto-seleccionamos
        setNewPersonName('')
    }
  }

  // --- ENVÍO FINAL ---
  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true)
    
    // Añadimos manualmente los arrays seleccionados al FormData
    formData.append('tags', selectedTags.join(','))
    formData.append('people', selectedPeople.join(','))

    const res = await createTimelineEvent(formData)
    
    setIsSubmitting(false)
    if (res?.success) {
      setOpen(false)
      // Resetear formulario
      setSelectedTags([])
      setSelectedPeople([])
    } else {
      alert("Error: " + res?.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {/* Botón flotante estilo FAB para móvil */}
        <Button className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl bg-indigo-600 hover:bg-indigo-700 z-50 p-0">
          <Plus className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Recuerdo</DialogTitle>
        </DialogHeader>
        
        <form action={handleSubmit} className="space-y-6 py-2">
          
          {/* 1. TÍTULO Y FECHA */}
          <div className="space-y-3">
            <Input name="title" placeholder="¿Qué ha pasado? (Ej: Primeros pasos)" className="text-lg font-bold border-0 border-b rounded-none px-0 focus-visible:ring-0 shadow-none" required />
            <div className="flex gap-2">
                <Input type="date" name="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-auto" required />
                <select name="visibility" className="text-sm border rounded px-2 bg-slate-50">
                    <option value="family">👨‍👩‍👧‍👦 Familia</option>
                    <option value="private">🔒 Privado</option>
                </select>
            </div>
          </div>

          {/* 2. FOTO (Grande) */}
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:bg-slate-100 transition relative group">
             <input 
                type="file" 
                name="media_file" 
                accept="image/*,video/*" 
                capture="environment" // <--- CÁMARA DIRECTA EN MÓVIL
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
             />
             <div className="py-4 text-slate-400 group-hover:text-indigo-500">
                <ImageIcon className="h-8 w-8 mx-auto mb-2" />
                <span className="text-sm font-medium">Toca para añadir foto/video</span>
             </div>
          </div>

          {/* 3. DESCRIPCIÓN */}
          <Textarea name="description" placeholder="Cuenta algún detalle..." className="resize-none" />

          {/* 4. PERSONAS (Selector Visual) */}
          <div className="space-y-2">
             <Label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><Users className="h-3 w-3"/> ¿Quién sale?</Label>
             
             {/* Lista de Avatares seleccionables */}
             <div className="flex flex-wrap gap-3">
                {localPeople.map(person => {
                    const isSelected = selectedPeople.includes(person.id)
                    return (
                        <div 
                            key={person.id} 
                            onClick={() => togglePerson(person.id)}
                            className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${isSelected ? 'opacity-100 scale-105' : 'opacity-50 grayscale hover:opacity-80'}`}
                        >
                            <Avatar className={`h-10 w-10 border-2 ${isSelected ? 'border-indigo-500' : 'border-transparent'}`}>
                                <AvatarFallback className="text-[10px] bg-indigo-100 text-indigo-700 font-bold">
                                    {person.name.substring(0,2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <span className={`text-[10px] font-medium ${isSelected ? 'text-indigo-600' : 'text-slate-500'}`}>{person.name}</span>
                        </div>
                    )
                })}
             </div>
             
             {/* Crear Persona Rápida */}
             <div className="flex gap-2 mt-2">
                <Input 
                    placeholder="Nueva persona..." 
                    value={newPersonName} 
                    onChange={e => setNewPersonName(e.target.value)} 
                    className="h-8 text-xs"
                />
                <Button type="button" size="sm" variant="ghost" onClick={handleCreatePerson} disabled={!newPersonName} className="h-8">
                    <Plus className="h-4 w-4" />
                </Button>
             </div>
          </div>

          {/* 5. ETIQUETAS (Selector Visual) */}
          <div className="space-y-2">
             <Label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><Tag className="h-3 w-3"/> Etiquetas</Label>
             
             <div className="flex flex-wrap gap-2">
                {localTags.map(tag => {
                    const isSelected = selectedTags.includes(tag.id)
                    return (
                        <Badge 
                            key={tag.id} 
                            variant={isSelected ? "default" : "outline"}
                            className={`cursor-pointer ${isSelected ? 'bg-indigo-600 hover:bg-indigo-700' : 'text-slate-500 hover:bg-slate-50 hover:border-indigo-300'}`}
                            onClick={() => toggleTag(tag.id)}
                        >
                            {tag.name}
                        </Badge>
                    )
                })}
             </div>

             {/* Crear Etiqueta Rápida */}
             <div className="flex gap-2 mt-2 max-w-[200px]">
                <Input 
                    placeholder="Nueva etiqueta..." 
                    value={newTagName} 
                    onChange={e => setNewTagName(e.target.value)} 
                    className="h-7 text-xs border-dashed"
                />
                <Button type="button" size="sm" variant="ghost" onClick={handleCreateTag} disabled={!newTagName} className="h-7 w-8 p-0">
                    <Plus className="h-3 w-3" />
                </Button>
             </div>
          </div>

          {/* BOTÓN GUARDAR */}
          <Button type="submit" className="w-full h-12 text-base shadow-lg" disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</> : 'Guardar Recuerdo'}
          </Button>

        </form>
      </DialogContent>
    </Dialog>
  )
}