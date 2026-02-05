'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabaseSenior } from '@/lib/supabase/senior-client';
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
  uploadFileSenior,
  deleteFileByUrlSenior,
  generateChapterVideoPathSenior,
  generateMaterialPathSenior,
  isStorageUrlSenior,
} from '@/lib/supabase/senior-storage';
import { cn, SENIOR_MATERIAL_TYPES } from '@/lib/utils';

interface Module {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
}

interface Chapter {
  id: string;
  module_id: string;
  course_id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  duration_minutes: number | null;
  order_index: number;
}

interface ModuleWithChapters extends Module {
  chapters: Chapter[];
}

interface Material {
  id: string;
  chapter_id: string;
  title: string;
  type: 'video' | 'image' | 'audio' | 'pdf' | 'link';
  url: string;
  description: string | null;
  order_index: number;
}

const MATERIAL_TYPE_STYLES = [
  { value: 'video', label: 'Video Extra', color: 'bg-blue-100 text-blue-600' },
  { value: 'image', label: 'Imagen', color: 'bg-emerald-100 text-emerald-600' },
  { value: 'audio', label: 'Audio', color: 'bg-purple-100 text-purple-600' },
  { value: 'pdf', label: 'PDF', color: 'bg-red-100 text-red-600' },
  { value: 'link', label: 'Enlace Web', color: 'bg-orange-100 text-orange-600' },
];

const getMaterialStyle = (type: string) => {
  return MATERIAL_TYPE_STYLES.find((t) => t.value === type) || MATERIAL_TYPE_STYLES[0];
};

export default function ModulosCapitulosSeniorPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const { addToast } = useToastStore();
  const { openConfirm } = useConfirmStore();

  const [courseTitle, setCourseTitle] = useState('');
  const [modules, setModules] = useState<ModuleWithChapters[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Module Modal
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [moduleTitle, setModuleTitle] = useState('');
  const [isSavingModule, setIsSavingModule] = useState(false);

  // Chapter Modal
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [chapterForm, setChapterForm] = useState({
    title: '',
    description: '',
    duration_minutes: 0,
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
  const [materialDescription, setMaterialDescription] = useState('');
  const [materialUrl, setMaterialUrl] = useState('');
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [isSavingMaterial, setIsSavingMaterial] = useState(false);

  const handleVideoMetadata = (metadata: VideoMetadata) => {
    setChapterForm((prev) => ({
      ...prev,
      duration_minutes: metadata.duration,
    }));
    addToast({
      type: 'info',
      title: 'Duración detectada',
      message: `El video dura ${metadata.duration} minuto${metadata.duration !== 1 ? 's' : ''}`,
    });
  };

  const fetchData = useCallback(async () => {
    try {
      const { data: course } = await supabaseSenior
        .from('courses')
        .select('title')
        .eq('id', courseId)
        .single();

      if (course) {
        setCourseTitle(course.title);
      }

      // Fetch modules
      const { data: modulesData, error } = await supabaseSenior
        .from('modules')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index');

      if (error) throw error;

      // Fetch chapters for all modules
      const moduleIds = (modulesData || []).map((m) => m.id);
      let chaptersData: Chapter[] = [];

      if (moduleIds.length > 0) {
        const { data } = await supabaseSenior
          .from('chapters')
          .select('*')
          .in('module_id', moduleIds)
          .order('order_index');

        chaptersData = data || [];
      }

      // Map chapters to modules
      const modulesWithChapters = (modulesData || []).map((module) => ({
        ...module,
        chapters: chaptersData.filter((ch) => ch.module_id === module.id),
      }));

      setModules(modulesWithChapters);

      // Expand all modules by default
      setExpandedModules(new Set(modulesWithChapters.map((m) => m.id)));
    } catch (error) {
      console.error('Error fetching data:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'No se pudieron cargar los módulos',
      });
    } finally {
      setIsLoading(false);
    }
  }, [courseId, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ========== MODULE FUNCTIONS ==========

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
      addToast({ type: 'error', title: 'Error', message: 'El título es obligatorio' });
      return;
    }

    setIsSavingModule(true);

    try {
      if (editingModule) {
        const { error } = await supabaseSenior
          .from('modules')
          .update({ title: moduleTitle })
          .eq('id', editingModule.id);

        if (error) throw error;

        setModules(
          modules.map((m) =>
            m.id === editingModule.id ? { ...m, title: moduleTitle } : m
          )
        );
        addToast({ type: 'success', title: 'Módulo actualizado' });
      } else {
        const orderIndex = modules.length;
        const { data, error } = await supabaseSenior
          .from('modules')
          .insert({
            course_id: courseId,
            title: moduleTitle,
            order_index: orderIndex,
          })
          .select()
          .single();

        if (error) throw error;

        setModules([...modules, { ...data, chapters: [] }]);
        setExpandedModules(new Set([...Array.from(expandedModules), data.id]));
        addToast({ type: 'success', title: 'Módulo creado' });
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
      'Eliminar módulo',
      `¿Eliminar "${module.title}" y todos sus capítulos?`,
      async () => {
        try {
          // Delete videos from storage for all chapters in this module
          const moduleData = modules.find((m) => m.id === module.id);
          if (moduleData) {
            for (const chapter of moduleData.chapters) {
              if (chapter.video_url && isStorageUrlSenior(chapter.video_url)) {
                await deleteFileByUrlSenior(chapter.video_url);
              }
              // Delete materials files
              const { data: chapterMaterials } = await supabaseSenior
                .from('materials')
                .select('*')
                .eq('chapter_id', chapter.id);

              if (chapterMaterials) {
                for (const material of chapterMaterials) {
                  if (material.url && isStorageUrlSenior(material.url)) {
                    await deleteFileByUrlSenior(material.url);
                  }
                }
              }
            }
          }

          const { error } = await supabaseSenior.from('modules').delete().eq('id', module.id);
          if (error) throw error;

          setModules(modules.filter((m) => m.id !== module.id));
          addToast({ type: 'success', title: 'Módulo eliminado' });
        } catch (error: any) {
          addToast({ type: 'error', title: 'Error', message: error.message });
        }
      }
    );
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

  // ========== CHAPTER FUNCTIONS ==========

  const openChapterModal = async (moduleId: string, chapter?: Chapter) => {
    setSelectedModuleId(moduleId);
    if (chapter) {
      setEditingChapter(chapter);
      setChapterForm({
        title: chapter.title,
        description: chapter.description || '',
        duration_minutes: chapter.duration_minutes || 0,
      });
      setExistingVideoUrl(chapter.video_url || null);
      setOriginalVideoUrl(chapter.video_url || null);
      setVideoFile(null);

      // Load materials for this chapter
      const { data: materialsData } = await supabaseSenior
        .from('materials')
        .select('*')
        .eq('chapter_id', chapter.id)
        .order('order_index');
      setMaterials(materialsData || []);
    } else {
      setEditingChapter(null);
      setChapterForm({
        title: '',
        description: '',
        duration_minutes: 0,
      });
      setExistingVideoUrl(null);
      setOriginalVideoUrl(null);
      setVideoFile(null);
      setMaterials([]);
    }
    setIsChapterModalOpen(true);
  };

  const saveChapter = async () => {
    if (!chapterForm.title.trim() || !selectedModuleId) {
      addToast({ type: 'error', title: 'Error', message: 'El título es obligatorio' });
      return;
    }

    setIsSavingChapter(true);

    try {
      let newVideoUrl: string | null = existingVideoUrl;

      if (editingChapter) {
        if (videoFile) {
          const path = generateChapterVideoPathSenior(editingChapter.id, videoFile.name);
          newVideoUrl = await uploadFileSenior(path, videoFile);

          if (!newVideoUrl) {
            throw new Error('No se pudo subir el video');
          }

          if (originalVideoUrl && isStorageUrlSenior(originalVideoUrl)) {
            await deleteFileByUrlSenior(originalVideoUrl);
          }
        } else if (!existingVideoUrl && originalVideoUrl && isStorageUrlSenior(originalVideoUrl)) {
          await deleteFileByUrlSenior(originalVideoUrl);
          newVideoUrl = null;
        }

        const { error } = await supabaseSenior
          .from('chapters')
          .update({
            title: chapterForm.title,
            description: chapterForm.description || null,
            video_url: newVideoUrl,
            duration_minutes: chapterForm.duration_minutes || null,
          })
          .eq('id', editingChapter.id);

        if (error) throw error;

        setModules(
          modules.map((m) => ({
            ...m,
            chapters: m.chapters.map((c) =>
              c.id === editingChapter.id
                ? {
                    ...c,
                    title: chapterForm.title,
                    description: chapterForm.description || null,
                    video_url: newVideoUrl,
                    duration_minutes: chapterForm.duration_minutes || null,
                  }
                : c
            ),
          }))
        );
        addToast({ type: 'success', title: 'Capítulo actualizado' });
      } else {
        const module = modules.find((m) => m.id === selectedModuleId);
        const orderIndex = module?.chapters.length || 0;

        const { data, error } = await supabaseSenior
          .from('chapters')
          .insert({
            module_id: selectedModuleId,
            course_id: courseId,
            title: chapterForm.title,
            description: chapterForm.description || null,
            video_url: null,
            duration_minutes: chapterForm.duration_minutes || null,
            order_index: orderIndex,
          })
          .select()
          .single();

        if (error) throw error;

        if (videoFile) {
          const path = generateChapterVideoPathSenior(data.id, videoFile.name);
          newVideoUrl = await uploadFileSenior(path, videoFile);

          if (newVideoUrl) {
            await supabaseSenior
              .from('chapters')
              .update({ video_url: newVideoUrl })
              .eq('id', data.id);

            data.video_url = newVideoUrl;
          }
        }

        setModules(
          modules.map((m) =>
            m.id === selectedModuleId ? { ...m, chapters: [...m.chapters, data] } : m
          )
        );
        addToast({ type: 'success', title: 'Capítulo creado' });
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
    openConfirm('Eliminar capítulo', `¿Eliminar "${chapter.title}"?`, async () => {
      try {
        if (chapter.video_url && isStorageUrlSenior(chapter.video_url)) {
          await deleteFileByUrlSenior(chapter.video_url);
        }

        const { data: chapterMaterials } = await supabaseSenior
          .from('materials')
          .select('*')
          .eq('chapter_id', chapter.id);

        if (chapterMaterials) {
          for (const material of chapterMaterials) {
            if (material.url && isStorageUrlSenior(material.url)) {
              await deleteFileByUrlSenior(material.url);
            }
          }
        }

        const { error } = await supabaseSenior.from('chapters').delete().eq('id', chapter.id);
        if (error) throw error;

        setModules(
          modules.map((m) => ({
            ...m,
            chapters: m.chapters.filter((c) => c.id !== chapter.id),
          }))
        );
        addToast({ type: 'success', title: 'Capítulo eliminado' });
      } catch (error: any) {
        addToast({ type: 'error', title: 'Error', message: error.message });
      }
    });
  };

  // ========== MATERIAL FUNCTIONS ==========

  const openMaterialModal = () => {
    setMaterialType('pdf');
    setMaterialTitle('');
    setMaterialDescription('');
    setMaterialUrl('');
    setMaterialFile(null);
    setIsMaterialModalOpen(true);
  };

  const saveMaterial = async () => {
    if (!editingChapter) return;
    if (!materialTitle.trim()) {
      addToast({ type: 'error', title: 'Error', message: 'El título es obligatorio' });
      return;
    }
    if (materialType === 'link' && !materialUrl.trim()) {
      addToast({ type: 'error', title: 'Error', message: 'La URL es obligatoria' });
      return;
    }
    if (materialType !== 'link' && !materialFile) {
      addToast({ type: 'error', title: 'Error', message: 'Selecciona un archivo' });
      return;
    }

    setIsSavingMaterial(true);

    try {
      let fileUrl: string = '';

      if (materialType === 'link') {
        fileUrl = materialUrl;
      } else if (materialFile) {
        const path = generateMaterialPathSenior(editingChapter.id, materialFile.name);
        const uploadedUrl = await uploadFileSenior(path, materialFile);
        if (!uploadedUrl) {
          throw new Error('No se pudo subir el archivo');
        }
        fileUrl = uploadedUrl;
      }

      const { data, error } = await supabaseSenior
        .from('materials')
        .insert({
          chapter_id: editingChapter.id,
          title: materialTitle,
          type: materialType,
          url: fileUrl,
          description: materialDescription || null,
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
      if (material.type !== 'link' && material.url && isStorageUrlSenior(material.url)) {
        await deleteFileByUrlSenior(material.url);
      }

      const { error } = await supabaseSenior.from('materials').delete().eq('id', material.id);

      if (error) throw error;

      setMaterials(materials.filter((m) => m.id !== material.id));
      addToast({ type: 'success', title: 'Material eliminado' });
    } catch (error: any) {
      addToast({ type: 'error', title: 'Error', message: error.message });
    }
  };

  const getAcceptByType = (type: string) => {
    const found = SENIOR_MATERIAL_TYPES.find((t) => t.value === type);
    return found?.accept || '*';
  };

  const getMaxSizeByType = (type: string) => {
    const found = SENIOR_MATERIAL_TYPES.find((t) => t.value === type);
    return found?.maxSize || 50 * 1024 * 1024;
  };

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
          onClick={() => router.push(`/stareduca-senior/cursos/${courseId}`)}
          className="p-2 hover:bg-surface-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-surface-900">Módulos y Capítulos</h1>
          <p className="text-surface-500">{courseTitle}</p>
        </div>
        <Button onClick={() => openModuleModal()}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Módulo
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
            <p className="mt-4 text-surface-500">No hay módulos todavía</p>
            <Button className="mt-4" onClick={() => openModuleModal()}>
              Crear primer módulo
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
                    {module.chapters.length} {module.chapters.length === 1 ? 'capítulo' : 'capítulos'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      openChapterModal(module.id);
                    }}
                    title="Agregar capítulo"
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
                    title="Editar módulo"
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
                    title="Eliminar módulo"
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

              {/* Chapters */}
              {expandedModules.has(module.id) && (
                <div className="border-t border-surface-100">
                  {module.chapters.length === 0 ? (
                    <div className="p-4 text-center text-surface-400 text-sm">
                      No hay capítulos. Haz clic en + para agregar uno.
                    </div>
                  ) : (
                    <div className="divide-y divide-surface-100">
                      {module.chapters.map((chapter, chapterIndex) => (
                        <div
                          key={chapter.id}
                          className="flex items-center gap-3 p-4 hover:bg-surface-50 transition-colors"
                        >
                          <div className="w-6 h-6 bg-surface-100 rounded-full flex items-center justify-center text-surface-500 text-xs font-medium">
                            {chapterIndex + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-surface-900">{chapter.title}</p>
                            <div className="flex items-center gap-3 text-xs text-surface-500 mt-1">
                              {chapter.video_url && (
                                <span className="flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Video
                                </span>
                              )}
                              {chapter.duration_minutes && (
                                <span>{chapter.duration_minutes} min</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openChapterModal(module.id, chapter)}
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
        title={editingModule ? 'Editar Módulo' : 'Nuevo Módulo'}
        size="sm"
      >
        <Input
          label="Título del módulo"
          value={moduleTitle}
          onChange={(e) => setModuleTitle(e.target.value)}
          placeholder="Ej: Fundamentos de la comunicación"
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

      {/* Chapter Modal */}
      <Modal
        isOpen={isChapterModalOpen}
        onClose={() => setIsChapterModalOpen(false)}
        title={editingChapter ? 'Editar Capítulo' : 'Nuevo Capítulo'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Título del capítulo *"
            value={chapterForm.title}
            onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })}
            placeholder="Ej: Técnicas de comunicación asertiva"
            autoFocus
          />

          <Textarea
            label="Descripción"
            value={chapterForm.description}
            onChange={(e) => setChapterForm({ ...chapterForm, description: e.target.value })}
            placeholder="Describe el contenido de este capítulo..."
            rows={3}
          />

          <FileUpload
            label="Video del capítulo"
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
            accept="video/mp4,video/webm"
            showPreview={false}
            showVideoPreview={true}
            helperText="MP4, WebM. Máximo 500MB. La duración se detectará automáticamente."
            maxSize={500 * 1024 * 1024}
          />

          <Input
            label="Duración (minutos)"
            type="number"
            value={chapterForm.duration_minutes.toString()}
            onChange={(e) =>
              setChapterForm({ ...chapterForm, duration_minutes: parseInt(e.target.value) || 0 })
            }
            min={0}
            hint="Se detecta automáticamente del video"
          />

          {/* Materials Section - only show when editing */}
          {editingChapter && (
            <div className="border-t border-surface-200 pt-4 mt-2">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-surface-700">
                  Materiales del capítulo
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
                            {material.type === 'link' && (
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
            options={SENIOR_MATERIAL_TYPES.map((t) => ({ value: t.value, label: t.label }))}
          />

          <Input
            label="Título *"
            value={materialTitle}
            onChange={(e) => setMaterialTitle(e.target.value)}
            placeholder="Ej: Guía de comunicación efectiva"
          />

          <Textarea
            label="Descripción (opcional)"
            value={materialDescription}
            onChange={(e) => setMaterialDescription(e.target.value)}
            placeholder="Breve descripción del material..."
            rows={2}
          />

          {materialType === 'link' ? (
            <Input
              label="URL *"
              value={materialUrl}
              onChange={(e) => setMaterialUrl(e.target.value)}
              placeholder="https://ejemplo.com/recurso"
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
              maxSize={getMaxSizeByType(materialType)}
              helperText={
                materialType === 'pdf'
                  ? 'PDF. Máximo 50MB.'
                  : materialType === 'image'
                  ? 'JPG, PNG, WebP. Máximo 10MB.'
                  : materialType === 'video'
                  ? 'MP4, WebM. Máximo 100MB.'
                  : materialType === 'audio'
                  ? 'MP3, WAV, M4A. Máximo 50MB.'
                  : 'Máximo 50MB.'
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
