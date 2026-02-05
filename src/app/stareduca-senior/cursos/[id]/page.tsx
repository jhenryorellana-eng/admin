'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabaseSenior } from '@/lib/supabase/senior-client';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Select,
  Textarea,
  Spinner,
  FileUpload,
} from '@/components/ui';
import { useToastStore } from '@/stores/admin-store';
import { slugify, SENIOR_COURSE_CATEGORIES } from '@/lib/utils';
import {
  uploadFileSenior,
  deleteFileByUrlSenior,
  generateCourseThumbnailPathSenior,
  isStorageUrlSenior,
} from '@/lib/supabase/senior-storage';

export default function EditarCursoSeniorPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const { addToast } = useToastStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [existingThumbnailUrl, setExistingThumbnailUrl] = useState<string | null>(null);
  const [originalThumbnailUrl, setOriginalThumbnailUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    category: '',
    has_evaluation: false,
    is_published: false,
  });
  const [wasPublished, setWasPublished] = useState(false);

  useEffect(() => {
    async function fetchCourse() {
      try {
        const { data, error } = await supabaseSenior
          .from('courses')
          .select('*')
          .eq('id', courseId)
          .single();

        if (error) throw error;

        if (data) {
          setFormData({
            title: data.title,
            slug: data.slug,
            description: data.description || '',
            category: data.category,
            has_evaluation: data.has_evaluation || false,
            is_published: data.is_published,
          });
          setWasPublished(data.is_published);
          setExistingThumbnailUrl(data.thumbnail_url || null);
          setOriginalThumbnailUrl(data.thumbnail_url || null);
        }
      } catch (error) {
        console.error('Error fetching course:', error);
        addToast({
          type: 'error',
          title: 'Error',
          message: 'No se pudo cargar el curso',
        });
        router.push('/stareduca-senior/cursos');
      } finally {
        setIsLoading(false);
      }
    }

    fetchCourse();
  }, [courseId, router, addToast]);

  const handleTitleChange = (title: string) => {
    setFormData({
      ...formData,
      title,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.category) {
      addToast({
        type: 'error',
        title: 'Error de validación',
        message: 'El título y la categoría son obligatorios',
      });
      return;
    }

    setIsSaving(true);

    try {
      let newThumbnailUrl: string | null = existingThumbnailUrl;

      if (thumbnailFile) {
        const path = generateCourseThumbnailPathSenior(courseId, thumbnailFile.name);
        newThumbnailUrl = await uploadFileSenior(path, thumbnailFile);

        if (!newThumbnailUrl) {
          throw new Error('No se pudo subir la nueva imagen de portada');
        }

        if (originalThumbnailUrl && isStorageUrlSenior(originalThumbnailUrl)) {
          await deleteFileByUrlSenior(originalThumbnailUrl);
        }
      } else if (!existingThumbnailUrl && originalThumbnailUrl && isStorageUrlSenior(originalThumbnailUrl)) {
        await deleteFileByUrlSenior(originalThumbnailUrl);
        newThumbnailUrl = null;
      }

      const { error } = await supabaseSenior
        .from('courses')
        .update({
          title: formData.title,
          slug: formData.slug || slugify(formData.title),
          description: formData.description || null,
          thumbnail_url: newThumbnailUrl,
          category: formData.category,
          has_evaluation: formData.has_evaluation,
          is_published: formData.is_published,
        })
        .eq('id', courseId);

      if (error) throw error;

      // If course is being published for the first time, notify all parents
      if (formData.is_published && !wasPublished) {
        const { data: parents, error: parentsError } = await supabaseSenior
          .from('parents')
          .select('id');

        console.log('Parents found:', parents?.length, 'Error:', parentsError);

        if (parents && parents.length > 0) {
          const notifications = parents.map((parent) => ({
            parent_id: parent.id,
            type: 'resource',
            title: 'Nuevo curso disponible',
            message: formData.title,
            data: { courseId },
          }));

          const { error: notifError } = await supabaseSenior.from('notifications').insert(notifications);
          console.log('Notifications insert error:', notifError);
        }

        setWasPublished(true);
      }

      setOriginalThumbnailUrl(newThumbnailUrl);
      setExistingThumbnailUrl(newThumbnailUrl);
      setThumbnailFile(null);

      addToast({
        type: 'success',
        title: 'Curso actualizado',
        message: `"${formData.title}" ha sido actualizado`,
      });
    } catch (error: any) {
      console.error('Error updating course:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'No se pudo actualizar el curso',
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

  const thumbnailValue: File | string | null = thumbnailFile || existingThumbnailUrl;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/stareduca-senior/cursos')}
          className="p-2 hover:bg-surface-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Editar Curso</h1>
          <p className="text-surface-500">{formData.title}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push(`/stareduca-senior/cursos/${courseId}/capitulos`)}
          leftIcon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
        >
          Módulos
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push(`/stareduca-senior/cursos/${courseId}/evaluacion`)}
          leftIcon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          }
        >
          Evaluación
        </Button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Información del Curso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Título del curso *"
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Ej: Comunicación Efectiva con tu Hijo Adolescente"
              required
            />

            <Input
              label="Slug (URL)"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="comunicacion-efectiva"
              hint="URL amigable del curso"
            />

            <Textarea
              label="Descripción"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe el contenido y objetivos del curso para padres..."
              rows={4}
            />

            <FileUpload
              label="Imagen de portada"
              value={thumbnailValue}
              onChange={(file) => {
                if (file) {
                  setThumbnailFile(file);
                  setExistingThumbnailUrl(null);
                } else {
                  setThumbnailFile(null);
                  setExistingThumbnailUrl(null);
                }
              }}
              accept="image/*"
              showPreview={true}
              helperText="PNG, JPG o WebP. Máximo 5MB."
              maxSize={5 * 1024 * 1024}
            />

            <Select
              label="Categoría *"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              options={SENIOR_COURSE_CATEGORIES}
              placeholder="Selecciona una categoría"
              required
            />

            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.has_evaluation}
                  onChange={(e) =>
                    setFormData({ ...formData, has_evaluation: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
              <div>
                <p className="font-medium text-surface-900">Incluir evaluación</p>
                <p className="text-sm text-surface-500">
                  El curso tendrá un examen final
                </p>
              </div>
            </div>

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
                <p className="font-medium text-surface-900">Publicar curso</p>
                <p className="text-sm text-surface-500">
                  Los cursos publicados son visibles para los padres
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
            onClick={() => router.push('/stareduca-senior/cursos')}
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
