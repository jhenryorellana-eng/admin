'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent, Badge, Spinner } from '@/components/ui';
import { formatNumber } from '@/lib/utils';

interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  totalCourses: number;
  publishedCourses: number;
  totalXpAwarded: number;
  totalPosts: number;
  totalEnrollments: number;
  avgCourseProgress: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch all stats in parallel
        const [
          studentsResult,
          coursesResult,
          xpResult,
          postsResult,
          enrollmentsResult,
        ] = await Promise.all([
          supabase.from('students').select('id, last_activity_date', { count: 'exact' }),
          supabase.from('courses').select('id, is_published', { count: 'exact' }),
          supabase.from('xp_transactions').select('amount'),
          supabase.from('posts').select('id', { count: 'exact' }),
          supabase.from('enrollments').select('progress_percent'),
        ]);

        // Calculate active students (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const activeStudents = studentsResult.data?.filter(
          (s) => s.last_activity_date && new Date(s.last_activity_date) > sevenDaysAgo
        ).length || 0;

        // Calculate published courses
        const publishedCourses = coursesResult.data?.filter((c) => c.is_published).length || 0;

        // Calculate total XP
        const totalXp = xpResult.data?.reduce((sum, t) => sum + t.amount, 0) || 0;

        // Calculate average progress
        const avgProgress = enrollmentsResult.data?.length
          ? Math.round(
              enrollmentsResult.data.reduce((sum, e) => sum + e.progress_percent, 0) /
                enrollmentsResult.data.length
            )
          : 0;

        setStats({
          totalStudents: studentsResult.count || 0,
          activeStudents,
          totalCourses: coursesResult.count || 0,
          publishedCourses,
          totalXpAwarded: totalXp,
          totalPosts: postsResult.count || 0,
          totalEnrollments: enrollmentsResult.data?.length || 0,
          avgCourseProgress: avgProgress,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const kpis = [
    {
      label: 'Total Estudiantes',
      value: formatNumber(stats?.totalStudents || 0),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      color: 'bg-blue-500',
    },
    {
      label: 'Estudiantes Activos',
      value: formatNumber(stats?.activeStudents || 0),
      subtitle: 'Últimos 7 días',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      color: 'bg-green-500',
    },
    {
      label: 'Cursos Publicados',
      value: `${stats?.publishedCourses || 0} / ${stats?.totalCourses || 0}`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      color: 'bg-purple-500',
    },
    {
      label: 'XP Total Otorgado',
      value: formatNumber(stats?.totalXpAwarded || 0),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      color: 'bg-yellow-500',
    },
    {
      label: 'Posts Comunidad',
      value: formatNumber(stats?.totalPosts || 0),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      color: 'bg-pink-500',
    },
    {
      label: 'Progreso Promedio',
      value: `${stats?.avgCourseProgress || 0}%`,
      subtitle: 'En cursos',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'bg-cyan-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Dashboard</h1>
          <p className="text-surface-500 mt-1">Vista general de Starbiz Academy</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi, index) => (
          <Card key={index}>
            <CardContent className="flex items-start gap-4">
              <div className={`${kpi.color} p-3 rounded-xl text-white`}>
                {kpi.icon}
              </div>
              <div>
                <p className="text-sm text-surface-500">{kpi.label}</p>
                <p className="text-2xl font-bold text-surface-900 mt-1">{kpi.value}</p>
                {kpi.subtitle && (
                  <p className="text-xs text-surface-400 mt-1">{kpi.subtitle}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* StarEduca Junior Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>StarEduca Junior</CardTitle>
              <Badge variant="purple">Mini App</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-surface-500 mb-4">
              Gestiona cursos, badges, configuración de XP y estudiantes.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/stareduca-junior/cursos"
                className="flex items-center gap-2 p-3 bg-surface-50 rounded-lg hover:bg-surface-100 transition-colors"
              >
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span className="text-sm font-medium text-surface-700">Cursos</span>
              </Link>
              <Link
                href="/stareduca-junior/badges"
                className="flex items-center gap-2 p-3 bg-surface-50 rounded-lg hover:bg-surface-100 transition-colors"
              >
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                <span className="text-sm font-medium text-surface-700">Badges</span>
              </Link>
              <Link
                href="/stareduca-junior/xp-config"
                className="flex items-center gap-2 p-3 bg-surface-50 rounded-lg hover:bg-surface-100 transition-colors"
              >
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-sm font-medium text-surface-700">Config XP</span>
              </Link>
              <Link
                href="/stareduca-junior/estudiantes"
                className="flex items-center gap-2 p-3 bg-surface-50 rounded-lg hover:bg-surface-100 transition-colors"
              >
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="text-sm font-medium text-surface-700">Estudiantes</span>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Coming Soon Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Próximas Mini Apps</CardTitle>
              <Badge variant="default">Próximamente</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-surface-500 mb-4">
              Más mini apps estarán disponibles para administrar pronto.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-lg opacity-50">
                <div className="w-10 h-10 bg-accent-pink/10 rounded-lg flex items-center justify-center">
                  <span className="text-xl">📚</span>
                </div>
                <div>
                  <p className="font-medium text-surface-700">StarEduca Senior</p>
                  <p className="text-xs text-surface-400">Cursos para padres</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-lg opacity-50">
                <div className="w-10 h-10 bg-accent-cyan/10 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🎙️</span>
                </div>
                <div>
                  <p className="font-medium text-surface-700">StarVoices</p>
                  <p className="text-xs text-surface-400">Podcasts educativos</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-lg opacity-50">
                <div className="w-10 h-10 bg-accent-yellow/10 rounded-lg flex items-center justify-center">
                  <span className="text-xl">📖</span>
                </div>
                <div>
                  <p className="font-medium text-surface-700">StarBooks</p>
                  <p className="text-xs text-surface-400">Micro-learning</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
