import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_STAREMPIRE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_STAREMPIRE_ANON_KEY!;

// Cliente Supabase para StarEmpire (base de datos separada)
export const supabaseStarEmpire = createClient(supabaseUrl, supabaseAnonKey);

export type SupabaseStarEmpireClient = typeof supabaseStarEmpire;
