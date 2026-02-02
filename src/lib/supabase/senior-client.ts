import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_SENIOR_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_SENIOR_ANON_KEY!;

// Cliente Supabase para Stareduca Senior (base de datos separada)
export const supabaseSenior = createClient(supabaseUrl, supabaseAnonKey);

export type SupabaseSeniorClient = typeof supabaseSenior;
