'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Tables } from '@/types/database';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Spinner,
} from '@/components/ui';
import { useToastStore } from '@/stores/admin-store';

type XpConfig = Tables<'xp_config'>;

const DEFAULT_XP_CONFIG = [
  { action: 'lesson_complete', xp_amount: 25, daily_limit: null, description: 'Al completar una lección' },
  { action: 'course_complete', xp_amount: 200, daily_limit: null, description: 'Al completar un curso' },
  { action: 'exam_passed', xp_amount: 100, daily_limit: null, description: 'Examen aprobado (70-79%)' },
  { action: 'exam_good', xp_amount: 125, daily_limit: null, description: 'Examen aprobado (80-89%)' },
  { action: 'exam_great', xp_amount: 150, daily_limit: null, description: 'Examen aprobado (90-99%)' },
  { action: 'exam_perfect', xp_amount: 200, daily_limit: null, description: 'Examen perfecto (100%)' },
  { action: 'daily_login', xp_amount: 5, daily_limit: 1, description: 'Login diario' },
  { action: 'post_created', xp_amount: 10, daily_limit: 3, description: 'Crear un post' },
  { action: 'streak_bonus', xp_amount: 50, daily_limit: 1, description: 'Bonus de racha (cada 7 días)' },
];

export default function XpConfigPage() {
  const { addToast } = useToastStore();
  const [configs, setConfigs] = useState<XpConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editedConfigs, setEditedConfigs] = useState<Map<string, Partial<XpConfig>>>(new Map());

  useEffect(() => {
    fetchConfigs();
  }, []);

  async function fetchConfigs() {
    try {
      const { data, error } = await supabase
        .from('xp_config')
        .select('*')
        .order('action');

      if (error) throw error;

      // If no configs exist, show defaults (but don't save yet)
      if (!data || data.length === 0) {
        // The table doesn't exist or is empty - we'll create on save
        setConfigs(DEFAULT_XP_CONFIG.map((c, i) => ({
          id: `temp-${i}`,
          ...c,
          is_active: true,
        })) as XpConfig[]);
      } else {
        setConfigs(data);
      }
    } catch (error: any) {
      console.error('Error fetching configs:', error);
      // Table might not exist yet - show defaults
      setConfigs(DEFAULT_XP_CONFIG.map((c, i) => ({
        id: `temp-${i}`,
        ...c,
        is_active: true,
      })) as XpConfig[]);
    } finally {
      setIsLoading(false);
    }
  }

  const handleChange = (configId: string, field: keyof XpConfig, value: any) => {
    const newEdited = new Map(editedConfigs);
    const existing = newEdited.get(configId) || {};
    newEdited.set(configId, { ...existing, [field]: value });
    setEditedConfigs(newEdited);

    // Update local state for immediate feedback
    setConfigs(
      configs.map((c) =>
        c.id === configId ? { ...c, [field]: value } : c
      )
    );
  };

  const saveChanges = async () => {
    setIsSaving(true);

    try {
      // Check if configs are temporary (need to insert)
      const needsInsert = configs.some((c) => c.id.startsWith('temp-'));

      if (needsInsert) {
        // Insert all configs
        const configsToInsert = configs.map(({ id, ...rest }) => rest);
        const { data, error } = await supabase
          .from('xp_config')
          .insert(configsToInsert)
          .select();

        if (error) throw error;
        setConfigs(data || []);
      } else {
        // Update only changed configs
        const entries = Array.from(editedConfigs.entries());
        for (const [configId, changes] of entries) {
          const { error } = await supabase
            .from('xp_config')
            .update(changes)
            .eq('id', configId);

          if (error) throw error;
        }
      }

      setEditedConfigs(new Map());
      addToast({ type: 'success', title: 'Configuración guardada' });
    } catch (error: any) {
      console.error('Error saving configs:', error);
      addToast({ type: 'error', title: 'Error', message: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = editedConfigs.size > 0 || configs.some((c) => c.id.startsWith('temp-'));

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
          <h1 className="text-2xl font-bold text-surface-900">Configuración de XP</h1>
          <p className="text-surface-500 mt-1">
            Define cuántos puntos de experiencia se otorgan por cada acción
          </p>
        </div>
        <Button onClick={saveChanges} isLoading={isSaving} disabled={!hasChanges}>
          Guardar Cambios
        </Button>
      </div>

      {/* Info Card */}
      <Card>
        <CardContent className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-xl text-primary">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-surface-900">Sobre el sistema de XP</h3>
            <p className="text-sm text-surface-500 mt-1">
              Los estudiantes ganan puntos de experiencia (XP) al completar acciones en la plataforma.
              El XP acumulado determina su nivel y desbloquea badges especiales.
              Puedes configurar límites diarios para evitar abuso del sistema.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* XP Config Table */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones y Recompensas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-surface-600 uppercase">
                    Acción
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-surface-600 uppercase">
                    Descripción
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-surface-600 uppercase w-32">
                    XP
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-surface-600 uppercase w-32">
                    Límite/día
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-surface-600 uppercase w-24">
                    Activo
                  </th>
                </tr>
              </thead>
              <tbody>
                {configs.map((config) => (
                  <tr
                    key={config.id}
                    className="border-b border-surface-100 hover:bg-surface-50"
                  >
                    <td className="py-3 px-4">
                      <code className="text-sm bg-surface-100 px-2 py-1 rounded">
                        {config.action}
                      </code>
                    </td>
                    <td className="py-3 px-4 text-sm text-surface-600">
                      {config.description}
                    </td>
                    <td className="py-3 px-4">
                      <Input
                        type="number"
                        value={config.xp_amount.toString()}
                        onChange={(e) =>
                          handleChange(config.id, 'xp_amount', parseInt(e.target.value) || 0)
                        }
                        min={0}
                        className="w-24 text-center mx-auto"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <Input
                        type="number"
                        value={config.daily_limit?.toString() || ''}
                        onChange={(e) =>
                          handleChange(
                            config.id,
                            'daily_limit',
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
                        min={0}
                        placeholder="∞"
                        className="w-24 text-center mx-auto"
                      />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.is_active}
                          onChange={(e) =>
                            handleChange(config.id, 'is_active', e.target.checked)
                          }
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-surface-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* XP Levels Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Referencia de Niveles</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-surface-500 mb-4">
            Los niveles se calculan automáticamente basados en el XP total del estudiante.
            Fórmula: Nivel = √(XP / 100)
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[1, 5, 10, 15, 20].map((level) => (
              <div
                key={level}
                className="p-4 bg-surface-50 rounded-lg text-center"
              >
                <div className="text-2xl font-bold text-primary">Nivel {level}</div>
                <div className="text-sm text-surface-500">
                  {(level * level * 100).toLocaleString()} XP
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
