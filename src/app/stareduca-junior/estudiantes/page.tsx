'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Tables } from '@/types/database';
import {
  Button,
  Card,
  CardContent,
  Input,
  Modal,
  ModalFooter,
  Spinner,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui';
import { formatDate, formatNumber, getInitials } from '@/lib/utils';

type Student = Tables<'students'>;

interface StudentWithDetails extends Student {
  badges_count?: number;
  courses_enrolled?: number;
}

export default function EstudiantesPage() {
  const [students, setStudents] = useState<StudentWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'xp' | 'level' | 'streak' | 'recent'>('recent');

  // Detail Modal
  const [selectedStudent, setSelectedStudent] = useState<StudentWithDetails | null>(null);
  const [studentDetails, setStudentDetails] = useState<{
    enrollments: any[];
    badges: any[];
    recentXp: any[];
  } | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  async function fetchStudents() {
    try {
      const { data: studentsData, error } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch badges and enrollments counts
      const { data: badgesData } = await supabase
        .from('student_badges')
        .select('student_id');

      const { data: enrollmentsData } = await supabase
        .from('enrollments')
        .select('student_id');

      const studentsWithCounts = (studentsData || []).map((student) => ({
        ...student,
        badges_count: badgesData?.filter((b) => b.student_id === student.id).length || 0,
        courses_enrolled: enrollmentsData?.filter((e) => e.student_id === student.id).length || 0,
      }));

      setStudents(studentsWithCounts);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const openStudentDetails = async (student: StudentWithDetails) => {
    setSelectedStudent(student);
    setIsLoadingDetails(true);

    try {
      // Fetch enrollments with course details
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('*, courses(*)')
        .eq('student_id', student.id);

      // Fetch badges
      const { data: studentBadges } = await supabase
        .from('student_badges')
        .select('*, badges(*)')
        .eq('student_id', student.id);

      // Fetch recent XP transactions
      const { data: xpTransactions } = await supabase
        .from('xp_transactions')
        .select('*')
        .eq('student_id', student.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setStudentDetails({
        enrollments: enrollments || [],
        badges: studentBadges || [],
        recentXp: xpTransactions || [],
      });
    } catch (error) {
      console.error('Error fetching student details:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Filter and sort students
  const filteredStudents = students
    .filter((student) => {
      const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
      const searchLower = search.toLowerCase();
      return (
        fullName.includes(searchLower) ||
        student.code.toLowerCase().includes(searchLower) ||
        student.email?.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'xp':
          return b.xp_total - a.xp_total;
        case 'level':
          return b.current_level - a.current_level;
        case 'streak':
          return b.current_streak - a.current_streak;
        case 'recent':
        default:
          return new Date(b.last_activity_date || 0).getTime() - new Date(a.last_activity_date || 0).getTime();
      }
    });

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
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Estudiantes</h1>
        <p className="text-surface-500 mt-1">
          Consulta el progreso y estadísticas de los estudiantes
        </p>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar por nombre, código o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
          </div>
          <div className="flex gap-2">
            {[
              { value: 'recent', label: 'Recientes' },
              { value: 'xp', label: 'Más XP' },
              { value: 'level', label: 'Mayor nivel' },
              { value: 'streak', label: 'Mayor racha' },
            ].map((option) => (
              <Button
                key={option.value}
                variant={sortBy === option.value ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setSortBy(option.value as any)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Students Table */}
      {filteredStudents.length === 0 ? (
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
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <p className="mt-4 text-surface-500">No se encontraron estudiantes</p>
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Estudiante</TableHead>
              <TableHead>Código</TableHead>
              <TableHead className="text-center">Nivel</TableHead>
              <TableHead className="text-center">XP</TableHead>
              <TableHead className="text-center">Racha</TableHead>
              <TableHead className="text-center">Cursos</TableHead>
              <TableHead className="text-center">Badges</TableHead>
              <TableHead>Última actividad</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.map((student) => (
              <TableRow key={student.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-medium">
                      {student.avatar_url ? (
                        <img
                          src={student.avatar_url}
                          alt={student.first_name}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        getInitials(`${student.first_name} ${student.last_name}`)
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-surface-900">
                        {student.first_name} {student.last_name}
                      </p>
                      {student.email && (
                        <p className="text-xs text-surface-400">{student.email}</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <code className="text-xs bg-surface-100 px-2 py-1 rounded">
                    {student.code}
                  </code>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="purple">{student.current_level}</Badge>
                </TableCell>
                <TableCell className="text-center font-medium text-primary">
                  {formatNumber(student.xp_total)}
                </TableCell>
                <TableCell className="text-center">
                  {student.current_streak > 0 ? (
                    <span className="flex items-center justify-center gap-1 text-accent-orange">
                      🔥 {student.current_streak}
                    </span>
                  ) : (
                    <span className="text-surface-400">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">{student.courses_enrolled || 0}</TableCell>
                <TableCell className="text-center">{student.badges_count || 0}</TableCell>
                <TableCell className="text-surface-500 text-sm">
                  {student.last_activity_date
                    ? formatDate(student.last_activity_date)
                    : 'Nunca'}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openStudentDetails(student)}
                  >
                    Ver detalle
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Student Detail Modal */}
      <Modal
        isOpen={!!selectedStudent}
        onClose={() => {
          setSelectedStudent(null);
          setStudentDetails(null);
        }}
        title="Detalle del Estudiante"
        size="lg"
      >
        {selectedStudent && (
          <div className="space-y-6">
            {/* Student Header */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xl font-bold">
                {selectedStudent.avatar_url ? (
                  <img
                    src={selectedStudent.avatar_url}
                    alt={selectedStudent.first_name}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  getInitials(`${selectedStudent.first_name} ${selectedStudent.last_name}`)
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold text-surface-900">
                  {selectedStudent.first_name} {selectedStudent.last_name}
                </h3>
                <p className="text-surface-500">{selectedStudent.email}</p>
                <code className="text-xs bg-surface-100 px-2 py-1 rounded mt-1 inline-block">
                  {selectedStudent.code}
                </code>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 bg-surface-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-primary">{selectedStudent.current_level}</p>
                <p className="text-xs text-surface-500">Nivel</p>
              </div>
              <div className="p-4 bg-surface-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-surface-900">
                  {formatNumber(selectedStudent.xp_total)}
                </p>
                <p className="text-xs text-surface-500">XP Total</p>
              </div>
              <div className="p-4 bg-surface-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-accent-orange">
                  {selectedStudent.current_streak} 🔥
                </p>
                <p className="text-xs text-surface-500">Racha actual</p>
              </div>
              <div className="p-4 bg-surface-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-surface-900">{selectedStudent.max_streak}</p>
                <p className="text-xs text-surface-500">Racha máxima</p>
              </div>
            </div>

            {isLoadingDetails ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : studentDetails ? (
              <>
                {/* Enrolled Courses */}
                <div>
                  <h4 className="font-semibold text-surface-900 mb-3">
                    Cursos Inscritos ({studentDetails.enrollments.length})
                  </h4>
                  {studentDetails.enrollments.length === 0 ? (
                    <p className="text-surface-400 text-sm">No hay cursos inscritos</p>
                  ) : (
                    <div className="space-y-2">
                      {studentDetails.enrollments.map((enrollment: any) => (
                        <div
                          key={enrollment.id}
                          className="flex items-center justify-between p-3 bg-surface-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-surface-900">
                              {enrollment.courses?.title || 'Curso'}
                            </p>
                            <Badge variant={enrollment.status === 'completed' ? 'success' : 'info'} size="sm">
                              {enrollment.status}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary">{enrollment.progress_percent}%</p>
                            <div className="w-24 h-2 bg-surface-200 rounded-full mt-1">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${enrollment.progress_percent}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Badges */}
                <div>
                  <h4 className="font-semibold text-surface-900 mb-3">
                    Badges Obtenidos ({studentDetails.badges.length})
                  </h4>
                  {studentDetails.badges.length === 0 ? (
                    <p className="text-surface-400 text-sm">No tiene badges todavía</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {studentDetails.badges.map((sb: any) => (
                        <div
                          key={sb.badge_id}
                          className="flex items-center gap-2 px-3 py-2 bg-surface-50 rounded-lg"
                          title={sb.badges?.description}
                        >
                          <span className="text-xl">{sb.badges?.icon}</span>
                          <span className="text-sm font-medium">{sb.badges?.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent XP */}
                <div>
                  <h4 className="font-semibold text-surface-900 mb-3">Historial de XP Reciente</h4>
                  {studentDetails.recentXp.length === 0 ? (
                    <p className="text-surface-400 text-sm">No hay transacciones de XP</p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {studentDetails.recentXp.map((tx: any) => (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between p-2 hover:bg-surface-50 rounded"
                        >
                          <div>
                            <p className="text-sm text-surface-700">{tx.reason}</p>
                            <p className="text-xs text-surface-400">
                              {formatDate(tx.created_at)}
                            </p>
                          </div>
                          <span className="font-bold text-primary">+{tx.amount} XP</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        )}
        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => {
              setSelectedStudent(null);
              setStudentDetails(null);
            }}
          >
            Cerrar
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
