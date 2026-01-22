import { getPublicGroupData } from '@/app/finance-shared/public-actions'
import { QuickExpenseView } from './QuickExpenseView'

// 1. Cambiamos el tipo de params a Promise
export default async function QuickPage({ 
    params 
}: { 
    params: Promise<{ groupId: string }> 
}) {
    // 2. Esperamos a que se resuelvan los parámetros
    const { groupId } = await params

    // 3. Ahora ya podemos usar el groupId (que es un string real)
    const { members, categories, accounts, error } = await getPublicGroupData(groupId)

    if (error || !members) {
        return <div className="p-10 text-center text-red-500">Grupo no válido o enlace caducado.</div>
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <QuickExpenseView 
                groupId={groupId}
                members={members}
                categories={categories}
                accounts={accounts}
            />
        </div>
    )
}