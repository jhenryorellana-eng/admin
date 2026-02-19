'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseStarReads } from '@/lib/supabase/starreads-client';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Textarea,
  FileUpload,
} from '@/components/ui';
import { useToastStore } from '@/stores/admin-store';
import { slugify } from '@/lib/utils';
import { uploadFileStarReads, generateBookCoverPath } from '@/lib/supabase/starreads-storage';

export default function NuevoLibroPage() {
  const router = useRouter();
  const { addToast } = useToastStore();
  const [isLoading, setIsLoading] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    author: '',
    description: '',
    is_published: false,
  });

  const handleTitleChange = (title: string) => {
    setFormData({
      ...formData,
      title,
      slug: slugify(title),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.author) {
      addToast({
        type: 'error',
        title: 'Error de validacion',
        message: 'El titulo y el autor son obligatorios',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Subir portada si existe
      const tempId = crypto.randomUUID();
      let coverUrl: string | null = null;

      if (coverFile) {
        const path = generateBookCoverPath(tempId, coverFile.name);
        coverUrl = await uploadFileStarReads(path, coverFile);

        if (!coverUrl) {
          throw new Error('No se pudo subir la imagen de portada');
        }
      }

      const { data, error } = await supabaseStarReads
        .from('books')
        .insert({
          title: formData.title,
          slug: formData.slug || slugify(formData.title),
          author: formData.author,
          description: formData.description || null,
          cover_url: coverUrl,
          is_published: formData.is_published,
          published_at: formData.is_published ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (error) throw error;

      addToast({
        type: 'success',
        title: 'Libro creado',
        message: `"${formData.title}" ha sido creado exitosamente`,
      });

      router.push(`/starreads/libros/${data.id}`);
    } catch (error: any) {
      console.error('Error creating book:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'No se pudo crear el libro',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-surface-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Nuevo Libro</h1>
          <p className="text-surface-500">Agrega un nuevo libro a StarReads</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Informacion del Libro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Titulo del libro *"
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Ej: Padre Rico Padre Pobre"
              required
            />

            <Input
              label="Slug (URL)"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="padre-rico-padre-pobre"
              hint="Se genera automaticamente del titulo. Puedes editarlo manualmente."
            />

            <Input
              label="Autor *"
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              placeholder="Ej: Robert Kiyosaki"
              required
            />

            <Textarea
              label="Descripcion"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe brevemente de que trata el libro..."
              rows={4}
            />

            <FileUpload
              label="Imagen de portada"
              value={coverFile}
              onChange={setCoverFile}
              accept="image/*"
              showPreview={true}
              helperText="PNG, JPG o WebP. Maximo 10MB. Se subira al guardar el libro."
            />

            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_published}
                  onChange={(e) =>
                    setFormData({ ...formData, is_published: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
              <div>
                <p className="font-medium text-surface-900">Publicar libro</p>
                <p className="text-sm text-surface-500">
                  Si esta desactivado, el libro quedara como borrador
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Crear Libro
          </Button>
        </div>
      </form>
    </div>
  );
}
