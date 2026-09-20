import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Client Initializer
 * Supports both environment variables (.env) and localStorage override
 */
export function getSupabaseCredentials() {
  const envUrl = import.meta.env?.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

  const localUrl = typeof window !== 'undefined' ? localStorage.getItem('pos_supabase_url') || '' : '';
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('pos_supabase_anon_key') || '' : '';

  const url = (localUrl || envUrl).trim();
  const key = (localKey || envKey).trim();

  const isConfigured = Boolean(
    url &&
    key &&
    url.startsWith('http') &&
    !url.includes('your-project-id') &&
    !url.includes('example.com')
  );

  return { url, key, isConfigured, isFromEnv: !localUrl && Boolean(envUrl) };
}

let creds = getSupabaseCredentials();
export let supabaseUrl = creds.url;
export let supabaseAnonKey = creds.key;
export let isSupabaseConfigured = creds.isConfigured;

export let supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

/**
 * Re-initialize Supabase client dynamically with new credentials
 */
export function configureSupabase(newUrl, newKey) {
  if (typeof window !== 'undefined') {
    if (newUrl) localStorage.setItem('pos_supabase_url', newUrl.trim());
    else localStorage.removeItem('pos_supabase_url');

    if (newKey) localStorage.setItem('pos_supabase_anon_key', newKey.trim());
    else localStorage.removeItem('pos_supabase_anon_key');
  }

  creds = getSupabaseCredentials();
  supabaseUrl = creds.url;
  supabaseAnonKey = creds.key;
  isSupabaseConfigured = creds.isConfigured;

  if (isSupabaseConfigured) {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
      realtime: { params: { eventsPerSecond: 10 } },
    });
  } else {
    supabase = null;
  }

  return isSupabaseConfigured;
}

/**
 * Test connectivity with Supabase
 */
export async function testSupabaseConnection() {
  const currentCreds = getSupabaseCredentials();
  if (!currentCreds.isConfigured || !supabase) {
    return { success: false, message: 'Supabase credentials are incomplete or invalid.' };
  }

  try {
    const { data, error } = await supabase
      .from('settings')
      .select('id')
      .limit(1);

    if (error) {
      if (error.code === '42P01') {
        return {
          success: false,
          message: 'Connected to Supabase, but tables are missing. Please run supabase_schema.sql in the SQL Editor.',
        };
      }
      return { success: false, message: error.message || 'Error querying database' };
    }

    return { success: true, message: 'Successfully connected to Supabase database!' };
  } catch (err) {
    return { success: false, message: err.message || 'Connection failed' };
  }
}

