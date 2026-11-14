'use client';

import React, { useState } from 'react';
import { prepareProductPhoto } from '@/lib/product-photo';

export function ProductPhotoEditor({ value, onChange, onBusyChange }: {
  value: string;
  onChange: (value: string) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const selectPhoto = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    onBusyChange(true);
    setError('');
    try {
      onChange(await prepareProductPhoto(file));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível abrir a foto.');
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  };
  return <fieldset disabled={busy} className="space-y-2">
    <legend className="text-xs font-bold text-slate-700">Foto do produto</legend>
    <label className="block text-xs text-slate-600">Link da imagem
      <input type="url" value={value.startsWith('data:') ? '' : value} onChange={event => { setError(''); onChange(event.target.value); }} placeholder="https://..." className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900" />
    </label>
    <div className="flex gap-2">
      {([true, false] as const).map(camera => <label key={String(camera)} className="cursor-pointer rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">
        {camera ? 'Tirar foto' : 'Escolher da galeria'}
        <input type="file" accept="image/*" capture={camera ? 'environment' : undefined} className="hidden" onChange={event => { void selectPhoto(event.target.files?.[0]); event.currentTarget.value = ''; }} />
      </label>)}
    </div>
    {value && <div className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img key={value} src={value} alt="Foto do produto" referrerPolicy="no-referrer" onError={() => setError('Imagem indisponível. Escolha outra foto ou confira o link.')} className="h-24 w-24 rounded-xl border border-slate-200 object-cover" />
      <button type="button" onClick={() => { onChange(''); setError(''); }} className="text-xs font-bold text-rose-700">Remover foto</button>
    </div>}
    {busy && <p role="status" className="text-xs text-slate-600">Preparando foto...</p>}
    {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
  </fieldset>;
}
