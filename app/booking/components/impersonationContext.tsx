'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { BookingProfile } from '@/types/booking'

interface ImpersonationContextType {
    realProfileId: string | null
    viewingAsProfileId: string | null
    setViewingAsProfileId: (id: string) => void
    profiles: BookingProfile[]
    activeProfile: BookingProfile | undefined
    isImpersonating: boolean
    isRealAdmin: boolean // Por ahora lo dejaremos true o basado en lógica futura
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined)

export function ImpersonationProvider({ 
    children, 
    realUserId, 
    profiles 
}: { 
    children: React.ReactNode, 
    realUserId: string | undefined, 
    profiles: BookingProfile[] 
}) {
    // 1. Buscamos quién soy yo realmente basándonos en el Auth ID de Supabase
    const realProfile = profiles.find(p => p.user_id === realUserId)
    const realProfileId = realProfile?.id || null

    // 2. Estado: ¿A quién estoy viendo? (Por defecto a mí mismo, o al primero si no tengo perfil)
    const [viewingAsProfileId, setViewingAsProfileId] = useState<string | null>(
        realProfileId || (profiles.length > 0 ? profiles[0].id : null)
    )

    // Si detectamos que "realProfileId" cambia (ej: carga tardía), actualizamos
    useEffect(() => {
        if (realProfileId && !viewingAsProfileId) {
            setViewingAsProfileId(realProfileId)
        }
    }, [realProfileId])

    // 3. Objeto del perfil activo
    const activeProfile = profiles.find(p => p.id === viewingAsProfileId) || realProfile

    const isImpersonating = viewingAsProfileId !== realProfileId

    // TODO: Aquí conectaríamos con tu tabla de permisos real. De momento, open bar.
    const isRealAdmin = true; 

    return (
        <ImpersonationContext.Provider value={{
            realProfileId,
            viewingAsProfileId,
            setViewingAsProfileId,
            profiles,
            activeProfile,
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