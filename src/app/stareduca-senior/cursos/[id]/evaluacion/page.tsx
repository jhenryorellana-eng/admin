'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabaseSenior } from '@/lib/supabase/senior-client';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Textarea,
  Modal,
  ModalFooter,
  Spinner,
} from '@/components/ui';
import { useToastStore, useConfirmStore } from '@/stores/admin-store';

interface Evaluation {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  passing_score: number;
}

interface EvaluationQuestion {
  id: string;
  evaluation_id: string;
  question: string;
  options: string[];
  correct_answer: number;
  order_index: number;
}

export default function EvaluacionSeniorPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const { addToast } = useToastStore();
  const { openConfirm } = useConfirmStore();

  const [courseTitle, setCourseTitle] = useState('');
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [questions, setQuestions] = useState<EvaluationQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Evaluation form
  const [evalTitle, setEvalTitle] = useState('Evaluación Final');
  const [evalDescription, setEvalDescription] = useState('');
  const [passingScore, setPassingScore] = useState(70);
  const [isSavingEval, setIsSavingEval] = useState(false);

  // Question Modal
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<EvaluationQuestion | null>(null);
  const [questionForm, setQuestionForm] = useState({
    question: '',
    options: ['', '', '', ''],
    correct_answer: 0,
  });
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);

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

      const { data: evalData } = await supabaseSenior
        .from('evaluations')
        .select('*')
        .eq('course_id', courseId)
        .single();

      if (evalData) {
        setEvaluation(evalData);
        setEvalTitle(evalData.title);
        setEvalDescription(evalData.description || '');
        setPassingScore(evalData.passing_score);

        const { data: questionsData } = await supabaseSenior
          .from('evaluation_questions')
          .select('*')
          .eq('evaluation_id', evalData.id)
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

  const saveEvaluation = async () => {
    if (!evalTitle.trim()) {
      addToast({ type: 'error', title: 'Error', message: 'El título es obligatorio' });
      return;
    }

    setIsSavingEval(true);

    try {
      if (evaluation) {
        const { error } = await supabaseSenior
          .from('evaluations')
          .update({
            title: evalTitle,
            description: evalDescription || null,
            passing_score: passingScore,
          })
          .eq('id', evaluation.id);

        if (error) throw error;

        setEvaluation({
          ...evaluation,
          title: evalTitle,
          description: evalDescription || null,
          passing_score: passingScore,
        });
        addToast({ type: 'success', title: 'Evaluación actualizada' });
      } else {
        const { data, error } = await supabaseSenior
          .from('evaluations')
          .insert({
            course_id: courseId,
            title: evalTitle,
            description: evalDescription || null,
            passing_score: passingScore,
          })
          .select()
          .single();

        if (error) throw error;

        setEvaluation(data);

        // Update course to mark it has evaluation
        await supabaseSenior
          .from('courses')
          .update({ has_evaluation: true })
          .eq('id', courseId);

        addToast({ type: 'success', title: 'Evaluación creada' });
      }
    } catch (error: any) {
      addToast({ type: 'error', title: 'Error', message: error.message });
    } finally {
      setIsSavingEval(false);
    }
  };

  const openQuestionModal = (question?: EvaluationQuestion) => {
    if (question) {
      setEditingQuestion(question);
      setQuestionForm({
        question: question.question,
        options: question.options,
        correct_answer: question.correct_answer,
      });
    } else {
      setEditingQuestion(null);
      setQuestionForm({
        question: '',
        options: ['', '', '', ''],
        correct_answer: 0,
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

    if (!evaluation) {
      addToast({ type: 'error', title: 'Error', message: 'Primero debes crear la evaluación' });
      return;
    }

    setIsSavingQuestion(true);

    try {
      if (editingQuestion) {
        const { error } = await supabaseSenior
          .from('evaluation_questions')
          .update({
            question: questionForm.question,
            options: questionForm.options,
            correct_answer: questionForm.correct_answer,
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
                  correct_answer: questionForm.correct_answer,
                }
              : q
          )
        );
        addToast({ type: 'success', title: 'Pregunta actualizada' });
      } else {
        const orderIndex = questions.length;
        const { data, error } = await supabaseSenior
          .from('evaluation_questions')
          .insert({
            evaluation_id: evaluation.id,
            question: questionForm.question,
            options: questionForm.options,
            correct_answer: questionForm.correct_answer,
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

  const deleteQuestion = (question: EvaluationQuestion) => {
    openConfirm('Eliminar pregunta', '¿Estás seguro de eliminar esta pregunta?', async () => {
      try {
        const { error } = await supabaseSenior
          .from('evaluation_questions')
          .delete()
          .eq('id', question.id);
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
          onClick={() => router.push(`/stareduca-senior/cursos/${courseId}`)}
          className="p-2 hover:bg-surface-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Evaluación del Curso</h1>
          <p className="text-surface-500">{courseTitle}</p>
        </div>
      </div>

      {/* Evaluation Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración de la Evaluación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Título de la evaluación *"
            value={evalTitle}
            onChange={(e) => setEvalTitle(e.target.value)}
            placeholder="Ej: Evaluación Final"
          />

          <Textarea
            label="Descripción (opcional)"
            value={evalDescription}
            onChange={(e) => setEvalDescription(e.target.value)}
            placeholder="Describe brevemente el propósito de esta evaluación..."
            rows={3}
          />

          <Input
            label="Porcentaje mínimo para aprobar"
            type="number"
            value={passingScore.toString()}
            onChange={(e) => setPassingScore(parseInt(e.target.value) || 0)}
            min={0}
            max={100}
            hint="El padre debe obtener este porcentaje o más para aprobar"
          />

          <div className="flex justify-end pt-4 border-t border-surface-100">
            <Button onClick={saveEvaluation} isLoading={isSavingEval}>
              {evaluation ? 'Guardar Cambios' : 'Crear Evaluación'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      {evaluation && (
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
                          {question.options.map((option, optIndex) => (
                            <div
                              key={optIndex}
                              className={`p-2 rounded-lg text-sm ${
                                optIndex === question.correct_answer
                                  ? 'bg-green-100 text-green-700 border border-green-200'
                                  : 'bg-surface-50 text-surface-600'
                              }`}
                            >
                              <span className="font-medium mr-2">
                                {String.fromCharCode(65 + optIndex)}.
                              </span>
                              {option}
                              {optIndex === question.correct_answer && (
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
          <Textarea
            label="Pregunta *"
            value={questionForm.question}
            onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })}
            placeholder="Escribe la pregunta..."
            rows={2}
            autoFocus
          />

          <div>
            <label className="label mb-2">Opciones de respuesta *</label>
            <div className="space-y-2">
              {questionForm.options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuestionForm({ ...questionForm, correct_answer: index })}
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-medium transition-colors ${
                      questionForm.correct_answer === index
                        ? 'bg-green-500 text-white'
                        : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                    }`}
                    title={
                      questionForm.correct_answer === index
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
