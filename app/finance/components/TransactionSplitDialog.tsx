'use client'

import { useState, useEffect } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { Plus, Trash2, Split } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from "sonner"
import { 
  FinanceTransaction, 
  FinanceCategory, 
  FinanceTransactionSplit 
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
}

type SplitFormValues = {
  splits: Omit<FinanceTransactionSplit, 'id' | 'user_id' | 'transaction_id'>[]
}

export function TransactionSplitDialog({ transaction, categories }: Props) {
  const [open, setOpen] = useState(false)
  const totalAmount = Math.abs(transaction.amount)

  // Configuración del formulario
  const { register, control, handleSubmit, watch, reset, formState: { isSubmitting } } = useForm<SplitFormValues>({
    defaultValues: {
      splits: [{ category_id: transaction.category_id || '', amount: totalAmount, notes: '' }]
    }
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'splits' })
  const watchedSplits = watch('splits')
  
  // Efecto para CARGAR datos existentes cuando se abre el diálogo
  useEffect(() => {
    if (open) {
      if (transaction.is_split && transaction.splits && transaction.splits.length > 0) {
        // Si ya existen splits, los cargamos en el formulario
        reset({
          splits: transaction.splits.map(s => ({
            category_id: s.category_id,
            amount: s.amount,
            notes: s.notes || ''
          }))
        });
      } else {
        // Si es nuevo, cargamos el total en la primera línea
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
    // Validación de UUIDs vacíos para evitar errores de Postgres
    if (data.splits.some(s => !s.category_id || s.category_id === "")) {
        toast.error("Selecciona una categoría para todas las líneas");
        return;
    }

    const toastId = toast.loading("Actualizando desglose...");
    
    try {
      const result = await splitTransactionAction(transaction.id, data.splits)
      if (result.success) {
        toast.success("Desglose guardado correctamente", { id: toastId })
        setOpen(false)
      } else {
        toast.error(result.error, { id: toastId })
      }
    } catch (err) {
      toast.error("Error de comunicación con el servidor", { id: toastId })
    }
  }

  const handleRemoveAllSplits = async () => {
      if (!confirm("¿Estás seguro de que quieres eliminar todo el desglose? La transacción volverá a su estado original.")) return;
      
      const toastId = toast.loading("Eliminando desglose...");
      const result = await removeSplitsAction(transaction.id);
      
      if (result.success) {
          toast.success("Desglose eliminado", { id: toastId });
          setOpen(false);
      } else {
          toast.error(result.error, { id: toastId });
      }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
          <Split className="h-4 w-4" />
          <span className="sr-only">Gestionar Desglose</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Split className="h-5 w-5 text-indigo-500" />
            {transaction.is_split ? "Editar Desglose" : "Desglosar Transacción"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground italic border-l-2 pl-2 border-indigo-200">
            {transaction.concept} ({totalAmount.toFixed(2)}€)
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          {/* Indicador de balance */}
          <div className={cn(
            "flex justify-between p-3 rounded-md border text-sm font-mono transition-colors",
            isSumCorrect ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"
          )}>
            <span>Suma: {currentSum.toFixed(2)}€</span>
            <span className="font-bold">
                {isSumCorrect ? "✓ Cuadrado" : `Restante: ${remaining.toFixed(2)}€`}
            </span>
          </div>

          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-2 items-start border-b pb-4 last:border-0 group">
                <div className="flex-1 space-y-2">
                  <Select 
                    onValueChange={(val) => register(`splits.${index}.category_id`).onChange({ target: { value: val } })}
                    defaultValue={field.category_id}
                  >
                    <SelectTrigger className="h-8 bg-white">
                      <SelectValue placeholder="Categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input 
                    {...register(`splits.${index}.notes`)} 
                    placeholder="Nota adicional..." 
                    className="h-7 text-xs bg-slate-50/50 border-none focus-visible:ring-1" 
                  />
                </div>
                <div className="w-28 text-right">
                  <Input 
                    type="number" 
                    step="0.01" 
                    {...register(`splits.${index}.amount`, { valueAsNumber: true })} 
                    className="h-8 text-right font-mono font-bold"
                  />
                </div>
                <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-slate-400 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => remove(index)} 
                    disabled={fields.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="flex-1 border-dashed" 
                onClick={() => append({ category_id: '', amount: 0, notes: '' })}
            >
                <Plus className="h-4 w-4 mr-2" /> Añadir Línea
            </Button>
          </div>

          <div className="pt-2 space-y-2">
            <Button 
                type="submit" 
                className="w-full bg-indigo-600 hover:bg-indigo-700" 
                disabled={!isSumCorrect || isSubmitting}
            >
                {isSubmitting ? 'Procesando...' : 'Guardar Cambios'}
            </Button>

            {transaction.is_split && (
                <Button 
                    type="button" 
                    variant="ghost" 
                    className="w-full text-destructive hover:bg-destructive/10" 
                    onClick={handleRemoveAllSplits}
                    disabled={isSubmitting}
                >
                    <Trash2 className="h-4 w-4 mr-2" /> Eliminar Desglose y Volver a Original
                </Button>
            )}
        </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}