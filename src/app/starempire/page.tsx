'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseStarEmpire } from '@/lib/supabase/starempire-client';
import { Card, CardHeader, CardTitle, CardContent, Badge, Spinner } from '@/components/ui';
import { formatNumber, formatDate } from '@/lib/utils';

const CATEGORY_TYPES = [
  { value: 'tecnologia', label: 'Tecnologia' },
  { value: 'liderazgo', label: 'Liderazgo' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'finanzas', label: 'Finanzas' },
  { value: 'innovacion', label: 'Innovacion' },
  { value: 'impacto', label: 'Impacto' },
  { value: 'resiliencia', label: 'Resiliencia' },
] as const;

interface StarEmpireStats {
  totalCompanies: number;
  publishedCompanies: number;
  totalLessons: number;
  totalLessonViews: number;
  totalStudents: number;
  activeReaders: number;
  totalReactions: number;
}

interface PopularCompany {
  id: string;
  title: string;
  founder: string;
  total_lessons: number;
  total_inspired: number;
}

interface RecentActivity {
  id: string;
  type: 'lesson_view' | 'company_progress';
  description: string;
  timestamp: string;
  icon: string;
  color: string;
}

interface CategoryCount {
  category_type: string;
  count: number;
}

const categoryIcons: Record<string, string> = {
  tecnologia: '\u{1F5A5}\uFE0F',
  liderazgo: '\u{1F465}',
  marketing: '\u{1F4E3}',
  finanzas: '\u{1F4B0}',
  innovacion: '\u{1F4A1}',
  impacto: '\u{1F30D}',
  resiliencia: '\u{1F6E1}\uFE0F',
};

const categoryColors: Record<string, string> = {
  tecnologia: 'bg-blue-100 text-blue-700',
  liderazgo: 'bg-pink-100 text-pink-700',
  marketing: 'bg-green-100 text-green-700',
  finanzas: 'bg-emerald-100 text-emerald-700',
  innovacion: 'bg-yellow-100 text-yellow-700',
  impacto: 'bg-orange-100 text-orange-700',
  resiliencia: 'bg-purple-100 text-purple-700',
};

export default function StarEmpirePage() {
  const [stats, setStats] = useState<StarEmpireStats | null>(null);
  const [popularCompanies, setPopularCompanies] = useState<PopularCompany[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [categoryDistribution, setCategoryDistribution] = useState<CategoryCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      const [
        companiesResult,
        lessonsResult,
        studentsResult,
        companyProgressResult,
        recentLessonViewsResult,
        recentCompanyProgressResult,
      ] = await Promise.all([
        supabaseStarEmpire.from('companies').select('id, title, slug, founder, cover_url, total_lessons, total_inspired, total_game_changers, total_saves, is_published, tags, created_at'),
        supabaseStarEmpire.from('lessons').select('id, company_id, title, category_type, inspired_count, game_changer_count, save_count, view_count, duration_seconds'),
        supabaseStarEmpire.from('students').select('id, first_name, last_name, current_streak'),
        supabaseStarEmpire.from('company_progress').select('id, student_id, company_id, status, progress_percent'),
        supabaseStarEmpire.from('lesson_views').select('id, student_id, lesson_id, completed, viewed_at').order('viewed_at', { ascending: false }).limit(5),
        supabaseStarEmpire.from('company_progress').select('id, student_id, company_id, status, progress_percent, created_at').order('created_at', { ascending: false }).limit(5),
      ]);

      const companies = companiesResult.data || [];
      const lessons = lessonsResult.data || [];
      const students = studentsResult.data || [];
      const companyProgress = companyProgressResult.data || [];

      // Calculate stats
      const publishedCompanies = companies.filter((b) => b.is_published).length;
      const totalLessonViews = lessons.reduce((sum, i) => sum + (i.view_count || 0), 0);
      const activeReaders = new Set(companyProgress.filter((bp) => bp.status === 'in_progress').map((bp) => bp.student_id)).size;
      const totalReactions = lessons.reduce((sum, i) => sum + (i.inspired_count || 0) + (i.game_changer_count || 0), 0);

      setStats({
        totalCompanies: companies.length,
        publishedCompanies,
        totalLessons: lessons.length,
        totalLessonViews,
        totalStudents: students.length,
        activeReaders,
        totalReactions,
      });

      // Popular companies: top 5 by total_inspired
      const popular = companies
        .sort((a, b) => (b.total_inspired || 0) - (a.total_inspired || 0))
        .slice(0, 5)
        .map((b) => ({
          id: b.id,
          title: b.title,
          founder: b.founder,
          total_lessons: b.total_lessons || 0,
          total_inspired: b.total_inspired || 0,
        }));
      setPopularCompanies(popular);

      // Category distribution
      const catMap: Record<string, number> = {};
      lessons.forEach((i) => {
        if (i.category_type) {
          catMap[i.category_type] = (catMap[i.category_type] || 0) + 1;
        }
      });
      setCategoryDistribution(
        Object.entries(catMap).map(([category_type, count]) => ({ category_type, count }))
          .sort((a, b) => b.count - a.count)
      );

      // Recent activity
      const activities: RecentActivity[] = [];

      (recentLessonViewsResult.data || []).forEach((iv) => {
        activities.push({
          id: `view-${iv.id}`,
          type: 'lesson_view',
          description: `Leccion vista${iv.completed ? ' (completada)' : ''}`,
          timestamp: iv.viewed_at,
          icon: '\u{1F3E2}',
          color: 'bg-yellow-100',
        });
      });

      (recentCompanyProgressResult.data || []).forEach((bp) => {
        activities.push({
          id: `progress-${bp.id}`,
          type: 'company_progress',
          description: `Progreso de empresa: ${bp.progress_percent || 0}% - ${bp.status}`,
          timestamp: bp.created_at,
          icon: '\u{1F680}',
          color: 'bg-blue-100',
        });
      });

      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivity(activities.slice(0, 10));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const kpiCards = [
    {
      label: 'Total Empresas',
      value: stats?.totalCompanies || 0,
      detail: `${stats?.publishedCompanies || 0} publicadas`,
      icon: '\u{1F3E2}',
      color: 'bg-blue-100 text-blue-600',
    },
    {
      label: 'Lecciones Totales',
      value: stats?.totalLessons || 0,
      detail: `${formatNumber(stats?.totalLessonViews || 0)} visualizaciones`,
      icon: '\u{1F4DA}',
      color: 'bg-yellow-100 text-yellow-600',
    },
    {
      label: 'Estudiantes',
      value: stats?.totalStudents || 0,
      detail: `${stats?.activeReaders || 0} activos`,
      icon: '\u{1F468}\u200D\u{1F393}',
      color: 'bg-purple-100 text-purple-600',
    },
    {
      label: 'Reacciones',
      value: stats?.totalReactions || 0,
      detail: `${formatNumber(stats?.totalLessonViews || 0)} visualizaciones`,
      icon: '\u2764\uFE0F',
      color: 'bg-red-100 text-red-600',
    },
  ];

  const contentCards = [
    { label: 'Empresas', value: stats?.totalCompanies || 0, icon: '\u{1F3E2}' },
    { label: 'Lecciones', value: stats?.totalLessons || 0, icon: '\u{1F4DA}' },
    { label: 'Reacciones', value: stats?.totalReactions || 0, icon: '\u2764\uFE0F' },
    { label: 'Estudiantes', value: stats?.totalStudents || 0, icon: '\u{1F468}\u200D\u{1F393}' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-surface-900">StarEmpire</h1>
            <Badge variant="purple">Mini App</Badge>
          </div>
          <p className="text-surface-500 mt-1">
            Plataforma de aprendizaje empresarial por lecciones
          </p>
        </div>
        <Link
          href="/starempire/empresas/nuevo"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva Empresa
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, index) => (
          <Card key={index}>
            <CardContent className="py-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-surface-500">{kpi.label}</p>
                  <p className="text-2xl font-bold text-surface-900 mt-1">
                    {typeof kpi.value === 'number' ? formatNumber(kpi.value) : kpi.value}
                  </p>
                  <p className="text-xs text-surface-400 mt-1">{kpi.detail}</p>
                </div>
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${kpi.color} text-2xl`}>
                  {kpi.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Contenido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {contentCards.map((card, index) => (
              <div key={index} className="text-center p-4 bg-surface-50 rounded-xl">
                <span className="text-2xl">{card.icon}</span>
                <p className="text-2xl font-bold text-surface-900 mt-2">{formatNumber(card.value)}</p>
                <p className="text-sm text-surface-500">{card.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Two columns: Popular Companies + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Companies */}
        <Card>
          <CardHeader>
            <CardTitle>Empresas Populares</CardTitle>
          </CardHeader>
          <CardContent>
            {popularCompanies.length === 0 ? (
              <p className="text-surface-400 text-sm text-center py-8">Sin datos de empresas aun</p>
            ) : (
              <div className="space-y-3">
                {popularCompanies.map((company, index) => (
                  <div key={company.id} className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl">
                    <span className="text-lg font-bold text-surface-300 w-6 text-center">{index + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-surface-900 truncate">{company.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-surface-400">{company.founder}</span>
                        <span className="text-xs text-surface-400">
                          {company.total_lessons} lecciones
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-surface-900">{formatNumber(company.total_inspired)}</p>
                      <p className="text-[10px] text-surface-400">inspired</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-surface-400 text-sm text-center py-8">Sin actividad reciente</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg ${activity.color} flex items-center justify-center text-base flex-shrink-0`}>
                      {activity.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-surface-700 line-clamp-1">{activity.description}</p>
                      <p className="text-xs text-surface-400 mt-0.5">{formatDate(activity.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Distribucion por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            {CATEGORY_TYPES.map((cat) => {
              const count = categoryDistribution.find((i) => i.category_type === cat.value)?.count || 0;
              return (
                <div
                  key={cat.value}
                  className={`p-4 rounded-xl text-center ${categoryColors[cat.value] || 'bg-surface-50'}`}
                >
                  <span className="text-2xl">{categoryIcons[cat.value] || '\u{1F4C2}'}</span>
                  <p className="text-xl font-bold mt-2">{count}</p>
                  <p className="text-xs font-medium mt-0.5">{cat.label}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Accesos Rapidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/starempire/empresas"
              className="flex items-start gap-4 p-4 bg-surface-50 rounded-xl hover:bg-surface-100 transition-colors group"
            >
              <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-surface-900">Gestionar Empresas</p>
                <p className="text-sm text-surface-500">Crear, editar y organizar empresas y lecciones</p>
              </div>
            </Link>
            <Link
              href="/starempire/empresas/nuevo"
              className="flex items-start gap-4 p-4 bg-surface-50 rounded-xl hover:bg-surface-100 transition-colors group"
            >
              <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-surface-900">Crear Nueva Empresa</p>
                <p className="text-sm text-surface-500">Iniciar la creacion de una nueva empresa</p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
