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
} from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { useToastStore, useConfirmStore } from '@/stores/admin-store';

type Exam = Tables<'exams'>;
type ExamQuestion = Tables<'exam_questions'>;

export default function ExamenPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const { addToast } = useToastStore();
  const { openConfirm } = useConfirmStore();

  const [courseTitle, setCourseTitle] = useState('');
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Exam form
  const EXAM_TITLE = 'Examen final';
  const [passingScore, setPassingScore] = useState(70);
  const [isExamActive, setIsExamActive] = useState(true);
  const [isSavingExam, setIsSavingExam] = useState(false);

  // Badge fields
  const [badgeIcon, setBadgeIcon] = useState('');
  const [badgeName, setBadgeName] = useState('');
  const [badgeColorFrom, setBadgeColorFrom] = useState('#fcd34d');
  const [badgeColorTo, setBadgeColorTo] = useState('#f59e0b');

  // Question Modal
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<ExamQuestion | null>(null);
  const [questionForm, setQuestionForm] = useState({
    question: '',
    options: ['', '', '', ''],
    correct_option: 0,
  });
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);

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

      // Fetch exam
      const { data: examData } = await supabase
        .from('exams')
        .select('*')
        .eq('course_id', courseId)
        .single();

      if (examData) {
        setExam(examData);
        setPassingScore(examData.passing_score);
        setIsExamActive(examData.is_active);
        // Load badge data
        setBadgeIcon((examData as any).badge_icon || '');
        setBadgeName((examData as any).badge_name || '');
        const colors = ((examData as any).badge_color || '#fcd34d|#f59e0b').split('|');
        setBadgeColorFrom(colors[0] || '#fcd34d');
        setBadgeColorTo(colors[1] || '#f59e0b');

        // Fetch questions
        const { data: questionsData } = await supabase
          .from('exam_questions')
          .select('*')
          .eq('exam_id', examData.id)
          .order('order_index');

        setQuestions(questionsData || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveExam = async () => {
    setIsSavingExam(true);

    try {
      if (exam) {
        // Update
        const { error } = await supabase
          .from('exams')
          .update({
            title: EXAM_TITLE,
            passing_score: passingScore,
            is_active: isExamActive,
            badge_icon: badgeIcon || null,
            badge_name: badgeName || null,
            badge_color: `${badgeColorFrom}|${badgeColorTo}`,
          })
          .eq('id', exam.id);

        if (error) throw error;

        setExam({ ...exam, title: EXAM_TITLE, passing_score: passingScore, is_active: isExamActive });
        addToast({ type: 'success', title: 'Examen actualizado' });
      } else {
        // Create
        const { data, error } = await supabase
          .from('exams')
          .insert({
            course_id: courseId,
            title: EXAM_TITLE,
            passing_score: passingScore,
            is_active: isExamActive,
            badge_icon: badgeIcon || null,
            badge_name: badgeName || null,
            badge_color: `${badgeColorFrom}|${badgeColorTo}`,
          })
          .select()
          .single();

        if (error) throw error;

        setExam(data);
        addToast({ type: 'success', title: 'Examen creado' });
      }
    } catch (error: any) {
      addToast({ type: 'error', title: 'Error', message: error.message });
    } finally {
      setIsSavingExam(false);
    }
  };

  const openQuestionModal = (question?: ExamQuestion) => {
    if (question) {
      setEditingQuestion(question);
      setQuestionForm({
        question: question.question,
        options: question.options as string[],
        correct_option: question.correct_option,
      });
    } else {
      setEditingQuestion(null);
      setQuestionForm({
        question: '',
        options: ['', '', '', ''],
        correct_option: 0,
      });
    }
    setIsQuestionModalOpen(true);
  };

  const saveQuestion = async () => {
    if (!questionForm.question.trim()) {
      addToast({ type: 'error', title: 'Error', message: 'La pregunta es obligatoria' });
      return;
    }

    const emptyOptions = questionForm.options.filter((o) => !o.trim()).length;
    if (emptyOptions > 0) {
      addToast({ type: 'error', title: 'Error', message: 'Todas las opciones son obligatorias' });
      return;
    }

    if (!exam) {
      addToast({ type: 'error', title: 'Error', message: 'Primero debes crear el examen' });
      return;
    }

    setIsSavingQuestion(true);

    try {
      if (editingQuestion) {
        // Update
        const { error } = await supabase
          .from('exam_questions')
          .update({
            question: questionForm.question,
            options: questionForm.options,
            correct_option: questionForm.correct_option,
          })
          .eq('id', editingQuestion.id);

        if (error) throw error;

        setQuestions(
          questions.map((q) =>
            q.id === editingQuestion.id
              ? {
                  ...q,
                  question: questionForm.question,
                  options: questionForm.options,
                  correct_option: questionForm.correct_option,
                }
              : q
          )
        );
        addToast({ type: 'success', title: 'Pregunta actualizada' });
      } else {
        // Create
        const orderIndex = questions.length;
        const { data, error } = await supabase
          .from('exam_questions')
          .insert({
            exam_id: exam.id,
            question: questionForm.question,
            options: questionForm.options,
            correct_option: questionForm.correct_option,
            order_index: orderIndex,
          })
          .select()
          .single();

        if (error) throw error;

        setQuestions([...questions, data]);
        addToast({ type: 'success', title: 'Pregunta creada' });
      }

      setIsQuestionModalOpen(false);
    } catch (error: any) {
      addToast({ type: 'error', title: 'Error', message: error.message });
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const deleteQuestion = (question: ExamQuestion) => {
    openConfirm('Eliminar pregunta', '¿Estás seguro de eliminar esta pregunta?', async () => {
      try {
        const { error } = await supabase.from('exam_questions').delete().eq('id', question.id);
        if (error) throw error;

        setQuestions(questions.filter((q) => q.id !== question.id));
        addToast({ type: 'success', title: 'Pregunta eliminada' });
      } catch (error: any) {
        addToast({ type: 'error', title: 'Error', message: error.message });
      }
    });
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...questionForm.options];
    newOptions[index] = value;
    setQuestionForm({ ...questionForm, options: newOptions });
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
          onClick={() => router.push(`/stareduca-junior/cursos/${courseId}`)}
          className="p-2 hover:bg-surface-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Examen del Curso</h1>
          <p className="text-surface-500">{courseTitle}</p>
        </div>
      </div>

      {/* Exam Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración del Examen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="label mb-1">Título del examen</label>
            <p className="text-surface-900 font-medium">{EXAM_TITLE}</p>
          </div>
          <Input
            label="Porcentaje mínimo para aprobar"
            type="number"
            value={passingScore.toString()}
            onChange={(e) => setPassingScore(parseInt(e.target.value) || 0)}
            min={0}
            max={100}
            hint="El estudiante debe obtener este porcentaje o más para aprobar"
          />
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isExamActive}
                onChange={(e) => setIsExamActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
            <div>
              <p className="font-medium text-surface-900">Examen activo</p>
              <p className="text-sm text-surface-500">
                Los estudiantes pueden tomar el examen si está activo
              </p>
            </div>
          </div>

          {/* Badge Configuration */}
          <div className="pt-4 border-t border-surface-100">
            <h4 className="font-semibold text-surface-900 mb-4">Insignia del Curso (100% en examen)</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Nombre del icono"
                value={badgeIcon}
                onChange={(e) => setBadgeIcon(e.target.value)}
                placeholder="ej: emoji_events, star, trophy"
                hint={
                  <span>
                    Iconos soportados: emoji_events, star, trophy, award, flame, bolt, school, check_circle
                  </span>
                }
              />
              <Input
                label="Nombre de la insignia"
                value={badgeName}
                onChange={(e) => setBadgeName(e.target.value)}
                placeholder="ej: Maestro Financiero"
              />
            </div>
            <div className="mt-4">
              <label className="label mb-2">Colores del degradado (hexadecimal)</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-surface-500 mb-1 block">Color inicial</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={badgeColorFrom}
                      onChange={(e) => setBadgeColorFrom(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border border-surface-200"
                    />
                    <Input
                      value={badgeColorFrom}
                      onChange={(e) => setBadgeColorFrom(e.target.value)}
                      placeholder="#fcd34d"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-surface-500 mb-1 block">Color final</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={badgeColorTo}
                      onChange={(e) => setBadgeColorTo(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border border-surface-200"
                    />
                    <Input
                      value={badgeColorTo}
                      onChange={(e) => setBadgeColorTo(e.target.value)}
                      placeholder="#f59e0b"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>
            {/* Badge Preview */}
            {badgeIcon && (
              <div className="mt-4 p-4 bg-surface-50 rounded-lg">
                <p className="text-sm text-surface-500 mb-2">Vista previa:</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full p-0.5"
                    style={{ background: `linear-gradient(to bottom right, ${badgeColorFrom}, ${badgeColorTo})` }}
                  >
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                      <Icon name={badgeIcon} size={24} filled style={{ color: badgeColorTo }} />
                    </div>
                  </div>
                  <span className="font-medium text-surface-900">{badgeName || 'Sin nombre'}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-surface-100">
            <Button onClick={saveExam} isLoading={isSavingExam}>
              {exam ? 'Guardar Cambios' : 'Crear Examen'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      {exam && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Preguntas ({questions.length})</CardTitle>
              <Button size="sm" onClick={() => openQuestionModal()}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nueva Pregunta
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {questions.length === 0 ? (
              <div className="text-center py-8 text-surface-400">
                <svg
                  className="w-12 h-12 mx-auto text-surface-300 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p>No hay preguntas todavía</p>
                <Button className="mt-4" variant="secondary" onClick={() => openQuestionModal()}>
                  Agregar primera pregunta
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((question, index) => (
                  <div
                    key={question.id}
                    className="p-4 border border-surface-200 rounded-lg hover:border-surface-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-surface-500">
                            Pregunta {index + 1}
                          </span>
                        </div>
                        <p className="font-medium text-surface-900 mb-3">{question.question}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {(question.options as string[]).map((option, optIndex) => (
                            <div
                              key={optIndex}
                              className={`p-2 rounded-lg text-sm ${
                                optIndex === question.correct_option
                                  ? 'bg-green-100 text-green-700 border border-green-200'
                                  : 'bg-surface-50 text-surface-600'
                              }`}
                            >
                              <span className="font-medium mr-2">
                                {String.fromCharCode(65 + optIndex)}.
                              </span>
                              {option}
                              {optIndex === question.correct_option && (
                                <svg
                                  className="w-4 h-4 inline ml-2"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openQuestionModal(question)}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-accent-red hover:bg-red-50"
                          onClick={() => deleteQuestion(question)}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Question Modal */}
      <Modal
        isOpen={isQuestionModalOpen}
        onClose={() => setIsQuestionModalOpen(false)}
        title={editingQuestion ? 'Editar Pregunta' : 'Nueva Pregunta'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Pregunta *"
            value={questionForm.question}
            onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })}
            placeholder="Escribe la pregunta..."
            autoFocus
          />

          <div>
            <label className="label mb-2">Opciones de respuesta *</label>
            <div className="space-y-2">
              {questionForm.options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuestionForm({ ...questionForm, correct_option: index })}
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-medium transition-colors ${
                      questionForm.correct_option === index
                        ? 'bg-green-500 text-white'
                        : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                    }`}
                    title={
                      questionForm.correct_option === index
                        ? 'Respuesta correcta'
                        : 'Marcar como correcta'
                    }
                  >
                    {String.fromCharCode(65 + index)}
                  </button>
                  <Input
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Opción ${String.fromCharCode(65 + index)}`}
                    className="flex-1"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-surface-500 mt-2">
              Haz clic en la letra para marcar la respuesta correcta (verde)
            </p>
          </div>
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setIsQuestionModalOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={saveQuestion} isLoading={isSavingQuestion}>
            {editingQuestion ? 'Guardar' : 'Crear'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
