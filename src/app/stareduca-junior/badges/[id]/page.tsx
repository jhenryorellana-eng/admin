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
} from '@/components/ui';
import { useToastStore } from '@/stores/admin-store';
import { BADGE_CATEGORIES, BADGE_RARITIES } from '@/lib/utils';

type BadgeType = Tables<'badges'>;

const EMOJI_OPTIONS = ['🏆', '⭐', '🔥', '💎', '🎯', '🚀', '💪', '🎓', '📚', '💡', '🌟', '👑', '🎖️', '🏅', '🎪'];

export default function EditBadgePage() {
  const router = useRouter();
  const params = useParams();
  const badgeId = params.id as string;
  const { addToast } = useToastStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '🏆',
    category: '',
    rarity: '',
    criteria: { type: 'lessons_completed', value: 1 },
  });

  useEffect(() => {
    async function fetchBadge() {
      try {
        const { data, error } = await supabase
          .from('badges')
          .select('*')
          .eq('id', badgeId)
          .single();

        if (error) throw error;

        if (data) {
          setFormData({
            name: data.name,
            description: data.description || '',
            icon: data.icon,
            category: data.category,
            rarity: data.rarity,
            criteria: data.criteria as any,
          });
        }
      } catch (error) {
        console.error('Error fetching badge:', error);
        addToast({ type: 'error', title: 'Error', message: 'No se pudo cargar el badge' });
        router.push('/stareduca-junior/badges');
      } finally {
        setIsLoading(false);
      }
    }

    fetchBadge();
  }, [badgeId, router, addToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.category || !formData.rarity) {
      addToast({ type: 'error', title: 'Error', message: 'Completa todos los campos obligatorios' });
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('badges')
        .update({
          name: formData.name,
          description: formData.description || null,
          icon: formData.icon,
          category: formData.category,
          rarity: formData.rarity,
          criteria: formData.criteria,
        })
        .eq('id', badgeId);

      if (error) throw error;

      addToast({ type: 'success', title: 'Badge actualizado' });
      router.push('/stareduca-junior/badges');
    } catch (error: any) {
      addToast({ type: 'error', title: 'Error', message: error.message });
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
          onClick={() => router.push('/stareduca-junior/badges')}
          className="p-2 hover:bg-surface-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Editar Badge</h1>
          <p className="text-surface-500">{formData.name}</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Información del Badge</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Nombre *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Primera Lección"
              required
            />

            <Textarea
              label="Descripción"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe qué representa este badge..."
              rows={3}
            />

            <div>
              <label className="label mb-2">Icono</label>
              <div className="flex flex-wrap gap-2">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon: emoji })}
                    className={`w-10 h-10 text-xl rounded-lg border-2 transition-colors ${
                      formData.icon === emoji
                        ? 'border-primary bg-primary/10'
                        : 'border-surface-200 hover:border-surface-300'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Categoría *"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                options={BADGE_CATEGORIES}
                placeholder="Seleccionar"
                required
              />
              <Select
                label="Rareza *"
                value={formData.rarity}
                onChange={(e) => setFormData({ ...formData, rarity: e.target.value })}
                options={BADGE_RARITIES}
                placeholder="Seleccionar"
                required
              />
            </div>

            <div className="p-4 bg-surface-50 rounded-lg">
              <label className="label mb-2">Criterio de obtención</label>
              <div className="grid grid-cols-2 gap-4">
                <Select
                  value={formData.criteria.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      criteria: { ...formData.criteria, type: e.target.value },
                    })
                  }
                  options={[
                    { value: 'lessons_completed', label: 'Lecciones completadas' },
                    { value: 'courses_completed', label: 'Cursos completados' },
                    { value: 'streak_days', label: 'Días de racha' },
                    { value: 'xp_earned', label: 'XP obtenido' },
                    { value: 'posts_created', label: 'Posts creados' },
                    { value: 'exams_passed', label: 'Exámenes aprobados' },
                  ]}
                />
                <Input
                  type="number"
                  value={formData.criteria.value.toString()}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      criteria: { ...formData.criteria, value: parseInt(e.target.value) || 0 },
                    })
                  }
                  min={1}
                  placeholder="Cantidad"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push('/stareduca-junior/badges')}
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
