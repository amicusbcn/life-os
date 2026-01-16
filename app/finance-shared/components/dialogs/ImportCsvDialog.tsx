// /app/finance-shared/components/dialogs/ImportCsvDialog.tsx

'use client'

import { useState, useEffect } from 'react'
import Papa from 'papaparse'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { FileSpreadsheet, ArrowRight, Loader2, UploadCloud, RefreshCw } from 'lucide-react'
import { importBankTransactions } from '@/app/finance-shared/actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Props {
    groupId: string
}

export function ImportCsvDialog({ groupId }: Props) {
    const [open, setOpen] = useState(false)
    const [step, setStep] = useState(1) 
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const [csvData, setCsvData] = useState<any[]>([])
    const [headers, setHeaders] = useState<string[]>([])
    
    // Mapeo
    const [mapDate, setMapDate] = useState('')
    const [mapDesc, setMapDesc] = useState('')
    const [mapAmount, setMapAmount] = useState('')
    const [mapNotes, setMapNotes] = useState('none')
    const [mapBalance, setMapBalance] = useState('none') 
    
    const [invertSign, setInvertSign] = useState(false)
    const [processedData, setProcessedData] = useState<any[]>([])

    // ---------------------------------------------------------
    // 🧠 AUTO-MAPEO INTELIGENTE
    // ---------------------------------------------------------
    useEffect(() => {
        if (headers.length > 0 && step === 2) {
            console.log("Intentando auto-mapear columnas...", headers)
            
            const findCol = (keywords: string[]) => 
                headers.find(h => keywords.some(k => h.toLowerCase().includes(k))) || ''

            // Fecha
            const dateCol = findCol(['fecha', 'date', 'f.valor', 'valor'])
            if (dateCol) setMapDate(dateCol)

            // Concepto
            const descCol = findCol(['concepto', 'movimiento', 'detalle', 'concept'])
            if (descCol) setMapDesc(descCol)

            // Importe (evitar conflicto con "saldo")
            const amountCol = headers.find(h => 
                ['importe', 'monto', 'cantidad', 'euros', 'amount'].some(k => h.toLowerCase().includes(k)) &&
                !h.toLowerCase().includes('saldo')
            ) || ''
            if (amountCol) setMapAmount(amountCol)

            // Saldo
            const balCol = findCol(['saldo', 'balance', 'resultante'])
            if (balCol) setMapBalance(balCol)
                
            // Saldo
            const notesCol = findCol(['más datos', 'extra', 'info'])
            if (notesCol) setMapNotes(notesCol)
        }
    }, [headers, step])


    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            encoding: "ISO-8859-1", 
            complete: (results) => {
                setHeaders(results.meta.fields || [])
                setCsvData(results.data)
                setStep(2)
            },
            error: (err) => toast.error('Error CSV: ' + err.message)
        })
    }

    const handleMappingSubmit = () => {
        if (!mapDate || !mapDesc || !mapAmount) {
            toast.error('Faltan columnas obligatorias (Fecha, Concepto o Importe)')
            return
        }

        console.log("Procesando datos con mapeo:", { mapDate, mapDesc, mapAmount, mapBalance, mapNotes })

        const formatted = csvData.map((row, index) => {
            // A. FECHA
            let dateStr = row[mapDate]
            const dateParts = dateStr?.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/)
            if (dateParts) {
                const [, day, month, year] = dateParts
                dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
            } else {
                try {
                    const d = new Date(dateStr)
                    if (!isNaN(d.getTime())) dateStr = d.toISOString().split('T')[0]
                } catch {
                    dateStr = new Date().toISOString().split('T')[0]
                }
            }

            // B. IMPORTE & SALDO
            const sanitize = (val: string) => val ? val.replace(/\./g, '').replace(',', '.') : '0'
            const clean = (val: string) => val ? val.replace(/[^0-9.,-]/g, '') : '0'

            // Importe
            let amount = parseFloat(sanitize(clean(row[mapAmount])))
            if (isNaN(amount)) amount = 0
            if (invertSign) amount = amount * -1

            // Saldo
            let balance = undefined
            if (mapBalance !== 'none') {
                balance = parseFloat(sanitize(clean(row[mapBalance])))
                if (isNaN(balance)) balance = undefined
            }

            return {
                id: index,
                date: dateStr,
                description: row[mapDesc] || 'Sin concepto',
                notes: mapNotes !== 'none' ? row[mapNotes] : '',
                bank_balance: balance, // <--- GUARDAMOS
                amount: amount,
                selected: true
            }
        }).filter(item => {
            // Depuración: Si ves que no carga nada, mira esto
            if (item.amount === 0) console.warn("Fila ignorada por importe 0:", item)
            return item.amount !== 0
        })

        console.log("Datos procesados listos:", formatted.length)
        
        if (formatted.length === 0) {
            toast.warning("No se han encontrado filas válidas. Revisa las columnas seleccionadas.")
            return
        }

        setProcessedData(formatted)
        setStep(3)
    }

    const handleFinalImport = async () => {
        setLoading(true)
        const toImport = processedData
            .filter(item => item.selected)
            .map(({ date, amount, description, notes, bank_balance }) => ({ 
                date, amount, description, notes, bank_balance 
            }))

        console.log("Enviando al servidor:", toImport.length, "filas")

        const res = await importBankTransactions(groupId, toImport)
        
        if (res.error) {
            toast.error(res.error)
            console.error(res.error)
        } else {
            toast.success(`${res.count} movimientos importados`)
            setOpen(false)
            setStep(1)
            setCsvData([])
            router.refresh()
        }
        setLoading(false)
    }

    const toggleRow = (index: number) => {
        setProcessedData(prev => prev.map((item, i) => i === index ? { ...item, selected: !item.selected } : item))
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-dashed gap-2 text-slate-600">
                    <FileSpreadsheet className="h-4 w-4" /> Importar CSV
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Importar Movimientos</DialogTitle>
                </DialogHeader>

                {step === 1 && (
                    <div className="py-10 flex flex-col items-center border-2 border-dashed rounded-xl bg-slate-50">
                        <UploadCloud className="h-10 w-10 text-slate-400 mb-4" />
                        <Input type="file" accept=".csv" onChange={handleFileUpload} className="max-w-xs" />
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="space-y-1">
                                <Label>Fecha *</Label>
                                <Select value={mapDate} onValueChange={setMapDate}>
                                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                    <SelectContent>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>Concepto *</Label>
                                <Select value={mapDesc} onValueChange={setMapDesc}>
                                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                    <SelectContent>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>Importe *</Label>
                                <Select value={mapAmount} onValueChange={setMapAmount}>
                                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                    <SelectContent>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-slate-500">Saldo (Opcional)</Label>
                                <Select value={mapBalance} onValueChange={setMapBalance}>
                                    <SelectTrigger><SelectValue placeholder="Ignorar" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">-- Ignorar --</SelectItem>
                                        {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-slate-500">Detalle (Opcional)</Label>
                                <Select value={mapNotes} onValueChange={setMapNotes}>
                                    <SelectTrigger><SelectValue placeholder="Ignorar" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">-- Ignorar --</SelectItem>
                                        {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 flex items-start gap-3">
                            <Checkbox id="invert" checked={invertSign} onCheckedChange={(c) => setInvertSign(!!c)} className="mt-1" />
                            <div className="space-y-1">
                                <label htmlFor="invert" className="text-sm font-medium text-amber-900 cursor-pointer">Invertir Signos</label>
                                <p className="text-xs text-amber-700/80">Marca esto si el banco te da los gastos en positivo.</p>
                            </div>
                        </div>

                        <Button onClick={handleMappingSubmit} className="w-full" disabled={!mapDate || !mapAmount}>
                            Previsualizar <ArrowRight className="ml-2 h-4 w-4"/>
                        </Button>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-4">
                        <div className="border rounded-md max-h-[400px] overflow-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[30px]"></TableHead>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Concepto</TableHead>
                                        <TableHead className="text-right">Saldo</TableHead>
                                        <TableHead className="text-right">Importe</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {processedData.map((row, i) => (
                                        <TableRow key={i} className={!row.selected ? "opacity-50" : ""}>
                                            <TableCell><Checkbox checked={row.selected} onCheckedChange={() => toggleRow(i)} /></TableCell>
                                            <TableCell className="text-xs font-mono whitespace-nowrap">{row.date}</TableCell>
                                            <TableCell className="text-xs font-medium truncate max-w-[200px]">
                                                {row.description}
                                                {row.notes && <div className="text-[10px] text-slate-400 font-normal">{row.notes}</div>}
                                            </TableCell>
                                            <TableCell className="text-xs text-right text-slate-500 whitespace-nowrap">
                                                {row.bank_balance !== undefined ? `${row.bank_balance.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €` : '-'}
                                            </TableCell>
                                            <TableCell className={`text-xs text-right font-bold whitespace-nowrap ${row.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                {row.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        
                        <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                            <div className="text-xs space-x-4">
                                <span className="font-bold text-red-600">Gastos: {processedData.filter(x => x.selected && x.amount < 0).length}</span>
                                <span className="font-bold text-green-600">Abonos: {processedData.filter(x => x.selected && x.amount > 0).length}</span>
                            </div>
                            
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setStep(2)}>
                                    <RefreshCw className="mr-2 h-3 w-3" /> Re-configurar
                                </Button>
                                <Button onClick={handleFinalImport} disabled={loading} className="bg-slate-900">
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirmar
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}