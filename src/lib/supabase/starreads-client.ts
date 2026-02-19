import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_STARREADS_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_STARREADS_ANON_KEY!;

// Cliente Supabase para StarReads (base de datos separada)
export const supabaseStarReads = createClient(supabaseUrl, supabaseAnonKey);

export type SupabaseStarReadsClient = typeof supabaseStarReads;
