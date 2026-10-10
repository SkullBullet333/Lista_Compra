import { createClient, Session, SupabaseClient, User } from '@supabase/supabase-js';
import { getCustomCategories } from '@/lib/categories';
import { getThemePreferences } from '@/lib/preferences';
import { getSavedItemConfigs, getPriceHistory } from '@/lib/storage';
import { getTemplates } from '@/lib/templates';
import { ListCollaborator, ShoppingList } from '@/types/grocery';

let client: SupabaseClient | null | undefined;
let backupTimer: ReturnType<typeof setTimeout> | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getSupabaseClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client = url && key ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
  return client;
}

export async function getCurrentSession(): Promise<Session | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function onAuthSessionChange(callback: (session: Session | null) => void): () => void {
  const supabase = getSupabaseClient();
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}

export async function signIn(email: string, password: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase ainda não está configurado.');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUp(email: string, password: string, name: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase ainda não está configurado.');
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name: name.trim() } } });
  if (error) throw error;
  return Boolean(data.session);
}

export async function sendPasswordReset(email: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase ainda não está configurado.');
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

function dateToNumber(value: string | null | undefined): number {
  const parsed = value ? Date.parse(value) : Date.now();
  return Number.isFinite(parsed) ? parsed : Date.now();
}

export async function loadListsFromSupabase(): Promise<ShoppingList[]> {
  const supabase = getSupabaseClient();
  const session = await getCurrentSession();
  if (!supabase || !session) return [];
  const { data: listRows, error: listError } = await supabase.from('shopping_lists').select('*').order('updated_at', { ascending: false });
  if (listError) throw listError;
  if (!listRows?.length) return [];
  const ids = listRows.map(row => row.id as string);
  const [{ data: itemRows, error: itemError }, { data: travelRows, error: travelError }, { data: memberships, error: memberError }] = await Promise.all([
    supabase.from('list_items').select('*').in('list_id', ids).order('position'),
    supabase.from('travel_entries').select('*').in('list_id', ids).order('position'),
    supabase.from('list_members').select('list_id,role').eq('user_id', session.user.id),
  ]);
  if (itemError) throw itemError;
  if (travelError) throw travelError;
  if (memberError) throw memberError;
  const roles = new Map((memberships || []).map(row => [row.list_id as string, row.role as 'editor' | 'viewer']));
  return listRows.map(row => ({
    id: row.id as string, title: row.title as string, type: (row.list_type as 'market' | 'travel') || 'market',
    marketName: (row.market_name as string | null) || undefined, destination: (row.destination as string | null) || undefined,
    targetBudget: row.target_budget == null ? undefined : Number(row.target_budget), color: (row.color as string | null) || undefined,
    ownerId: row.user_id as string, accessRole: row.user_id === session.user.id ? 'owner' : (roles.get(row.id as string) || 'viewer'),
    createdAt: dateToNumber(row.created_at as string), updatedAt: dateToNumber(row.updated_at as string),
    items: (itemRows || []).filter(item => item.list_id === row.id).map(item => ({
      id: item.id as string, name: item.name as string, category: item.category_id as string, quantity: Number(item.quantity), unit: item.unit as string,
      price: Number(item.price), previousPrice: item.previous_price == null ? undefined : Number(item.previous_price), checked: Boolean(item.checked),
      imageUrl: (item.image_url as string | null) || undefined, notes: (item.notes as string | null) || undefined, createdAt: dateToNumber(item.created_at as string),
    })),
    travelEntries: (travelRows || []).filter(entry => entry.list_id === row.id).map(entry => ({
      id: entry.id as string, title: entry.title as string, date: entry.entry_date as string, time: (entry.entry_time as string | null)?.slice(0, 5) || '',
      type: entry.entry_type as 'passeio' | 'comida' | 'bebida' | 'transporte' | 'hospedagem' | 'gasto', amount: Number(entry.amount),
      notes: (entry.notes as string | null) || undefined, done: Boolean(entry.done), createdAt: dateToNumber(entry.created_at as string),
    })),
  }));
}

async function requireUser(supabase: SupabaseClient): Promise<User> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw error || new Error('Entre na sua conta para sincronizar.');
  return data.user;
}

export async function backupAppData(lists: ShoppingList[]): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  const user = await requireUser(supabase);
  for (const list of lists.filter(candidate => candidate.accessRole !== 'viewer')) {
    const { error: listError } = await supabase.from('shopping_lists').upsert({
      id: list.id, user_id: list.ownerId || user.id, title: list.title, list_type: list.type || 'market', market_name: list.marketName || null,
      destination: list.destination || null, target_budget: list.targetBudget ?? null, color: list.color || null,
      created_at: new Date(list.createdAt).toISOString(), updated_at: new Date(list.updatedAt).toISOString(),
    });
    if (listError) throw listError;
    const listItems = list.items.map((item, position) => ({
      id: item.id, list_id: list.id, user_id: user.id, name: item.name, normalized_name: item.name.trim().toLocaleLowerCase('pt-BR'),
      category_id: item.category, quantity: item.quantity, unit: item.unit, price: item.price, previous_price: item.previousPrice ?? null,
      checked: item.checked, image_url: item.imageUrl || null, notes: item.notes || null, position,
      created_at: new Date(item.createdAt).toISOString(), updated_at: new Date(list.updatedAt).toISOString(),
    }));
    if (listItems.length) {
      const { error } = await supabase.from('list_items').upsert(listItems);
      if (error) throw error;
    }
    const { data: remoteItems, error: remoteItemsError } = await supabase.from('list_items').select('id').eq('list_id', list.id);
    if (remoteItemsError) throw remoteItemsError;
    const itemIds = new Set(listItems.map(item => item.id));
    const staleItems = (remoteItems || []).map(row => row.id as string).filter(id => !itemIds.has(id));
    if (staleItems.length) {
      const { error } = await supabase.from('list_items').delete().in('id', staleItems);
      if (error) throw error;
    }
    const travelEntries = (list.travelEntries || []).map((entry, position) => ({
      id: entry.id, list_id: list.id, user_id: user.id, title: entry.title, entry_date: entry.date, entry_time: entry.time || null,
      entry_type: entry.type, amount: entry.amount, notes: entry.notes || null, done: entry.done, position,
      created_at: new Date(entry.createdAt).toISOString(), updated_at: new Date(list.updatedAt).toISOString(),
    }));
    if (travelEntries.length) {
      const { error } = await supabase.from('travel_entries').upsert(travelEntries);
      if (error) throw error;
    }
    const { data: remoteTravel, error: remoteTravelError } = await supabase.from('travel_entries').select('id').eq('list_id', list.id);
    if (remoteTravelError) throw remoteTravelError;
    const travelIds = new Set(travelEntries.map(entry => entry.id));
    const staleTravel = (remoteTravel || []).map(row => row.id as string).filter(id => !travelIds.has(id));
    if (staleTravel.length) {
      const { error } = await supabase.from('travel_entries').delete().in('id', staleTravel);
      if (error) throw error;
    }
  }
  const preferences = getThemePreferences();
  const categories = getCustomCategories();
  const items = Object.values(getSavedItemConfigs());
  const templates = getTemplates().filter(template => template.id.startsWith('custom-'));
  const prices = getPriceHistory();
  if (categories.length) await supabase.from('categories').upsert(categories.map(category => ({ id: `${user.id}:${category.id}`, user_id: user.id, name: category.label, color: category.color, is_system: false })));
  if (items.length) await supabase.from('catalog_items').upsert(items.map(item => ({ user_id: user.id, name: item.name, normalized_name: item.name.trim().toLocaleLowerCase('pt-BR'), category_id: item.category, default_unit: item.unit, default_price: item.defaultPrice || 0, image_url: item.imageUrl || null, notes: item.notes || null })), { onConflict: 'user_id,normalized_name' });
  for (const template of templates) {
    const templateId = `${user.id}:${template.id}`;
    await supabase.from('list_templates').upsert({ id: templateId, user_id: user.id, name: template.name, description: template.description, emoji: template.emoji, market_name: template.marketName || null, target_budget: template.targetBudget ?? null, is_system: false });
    await supabase.from('template_items').delete().eq('template_id', templateId).eq('user_id', user.id);
    if (template.items.length) await supabase.from('template_items').insert(template.items.map((item, position) => ({ template_id: templateId, user_id: user.id, name: item.name, category_id: item.category, quantity: item.quantity, unit: item.unit, default_price: item.price, image_url: item.imageUrl || null, notes: item.notes || null, position })));
  }
  if (prices.length) await supabase.from('price_history').upsert(prices.map(entry => ({ id: `${user.id}:${entry.id}`, user_id: user.id, list_id: lists.some(list => list.id === entry.listId) ? entry.listId : null, item_name: entry.itemName, normalized_name: entry.normalizedName, unit_price: entry.price, market_name: entry.marketName || null, recorded_at: new Date(entry.recordedAt).toISOString() })));
  const { error: preferenceError } = await supabase.from('user_preferences').upsert({ user_id: user.id, theme_mode: preferences.mode, primary_color: preferences.primaryColor });
  if (preferenceError) throw preferenceError;
  return true;
}

export async function deleteListFromSupabase(listId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const { error } = await supabase.from('shopping_lists').delete().eq('id', listId);
  if (error) throw error;
}

export function scheduleSupabaseBackup(lists: ShoppingList[]): void {
  if (!getSupabaseClient()) return;
  if (backupTimer) clearTimeout(backupTimer);
  backupTimer = setTimeout(() => { backupAppData(lists).catch(error => console.error('Falha ao sincronizar com o Supabase', error)); }, 450);
}

export function subscribeToListChanges(onChange: () => void): () => void {
  const supabase = getSupabaseClient();
  if (!supabase) return () => {};
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;
  const refresh = () => { if (refreshTimer) clearTimeout(refreshTimer); refreshTimer = setTimeout(onChange, 180); };
  const channel = supabase.channel(`lists-${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_lists' }, refresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'list_items' }, refresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'travel_entries' }, refresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'list_members' }, refresh)
    .subscribe();
  return () => { if (refreshTimer) clearTimeout(refreshTimer); void supabase.removeChannel(channel); };
}

export async function getListCollaborators(listId: string): Promise<ListCollaborator[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('get_list_collaborators', { target_list_id: listId });
  if (error) throw error;
  return (data || []).map((row: { user_id?: string; email: string; role: string; status: string }) => ({
    userId: row.user_id || undefined, email: row.email, role: row.role as 'owner' | 'editor' | 'viewer', status: row.status as 'active' | 'pending',
  }));
}

export async function shareListWithEmail(listId: string, email: string, role: 'editor' | 'viewer'): Promise<string> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase ainda não está configurado.');
  const { data, error } = await supabase.rpc('share_list_with_email', { target_list_id: listId, target_email: email, target_role: role });
  if (error) throw error;
  return String(data || 'Lista compartilhada.');
}

export async function removeListCollaborator(listId: string, email: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const { error } = await supabase.rpc('remove_list_collaborator', { target_list_id: listId, target_email: email });
  if (error) throw error;
}
