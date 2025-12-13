'use client'

import { useState, useTransition } from 'react'
import { Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { updateTimelineEvent, createTag } from '../actions'
import { MultiSelect } from '@/components/ui/multi-select'

// --- TIPOS ADAPTADOS A UUIDs (Strings) ---
// Usamos string | number para ser flexibles, pero en tu caso son strings
type Tag = { id: string | number; name: string; color: string | null }
type Person = { id: string | number; name: string }

type TimelineEvent = {
  id: string
  date: string
  title: string
  description: string | null
  media_url: string | null
  external_links: { label: string; url: string }[] | null
  timeline_event_tags: { tag: Tag }[]
  timeline_event_people: { person: Person }[]
}

interface EditEventDialogProps {
  event: TimelineEvent
  allTags: Tag[]
  allPeople: Person[]
}

export function EditEventDialog({ event, allTags, allPeople }: EditEventDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [availableTags, setAvailableTags] = useState(allTags);
  // --- ESTADO INICIAL ---
  const [formData, setFormData] = useState({
    title: event.title,
    // Aseguramos formato YYYY-MM-DD para el input date
    date: event.date.split('T')[0], 
    description: event.description || '',
    media_url: event.media_url || '',
    
    // IMPORTANTE: Cargamos los IDs como Strings desde el principio
    // para evitar conflictos con los UUIDs
    selectedTags: event.timeline_event_tags.map(t => t.tag.id.toString()),
    selectedPeople: event.timeline_event_people.map(p => p.person.id.toString()),
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }
const handleCreateTag = async (tagName: string) => {
    // Optimismo UI: Podrías poner un toast de "Creando..."
    
    const result = await createTag(tagName); // Llamada al servidor

    if (result.success && result.tag) {
      const newTag = result.tag;
      
      // A. Añadimos la nueva etiqueta a la lista de opciones disponibles
      setAvailableTags(prev => [...prev, newTag]);

      // B. La seleccionamos automáticamente en el formulario
      setFormData(prev => ({
        ...prev,
        selectedTags: [...prev.selectedTags, newTag.id.toString()]
      }));

      toast.success(`Etiqueta "${newTag.name}" creada`);
    } else {
      toast.error("Error al crear la etiqueta");
    }
  };
  
  async function handleSubmit(formDataFromEvent: FormData) {
    startTransition(async () => {
      // 1. Añadimos el ID del evento (necesario para el WHERE del update)
      formDataFromEvent.append('event_id', event.id);

      // 2. FORZAMOS LOS DATOS DE LOS ARRAYS (La Red de Seguridad)
      // Aunque tenemos inputs ocultos, hacemos esto para estar 100% seguros
      // de que enviamos el estado actual de React.
      
      // Eliminamos lo que venga del formulario nativo por si acaso para no duplicar
      formDataFromEvent.delete('tags');
      formDataFromEvent.delete('people');

      // Añadimos la versión limpia del estado
      formDataFromEvent.append('tags', formData.selectedTags.join(','));
      formDataFromEvent.append('people', formData.selectedPeople.join(','));

      const result = await updateTimelineEvent(formDataFromEvent);
      
      if (result?.error) {
        toast.error(`Error al actualizar: ${result.error}`);
        console.error(result.error);
      } else {
        toast.success('Recuerdo actualizado con éxito')
        setIsOpen(false)
      }
    })
  }

  // Opciones para el Select (Value siempre String)
  const tagOptions = availableTags.map(t => ({ value: t.id.toString(), label: t.name }))
  const peopleOptions = allPeople.map(p => ({ value: p.id.toString(), label: p.name }))
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-colors">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Recuerdo</DialogTitle>
        </DialogHeader>
        
        <form action={handleSubmit}>
          <div className="grid gap-4 py-4">
            
            {/* TÍTULO */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">Título</Label>
              <Input id="title" name="title" value={formData.title} onChange={handleInputChange} className="col-span-3" required />
            </div>

            {/* FECHA */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">Fecha</Label>
              <Input id="date" name="date" type="date" value={formData.date} onChange={handleInputChange} className="col-span-3" required />
            </div>

            {/* DESCRIPCIÓN */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">Descripción</Label>
              <Textarea id="description" name="description" value={formData.description} onChange={handleInputChange} className="col-span-3" />
            </div>

            {/* URL IMAGEN (Opcional, ya que usas subida de ficheros en actions) */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="media_url" className="text-right">URL Imagen</Label>
              <Input id="media_url" name="media_url" value={formData.media_url} onChange={handleInputChange} className="col-span-3" />
            </div>

            {/* --- ETIQUETAS (CORREGIDO) --- */}
      <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="tags" className="text-right">Etiquetas</Label>
          <MultiSelect
            className="col-span-3"
            options={tagOptions}
            selected={formData.selectedTags}
            onChange={(newSelected) => setFormData(prev => ({ ...prev, selectedTags: newSelected }))}
            
            onCreate={handleCreateTag} // <--- AQUI LA MAGIA
            
            placeholder="Selecciona o escribe para crear..."
          />
          <input type="hidden" name="tags" value={formData.selectedTags.join(',')} />
      </div>

            {/* --- PERSONAS (CORREGIDO) --- */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="people" className="text-right">Personas</Label>
              <MultiSelect
                className="col-span-3"
                options={peopleOptions}
                selected={formData.selectedPeople} // Pasamos strings directos
                onChange={(newSelected) => setFormData(prev => ({ ...prev, selectedPeople: newSelected }))} // Sin conversión a Number
                placeholder="Selecciona personas..."
              />
              {/* Input Oculto de respaldo */}
              <input type="hidden" name="people" value={formData.selectedPeople.join(',')} />
            </div>

          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" disabled={isPending}>Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}