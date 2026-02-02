'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Tables } from '@/types/database';
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
  FileUpload,
  VideoMetadata,
  Select,
} from '@/components/ui';
import { useToastStore, useConfirmStore } from '@/stores/admin-store';
import {
  uploadFile,
  deleteFileByUrl,
  generateLessonMaterialPath,
  isStorageUrl,
} from '@/lib/supabase/storage';
import { cn } from '@/lib/utils';

type Chapter = Tables<'lessons'> & {
  description?: string | null;
};

interface Material {
  id: string;
  lesson_id: string;
  title: string;
  type: 'pdf' | 'image' | 'video' | 'audio' | 'url';
  file_path: string | null;
  external_url: string | null;
  order_index: number;
}

const MATERIAL_TYPES = [
  { value: 'pdf', label: 'PDF', icon: 'picture_as_pdf', color: 'bg-red-100 text-red-600' },
  { value: 'image', label: 'Imagen', icon: 'image', color: 'bg-emerald-100 text-emerald-600' },
  { value: 'video', label: 'Video Extra', icon: 'smart_display', color: 'bg-blue-100 text-blue-600' },
  { value: 'audio', label: 'Audio', icon: 'headphones', color: 'bg-purple-100 text-purple-600' },
  { value: 'url', label: 'Enlace Web', icon: 'link', color: 'bg-orange-100 text-orange-600' },
];

const getMaterialStyle = (type: string) => {
  return MATERIAL_TYPES.find(t => t.value === type) || MATERIAL_TYPES[0];
};

export default function CapitulosPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const { addToast } = useToastStore();
  const { openConfirm } = useConfirmStore();

  const [courseTitle, setCourseTitle] = useState('');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Chapter Modal
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [chapterForm, setChapterForm] = useState({
    title: '',
    description: '',
    duration_minutes: 0,
    xp_reward: 25,
  });
  const [isSavingChapter, setIsSavingChapter] = useState(false);

  // Video file state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [existingVideoUrl, setExistingVideoUrl] = useState<string | null>(null);
  const [originalVideoUrl, setOriginalVideoUrl] = useState<string | null>(null);

  // Materials state
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [materialType, setMaterialType] = useState<string>('pdf');
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialUrl, setMaterialUrl] = useState('');
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [isSavingMaterial, setIsSavingMaterial] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      // Fetch course
      const { data: course } = await supabase
        .from('courses')
        .select('title')
        .eq('id', courseId)
        .single();

      if (course) {
        setCourseTitle(course.title);
      }

      // Fetch chapters (lessons linked directly to course)
      // First try with course_id, if column doesn't exist, fall back to module_id approach
      let chaptersData: Chapter[] = [];

      const { data: lessonsData, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index');

      if (error && error.message.includes('course_id')) {
        // Column doesn't exist yet, use module_id approach
        const { data: modulesData } = await supabase
          .from('modules')
          .select('id')
          .eq('course_id', courseId);

        if (modulesData && modulesData.length > 0) {
          const { data: legacyLessons } = await supabase
            .from('lessons')
            .select('*')
            .in('module_id', modulesData.map((m) => m.id))
            .order('order_index');

          chaptersData = legacyLessons || [];
        }
      } else {
        chaptersData = lessonsData || [];
      }

      setChapters(chaptersData);
    } catch (error) {
      console.error('Error fetching data:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'No se pudieron cargar los capitulos',
      });
    } finally {
      setIsLoading(false);
    }
  }, [courseId, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle video metadata extraction
  const handleVideoMetadata = (metadata: VideoMetadata) => {
    setChapterForm((prev) => ({
      ...prev,
      duration_minutes: metadata.duration,
    }));
    addToast({
      type: 'info',
      title: 'Duracion detectada',
      message: `El video dura ${metadata.duration} minuto${metadata.duration !== 1 ? 's' : ''}`,
    });
  };

  // Chapter functions
  const openChapterModal = async (chapter?: Chapter) => {
    if (chapter) {
      setEditingChapter(chapter);
      setChapterForm({
        title: chapter.title,
        description: (chapter as any).description || '',
        duration_minutes: chapter.duration_minutes || 0,
        xp_reward: chapter.xp_reward,
      });
      setExistingVideoUrl(chapter.video_url || null);
      setOriginalVideoUrl(chapter.video_url || null);
      setVideoFile(null);

      // Load materials for this chapter
      const { data: materialsData } = await supabase
        .from('lesson_materials')
        .select('*')
        .eq('lesson_id', chapter.id)
        .order('order_index');
      setMaterials(materialsData || []);
    } else {
      setEditingChapter(null);
      setChapterForm({
        title: '',
        description: '',
        duration_minutes: 0,
        xp_reward: 25,
      });
      setExistingVideoUrl(null);
      setOriginalVideoUrl(null);
      setVideoFile(null);
      setMaterials([]);
    }
    setIsChapterModalOpen(true);
  };

  const saveChapter = async () => {
    if (!chapterForm.title.trim()) {
      addToast({ type: 'error', title: 'Error', message: 'El titulo es obligatorio' });
      return;
    }

    setIsSavingChapter(true);

    try {
      let newVideoUrl: string | null = existingVideoUrl;

      if (editingChapter) {
        // Update existing chapter

        // Handle video file
        if (videoFile) {
          // Upload new video
          const path = generateLessonMaterialPath(editingChapter.id, videoFile.name);
          newVideoUrl = await uploadFile(path, videoFile);

          if (!newVideoUrl) {
            throw new Error('No se pudo subir el video');
          }

          // Delete old video if exists
          if (originalVideoUrl && isStorageUrl(originalVideoUrl)) {
            await deleteFileByUrl(originalVideoUrl);
          }
        } else if (!existingVideoUrl && originalVideoUrl && isStorageUrl(originalVideoUrl)) {
          // Video was removed without replacement
          await deleteFileByUrl(originalVideoUrl);
          newVideoUrl = null;
        }

        const { error } = await supabase
          .from('lessons')
          .update({
            title: chapterForm.title,
            description: chapterForm.description || null,
            video_url: newVideoUrl,
            duration_minutes: chapterForm.duration_minutes || null,
            xp_reward: chapterForm.xp_reward,
          })
          .eq('id', editingChapter.id);

        if (error) throw error;

        setChapters(
          chapters.map((c) =>
            c.id === editingChapter.id
              ? {
                  ...c,
                  title: chapterForm.title,
                  description: chapterForm.description || null,
                  video_url: newVideoUrl,
                  duration_minutes: chapterForm.duration_minutes || null,
                  xp_reward: chapterForm.xp_reward,
                }
              : c
          )
        );
        addToast({ type: 'success', title: 'Capitulo actualizado' });
      } else {
        // Create new chapter
        const orderIndex = chapters.length;

        // First create the chapter to get its ID
        const { data, error } = await supabase
          .from('lessons')
          .insert({
            course_id: courseId,
            title: chapterForm.title,
            description: chapterForm.description || null,
            video_url: null,
            duration_minutes: chapterForm.duration_minutes || null,
            xp_reward: chapterForm.xp_reward,
            order_index: orderIndex,
          })
          .select()
          .single();

        if (error) throw error;

        // Upload video if exists
        if (videoFile) {
          const path = generateLessonMaterialPath(data.id, videoFile.name);
          newVideoUrl = await uploadFile(path, videoFile);

          if (newVideoUrl) {
            // Update chapter with video URL
            await supabase
              .from('lessons')
              .update({ video_url: newVideoUrl })
              .eq('id', data.id);

            data.video_url = newVideoUrl;
          }
        }

        setChapters([...chapters, data]);
        addToast({ type: 'success', title: 'Capitulo creado' });
      }

      setIsChapterModalOpen(false);
    } catch (error: any) {
      console.error('Error saving chapter:', error);
      addToast({ type: 'error', title: 'Error', message: error.message });
    } finally {
      setIsSavingChapter(false);
    }
  };

  const deleteChapter = (chapter: Chapter) => {
    openConfirm('Eliminar capitulo', `¿Eliminar "${chapter.title}"?`, async () => {
      try {
        // Delete video from storage if exists
        if (chapter.video_url && isStorageUrl(chapter.video_url)) {
          await deleteFileByUrl(chapter.video_url);
        }

        // Delete all materials files from storage
        const { data: chapterMaterials } = await supabase
          .from('lesson_materials')
          .select('*')
          .eq('lesson_id', chapter.id);

        if (chapterMaterials) {
          for (const material of chapterMaterials) {
            if (material.file_path && isStorageUrl(material.file_path)) {
              await deleteFileByUrl(material.file_path);
            }
          }
        }

        const { error } = await supabase.from('lessons').delete().eq('id', chapter.id);
        if (error) throw error;

        setChapters(chapters.filter((c) => c.id !== chapter.id));
        addToast({ type: 'success', title: 'Capitulo eliminado' });
      } catch (error: any) {
        addToast({ type: 'error', title: 'Error', message: error.message });
      }
    });
  };

  // Material functions
  const openMaterialModal = () => {
    setMaterialType('pdf');
    setMaterialTitle('');
    setMaterialUrl('');
    setMaterialFile(null);
    setIsMaterialModalOpen(true);
  };

  const saveMaterial = async () => {
    if (!editingChapter) return;
    if (!materialTitle.trim()) {
      addToast({ type: 'error', title: 'Error', message: 'El titulo es obligatorio' });
      return;
    }
    if (materialType === 'url' && !materialUrl.trim()) {
      addToast({ type: 'error', title: 'Error', message: 'La URL es obligatoria' });
      return;
    }
    if (materialType !== 'url' && !materialFile) {
      addToast({ type: 'error', title: 'Error', message: 'Selecciona un archivo' });
      return;
    }

    setIsSavingMaterial(true);

    try {
      let filePath: string | null = null;
      let externalUrl: string | null = null;

      if (materialType === 'url') {
        externalUrl = materialUrl;
      } else if (materialFile) {
        const path = generateLessonMaterialPath(editingChapter.id, materialFile.name);
        filePath = await uploadFile(path, materialFile);
        if (!filePath) {
          throw new Error('No se pudo subir el archivo');
        }
      }

      const { data, error } = await supabase
        .from('lesson_materials')
        .insert({
          lesson_id: editingChapter.id,
          title: materialTitle,
          type: materialType,
          file_path: filePath,
          external_url: externalUrl,
          order_index: materials.length,
        })
        .select()
        .single();

      if (error) throw error;

      setMaterials([...materials, data]);
      setIsMaterialModalOpen(false);
      addToast({ type: 'success', title: 'Material agregado' });
    } catch (error: any) {
      addToast({ type: 'error', title: 'Error', message: error.message });
    } finally {
      setIsSavingMaterial(false);
    }
  };

  const deleteMaterial = async (material: Material) => {
    try {
      // Delete file from storage if exists
      if (material.file_path && isStorageUrl(material.file_path)) {
        await deleteFileByUrl(material.file_path);
      }

      const { error } = await supabase
        .from('lesson_materials')
        .delete()
        .eq('id', material.id);

      if (error) throw error;

      setMaterials(materials.filter(m => m.id !== material.id));
      addToast({ type: 'success', title: 'Material eliminado' });
    } catch (error: any) {
      addToast({ type: 'error', title: 'Error', message: error.message });
    }
  };

  const getAcceptByType = (type: string) => {
    switch (type) {
      case 'pdf': return '.pdf';
      case 'image': return 'image/*';
      case 'video': return 'video/*';
      case 'audio': return 'audio/*';
      default: return '*';
    }
  };

  // Video value for FileUpload
  const videoValue: File | string | null = videoFile || existingVideoUrl;

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
          onClick={() => router.push(`/stareduca-junior/cursos/${courseId}`)}
          className="p-2 hover:bg-surface-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-surface-900">Capitulos</h1>
          <p className="text-surface-500">{courseTitle}</p>
        </div>
        <Button onClick={() => openChapterModal()}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Capitulo
        </Button>
      </div>

      {/* Chapters List */}
      {chapters.length === 0 ? (
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
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="mt-4 text-surface-500">No hay capitulos todavia</p>
            <Button className="mt-4" onClick={() => openChapterModal()}>
              Crear primer capitulo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {chapters.map((chapter, index) => (
            <Card key={chapter.id}>
              <div className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-surface-900 truncate">{chapter.title}</h3>
                  <div className="flex items-center gap-3 text-sm text-surface-500 mt-1">
                    {chapter.video_url && (
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Video
                      </span>
                    )}
                    {chapter.duration_minutes && (
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {chapter.duration_minutes} min
                      </span>
                    )}
                    <Badge variant="purple" size="sm">
                      {chapter.xp_reward} XP
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openChapterModal(chapter)}
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
                    onClick={() => deleteChapter(chapter)}
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

      {/* Chapter Modal */}
      <Modal
        isOpen={isChapterModalOpen}
        onClose={() => setIsChapterModalOpen(false)}
        title={editingChapter ? 'Editar Capitulo' : 'Nuevo Capitulo'}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Titulo del capitulo *"
            value={chapterForm.title}
            onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })}
            placeholder="Ej: Introduccion al ahorro"
            autoFocus
          />

          <Textarea
            label="Descripcion"
            value={chapterForm.description}
            onChange={(e) => setChapterForm({ ...chapterForm, description: e.target.value })}
            placeholder="Describe el contenido de este capitulo..."
            rows={3}
          />

          <FileUpload
            label="Video del capitulo"
            value={videoValue}
            onChange={(file) => {
              if (file) {
                setVideoFile(file);
                setExistingVideoUrl(null);
              } else {
                setVideoFile(null);
                setExistingVideoUrl(null);
              }
            }}
            onVideoMetadata={handleVideoMetadata}
            accept="video/*"
            showPreview={false}
            showVideoPreview={true}
            helperText="MP4, WebM. Maximo 100MB. La duracion se detectara automaticamente."
            maxSize={100 * 1024 * 1024}
          />

          {/* Materials Section - only show when editing */}
          {editingChapter && (
            <div className="border-t border-surface-200 pt-4 mt-2">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-surface-700">
                  Materiales del capitulo
                </label>
                <Button size="sm" variant="secondary" onClick={openMaterialModal}>
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Agregar
                </Button>
              </div>

              {materials.length === 0 ? (
                <p className="text-surface-400 text-sm text-center py-4 bg-surface-50 rounded-lg">
                  Sin materiales adicionales
                </p>
              ) : (
                <div className="space-y-2">
                  {materials.map((material) => {
                    const style = getMaterialStyle(material.type);
                    return (
                      <div
                        key={material.id}
                        className="flex items-center gap-3 p-3 bg-surface-50 rounded-lg"
                      >
                        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', style.color)}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {material.type === 'pdf' && (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            )}
                            {material.type === 'image' && (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            )}
                            {material.type === 'video' && (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            )}
                            {material.type === 'audio' && (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                            )}
                            {material.type === 'url' && (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            )}
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-surface-900 truncate">{material.title}</p>
                          <p className="text-xs text-surface-400">{style.label}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteMaterial(material)}
                          className="p-1.5 text-surface-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Duracion (minutos)"
              type="number"
              value={chapterForm.duration_minutes.toString()}
              onChange={(e) =>
                setChapterForm({ ...chapterForm, duration_minutes: parseInt(e.target.value) || 0 })
              }
              min={0}
              hint="Se detecta automaticamente del video"
            />
            <Input
              label="XP al completar"
              type="number"
              value={chapterForm.xp_reward.toString()}
              onChange={(e) =>
                setChapterForm({ ...chapterForm, xp_reward: parseInt(e.target.value) || 0 })
              }
              min={0}
            />
          </div>
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setIsChapterModalOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={saveChapter} isLoading={isSavingChapter}>
            {editingChapter ? 'Guardar' : 'Crear'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Material Modal */}
      <Modal
        isOpen={isMaterialModalOpen}
        onClose={() => setIsMaterialModalOpen(false)}
        title="Agregar Material"
        size="sm"
      >
        <div className="space-y-4">
          <Select
            label="Tipo de material"
            value={materialType}
            onChange={(e) => {
              setMaterialType(e.target.value);
              setMaterialFile(null);
              setMaterialUrl('');
            }}
            options={MATERIAL_TYPES.map(t => ({ value: t.value, label: t.label }))}
          />

          <Input
            label="Titulo *"
            value={materialTitle}
            onChange={(e) => setMaterialTitle(e.target.value)}
            placeholder="Ej: Guia de conceptos basicos"
          />

          {materialType === 'url' ? (
            <Input
              label="URL *"
              value={materialUrl}
              onChange={(e) => setMaterialUrl(e.target.value)}
              placeholder="https://ejemplo.com/herramienta"
              type="url"
            />
          ) : (
            <FileUpload
              label="Archivo *"
              value={materialFile}
              onChange={setMaterialFile}
              accept={getAcceptByType(materialType)}
              showPreview={materialType === 'image'}
              showVideoPreview={materialType === 'video'}
              maxSize={materialType === 'video' ? 100 * 1024 * 1024 : 50 * 1024 * 1024}
              helperText={
                materialType === 'pdf' ? 'PDF. Maximo 50MB.' :
                materialType === 'image' ? 'JPG, PNG, WebP. Maximo 50MB.' :
                materialType === 'video' ? 'MP4, WebM. Maximo 100MB.' :
                materialType === 'audio' ? 'MP3, WAV, M4A. Maximo 50MB.' :
                'Maximo 50MB.'
              }
            />
          )}
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setIsMaterialModalOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={saveMaterial} isLoading={isSavingMaterial}>
            Agregar
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
