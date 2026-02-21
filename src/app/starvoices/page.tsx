'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseStarVoices } from '@/lib/supabase/starvoices-client';
import { Button, Card, Spinner } from '@/components/ui';
import { useToastStore } from '@/stores/admin-store';

export default function StarVoicesOverviewPage() {
  const [stats, setStats] = useState({ totalPacks: 0, publishedPacks: 0, totalAudios: 0, publishedAudios: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useToastStore();

  useEffect(() => {
    async function fetchStats() {
      try {
        const [packsRes, audiosRes] = await Promise.all([
          supabaseStarVoices.from('packs').select('id, is_published'),
          supabaseStarVoices.from('audios').select('id, is_published'),
        ]);

        const packs = packsRes.data || [];
        const audios = audiosRes.data || [];

        setStats({
          totalPacks: packs.length,
          publishedPacks: packs.filter((p: any) => p.is_published).length,
          totalAudios: audios.length,
          publishedAudios: audios.filter((a: any) => a.is_published).length,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
        addToast({ type: 'error', title: 'Error', message: 'No se pudieron cargar las estadisticas' });
      } finally {
        setIsLoading(false);
      }
    }
    fetchStats();
  }, [addToast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">StarVoices</h1>
          <p className="text-surface-500 mt-1">Gestion de contenido de audio para padres</p>
        </div>
        <Link href="/starvoices/packs/nuevo">
          <Button
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            Nuevo Pack
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-center py-4">
            <p className="text-3xl font-bold text-surface-900">{stats.totalPacks}</p>
            <p className="text-sm text-surface-500 mt-1">Total Packs</p>
          </div>
        </Card>
        <Card>
          <div className="text-center py-4">
            <p className="text-3xl font-bold text-green-600">{stats.publishedPacks}</p>
            <p className="text-sm text-surface-500 mt-1">Packs Publicados</p>
          </div>
        </Card>
        <Card>
          <div className="text-center py-4">
            <p className="text-3xl font-bold text-surface-900">{stats.totalAudios}</p>
            <p className="text-sm text-surface-500 mt-1">Total Audios</p>
          </div>
        </Card>
        <Card>
          <div className="text-center py-4">
            <p className="text-3xl font-bold text-green-600">{stats.publishedAudios}</p>
            <p className="text-sm text-surface-500 mt-1">Audios Publicados</p>
          </div>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Link href="/starvoices/packs">
          <Card className="hover:border-primary/30 transition-colors cursor-pointer">
            <div className="flex items-center gap-4 p-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-surface-900">Gestionar Packs</h3>
                <p className="text-sm text-surface-500">Crear, editar y publicar packs de audio</p>
              </div>
            </div>
          </Card>
        </Link>
        <Link href="/starvoices/packs/nuevo">
          <Card className="hover:border-primary/30 transition-colors cursor-pointer">
            <div className="flex items-center gap-4 p-4">
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-surface-900">Crear Pack</h3>
                <p className="text-sm text-surface-500">Agregar un nuevo pack de audio</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
