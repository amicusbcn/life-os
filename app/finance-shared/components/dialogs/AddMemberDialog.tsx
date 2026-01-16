'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { addSharedMember } from '@/app/finance-shared/actions'
import { UserPlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function AddMemberDialog({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [role, setRole] = useState<'admin'|'member'>('member')
  const [initialBalance, setInitialBalance] = useState('')
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const res = await addSharedMember({ group_id: groupId, name, role })
    
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success('Miembro añadido')
      setOpen(false)
      setName('')
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UserPlus className="mr-2 h-4 w-4" /> Añadir Miembro
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Añadir Persona al Grupo</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                  <Label>Saldo Inicial (€)</Label>
                  <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00" 
                      // Manejamos esto con un estado nuevo [initialBalance, setInitialBalance]
                      // Asumo que lo crearás arriba: const [initialBalance, setInitialBalance] = useState('')
                      value={initialBalance} 
                      onChange={e => setInitialBalance(e.target.value)} 
                  />
              </div>
          </div>

          <div className="space-y-2">
            <Label>Rol</Label>
            <Select value={role} onValueChange={(v: any) => setRole(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="member">Miembro (Solo gastos)</SelectItem>
                    <SelectItem value="admin">Administrador (Gestión)</SelectItem>
                </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : 'Añadir'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}