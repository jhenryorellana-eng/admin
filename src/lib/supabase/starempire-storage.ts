import { supabaseStarEmpire } from './starempire-client';

const BUCKET_NAME = 'starempire';

/**
 * Extrae el path del archivo desde una URL de Supabase Storage
 */
export function extractStoragePathStarEmpire(url: string): string | null {
  if (!url) return null;

  // URL format: https://xxx.supabase.co/storage/v1/object/public/bucket-name/path/to/file
  const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
  return match ? match[1] : null;
}

/**
 * Verifica si una URL es de Supabase Storage
 */
export function isStorageUrlStarEmpire(url: string): boolean {
  if (!url) return false;
  return url.includes('supabase.co/storage/v1/object/public/');
}

/**
 * Sube un archivo a Supabase Storage (StarEmpire)
 * @param path - Ruta donde guardar el archivo (ej: "companies/123/cover.jpg")
 * @param file - Archivo a subir
 * @returns URL publica del archivo o null si falla
 */
export async function uploadFileStarEmpire(path: string, file: File): Promise<string | null> {
  try {
    const { data, error } = await supabaseStarEmpire.storage
      .from(BUCKET_NAME)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.error('Error uploading file (StarEmpire):', error);
      return null;
    }

    const { data: urlData } = supabaseStarEmpire.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadFileStarEmpire:', error);
    return null;
  }
}

/**
 * Elimina un archivo de Supabase Storage (StarEmpire)
 * @param path - Ruta del archivo a eliminar
 */
export async function deleteFileStarEmpire(path: string): Promise<boolean> {
  try {
    const { error } = await supabaseStarEmpire.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error) {
      console.error('Error deleting file (StarEmpire):', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteFileStarEmpire:', error);
    return false;
  }
}

/**
 * Elimina un archivo usando su URL publica
 * @param url - URL publica del archivo
 */
export async function deleteFileByUrlStarEmpire(url: string): Promise<boolean> {
  const path = extractStoragePathStarEmpire(url);
  if (!path) return false;
  return deleteFileStarEmpire(path);
}

/**
 * Genera un path unico para un archivo
 * @param folder - Carpeta base (ej: "companies")
 * @param id - ID del recurso
 * @param filename - Nombre del archivo con extension
 */
export function generateStoragePathStarEmpire(folder: string, id: string, filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
  const timestamp = Date.now();
  return `${folder}/${id}/${timestamp}.${ext}`;
}

/**
 * Genera un path para portada de empresa
 */
export function generateCompanyCoverPath(companyId: string, filename: string): string {
  return generateStoragePathStarEmpire('companies', companyId, filename);
}
