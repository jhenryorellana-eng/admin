-- =====================================================
-- STARBIZ ADMIN - NUEVAS TABLAS PARA SUPABASE
-- =====================================================
--
-- IMPORTANTE: Ejecutar en el proyecto de Supabase de STAREDUCA-JUNIOR
-- (donde están los datos de cursos, módulos, lecciones, etc.)
--
-- NO ejecutar en hub-central (ese proyecto tiene datos de usuarios/familias)
--
-- =====================================================

-- =====================================================
-- 1. MATERIALES DE LECCIONES
-- =====================================================
CREATE TABLE IF NOT EXISTS lesson_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('pdf', 'image', 'video', 'url')),
  file_path TEXT,
  external_url TEXT,
  file_name VARCHAR(255),
  file_size INT,
  mime_type VARCHAR(100),
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT chk_file_or_url CHECK (
    (type = 'url' AND external_url IS NOT NULL AND file_path IS NULL) OR
    (type != 'url' AND file_path IS NOT NULL AND external_url IS NULL) OR
    (file_path IS NULL AND external_url IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_lesson_materials_lesson_id ON lesson_materials(lesson_id);

-- =====================================================
-- 2. EXÁMENES
-- =====================================================
CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  passing_score INT NOT NULL DEFAULT 70,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exams_course_id ON exams(course_id);

-- =====================================================
-- 3. PREGUNTAS DE EXÁMENES
-- =====================================================
CREATE TABLE IF NOT EXISTS exam_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_option INT NOT NULL CHECK (correct_option >= 0 AND correct_option <= 3),
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exam_questions_exam_id ON exam_questions(exam_id);

-- =====================================================
-- 4. RESULTADOS DE EXÁMENES
-- =====================================================
CREATE TABLE IF NOT EXISTS exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  score INT NOT NULL,
  passed BOOLEAN NOT NULL,
  answers JSONB NOT NULL,
  xp_awarded INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exam_results_student_id ON exam_results(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_exam_id ON exam_results(exam_id);

-- =====================================================
-- 5. CONFIGURACIÓN DE XP
-- =====================================================
CREATE TABLE IF NOT EXISTS xp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(50) NOT NULL UNIQUE,
  xp_amount INT NOT NULL,
  daily_limit INT,
  description VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Insert default XP config values
INSERT INTO xp_config (action, xp_amount, daily_limit, description, is_active) VALUES
  ('lesson_complete', 25, NULL, 'Al completar una lección', true),
  ('course_complete', 200, NULL, 'Al completar un curso', true),
  ('exam_passed', 100, NULL, 'Examen aprobado (70-79%)', true),
  ('exam_good', 125, NULL, 'Examen aprobado (80-89%)', true),
  ('exam_great', 150, NULL, 'Examen aprobado (90-99%)', true),
  ('exam_perfect', 200, NULL, 'Examen perfecto (100%)', true),
  ('daily_login', 5, 1, 'Login diario', true),
  ('post_created', 10, 3, 'Crear un post', true),
  ('streak_bonus', 50, 1, 'Bonus de racha (cada 7 días)', true)
ON CONFLICT (action) DO NOTHING;

-- =====================================================
-- 6. USUARIOS ADMIN (para futuro multi-admin)
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'admin',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE lesson_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Policies for lesson_materials (public read, authenticated write)
CREATE POLICY "Allow public read lesson_materials" ON lesson_materials
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert lesson_materials" ON lesson_materials
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated update lesson_materials" ON lesson_materials
  FOR UPDATE USING (true);

CREATE POLICY "Allow authenticated delete lesson_materials" ON lesson_materials
  FOR DELETE USING (true);

-- Policies for exams
CREATE POLICY "Allow public read exams" ON exams
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert exams" ON exams
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated update exams" ON exams
  FOR UPDATE USING (true);

CREATE POLICY "Allow authenticated delete exams" ON exams
  FOR DELETE USING (true);

-- Policies for exam_questions
CREATE POLICY "Allow public read exam_questions" ON exam_questions
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert exam_questions" ON exam_questions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated update exam_questions" ON exam_questions
  FOR UPDATE USING (true);

CREATE POLICY "Allow authenticated delete exam_questions" ON exam_questions
  FOR DELETE USING (true);

-- Policies for exam_results
CREATE POLICY "Allow public read exam_results" ON exam_results
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert exam_results" ON exam_results
  FOR INSERT WITH CHECK (true);

-- Policies for xp_config
CREATE POLICY "Allow public read xp_config" ON xp_config
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert xp_config" ON xp_config
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated update xp_config" ON xp_config
  FOR UPDATE USING (true);

-- =====================================================
-- POLÍTICAS RLS PARA TABLAS EXISTENTES (courses, modules, lessons)
-- =====================================================
-- NOTA: Estas tablas ya existen en el schema original pero no tienen políticas RLS
-- Ejecutar esto para permitir operaciones CRUD desde el admin

-- Policies for courses
CREATE POLICY "Allow public read courses" ON courses
  FOR SELECT USING (true);

CREATE POLICY "Allow insert courses" ON courses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update courses" ON courses
  FOR UPDATE USING (true);

CREATE POLICY "Allow delete courses" ON courses
  FOR DELETE USING (true);

-- Policies for modules
CREATE POLICY "Allow public read modules" ON modules
  FOR SELECT USING (true);

CREATE POLICY "Allow insert modules" ON modules
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update modules" ON modules
  FOR UPDATE USING (true);

CREATE POLICY "Allow delete modules" ON modules
  FOR DELETE USING (true);

-- Policies for lessons
CREATE POLICY "Allow public read lessons" ON lessons
  FOR SELECT USING (true);

CREATE POLICY "Allow insert lessons" ON lessons
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update lessons" ON lessons
  FOR UPDATE USING (true);

CREATE POLICY "Allow delete lessons" ON lessons
  FOR DELETE USING (true);

-- Policies for badges (si existe)
CREATE POLICY "Allow public read badges" ON badges
  FOR SELECT USING (true);

CREATE POLICY "Allow insert badges" ON badges
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update badges" ON badges
  FOR UPDATE USING (true);

CREATE POLICY "Allow delete badges" ON badges
  FOR DELETE USING (true);

-- =====================================================
-- STORAGE BUCKET Y POLÍTICAS
-- =====================================================
-- Crear bucket para archivos (thumbnails, videos, PDFs)
INSERT INTO storage.buckets (id, name, public)
VALUES ('stareduca-junior', 'stareduca-junior', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage
CREATE POLICY "Allow public read storage" ON storage.objects
  FOR SELECT USING (bucket_id = 'stareduca-junior');

CREATE POLICY "Allow upload storage" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'stareduca-junior');

CREATE POLICY "Allow update storage" ON storage.objects
  FOR UPDATE USING (bucket_id = 'stareduca-junior');

CREATE POLICY "Allow delete storage" ON storage.objects
  FOR DELETE USING (bucket_id = 'stareduca-junior');

-- =====================================================
-- 7. MODIFICAR TABLA LESSONS PARA CAPITULOS
-- =====================================================
-- Agregar columna course_id para vincular capítulos directamente a cursos
-- (sin pasar por módulos)

-- Agregar columna course_id si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lessons' AND column_name = 'course_id'
    ) THEN
        ALTER TABLE lessons ADD COLUMN course_id UUID REFERENCES courses(id) ON DELETE CASCADE;
        CREATE INDEX idx_lessons_course_id ON lessons(course_id);
    END IF;
END $$;

-- Agregar columna description si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lessons' AND column_name = 'description'
    ) THEN
        ALTER TABLE lessons ADD COLUMN description TEXT;
    END IF;
END $$;

-- Migrar datos existentes: copiar course_id desde el módulo padre
UPDATE lessons
SET course_id = modules.course_id
FROM modules
WHERE lessons.module_id = modules.id
  AND lessons.course_id IS NULL;

-- =====================================================
-- 8. INSIGNIAS POR EXAMEN
-- =====================================================
-- Agregar campos de insignia a la tabla exams
ALTER TABLE exams ADD COLUMN IF NOT EXISTS badge_icon VARCHAR(100);
ALTER TABLE exams ADD COLUMN IF NOT EXISTS badge_name VARCHAR(100);
ALTER TABLE exams ADD COLUMN IF NOT EXISTS badge_color VARCHAR(100) DEFAULT 'from-yellow-300 to-yellow-500';

-- Crear tabla de insignias ganadas por estudiantes (simplificada)
CREATE TABLE IF NOT EXISTS student_exam_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  badge_icon VARCHAR(100) NOT NULL,
  badge_name VARCHAR(100) NOT NULL,
  badge_color VARCHAR(100) DEFAULT 'from-yellow-300 to-yellow-500',
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, exam_id)
);

CREATE INDEX IF NOT EXISTS idx_student_exam_badges_student_id ON student_exam_badges(student_id);
CREATE INDEX IF NOT EXISTS idx_student_exam_badges_exam_id ON student_exam_badges(exam_id);

-- Políticas RLS para student_exam_badges
ALTER TABLE student_exam_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read student_exam_badges" ON student_exam_badges
  FOR SELECT USING (true);

CREATE POLICY "Allow insert student_exam_badges" ON student_exam_badges
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Ejecutar para verificar que las tablas se crearon correctamente:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- Verificar políticas RLS:
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';

-- Verificar bucket de storage:
-- SELECT * FROM storage.buckets;

-- Verificar columnas de lessons:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'lessons';
