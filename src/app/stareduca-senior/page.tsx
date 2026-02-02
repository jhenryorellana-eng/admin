'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseSenior } from '@/lib/supabase/senior-client';
import { Card, CardHeader, CardTitle, CardContent, Badge, Spinner } from '@/components/ui';
import { formatNumber } from '@/lib/utils';

interface StarEducaSeniorStats {
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  totalChapters: number;
  totalMaterials: number;
  totalEvaluations: number;
}

export default function StarEducaSeniorPage() {
  const [stats, setStats] = useState<StarEducaSeniorStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [
          coursesResult,
          chaptersResult,
          materialsResult,
          evaluationsResult,
        ] = await Promise.all([
          supabaseSenior.from('courses').select('id, is_published'),
          supabaseSenior.from('chapters').select('id', { count: 'exact' }),
          supabaseSenior.from('materials').select('id', { count: 'exact' }),
          supabaseSenior.from('evaluations').select('id', { count: 'exact' }),
        ]);

        const courses = coursesResult.data || [];

        setStats({
          totalCourses: courses.length,
          publishedCourses: courses.filter((c) => c.is_published).length,
          draftCourses: courses.filter((c) => !c.is_published).length,
          totalChapters: chaptersResult.count || 0,
          totalMaterials: materialsResult.count || 0,
          totalEvaluations: evaluationsResult.count || 0,
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
      color: 'bg-pink-100 text-pink-600',
    },
    {
      label: 'Capítulos',
      value: stats?.totalChapters || 0,
      detail: 'Total de capítulos',
      icon: '🎬',
      color: 'bg-purple-100 text-purple-600',
    },
    {
      label: 'Materiales',
      value: stats?.totalMaterials || 0,
      detail: 'Videos, PDFs, imágenes',
      icon: '📁',
      color: 'bg-blue-100 text-blue-600',
    },
    {
      label: 'Evaluaciones',
      value: stats?.totalEvaluations || 0,
      detail: 'Exámenes configurados',
      icon: '📝',
      color: 'bg-green-100 text-green-600',
    },
  ];

  const quickLinks = [
    {
      title: 'Gestionar Cursos',
      description: 'Crear, editar y organizar cursos para padres',
      href: '/stareduca-senior/cursos',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      title: 'Crear Nuevo Curso',
      description: 'Iniciar la creación de un nuevo curso',
      href: '/stareduca-senior/cursos/nuevo',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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
            <h1 className="text-2xl font-bold text-surface-900">StarEduca Senior</h1>
            <Badge variant="info">Mini App</Badge>
          </div>
          <p className="text-surface-500 mt-1">
            Plataforma educativa para padres de familia
          </p>
        </div>
        <Link
          href="/stareduca-senior/cursos/nuevo"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Curso
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
