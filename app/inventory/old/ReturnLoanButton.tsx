'use client'

import { returnInventoryLoan } from "@/app/inventory/actions"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Loader2 } from "lucide-react"
import { useState } from "react"

export function ReturnLoanButton({ loanId, itemId }: { loanId: string, itemId: string }) {
  const [isLoading, setIsLoading] = useState(false)

  const handleReturn = async () => {
    if(!confirm("¿Confirmar que el objeto ha sido devuelto?")) return;
    
    setIsLoading(true)
    await returnInventoryLoan(loanId, itemId)
    setIsLoading(false)
  }

  return (
    <Button 
      size="sm" 
      variant="outline" 
      onClick={handleReturn} 
      disabled={isLoading}
      className="h-7 text-xs bg-white hover:bg-green-50 text-slate-600 hover:text-green-700 border-slate-200"
    >
      {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
      Devolver
    </Button>
  )
}