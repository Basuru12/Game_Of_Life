// Creates one shared Supabase client for the app (needs config.js loaded first).

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
