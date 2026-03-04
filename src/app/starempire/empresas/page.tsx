'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabaseStarEmpire } from '@/lib/supabase/starempire-client';
import { deleteFileByUrlStarEmpire } from '@/lib/supabase/starempire-storage';
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
import { formatDate } from '@/lib/utils';

const CATEGORY_TYPES = [
  { value: 'tecnologia', label: 'Tecnologia' },
  { value: 'liderazgo', label: 'Liderazgo' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'finanzas', label: 'Finanzas' },
  { value: 'innovacion', label: 'Innovacion' },
  { value: 'impacto', label: 'Impacto' },
  { value: 'resiliencia', label: 'Resiliencia' },
] as const;

type Company = {
  id: string;
  title: string;
  slug: string;
  founder: string;
  founder_verified: boolean;
  description: string | null;
  cover_url: string | null;
  average_rating: number | null;
  total_lessons: number;
  total_inspired: number;
  total_game_changers: number;
  total_saves: number;
  tags: string[] | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  founded_year: number | null;
  industry: string | null;
  headquarters: string | null;
  lessons_count?: number;
  main_category?: string;
};

export default function EmpresasPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { addToast } = useToastStore();
  const { openConfirm } = useConfirmStore();

  useEffect(() => {
    fetchCompanies();
  }, []);

  async function fetchCompanies() {
    try {
      // Fetch companies
      const { data: companiesData, error } = await supabaseStarEmpire
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch lessons to get counts and category types per company
      const { data: lessonsData } = await supabaseStarEmpire
        .from('lessons')
        .select('company_id, category_type');

      // Map counts and main category to companies
      const companiesWithCounts = (companiesData || []).map((company) => {
        const companyLessons = lessonsData?.filter((i) => i.company_id === company.id) || [];
        const lessonsCount = companyLessons.length;

        // Find most common category type
        let mainCategory = '';
        if (companyLessons.length > 0) {
          const typeCounts: Record<string, number> = {};
          companyLessons.forEach((lesson) => {
            if (lesson.category_type) {
              typeCounts[lesson.category_type] = (typeCounts[lesson.category_type] || 0) + 1;
            }
          });
          const sorted = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
          if (sorted.length > 0) {
            mainCategory = sorted[0][0];
          }
        }

        return {
          ...company,
          lessons_count: lessonsCount,
          main_category: mainCategory,
        };
      });

      setCompanies(companiesWithCounts);
    } catch (error) {
      console.error('Error fetching companies:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'No se pudieron cargar las empresas',
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleDelete = (company: Company) => {
    openConfirm(
      'Eliminar empresa',
      `\u00BFEstas seguro de que deseas eliminar "${company.title}"? Esta accion no se puede deshacer.`,
      async () => {
        try {
          // 1. Obtener lecciones de la empresa para borrar archivos de storage
          const { data: lessons } = await supabaseStarEmpire
            .from('lessons')
            .select('video_url, video_thumbnail_url')
            .eq('company_id', company.id);

          // 2. Borrar archivos de lecciones (videos y thumbnails)
          for (const lesson of lessons || []) {
            if (lesson.video_url) await deleteFileByUrlStarEmpire(lesson.video_url);
            if (lesson.video_thumbnail_url) await deleteFileByUrlStarEmpire(lesson.video_thumbnail_url);
          }

          // 3. Borrar portada de la empresa
          if (company.cover_url) await deleteFileByUrlStarEmpire(company.cover_url);

          // 4. Borrar registro DB (cascade eliminara lecciones)
          const { error } = await supabaseStarEmpire.from('companies').delete().eq('id', company.id);
          if (error) throw error;

          setCompanies(companies.filter((b) => b.id !== company.id));
          addToast({
            type: 'success',
            title: 'Empresa eliminada',
            message: `"${company.title}" ha sido eliminada junto con sus archivos`,
          });
        } catch (error) {
          console.error('Error deleting company:', error);
          addToast({
            type: 'error',
            title: 'Error',
            message: 'No se pudo eliminar la empresa',
          });
        }
      }
    );
  };

  const handleTogglePublish = async (company: Company) => {
    try {
      const updateData: Record<string, any> = {
        is_published: !company.is_published,
      };

      // Set published_at when publishing for the first time
      if (!company.is_published && !company.published_at) {
        updateData.published_at = new Date().toISOString();
      }

      const { error } = await supabaseStarEmpire
        .from('companies')
        .update(updateData)
        .eq('id', company.id);

      if (error) throw error;

      setCompanies(
        companies.map((b) =>
          b.id === company.id
            ? { ...b, is_published: !b.is_published, published_at: updateData.published_at || b.published_at }
            : b
        )
      );
      addToast({
        type: 'success',
        title: company.is_published ? 'Empresa despublicada' : 'Empresa publicada',
        message: `"${company.title}" ahora esta ${company.is_published ? 'en borrador' : 'publicada'}`,
      });
    } catch (error) {
      console.error('Error toggling publish:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'No se pudo cambiar el estado de la empresa',
      });
    }
  };

  // Filter companies
  const filteredCompanies = companies.filter((company) => {
    const matchesSearch = company.title.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || company.main_category === categoryFilter;
    const matchesStatus =
      !statusFilter ||
      (statusFilter === 'published' && company.is_published) ||
      (statusFilter === 'draft' && !company.is_published);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getCategoryLabel = (value: string) => {
    return CATEGORY_TYPES.find((t) => t.value === value)?.label || value;
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
          <h1 className="text-2xl font-bold text-surface-900">Empresas</h1>
          <p className="text-surface-500 mt-1">
            Gestiona las empresas de StarEmpire
          </p>
        </div>
        <Link href="/starempire/empresas/nuevo">
          <Button
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            Nueva Empresa
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar por titulo..."
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
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={[
                { value: '', label: 'Todas las categorias' },
                ...CATEGORY_TYPES.map((t) => ({ value: t.value, label: t.label })),
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

      {/* Companies Table */}
      {filteredCompanies.length === 0 ? (
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
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <p className="mt-4 text-surface-500">No se encontraron empresas</p>
            <Link href="/starempire/empresas/nuevo">
              <Button variant="primary" className="mt-4">
                Crear primera empresa
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Fundador</TableHead>
              <TableHead>Lecciones</TableHead>
              <TableHead>Categoria principal</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCompanies.map((company) => (
              <TableRow key={company.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-16 bg-surface-100 rounded-lg overflow-hidden flex-shrink-0">
                      {company.cover_url ? (
                        <Image
                          src={company.cover_url}
                          alt={company.title}
                          width={48}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-surface-400">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-surface-900">{company.title}</p>
                      <p className="text-xs text-surface-400">/{company.slug}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <span>{company.founder}</span>
                    {company.founder_verified && (
                      <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    )}
                  </div>
                </TableCell>
                <TableCell>{company.lessons_count || 0}</TableCell>
                <TableCell>
                  {company.main_category ? (
                    <Badge variant="info">{getCategoryLabel(company.main_category)}</Badge>
                  ) : (
                    <span className="text-surface-400">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={company.is_published ? 'success' : 'warning'}>
                    {company.is_published ? 'Publicado' : 'Borrador'}
                  </Badge>
                </TableCell>
                <TableCell className="text-surface-500">
                  {formatDate(company.created_at)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/starempire/empresas/${company.id}/lecciones`}>
                      <Button variant="ghost" size="sm" title="Ver Lecciones">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </Button>
                    </Link>
                    <Link href={`/starempire/empresas/${company.id}`}>
                      <Button variant="ghost" size="sm" title="Editar">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTogglePublish(company)}
                      title={company.is_published ? 'Despublicar' : 'Publicar'}
                    >
                      {company.is_published ? (
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
                      onClick={() => handleDelete(company)}
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
