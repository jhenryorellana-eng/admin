'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Tables } from '@/types/database';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Modal,
  ModalFooter,
  Spinner,
  Badge,
  FileUpload,
} from '@/components/ui';
import { useToastStore, useConfirmStore } from '@/stores/admin-store';
import {
  uploadFile,
  deleteFileByUrl,
  generateLessonMaterialPath,
  isStorageUrl,
} from '@/lib/supabase/storage';

type Module = Tables<'modules'>;
type Lesson = Tables<'lessons'>;

interface ModuleWithLessons extends Module {
  lessons: Lesson[];
}

export default function ModulosPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const { addToast } = useToastStore();
  const { openConfirm } = useConfirmStore();

  const [courseTitle, setCourseTitle] = useState('');
  const [modules, setModules] = useState<ModuleWithLessons[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Module Modal
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [moduleTitle, setModuleTitle] = useState('');
  const [isSavingModule, setIsSavingModule] = useState(false);

  // Lesson Modal
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [lessonForm, setLessonForm] = useState({
    title: '',
    duration_minutes: 0,
    xp_reward: 25,
  });
  const [isSavingLesson, setIsSavingLesson] = useState(false);

  // Video file state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [existingVideoUrl, setExistingVideoUrl] = useState<string | null>(null);
  const [originalVideoUrl, setOriginalVideoUrl] = useState<string | null>(null);

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

      // Fetch modules with lessons
      const { data: modulesData, error } = await supabase
        .from('modules')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index');

      if (error) throw error;

      // Fetch lessons for all modules
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('*')
        .in('module_id', (modulesData || []).map((m) => m.id))
        .order('order_index');

      // Map lessons to modules
      const modulesWithLessons = (modulesData || []).map((module) => ({
        ...module,
        lessons: (lessonsData || []).filter((l) => l.module_id === module.id),
      }));

      setModules(modulesWithLessons);

      // Expand all modules by default
      setExpandedModules(new Set(modulesWithLessons.map((m) => m.id)));
    } catch (error) {
      console.error('Error fetching data:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'No se pudieron cargar los modulos',
      });
    } finally {
      setIsLoading(false);
    }
  }, [courseId, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Module functions
  const openModuleModal = (module?: Module) => {
    if (module) {
      setEditingModule(module);
      setModuleTitle(module.title);
    } else {
      setEditingModule(null);
      setModuleTitle('');
    }
    setIsModuleModalOpen(true);
  };

  const saveModule = async () => {
    if (!moduleTitle.trim()) {
      addToast({ type: 'error', title: 'Error', message: 'El titulo es obligatorio' });
      return;
    }

    setIsSavingModule(true);

    try {
      if (editingModule) {
        // Update
        const { error } = await supabase
          .from('modules')
          .update({ title: moduleTitle })
          .eq('id', editingModule.id);

        if (error) throw error;

        setModules(
          modules.map((m) =>
            m.id === editingModule.id ? { ...m, title: moduleTitle } : m
          )
        );
        addToast({ type: 'success', title: 'Modulo actualizado' });
      } else {
        // Create
        const orderIndex = modules.length;
        const { data, error } = await supabase
          .from('modules')
          .insert({
            course_id: courseId,
            title: moduleTitle,
            order_index: orderIndex,
          })
          .select()
          .single();

        if (error) throw error;

        setModules([...modules, { ...data, lessons: [] }]);
        setExpandedModules(new Set([...Array.from(expandedModules), data.id]));
        addToast({ type: 'success', title: 'Modulo creado' });
      }

      setIsModuleModalOpen(false);
    } catch (error: any) {
      addToast({ type: 'error', title: 'Error', message: error.message });
    } finally {
      setIsSavingModule(false);
    }
  };

  const deleteModule = (module: Module) => {
    openConfirm(
      'Eliminar modulo',
      `¿Eliminar "${module.title}" y todas sus lecciones?`,
      async () => {
        try {
          // Get all lessons in this module to delete their videos
          const moduleData = modules.find((m) => m.id === module.id);
          if (moduleData) {
            for (const lesson of moduleData.lessons) {
              if (lesson.video_url && isStorageUrl(lesson.video_url)) {
                await deleteFileByUrl(lesson.video_url);
              }
            }
          }

          const { error } = await supabase.from('modules').delete().eq('id', module.id);
          if (error) throw error;

          setModules(modules.filter((m) => m.id !== module.id));
          addToast({ type: 'success', title: 'Modulo eliminado' });
        } catch (error: any) {
          addToast({ type: 'error', title: 'Error', message: error.message });
        }
      }
    );
  };

  // Lesson functions
  const openLessonModal = (moduleId: string, lesson?: Lesson) => {
    setSelectedModuleId(moduleId);
    if (lesson) {
      setEditingLesson(lesson);
      setLessonForm({
        title: lesson.title,
        duration_minutes: lesson.duration_minutes || 0,
        xp_reward: lesson.xp_reward,
      });
      setExistingVideoUrl(lesson.video_url || null);
      setOriginalVideoUrl(lesson.video_url || null);
      setVideoFile(null);
    } else {
      setEditingLesson(null);
      setLessonForm({
        title: '',
        duration_minutes: 0,
        xp_reward: 25,
      });
      setExistingVideoUrl(null);
      setOriginalVideoUrl(null);
      setVideoFile(null);
    }
    setIsLessonModalOpen(true);
  };

  const saveLesson = async () => {
    if (!lessonForm.title.trim() || !selectedModuleId) {
      addToast({ type: 'error', title: 'Error', message: 'El titulo es obligatorio' });
      return;
    }

    setIsSavingLesson(true);

    try {
      let newVideoUrl: string | null = existingVideoUrl;

      if (editingLesson) {
        // Update existing lesson

        // Handle video file
        if (videoFile) {
          // Upload new video
          const path = generateLessonMaterialPath(editingLesson.id, videoFile.name);
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
            title: lessonForm.title,
            video_url: newVideoUrl,
            duration_minutes: lessonForm.duration_minutes || null,
            xp_reward: lessonForm.xp_reward,
          })
          .eq('id', editingLesson.id);

        if (error) throw error;

        setModules(
          modules.map((m) => ({
            ...m,
            lessons: m.lessons.map((l) =>
              l.id === editingLesson.id
                ? {
                    ...l,
                    title: lessonForm.title,
                    video_url: newVideoUrl,
                    duration_minutes: lessonForm.duration_minutes || null,
                    xp_reward: lessonForm.xp_reward,
                  }
                : l
            ),
          }))
        );
        addToast({ type: 'success', title: 'Leccion actualizada' });
      } else {
        // Create new lesson
        const module = modules.find((m) => m.id === selectedModuleId);
        const orderIndex = module?.lessons.length || 0;

        // First create the lesson to get its ID
        const { data, error } = await supabase
          .from('lessons')
          .insert({
            module_id: selectedModuleId,
            title: lessonForm.title,
            video_url: null, // Will update after upload
            duration_minutes: lessonForm.duration_minutes || null,
            xp_reward: lessonForm.xp_reward,
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
            // Update lesson with video URL
            await supabase
              .from('lessons')
              .update({ video_url: newVideoUrl })
              .eq('id', data.id);

            data.video_url = newVideoUrl;
          }
        }

        setModules(
          modules.map((m) =>
            m.id === selectedModuleId ? { ...m, lessons: [...m.lessons, data] } : m
          )
        );
        addToast({ type: 'success', title: 'Leccion creada' });
      }

      setIsLessonModalOpen(false);
    } catch (error: any) {
      addToast({ type: 'error', title: 'Error', message: error.message });
    } finally {
      setIsSavingLesson(false);
    }
  };

  const deleteLesson = (lesson: Lesson) => {
    openConfirm('Eliminar leccion', `¿Eliminar "${lesson.title}"?`, async () => {
      try {
        // Delete video from storage if exists
        if (lesson.video_url && isStorageUrl(lesson.video_url)) {
          await deleteFileByUrl(lesson.video_url);
        }

        const { error } = await supabase.from('lessons').delete().eq('id', lesson.id);
        if (error) throw error;

        setModules(
          modules.map((m) => ({
            ...m,
            lessons: m.lessons.filter((l) => l.id !== lesson.id),
          }))
        );
        addToast({ type: 'success', title: 'Leccion eliminada' });
      } catch (error: any) {
        addToast({ type: 'error', title: 'Error', message: error.message });
      }
    });
  };

  const toggleModule = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
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
          <h1 className="text-2xl font-bold text-surface-900">Modulos y Lecciones</h1>
          <p className="text-surface-500">{courseTitle}</p>
        </div>
        <Button onClick={() => openModuleModal()}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Modulo
        </Button>
      </div>

      {/* Modules List */}
      {modules.length === 0 ? (
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
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <p className="mt-4 text-surface-500">No hay modulos todavia</p>
            <Button className="mt-4" onClick={() => openModuleModal()}>
              Crear primer modulo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {modules.map((module, moduleIndex) => (
            <Card key={module.id}>
              {/* Module Header */}
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-surface-50 transition-colors"
                onClick={() => toggleModule(module.id)}
              >
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold text-sm">
                  {moduleIndex + 1}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-surface-900">{module.title}</h3>
                  <p className="text-sm text-surface-500">
                    {module.lessons.length} {module.lessons.length === 1 ? 'leccion' : 'lecciones'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      openLessonModal(module.id);
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      openModuleModal(module);
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-accent-red hover:bg-red-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteModule(module);
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </Button>
                  <svg
                    className={`w-5 h-5 text-surface-400 transition-transform ${
                      expandedModules.has(module.id) ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Lessons */}
              {expandedModules.has(module.id) && (
                <div className="border-t border-surface-100">
                  {module.lessons.length === 0 ? (
                    <div className="p-4 text-center text-surface-400 text-sm">
                      No hay lecciones. Haz clic en + para agregar una.
                    </div>
                  ) : (
                    <div className="divide-y divide-surface-100">
                      {module.lessons.map((lesson, lessonIndex) => (
                        <div
                          key={lesson.id}
                          className="flex items-center gap-3 p-4 hover:bg-surface-50 transition-colors"
                        >
                          <div className="w-6 h-6 bg-surface-100 rounded-full flex items-center justify-center text-surface-500 text-xs font-medium">
                            {lessonIndex + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-surface-900">{lesson.title}</p>
                            <div className="flex items-center gap-3 text-xs text-surface-500 mt-1">
                              {lesson.video_url && (
                                <span className="flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Video
                                </span>
                              )}
                              {lesson.duration_minutes && (
                                <span>{lesson.duration_minutes} min</span>
                              )}
                              <Badge variant="purple" size="sm">
                                {lesson.xp_reward} XP
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openLessonModal(module.id, lesson)}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-accent-red hover:bg-red-50"
                              onClick={() => deleteLesson(lesson)}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Module Modal */}
      <Modal
        isOpen={isModuleModalOpen}
        onClose={() => setIsModuleModalOpen(false)}
        title={editingModule ? 'Editar Modulo' : 'Nuevo Modulo'}
        size="sm"
      >
        <Input
          label="Titulo del modulo"
          value={moduleTitle}
          onChange={(e) => setModuleTitle(e.target.value)}
          placeholder="Ej: Conceptos basicos"
          autoFocus
        />
        <ModalFooter>
          <Button variant="secondary" onClick={() => setIsModuleModalOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={saveModule} isLoading={isSavingModule}>
            {editingModule ? 'Guardar' : 'Crear'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Lesson Modal */}
      <Modal
        isOpen={isLessonModalOpen}
        onClose={() => setIsLessonModalOpen(false)}
        title={editingLesson ? 'Editar Leccion' : 'Nueva Leccion'}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Titulo de la leccion *"
            value={lessonForm.title}
            onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
            placeholder="Ej: Introduccion al ahorro"
            autoFocus
          />

          <FileUpload
            label="Video de la leccion"
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
            accept="video/*"
            showPreview={false}
            helperText="MP4, WebM. Maximo 100MB. Se subira al guardar."
            maxSize={100 * 1024 * 1024}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Duracion (minutos)"
              type="number"
              value={lessonForm.duration_minutes.toString()}
              onChange={(e) =>
                setLessonForm({ ...lessonForm, duration_minutes: parseInt(e.target.value) || 0 })
              }
              min={0}
            />
            <Input
              label="XP al completar"
              type="number"
              value={lessonForm.xp_reward.toString()}
              onChange={(e) =>
                setLessonForm({ ...lessonForm, xp_reward: parseInt(e.target.value) || 0 })
              }
              min={0}
            />
          </div>
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setIsLessonModalOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={saveLesson} isLoading={isSavingLesson}>
            {editingLesson ? 'Guardar' : 'Crear'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
