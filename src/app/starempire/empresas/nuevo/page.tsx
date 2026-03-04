'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseStarEmpire } from '@/lib/supabase/starempire-client';
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
import { uploadFileStarEmpire, generateCompanyCoverPath } from '@/lib/supabase/starempire-storage';

export default function NuevaEmpresaPage() {
  const router = useRouter();
  const { addToast } = useToastStore();
  const [isLoading, setIsLoading] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    founder: '',
    description: '',
    founded_year: '',
    industry: '',
    headquarters: '',
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

    if (!formData.title || !formData.founder) {
      addToast({
        type: 'error',
        title: 'Error de validacion',
        message: 'El titulo y el fundador son obligatorios',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Subir portada si existe
      const tempId = crypto.randomUUID();
      let coverUrl: string | null = null;

      if (coverFile) {
        const path = generateCompanyCoverPath(tempId, coverFile.name);
        coverUrl = await uploadFileStarEmpire(path, coverFile);

        if (!coverUrl) {
          throw new Error('No se pudo subir la imagen de portada');
        }
      }

      const { data, error } = await supabaseStarEmpire
        .from('companies')
        .insert({
          title: formData.title,
          slug: formData.slug || slugify(formData.title),
          founder: formData.founder,
          description: formData.description || null,
          cover_url: coverUrl,
          founded_year: formData.founded_year ? parseInt(formData.founded_year) : null,
          industry: formData.industry || null,
          headquarters: formData.headquarters || null,
          is_published: formData.is_published,
          published_at: formData.is_published ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (error) throw error;

      addToast({
        type: 'success',
        title: 'Empresa creada',
        message: `"${formData.title}" ha sido creada exitosamente`,
      });

      // Notificar a usuarios
      try {
        await supabaseStarEmpire.from('notifications').insert({
          type: 'new_company',
          title: 'Nueva empresa disponible',
          message: `"${formData.title}" fundada por ${formData.founder} ya está disponible`,
          data: { companyId: data.id },
        });
      } catch (e) {
        console.error('Error sending notification:', e);
      }

      router.push(`/starempire/empresas/${data.id}`);
    } catch (error: any) {
      console.error('Error creating company:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'No se pudo crear la empresa',
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
          <h1 className="text-2xl font-bold text-surface-900">Nueva Empresa</h1>
          <p className="text-surface-500">Agrega una nueva empresa a StarEmpire</p>
        </div>
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
              hint="Se genera automaticamente del titulo. Puedes editarlo manualmente."
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
              value={coverFile}
              onChange={setCoverFile}
              accept="image/*"
              showPreview={true}
              helperText="PNG, JPG o WebP. Maximo 10MB. Se subira al guardar la empresa."
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
                  Si esta desactivado, la empresa quedara como borrador
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
            Crear Empresa
          </Button>
        </div>
      </form>
    </div>
  );
}
