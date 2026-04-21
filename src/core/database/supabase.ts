import { createClient } from '@supabase/supabase-js';

function validateSupabaseConfig() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL');
  }
  if (!anonKey) {
    throw new Error('Missing EXPO_PUBLIC_SUPABASE_ANON_KEY');
  }

  return { url, anonKey };
}

const config = validateSupabaseConfig();
export const supabase = createClient(config.url, config.anonKey);
