// app/finance/components/ImporterDialog.tsx

'use client';

// AÑADIR PropsWithChildren
import { useState, useRef, useMemo, PropsWithChildren } from 'react'; 
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// Asumo que FinanceAccount existe en '@/types/finance'
import { ImporterTemplate, FinanceAccount } from '@/types/finance'; 
import { importCsvTransactionsAction } from '../actions'; 
import { toast } from 'sonner';

// Definición de los campos que el usuario debe mapear
const REQUIRED_FIELDS = [
    { key: 'operation_date', label: 'Fecha de Operación (dd/mm/yyyy o yyyy-mm-dd)' },
    { key: 'concept', label: 'Concepto / Descripción' },
    { key: 'amount', label: 'Importe (columna que contiene el valor)' },
];

type Mapping = {
    [key: string]: string; 
};

// ===============================================
// TIPADO CORREGIDO PARA INCLUIR accounts y children
// ===============================================
type ImporterDialogProps = PropsWithChildren<{
    accounts: FinanceAccount[]; // Propiedad requerida por FinanceMenu.tsx
}>;


export function ImporterDialog({ accounts, children }: ImporterDialogProps) { // <-- Desestructuramos children
    const [isOpen, setIsOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [delimiter, setDelimiter] = useState<string>(';');
    const [step, setStep] = useState<'upload' | 'mapping'>('upload');
    const [headers, setHeaders] = useState<string[]>([]);
    const [mapping, setMapping] = useState<Mapping>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Lógica de Mapeo
    const handleMappingChange = (key: string, header: string) => {
        setMapping(prev => ({ ...prev, [key]: header }));
    };

    // Previsualización de CSV (solo lee los encabezados)
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFile = e.target.files?.[0] || null;
        if (uploadedFile) {
            setFile(uploadedFile);
            
            const reader = new FileReader();
            reader.onload = (event) => {
                const content = event.target?.result as string;
                const lines = content.split('\n');
                let detectedHeaders: string[] = [];
                let dataStartIndex = -1; // Esto ya no es necesario, pero lo mantengo por si acaso

                // --- Bucle para encontrar la cabecera real ---
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    
                    if (line.length < 10 || line.startsWith('---')) continue; 

                    const potentialHeaders = line.split(delimiter).map(h => h.trim().replace(/"/g, ''));
                    
                    const containsRequiredField = potentialHeaders.some(h => 
                        h.toLowerCase().includes('importe') || h.toLowerCase().includes('fecha')
                    );

                    if (containsRequiredField && potentialHeaders.length > 2) {
                        detectedHeaders = potentialHeaders.filter(h => h.length > 0); 
                        dataStartIndex = i + 1;
                        break;
                    }
                }
                // --------------------------------------------------------

                if (detectedHeaders.length > 1) {
                    setHeaders(detectedHeaders);
                    
                    const initialMapping: Mapping = {};
                    REQUIRED_FIELDS.forEach(field => {
                        const match = detectedHeaders.find(h => 
                            h.toLowerCase().includes(field.key.split('_')[0])
                        );
                        initialMapping[field.key] = match || 'none';
                    });

                    REQUIRED_FIELDS.forEach(field => {
                        if (!initialMapping[field.key] || initialMapping[field.key] === '') {
                            initialMapping[field.key] = 'none';
                        }
                    });

                    setMapping(initialMapping);
                    setStep('mapping');
                } else {
                    toast.error("No se pudieron detectar los encabezados válidos. Comprueba el delimitador.");
                    setFile(null);
                }
            };
            reader.readAsText(uploadedFile);
        }
    };
    
    // Validar que todos los campos requeridos han sido mapeados
    const isMappingValid = useMemo(() => {
        // CORRECCIÓN: Validar que no sea 'none' (el valor placeholder)
        return REQUIRED_FIELDS.every(field => mapping[field.key] && mapping[field.key] !== 'none' && mapping[field.key] !== '');
    }, [mapping]);
    
    const handleSubmit = async () => {
        if (!file || !isMappingValid) {
            toast.error("Por favor, sube un archivo y completa el mapeo.");
            return;
        }

        try {
            const formData = new FormData();
            formData.append('file', file);
            
            // Crear el objeto de plantilla para enviarlo al servidor
            const template: Partial<ImporterTemplate> = {
                name: file.name,
                delimiter: delimiter,
                mapping: mapping as ImporterTemplate['mapping'],
            };
            
            const result = await importCsvTransactionsAction(formData, template);
            
            if (result.success) {
                // Notificación de éxito
                toast.success(`🎉 Importación exitosa! ${result.transactionsCount} transacciones añadidas.`);
                setIsOpen(false);
                // Aquí podrías querer llamar a un router.refresh() para actualizar la vista.
            } else {
                toast.error(`❌ Error al importar: ${result.error}`);
            }
        } catch (error) {
            toast.error(`Error desconocido: ${(error as Error).message}`);
        }
    };

    const resetDialog = () => {
        setFile(null);
        setHeaders([]);
        setMapping({});
        setDelimiter(';');
        setStep('upload');
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) resetDialog();
        }}>
            <DialogTrigger asChild>
                {/* AHORA USAMOS CHILDREN COMO TRIGGER, PROVENIENTE DE FinanceMenu.tsx */}
                {children} 
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] md:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Importar Transacciones (CSV)</DialogTitle>
                    <DialogDescription>
                        {step === 'upload' 
                            ? 'Sube el archivo CSV de tu banco. Asegúrate de que está exportado en formato CSV o de texto plano.'
                            : 'Mapea los encabezados de tu archivo a los campos de Life-OS.'}
                    </DialogDescription>
                </DialogHeader>

                {/* --- PASO 1: SUBIDA Y DELIMITADOR --- */}
                {step === 'upload' && (
                    <div className="grid gap-4 py-4">
                        <div className="flex items-center space-x-2">
                            <label htmlFor="delimiter" className="w-1/3 text-right">Delimitador</label>
                            <Select value={delimiter} onValueChange={setDelimiter}>
                                <SelectTrigger className="w-2/3">
                                    <SelectValue placeholder="Seleccionar delimitador" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value=",">Coma ( , )</SelectItem>
                                    <SelectItem value=";">Punto y Coma ( ; )</SelectItem>
                                    <SelectItem value="\t">Tabulación ( TAB )</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Input
                            id="file"
                            type="file"
                            accept=".csv, .txt"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="col-span-3"
                        />
                        {file && (
                            <p className="text-sm text-muted-foreground mt-2">
                                Archivo cargado: **{file.name}**. Pulsa siguiente para mapear.
                            </p>
                        )}
                    </div>
                )}

                {/* --- PASO 2: MAPEO DE COLUMNAS --- */}
                {step === 'mapping' && (
                    <div className="grid gap-4 py-4">
                        <p className="text-sm font-semibold">Encabezados detectados: {headers.join(' | ')}</p>
                        
                        {REQUIRED_FIELDS.map(field => (
                            <div key={field.key} className="flex items-center space-x-2">
                                <label htmlFor={field.key} className="w-1/3 text-right">{field.label} *</label>
                                <Select 
                                    value={mapping[field.key] || 'none'} // Usamos 'none' como valor inicial/vacío
                                    onValueChange={(value) => handleMappingChange(field.key, value)}
                                >
                                    <SelectTrigger className="w-2/3">
                                        <SelectValue placeholder={`Mapear a columna para ${field.label}`} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">-- Seleccionar --</SelectItem> 
                                        {headers.map(header => (
                                            <SelectItem key={header} value={header}>{header}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ))}
                    </div>
                )}

                {/* Botones de Navegación */}
                <div className="flex justify-end pt-4 space-x-2">
                    {step === 'mapping' && (
                        <Button variant="outline" onClick={() => setStep('upload')}>Anterior</Button>
                    )}
                    {step === 'upload' && file && (
                        <Button onClick={() => setStep('mapping')}>Siguiente</Button>
                    )}
                    {step === 'mapping' && (
                        <Button onClick={handleSubmit} disabled={!isMappingValid}>
                            {isMappingValid ? 'Importar Transacciones' : 'Mapeo Incompleto'}
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}