'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabaseStarEmpire } from '@/lib/supabase/starempire-client';
import {
  Button,
  Card,
  CardContent,
  Input,
  Textarea,
  Modal,
  ModalFooter,
  Spinner,
  Badge,
  Select,
  FileUpload,
} from '@/components/ui';
import { useToastStore, useConfirmStore } from '@/stores/admin-store';
import { uploadFileStarEmpire, generateStoragePathStarEmpire, deleteFileByUrlStarEmpire, isStorageUrlStarEmpire } from '@/lib/supabase/starempire-storage';
import type { VideoMetadata } from '@/components/ui/FileUpload';

const CATEGORY_TYPES = [
  { value: 'tecnologia', label: 'Tecnologia' },
  { value: 'liderazgo', label: 'Liderazgo' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'finanzas', label: 'Finanzas' },
  { value: 'innovacion', label: 'Innovacion' },
  { value: 'impacto', label: 'Impacto' },
  { value: 'resiliencia', label: 'Resiliencia' },
] as const;

interface Lesson {
  id: string;
  company_id: string;
  title: string;
  lesson_number: number;
  key_lesson: string | null;
  video_url: string | null;
  video_thumbnail_url: string | null;
  duration_seconds: number;
  audio_track_name: string | null;
  category_type: string | null;
  inspired_count: number;
  game_changer_count: number;
  save_count: number;
  share_count: number;
  view_count: number;
  order_index: number;
  created_at: string;
}

interface LessonForm {
  title: string;
  key_lesson: string;
  video_url: string;
  video_thumbnail_url: string;
  duration_seconds: number;
  audio_track_name: string;
  category_type: string;
}

const INITIAL_FORM: LessonForm = {
  title: '',
  key_lesson: '',
  video_url: '',
  video_thumbnail_url: '',
  duration_seconds: 45,
  audio_track_name: '',
  category_type: '',
};

const getCategoryBadgeVariant = (type: string): string => {
  switch (type) {
    case 'tecnologia':
      return 'bg-blue-100 text-blue-700';
    case 'liderazgo':
      return 'bg-pink-100 text-pink-700';
    case 'marketing':
      return 'bg-green-100 text-green-700';
    case 'finanzas':
      return 'bg-yellow-100 text-yellow-700';
    case 'innovacion':
      return 'bg-purple-100 text-purple-700';
    case 'impacto':
      return 'bg-orange-100 text-orange-700';
    case 'resiliencia':
      return 'bg-indigo-100 text-indigo-700';
    default:
      return 'bg-surface-100 text-surface-700';
  }
};

const getCategoryLabel = (type: string): string => {
  const found = CATEGORY_TYPES.find((t) => t.value === type);
  return found ? found.label : type;
};

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function LeccionesPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.id as string;
  const { addToast } = useToastStore();
  const { openConfirm } = useConfirmStore();

  const [companyTitle, setCompanyTitle] = useState('');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [form, setForm] = useState<LessonForm>(INITIAL_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  const fetchCompany = useCallback(async () => {
    const { data } = await supabaseStarEmpire
      .from('companies')
      .select('title')
      .eq('id', companyId)
      .single();

    if (data) {
      setCompanyTitle(data.title);
    }
  }, [companyId]);

  const fetchLessons = useCallback(async () => {
    const { data, error } = await supabaseStarEmpire
      .from('lessons')
      .select('*')
      .eq('company_id', companyId)
      .order('order_index');

    if (error) {
      console.error('Error fetching lessons:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'No se pudieron cargar las lecciones',
      });
    } else {
      setLessons(data || []);
    }
  }, [companyId, addToast]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchCompany(), fetchLessons()]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchCompany, fetchLessons]);

  const openCreateModal = () => {
    setEditingLesson(null);
    setForm(INITIAL_FORM);
    setVideoFile(null);
    setThumbnailFile(null);
    setShowModal(true);
  };

  const openEditModal = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setForm({
      title: lesson.title,
      key_lesson: lesson.key_lesson || '',
      video_url: lesson.video_url || '',
      video_thumbnail_url: lesson.video_thumbnail_url || '',
      duration_seconds: lesson.duration_seconds,
      audio_track_name: lesson.audio_track_name || '',
      category_type: lesson.category_type || '',
    });
    setVideoFile(null);
    setThumbnailFile(null);
    setShowModal(true);
  };

  const handleCreate = async () => {
    if (!form.title.trim()) {
      addToast({ type: 'error', title: 'Error', message: 'El titulo es obligatorio' });
      return;
    }
    if (!form.key_lesson.trim()) {
      addToast({ type: 'error', title: 'Error', message: 'La leccion clave es obligatoria' });
      return;
    }
    if (!videoFile) {
      addToast({ type: 'error', title: 'Error', message: 'El video es obligatorio' });
      return;
    }
    if (!form.category_type) {
      addToast({ type: 'error', title: 'Error', message: 'La categoria es obligatoria' });
      return;
    }

    setIsSaving(true);

    try {
      const tempId = crypto.randomUUID();

      // Subir video
      const videoPath = generateStoragePathStarEmpire('lessons', tempId, videoFile.name);
      const videoUrl = await uploadFileStarEmpire(videoPath, videoFile);
      if (!videoUrl) throw new Error('No se pudo subir el video');

      // Subir thumbnail si existe
      let thumbnailUrl: string | null = null;
      if (thumbnailFile) {
        const thumbPath = generateStoragePathStarEmpire('thumbnails', tempId, thumbnailFile.name);
        thumbnailUrl = await uploadFileStarEmpire(thumbPath, thumbnailFile);
        if (!thumbnailUrl) throw new Error('No se pudo subir el thumbnail');
      }

      const nextOrderIndex = lessons.length;
      const nextLessonNumber = lessons.length > 0
        ? Math.max(...lessons.map((i) => i.lesson_number)) + 1
        : 1;

      const { data, error } = await supabaseStarEmpire
        .from('lessons')
        .insert({
          company_id: companyId,
          title: form.title.trim(),
          lesson_number: nextLessonNumber,
          key_lesson: form.key_lesson.trim(),
          video_url: videoUrl,
          video_thumbnail_url: thumbnailUrl,
          duration_seconds: form.duration_seconds,
          audio_track_name: form.audio_track_name.trim() || null,
          category_type: form.category_type,
          order_index: nextOrderIndex,
        })
        .select()
        .single();

      if (error) throw error;

      setLessons([...lessons, data]);
      setShowModal(false);
      addToast({ type: 'success', title: 'Leccion creada' });

      // Actualizar total_lessons de la empresa
      await supabaseStarEmpire
        .from('companies')
        .update({ total_lessons: lessons.length + 1 })
        .eq('id', companyId);

      // Notificar a usuarios via mini app bridge
      await supabaseStarEmpire.from('notifications').insert({
        type: 'new_lesson',
        title: 'Nueva leccion disponible',
        message: `"${form.title.trim()}" de la empresa "${companyTitle}" ya esta disponible`,
        data: { lessonId: data.id, companyId: companyId, companyTitle },
      });
    } catch (error: any) {
      console.error('Error creating lesson:', error);
      addToast({ type: 'error', title: 'Error', message: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingLesson) return;

    if (!form.title.trim()) {
      addToast({ type: 'error', title: 'Error', message: 'El titulo es obligatorio' });
      return;
    }
    if (!form.key_lesson.trim()) {
      addToast({ type: 'error', title: 'Error', message: 'La leccion clave es obligatoria' });
      return;
    }
    if (!videoFile && !form.video_url) {
      addToast({ type: 'error', title: 'Error', message: 'El video es obligatorio' });
      return;
    }
    if (!form.category_type) {
      addToast({ type: 'error', title: 'Error', message: 'La categoria es obligatoria' });
      return;
    }

    setIsSaving(true);

    try {
      let videoUrl: string | null = form.video_url || null;
      let thumbnailUrl: string | null = form.video_thumbnail_url || null;

      // Subir nuevo video si se selecciono
      if (videoFile) {
        const videoPath = generateStoragePathStarEmpire('lessons', editingLesson.id, videoFile.name);
        const newVideoUrl = await uploadFileStarEmpire(videoPath, videoFile);
        if (!newVideoUrl) throw new Error('No se pudo subir el video');

        // Eliminar video anterior si era de Storage
        if (editingLesson.video_url && isStorageUrlStarEmpire(editingLesson.video_url)) {
          await deleteFileByUrlStarEmpire(editingLesson.video_url);
        }
        videoUrl = newVideoUrl;
      }

      // Subir nuevo thumbnail si se selecciono
      if (thumbnailFile) {
        const thumbPath = generateStoragePathStarEmpire('thumbnails', editingLesson.id, thumbnailFile.name);
        const newThumbUrl = await uploadFileStarEmpire(thumbPath, thumbnailFile);
        if (!newThumbUrl) throw new Error('No se pudo subir el thumbnail');

        // Eliminar thumbnail anterior si era de Storage
        if (editingLesson.video_thumbnail_url && isStorageUrlStarEmpire(editingLesson.video_thumbnail_url)) {
          await deleteFileByUrlStarEmpire(editingLesson.video_thumbnail_url);
        }
        thumbnailUrl = newThumbUrl;
      }

      const { error } = await supabaseStarEmpire
        .from('lessons')
        .update({
          title: form.title.trim(),
          key_lesson: form.key_lesson.trim(),
          video_url: videoUrl,
          video_thumbnail_url: thumbnailUrl,
          duration_seconds: form.duration_seconds,
          audio_track_name: form.audio_track_name.trim() || null,
          category_type: form.category_type,
        })
        .eq('id', editingLesson.id);

      if (error) throw error;

      setLessons(
        lessons.map((i) =>
          i.id === editingLesson.id
            ? {
                ...i,
                title: form.title.trim(),
                key_lesson: form.key_lesson.trim(),
                video_url: videoUrl,
                video_thumbnail_url: thumbnailUrl,
                duration_seconds: form.duration_seconds,
                audio_track_name: form.audio_track_name.trim() || null,
                category_type: form.category_type,
              }
            : i
        )
      );
      setShowModal(false);
      addToast({ type: 'success', title: 'Leccion actualizada' });
    } catch (error: any) {
      console.error('Error updating lesson:', error);
      addToast({ type: 'error', title: 'Error', message: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (lesson: Lesson) => {
    openConfirm(
      'Eliminar leccion',
      `\u00BFEliminar "${lesson.title}"? Esta accion no se puede deshacer.`,
      async () => {
        try {
          const { error } = await supabaseStarEmpire
            .from('lessons')
            .delete()
            .eq('id', lesson.id);

          if (error) throw error;

          // Eliminar archivos de Storage
          if (lesson.video_url && isStorageUrlStarEmpire(lesson.video_url)) {
            await deleteFileByUrlStarEmpire(lesson.video_url);
          }
          if (lesson.video_thumbnail_url && isStorageUrlStarEmpire(lesson.video_thumbnail_url)) {
            await deleteFileByUrlStarEmpire(lesson.video_thumbnail_url);
          }

          const updatedLessons = lessons.filter((i) => i.id !== lesson.id);
          setLessons(updatedLessons);
          addToast({ type: 'success', title: 'Leccion eliminada' });

          // Actualizar total_lessons de la empresa
          await supabaseStarEmpire
            .from('companies')
            .update({ total_lessons: updatedLessons.length })
            .eq('id', companyId);
        } catch (error: any) {
          addToast({ type: 'error', title: 'Error', message: error.message });
        }
      }
    );
  };

  const handleMoveUp = async (index: number) => {
    if (index <= 0) return;

    const current = lessons[index];
    const previous = lessons[index - 1];

    try {
      const { error: err1 } = await supabaseStarEmpire
        .from('lessons')
        .update({ order_index: previous.order_index, lesson_number: previous.lesson_number })
        .eq('id', current.id);

      if (err1) throw err1;

      const { error: err2 } = await supabaseStarEmpire
        .from('lessons')
        .update({ order_index: current.order_index, lesson_number: current.lesson_number })
        .eq('id', previous.id);

      if (err2) throw err2;

      const updated = [...lessons];
      const tempOrder = current.order_index;
      const tempNumber = current.lesson_number;
      updated[index] = { ...current, order_index: previous.order_index, lesson_number: previous.lesson_number };
      updated[index - 1] = { ...previous, order_index: tempOrder, lesson_number: tempNumber };
      updated.sort((a, b) => a.order_index - b.order_index);
      setLessons(updated);
    } catch (error: any) {
      addToast({ type: 'error', title: 'Error', message: error.message });
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index >= lessons.length - 1) return;

    const current = lessons[index];
    const next = lessons[index + 1];

    try {
      const { error: err1 } = await supabaseStarEmpire
        .from('lessons')
        .update({ order_index: next.order_index, lesson_number: next.lesson_number })
        .eq('id', current.id);

      if (err1) throw err1;

      const { error: err2 } = await supabaseStarEmpire
        .from('lessons')
        .update({ order_index: current.order_index, lesson_number: current.lesson_number })
        .eq('id', next.id);

      if (err2) throw err2;

      const updated = [...lessons];
      const tempOrder = current.order_index;
      const tempNumber = current.lesson_number;
      updated[index] = { ...current, order_index: next.order_index, lesson_number: next.lesson_number };
      updated[index + 1] = { ...next, order_index: tempOrder, lesson_number: tempNumber };
      updated.sort((a, b) => a.order_index - b.order_index);
      setLessons(updated);
    } catch (error: any) {
      addToast({ type: 'error', title: 'Error', message: error.message });
    }
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
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push(`/starempire/empresas/${companyId}`)}
          className="p-2 hover:bg-surface-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-surface-900">Lecciones</h1>
          <p className="text-surface-500">{companyTitle}</p>
        </div>
        <Button onClick={openCreateModal}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva Leccion
        </Button>
      </div>

      {/* Lessons List */}
      {lessons.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
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
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            <p className="mt-4 text-surface-500">No hay lecciones todavia</p>
            <Button className="mt-4" onClick={openCreateModal}>
              Crear primera leccion
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {lessons.map((lesson, index) => (
            <Card key={lesson.id}>
              <div className="flex items-center gap-4 p-4">
                {/* Order number */}
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold shrink-0">
                  {lesson.lesson_number}
                </div>

                {/* Title + key lesson */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-surface-900 truncate">{lesson.title}</h3>
                  {lesson.key_lesson && (
                    <p className="text-sm text-surface-500 truncate mt-0.5">
                      {lesson.key_lesson}
                    </p>
                  )}
                </div>

                {/* Category type badge */}
                {lesson.category_type && (
                  <span
                    className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full shrink-0 ${getCategoryBadgeVariant(lesson.category_type)}`}
                  >
                    {getCategoryLabel(lesson.category_type)}
                  </span>
                )}

                {/* Duration */}
                <span className="text-sm text-surface-500 shrink-0 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formatDuration(lesson.duration_seconds)}
                </span>

                {/* Stats */}
                <div className="flex items-center gap-3 text-xs text-surface-400 shrink-0">
                  <span className="flex items-center gap-1" title="Vistas">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    {lesson.view_count || 0}
                  </span>
                  <span className="flex items-center gap-1" title="Guardados">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    {lesson.save_count || 0}
                  </span>
                  <span className="flex items-center gap-1" title="Game Changers">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                    </svg>
                    {lesson.game_changer_count || 0}
                  </span>
                </div>

                {/* Move up/down */}
                <div className="flex flex-col shrink-0">
                  <button
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="p-1 hover:bg-surface-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Mover arriba"
                  >
                    <svg className="w-4 h-4 text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleMoveDown(index)}
                    disabled={index === lessons.length - 1}
                    className="p-1 hover:bg-surface-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Mover abajo"
                  >
                    <svg className="w-4 h-4 text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(lesson)}
                    title="Editar"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-accent-red hover:bg-red-50"
                    onClick={() => handleDelete(lesson)}
                    title="Eliminar"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingLesson ? 'Editar Leccion' : 'Nueva Leccion'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Titulo *"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Ej: El poder de la innovacion disruptiva"
            autoFocus
          />

          <Textarea
            label="Leccion clave *"
            value={form.key_lesson}
            onChange={(e) => setForm({ ...form, key_lesson: e.target.value })}
            placeholder="La leccion principal que resume este contenido..."
            rows={3}
          />

          <FileUpload
            label="Video *"
            accept="video/*"
            value={videoFile || form.video_url || null}
            onChange={setVideoFile}
            maxSize={100 * 1024 * 1024}
            showVideoPreview={true}
            helperText="MP4 o WebM. Maximo 100MB. Se subira al guardar."
            onVideoMetadata={(meta: VideoMetadata) =>
              setForm({ ...form, duration_seconds: meta.durationSeconds })
            }
          />

          <FileUpload
            label="Thumbnail"
            accept="image/*"
            value={thumbnailFile || form.video_thumbnail_url || null}
            onChange={setThumbnailFile}
            showPreview={true}
            helperText="PNG, JPG o WebP. Imagen de preview del video (opcional)."
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Duracion (segundos)"
              type="number"
              value={form.duration_seconds.toString()}
              onChange={(e) =>
                setForm({ ...form, duration_seconds: parseInt(e.target.value) || 45 })
              }
              min={1}
              hint="Duracion del video en segundos"
            />

            <Select
              label="Categoria *"
              value={form.category_type}
              onChange={(e) => setForm({ ...form, category_type: e.target.value })}
              options={CATEGORY_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              placeholder="Seleccionar categoria..."
            />
          </div>

          <Input
            label="Nombre del audio track"
            value={form.audio_track_name}
            onChange={(e) => setForm({ ...form, audio_track_name: e.target.value })}
            placeholder="Ej: Musica de fondo motivacional"
            hint="Nombre de la pista de audio asociada (opcional)"
          />
        </div>

        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancelar
          </Button>
          <Button
            onClick={editingLesson ? handleUpdate : handleCreate}
            isLoading={isSaving}
          >
            {editingLesson ? 'Guardar' : 'Crear'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
