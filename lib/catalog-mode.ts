// Set NEXT_PUBLIC_SHARED_CATALOG_EDIT=false to restore per-user catalog edits.
// The database switch must also be disabled when returning to personal mode.
export const SHARED_CATALOG_EDIT = process.env.NEXT_PUBLIC_SHARED_CATALOG_EDIT !== 'false'
  && Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
