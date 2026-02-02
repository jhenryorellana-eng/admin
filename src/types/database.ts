export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type CourseCategory =
  | 'finanzas'
  | 'emprendimiento'
  | 'liderazgo'
  | 'tecnologia'
  | 'creatividad'
  | 'comunicacion';

export type BadgeCategory =
  | 'learning'
  | 'social'
  | 'streak'
  | 'achievement'
  | 'special';

export type BadgeRarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary';

export type MaterialType = 'pdf' | 'image' | 'video' | 'url';

export interface Database {
  public: {
    Tables: {
      students: {
        Row: {
          id: string
          external_id: string
          first_name: string
          last_name: string
          email: string | null
          date_of_birth: string | null
          code: string
          family_id: string
          avatar_url: string | null
          xp_total: number
          current_level: number
          current_streak: number
          max_streak: number
          last_activity_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['students']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['students']['Row']>
      }
      courses: {
        Row: {
          id: string
          title: string
          slug: string
          description: string | null
          thumbnail_url: string | null
          category: CourseCategory
          xp_reward: number
          is_published: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['courses']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['courses']['Row']>
      }
      modules: {
        Row: {
          id: string
          course_id: string
          title: string
          order_index: number
        }
        Insert: Omit<Database['public']['Tables']['modules']['Row'], 'id'> & { id?: string }
        Update: Partial<Database['public']['Tables']['modules']['Row']>
      }
      lessons: {
        Row: {
          id: string
          module_id: string
          title: string
          video_url: string | null
          duration_minutes: number | null
          xp_reward: number
          order_index: number
        }
        Insert: Omit<Database['public']['Tables']['lessons']['Row'], 'id'> & { id?: string }
        Update: Partial<Database['public']['Tables']['lessons']['Row']>
      }
      lesson_materials: {
        Row: {
          id: string
          lesson_id: string
          title: string
          type: MaterialType
          file_path: string | null
          external_url: string | null
          file_name: string | null
          file_size: number | null
          mime_type: string | null
          order_index: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['lesson_materials']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['lesson_materials']['Row']>
      }
      exams: {
        Row: {
          id: string
          course_id: string
          title: string
          passing_score: number
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['exams']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['exams']['Row']>
      }
      exam_questions: {
        Row: {
          id: string
          exam_id: string
          question: string
          options: string[]
          correct_option: number
          order_index: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['exam_questions']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['exam_questions']['Row']>
      }
      exam_results: {
        Row: {
          id: string
          student_id: string
          exam_id: string
          score: number
          passed: boolean
          answers: Json
          xp_awarded: number
          completed_at: string
        }
        Insert: Omit<Database['public']['Tables']['exam_results']['Row'], 'id' | 'completed_at'> & {
          id?: string
          completed_at?: string
        }
        Update: Partial<Database['public']['Tables']['exam_results']['Row']>
      }
      badges: {
        Row: {
          id: string
          name: string
          description: string | null
          icon: string
          category: BadgeCategory
          rarity: BadgeRarity
          criteria: Json
        }
        Insert: Omit<Database['public']['Tables']['badges']['Row'], 'id'> & { id?: string }
        Update: Partial<Database['public']['Tables']['badges']['Row']>
      }
      student_badges: {
        Row: {
          student_id: string
          badge_id: string
          earned_at: string
        }
        Insert: Database['public']['Tables']['student_badges']['Row']
        Update: Partial<Database['public']['Tables']['student_badges']['Row']>
      }
      xp_config: {
        Row: {
          id: string
          action: string
          xp_amount: number
          daily_limit: number | null
          description: string | null
          is_active: boolean
        }
        Insert: Omit<Database['public']['Tables']['xp_config']['Row'], 'id'> & { id?: string }
        Update: Partial<Database['public']['Tables']['xp_config']['Row']>
      }
      enrollments: {
        Row: {
          id: string
          student_id: string
          course_id: string
          progress_percent: number
          status: string
        }
        Insert: Omit<Database['public']['Tables']['enrollments']['Row'], 'id'> & { id?: string }
        Update: Partial<Database['public']['Tables']['enrollments']['Row']>
      }
      lesson_progress: {
        Row: {
          id: string
          student_id: string
          lesson_id: string
          is_completed: boolean
          completed_at: string | null
          watch_time_seconds: number
        }
        Insert: Omit<Database['public']['Tables']['lesson_progress']['Row'], 'id'> & { id?: string }
        Update: Partial<Database['public']['Tables']['lesson_progress']['Row']>
      }
      xp_transactions: {
        Row: {
          id: string
          student_id: string
          amount: number
          reason: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['xp_transactions']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['xp_transactions']['Row']>
      }
      posts: {
        Row: {
          id: string
          student_id: string
          content: string
          image_url: string | null
          reaction_count: number
          comment_count: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['posts']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['posts']['Row']>
      }
      admin_users: {
        Row: {
          id: string
          email: string
          password_hash: string
          name: string
          role: string
          is_active: boolean
          created_at: string
          last_login: string | null
        }
        Insert: Omit<Database['public']['Tables']['admin_users']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['admin_users']['Row']>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
