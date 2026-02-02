'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import {
  Button,
  Card,
  CardContent,
  Input,
  Select,
  Modal,
  ModalFooter,
  Spinner,
  Badge,
  Textarea,
} from '@/components/ui';
import { useToastStore, useConfirmStore } from '@/stores/admin-store';
import { BADGE_CATEGORIES, BADGE_RARITIES } from '@/lib/utils';

interface BadgeType {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  category: string;
  rarity: string;
  criteria: any;
}

const EMOJI_OPTIONS = ['🏆', '⭐', '🔥', '💎', '🎯', '🚀', '💪', '🎓', '📚', '💡', '🌟', '👑', '🎖️', '🏅', '🎪'];

export default function BadgesPage() {
  const router = useRouter();
  const { addToast } = useToastStore();
  const { openConfirm } = useConfirmStore();

  const [badges, setBadges] = useState<BadgeType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [rarityFilter, setRarityFilter] = useState('');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBadge, setEditingBadge] = useState<BadgeType | null>(null);
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
    fetchBadges();
  }, []);

  async function fetchBadges() {
    try {
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;
      setBadges(data || []);
    } catch (error) {
      console.error('Error fetching badges:', error);
      addToast({ type: 'error', title: 'Error', message: 'No se pudieron cargar los badges' });
    } finally {
      setIsLoading(false);
    }
  }

  const openModal = (badge?: BadgeType) => {
    if (badge) {
      setEditingBadge(badge);
      setFormData({
        name: badge.name,
        description: badge.description || '',
        icon: badge.icon,
        category: badge.category,
        rarity: badge.rarity,
        criteria: badge.criteria as any,
      });
    } else {
      setEditingBadge(null);
      setFormData({
        name: '',
        description: '',
        icon: '🏆',
        category: '',
        rarity: '',
        criteria: { type: 'lessons_completed', value: 1 },
      });
    }
    setIsModalOpen(true);
  };

  const saveBadge = async () => {
    if (!formData.name || !formData.category || !formData.rarity) {
      addToast({ type: 'error', title: 'Error', message: 'Completa todos los campos obligatorios' });
      return;
    }

    setIsSaving(true);

    try {
      if (editingBadge) {
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
          .eq('id', editingBadge.id);

        if (error) throw error;

        setBadges(
          badges.map((b) =>
            b.id === editingBadge.id
              ? { ...b, ...formData, description: formData.description || null }
              : b
          )
        );
        addToast({ type: 'success', title: 'Badge actualizado' });
      } else {
        const { data, error } = await supabase
          .from('badges')
          .insert({
            name: formData.name,
            description: formData.description || null,
            icon: formData.icon,
            category: formData.category,
            rarity: formData.rarity,
            criteria: formData.criteria,
          })
          .select()
          .single();

        if (error) throw error;
        setBadges([...badges, data]);
        addToast({ type: 'success', title: 'Badge creado' });
      }

      setIsModalOpen(false);
    } catch (error: any) {
      addToast({ type: 'error', title: 'Error', message: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteBadge = (badge: BadgeType) => {
    openConfirm('Eliminar badge', `¿Estás seguro de eliminar "${badge.name}"?`, async () => {
      try {
        const { error } = await supabase.from('badges').delete().eq('id', badge.id);
        if (error) throw error;

        setBadges(badges.filter((b) => b.id !== badge.id));
        addToast({ type: 'success', title: 'Badge eliminado' });
      } catch (error: any) {
        addToast({ type: 'error', title: 'Error', message: error.message });
      }
    });
  };

  const getRarityColor = (rarity: string) => {
    const item = BADGE_RARITIES.find((r) => r.value === rarity);
    return item?.color || 'bg-surface-400';
  };

  const getCategoryLabel = (category: string) => {
    return BADGE_CATEGORIES.find((c) => c.value === category)?.label || category;
  };

  const getRarityLabel = (rarity: string) => {
    return BADGE_RARITIES.find((r) => r.value === rarity)?.label || rarity;
  };

  // Filter badges
  const filteredBadges = badges.filter((badge) => {
    const matchesSearch = badge.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || badge.category === categoryFilter;
    const matchesRarity = !rarityFilter || badge.rarity === rarityFilter;
    return matchesSearch && matchesCategory && matchesRarity;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Badges</h1>
          <p className="text-surface-500 mt-1">Gestiona las insignias de gamificación</p>
        </div>
        <Button onClick={() => openModal()}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Badge
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar por nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
          </div>
          <div className="w-full md:w-40">
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={[{ value: '', label: 'Categoría' }, ...BADGE_CATEGORIES]}
            />
          </div>
          <div className="w-full md:w-40">
            <Select
              value={rarityFilter}
              onChange={(e) => setRarityFilter(e.target.value)}
              options={[{ value: '', label: 'Rareza' }, ...BADGE_RARITIES]}
            />
          </div>
        </div>
      </Card>

      {/* Badges Grid */}
      {filteredBadges.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <span className="text-5xl">🏆</span>
            <p className="mt-4 text-surface-500">No se encontraron badges</p>
            <Button className="mt-4" onClick={() => openModal()}>
              Crear primer badge
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredBadges.map((badge) => (
            <Card key={badge.id} hover className="relative group">
              {/* Rarity indicator */}
              <div
                className={`absolute top-0 left-0 right-0 h-1 rounded-t-xl ${getRarityColor(
                  badge.rarity
                )}`}
              />
              <CardContent className="pt-4 text-center">
                <div className="text-5xl mb-3">{badge.icon}</div>
                <h3 className="font-semibold text-surface-900">{badge.name}</h3>
                {badge.description && (
                  <p className="text-sm text-surface-500 mt-1 line-clamp-2">
                    {badge.description}
                  </p>
                )}
                <div className="flex items-center justify-center gap-2 mt-3">
                  <Badge variant="info" size="sm">
                    {getCategoryLabel(badge.category)}
                  </Badge>
                  <Badge
                    size="sm"
                    className={`${getRarityColor(badge.rarity)} text-white`}
                  >
                    {getRarityLabel(badge.rarity)}
                  </Badge>
                </div>

                {/* Actions (visible on hover) */}
                <div className="flex items-center justify-center gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" onClick={() => openModal(badge)}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-accent-red hover:bg-red-50"
                    onClick={() => deleteBadge(badge)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Badge Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBadge ? 'Editar Badge' : 'Nuevo Badge'}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Nombre *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ej: Primera Lección"
          />

          <Textarea
            label="Descripción"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe qué representa este badge..."
            rows={2}
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
            />
            <Select
              label="Rareza *"
              value={formData.rarity}
              onChange={(e) => setFormData({ ...formData, rarity: e.target.value })}
              options={BADGE_RARITIES}
              placeholder="Seleccionar"
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
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={saveBadge} isLoading={isSaving}>
            {editingBadge ? 'Guardar' : 'Crear'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
