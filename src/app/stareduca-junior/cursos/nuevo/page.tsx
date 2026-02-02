'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
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
import { slugify, COURSE_CATEGORIES } from '@/lib/utils';
import { uploadFile, generateCourseThumbnailPath } from '@/lib/supabase/storage';

export default function NuevoCursoPage() {
  const router = useRouter();
  const { addToast } = useToastStore();
  const [isLoading, setIsLoading] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    category: '',
    xp_reward: 200,
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
        title: 'Error de validacion',
        message: 'El titulo y la categoria son obligatorios',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Generar un ID temporal para el path del archivo
      const tempId = crypto.randomUUID();
      let thumbnailUrl: string | null = null;

      // Subir thumbnail si existe
      if (thumbnailFile) {
        const path = generateCourseThumbnailPath(tempId, thumbnailFile.name);
        thumbnailUrl = await uploadFile(path, thumbnailFile);

        if (!thumbnailUrl) {
          throw new Error('No se pudo subir la imagen de portada');
        }
      }

      // Crear el curso
      const { data, error } = await supabase
        .from('courses')
        .insert({
          title: formData.title,
          slug: formData.slug || slugify(formData.title),
          description: formData.description || null,
          thumbnail_url: thumbnailUrl,
          category: formData.category,
          xp_reward: formData.xp_reward,
          is_published: formData.is_published,
        })
        .select()
        .single();

      if (error) throw error;

      // Si el curso está publicado, crear notificaciones para todos los estudiantes
      if (formData.is_published) {
        const { data: students } = await supabase
          .from('students')
          .select('id');

        if (students && students.length > 0) {
          const notifications = students.map((student) => ({
            student_id: student.id,
            type: 'course',
            title: 'Nuevo curso disponible',
            message: formData.title,
            data: { courseId: data.id },
          }));

          await supabase.from('notifications').insert(notifications);
        }
      }

      addToast({
        type: 'success',
        title: 'Curso creado',
        message: `"${formData.title}" ha sido creado exitosamente`,
      });

      router.push(`/stareduca-junior/cursos/${data.id}`);
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
          <p className="text-surface-500">Crea un nuevo curso para StarEduca Junior</p>
        </div>
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
              hint="Se genera automaticamente del titulo. Puedes editarlo manualmente."
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
              value={thumbnailFile}
              onChange={setThumbnailFile}
              accept="image/*"
              showPreview={true}
              helperText="PNG, JPG o GIF. Maximo 10MB. Se subira al guardar el curso."
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
              hint="Puntos de experiencia que recibira el estudiante al completar el curso"
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
                  Si esta desactivado, el curso quedara como borrador
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
