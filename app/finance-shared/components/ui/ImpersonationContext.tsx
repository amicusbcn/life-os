'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface ImpersonationContextType {
    realMemberId: string // CAMBIO: Usamos ID de miembro, no de usuario
    viewingAsMemberId: string // CAMBIO: ID de miembro
    setViewingAsMemberId: (id: string) => void
    members: any[]
    activeMember: any 
    isImpersonating: boolean
    isRealAdmin: boolean
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined)

export function ImpersonationProvider({ 
    children, 
    realUserId, 
    members 
}: { 
    children: React.ReactNode, 
    realUserId: string, 
    members: any[] 
}) {
    // 1. Traducir el ID de Login (Supabase) al ID de Miembro interno
    const realMember = members.find(m => m.user_id === realUserId)
    const realMemberId = realMember?.id

    // 2. Estado: ¿A qué MIEMBRO estoy viendo?
    // Inicializamos con mi propio ID de miembro
    const [viewingAsMemberId, setViewingAsMemberId] = useState(realMemberId)

    const isRealAdmin = realMember?.role === 'admin'

    // 3. Buscar el objeto del miembro activo (sea yo o sea mi abuela que no tiene login)
    // Buscamos por ID de tabla, que TODOS tienen.
    const activeMember = members.find(m => m.id === viewingAsMemberId) || realMember

    const isImpersonating = viewingAsMemberId !== realMemberId

    return (
        <ImpersonationContext.Provider value={{
            realMemberId,
            viewingAsMemberId,
            setViewingAsMemberId,
            members,
            activeMember,
            isImpersonating,
            isRealAdmin
        }}>
            {children}
        </ImpersonationContext.Provider>
    )
}

export function useImpersonation() {
    const context = useContext(ImpersonationContext)
    if (!context) throw new Error('useImpersonation must be used within Provider')
    return context
}