'use client'

import { SharedMember } from '@/types/finance-shared'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { deleteSharedMember } from '@/app/finance-shared/actions'
import { toast } from 'sonner'
import { AddMemberDialog } from '../dialogs/AddMemberDialog'

export function MembersList({ members, groupId, isAdmin }: { members: SharedMember[], groupId: string, isAdmin: boolean }) {
  
  const handleDelete = async (id: string) => {
    if(!confirm('¿Seguro? Si tiene gastos asociados dará error.')) return;
    const res = await deleteSharedMember(id, groupId)
    if(res.error) toast.error(res.error)
    else toast.success('Eliminado')
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Miembros del Grupo</h3>
        {isAdmin && <AddMemberDialog groupId={groupId} />}
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium">{member.name}</TableCell>
                <TableCell>
                    <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                        {member.role === 'admin' ? 'Admin' : 'Miembro'}
                    </Badge>
                </TableCell>
                <TableCell>
                    <span className="text-xs text-muted-foreground">
                        {member.user_id ? 'Usuario Registrado' : 'Usuario Virtual'}
                    </span>
                </TableCell>
                <TableCell className="text-right">
                  {isAdmin && (
                    <Button 
                        variant="ghost" size="icon" className="text-red-500 hover:text-red-600"
                        onClick={() => handleDelete(member.id)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}