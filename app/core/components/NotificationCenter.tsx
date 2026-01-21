'use client'

import { useState, useEffect } from 'react'
import { Bell, Check, Info, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AppNotification } from '@/types/notifications'
import { getMyNotifications, markNotificationAsRead, markAllAsRead } from '@/app/settings/notifications/actions'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale' // O tu locale preferido

// Mapeo de iconos y colores según tipo
const TYPE_STYLES = {
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50' },
  success: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
  warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50' },
  error: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' },
  action_needed: { icon: Bell, color: 'text-purple-500', bg: 'bg-purple-50' },
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  // Cargar notificaciones
  const fetchNotifications = async () => {
    setIsLoading(true)
    const res = await getMyNotifications()
    if (res.success && res.data) {
      setNotifications(res.data)
      setUnreadCount(res.data.filter(n => !n.read_at).length)
    }
    setIsLoading(false)
  }

  // Carga inicial
  useEffect(() => {
    fetchNotifications()
    // Opcional: Aquí podrías poner un setInterval para polling simple cada 60s
  }, [])

  // Manejadores
  const handleMarkAsRead = async (id: string, link?: string | null) => {
    // Optimistic Update UI
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
    
    // Server Call
    await markNotificationAsRead(id)

    // Navegación si existe link
    if (link) {
      setIsOpen(false) // Cerrar popover
      router.push(link)
    }
  }

  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })))
    setUnreadCount(0)
    await markAllAsRead()
  }

  return (
    <Popover open={isOpen} onOpenChange={(open) => {
        setIsOpen(open)
        if (open) fetchNotifications() // Refrescar al abrir para asegurar datos frescos
    }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-slate-500 hover:text-slate-700">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white" />
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0 mr-4" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50/50">
          <h4 className="font-semibold text-sm">Notificaciones</h4>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-auto px-2 text-xs text-slate-500"
              onClick={handleMarkAllRead}
            >
              Marcar todo leído
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[350px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
              <Bell className="h-8 w-8 opacity-20" />
              <p className="text-sm">Todo al día</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((item) => {
                const Style = TYPE_STYLES[item.type] || TYPE_STYLES.info
                const isUnread = !item.read_at

                return (
                  <div 
                    key={item.id} 
                    className={`flex gap-3 p-4 hover:bg-slate-50 transition-colors cursor-pointer ${isUnread ? 'bg-blue-50/30' : ''}`}
                    onClick={() => handleMarkAsRead(item.id, item.link_url)}
                  >
                    <div className={`mt-1 flex-shrink-0 rounded-full p-1.5 ${Style.bg}`}>
                      <Style.icon className={`h-4 w-4 ${Style.color}`} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-start gap-2">
                        <p className={`text-sm leading-tight ${isUnread ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
                          {item.title}
                        </p>
                        {isUnread && <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />}
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {item.message}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: es })} · {item.sender_module}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}