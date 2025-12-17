// app/finance/components/ImporterDialog.tsx

'use client';

import { useState, useRef, useMemo } from 'react';
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
import { ImporterTemplate } from '@/types/finance';
import { importCsvTransactionsAction } from '../actions'; // Aún no existe, la crearemos en el paso 4
import { toast } from 'sonner';

// Definición de los campos que el usuario debe mapear
const REQUIRED_FIELDS = [
  { key: 'operation_date', label: 'Fecha de Operación (dd/mm/yyyy o yyyy-mm-dd)' },
  { key: 'concept', label: 'Concepto / Descripción' },
  { key: 'amount', label: 'Importe (columna que contiene el valor)' },
];

type Mapping = {
    [key: string]: string; // {operation_date: 'Mi Encabezado de Fecha'}
};

export function ImporterDialog() {
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
            let dataStartIndex = -1; // Índice de la línea donde comienzan los datos

            // --- CORRECCIÓN: Bucle para encontrar la cabecera real ---
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                
                // Si la línea está vacía o es muy corta, continuamos.
                if (line.length < 10 || line.startsWith('---')) continue; 

                // Dividimos la línea por el delimitador actual (ej: ';')
                const potentialHeaders = line.split(delimiter).map(h => h.trim().replace(/"/g, ''));
                
                // Criterio de Búsqueda: Buscar una línea que contenga la palabra "importe" o "fecha"
                const containsRequiredField = potentialHeaders.some(h => 
                    h.toLowerCase().includes('importe') || h.toLowerCase().includes('fecha')
                );

                if (containsRequiredField && potentialHeaders.length > 2) {
                    // Hemos encontrado la línea de cabeceras.
                    detectedHeaders = potentialHeaders.filter(h => h.length > 0); 
                    dataStartIndex = i + 1; // La línea siguiente es donde empiezan los datos
                    break;
                }
            }
            // --------------------------------------------------------

            if (detectedHeaders.length > 1) {
                setHeaders(detectedHeaders);
                
                // Guardar la línea de inicio de datos para que la Server Action la sepa
                // (Esto requiere un campo oculto en el formulario, ¡Ver Paso 4!)
                // setStartingLine(dataStartIndex); 

                // Intentar un mapeo automático (más inteligente)
                const initialMapping: Mapping = {};
                REQUIRED_FIELDS.forEach(field => {
                    const match = detectedHeaders.find(h => 
                        h.toLowerCase().includes(field.key.split('_')[0]) // Busca 'fecha' o 'concepto' o 'amount'
                    );
                    initialMapping[field.key] = match || 'none';
                });

                // Inicializar los no mapeados a "none"
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
    return REQUIRED_FIELDS.every(field => mapping[field.key] && mapping[field.key] !== '');
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
            name: file.name, // Usamos el nombre del archivo como plantilla temporal
            delimiter: delimiter,
            mapping: mapping as ImporterTemplate['mapping'],
        };
        
        // El servidor recibirá el archivo y la configuración
        const result = await importCsvTransactionsAction(formData, template);
        
        if (result.success) {
            toast.success(`🎉 Importación exitosa! ${result.transactionsCount} transacciones añadidas.`);
            setIsOpen(false);
            // Recargar la página o los datos de Finanzas
            // router.refresh() si usas app router de Next.js
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
        <Button>Importar CSV</Button>
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
                            value={mapping[field.key] || ''} 
                            onValueChange={(value) => handleMappingChange(field.key, value)}
                        >
                            <SelectTrigger className="w-2/3">
                                <SelectValue placeholder={`Mapear a columna para ${field.label}`} />
                            </SelectTrigger>
                            <SelectContent>
    {/* Opción vacía para deseleccionar (CORRECCIÓN: Cambiar value="" a value="none") */}
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
