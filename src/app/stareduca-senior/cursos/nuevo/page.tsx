'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  FileUpload,
} from '@/components/ui';
import { useToastStore } from '@/stores/admin-store';
import { slugify, SENIOR_COURSE_CATEGORIES } from '@/lib/utils';
import { uploadFileSenior, generateCourseThumbnailPathSenior } from '@/lib/supabase/senior-storage';

export default function NuevoCursoSeniorPage() {
  const router = useRouter();
  const { addToast } = useToastStore();
  const [isLoading, setIsLoading] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    category: '',
    has_evaluation: false,
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

    if (!formData.title || !formData.category) {
      addToast({
        type: 'error',
        title: 'Error de validación',
        message: 'El título y la categoría son obligatorios',
      });
      return;
    }

    setIsLoading(true);

    try {
      const tempId = crypto.randomUUID();
      let thumbnailUrl: string | null = null;

      if (thumbnailFile) {
        const path = generateCourseThumbnailPathSenior(tempId, thumbnailFile.name);
        thumbnailUrl = await uploadFileSenior(path, thumbnailFile);

        if (!thumbnailUrl) {
          throw new Error('No se pudo subir la imagen de portada');
        }
      }

      const { data, error } = await supabaseSenior
        .from('courses')
        .insert({
          title: formData.title,
          slug: formData.slug || slugify(formData.title),
          description: formData.description || null,
          thumbnail_url: thumbnailUrl,
          category: formData.category,
          has_evaluation: formData.has_evaluation,
          is_published: formData.is_published,
        })
        .select()
        .single();

      if (error) throw error;

      // If course is published, notify all parents
      if (formData.is_published) {
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
            data: { courseId: data.id },
          }));

          const { error: notifError } = await supabaseSenior.from('notifications').insert(notifications);
          console.log('Notifications insert error:', notifError);
        }
      }

      addToast({
        type: 'success',
        title: 'Curso creado',
        message: `"${formData.title}" ha sido creado exitosamente`,
      });

      router.push(`/stareduca-senior/cursos/${data.id}`);
    } catch (error: any) {
      console.error('Error creating course:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'No se pudo crear el curso',
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
          <h1 className="text-2xl font-bold text-surface-900">Nuevo Curso</h1>
          <p className="text-surface-500">Crea un nuevo curso para StarEduca Senior</p>
        </div>
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
              placeholder="comunicacion-efectiva-con-tu-hijo-adolescente"
              hint="Se genera automáticamente del título. Puedes editarlo manualmente."
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
              value={thumbnailFile}
              onChange={setThumbnailFile}
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
                  El curso tendrá un examen final para los padres
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
                  Si está desactivado, el curso quedará como borrador
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
            Crear Curso
          </Button>
        </div>
      </form>
    </div>
  );
}
