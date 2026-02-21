import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_STARVOICES_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_STARVOICES_ANON_KEY!;

// Cliente Supabase para StarVoices (base de datos separada)
export const supabaseStarVoices = createClient(supabaseUrl, supabaseAnonKey);

export type SupabaseStarVoicesClient = typeof supabaseStarVoices;
