import { supabaseStarGenius } from './stargenius-client';

const BUCKET_NAME = 'stargenius';

/**
 * Extrae el path del archivo desde una URL de Supabase Storage
 */
export function extractStoragePathStarGenius(url: string): string | null {
  if (!url) return null;

  // URL format: https://xxx.supabase.co/storage/v1/object/public/bucket-name/path/to/file
  const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
  return match ? match[1] : null;
}

/**
 * Verifica si una URL es de Supabase Storage
 */
export function isStorageUrlStarGenius(url: string): boolean {
  if (!url) return false;
  return url.includes('supabase.co/storage/v1/object/public/');
}

/**
 * Sube un archivo a Supabase Storage (StarGenius)
 * @param path - Ruta donde guardar el archivo (ej: "geniuses/123/portrait.jpg")
 * @param file - Archivo a subir
 * @returns URL pública del archivo o null si falla
 */
export async function uploadFileStarGenius(path: string, file: File): Promise<string | null> {
  try {
    const { data, error } = await supabaseStarGenius.storage
      .from(BUCKET_NAME)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.error('Error uploading file (StarGenius):', error);
      return null;
    }

    const { data: urlData } = supabaseStarGenius.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadFileStarGenius:', error);
    return null;
  }
}

/**
 * Elimina un archivo de Supabase Storage (StarGenius)
 * @param path - Ruta del archivo a eliminar
 */
export async function deleteFileStarGenius(path: string): Promise<boolean> {
  try {
    const { error } = await supabaseStarGenius.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error) {
      console.error('Error deleting file (StarGenius):', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteFileStarGenius:', error);
    return false;
  }
}

/**
 * Elimina un archivo usando su URL pública
 * @param url - URL pública del archivo
 */
export async function deleteFileByUrlStarGenius(url: string): Promise<boolean> {
  const path = extractStoragePathStarGenius(url);
  if (!path) return false;
  return deleteFileStarGenius(path);
}

/**
 * Genera un path único para un archivo
 * @param folder - Carpeta base (ej: "geniuses")
 * @param id - ID del recurso
 * @param filename - Nombre del archivo con extensión
 */
export function generateStoragePathStarGenius(folder: string, id: string, filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
  const timestamp = Date.now();
  return `${folder}/${id}/${timestamp}.${ext}`;
}

/**
 * Genera un path para retrato de genio
 */
export function generateGeniusPortraitPath(geniusId: string, filename: string): string {
  return generateStoragePathStarGenius('geniuses', geniusId, filename);
}
