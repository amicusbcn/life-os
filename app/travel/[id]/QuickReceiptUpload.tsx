'use client'

import { useState, useRef } from 'react'
import { Upload, Loader2, Plus } from 'lucide-react'
import { uploadExpenseReceipt } from '../actions'

export function QuickReceiptUpload({ expenseId, tripId }: { expenseId: string, tripId: string }) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true) // Activamos el spinner

    const formData = new FormData()
    formData.append('expense_id', expenseId)
    formData.append('trip_id', tripId)
    formData.append('file', file)

    const res = await uploadExpenseReceipt(formData)
    
    if (!res?.success) {
      alert("Error: " + res?.error)
    }
    
    setIsUploading(false) // Desactivamos spinner (la página se recargará sola con revalidatePath)
  }

  return (
    <>
      {/* Input invisible */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        capture="environment"
        accept="image/*,application/pdf"
        onChange={handleFileChange}
      />
      
      {/* El Botón visible */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="inline-flex items-center gap-1.5 bg-white text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 px-3 py-1 rounded-md text-[11px] font-medium border border-dashed border-slate-300 hover:border-indigo-300 transition-all active:scale-95"
      >
        {isUploading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
            <Upload className="h-3 w-3" />
        )}
        {isUploading ? 'Subiendo...' : 'Subir Ticket'}
      </button>
    </>
  )
}