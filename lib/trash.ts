import { flushPendingSupabaseBackup, getCurrentSession, getSupabaseClient, loadCategoriesFromSupabase, loadItemConfigsFromSupabase, loadTemplatesFromSupabase } from '@/lib/supabase';

export const TRASH_TABLE_LABELS: Record<string, string> = {
  shopping_lists: 'Lista', list_items: 'Item da lista', travel_entries: 'Atividade de viagem',
  categories: 'Categoria', catalog_items: 'Produto cadastrado', list_templates: 'Modelo de lista',
  template_items: 'Item do modelo', price_history: 'Histórico de preço', profiles: 'Perfil',
  user_preferences: 'Preferências', list_members: 'Participante', list_invitations: 'Convite',
};

export interface TrashRecord {
  id: string;
  source_table: string;
  record_key: Record<string, unknown>;
  row_data: Record<string, unknown>;
  deletion_kind: 'delete' | 'soft_delete';
  deleted_at: string;
  deleted_by: string | null;
  owner_id: string | null;
  origin_list_id?: string | null;
  origin_list_name?: string | null;
  origin_list_type?: 'market' | 'travel' | null;
}

export function trashRecordName(record: TrashRecord): string {
  return String(record.row_data.title || record.row_data.name || record.row_data.item_name || record.row_data.display_name || record.row_data.email || TRASH_TABLE_LABELS[record.source_table] || 'Registro excluído');
}

export function trashRecordListType(record: TrashRecord): 'market' | 'travel' | null {
  if (record.source_table === 'shopping_lists') return record.row_data.list_type === 'travel' ? 'travel' : 'market';
  if (record.origin_list_type) return record.origin_list_type;
  if (record.source_table === 'travel_entries') return 'travel';
  if (['list_items', 'categories', 'catalog_items', 'list_templates', 'template_items', 'price_history'].includes(record.source_table)) return 'market';
  return null;
}

async function requireTrashClient() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) throw new Error('Conecte-se à internet para acessar a lixeira.');
  const client = getSupabaseClient();
  if (!client || !await getCurrentSession()) throw new Error('Entre na sua conta para acessar a lixeira.');
  return client;
}

function trashError(error: { message?: string; code?: string }): Error {
  if (['42P01', 'PGRST202', 'PGRST205'].includes(error.code || '')) {
    return new Error('A lixeira ainda não foi ativada no banco de dados.');
  }
  if (error.code === '23505') return new Error('Já existe um registro com estes dados. Nada foi sobrescrito.');
  return new Error(error.message || 'Não foi possível acessar a lixeira. Tente novamente.');
}

export const TRASH_PAGE_SIZE = 50;

export interface EmptyTrashPreview { count: number; cutoff: string }

export async function previewEmptyTrash(): Promise<EmptyTrashPreview> {
  const client = await requireTrashClient();
  await flushPendingSupabaseBackup();
  const { data, error } = await client.rpc('preview_empty_trash');
  if (error) throw trashError(error);
  if (!data || !Number.isSafeInteger(data.count) || data.count < 0 || !data.cutoff || !Number.isFinite(Date.parse(data.cutoff))) {
    throw new Error('Não foi possível conferir a lixeira. Atualize e tente novamente.');
  }
  return data as EmptyTrashPreview;
}

export async function emptyTrash(cutoff: string): Promise<number> {
  const client = await requireTrashClient();
  // The server cutoff comes from before confirmation: later deletions stay safe.
  const { data, error } = await client.rpc('empty_trash', { before_timestamp: cutoff });
  if (error) throw trashError(error);
  if (!data || !Number.isSafeInteger(data.count) || data.count < 0) throw new Error('Atualize a lixeira para conferir o resultado da limpeza.');
  return data.count;
}

export async function loadTrashRecords(offset = 0): Promise<TrashRecord[]> {
  const client = await requireTrashClient();
  await flushPendingSupabaseBackup();
  const { data, error } = await client.from('trash_bin')
    .select('id,source_table,record_key,row_data,deletion_kind,deleted_at,deleted_by,owner_id,origin_list_id,origin_list_name,origin_list_type')
    .is('restored_at', null).is('purged_at', null).is('parent_trash_id', null).is('superseded_at', null).in('source_table', Object.keys(TRASH_TABLE_LABELS))
    .order('deleted_at', { ascending: false }).order('id', { ascending: false })
    .range(offset, offset + TRASH_PAGE_SIZE - 1);
  if (error) throw trashError(error);
  return (data || []) as TrashRecord[];
}

export async function restoreTrashRecord(id: string): Promise<{ refreshWarning?: string }> {
  const client = await requireTrashClient();
  // Finish queued local deletes before restoring, so this device cannot immediately
  // send the same deletion back to the server after a successful restore.
  await flushPendingSupabaseBackup();
  const { error } = await client.rpc('restore_trash_item', { target_trash_id: id });
  if (error) throw trashError(error);
  // Lists are reloaded by the application with its existing local-edit safeguards.
  window.dispatchEvent(new Event('trash-restored'));
  try {
    await Promise.all([loadCategoriesFromSupabase(), loadItemConfigsFromSupabase(), loadTemplatesFromSupabase()]);
    return {};
  } catch {
    // A refresh failure must not report a completed database restore as failed.
    return { refreshWarning: 'O registro foi restaurado. Atualize a página para carregar os dados.' };
  }
}
