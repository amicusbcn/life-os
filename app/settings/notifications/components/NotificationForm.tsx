// app/settings/notifications/components/NotificationForm.tsx
'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { sendManualNotification } from '../actions' 
import { Loader2, Send, Target, Palette, Link as LinkIcon } from 'lucide-react'
import { toast } from 'sonner'

export function NotificationForm() {
  const [loading, setLoading] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    const res = await sendManualNotification(formData)
    setLoading(false)

    if (res.success) {
      toast.success('Notificación enviada con éxito')
      formRef.current?.reset()
    } else {
      toast.error('Error al enviar', { description: res.error })
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-6">
      
      {/* SECCIÓN 1: AUDIENCIA Y CANAL */}
      <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-slate-400" />
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Target & Configuración</h4>
        </div>
        
        <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-700">Destinatario</Label>
            <Select name="target" defaultValue="me">
                <SelectTrigger className="bg-slate-50/50">
                    <SelectValue placeholder="Selecciona destino" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="me">Solo a mí (Prueba de sistema)</SelectItem>
                    <SelectItem value="all">Broadcast Global (Todos los usuarios)</SelectItem>
                </SelectContent>
            </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">Tipo de Alerta</Label>
                <Select name="type" defaultValue="info">
                    <SelectTrigger className="bg-slate-50/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="info">Información (Azul)</SelectItem>
                        <SelectItem value="success">Sistema OK (Verde)</SelectItem>
                        <SelectItem value="warning">Atención (Ambar)</SelectItem>
                        <SelectItem value="error">Crítico (Rojo)</SelectItem>
                        <SelectItem value="action_needed">Recomendación (Morado)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            
            <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">Prioridad</Label>
                <Select name="priority" defaultValue="normal">
                    <SelectTrigger className="bg-slate-50/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="low">Baja (Silenciosa)</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">Alta (Urgente)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
      </section>

      {/* SECCIÓN 2: CONTENIDO */}
      <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 mb-2">
            <Palette className="h-4 w-4 text-slate-400" />
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Contenido del Mensaje</h4>
        </div>

        <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-700">Título del aviso</Label>
            <Input name="title" placeholder="Ej: Nueva funcionalidad disponible" required className="bg-slate-50/50" />
        </div>

        <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-700">Cuerpo del mensaje</Label>
            <Textarea name="message" placeholder="Escribe aquí los detalles..." rows={4} className="bg-slate-50/50 resize-none" />
        </div>
      </section>

      {/* SECCIÓN 3: ACCIÓN */}
      <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 mb-2">
            <LinkIcon className="h-4 w-4 text-slate-400" />
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Interacción</h4>
        </div>
        <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-700">Enlace (Ruta interna o URL)</Label>
            <Input name="link" placeholder="/dashboard/stats" className="text-sm font-mono text-slate-600 bg-slate-50/50" />
        </div>
      </section>

      <Button 
        type="submit" 
        className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg shadow-indigo-100 transition-all hover:scale-[1.01] active:scale-[0.99]" 
        disabled={loading}
      >
        {loading ? (
            <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Procesando envío...
            </>
        ) : (
            <>
                <Send className="mr-2 h-5 w-5" /> Lanzar Notificación
            </>
        )}
      </Button>
    </form>
  )
}