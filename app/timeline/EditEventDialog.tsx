'use client'

import { useState } from 'react'
import { updateTimelineEvent } from './actions'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Pencil, Link as LinkIcon, Trash2, Plus } from 'lucide-react'
import imageCompression from 'browser-image-compression'
// Tipos
interface LinkItem { label: string; url: string }

export function EditEventDialog({ event, allTags, allPeople }: { event: any, allTags: any[], allPeople: any[] }) {
  const [open, setOpen] = useState(false)
  
  // ESTADOS INICIALES (Cargados del evento)
  const [selectedTags, setSelectedTags] = useState<string[]>(event.timeline_event_tags.map((r: any) => r.tag.id))
  const [selectedPeople, setSelectedPeople] = useState<string[]>(event.timeline_event_people.map((r: any) => r.person.id))
  const [links, setLinks] = useState<LinkItem[]>(event.external_links || [])
  
  // ESTADO PARA NUEVO LINK
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [newLinkLabel, setNewLinkLabel] = useState('')

  // --- GESTIÓN DE LINKS ---
  const addLink = () => {
    if (newLinkUrl) {
      setLinks([...links, { label: newLinkLabel || 'Enlace', url: newLinkUrl }])
      setNewLinkUrl(''); setNewLinkLabel('')
    }
  }
  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index))
  }

  // --- SELECCIÓN (Igual que en crear) ---
  const toggleTag = (id: string) => setSelectedTags(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])
  const togglePerson = (id: string) => setSelectedPeople(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])

async function handleSubmit(formData: FormData) {
    // 1. COMPRESIÓN
    const originalFile = formData.get('media_file') as File
    if (originalFile && originalFile.size > 0 && originalFile.type.startsWith('image/')) {
        try {
            const options = { maxSizeMB: 1.5, maxWidthOrHeight: 1920, useWebWorker: true }
            const compressedFile = await imageCompression(originalFile, options)
            formData.set('media_file', compressedFile)
        } catch (err) { console.error(err) }
    }

    // 2. DATOS
    formData.append('event_id', event.id)
    formData.append('tags', selectedTags.join(','))
    formData.append('people', selectedPeople.join(','))
    formData.append('external_links', JSON.stringify(links))

    const res = await updateTimelineEvent(formData)
    if (res?.success) setOpen(false)
    else alert(res?.error)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Editar Recuerdo</DialogTitle></DialogHeader>
        
        <form action={handleSubmit} className="space-y-6 py-2">
          
          <div className="space-y-3">
            <Input name="title" defaultValue={event.title} className="text-lg font-bold" required />
            <div className="flex gap-2">
                <Input type="date" name="date" defaultValue={event.date} required />
                <select name="visibility" defaultValue={event.visibility} className="text-sm border rounded px-2 bg-slate-50">
                    <option value="family">👨‍👩‍👧‍👦 Familia</option>
                    <option value="private">🔒 Privado</option>
                </select>
            </div>
          </div>

          <Textarea name="description" defaultValue={event.description} placeholder="Descripción..." />

          {/* GESTOR DE LINKS */}
          <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
             <Label className="text-xs font-bold text-slate-400 uppercase">Enlaces Externos</Label>
             
             {/* Lista de links actuales */}
             {links.map((link, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm bg-white p-2 rounded border">
                    <LinkIcon className="h-3 w-3 text-slate-400" />
                    <a href={link.url} target="_blank" className="flex-1 text-indigo-600 truncate underline">{link.label}</a>
                    <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-red-400" onClick={() => removeLink(idx)}>
                        <Trash2 className="h-3 w-3" />
                    </Button>
                </div>
             ))}

             {/* Añadir nuevo */}
             <div className="flex gap-2 mt-2">
                <Input placeholder="URL (ej: https://photos...)" value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)} className="text-xs h-8 flex-1" />
                <Input placeholder="Nombre" value={newLinkLabel} onChange={e => setNewLinkLabel(e.target.value)} className="text-xs h-8 w-20" />
                <Button type="button" size="icon" className="h-8 w-8 shrink-0" onClick={addLink} disabled={!newLinkUrl}>
                    <Plus className="h-4 w-4" />
                </Button>
             </div>
          </div>

          {/* SELECCIÓN PERSONAS Y ETIQUETAS (Simplificado para brevedad, copia la lógica visual del NewEventDialog aquí si quieres que se vea igual de bonito) */}
          <div className="space-y-2">
             <Label>Personas</Label>
             <div className="flex flex-wrap gap-2">
                {allPeople.map(p => (
                    <Badge key={p.id} variant={selectedPeople.includes(p.id) ? "default" : "outline"} onClick={() => togglePerson(p.id)} className="cursor-pointer">
                        {p.name}
                    </Badge>
                ))}
             </div>
          </div>
          
          <div className="space-y-2">
             <Label>Etiquetas</Label>
             <div className="flex flex-wrap gap-2">
                {allTags.map(t => (
                    <Badge key={t.id} variant={selectedTags.includes(t.id) ? "default" : "outline"} onClick={() => toggleTag(t.id)} className="cursor-pointer">
                        {t.name}
                    </Badge>
                ))}
             </div>
          </div>

          {/* FOTO */}
          <div className="grid gap-2">
            <Label>Cambiar Foto (Opcional)</Label>
            <Input name="media_file" type="file" accept="image/*" />
          </div>

          <Button type="submit" className="w-full">Guardar Cambios</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}