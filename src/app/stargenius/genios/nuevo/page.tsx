'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseStarGenius } from '@/lib/supabase/stargenius-client';
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
import { uploadFileStarGenius, generateGeniusPortraitPath } from '@/lib/supabase/stargenius-storage';

export default function NuevoGenioPage() {
  const router = useRouter();
  const { addToast } = useToastStore();
  const [isLoading, setIsLoading] = useState(false);
  const [portraitFile, setPortraitFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    field: '',
    era: '',
    description: '',
    is_published: false,
  });

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: slugify(name),
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

    setIsLoading(true);

    try {
      // Subir retrato si existe
      const tempId = crypto.randomUUID();
      let portraitUrl: string | null = null;

      if (portraitFile) {
        const path = generateGeniusPortraitPath(tempId, portraitFile.name);
        portraitUrl = await uploadFileStarGenius(path, portraitFile);

        if (!portraitUrl) {
          throw new Error('No se pudo subir el retrato');
        }
      }

      const { data, error } = await supabaseStarGenius
        .from('geniuses')
        .insert({
          name: formData.name,
          slug: formData.slug || slugify(formData.name),
          field: formData.field,
          era: formData.era || null,
          description: formData.description || null,
          portrait_url: portraitUrl,
          is_published: formData.is_published,
          published_at: formData.is_published ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (error) throw error;

      addToast({
        type: 'success',
        title: 'Genio creado',
        message: `"${formData.name}" ha sido creado exitosamente`,
      });

      // Notificar a usuarios
      try {
        await supabaseStarGenius.from('notifications').insert({
          type: 'new_genius',
          title: 'Nuevo genio disponible',
          message: `"${formData.name}" (${formData.field}) ya está disponible`,
          data: { geniusId: data.id },
        });
      } catch (e) {
        console.error('Error sending notification:', e);
      }

      router.push(`/stargenius/genios/${data.id}`);
    } catch (error: any) {
      console.error('Error creating genius:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'No se pudo crear el genio',
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
          <h1 className="text-2xl font-bold text-surface-900">Nuevo Genio</h1>
          <p className="text-surface-500">Agrega una nueva persona ilustre a StarGenius</p>
        </div>
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
              hint="Se genera automaticamente del nombre. Puedes editarlo manualmente."
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
              value={portraitFile}
              onChange={setPortraitFile}
              accept="image/*"
              showPreview={true}
              helperText="PNG, JPG o WebP. Maximo 10MB. Se subira al guardar el genio."
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
                  Si esta desactivado, el genio quedara como borrador
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
            Crear Genio
          </Button>
        </div>
      </form>
    </div>
  );
}
