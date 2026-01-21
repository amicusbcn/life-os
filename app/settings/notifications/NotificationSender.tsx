'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { sendManualNotification } from './actions' 
import { Loader2, Send } from 'lucide-react'
import { toast } from 'sonner' // <--- Usamos Sonner

interface NotificationSenderProps {
    onSuccess?: () => void;
}

export function NotificationSender({ onSuccess }: NotificationSenderProps) {
  const [loading, setLoading] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    const res = await sendManualNotification(formData)
    setLoading(false)

    if (res.success) {
      toast.success('Notificación enviada')
      formRef.current?.reset()
      
      // Si el padre nos pasó una función de cierre, la ejecutamos
      if (onSuccess) {
          onSuccess()
      }
    } else {
      toast.error('Error', { description: res.error })
    }
  }

  return (
    <div className="p-6 bg-white border border-slate-200 rounded-lg shadow-sm max-w-md">
      <div className="mb-6 pb-4 border-b border-slate-100">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Send className="w-5 h-5 text-indigo-600" />
            Centro de Difusión
        </h2>
        <p className="text-sm text-slate-500">Envía avisos manuales al sistema</p>
      </div>
      
      <form ref={formRef} action={handleSubmit} className="space-y-4">
        
        <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-slate-500">Destinatario</Label>
            <Select name="target" defaultValue="me">
                <SelectTrigger>
                    <SelectValue placeholder="Selecciona destino" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="me">Solo a mí (Prueba)</SelectItem>
                    <SelectItem value="all">Todos los usuarios</SelectItem>
                </SelectContent>
            </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-slate-500">Tipo</Label>
                <Select name="type" defaultValue="info">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="info">Info (Azul)</SelectItem>
                        <SelectItem value="success">Éxito (Verde)</SelectItem>
                        <SelectItem value="warning">Aviso (Ambar)</SelectItem>
                        <SelectItem value="error">Error (Rojo)</SelectItem>
                        <SelectItem value="action_needed">Acción (Morado)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            
            <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-slate-500">Prioridad</Label>
                <Select name="priority" defaultValue="normal">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="low">Baja</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">Alta (Destacado)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>

        <div className="space-y-2">
            <Label>Título</Label>
            <Input name="title" placeholder="Ej: Servidor en mantenimiento" required className="font-medium" />
        </div>

        <div className="space-y-2">
            <Label>Mensaje</Label>
            <Textarea name="message" placeholder="Detalles del aviso..." rows={3} />
        </div>

        <div className="space-y-2">
            <Label>Enlace de Acción (Opcional)</Label>
            <Input name="link" placeholder="/travel/expenses" className="text-sm font-mono text-slate-600" />
        </div>

        <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Enviar Notificación'}
        </Button>
      </form>
    </div>
  )
}