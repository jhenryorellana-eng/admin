'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabaseStarGenius } from '@/lib/supabase/stargenius-client';
import { deleteFileByUrlStarGenius } from '@/lib/supabase/stargenius-storage';
import {
  Button,
  Card,
  Badge,
  Input,
  Select,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Spinner,
} from '@/components/ui';
import { useToastStore, useConfirmStore } from '@/stores/admin-store';
import { formatDate, INTELLIGENCE_TYPES } from '@/lib/utils';

type Genius = {
  id: string;
  name: string;
  slug: string;
  field: string;
  era: string | null;
  description: string | null;
  portrait_url: string | null;
  average_rating: number | null;
  total_lessons: number;
  total_genius: number;
  total_inspired: number;
  total_saves: number;
  tags: string[] | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  lessons_count?: number;
  main_intelligence?: string;
};

export default function GeniosPage() {
  const [geniuses, setGeniuses] = useState<Genius[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [intelligenceFilter, setIntelligenceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { addToast } = useToastStore();
  const { openConfirm } = useConfirmStore();

  useEffect(() => {
    fetchGeniuses();
  }, []);

  async function fetchGeniuses() {
    try {
      // Fetch geniuses
      const { data: geniusesData, error } = await supabaseStarGenius
        .from('geniuses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch lessons to get counts and intelligence types per genius
      const { data: lessonsData } = await supabaseStarGenius
        .from('lessons')
        .select('genius_id, intelligence_type');

      // Map counts and main intelligence to geniuses
      const geniusesWithCounts = (geniusesData || []).map((genius) => {
        const geniusLessons = lessonsData?.filter((l) => l.genius_id === genius.id) || [];
        const lessonsCount = geniusLessons.length;

        // Find most common intelligence type
        let mainIntelligence = '';
        if (geniusLessons.length > 0) {
          const typeCounts: Record<string, number> = {};
          geniusLessons.forEach((lesson) => {
            if (lesson.intelligence_type) {
              typeCounts[lesson.intelligence_type] = (typeCounts[lesson.intelligence_type] || 0) + 1;
            }
          });
          const sorted = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
          if (sorted.length > 0) {
            mainIntelligence = sorted[0][0];
          }
        }

        return {
          ...genius,
          lessons_count: lessonsCount,
          main_intelligence: mainIntelligence,
        };
      });

      setGeniuses(geniusesWithCounts);
    } catch (error) {
      console.error('Error fetching geniuses:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'No se pudieron cargar los genios',
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleDelete = (genius: Genius) => {
    openConfirm(
      'Eliminar genio',
      `¿Estas seguro de que deseas eliminar "${genius.name}"? Esta accion no se puede deshacer.`,
      async () => {
        try {
          // 1. Obtener lecciones del genio para borrar archivos de storage
          const { data: lessons } = await supabaseStarGenius
            .from('lessons')
            .select('video_url, video_thumbnail_url')
            .eq('genius_id', genius.id);

          // 2. Borrar archivos de lecciones (videos y thumbnails)
          for (const lesson of lessons || []) {
            if (lesson.video_url) await deleteFileByUrlStarGenius(lesson.video_url);
            if (lesson.video_thumbnail_url) await deleteFileByUrlStarGenius(lesson.video_thumbnail_url);
          }

          // 3. Borrar retrato del genio
          if (genius.portrait_url) await deleteFileByUrlStarGenius(genius.portrait_url);

          // 4. Borrar registro DB (cascade eliminara lecciones)
          const { error } = await supabaseStarGenius.from('geniuses').delete().eq('id', genius.id);
          if (error) throw error;

          setGeniuses(geniuses.filter((g) => g.id !== genius.id));
          addToast({
            type: 'success',
            title: 'Genio eliminado',
            message: `"${genius.name}" ha sido eliminado junto con sus archivos`,
          });
        } catch (error) {
          console.error('Error deleting genius:', error);
          addToast({
            type: 'error',
            title: 'Error',
            message: 'No se pudo eliminar el genio',
          });
        }
      }
    );
  };

  const handleTogglePublish = async (genius: Genius) => {
    try {
      const updateData: Record<string, any> = {
        is_published: !genius.is_published,
      };

      // Set published_at when publishing for the first time
      if (!genius.is_published && !genius.published_at) {
        updateData.published_at = new Date().toISOString();
      }

      const { error } = await supabaseStarGenius
        .from('geniuses')
        .update(updateData)
        .eq('id', genius.id);

      if (error) throw error;

      setGeniuses(
        geniuses.map((g) =>
          g.id === genius.id
            ? { ...g, is_published: !g.is_published, published_at: updateData.published_at || g.published_at }
            : g
        )
      );
      addToast({
        type: 'success',
        title: genius.is_published ? 'Genio despublicado' : 'Genio publicado',
        message: `"${genius.name}" ahora esta ${genius.is_published ? 'en borrador' : 'publicado'}`,
      });
    } catch (error) {
      console.error('Error toggling publish:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'No se pudo cambiar el estado del genio',
      });
    }
  };

  // Filter geniuses
  const filteredGeniuses = geniuses.filter((genius) => {
    const matchesSearch = genius.name.toLowerCase().includes(search.toLowerCase());
    const matchesIntelligence = !intelligenceFilter || genius.main_intelligence === intelligenceFilter;
    const matchesStatus =
      !statusFilter ||
      (statusFilter === 'published' && genius.is_published) ||
      (statusFilter === 'draft' && !genius.is_published);
    return matchesSearch && matchesIntelligence && matchesStatus;
  });

  const getIntelligenceLabel = (value: string) => {
    return INTELLIGENCE_TYPES.find((t) => t.value === value)?.label || value;
  };

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
          <h1 className="text-2xl font-bold text-surface-900">Genios</h1>
          <p className="text-surface-500 mt-1">
            Gestiona los genios de StarGenius
          </p>
        </div>
        <Link href="/stargenius/genios/nuevo">
          <Button
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            Nuevo Genio
          </Button>
        </Link>
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
          <div className="w-full md:w-48">
            <Select
              value={intelligenceFilter}
              onChange={(e) => setIntelligenceFilter(e.target.value)}
              options={[
                { value: '', label: 'Todas las inteligencias' },
                ...INTELLIGENCE_TYPES.map((t) => ({ value: t.value, label: t.label })),
              ]}
            />
          </div>
          <div className="w-full md:w-40">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: '', label: 'Todos' },
                { value: 'published', label: 'Publicados' },
                { value: 'draft', label: 'Borradores' },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Geniuses Table */}
      {filteredGeniuses.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <svg
              className="w-12 h-12 mx-auto text-surface-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <p className="mt-4 text-surface-500">No se encontraron genios</p>
            <Link href="/stargenius/genios/nuevo">
              <Button variant="primary" className="mt-4">
                Crear primer genio
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Genio</TableHead>
              <TableHead>Disciplina</TableHead>
              <TableHead>Era</TableHead>
              <TableHead>Lecciones</TableHead>
              <TableHead>Inteligencia principal</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGeniuses.map((genius) => (
              <TableRow key={genius.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-16 bg-surface-100 rounded-lg overflow-hidden flex-shrink-0">
                      {genius.portrait_url ? (
                        <Image
                          src={genius.portrait_url}
                          alt={genius.name}
                          width={48}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-surface-400">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-surface-900">{genius.name}</p>
                      <p className="text-xs text-surface-400">/{genius.slug}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span>{genius.field}</span>
                </TableCell>
                <TableCell>
                  <span className="text-surface-500">{genius.era || '-'}</span>
                </TableCell>
                <TableCell>{genius.lessons_count || 0}</TableCell>
                <TableCell>
                  {genius.main_intelligence ? (
                    <Badge variant="info">{getIntelligenceLabel(genius.main_intelligence)}</Badge>
                  ) : (
                    <span className="text-surface-400">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={genius.is_published ? 'success' : 'warning'}>
                    {genius.is_published ? 'Publicado' : 'Borrador'}
                  </Badge>
                </TableCell>
                <TableCell className="text-surface-500">
                  {formatDate(genius.created_at)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/stargenius/genios/${genius.id}/lecciones`}>
                      <Button variant="ghost" size="sm" title="Ver Lecciones">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </Button>
                    </Link>
                    <Link href={`/stargenius/genios/${genius.id}`}>
                      <Button variant="ghost" size="sm" title="Editar">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTogglePublish(genius)}
                      title={genius.is_published ? 'Despublicar' : 'Publicar'}
                    >
                      {genius.is_published ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(genius)}
                      title="Eliminar"
                      className="text-accent-red hover:bg-red-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
