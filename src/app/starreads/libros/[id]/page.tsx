'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabaseStarReads } from '@/lib/supabase/starreads-client';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Textarea,
  Spinner,
  FileUpload,
} from '@/components/ui';
import { useToastStore } from '@/stores/admin-store';
import { slugify, formatNumber } from '@/lib/utils';
import { uploadFileStarReads, generateBookCoverPath, deleteFileByUrlStarReads, isStorageUrlStarReads } from '@/lib/supabase/starreads-storage';

export default function EditarLibroPage() {
  const router = useRouter();
  const params = useParams();
  const bookId = params.id as string;
  const { addToast } = useToastStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [originalCoverUrl, setOriginalCoverUrl] = useState<string>('');
  const [bookStats, setBookStats] = useState({
    total_ideas: 0,
    total_illuminated: 0,
    total_fires: 0,
    total_saves: 0,
  });
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    author: '',
    description: '',
    cover_url: '',
    is_published: false,
  });

  useEffect(() => {
    async function fetchBook() {
      try {
        const { data, error } = await supabaseStarReads
          .from('books')
          .select('*')
          .eq('id', bookId)
          .single();

        if (error) throw error;

        if (data) {
          setOriginalCoverUrl(data.cover_url || '');
          setFormData({
            title: data.title,
            slug: data.slug,
            author: data.author || '',
            description: data.description || '',
            cover_url: data.cover_url || '',
            is_published: data.is_published,
          });
          setBookStats({
            total_ideas: data.total_ideas || 0,
            total_illuminated: data.total_illuminated || 0,
            total_fires: data.total_fires || 0,
            total_saves: data.total_saves || 0,
          });
        }
      } catch (error) {
        console.error('Error fetching book:', error);
        addToast({
          type: 'error',
          title: 'Error',
          message: 'No se pudo cargar el libro',
        });
        router.push('/starreads/libros');
      } finally {
        setIsLoading(false);
      }
    }

    fetchBook();
  }, [bookId, router, addToast]);

  const handleTitleChange = (title: string) => {
    setFormData({
      ...formData,
      title,
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

    setIsSaving(true);

    try {
      // Subir nueva portada si se seleccionó un archivo
      let coverUrl: string | null = formData.cover_url || null;

      if (coverFile) {
        const path = generateBookCoverPath(bookId, coverFile.name);
        const uploadedUrl = await uploadFileStarReads(path, coverFile);

        if (!uploadedUrl) {
          throw new Error('No se pudo subir la imagen de portada');
        }

        // Eliminar portada anterior si era de Storage
        if (originalCoverUrl && isStorageUrlStarReads(originalCoverUrl)) {
          await deleteFileByUrlStarReads(originalCoverUrl);
        }

        coverUrl = uploadedUrl;
      }

      const updateData: Record<string, any> = {
        title: formData.title,
        slug: formData.slug || slugify(formData.title),
        author: formData.author,
        description: formData.description || null,
        cover_url: coverUrl,
        is_published: formData.is_published,
      };

      // Set published_at when publishing for the first time
      if (formData.is_published) {
        updateData.published_at = new Date().toISOString();
      }

      const { error } = await supabaseStarReads
        .from('books')
        .update(updateData)
        .eq('id', bookId);

      if (error) throw error;

      addToast({
        type: 'success',
        title: 'Libro actualizado',
        message: `"${formData.title}" ha sido actualizado`,
      });
    } catch (error: any) {
      console.error('Error updating book:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'No se pudo actualizar el libro',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/starreads/libros')}
          className="p-2 hover:bg-surface-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Editar Libro</h1>
          <p className="text-surface-500">{formData.title}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Link href={`/starreads/libros/${bookId}/ideas`}>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            }
          >
            Gestionar Ideas
          </Button>
        </Link>
      </div>

      {/* Book Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-center py-3">
            <p className="text-2xl font-bold text-surface-900">{formatNumber(bookStats.total_ideas)}</p>
            <p className="text-sm text-surface-500">Ideas</p>
          </div>
        </Card>
        <Card>
          <div className="text-center py-3">
            <p className="text-2xl font-bold text-amber-500">{formatNumber(bookStats.total_illuminated)}</p>
            <p className="text-sm text-surface-500">Iluminados</p>
          </div>
        </Card>
        <Card>
          <div className="text-center py-3">
            <p className="text-2xl font-bold text-red-500">{formatNumber(bookStats.total_fires)}</p>
            <p className="text-sm text-surface-500">Fuegos</p>
          </div>
        </Card>
        <Card>
          <div className="text-center py-3">
            <p className="text-2xl font-bold text-primary">{formatNumber(bookStats.total_saves)}</p>
            <p className="text-sm text-surface-500">Guardados</p>
          </div>
        </Card>
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
              hint="URL amigable del libro"
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
              value={coverFile || formData.cover_url || null}
              onChange={setCoverFile}
              accept="image/*"
              showPreview={true}
              helperText="PNG, JPG o WebP. Maximo 10MB. Se subira al guardar los cambios."
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
                  Los libros publicados son visibles para los usuarios
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push('/starreads/libros')}
          >
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSaving}>
            Guardar Cambios
          </Button>
        </div>
      </form>
    </div>
  );
}
