'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabaseStarEmpire } from '@/lib/supabase/starempire-client';
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
import { uploadFileStarEmpire, generateCompanyCoverPath, deleteFileByUrlStarEmpire, isStorageUrlStarEmpire } from '@/lib/supabase/starempire-storage';

export default function EditarEmpresaPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.id as string;
  const { addToast } = useToastStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [originalCoverUrl, setOriginalCoverUrl] = useState<string>('');
  const [companyStats, setCompanyStats] = useState({
    total_lessons: 0,
    total_inspired: 0,
    total_game_changers: 0,
    total_saves: 0,
  });
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    founder: '',
    description: '',
    cover_url: '',
    founded_year: '',
    industry: '',
    headquarters: '',
    is_published: false,
  });

  useEffect(() => {
    async function fetchCompany() {
      try {
        const { data, error } = await supabaseStarEmpire
          .from('companies')
          .select('*')
          .eq('id', companyId)
          .single();

        if (error) throw error;

        if (data) {
          setOriginalCoverUrl(data.cover_url || '');
          setFormData({
            title: data.title,
            slug: data.slug,
            founder: data.founder || '',
            description: data.description || '',
            cover_url: data.cover_url || '',
            founded_year: data.founded_year ? String(data.founded_year) : '',
            industry: data.industry || '',
            headquarters: data.headquarters || '',
            is_published: data.is_published,
          });
          setCompanyStats({
            total_lessons: data.total_lessons || 0,
            total_inspired: data.total_inspired || 0,
            total_game_changers: data.total_game_changers || 0,
            total_saves: data.total_saves || 0,
          });
        }
      } catch (error) {
        console.error('Error fetching company:', error);
        addToast({
          type: 'error',
          title: 'Error',
          message: 'No se pudo cargar la empresa',
        });
        router.push('/starempire/empresas');
      } finally {
        setIsLoading(false);
      }
    }

    fetchCompany();
  }, [companyId, router, addToast]);

  const handleTitleChange = (title: string) => {
    setFormData({
      ...formData,
      title,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.founder) {
      addToast({
        type: 'error',
        title: 'Error de validacion',
        message: 'El titulo y el fundador son obligatorios',
      });
      return;
    }

    setIsSaving(true);

    try {
      // Subir nueva portada si se selecciono un archivo
      let coverUrl: string | null = formData.cover_url || null;

      if (coverFile) {
        const path = generateCompanyCoverPath(companyId, coverFile.name);
        const uploadedUrl = await uploadFileStarEmpire(path, coverFile);

        if (!uploadedUrl) {
          throw new Error('No se pudo subir la imagen de portada');
        }

        // Eliminar portada anterior si era de Storage
        if (originalCoverUrl && isStorageUrlStarEmpire(originalCoverUrl)) {
          await deleteFileByUrlStarEmpire(originalCoverUrl);
        }

        coverUrl = uploadedUrl;
      }

      const updateData: Record<string, any> = {
        title: formData.title,
        slug: formData.slug || slugify(formData.title),
        founder: formData.founder,
        description: formData.description || null,
        cover_url: coverUrl,
        founded_year: formData.founded_year ? parseInt(formData.founded_year) : null,
        industry: formData.industry || null,
        headquarters: formData.headquarters || null,
        is_published: formData.is_published,
      };

      // Set published_at when publishing for the first time
      if (formData.is_published) {
        updateData.published_at = new Date().toISOString();
      }

      const { error } = await supabaseStarEmpire
        .from('companies')
        .update(updateData)
        .eq('id', companyId);

      if (error) throw error;

      addToast({
        type: 'success',
        title: 'Empresa actualizada',
        message: `"${formData.title}" ha sido actualizada`,
      });
    } catch (error: any) {
      console.error('Error updating company:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'No se pudo actualizar la empresa',
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
          onClick={() => router.push('/starempire/empresas')}
          className="p-2 hover:bg-surface-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Editar Empresa</h1>
          <p className="text-surface-500">{formData.title}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Link href={`/starempire/empresas/${companyId}/lecciones`}>
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

      {/* Company Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-center py-3">
            <p className="text-2xl font-bold text-surface-900">{formatNumber(companyStats.total_lessons)}</p>
            <p className="text-sm text-surface-500">Lecciones</p>
          </div>
        </Card>
        <Card>
          <div className="text-center py-3">
            <p className="text-2xl font-bold text-amber-500">{formatNumber(companyStats.total_inspired)}</p>
            <p className="text-sm text-surface-500">Inspirados</p>
          </div>
        </Card>
        <Card>
          <div className="text-center py-3">
            <p className="text-2xl font-bold text-red-500">{formatNumber(companyStats.total_game_changers)}</p>
            <p className="text-sm text-surface-500">Game Changers</p>
          </div>
        </Card>
        <Card>
          <div className="text-center py-3">
            <p className="text-2xl font-bold text-primary">{formatNumber(companyStats.total_saves)}</p>
            <p className="text-sm text-surface-500">Guardados</p>
          </div>
        </Card>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Informacion de la Empresa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Nombre de la empresa *"
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Ej: Apple Inc."
              required
            />

            <Input
              label="Slug (URL)"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="apple-inc"
              hint="URL amigable de la empresa"
            />

            <Input
              label="Fundador *"
              value={formData.founder}
              onChange={(e) => setFormData({ ...formData, founder: e.target.value })}
              placeholder="Ej: Steve Jobs"
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Ano de fundacion"
                type="number"
                value={formData.founded_year}
                onChange={(e) => setFormData({ ...formData, founded_year: e.target.value })}
                placeholder="Ej: 1976"
                min={1800}
                max={2030}
              />

              <Input
                label="Industria"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                placeholder="Ej: Tecnologia"
              />

              <Input
                label="Sede"
                value={formData.headquarters}
                onChange={(e) => setFormData({ ...formData, headquarters: e.target.value })}
                placeholder="Ej: Cupertino, CA"
              />
            </div>

            <Textarea
              label="Descripcion"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe brevemente la historia y mision de la empresa..."
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
                <p className="font-medium text-surface-900">Publicar empresa</p>
                <p className="text-sm text-surface-500">
                  Las empresas publicadas son visibles para los usuarios
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
            onClick={() => router.push('/starempire/empresas')}
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
