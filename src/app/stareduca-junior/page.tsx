'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent, Badge, Spinner } from '@/components/ui';
import { formatNumber, formatDate, COURSE_CATEGORIES } from '@/lib/utils';

interface JuniorStats {
  totalStudents: number;
  studentsWithStreak: number;
  activeEnrollments: number;
  completedEnrollments: number;
  totalEnrollments: number;
  completionRate: number;
  totalPosts: number;
  postsThisWeek: number;
  totalXp: number;
  avgStreak: number;
  totalReactions: number;
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  totalLessons: number;
  totalExams: number;
  totalBadges: number;
}

interface PopularCourse {
  id: string;
  title: string;
  category: string;
  is_published: boolean;
  enrollmentCount: number;
  completedCount: number;
}

interface RecentActivity {
  id: string;
  type: 'enrollment' | 'xp' | 'post' | 'exam';
  description: string;
  timestamp: string;
  icon: string;
  color: string;
}

interface CategoryCount {
  category: string;
  count: number;
}

const categoryIcons: Record<string, string> = {
  finanzas: '💰',
  emprendimiento: '🚀',
  liderazgo: '👑',
  tecnologia: '💻',
  creatividad: '🎨',
  comunicacion: '🗣️',
};

const categoryColors: Record<string, string> = {
  finanzas: 'bg-emerald-100 text-emerald-700',
  emprendimiento: 'bg-orange-100 text-orange-700',
  liderazgo: 'bg-amber-100 text-amber-700',
  tecnologia: 'bg-blue-100 text-blue-700',
  creatividad: 'bg-pink-100 text-pink-700',
  comunicacion: 'bg-violet-100 text-violet-700',
};

export default function StarEducaJuniorPage() {
  const [stats, setStats] = useState<JuniorStats | null>(null);
  const [popularCourses, setPopularCourses] = useState<PopularCourse[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [categoryDistribution, setCategoryDistribution] = useState<CategoryCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      const [
        studentsResult,
        enrollmentsResult,
        coursesResult,
        lessonsResult,
        examsResult,
        badgesResult,
        postsResult,
        xpResult,
        recentEnrollmentsResult,
        recentPostsResult,
        recentXpResult,
      ] = await Promise.all([
        supabase.from('students').select('id, current_streak'),
        supabase.from('enrollments').select('id, status, course_id, created_at'),
        supabase.from('courses').select('id, title, category, is_published'),
        supabase.from('lessons').select('id', { count: 'exact' }),
        supabase.from('exams').select('id', { count: 'exact' }),
        supabase.from('badges').select('id', { count: 'exact' }),
        supabase.from('posts').select('id, created_at, reaction_count'),
        supabase.from('xp_transactions').select('amount'),
        supabase.from('enrollments').select('id, course_id, status, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('posts').select('id, content, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('xp_transactions').select('id, amount, reason, created_at').order('created_at', { ascending: false }).limit(5),
      ]);

      const students = studentsResult.data || [];
      const enrollments = enrollmentsResult.data || [];
      const courses = coursesResult.data || [];
      const posts = postsResult.data || [];
      const xpTransactions = xpResult.data || [];

      // Calculate stats
      const activeEnrollments = enrollments.filter((e) => e.status === 'active').length;
      const completedEnrollments = enrollments.filter((e) => e.status === 'completed').length;
      const totalEnrollments = enrollments.length;
      const completionRate = totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0;

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const postsThisWeek = posts.filter((p) => new Date(p.created_at) >= weekAgo).length;

      const totalXp = xpTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
      const avgStreak = students.length > 0
        ? Math.round(students.reduce((sum, s) => sum + (s.current_streak || 0), 0) / students.length * 10) / 10
        : 0;
      const totalReactions = posts.reduce((sum, p) => sum + (p.reaction_count || 0), 0);

      setStats({
        totalStudents: students.length,
        studentsWithStreak: students.filter((s) => s.current_streak > 0).length,
        activeEnrollments,
        completedEnrollments,
        totalEnrollments,
        completionRate,
        totalPosts: posts.length,
        postsThisWeek,
        totalXp,
        avgStreak,
        totalReactions,
        totalCourses: courses.length,
        publishedCourses: courses.filter((c) => c.is_published).length,
        draftCourses: courses.filter((c) => !c.is_published).length,
        totalLessons: lessonsResult.count || 0,
        totalExams: examsResult.count || 0,
        totalBadges: badgesResult.count || 0,
      });

      // Popular courses: count enrollments per course
      const courseEnrollmentMap: Record<string, { total: number; completed: number }> = {};
      enrollments.forEach((e) => {
        if (!courseEnrollmentMap[e.course_id]) {
          courseEnrollmentMap[e.course_id] = { total: 0, completed: 0 };
        }
        courseEnrollmentMap[e.course_id].total++;
        if (e.status === 'completed') courseEnrollmentMap[e.course_id].completed++;
      });

      const popular = courses
        .map((c) => ({
          id: c.id,
          title: c.title,
          category: c.category,
          is_published: c.is_published,
          enrollmentCount: courseEnrollmentMap[c.id]?.total || 0,
          completedCount: courseEnrollmentMap[c.id]?.completed || 0,
        }))
        .sort((a, b) => b.enrollmentCount - a.enrollmentCount)
        .slice(0, 5);
      setPopularCourses(popular);

      // Category distribution
      const catMap: Record<string, number> = {};
      courses.forEach((c) => {
        catMap[c.category] = (catMap[c.category] || 0) + 1;
      });
      setCategoryDistribution(
        Object.entries(catMap).map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count)
      );

      // Recent activity
      const activities: RecentActivity[] = [];

      (recentEnrollmentsResult.data || []).forEach((e) => {
        activities.push({
          id: `enroll-${e.id}`,
          type: 'enrollment',
          description: `Nueva inscripcion a curso`,
          timestamp: e.created_at,
          icon: '📖',
          color: 'bg-blue-100',
        });
      });

      (recentPostsResult.data || []).forEach((p) => {
        activities.push({
          id: `post-${p.id}`,
          type: 'post',
          description: `Nuevo post: "${(p.content || '').slice(0, 50)}${(p.content || '').length > 50 ? '...' : ''}"`,
          timestamp: p.created_at,
          icon: '💬',
          color: 'bg-green-100',
        });
      });

      (recentXpResult.data || []).forEach((x) => {
        activities.push({
          id: `xp-${x.id}`,
          type: 'xp',
          description: `+${x.amount} XP por ${x.reason}`,
          timestamp: x.created_at,
          icon: '⚡',
          color: 'bg-yellow-100',
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
      label: 'Estudiantes',
      value: stats?.totalStudents || 0,
      detail: `${stats?.studentsWithStreak || 0} con racha activa`,
      icon: '👨‍🎓',
      color: 'bg-purple-100 text-purple-600',
    },
    {
      label: 'Inscripciones Activas',
      value: stats?.activeEnrollments || 0,
      detail: `${stats?.completedEnrollments || 0} completadas`,
      icon: '📖',
      color: 'bg-blue-100 text-blue-600',
    },
    {
      label: 'Tasa de Completacion',
      value: `${stats?.completionRate || 0}%`,
      detail: `${stats?.completedEnrollments || 0} de ${stats?.totalEnrollments || 0}`,
      icon: '🎯',
      color: 'bg-green-100 text-green-600',
      progress: stats?.completionRate || 0,
    },
    {
      label: 'Comunidad',
      value: stats?.totalPosts || 0,
      detail: `${stats?.postsThisWeek || 0} esta semana`,
      icon: '💬',
      color: 'bg-pink-100 text-pink-600',
    },
  ];

  const engagementCards = [
    {
      label: 'XP Total Otorgado',
      value: formatNumber(stats?.totalXp || 0),
      icon: '⚡',
      color: 'bg-yellow-100 text-yellow-600',
    },
    {
      label: 'Promedio Racha',
      value: `${stats?.avgStreak || 0} dias`,
      icon: '🔥',
      color: 'bg-orange-100 text-orange-600',
    },
    {
      label: 'Reacciones Totales',
      value: formatNumber(stats?.totalReactions || 0),
      icon: '❤️',
      color: 'bg-red-100 text-red-600',
    },
  ];

  const contentCards = [
    { label: 'Cursos', value: stats?.totalCourses || 0, detail: `${stats?.publishedCourses || 0} pub. / ${stats?.draftCourses || 0} borr.`, icon: '📚' },
    { label: 'Lecciones', value: stats?.totalLessons || 0, icon: '🎬' },
    { label: 'Examenes', value: stats?.totalExams || 0, icon: '📝' },
    { label: 'Badges', value: stats?.totalBadges || 0, icon: '🏆' },
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
            Plataforma educativa para adolescentes (13-17 anos)
          </p>
        </div>
        <Link
          href="/stareduca-junior/cursos/nuevo"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Curso
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
              {'progress' in kpi && kpi.progress !== undefined && (
                <div className="mt-3">
                  <div className="w-full h-2 bg-surface-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${kpi.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Engagement KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {engagementCards.map((card, index) => (
          <Card key={index}>
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${card.color} text-2xl`}>
                  {card.icon}
                </div>
                <div>
                  <p className="text-xs font-medium text-surface-500 uppercase tracking-wide">{card.label}</p>
                  <p className="text-xl font-bold text-surface-900">{card.value}</p>
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
                {card.detail && <p className="text-xs text-surface-400 mt-0.5">{card.detail}</p>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Two columns: Popular Courses + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Courses */}
        <Card>
          <CardHeader>
            <CardTitle>Cursos Populares</CardTitle>
          </CardHeader>
          <CardContent>
            {popularCourses.length === 0 ? (
              <p className="text-surface-400 text-sm text-center py-8">Sin datos de inscripciones aun</p>
            ) : (
              <div className="space-y-3">
                {popularCourses.map((course, index) => {
                  const courseCompletionRate = course.enrollmentCount > 0
                    ? Math.round((course.completedCount / course.enrollmentCount) * 100)
                    : 0;
                  const catLabel = COURSE_CATEGORIES.find((c) => c.value === course.category)?.label || course.category;

                  return (
                    <div key={course.id} className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl">
                      <span className="text-lg font-bold text-surface-300 w-6 text-center">{index + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-surface-900 truncate">{course.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${categoryColors[course.category] || 'bg-surface-100 text-surface-600'}`}>
                            {catLabel}
                          </span>
                          <span className="text-xs text-surface-400">
                            {course.enrollmentCount} inscritos
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-surface-900">{courseCompletionRate}%</p>
                        <p className="text-[10px] text-surface-400">completado</p>
                      </div>
                    </div>
                  );
                })}
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
      {categoryDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Distribucion por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {COURSE_CATEGORIES.map((cat) => {
                const count = categoryDistribution.find((c) => c.category === cat.value)?.count || 0;
                return (
                  <div
                    key={cat.value}
                    className={`p-4 rounded-xl text-center ${categoryColors[cat.value] || 'bg-surface-50'}`}
                  >
                    <span className="text-2xl">{categoryIcons[cat.value] || '📂'}</span>
                    <p className="text-xl font-bold mt-2">{count}</p>
                    <p className="text-xs font-medium mt-0.5">{cat.label}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Accesos Rapidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/stareduca-junior/cursos"
              className="flex items-start gap-4 p-4 bg-surface-50 rounded-xl hover:bg-surface-100 transition-colors group"
            >
              <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-surface-900">Gestionar Cursos</p>
                <p className="text-sm text-surface-500">Crear, editar y organizar cursos, modulos y lecciones</p>
              </div>
            </Link>
            <Link
              href="/stareduca-junior/cursos/nuevo"
              className="flex items-start gap-4 p-4 bg-surface-50 rounded-xl hover:bg-surface-100 transition-colors group"
            >
              <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-surface-900">Crear Nuevo Curso</p>
                <p className="text-sm text-surface-500">Iniciar la creacion de un nuevo curso</p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
