'use client'

import { useState } from 'react'
import { SharedMember } from '@/types/finance-shared'
import { updateSharedMember } from '@/app/finance-shared/actions'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function EditMemberDialog({ member, groupId }: { member: SharedMember, groupId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(member.name)
  const [email, setEmail] = useState(member.email || '')
  const [role, setRole] = useState<'admin' | 'member'>(member.role)
  const [initialBalance, setInitialBalance] = useState(member.initial_balance?.toString() || '0')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const res = await updateSharedMember({ 
        memberId: member.id, 
        groupId, 
        name, 
        role, 
        email: email.trim() || undefined ,
        initial_balance: parseFloat(initialBalance) || 0
    })
    
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success('Miembro actualizado')
      setOpen(false)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
            <Pencil className="h-4 w-4 text-slate-400 hover:text-indigo-600" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Editar Miembro</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-2">
            <Label>Nombre (Visual)</Label>
            <Input 
                value={name} onChange={e => setName(e.target.value)} 
                required 
            />
          </div>
          <div className="space-y-2">
              <Label>Saldo Inicial (Histórico)</Label>
              <Input 
                  type="number" 
                  step="0.01" 
                  value={initialBalance} 
                  onChange={e => setInitialBalance(e.target.value)} 
              />
              <p className="text-[10px] text-muted-foreground">
                  Usa valores positivos si el grupo le debe dinero, o negativos si él debe al grupo.
              </p>
          </div>

          <div className="space-y-2">
            <Label>Email (Para vincular usuario)</Label>
            <Input 
                type="email"
                value={email} onChange={e => setEmail(e.target.value)} 
                placeholder="ejemplo@email.com"
            />
            <p className="text-[10px] text-muted-foreground">
                Si el email coincide con un usuario registrado, se vinculará automáticamente.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Rol en el Grupo</Label>
            <Select value={role} onValueChange={(v: any) => setRole(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="member">Miembro (Solo participa)</SelectItem>
                    <SelectItem value="admin">Administrador (Gestiona)</SelectItem>
                </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : 'Guardar Cambios'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}