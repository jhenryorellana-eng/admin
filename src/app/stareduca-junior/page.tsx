'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent, Badge, Spinner } from '@/components/ui';
import { formatNumber } from '@/lib/utils';

interface StarEducaStats {
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  totalLessons: number;
  totalExams: number;
  totalBadges: number;
  studentsWithStreak: number;
  totalStudents: number;
}

export default function StarEducaJuniorPage() {
  const [stats, setStats] = useState<StarEducaStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [
          coursesResult,
          lessonsResult,
          examsResult,
          badgesResult,
          studentsResult,
        ] = await Promise.all([
          supabase.from('courses').select('id, is_published'),
          supabase.from('lessons').select('id', { count: 'exact' }),
          supabase.from('exams').select('id', { count: 'exact' }),
          supabase.from('badges').select('id', { count: 'exact' }),
          supabase.from('students').select('id, current_streak'),
        ]);

        const courses = coursesResult.data || [];
        const students = studentsResult.data || [];

        setStats({
          totalCourses: courses.length,
          publishedCourses: courses.filter((c) => c.is_published).length,
          draftCourses: courses.filter((c) => !c.is_published).length,
          totalLessons: lessonsResult.count || 0,
          totalExams: examsResult.count || 0,
          totalBadges: badgesResult.count || 0,
          studentsWithStreak: students.filter((s) => s.current_streak > 0).length,
          totalStudents: students.length,
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

  const statCards = [
    {
      label: 'Cursos',
      value: stats?.totalCourses || 0,
      detail: `${stats?.publishedCourses || 0} publicados, ${stats?.draftCourses || 0} borradores`,
      icon: '📚',
      color: 'bg-purple-100 text-purple-600',
    },
    {
      label: 'Lecciones',
      value: stats?.totalLessons || 0,
      detail: 'Total de lecciones',
      icon: '🎬',
      color: 'bg-blue-100 text-blue-600',
    },
    {
      label: 'Exámenes',
      value: stats?.totalExams || 0,
      detail: 'Exámenes activos',
      icon: '📝',
      color: 'bg-green-100 text-green-600',
    },
    {
      label: 'Badges',
      value: stats?.totalBadges || 0,
      detail: 'Insignias configuradas',
      icon: '🏆',
      color: 'bg-yellow-100 text-yellow-600',
    },
    {
      label: 'Estudiantes',
      value: stats?.totalStudents || 0,
      detail: `${stats?.studentsWithStreak || 0} con racha activa`,
      icon: '👨‍🎓',
      color: 'bg-pink-100 text-pink-600',
    },
  ];

  const quickLinks = [
    {
      title: 'Gestionar Cursos',
      description: 'Crear, editar y organizar cursos, módulos y lecciones',
      href: '/stareduca-junior/cursos',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      title: 'Gestionar Badges',
      description: 'Configurar insignias y criterios de obtención',
      href: '/stareduca-junior/badges',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
    },
    {
      title: 'Configuración XP',
      description: 'Ajustar puntos de experiencia por acción',
      href: '/stareduca-junior/xp-config',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      title: 'Ver Estudiantes',
      description: 'Consultar progreso y estadísticas de estudiantes',
      href: '/stareduca-junior/estudiantes',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-surface-900">StarEduca Junior</h1>
            <Badge variant="purple">Mini App</Badge>
          </div>
          <p className="text-surface-500 mt-1">
            Plataforma educativa para adolescentes (13-17 años)
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardContent className="text-center py-4">
              <div
                className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${stat.color} text-2xl mb-3`}
              >
                {stat.icon}
              </div>
              <p className="text-2xl font-bold text-surface-900">
                {formatNumber(stat.value)}
              </p>
              <p className="text-sm font-medium text-surface-700">{stat.label}</p>
              <p className="text-xs text-surface-400 mt-1">{stat.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Accesos Rápidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickLinks.map((link, index) => (
              <Link
                key={index}
                href={link.href}
                className="flex items-start gap-4 p-4 bg-surface-50 rounded-xl hover:bg-surface-100 transition-colors group"
              >
                <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  {link.icon}
                </div>
                <div>
                  <p className="font-semibold text-surface-900">{link.title}</p>
                  <p className="text-sm text-surface-500">{link.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
