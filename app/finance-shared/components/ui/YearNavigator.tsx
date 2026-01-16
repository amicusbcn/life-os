'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

interface Props {
    currentYear: number
}

export function YearNavigator({ currentYear }: Props) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const thisYear = new Date().getFullYear()

    // Función para cambiar la URL manteniendo el groupId
    const handleYearChange = (newYear: number) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('year', newYear.toString())
        router.push(`?${params.toString()}`)
    }

    return (
        <div className="flex items-center justify-center gap-4 bg-white p-2 rounded-lg border shadow-sm w-full sm:w-auto">
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => handleYearChange(currentYear - 1)}
                className="h-8 w-8"
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2 font-bold text-slate-700 w-24 justify-center">
                <Calendar className="h-4 w-4 text-indigo-500" />
                <span>{currentYear}</span>
            </div>

            <Button 
                variant="ghost" 
                size="icon" 
                disabled={currentYear >= thisYear} // Deshabilitar futuro
                onClick={() => handleYearChange(currentYear + 1)}
                className={`h-8 w-8 ${currentYear >= thisYear ? 'opacity-20' : ''}`}
            >
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
    )
}