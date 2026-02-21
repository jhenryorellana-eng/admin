'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseStarVoices } from '@/lib/supabase/starvoices-client';
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Textarea, Select, FileUpload } from '@/components/ui';
import { useToastStore } from '@/stores/admin-store';
import { STARVOICES_CATEGORIES } from '@/lib/utils';
import { uploadFileStarVoices, generatePackCoverPath } from '@/lib/supabase/starvoices-storage';

export default function NuevoPackPage() {
  const router = useRouter();
  const { addToast } = useToastStore();
  const [isLoading, setIsLoading] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    is_featured: false,
    is_published: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.category) {
      addToast({ type: 'error', title: 'Error', message: 'El titulo y la categoria son obligatorios' });
      return;
    }
    setIsLoading(true);
    try {
      const tempId = crypto.randomUUID();
      let coverUrl: string | null = null;
      if (coverFile) {
        const path = generatePackCoverPath(tempId, coverFile.name);
        coverUrl = await uploadFileStarVoices(path, coverFile);
        if (!coverUrl) throw new Error('No se pudo subir la imagen de portada');
      }
      const { data, error } = await supabaseStarVoices
        .from('packs')
        .insert({
          title: formData.title,
          description: formData.description || null,
          category: formData.category,
          cover_url: coverUrl,
          is_featured: formData.is_featured,
          is_published: formData.is_published,
        })
        .select().single();
      if (error) throw error;

      // Notificar a usuarios si el pack se publica
      if (formData.is_published) {
        await supabaseStarVoices.from('notifications').insert({
          type: 'new_pack',
          title: 'Nuevo pack disponible',
          message: `"${formData.title}" ya esta disponible en StarVoices`,
          data: { packId: data.id },
        });
      }

      addToast({ type: 'success', title: 'Pack creado', message: `"${formData.title}" ha sido creado exitosamente` });
      router.push(`/starvoices/packs/${data.id}`);
    } catch (error: any) {
      console.error('Error creating pack:', error);
      addToast({ type: 'error', title: 'Error', message: error.message || 'No se pudo crear el pack' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-surface-100 rounded-lg transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Nuevo Pack</h1>
          <p className="text-surface-500">Agrega un nuevo pack de audio a StarVoices</p>
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader><CardTitle>Informacion del Pack</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input label="Titulo del pack *" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Ej: Comunicacion Digital" required />
            <Textarea label="Descripcion" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Describe de que trata este pack..." rows={4} />
            <Select label="Categoria *" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} options={[{ value: '', label: 'Seleccionar categoria...' }, ...STARVOICES_CATEGORIES]} />
            <FileUpload label="Imagen de portada" value={coverFile} onChange={setCoverFile} accept="image/*" showPreview={true} helperText="PNG, JPG o WebP. Maximo 10MB." />
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
                <span className="text-sm font-medium text-surface-900">Publicar</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="flex items-center justify-end gap-3 mt-6">
          <Button type="button" variant="secondary" onClick={() => router.back()}>Cancelar</Button>
          <Button type="submit" isLoading={isLoading}>Crear Pack</Button>
        </div>
      </form>
    </div>
  );
}
