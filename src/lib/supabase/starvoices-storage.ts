import { supabaseStarVoices } from './starvoices-client';

const BUCKET_NAME = 'starvoices';

/**
 * Extrae el path del archivo desde una URL de Supabase Storage
 */
export function extractStoragePathStarVoices(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
  return match ? match[1] : null;
}

/**
 * Verifica si una URL es de Supabase Storage
 */
export function isStorageUrlStarVoices(url: string): boolean {
  if (!url) return false;
  return url.includes('supabase.co/storage/v1/object/public/');
}

/**
 * Sube un archivo a Supabase Storage (StarVoices)
 */
export async function uploadFileStarVoices(path: string, file: File): Promise<string | null> {
  try {
    const { data, error } = await supabaseStarVoices.storage
      .from(BUCKET_NAME)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.error('Error uploading file (StarVoices):', error);
      return null;
    }

    const { data: urlData } = supabaseStarVoices.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadFileStarVoices:', error);
    return null;
  }
}

/**
 * Elimina un archivo de Supabase Storage (StarVoices)
 */
export async function deleteFileStarVoices(path: string): Promise<boolean> {
  try {
    const { error } = await supabaseStarVoices.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error) {
      console.error('Error deleting file (StarVoices):', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteFileStarVoices:', error);
    return false;
  }
}

/**
 * Elimina un archivo usando su URL publica
 */
export async function deleteFileByUrlStarVoices(url: string): Promise<boolean> {
  const path = extractStoragePathStarVoices(url);
  if (!path) return false;
  return deleteFileStarVoices(path);
}

/**
 * Genera un path unico para un archivo
 */
export function generateStoragePathStarVoices(folder: string, id: string, filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
  const timestamp = Date.now();
  return `${folder}/${id}/${timestamp}.${ext}`;
}

/**
 * Genera un path para portada de pack
 */
export function generatePackCoverPath(packId: string, filename: string): string {
  return generateStoragePathStarVoices('packs', packId, filename);
}

/**
 * Genera un path para archivo de audio
 */
export function generateAudioFilePath(audioId: string, filename: string): string {
  return generateStoragePathStarVoices('audios', audioId, filename);
}

/**
 * Genera un path para portada de audio
 */
export function generateAudioCoverPath(audioId: string, filename: string): string {
  return generateStoragePathStarVoices('audio-covers', audioId, filename);
}
