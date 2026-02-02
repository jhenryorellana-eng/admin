'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/client';
import { Tables } from '@/types/database';
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
import { formatDate, COURSE_CATEGORIES } from '@/lib/utils';
import { deleteFileByUrl, isStorageUrl } from '@/lib/supabase/storage';

type Course = Tables<'courses'> & {
  chapters_count?: number;
};

export default function CursosPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { addToast } = useToastStore();
  const { openConfirm } = useConfirmStore();

  useEffect(() => {
    fetchCourses();
  }, []);

  async function fetchCourses() {
    try {
      // Fetch courses
      const { data: coursesData, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch chapter counts (lessons with course_id)
      const { data: chaptersData } = await supabase
        .from('lessons')
        .select('course_id');

      // Map counts to courses
      const coursesWithCounts = (coursesData || []).map((course) => ({
        ...course,
        chapters_count: chaptersData?.filter((c) => c.course_id === course.id).length || 0,
      }));

      setCourses(coursesWithCounts);
    } catch (error) {
      console.error('Error fetching courses:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'No se pudieron cargar los cursos',
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleDelete = (course: Course) => {
    openConfirm(
      'Eliminar curso',
      `¿Estas seguro de que deseas eliminar "${course.title}"? Esta accion no se puede deshacer.`,
      async () => {
        try {
          // Eliminar thumbnail de storage si existe
          if (course.thumbnail_url && isStorageUrl(course.thumbnail_url)) {
            await deleteFileByUrl(course.thumbnail_url);
          }

          const { error } = await supabase.from('courses').delete().eq('id', course.id);
          if (error) throw error;

          setCourses(courses.filter((c) => c.id !== course.id));
          addToast({
            type: 'success',
            title: 'Curso eliminado',
            message: `"${course.title}" ha sido eliminado`,
          });
        } catch (error) {
          console.error('Error deleting course:', error);
          addToast({
            type: 'error',
            title: 'Error',
            message: 'No se pudo eliminar el curso',
          });
        }
      }
    );
  };

  const handleTogglePublish = async (course: Course) => {
    try {
      const { error } = await supabase
        .from('courses')
        .update({ is_published: !course.is_published })
        .eq('id', course.id);

      if (error) throw error;

      setCourses(
        courses.map((c) =>
          c.id === course.id ? { ...c, is_published: !c.is_published } : c
        )
      );
      addToast({
        type: 'success',
        title: course.is_published ? 'Curso despublicado' : 'Curso publicado',
        message: `"${course.title}" ahora está ${course.is_published ? 'en borrador' : 'publicado'}`,
      });
    } catch (error) {
      console.error('Error toggling publish:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'No se pudo cambiar el estado del curso',
      });
    }
  };

  // Filter courses
  const filteredCourses = courses.filter((course) => {
    const matchesSearch = course.title.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || course.category === categoryFilter;
    const matchesStatus =
      !statusFilter ||
      (statusFilter === 'published' && course.is_published) ||
      (statusFilter === 'draft' && !course.is_published);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getCategoryLabel = (category: string) => {
    return COURSE_CATEGORIES.find((c) => c.value === category)?.label || category;
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
          <h1 className="text-2xl font-bold text-surface-900">Cursos</h1>
          <p className="text-surface-500 mt-1">
            Gestiona los cursos de StarEduca Junior
          </p>
        </div>
        <Link href="/stareduca-junior/cursos/nuevo">
          <Button
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            Nuevo Curso
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar por título..."
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
              options={[{ value: '', label: 'Todas las categorías' }, ...COURSE_CATEGORIES]}
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

      {/* Courses Table */}
      {filteredCourses.length === 0 ? (
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
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <p className="mt-4 text-surface-500">No se encontraron cursos</p>
            <Link href="/stareduca-junior/cursos/nuevo">
              <Button variant="primary" className="mt-4">
                Crear primer curso
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Curso</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Capitulos</TableHead>
              <TableHead>XP</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCourses.map((course) => (
              <TableRow key={course.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-surface-100 rounded-lg overflow-hidden flex-shrink-0">
                      {course.thumbnail_url ? (
                        <Image
                          src={course.thumbnail_url}
                          alt={course.title}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-surface-400">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-surface-900">{course.title}</p>
                      <p className="text-xs text-surface-400">/{course.slug}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="info">{getCategoryLabel(course.category)}</Badge>
                </TableCell>
                <TableCell>{course.chapters_count || 0}</TableCell>
                <TableCell>
                  <span className="text-primary font-medium">{course.xp_reward} XP</span>
                </TableCell>
                <TableCell>
                  <Badge variant={course.is_published ? 'success' : 'warning'}>
                    {course.is_published ? 'Publicado' : 'Borrador'}
                  </Badge>
                </TableCell>
                <TableCell className="text-surface-500">
                  {formatDate(course.created_at)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/stareduca-junior/cursos/${course.id}/capitulos`}>
                      <Button variant="ghost" size="sm" title="Capitulos">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </Button>
                    </Link>
                    <Link href={`/stareduca-junior/cursos/${course.id}/examen`}>
                      <Button variant="ghost" size="sm" title="Examen">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                      </Button>
                    </Link>
                    <Link href={`/stareduca-junior/cursos/${course.id}`}>
                      <Button variant="ghost" size="sm" title="Editar">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTogglePublish(course)}
                      title={course.is_published ? 'Despublicar' : 'Publicar'}
                    >
                      {course.is_published ? (
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
                      onClick={() => handleDelete(course)}
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
