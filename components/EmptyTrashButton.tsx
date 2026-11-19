'use client';

import { useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { EmptyTrashPreview, emptyTrash, previewEmptyTrash } from '@/lib/trash';
import { usePageScrollLock } from '@/hooks/use-page-scroll-lock';

export function EmptyTrashButton({ disabled, onBusyChange, onEmptied }: {
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
  onEmptied: () => Promise<void>;
}) {
  const [preview, setPreview] = useState<EmptyTrashPreview | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [purging, setPurging] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const busy = useRef(false);
  const close = () => { if (!busy.current) { setPreview(null); onBusyChange(false); } };
  usePageScrollLock(!!preview, close);

  const prepare = async () => {
    if (disabled || busy.current) return;
    busy.current = true;
    onBusyChange(true);
    setPreparing(true);
    setError('');
    setNotice('');
    let opened = false;
    try {
      const result = await previewEmptyTrash();
      if (result.count) { setPreview(result); opened = true; }
      else setNotice('Não há registros da sua conta que você possa apagar definitivamente.');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível conferir a lixeira.');
    } finally { busy.current = false; onBusyChange(opened); setPreparing(false); }
  };

  const confirm = async () => {
    if (!preview || busy.current) return;
    busy.current = true;
    onBusyChange(true);
    setPurging(true);
    setError('');
    try {
      const count = await emptyTrash(preview.cutoff);
      setPreview(null);
      setNotice(`${count} ${count === 1 ? 'registro removido' : 'registros removidos'} definitivamente. O histórico foi mantido.`);
      await onEmptied();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível esvaziar a lixeira.');
    } finally { busy.current = false; onBusyChange(false); setPurging(false); }
  };

  return <div className="contents">
    <button type="button" disabled={disabled || preparing || purging || !!preview} onClick={() => void prepare()} className="inline-flex h-[42px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-700 disabled:opacity-40"><Trash2 size={15} />{preparing ? 'Aguarde...' : 'Esvaziar'}</button>
    {notice && <p role="status" className="col-span-full rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}
    {error && !preview && <p role="alert" className="col-span-full text-sm text-rose-700">{error}</p>}
    {preview && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4" onClick={close}>
      <div role="dialog" aria-modal="true" aria-labelledby="empty-trash-title" onClick={event => event.stopPropagation()} className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <h2 id="empty-trash-title" className="font-extrabold text-slate-900">Esvaziar lixeira?</h2>
        <p className="mt-3 text-sm text-slate-600">Serão removidos definitivamente <strong>{preview.count} registros</strong> da sua conta, incluindo os de outras páginas e fora da busca atual.</p>
        <p className="mt-2 text-sm font-semibold text-rose-700">Eles não poderão mais ser restaurados pela lixeira.</p>
        <p className="mt-2 text-xs text-slate-500">O histórico será mantido. Cópias de outros proprietários e exclusões posteriores à abertura desta confirmação não serão removidas.</p>
        {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row"><button type="button" autoFocus disabled={purging} onClick={close} className="flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-bold text-slate-700">Cancelar</button><button type="button" disabled={purging} onClick={() => void confirm()} className="flex-1 rounded-xl bg-rose-600 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-50">{purging ? 'Esvaziando…' : 'Esvaziar definitivamente'}</button></div>
      </div>
    </div>}
  </div>;
}
