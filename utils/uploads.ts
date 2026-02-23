// utils/uploads.ts
import { createClient } from './supabase/client';

interface UploadOptions {
  bucket: string;
  folder?: string;
  maxSizeMB?: number;
  maxWidth?: number; // Solo para imágenes
}

export async function uploadFile(file: File, options: UploadOptions): Promise<string> {
  const supabase = createClient();
  const { bucket, folder = 'general', maxSizeMB = 5, maxWidth = 1200 } = options;

  // 1. VALIDACIÓN DE TIPO
  const isImage = file.type.startsWith('image/');
  const isPDF = file.type === 'application/pdf';

  if (!isImage && !isPDF) {
    throw new Error('Solo se permiten imágenes (JPG, PNG, WebP) o archivos PDF');
  }
  
  // 2. PROCESAMIENTO
  let fileToUpload: Blob | File = file;
  // Si es imagen, la optimizamos. Si es PDF, lo subimos tal cual.
  if (isImage) {
    fileToUpload = await optimizeImage(file, maxWidth);
  }

  // 3. VALIDACIÓN DE TAMAÑO (Antes de procesar)
  if (fileToUpload.size > maxSizeMB * 1024 * 1024) {
    throw new Error(`El archivo es demasiado grande. Máximo ${maxSizeMB}MB permitido.`);
  }

  // 4. NOMBRE ÚNICO
  const fileExt = file.name.split('.').pop();
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

  // 5. SUBIDA A SUPABASE
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, fileToUpload, {
      contentType: file.type // Importante para que el navegador sepa abrir el PDF en lugar de descargarlo
    });

  if (error) throw error;

  // 6. URL PÚBLICA
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return publicUrl;
}

// Función de optimización (solo para imágenes)
async function optimizeImage(file: File, maxWidth: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(maxWidth / img.width, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Error al procesar imagen'));
        }, 'image/jpeg', 0.8);
      };
    };
    reader.onerror = (e) => reject(e);
  });
}