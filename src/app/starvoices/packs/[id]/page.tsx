'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabaseStarVoices } from '@/lib/supabase/starvoices-client';
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Textarea, Select, Spinner, FileUpload } from '@/components/ui';
import { useToastStore } from '@/stores/admin-store';
import { STARVOICES_CATEGORIES, formatNumber } from '@/lib/utils';
import { uploadFileStarVoices, generatePackCoverPath, deleteFileByUrlStarVoices, isStorageUrlStarVoices } from '@/lib/supabase/starvoices-storage';

export default function EditarPackPage() {
  const router = useRouter();
  const params = useParams();
  const packId = params.id as string;
  const { addToast } = useToastStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [originalCoverUrl, setOriginalCoverUrl] = useState<string>('');
  const [audioCount, setAudioCount] = useState(0);
  const [formData, setFormData] = useState({
    title: '', description: '', category: '', cover_url: '', is_featured: false, is_published: false,
  });

  useEffect(() => {
    async function fetchPack() {
      try {
        const { data, error } = await supabaseStarVoices.from('packs').select('*').eq('id', packId).single();
        if (error) throw error;
        if (data) {
          setOriginalCoverUrl(data.cover_url || '');
          setFormData({
            title: data.title, description: data.description || '', category: data.category,
            cover_url: data.cover_url || '', is_featured: data.is_featured, is_published: data.is_published,
          });
          setAudioCount(data.audio_count || 0);
        }
      } catch (error) {
        addToast({ type: 'error', title: 'Error', message: 'No se pudo cargar el pack' });
        router.push('/starvoices/packs');
      } finally {
        setIsLoading(false);
      }
    }
    fetchPack();
  }, [packId, router, addToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.category) {
      addToast({ type: 'error', title: 'Error', message: 'El titulo y la categoria son obligatorios' });
      return;
    }
    setIsSaving(true);
    try {
      let coverUrl: string | null = formData.cover_url || null;
      if (coverFile) {
        const path = generatePackCoverPath(packId, coverFile.name);
        const uploadedUrl = await uploadFileStarVoices(path, coverFile);
        if (!uploadedUrl) throw new Error('No se pudo subir la imagen');
        if (originalCoverUrl && isStorageUrlStarVoices(originalCoverUrl)) {
          await deleteFileByUrlStarVoices(originalCoverUrl);
        }
        coverUrl = uploadedUrl;
      }
      const { error } = await supabaseStarVoices.from('packs').update({
        title: formData.title, description: formData.description || null, category: formData.category,
        cover_url: coverUrl, is_featured: formData.is_featured, is_published: formData.is_published,
      }).eq('id', packId);
      if (error) throw error;
      addToast({ type: 'success', title: 'Pack actualizado', message: `"${formData.title}" ha sido actualizado` });
    } catch (error: any) {
      addToast({ type: 'error', title: 'Error', message: error.message || 'No se pudo actualizar' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push('/starvoices/packs')} className="p-2 hover:bg-surface-100 rounded-lg transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Editar Pack</h1>
          <p className="text-surface-500">{formData.title}</p>
        </div>
      </div>
      <div className="flex gap-3">
        <Link href={`/starvoices/packs/${packId}/audios`}>
          <Button variant="secondary" size="sm" leftIcon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" /></svg>}>
            Gestionar Audios ({audioCount})
          </Button>
        </Link>
      </div>
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader><CardTitle>Informacion del Pack</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input label="Titulo *" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
            <Textarea label="Descripcion" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={4} />
            <Select label="Categoria *" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} options={[{ value: '', label: 'Seleccionar...' }, ...STARVOICES_CATEGORIES]} />
            <FileUpload label="Imagen de portada" value={coverFile || formData.cover_url || null} onChange={setCoverFile} accept="image/*" showPreview={true} helperText="PNG, JPG o WebP. Maximo 10MB." />
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={formData.is_featured} onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })} className="sr-only peer" />
                  <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
                <span className="text-sm font-medium text-surface-900">Destacado</span>
              </div>
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={formData.is_published} onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })} className="sr-only peer" />
                  <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
                <span className="text-sm font-medium text-surface-900">Publicado</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="flex items-center justify-end gap-3 mt-6">
          <Button type="button" variant="secondary" onClick={() => router.push('/starvoices/packs')}>Cancelar</Button>
          <Button type="submit" isLoading={isSaving}>Guardar Cambios</Button>
        </div>
      </form>
    </div>
  );
}
