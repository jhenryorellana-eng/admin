'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseStarReads } from '@/lib/supabase/starreads-client';
import { Card, CardHeader, CardTitle, CardContent, Badge, Spinner } from '@/components/ui';
import { formatNumber, formatDate, INTELLIGENCE_TYPES } from '@/lib/utils';

interface StarReadsStats {
  totalBooks: number;
  publishedBooks: number;
  totalIdeas: number;
  totalIdeaViews: number;
  totalStudents: number;
  activeReaders: number;
  totalReactions: number;
}

interface PopularBook {
  id: string;
  title: string;
  author: string;
  total_ideas: number;
  total_illuminated: number;
}

interface RecentActivity {
  id: string;
  type: 'idea_view' | 'book_progress';
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

export default function StarReadsPage() {
  const [stats, setStats] = useState<StarReadsStats | null>(null);
  const [popularBooks, setPopularBooks] = useState<PopularBook[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [intelligenceDistribution, setIntelligenceDistribution] = useState<IntelligenceCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      const [
        booksResult,
        ideasResult,
        studentsResult,
        bookProgressResult,
        recentIdeaViewsResult,
        recentBookProgressResult,
      ] = await Promise.all([
        supabaseStarReads.from('books').select('id, title, slug, author, cover_url, total_ideas, total_illuminated, total_fires, total_saves, is_published, tags, created_at'),
        supabaseStarReads.from('ideas').select('id, book_id, title, intelligence_type, illuminated_count, fire_count, save_count, view_count, duration_seconds'),
        supabaseStarReads.from('students').select('id, first_name, last_name, current_streak'),
        supabaseStarReads.from('book_progress').select('id, student_id, book_id, status, progress_percent'),
        supabaseStarReads.from('idea_views').select('id, student_id, idea_id, completed, viewed_at').order('viewed_at', { ascending: false }).limit(5),
        supabaseStarReads.from('book_progress').select('id, student_id, book_id, status, progress_percent, created_at').order('created_at', { ascending: false }).limit(5),
      ]);

      const books = booksResult.data || [];
      const ideas = ideasResult.data || [];
      const students = studentsResult.data || [];
      const bookProgress = bookProgressResult.data || [];

      // Calculate stats
      const publishedBooks = books.filter((b) => b.is_published).length;
      const totalIdeaViews = ideas.reduce((sum, i) => sum + (i.view_count || 0), 0);
      const activeReaders = new Set(bookProgress.filter((bp) => bp.status === 'in_progress').map((bp) => bp.student_id)).size;
      const totalReactions = ideas.reduce((sum, i) => sum + (i.illuminated_count || 0) + (i.fire_count || 0), 0);

      setStats({
        totalBooks: books.length,
        publishedBooks,
        totalIdeas: ideas.length,
        totalIdeaViews,
        totalStudents: students.length,
        activeReaders,
        totalReactions,
      });

      // Popular books: top 5 by total_illuminated
      const popular = books
        .sort((a, b) => (b.total_illuminated || 0) - (a.total_illuminated || 0))
        .slice(0, 5)
        .map((b) => ({
          id: b.id,
          title: b.title,
          author: b.author,
          total_ideas: b.total_ideas || 0,
          total_illuminated: b.total_illuminated || 0,
        }));
      setPopularBooks(popular);

      // Intelligence distribution
      const intMap: Record<string, number> = {};
      ideas.forEach((i) => {
        if (i.intelligence_type) {
          intMap[i.intelligence_type] = (intMap[i.intelligence_type] || 0) + 1;
        }
      });
      setIntelligenceDistribution(
        Object.entries(intMap).map(([intelligence_type, count]) => ({ intelligence_type, count }))
          .sort((a, b) => b.count - a.count)
      );

      // Recent activity
      const activities: RecentActivity[] = [];

      (recentIdeaViewsResult.data || []).forEach((iv) => {
        activities.push({
          id: `view-${iv.id}`,
          type: 'idea_view',
          description: `Idea vista${iv.completed ? ' (completada)' : ''}`,
          timestamp: iv.viewed_at,
          icon: '💡',
          color: 'bg-yellow-100',
        });
      });

      (recentBookProgressResult.data || []).forEach((bp) => {
        activities.push({
          id: `progress-${bp.id}`,
          type: 'book_progress',
          description: `Progreso de libro: ${bp.progress_percent || 0}% - ${bp.status}`,
          timestamp: bp.created_at,
          icon: '📚',
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
      label: 'Total Libros',
      value: stats?.totalBooks || 0,
      detail: `${stats?.publishedBooks || 0} publicados`,
      icon: '📚',
      color: 'bg-blue-100 text-blue-600',
    },
    {
      label: 'Ideas Totales',
      value: stats?.totalIdeas || 0,
      detail: `${formatNumber(stats?.totalIdeaViews || 0)} visualizaciones`,
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
      detail: `${formatNumber(stats?.totalIdeaViews || 0)} visualizaciones`,
      icon: '❤️',
      color: 'bg-red-100 text-red-600',
    },
  ];

  const contentCards = [
    { label: 'Libros', value: stats?.totalBooks || 0, icon: '📚' },
    { label: 'Ideas', value: stats?.totalIdeas || 0, icon: '💡' },
    { label: 'Reacciones', value: stats?.totalReactions || 0, icon: '❤️' },
    { label: 'Estudiantes', value: stats?.totalStudents || 0, icon: '👨‍🎓' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-surface-900">StarReads</h1>
            <Badge variant="purple">Mini App</Badge>
          </div>
          <p className="text-surface-500 mt-1">
            Plataforma de micro-lectura y aprendizaje por ideas
          </p>
        </div>
        <Link
          href="/starreads/libros/nuevo"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Libro
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

      {/* Two columns: Popular Books + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Books */}
        <Card>
          <CardHeader>
            <CardTitle>Libros Populares</CardTitle>
          </CardHeader>
          <CardContent>
            {popularBooks.length === 0 ? (
              <p className="text-surface-400 text-sm text-center py-8">Sin datos de libros aun</p>
            ) : (
              <div className="space-y-3">
                {popularBooks.map((book, index) => (
                  <div key={book.id} className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl">
                    <span className="text-lg font-bold text-surface-300 w-6 text-center">{index + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-surface-900 truncate">{book.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-surface-400">{book.author}</span>
                        <span className="text-xs text-surface-400">
                          {book.total_ideas} ideas
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-surface-900">{formatNumber(book.total_illuminated)}</p>
                      <p className="text-[10px] text-surface-400">illuminated</p>
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
              href="/starreads/libros"
              className="flex items-start gap-4 p-4 bg-surface-50 rounded-xl hover:bg-surface-100 transition-colors group"
            >
              <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-surface-900">Gestionar Libros</p>
                <p className="text-sm text-surface-500">Crear, editar y organizar libros e ideas</p>
              </div>
            </Link>
            <Link
              href="/starreads/libros/nuevo"
              className="flex items-start gap-4 p-4 bg-surface-50 rounded-xl hover:bg-surface-100 transition-colors group"
            >
              <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-surface-900">Crear Nuevo Libro</p>
                <p className="text-sm text-surface-500">Iniciar la creacion de un nuevo libro</p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
