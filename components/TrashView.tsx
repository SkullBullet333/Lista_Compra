'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw, Search, Trash2, X } from 'lucide-react';
import { loadTrashRecords, restoreTrashRecord, TrashRecord, trashRecordListType, trashRecordName, TRASH_PAGE_SIZE, TRASH_TABLE_LABELS } from '@/lib/trash';
import { usePageScrollLock } from '@/hooks/use-page-scroll-lock';
import { EmptyTrashButton } from '@/components/EmptyTrashButton';

export function TrashView() {
  const [records, setRecords] = useState<TrashRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [selected, setSelected] = useState<TrashRecord | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [emptying, setEmptying] = useState(false);
  const busy = useRef(false);
  const generation = useRef(0);
  const nextOffset = useRef(0);
  usePageScrollLock(!!selected, () => { if (!busy.current) setSelected(null); });

  const refresh = useCallback(async (append = false) => {
    const version = ++generation.current;
    setLoading(true);
    setError('');
    try {
      const offset = append ? nextOffset.current : 0;
      const next = await loadTrashRecords(offset);
      if (version !== generation.current) return;
      nextOffset.current = offset + next.length;
      setRecords(current => append ? [...current, ...next.filter(record => !current.some(item => item.id === record.id))] : next);
      setHasMore(next.length === TRASH_PAGE_SIZE);
    } catch (failure) {
      if (version === generation.current) setError(failure instanceof Error ? failure.message : 'Não foi possível carregar a lixeira.');
    } finally {
      if (version === generation.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const version = ++generation.current;
    void loadTrashRecords().then(next => {
      if (cancelled || version !== generation.current) return;
      nextOffset.current = next.length;
      setRecords(next);
      setHasMore(next.length === TRASH_PAGE_SIZE);
    }).catch(failure => {
      if (!cancelled && version === generation.current) setError(failure instanceof Error ? failure.message : 'Não foi possível carregar a lixeira.');
    }).finally(() => {
      if (!cancelled && version === generation.current) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const restore = async () => {
    if (!selected || busy.current) return;
    busy.current = true;
    setRestoring(true);
    setError('');
    try {
      const result = await restoreTrashRecord(selected.id);
      setNotice(result.refreshWarning || `“${trashRecordName(selected)}” foi restaurado.`);
      setSelected(null);
      await refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível restaurar o registro.');
    } finally {
      busy.current = false;
      setRestoring(false);
    }
  };

  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
  const listTypeLabel = (record: TrashRecord) => ({ market: 'Mercado', travel: 'Viagem' })[trashRecordListType(record) || 'market'];
  const restoreColor = (record: TrashRecord) => {
    const type = trashRecordListType(record);
    return type === 'travel' ? 'travel-accent-bg' : type === 'market' ? 'market-accent-bg' : 'bg-slate-100 text-slate-700';
  };
  const visible = records.filter(record => normalize(`${trashRecordName(record)} ${record.origin_list_name || ""} ${TRASH_TABLE_LABELS[record.source_table]} ${trashRecordListType(record) ? listTypeLabel(record) : ""}`).includes(normalize(search.trim())));

  return <section className="space-y-4">
    {notice && <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}
    {error && !selected && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
    <label className="relative block min-w-0"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="search" value={search} onChange={event => setSearch(event.target.value)} aria-label="Buscar na lixeira" placeholder="Buscar nos registros carregados" className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900" /></label>
    <EmptyTrashButton disabled={loading || restoring || !records.length} onBusyChange={setEmptying} onEmptied={async () => { setSearch(''); setNotice(''); await refresh(); }} />
    </div>
    <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {visible.map(record => <div key={record.id} className="flex items-center gap-3 px-3 py-3 sm:px-4">
        <Trash2 size={17} className="shrink-0 text-slate-400" />
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800">{trashRecordName(record)}</p><p className="text-xs text-slate-500">{TRASH_TABLE_LABELS[record.source_table]}{trashRecordListType(record) && ` · ${listTypeLabel(record)}`} · {new Date(record.deleted_at).toLocaleString('pt-BR')}</p>{['list_items', 'travel_entries'].includes(record.source_table) && <p className="truncate text-xs text-slate-500">Lista: {record.origin_list_name || 'Origem não disponível'}</p>}</div>
        <button type="button" disabled={restoring || emptying} onClick={() => { setError(''); setSelected(record); }} aria-label={`Restaurar ${trashRecordName(record)}`} title={trashRecordListType(record) ? `Restaurar ${listTypeLabel(record)}` : undefined} className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold transition-opacity hover:opacity-85 disabled:opacity-40 ${restoreColor(record)}`}><RotateCcw size={14} /><span className="hidden sm:inline">Restaurar</span></button>
      </div>)}
      {!visible.length && <p role="status" className="p-6 text-center text-sm text-slate-500">{loading ? 'Carregando lixeira…' : error ? 'A lixeira não pôde ser carregada.' : search ? 'Nenhum registro encontrado nesta página.' : 'A lixeira está vazia.'}</p>}
    </div>
    {hasMore && <button type="button" disabled={loading || restoring || emptying} onClick={() => void refresh(true)} className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-700 disabled:opacity-40">{loading ? 'Carregando…' : 'Carregar mais'}</button>}
    {selected && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4" onClick={() => { if (!busy.current) setSelected(null); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="restore-trash-title" onClick={event => event.stopPropagation()} className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between gap-2"><h2 id="restore-trash-title" className="font-extrabold text-slate-900">Restaurar registro?</h2><button type="button" disabled={restoring || emptying} aria-label="Fechar" onClick={() => setSelected(null)} className="p-1 text-slate-500"><X size={18} /></button></div>
        <p className="mt-3 text-sm text-slate-600">“{trashRecordName(selected)}” voltará ao aplicativo. Registros existentes não serão sobrescritos.</p>
        {['shopping_lists', 'list_templates'].includes(selected.source_table) && <p className="mt-2 text-xs text-slate-500">Os itens vinculados serão recuperados junto. Compartilhamentos não serão reativados automaticamente.</p>}
        {['list_members', 'list_invitations'].includes(selected.source_table) && <p className="mt-2 text-xs font-semibold text-slate-700">Esta restauração reativará o acesso ou convite de {String(selected.row_data.email || 'um participante')} à lista.</p>}
        {['list_items', 'travel_entries'].includes(selected.source_table) && <p className="mt-2 text-xs text-slate-500">Lista de origem: {selected.origin_list_name || 'Origem não disponível'}</p>}
        {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
        <div className="mt-5 flex gap-2"><button type="button" disabled={restoring || emptying} onClick={() => setSelected(null)} className="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-bold text-slate-700">Cancelar</button><button type="button" autoFocus disabled={restoring || emptying} onClick={() => void restore()} className={`flex-1 rounded-xl py-2.5 text-sm font-bold disabled:opacity-50 ${restoreColor(selected)}`}>{restoring ? 'Restaurando…' : 'Restaurar'}</button></div>
      </div>
    </div>}
  </section>;
}
