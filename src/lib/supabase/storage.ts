import { supabase } from './client';

const BUCKET_NAME = 'stareduca-junior';

/**
 * Extrae el path del archivo desde una URL de Supabase Storage
 */
export function extractStoragePath(url: string): string | null {
  if (!url) return null;

  // URL format: https://xxx.supabase.co/storage/v1/object/public/bucket-name/path/to/file
  const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
  return match ? match[1] : null;
}

/**
 * Verifica si una URL es de Supabase Storage
 */
export function isStorageUrl(url: string): boolean {
  if (!url) return false;
  return url.includes('supabase.co/storage/v1/object/public/');
}

/**
 * Sube un archivo a Supabase Storage
 * @param path - Ruta donde guardar el archivo (ej: "courses/123/thumbnail.jpg")
 * @param file - Archivo a subir
 * @returns URL pública del archivo o null si falla
 */
export async function uploadFile(path: string, file: File): Promise<string | null> {
  try {
    // Subir archivo
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true, // Sobreescribir si existe
      });

    if (error) {
      console.error('Error uploading file:', error);
      return null;
    }

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadFile:', error);
    return null;
  }
}

/**
 * Elimina un archivo de Supabase Storage
 * @param path - Ruta del archivo a eliminar
 */
export async function deleteFile(path: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error) {
      console.error('Error deleting file:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteFile:', error);
    return false;
  }
}

/**
 * Elimina un archivo usando su URL pública
 * @param url - URL pública del archivo
 */
export async function deleteFileByUrl(url: string): Promise<boolean> {
  const path = extractStoragePath(url);
  if (!path) return false;
  return deleteFile(path);
}

/**
 * Genera un path único para un archivo
 * @param folder - Carpeta base (ej: "courses", "lessons")
 * @param id - ID del recurso
 * @param filename - Nombre del archivo con extensión
 */
export function generateStoragePath(folder: string, id: string, filename: string): string {
  // Limpiar el nombre del archivo
  const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
  const timestamp = Date.now();
  return `${folder}/${id}/${timestamp}.${ext}`;
}

/**
 * Genera un path para thumbnail de curso
 */
export function generateCourseThumbnailPath(courseId: string, filename: string): string {
  return generateStoragePath('courses', courseId, filename);
}

/**
 * Genera un path para material de lección
 */
export function generateLessonMaterialPath(lessonId: string, filename: string): string {
  return generateStoragePath('lessons', lessonId, filename);
}
