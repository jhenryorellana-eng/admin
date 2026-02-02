'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Tables } from '@/types/database';
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
import { slugify, COURSE_CATEGORIES } from '@/lib/utils';
import {
  uploadFile,
  deleteFileByUrl,
  generateCourseThumbnailPath,
  isStorageUrl,
} from '@/lib/supabase/storage';

type Course = Tables<'courses'>;

export default function EditarCursoPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const { addToast } = useToastStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [wasPublished, setWasPublished] = useState(false);

  // Thumbnail state
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [existingThumbnailUrl, setExistingThumbnailUrl] = useState<string | null>(null);
  const [originalThumbnailUrl, setOriginalThumbnailUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    category: '',
    xp_reward: 200,
    is_published: false,
  });

  useEffect(() => {
    async function fetchCourse() {
      try {
        const { data, error } = await supabase
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
            xp_reward: data.xp_reward,
            is_published: data.is_published,
          });
          setExistingThumbnailUrl(data.thumbnail_url || null);
          setOriginalThumbnailUrl(data.thumbnail_url || null);
          setWasPublished(data.is_published);
        }
      } catch (error) {
        console.error('Error fetching course:', error);
        addToast({
          type: 'error',
          title: 'Error',
          message: 'No se pudo cargar el curso',
        });
        router.push('/stareduca-junior/cursos');
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

  const handleThumbnailChange = (file: File | null) => {
    setThumbnailFile(file);
    if (file) {
      // Si se selecciona un nuevo archivo, limpiar la URL existente para mostrar el preview del archivo
      setExistingThumbnailUrl(null);
    } else if (!file && originalThumbnailUrl) {
      // Si se elimina el archivo, restaurar la URL original (si existe)
      // Esto NO ocurre si el usuario elimina la imagen existente
    }
  };

  const handleRemoveExistingThumbnail = () => {
    setExistingThumbnailUrl(null);
    setThumbnailFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.category) {
      addToast({
        type: 'error',
        title: 'Error de validacion',
        message: 'El titulo y la categoria son obligatorios',
      });
      return;
    }

    setIsSaving(true);

    try {
      let newThumbnailUrl: string | null = existingThumbnailUrl;

      // Si hay un nuevo archivo para subir
      if (thumbnailFile) {
        const path = generateCourseThumbnailPath(courseId, thumbnailFile.name);
        newThumbnailUrl = await uploadFile(path, thumbnailFile);

        if (!newThumbnailUrl) {
          throw new Error('No se pudo subir la nueva imagen de portada');
        }

        // Eliminar el archivo anterior si existe y es de storage
        if (originalThumbnailUrl && isStorageUrl(originalThumbnailUrl)) {
          await deleteFileByUrl(originalThumbnailUrl);
        }
      } else if (!existingThumbnailUrl && originalThumbnailUrl && isStorageUrl(originalThumbnailUrl)) {
        // Si se elimino la imagen existente (sin reemplazar)
        await deleteFileByUrl(originalThumbnailUrl);
        newThumbnailUrl = null;
      }

      const { error } = await supabase
        .from('courses')
        .update({
          title: formData.title,
          slug: formData.slug || slugify(formData.title),
          description: formData.description || null,
          thumbnail_url: newThumbnailUrl,
          category: formData.category,
          xp_reward: formData.xp_reward,
          is_published: formData.is_published,
        })
        .eq('id', courseId);

      if (error) throw error;

      // Si el curso se publica por primera vez, crear notificaciones
      // Nota: Las notificaciones son opcionales, no bloquean la actualización del curso
      if (formData.is_published && !wasPublished) {
        try {
          const { data: students } = await supabase
            .from('students')
            .select('id');

          if (students && students.length > 0) {
            const notifications = students.map((student) => ({
              student_id: student.id,
              type: 'course',
              title: 'Nuevo curso disponible',
              message: formData.title,
              data: { courseId },
            }));

            const { error: notifError } = await supabase.from('notifications').insert(notifications);
            if (notifError) {
              console.warn('No se pudieron crear notificaciones:', notifError.message);
            }
          }
        } catch (notifErr) {
          console.warn('Error al crear notificaciones:', notifErr);
        }

        setWasPublished(true);
      }

      // Actualizar estado local
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

  // Determinar el valor del FileUpload
  const thumbnailValue: File | string | null = thumbnailFile || existingThumbnailUrl;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/stareduca-junior/cursos')}
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
          onClick={() => router.push(`/stareduca-junior/cursos/${courseId}/capitulos`)}
          leftIcon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        >
          Capitulos
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push(`/stareduca-junior/cursos/${courseId}/examen`)}
          leftIcon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          }
        >
          Examen
        </Button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Informacion del Curso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Titulo del curso *"
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Ej: Introduccion a las Finanzas"
              required
            />

            <Input
              label="Slug (URL)"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="introduccion-a-las-finanzas"
              hint="URL amigable del curso"
            />

            <Textarea
              label="Descripcion"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe el contenido y objetivos del curso..."
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
              helperText="PNG, JPG o GIF. Maximo 10MB. Los cambios se aplicaran al guardar."
            />

            <Select
              label="Categoria *"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              options={COURSE_CATEGORIES}
              placeholder="Selecciona una categoria"
              required
            />

            <Input
              label="XP al completar"
              type="number"
              value={formData.xp_reward.toString()}
              onChange={(e) =>
                setFormData({ ...formData, xp_reward: parseInt(e.target.value) || 0 })
              }
              min={0}
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
                <p className="font-medium text-surface-900">Publicar curso</p>
                <p className="text-sm text-surface-500">
                  Los cursos publicados son visibles para los estudiantes
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
            onClick={() => router.push('/stareduca-junior/cursos')}
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
