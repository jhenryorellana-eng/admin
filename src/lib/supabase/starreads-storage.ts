import { supabaseStarReads } from './starreads-client';

const BUCKET_NAME = 'starreads';

/**
 * Extrae el path del archivo desde una URL de Supabase Storage
 */
export function extractStoragePathStarReads(url: string): string | null {
  if (!url) return null;

  // URL format: https://xxx.supabase.co/storage/v1/object/public/bucket-name/path/to/file
  const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
  return match ? match[1] : null;
}

/**
 * Verifica si una URL es de Supabase Storage
 */
export function isStorageUrlStarReads(url: string): boolean {
  if (!url) return false;
  return url.includes('supabase.co/storage/v1/object/public/');
}

/**
 * Sube un archivo a Supabase Storage (StarReads)
 * @param path - Ruta donde guardar el archivo (ej: "books/123/cover.jpg")
 * @param file - Archivo a subir
 * @returns URL pública del archivo o null si falla
 */
export async function uploadFileStarReads(path: string, file: File): Promise<string | null> {
  try {
    const { data, error } = await supabaseStarReads.storage
      .from(BUCKET_NAME)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.error('Error uploading file (StarReads):', error);
      return null;
    }

    const { data: urlData } = supabaseStarReads.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadFileStarReads:', error);
    return null;
  }
}

/**
 * Elimina un archivo de Supabase Storage (StarReads)
 * @param path - Ruta del archivo a eliminar
 */
export async function deleteFileStarReads(path: string): Promise<boolean> {
  try {
    const { error } = await supabaseStarReads.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error) {
      console.error('Error deleting file (StarReads):', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteFileStarReads:', error);
    return false;
  }
}

/**
 * Elimina un archivo usando su URL pública
 * @param url - URL pública del archivo
 */
export async function deleteFileByUrlStarReads(url: string): Promise<boolean> {
  const path = extractStoragePathStarReads(url);
  if (!path) return false;
  return deleteFileStarReads(path);
}

/**
 * Genera un path único para un archivo
 * @param folder - Carpeta base (ej: "books")
 * @param id - ID del recurso
 * @param filename - Nombre del archivo con extensión
 */
export function generateStoragePathStarReads(folder: string, id: string, filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
  const timestamp = Date.now();
  return `${folder}/${id}/${timestamp}.${ext}`;
}

/**
 * Genera un path para portada de libro
 */
export function generateBookCoverPath(bookId: string, filename: string): string {
  return generateStoragePathStarReads('books', bookId, filename);
}
