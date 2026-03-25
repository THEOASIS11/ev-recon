import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

// Client-side: uses anon key, respects RLS
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side: uses service_role key, bypasses RLS
// ONLY use this in API routes, NEVER expose to client
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
