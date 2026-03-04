'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseStarGenius } from '@/lib/supabase/stargenius-client';
import { Card, CardHeader, CardTitle, CardContent, Badge, Spinner } from '@/components/ui';
import { formatNumber, formatDate, INTELLIGENCE_TYPES } from '@/lib/utils';

interface StarGeniusStats {
  totalGeniuses: number;
  publishedGeniuses: number;
  totalLessons: number;
  totalLessonViews: number;
  totalStudents: number;
  activeReaders: number;
  totalReactions: number;
}

interface PopularGenius {
  id: string;
  name: string;
  field: string;
  total_lessons: number;
  total_genius: number;
}

interface RecentActivity {
  id: string;
  type: 'lesson_view' | 'genius_progress';
  description: string;
  timestamp: string;
  icon: string;
  color: string;
}

interface IntelligenceCount {
  intelligence_type: string;
  count: number;
}

const intelligenceIcons: Record<string, string> = {
  mental: '🧠',
  emocional: '💖',
  social: '🤝',
  financiera: '💰',
  creativa: '🎨',
  fisica: '💪',
  espiritual: '🧘',
};

const intelligenceColors: Record<string, string> = {
  mental: 'bg-blue-100 text-blue-700',
  emocional: 'bg-pink-100 text-pink-700',
  social: 'bg-green-100 text-green-700',
  financiera: 'bg-emerald-100 text-emerald-700',
  creativa: 'bg-yellow-100 text-yellow-700',
  fisica: 'bg-orange-100 text-orange-700',
  espiritual: 'bg-purple-100 text-purple-700',
};

export default function StarGeniusPage() {
  const [stats, setStats] = useState<StarGeniusStats | null>(null);
  const [popularGeniuses, setPopularGeniuses] = useState<PopularGenius[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [intelligenceDistribution, setIntelligenceDistribution] = useState<IntelligenceCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      const [
        geniusesResult,
        lessonsResult,
        studentsResult,
        geniusProgressResult,
        recentLessonViewsResult,
        recentGeniusProgressResult,
      ] = await Promise.all([
        supabaseStarGenius.from('geniuses').select('id, name, slug, field, portrait_url, total_lessons, total_genius, total_inspired, total_saves, is_published, tags, created_at'),
        supabaseStarGenius.from('lessons').select('id, genius_id, title, intelligence_type, illuminated_count, fire_count, save_count, view_count, duration_seconds'),
        supabaseStarGenius.from('students').select('id, first_name, last_name, current_streak'),
        supabaseStarGenius.from('genius_progress').select('id, student_id, genius_id, status, progress_percent'),
        supabaseStarGenius.from('lesson_views').select('id, student_id, lesson_id, completed, viewed_at').order('viewed_at', { ascending: false }).limit(5),
        supabaseStarGenius.from('genius_progress').select('id, student_id, genius_id, status, progress_percent, created_at').order('created_at', { ascending: false }).limit(5),
      ]);

      const geniuses = geniusesResult.data || [];
      const lessons = lessonsResult.data || [];
      const students = studentsResult.data || [];
      const geniusProgress = geniusProgressResult.data || [];

      // Calculate stats
      const publishedGeniuses = geniuses.filter((g) => g.is_published).length;
      const totalLessonViews = lessons.reduce((sum, l) => sum + (l.view_count || 0), 0);
      const activeReaders = new Set(geniusProgress.filter((gp) => gp.status === 'in_progress').map((gp) => gp.student_id)).size;
      const totalReactions = lessons.reduce((sum, l) => sum + (l.illuminated_count || 0) + (l.fire_count || 0), 0);

      setStats({
        totalGeniuses: geniuses.length,
        publishedGeniuses,
        totalLessons: lessons.length,
        totalLessonViews,
        totalStudents: students.length,
        activeReaders,
        totalReactions,
      });

      // Popular geniuses: top 5 by total_genius
      const popular = geniuses
        .sort((a, b) => (b.total_genius || 0) - (a.total_genius || 0))
        .slice(0, 5)
        .map((g) => ({
          id: g.id,
          name: g.name,
          field: g.field,
          total_lessons: g.total_lessons || 0,
          total_genius: g.total_genius || 0,
        }));
      setPopularGeniuses(popular);

      // Intelligence distribution
      const intMap: Record<string, number> = {};
      lessons.forEach((l) => {
        if (l.intelligence_type) {
          intMap[l.intelligence_type] = (intMap[l.intelligence_type] || 0) + 1;
        }
      });
      setIntelligenceDistribution(
        Object.entries(intMap).map(([intelligence_type, count]) => ({ intelligence_type, count }))
          .sort((a, b) => b.count - a.count)
      );

      // Recent activity
      const activities: RecentActivity[] = [];

      (recentLessonViewsResult.data || []).forEach((lv) => {
        activities.push({
          id: `view-${lv.id}`,
          type: 'lesson_view',
          description: `Leccion vista${lv.completed ? ' (completada)' : ''}`,
          timestamp: lv.viewed_at,
          icon: '💡',
          color: 'bg-yellow-100',
        });
      });

      (recentGeniusProgressResult.data || []).forEach((gp) => {
        activities.push({
          id: `progress-${gp.id}`,
          type: 'genius_progress',
          description: `Progreso de genio: ${gp.progress_percent || 0}% - ${gp.status}`,
          timestamp: gp.created_at,
          icon: '🧠',
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
      label: 'Total Genios',
      value: stats?.totalGeniuses || 0,
      detail: `${stats?.publishedGeniuses || 0} publicados`,
      icon: '🧠',
      color: 'bg-blue-100 text-blue-600',
    },
    {
      label: 'Lecciones Totales',
      value: stats?.totalLessons || 0,
      detail: `${formatNumber(stats?.totalLessonViews || 0)} visualizaciones`,
      icon: '💡',
      color: 'bg-yellow-100 text-yellow-600',
    },
    {
      label: 'Estudiantes',
      value: stats?.totalStudents || 0,
      detail: `${stats?.activeReaders || 0} lectores activos`,
      icon: '👨‍🎓',
      color: 'bg-purple-100 text-purple-600',
    },
    {
      label: 'Reacciones',
      value: stats?.totalReactions || 0,
      detail: `${formatNumber(stats?.totalLessonViews || 0)} visualizaciones`,
      icon: '❤️',
      color: 'bg-red-100 text-red-600',
    },
  ];

  const contentCards = [
    { label: 'Genios', value: stats?.totalGeniuses || 0, icon: '🧠' },
    { label: 'Lecciones', value: stats?.totalLessons || 0, icon: '💡' },
    { label: 'Reacciones', value: stats?.totalReactions || 0, icon: '❤️' },
    { label: 'Estudiantes', value: stats?.totalStudents || 0, icon: '👨‍🎓' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-surface-900">StarGenius</h1>
            <Badge variant="purple">Mini App</Badge>
          </div>
          <p className="text-surface-500 mt-1">
            Gestion de contenido de personas ilustres
          </p>
        </div>
        <Link
          href="/stargenius/genios/nuevo"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Genio
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

      {/* Two columns: Popular Geniuses + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Geniuses */}
        <Card>
          <CardHeader>
            <CardTitle>Genios Populares</CardTitle>
          </CardHeader>
          <CardContent>
            {popularGeniuses.length === 0 ? (
              <p className="text-surface-400 text-sm text-center py-8">Sin datos de genios aun</p>
            ) : (
              <div className="space-y-3">
                {popularGeniuses.map((genius, index) => (
                  <div key={genius.id} className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl">
                    <span className="text-lg font-bold text-surface-300 w-6 text-center">{index + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-surface-900 truncate">{genius.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-surface-400">{genius.field}</span>
                        <span className="text-xs text-surface-400">
                          {genius.total_lessons} lecciones
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-surface-900">{formatNumber(genius.total_genius)}</p>
                      <p className="text-[10px] text-surface-400">genius</p>
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

      {/* Intelligence Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Distribucion por Inteligencia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            {INTELLIGENCE_TYPES.map((intel) => {
              const count = intelligenceDistribution.find((i) => i.intelligence_type === intel.value)?.count || 0;
              return (
                <div
                  key={intel.value}
                  className={`p-4 rounded-xl text-center ${intelligenceColors[intel.value] || 'bg-surface-50'}`}
                >
                  <span className="text-2xl">{intelligenceIcons[intel.value] || '📂'}</span>
                  <p className="text-xl font-bold mt-2">{count}</p>
                  <p className="text-xs font-medium mt-0.5">{intel.label}</p>
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
              href="/stargenius/genios"
              className="flex items-start gap-4 p-4 bg-surface-50 rounded-xl hover:bg-surface-100 transition-colors group"
            >
              <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-surface-900">Ver todos los genios</p>
                <p className="text-sm text-surface-500">Gestionar genios y lecciones</p>
              </div>
            </Link>
            <Link
              href="/stargenius/genios/nuevo"
              className="flex items-start gap-4 p-4 bg-surface-50 rounded-xl hover:bg-surface-100 transition-colors group"
            >
              <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-surface-900">Crear genio</p>
                <p className="text-sm text-surface-500">Agregar una nueva persona ilustre</p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
