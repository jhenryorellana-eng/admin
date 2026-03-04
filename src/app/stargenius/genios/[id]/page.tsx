'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabaseStarGenius } from '@/lib/supabase/stargenius-client';
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
import { uploadFileStarGenius, generateGeniusPortraitPath, deleteFileByUrlStarGenius, isStorageUrlStarGenius } from '@/lib/supabase/stargenius-storage';

export default function EditarGenioPage() {
  const router = useRouter();
  const params = useParams();
  const geniusId = params.id as string;
  const { addToast } = useToastStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [portraitFile, setPortraitFile] = useState<File | null>(null);
  const [originalPortraitUrl, setOriginalPortraitUrl] = useState<string>('');
  const [geniusStats, setGeniusStats] = useState({
    total_lessons: 0,
    total_genius: 0,
    total_inspired: 0,
    total_saves: 0,
  });
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    field: '',
    era: '',
    description: '',
    portrait_url: '',
    is_published: false,
  });

  useEffect(() => {
    async function fetchGenius() {
      try {
        const { data, error } = await supabaseStarGenius
          .from('geniuses')
          .select('*')
          .eq('id', geniusId)
          .single();

        if (error) throw error;

        if (data) {
          setOriginalPortraitUrl(data.portrait_url || '');
          setFormData({
            name: data.name,
            slug: data.slug,
            field: data.field || '',
            era: data.era || '',
            description: data.description || '',
            portrait_url: data.portrait_url || '',
            is_published: data.is_published,
          });
          setGeniusStats({
            total_lessons: data.total_lessons || 0,
            total_genius: data.total_genius || 0,
            total_inspired: data.total_inspired || 0,
            total_saves: data.total_saves || 0,
          });
        }
      } catch (error) {
        console.error('Error fetching genius:', error);
        addToast({
          type: 'error',
          title: 'Error',
          message: 'No se pudo cargar el genio',
        });
        router.push('/stargenius/genios');
      } finally {
        setIsLoading(false);
      }
    }

    fetchGenius();
  }, [geniusId, router, addToast]);

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.field) {
      addToast({
        type: 'error',
        title: 'Error de validacion',
        message: 'El nombre y el campo/disciplina son obligatorios',
      });
      return;
    }

    setIsSaving(true);

    try {
      // Subir nuevo retrato si se selecciono un archivo
      let portraitUrl: string | null = formData.portrait_url || null;

      if (portraitFile) {
        const path = generateGeniusPortraitPath(geniusId, portraitFile.name);
        const uploadedUrl = await uploadFileStarGenius(path, portraitFile);

        if (!uploadedUrl) {
          throw new Error('No se pudo subir el retrato');
        }

        // Eliminar retrato anterior si era de Storage
        if (originalPortraitUrl && isStorageUrlStarGenius(originalPortraitUrl)) {
          await deleteFileByUrlStarGenius(originalPortraitUrl);
        }

        portraitUrl = uploadedUrl;
      }

      const updateData: Record<string, any> = {
        name: formData.name,
        slug: formData.slug || slugify(formData.name),
        field: formData.field,
        era: formData.era || null,
        description: formData.description || null,
        portrait_url: portraitUrl,
        is_published: formData.is_published,
      };

      // Set published_at when publishing for the first time
      if (formData.is_published) {
        updateData.published_at = new Date().toISOString();
      }

      const { error } = await supabaseStarGenius
        .from('geniuses')
        .update(updateData)
        .eq('id', geniusId);

      if (error) throw error;

      addToast({
        type: 'success',
        title: 'Genio actualizado',
        message: `"${formData.name}" ha sido actualizado`,
      });
    } catch (error: any) {
      console.error('Error updating genius:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'No se pudo actualizar el genio',
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
          onClick={() => router.push('/stargenius/genios')}
          className="p-2 hover:bg-surface-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Editar Genio</h1>
          <p className="text-surface-500">{formData.name}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Link href={`/stargenius/genios/${geniusId}/lecciones`}>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            }
          >
            Gestionar Lecciones
          </Button>
        </Link>
      </div>

      {/* Genius Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-center py-3">
            <p className="text-2xl font-bold text-surface-900">{formatNumber(geniusStats.total_lessons)}</p>
            <p className="text-sm text-surface-500">Total Lecciones</p>
          </div>
        </Card>
        <Card>
          <div className="text-center py-3">
            <p className="text-2xl font-bold text-amber-500">{formatNumber(geniusStats.total_genius)}</p>
            <p className="text-sm text-surface-500">Total Genius</p>
          </div>
        </Card>
        <Card>
          <div className="text-center py-3">
            <p className="text-2xl font-bold text-red-500">{formatNumber(geniusStats.total_inspired)}</p>
            <p className="text-sm text-surface-500">Total Inspired</p>
          </div>
        </Card>
        <Card>
          <div className="text-center py-3">
            <p className="text-2xl font-bold text-primary">{formatNumber(geniusStats.total_saves)}</p>
            <p className="text-sm text-surface-500">Total Guardados</p>
          </div>
        </Card>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Informacion del Genio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Nombre del genio *"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ej: Leonardo da Vinci"
              required
            />

            <Input
              label="Slug (URL)"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="leonardo-da-vinci"
              hint="URL amigable del genio"
            />

            <Input
              label="Campo/Disciplina *"
              value={formData.field}
              onChange={(e) => setFormData({ ...formData, field: e.target.value })}
              placeholder="Ej: Arte, Ciencia, Ingenieria"
              required
            />

            <Input
              label="Era"
              value={formData.era}
              onChange={(e) => setFormData({ ...formData, era: e.target.value })}
              placeholder="Ej: Renacimiento, Siglo XX"
              hint="Periodo historico del genio (opcional)"
            />

            <Textarea
              label="Descripcion"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe brevemente a esta persona ilustre..."
              rows={4}
            />

            <FileUpload
              label="Retrato"
              value={portraitFile || formData.portrait_url || null}
              onChange={setPortraitFile}
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
                <p className="font-medium text-surface-900">Publicar genio</p>
                <p className="text-sm text-surface-500">
                  Los genios publicados son visibles para los usuarios
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
            onClick={() => router.push('/stargenius/genios')}
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
