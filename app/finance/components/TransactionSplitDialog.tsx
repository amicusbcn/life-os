'use client'

import { useState, useEffect } from 'react'
import { useFieldArray, useForm, Controller } from 'react-hook-form'
import { Plus, Trash2, Split, ArrowRightLeft } from 'lucide-react' // 🪄 Añadimos icono de transferencia
import { cn } from '@/lib/utils'
import { toast } from "sonner"
import { 
  FinanceTransaction, 
  FinanceCategory, 
  FinanceTransactionSplit,
  FinanceAccount // 👈 Necesitamos las cuentas
} from '@/types/finance'
import { splitTransactionAction, removeSplitsAction } from '@/app/finance/actions'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Props {
  transaction: FinanceTransaction
  categories: FinanceCategory[]
  accounts: FinanceAccount[] // 👈 Recibimos las cuentas
}

// ID de la categoría de transferencia
const TRANSFER_CAT_ID = "10310a6a-5d3b-4e95-a19f-bfef8cd2dd1a";

type SplitFormValues = {
  splits: (Omit<FinanceTransactionSplit, 'id' | 'user_id' | 'transaction_id'> & { 
    target_account_id?: string 
  })[]
}

export function TransactionSplitDialog({ transaction, categories, accounts }: Props) {
  const [open, setOpen] = useState(false)
  const totalAmount = Math.abs(transaction.amount)

  const { register, control, handleSubmit, watch, reset, formState: { isSubmitting } } = useForm<SplitFormValues>({
    defaultValues: {
      splits: [{ category_id: transaction.category_id || '', amount: totalAmount, notes: '' }]
    }
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'splits' })
  const watchedSplits = watch('splits')
  
  useEffect(() => {
    if (open) {
      if (transaction.is_split && transaction.splits && transaction.splits.length > 0) {
        reset({
          splits: transaction.splits.map(s => ({
            category_id: s.category_id,
            amount: s.amount,
            notes: s.notes || '',
            // Aquí cargaríamos el target_account_id si ya existiera en la DB
          }))
        });
      } else {
        reset({
          splits: [{ category_id: transaction.category_id || '', amount: totalAmount, notes: '' }]
        });
      }
    }
  }, [open, transaction, totalAmount, reset]);

  const currentSum = watchedSplits.reduce((acc, split) => acc + (Number(split.amount) || 0), 0)
  const remaining = totalAmount - currentSum
  const isSumCorrect = Math.abs(remaining) < 0.01

  const onSubmit = async (data: SplitFormValues) => {
    // Validación de categorías
    const hasInvalidCategory = data.splits.some(s => !s.category_id || s.category_id.trim() === "");
    if (hasInvalidCategory) {
        toast.error("Selecciona una categoría para todas las líneas");
        return;
    }

    // Validación de cuenta destino si es transferencia
    const missingTarget = data.splits.some(s => s.category_id === TRANSFER_CAT_ID && !s.target_account_id);
    if (missingTarget) {
        toast.error("Selecciona la cuenta destino para la transferencia");
        return;
    }

    const toastId = toast.loading("Actualizando desglose y vínculos...");
    
    try {
      const result = await splitTransactionAction(transaction.id, data.splits)
      if (result.success) {
        toast.success("Desglose guardado", { id: toastId })
        setOpen(false)
      } else {
        toast.error(result.error, { id: toastId })
      }
    } catch (err) {
      toast.error("Error en el servidor", { id: toastId })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-indigo-50 hover:text-indigo-600">
          <Split className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-black">
            <Split className="h-5 w-5 text-indigo-500" />
            DESGLOSE MIXTO
          </DialogTitle>
          <div className="text-xs bg-slate-100 p-2 rounded-lg text-slate-600 font-mono">
             {transaction.concept} | <strong>{totalAmount.toFixed(2)}€</strong>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className={cn(
            "flex justify-between p-3 rounded-xl border text-xs font-bold transition-colors",
            isSumCorrect ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"
          )}>
            <span>SUMA: {currentSum.toFixed(2)}€</span>
            <span>{isSumCorrect ? "✓ CUADRADO" : `RESTANTE: ${remaining.toFixed(2)}€`}</span>
          </div>

          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {fields.map((field, index) => {
              const isTransfer = watchedSplits[index]?.category_id === TRANSFER_CAT_ID;

              return (
                <div key={field.id} className={cn(
                  "relative p-3 rounded-xl border border-slate-100 transition-all",
                  isTransfer ? "bg-indigo-50/30 border-indigo-100 ring-1 ring-indigo-100" : "bg-white"
                )}>
                  <div className="flex gap-2 items-start mb-2">
                    <div className="flex-1 space-y-2">
                      <Controller
                        name={`splits.${index}.category_id`}
                        control={control}
                        render={({ field: selectField }) => (
                          <Select onValueChange={selectField.onChange} value={selectField.value}>
                            <SelectTrigger className="h-8 bg-white border-slate-200 text-xs">
                              <SelectValue placeholder="Categoría" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map(cat => (
                                <SelectItem key={cat.id} value={cat.id} className="text-xs">{cat.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    
                      {/* 🪄 SELECTOR DE CUENTA DESTINO (Solo si es Transferencia) */}
                    <div className="flex-1">
                      {isTransfer && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                          <ArrowRightLeft className="h-3 w-3 text-indigo-500 shrink-0" />
                          <Controller
                            name={`splits.${index}.target_account_id`}
                            control={control}
                            render={({ field: selectField }) => (
                              <Select onValueChange={selectField.onChange} value={selectField.value}>
                                <SelectTrigger className="h-7 bg-white border-indigo-200 text-[10px] font-bold text-indigo-700">
                                  <SelectValue placeholder="¿CUENTA?" />
                                </SelectTrigger>
                                <SelectContent>
                                  {accounts.filter(acc => acc.id !== transaction.account_id).map(acc => (
                                    <SelectItem key={acc.id} value={acc.id} className="text-[10px]">
                                      {acc.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>
                      )}
                    </div>
                    <div className="w-24">
                      <Input 
                        type="number" 
                        step="0.01" 
                        {...register(`splits.${index}.amount`, { valueAsNumber: true })} 
                        className="h-8 text-right font-mono font-bold text-xs"
                      />
                    </div>
                    <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-slate-300 hover:text-destructive"
                        onClick={() => remove(index)} 
                        disabled={fields.length === 1}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  

                  <Input 
                    {...register(`splits.${index}.notes`)} 
                    placeholder="Nota o detalle..." 
                    className="h-7 text-[10px] bg-transparent border-dashed border-slate-200 mt-2" 
                  />
                </div>
              );
            })}
          </div>

          <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="w-full border-dashed text-slate-500 h-8 text-[10px]" 
              onClick={() => append({ category_id: '', amount: 0, notes: '' })}
          >
              <Plus className="h-3 w-3 mr-2" /> AÑADIR LÍNEA
          </Button>

          <div className="pt-2">
            <Button 
                type="submit" 
                className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold text-xs h-10" 
                disabled={!isSumCorrect || isSubmitting}
            >
                {isSubmitting ? 'PROCESANDO...' : 'GUARDAR DESGLOSE MIXTO'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}