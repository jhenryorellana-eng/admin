'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabaseStarReads } from '@/lib/supabase/starreads-client';
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
import { INTELLIGENCE_TYPES } from '@/lib/utils';
import { uploadFileStarReads, generateStoragePathStarReads, deleteFileByUrlStarReads, isStorageUrlStarReads } from '@/lib/supabase/starreads-storage';
import type { VideoMetadata } from '@/components/ui/FileUpload';

interface Idea {
  id: string;
  book_id: string;
  title: string;
  idea_number: number;
  key_phrase: string | null;
  video_url: string | null;
  video_thumbnail_url: string | null;
  duration_seconds: number;
  audio_track_name: string | null;
  intelligence_type: string | null;
  illuminated_count: number;
  fire_count: number;
  save_count: number;
  share_count: number;
  view_count: number;
  order_index: number;
  created_at: string;
}

interface IdeaForm {
  title: string;
  key_phrase: string;
  video_url: string;
  video_thumbnail_url: string;
  duration_seconds: number;
  audio_track_name: string;
  intelligence_type: string;
}

const INITIAL_FORM: IdeaForm = {
  title: '',
  key_phrase: '',
  video_url: '',
  video_thumbnail_url: '',
  duration_seconds: 45,
  audio_track_name: '',
  intelligence_type: '',
};

const getIntelligenceBadgeVariant = (type: string): string => {
  switch (type) {
    case 'mental':
      return 'bg-blue-100 text-blue-700';
    case 'emocional':
      return 'bg-pink-100 text-pink-700';
    case 'social':
      return 'bg-green-100 text-green-700';
    case 'financiera':
      return 'bg-yellow-100 text-yellow-700';
    case 'creativa':
      return 'bg-purple-100 text-purple-700';
    case 'fisica':
      return 'bg-orange-100 text-orange-700';
    case 'espiritual':
      return 'bg-indigo-100 text-indigo-700';
    default:
      return 'bg-surface-100 text-surface-700';
  }
};

const getIntelligenceLabel = (type: string): string => {
  const found = INTELLIGENCE_TYPES.find((t) => t.value === type);
  return found ? found.label : type;
};

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function IdeasPage() {
  const router = useRouter();
  const params = useParams();
  const bookId = params.id as string;
  const { addToast } = useToastStore();
  const { openConfirm } = useConfirmStore();

  const [bookTitle, setBookTitle] = useState('');
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [form, setForm] = useState<IdeaForm>(INITIAL_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  const fetchBook = useCallback(async () => {
    const { data } = await supabaseStarReads
      .from('books')
      .select('title')
      .eq('id', bookId)
      .single();

    if (data) {
      setBookTitle(data.title);
    }
  }, [bookId]);

  const fetchIdeas = useCallback(async () => {
    const { data, error } = await supabaseStarReads
      .from('ideas')
      .select('*')
      .eq('book_id', bookId)
      .order('order_index');

    if (error) {
      console.error('Error fetching ideas:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'No se pudieron cargar las ideas',
      });
    } else {
      setIdeas(data || []);
    }
  }, [bookId, addToast]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchBook(), fetchIdeas()]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchBook, fetchIdeas]);

  const openCreateModal = () => {
    setEditingIdea(null);
    setForm(INITIAL_FORM);
    setVideoFile(null);
    setThumbnailFile(null);
    setShowModal(true);
  };

  const openEditModal = (idea: Idea) => {
    setEditingIdea(idea);
    setForm({
      title: idea.title,
      key_phrase: idea.key_phrase || '',
      video_url: idea.video_url || '',
      video_thumbnail_url: idea.video_thumbnail_url || '',
      duration_seconds: idea.duration_seconds,
      audio_track_name: idea.audio_track_name || '',
      intelligence_type: idea.intelligence_type || '',
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
    if (!form.key_phrase.trim()) {
      addToast({ type: 'error', title: 'Error', message: 'La frase clave es obligatoria' });
      return;
    }
    if (!videoFile) {
      addToast({ type: 'error', title: 'Error', message: 'El video es obligatorio' });
      return;
    }
    if (!form.intelligence_type) {
      addToast({ type: 'error', title: 'Error', message: 'El tipo de inteligencia es obligatorio' });
      return;
    }

    setIsSaving(true);

    try {
      const tempId = crypto.randomUUID();

      // Subir video
      const videoPath = generateStoragePathStarReads('ideas', tempId, videoFile.name);
      const videoUrl = await uploadFileStarReads(videoPath, videoFile);
      if (!videoUrl) throw new Error('No se pudo subir el video');

      // Subir thumbnail si existe
      let thumbnailUrl: string | null = null;
      if (thumbnailFile) {
        const thumbPath = generateStoragePathStarReads('thumbnails', tempId, thumbnailFile.name);
        thumbnailUrl = await uploadFileStarReads(thumbPath, thumbnailFile);
        if (!thumbnailUrl) throw new Error('No se pudo subir el thumbnail');
      }

      const nextOrderIndex = ideas.length;
      const nextIdeaNumber = ideas.length > 0
        ? Math.max(...ideas.map((i) => i.idea_number)) + 1
        : 1;

      const { data, error } = await supabaseStarReads
        .from('ideas')
        .insert({
          book_id: bookId,
          title: form.title.trim(),
          idea_number: nextIdeaNumber,
          key_phrase: form.key_phrase.trim(),
          video_url: videoUrl,
          video_thumbnail_url: thumbnailUrl,
          duration_seconds: form.duration_seconds,
          audio_track_name: form.audio_track_name.trim() || null,
          intelligence_type: form.intelligence_type,
          order_index: nextOrderIndex,
        })
        .select()
        .single();

      if (error) throw error;

      setIdeas([...ideas, data]);
      setShowModal(false);
      addToast({ type: 'success', title: 'Idea creada' });

      // Actualizar total_ideas del libro
      await supabaseStarReads
        .from('books')
        .update({ total_ideas: ideas.length + 1 })
        .eq('id', bookId);
    } catch (error: any) {
      console.error('Error creating idea:', error);
      addToast({ type: 'error', title: 'Error', message: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingIdea) return;

    if (!form.title.trim()) {
      addToast({ type: 'error', title: 'Error', message: 'El titulo es obligatorio' });
      return;
    }
    if (!form.key_phrase.trim()) {
      addToast({ type: 'error', title: 'Error', message: 'La frase clave es obligatoria' });
      return;
    }
    if (!videoFile && !form.video_url) {
      addToast({ type: 'error', title: 'Error', message: 'El video es obligatorio' });
      return;
    }
    if (!form.intelligence_type) {
      addToast({ type: 'error', title: 'Error', message: 'El tipo de inteligencia es obligatorio' });
      return;
    }

    setIsSaving(true);

    try {
      let videoUrl: string | null = form.video_url || null;
      let thumbnailUrl: string | null = form.video_thumbnail_url || null;

      // Subir nuevo video si se seleccionó
      if (videoFile) {
        const videoPath = generateStoragePathStarReads('ideas', editingIdea.id, videoFile.name);
        const newVideoUrl = await uploadFileStarReads(videoPath, videoFile);
        if (!newVideoUrl) throw new Error('No se pudo subir el video');

        // Eliminar video anterior si era de Storage
        if (editingIdea.video_url && isStorageUrlStarReads(editingIdea.video_url)) {
          await deleteFileByUrlStarReads(editingIdea.video_url);
        }
        videoUrl = newVideoUrl;
      }

      // Subir nuevo thumbnail si se seleccionó
      if (thumbnailFile) {
        const thumbPath = generateStoragePathStarReads('thumbnails', editingIdea.id, thumbnailFile.name);
        const newThumbUrl = await uploadFileStarReads(thumbPath, thumbnailFile);
        if (!newThumbUrl) throw new Error('No se pudo subir el thumbnail');

        // Eliminar thumbnail anterior si era de Storage
        if (editingIdea.video_thumbnail_url && isStorageUrlStarReads(editingIdea.video_thumbnail_url)) {
          await deleteFileByUrlStarReads(editingIdea.video_thumbnail_url);
        }
        thumbnailUrl = newThumbUrl;
      }

      const { error } = await supabaseStarReads
        .from('ideas')
        .update({
          title: form.title.trim(),
          key_phrase: form.key_phrase.trim(),
          video_url: videoUrl,
          video_thumbnail_url: thumbnailUrl,
          duration_seconds: form.duration_seconds,
          audio_track_name: form.audio_track_name.trim() || null,
          intelligence_type: form.intelligence_type,
        })
        .eq('id', editingIdea.id);

      if (error) throw error;

      setIdeas(
        ideas.map((i) =>
          i.id === editingIdea.id
            ? {
                ...i,
                title: form.title.trim(),
                key_phrase: form.key_phrase.trim(),
                video_url: videoUrl,
                video_thumbnail_url: thumbnailUrl,
                duration_seconds: form.duration_seconds,
                audio_track_name: form.audio_track_name.trim() || null,
                intelligence_type: form.intelligence_type,
              }
            : i
        )
      );
      setShowModal(false);
      addToast({ type: 'success', title: 'Idea actualizada' });
    } catch (error: any) {
      console.error('Error updating idea:', error);
      addToast({ type: 'error', title: 'Error', message: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (idea: Idea) => {
    openConfirm(
      'Eliminar idea',
      `¿Eliminar "${idea.title}"? Esta accion no se puede deshacer.`,
      async () => {
        try {
          const { error } = await supabaseStarReads
            .from('ideas')
            .delete()
            .eq('id', idea.id);

          if (error) throw error;

          // Eliminar archivos de Storage
          if (idea.video_url && isStorageUrlStarReads(idea.video_url)) {
            await deleteFileByUrlStarReads(idea.video_url);
          }
          if (idea.video_thumbnail_url && isStorageUrlStarReads(idea.video_thumbnail_url)) {
            await deleteFileByUrlStarReads(idea.video_thumbnail_url);
          }

          const updatedIdeas = ideas.filter((i) => i.id !== idea.id);
          setIdeas(updatedIdeas);
          addToast({ type: 'success', title: 'Idea eliminada' });

          // Actualizar total_ideas del libro
          await supabaseStarReads
            .from('books')
            .update({ total_ideas: updatedIdeas.length })
            .eq('id', bookId);
        } catch (error: any) {
          addToast({ type: 'error', title: 'Error', message: error.message });
        }
      }
    );
  };

  const handleMoveUp = async (index: number) => {
    if (index <= 0) return;

    const current = ideas[index];
    const previous = ideas[index - 1];

    try {
      const { error: err1 } = await supabaseStarReads
        .from('ideas')
        .update({ order_index: previous.order_index, idea_number: previous.idea_number })
        .eq('id', current.id);

      if (err1) throw err1;

      const { error: err2 } = await supabaseStarReads
        .from('ideas')
        .update({ order_index: current.order_index, idea_number: current.idea_number })
        .eq('id', previous.id);

      if (err2) throw err2;

      const updated = [...ideas];
      const tempOrder = current.order_index;
      const tempNumber = current.idea_number;
      updated[index] = { ...current, order_index: previous.order_index, idea_number: previous.idea_number };
      updated[index - 1] = { ...previous, order_index: tempOrder, idea_number: tempNumber };
      updated.sort((a, b) => a.order_index - b.order_index);
      setIdeas(updated);
    } catch (error: any) {
      addToast({ type: 'error', title: 'Error', message: error.message });
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index >= ideas.length - 1) return;

    const current = ideas[index];
    const next = ideas[index + 1];

    try {
      const { error: err1 } = await supabaseStarReads
        .from('ideas')
        .update({ order_index: next.order_index, idea_number: next.idea_number })
        .eq('id', current.id);

      if (err1) throw err1;

      const { error: err2 } = await supabaseStarReads
        .from('ideas')
        .update({ order_index: current.order_index, idea_number: current.idea_number })
        .eq('id', next.id);

      if (err2) throw err2;

      const updated = [...ideas];
      const tempOrder = current.order_index;
      const tempNumber = current.idea_number;
      updated[index] = { ...current, order_index: next.order_index, idea_number: next.idea_number };
      updated[index + 1] = { ...next, order_index: tempOrder, idea_number: tempNumber };
      updated.sort((a, b) => a.order_index - b.order_index);
      setIdeas(updated);
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
          onClick={() => router.push(`/starreads/libros/${bookId}`)}
          className="p-2 hover:bg-surface-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-surface-900">Ideas</h1>
          <p className="text-surface-500">{bookTitle}</p>
        </div>
        <Button onClick={openCreateModal}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva Idea
        </Button>
      </div>

      {/* Ideas List */}
      {ideas.length === 0 ? (
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
            <p className="mt-4 text-surface-500">No hay ideas todavia</p>
            <Button className="mt-4" onClick={openCreateModal}>
              Crear primera idea
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {ideas.map((idea, index) => (
            <Card key={idea.id}>
              <div className="flex items-center gap-4 p-4">
                {/* Order number */}
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold shrink-0">
                  {idea.idea_number}
                </div>

                {/* Title + key phrase */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-surface-900 truncate">{idea.title}</h3>
                  {idea.key_phrase && (
                    <p className="text-sm text-surface-500 truncate mt-0.5">
                      {idea.key_phrase}
                    </p>
                  )}
                </div>

                {/* Intelligence type badge */}
                {idea.intelligence_type && (
                  <span
                    className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full shrink-0 ${getIntelligenceBadgeVariant(idea.intelligence_type)}`}
                  >
                    {getIntelligenceLabel(idea.intelligence_type)}
                  </span>
                )}

                {/* Duration */}
                <span className="text-sm text-surface-500 shrink-0 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formatDuration(idea.duration_seconds)}
                </span>

                {/* Stats */}
                <div className="flex items-center gap-3 text-xs text-surface-400 shrink-0">
                  <span className="flex items-center gap-1" title="Vistas">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    {idea.view_count || 0}
                  </span>
                  <span className="flex items-center gap-1" title="Guardados">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    {idea.save_count || 0}
                  </span>
                  <span className="flex items-center gap-1" title="Fuegos">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                    </svg>
                    {idea.fire_count || 0}
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
                    disabled={index === ideas.length - 1}
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
                    onClick={() => openEditModal(idea)}
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
                    onClick={() => handleDelete(idea)}
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
        title={editingIdea ? 'Editar Idea' : 'Nueva Idea'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Titulo *"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Ej: El poder del interes compuesto"
            autoFocus
          />

          <Textarea
            label="Frase clave *"
            value={form.key_phrase}
            onChange={(e) => setForm({ ...form, key_phrase: e.target.value })}
            placeholder="La frase principal que resume esta idea..."
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
              label="Tipo de inteligencia *"
              value={form.intelligence_type}
              onChange={(e) => setForm({ ...form, intelligence_type: e.target.value })}
              options={INTELLIGENCE_TYPES}
              placeholder="Seleccionar tipo..."
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
            onClick={editingIdea ? handleUpdate : handleCreate}
            isLoading={isSaving}
          >
            {editingIdea ? 'Guardar' : 'Crear'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
