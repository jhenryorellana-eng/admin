import { supabaseSenior } from './senior-client';

const BUCKET_NAME = 'stareduca-senior';

/**
 * Extrae el path del archivo desde una URL de Supabase Storage
 */
export function extractStoragePathSenior(url: string): string | null {
  if (!url) return null;

  // URL format: https://xxx.supabase.co/storage/v1/object/public/bucket-name/path/to/file
  const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
  return match ? match[1] : null;
}

/**
 * Verifica si una URL es de Supabase Storage
 */
export function isStorageUrlSenior(url: string): boolean {
  if (!url) return false;
  return url.includes('supabase.co/storage/v1/object/public/');
}

/**
 * Sube un archivo a Supabase Storage (Senior)
 * @param path - Ruta donde guardar el archivo (ej: "courses/123/thumbnail.jpg")
 * @param file - Archivo a subir
 * @returns URL pública del archivo o null si falla
 */
export async function uploadFileSenior(path: string, file: File): Promise<string | null> {
  try {
    const { data, error } = await supabaseSenior.storage
      .from(BUCKET_NAME)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.error('Error uploading file (Senior):', error);
      return null;
    }

    const { data: urlData } = supabaseSenior.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadFileSenior:', error);
    return null;
  }
}

/**
 * Elimina un archivo de Supabase Storage (Senior)
 * @param path - Ruta del archivo a eliminar
 */
export async function deleteFileSenior(path: string): Promise<boolean> {
  try {
    const { error } = await supabaseSenior.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error) {
      console.error('Error deleting file (Senior):', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteFileSenior:', error);
    return false;
  }
}

/**
 * Elimina un archivo usando su URL pública
 * @param url - URL pública del archivo
 */
export async function deleteFileByUrlSenior(url: string): Promise<boolean> {
  const path = extractStoragePathSenior(url);
  if (!path) return false;
  return deleteFileSenior(path);
}

/**
 * Genera un path único para un archivo
 * @param folder - Carpeta base (ej: "courses", "chapters")
 * @param id - ID del recurso
 * @param filename - Nombre del archivo con extensión
 */
export function generateStoragePathSenior(folder: string, id: string, filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
  const timestamp = Date.now();
  return `${folder}/${id}/${timestamp}.${ext}`;
}

/**
 * Genera un path para thumbnail de curso
 */
export function generateCourseThumbnailPathSenior(courseId: string, filename: string): string {
  return generateStoragePathSenior('courses', courseId, filename);
}

/**
 * Genera un path para video de capítulo
 */
export function generateChapterVideoPathSenior(chapterId: string, filename: string): string {
  return generateStoragePathSenior('chapters', chapterId, filename);
}

/**
 * Genera un path para material
 */
export function generateMaterialPathSenior(materialId: string, filename: string): string {
  return generateStoragePathSenior('materials', materialId, filename);
}
