'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Check, Clock3, MapPin, Pencil, Plus, Trash2, Wallet, X } from 'lucide-react';
import { ShoppingList, TravelEntry, TravelEntryType } from '@/types/grocery';
import { formatCurrency } from '@/lib/storage';

const ENTRY_TYPES: Record<TravelEntryType, string> = {
  passeio: 'Passeio',
  comida: 'Comida',
  bebida: 'Bebida',
  transporte: 'Transporte',
  hospedagem: 'Hospedagem',
  gasto: 'Outro gasto',
};

interface TravelViewProps {
  list: ShoppingList;
  onUpdateList: (list: ShoppingList) => void;
}

function localToday() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDay(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date(year, month - 1, day));
}

function withTravelEntries(list: ShoppingList, entries: TravelEntry[]): ShoppingList {
  return { ...list, travelEntries: entries, updatedAt: Date.now() };
}

function parseAmount(value: string): number {
  const normalized = value.includes(',') ? value.replace(/\./g, '').replace(',', '.') : value;
  const number = Number(normalized);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function TravelEntryRow({
  entry,
  onTogglePaid,
  onEdit,
  onDelete,
}: {
  entry: TravelEntry;
  onTogglePaid: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const swipeStart = useRef<{ x: number; y: number; offset: number } | null>(null);
  const handleTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    swipeStart.current = { x: touch.clientX, y: touch.clientY, offset: swipeOffset };
  };
  const handleTouchMove = (event: React.TouchEvent) => {
    if (!swipeStart.current) return;
    const touch = event.touches[0];
    const deltaX = touch.clientX - swipeStart.current.x;
    const deltaY = touch.clientY - swipeStart.current.y;
    if (Math.abs(deltaY) > Math.abs(deltaX)) return;
    setSwipeOffset(Math.max(-76, Math.min(0, swipeStart.current.offset + deltaX)));
  };
  const handleTouchEnd = () => {
    setSwipeOffset(current => current <= -38 ? -76 : 0);
    swipeStart.current = null;
  };

  return <div className="relative overflow-hidden rounded-xl">
    <button type="button" onClick={() => { setSwipeOffset(0); onDelete(); }} className="absolute inset-y-0 right-0 flex w-[76px] items-center justify-center gap-1 bg-rose-600 text-xs font-bold text-white sm:hidden" aria-label={`Excluir ${entry.title}`}><Trash2 size={15} /><span>Excluir</span></button>
    <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} style={{ transform: `translateX(${swipeOffset}px)`, touchAction: 'pan-y' }} className={`flex items-start gap-3 rounded-xl border p-3 bg-white transition-[transform,border-color] duration-150 ${entry.done ? 'travel-accent-border bg-slate-50' : 'border-slate-200'}`}>
      <button type="button" onClick={onTogglePaid} aria-label={entry.done ? `Marcar ${entry.title} como não pago` : `Marcar ${entry.title} como pago`} className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 ${entry.done ? 'travel-accent-bg text-white travel-accent-border' : 'border-slate-300 text-slate-400'}`}>{entry.done && <Check size={16} />}</button>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onEdit}><div className="flex items-center gap-2 flex-wrap"><span className={`text-sm font-bold text-slate-900 ${entry.done ? 'line-through' : ''}`}>{entry.title}</span><span className="travel-accent-surface text-[11px] rounded-full px-2 py-0.5">{ENTRY_TYPES[entry.type]}</span></div><div className="flex items-center gap-3 text-xs text-slate-500 mt-1">{entry.time && <span className="flex items-center gap-1"><Clock3 size={13} />{entry.time}</span>}{entry.amount > 0 && <span>{formatCurrency(entry.amount)}</span>}</div>{entry.notes && <p className="text-xs text-slate-600 mt-1">{entry.notes}</p>}</div>
      <button type="button" onClick={onEdit} aria-label={`Editar ${entry.title}`} className="travel-accent-text hidden sm:flex p-1.5 text-slate-500"><Pencil size={16} /></button>
      <button type="button" onClick={onDelete} aria-label={`Excluir ${entry.title}`} className="hidden sm:flex p-1.5 text-slate-500 hover:text-rose-700"><Trash2 size={16} /></button>
    </div>
  </div>;
}

export function TravelView({ list, onUpdateList }: TravelViewProps) {
  const entries = useMemo(() => list.travelEntries || [], [list.travelEntries]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(localToday);
  const [time, setTime] = useState('');
  const [type, setType] = useState<TravelEntryType>('passeio');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'unpaid' | 'paid'>('unpaid');
  const [deletedEntry, setDeletedEntry] = useState<{ entry: TravelEntry; index: number } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const groups = useMemo(() => {
    const visible = entries.filter(entry => paymentFilter === 'paid' ? entry.done : !entry.done);
    const sorted = [...visible].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.createdAt - b.createdAt);
    return Array.from(new Set(sorted.map(entry => entry.date))).map(day => ({ day, entries: sorted.filter(entry => entry.date === day) }));
  }, [entries, paymentFilter]);
  const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const completed = entries.filter(entry => entry.done).length;
  const unpaidEntries = entries.filter(entry => !entry.done);
  const paidEntries = entries.filter(entry => entry.done);
  const unpaidTotal = unpaidEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const paidTotal = paidEntries.reduce((sum, entry) => sum + entry.amount, 0);

  const resetEditor = () => {
    setIsEditorOpen(false);
    setEditingId(null);
    setTitle('');
    setDate(localToday());
    setTime('');
    setType('passeio');
    setAmount('');
    setNotes('');
  };

  const editEntry = (entry: TravelEntry) => {
    setEditingId(entry.id);
    setTitle(entry.title);
    setDate(entry.date);
    setTime(entry.time);
    setType(entry.type);
    setAmount(entry.amount ? entry.amount.toFixed(2).replace('.', ',') : '');
    setNotes(entry.notes || '');
    setIsEditorOpen(true);
  };

  const saveEntry = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !date) return;
    const now = Date.now();
    const existing = entries.find(entry => entry.id === editingId);
    const entry: TravelEntry = {
      id: existing?.id || `trip-${now}-${Math.random().toString(36).slice(2, 8)}`,
      title: title.trim(),
      date,
      time,
      type,
      amount: parseAmount(amount),
      notes: notes.trim() || undefined,
      done: existing?.done ?? false,
      paid: existing?.done ?? false,
      createdAt: existing?.createdAt || now,
    };
    onUpdateList({
      ...list,
      travelEntries: existing ? entries.map(item => item.id === existing.id ? entry : item) : [...entries, entry],
      updatedAt: now,
    });
    resetEditor();
  };

  const updateEntry = (id: string, updater: (entries: TravelEntry[]) => TravelEntry[]) => {
    onUpdateList(withTravelEntries(list, updater(entries)));
  };

  useEffect(() => () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }, []);

  const handleDeleteEntry = (id: string) => {
    const index = entries.findIndex(entry => entry.id === id);
    if (index < 0) return;
    const removed = entries[index];
    updateEntry(removed.id, items => items.filter(item => item.id !== removed.id));
    setDeletedEntry({ entry: removed, index: Math.max(index, 0) });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setDeletedEntry(null), 7000);
  };

  const undoDeleteEntry = () => {
    if (!deletedEntry) return;
    const restored = [...entries];
    restored.splice(Math.min(deletedEntry.index, restored.length), 0, deletedEntry.entry);
    onUpdateList(withTravelEntries(list, restored));
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = null;
    setDeletedEntry(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 pb-28">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <p className="travel-accent-text text-xs font-bold uppercase tracking-wider">Roteiro de viagem</p>
          {list.destination && <p className="text-sm text-slate-600 flex items-center gap-1 mt-1"><MapPin size={14} />{list.destination}</p>}
        </div>
        <button type="button" onClick={() => { resetEditor(); setIsEditorOpen(true); }} className="travel-accent-bg flex items-center gap-2 rounded-xl hover:opacity-90 text-white px-4 py-2.5 text-sm font-bold">
          <Plus size={17} /> Novo
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-4"><span className="text-xs text-slate-500 flex items-center gap-1"><CalendarDays size={15} /> Programado</span><strong className="block text-xl text-slate-900 mt-1">{completed} / {entries.length}</strong></div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4"><span className="text-xs text-slate-500 flex items-center gap-1"><Wallet size={15} /> Gastos registrados</span><strong className="block text-xl text-slate-900 mt-1">{formatCurrency(total)}</strong>{list.targetBudget ? <span className="text-[11px] text-slate-500">Orçamento: {formatCurrency(list.targetBudget)}</span> : null}</div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-5" role="tablist" aria-label="Situação dos pagamentos">
        <button type="button" role="tab" aria-selected={paymentFilter === 'unpaid'} onClick={() => setPaymentFilter('unpaid')} className={`travel-payment-card travel-payment-card--unpaid rounded-xl border p-3 text-left transition-colors ${paymentFilter === 'unpaid' ? 'is-active' : ''}`}>
          <span className="block text-xs font-bold">Não pagos ({unpaidEntries.length})</span>
          <strong className="block mt-1 text-base">{formatCurrency(unpaidTotal)}</strong>
        </button>
        <button type="button" role="tab" aria-selected={paymentFilter === 'paid'} onClick={() => setPaymentFilter('paid')} className={`travel-payment-card travel-payment-card--paid rounded-xl border p-3 text-left transition-colors ${paymentFilter === 'paid' ? 'is-active' : ''}`}>
          <span className="block text-xs font-bold">Pagos ({paidEntries.length})</span>
          <strong className="block mt-1 text-base">{formatCurrency(paidTotal)}</strong>
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center"><CalendarDays className="travel-accent-text mx-auto mb-3" size={30} /><h2 className="font-extrabold text-slate-900">{entries.length ? `Nenhum lançamento ${paymentFilter === 'paid' ? 'pago' : 'não pago'}` : 'Sua viagem ainda não tem atividades'}</h2><p className="text-sm text-slate-500 mt-1">{entries.length ? 'Use a outra opção para consultar os demais lançamentos.' : 'Adicione passeios, refeições, bebidas e outros gastos organizados por data.'}</p></div>
      ) : groups.map(({ day, entries: dayEntries }) => (
        <section key={day} className="mb-5">
          <div className="flex items-center justify-between gap-2 mb-2"><h2 className="text-sm font-extrabold text-slate-800 capitalize">{formatDay(day)}</h2><span className="text-xs font-bold text-slate-600">{formatCurrency(dayEntries.reduce((sum, entry) => sum + entry.amount, 0))}</span></div>
          <div className="space-y-2">
            {dayEntries.map(entry => <TravelEntryRow key={entry.id} entry={entry} onTogglePaid={() => updateEntry(entry.id, items => items.map(item => item.id === entry.id ? { ...item, done: !item.done, paid: !item.done } : item))} onEdit={() => editEntry(entry)} onDelete={() => handleDeleteEntry(entry.id)} />)}
          </div>
        </section>
      ))}

      {isEditorOpen && <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-end sm:items-center sm:justify-center" onClick={resetEditor}>
        <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 max-h-[90dvh] overflow-y-auto" onClick={event => event.stopPropagation()}>
          <div className="flex items-center justify-between mb-4"><h2 className="font-extrabold text-slate-900">{editingId ? 'Editar atividade' : 'Adicionar atividade'}</h2><button type="button" onClick={resetEditor} aria-label="Fechar" className="text-slate-500"><X size={20} /></button></div>
          <form onSubmit={saveEntry} className="space-y-3">
            <label className="block text-xs font-bold text-slate-700">Nome *<input required autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="Ex: Visitar museu, almoço, táxi" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900" /></label>
            <div className="grid grid-cols-2 gap-3"><label className="block text-xs font-bold text-slate-700">Data *<input required type="date" value={date} onChange={event => setDate(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-2 py-2.5 text-sm text-slate-900" /></label><label className="block text-xs font-bold text-slate-700">Horário (opcional)<input type="time" value={time} onChange={event => setTime(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-2 py-2.5 text-sm text-slate-900" /></label></div>
            <label className="block text-xs font-bold text-slate-700">Tipo<select value={type} onChange={event => setType(event.target.value as TravelEntryType)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900">{(Object.keys(ENTRY_TYPES) as TravelEntryType[]).map(key => <option key={key} value={key}>{ENTRY_TYPES[key]}</option>)}</select></label>
            <label className="block text-xs font-bold text-slate-700">Valor (R$)<input inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value.replace(/[^0-9,.]/g, ''))} placeholder="0,00" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900" /></label>
            <label className="block text-xs font-bold text-slate-700">Anotação<input value={notes} onChange={event => setNotes(event.target.value)} placeholder="Endereço, reserva ou detalhes" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900" /></label>
            <button type="submit" className="travel-accent-bg w-full rounded-xl hover:opacity-90 text-white py-3 font-bold text-sm">Salvar atividade</button>
          </form>
        </div>
      </div>}

      {deletedEntry && <div role="status" className="app-undo-toast fixed bottom-5 left-1/2 z-70 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-3 rounded-xl px-4 py-3 text-sm shadow-2xl">
        <span className="min-w-0 flex-1 truncate">“{deletedEntry.entry.title}” foi excluído.</span>
        <button type="button" onClick={undoDeleteEntry} className="app-undo-toast__action shrink-0 font-extrabold">Desfazer</button>
      </div>}
    </div>
  );
}
