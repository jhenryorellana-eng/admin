import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_STARGENIUS_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_STARGENIUS_ANON_KEY!;

// Cliente Supabase para StarGenius (base de datos separada)
export const supabaseStarGenius = createClient(supabaseUrl, supabaseAnonKey);

export type SupabaseStarGeniusClient = typeof supabaseStarGenius;
