'use client';

import React, { useMemo, useState } from 'react';
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
  const [paid, setPaid] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<'unpaid' | 'paid'>('unpaid');

  const groups = useMemo(() => {
    const visible = entries.filter(entry => paymentFilter === 'paid' ? Boolean(entry.paid) : !entry.paid);
    const sorted = [...visible].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.createdAt - b.createdAt);
    return Array.from(new Set(sorted.map(entry => entry.date))).map(day => ({ day, entries: sorted.filter(entry => entry.date === day) }));
  }, [entries, paymentFilter]);
  const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const completed = entries.filter(entry => entry.done).length;
  const unpaidEntries = entries.filter(entry => !entry.paid);
  const paidEntries = entries.filter(entry => Boolean(entry.paid));
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
    setPaid(false);
  };

  const editEntry = (entry: TravelEntry) => {
    setEditingId(entry.id);
    setTitle(entry.title);
    setDate(entry.date);
    setTime(entry.time);
    setType(entry.type);
    setAmount(entry.amount ? entry.amount.toFixed(2).replace('.', ',') : '');
    setNotes(entry.notes || '');
    setPaid(Boolean(entry.paid));
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
      paid,
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 pb-28">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-sky-700">Roteiro de viagem</p>
          {list.destination && <p className="text-sm text-slate-600 flex items-center gap-1 mt-1"><MapPin size={14} />{list.destination}</p>}
        </div>
        <button type="button" onClick={() => { resetEditor(); setIsEditorOpen(true); }} className="flex items-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white px-4 py-2.5 text-sm font-bold">
          <Plus size={17} /> Adicionar atividade
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-4"><span className="text-xs text-slate-500 flex items-center gap-1"><CalendarDays size={15} /> Programado</span><strong className="block text-xl text-slate-900 mt-1">{completed} / {entries.length}</strong></div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4"><span className="text-xs text-slate-500 flex items-center gap-1"><Wallet size={15} /> Gastos registrados</span><strong className="block text-xl text-slate-900 mt-1">{formatCurrency(total)}</strong>{list.targetBudget ? <span className="text-[11px] text-slate-500">Orçamento: {formatCurrency(list.targetBudget)}</span> : null}</div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-5" role="tablist" aria-label="Situação dos pagamentos">
        <button type="button" role="tab" aria-selected={paymentFilter === 'unpaid'} onClick={() => setPaymentFilter('unpaid')} className={`rounded-xl border p-3 text-left transition-colors ${paymentFilter === 'unpaid' ? 'border-amber-400 bg-amber-50 text-amber-900' : 'border-slate-200 bg-white text-slate-600'}`}>
          <span className="block text-xs font-bold">Não pagos ({unpaidEntries.length})</span>
          <strong className="block mt-1 text-base">{formatCurrency(unpaidTotal)}</strong>
        </button>
        <button type="button" role="tab" aria-selected={paymentFilter === 'paid'} onClick={() => setPaymentFilter('paid')} className={`rounded-xl border p-3 text-left transition-colors ${paymentFilter === 'paid' ? 'border-emerald-400 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white text-slate-600'}`}>
          <span className="block text-xs font-bold">Pagos ({paidEntries.length})</span>
          <strong className="block mt-1 text-base">{formatCurrency(paidTotal)}</strong>
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center"><CalendarDays className="mx-auto text-sky-600 mb-3" size={30} /><h2 className="font-extrabold text-slate-900">{entries.length ? `Nenhum lançamento ${paymentFilter === 'paid' ? 'pago' : 'não pago'}` : 'Sua viagem ainda não tem atividades'}</h2><p className="text-sm text-slate-500 mt-1">{entries.length ? 'Use a outra opção para consultar os demais lançamentos.' : 'Adicione passeios, refeições, bebidas e outros gastos organizados por data.'}</p></div>
      ) : groups.map(({ day, entries: dayEntries }) => (
        <section key={day} className="mb-5">
          <div className="flex items-center justify-between gap-2 mb-2"><h2 className="text-sm font-extrabold text-slate-800 capitalize">{formatDay(day)}</h2><span className="text-xs font-bold text-slate-600">{formatCurrency(dayEntries.reduce((sum, entry) => sum + entry.amount, 0))}</span></div>
          <div className="space-y-2">
            {dayEntries.map(entry => (
              <div key={entry.id} className={`flex items-start gap-3 rounded-xl border p-3 bg-white ${entry.done ? 'border-sky-200 opacity-70' : 'border-slate-200'}`}>
                <button type="button" onClick={() => updateEntry(entry.id, items => items.map(item => item.id === entry.id ? { ...item, done: !item.done } : item))} aria-label={entry.done ? `Marcar ${entry.title} como pendente` : `Concluir ${entry.title}`} className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 ${entry.done ? 'bg-sky-600 text-white border-sky-600' : 'border-slate-300 text-slate-400'}`}>{entry.done && <Check size={16} />}</button>
                <div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><span className={`text-sm font-bold text-slate-900 ${entry.done ? 'line-through' : ''}`}>{entry.title}</span><span className="text-[11px] rounded-full bg-sky-50 text-sky-800 px-2 py-0.5">{ENTRY_TYPES[entry.type]}</span><span className={`text-[11px] rounded-full px-2 py-0.5 ${entry.paid ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>{entry.paid ? 'Pago' : 'Não pago'}</span></div><div className="flex items-center gap-3 text-xs text-slate-500 mt-1">{entry.time && <span className="flex items-center gap-1"><Clock3 size={13} />{entry.time}</span>}{entry.amount > 0 && <span>{formatCurrency(entry.amount)}</span>}</div>{entry.notes && <p className="text-xs text-slate-600 mt-1">{entry.notes}</p>}</div>
                <button type="button" onClick={() => updateEntry(entry.id, items => items.map(item => item.id === entry.id ? { ...item, paid: !item.paid } : item))} aria-label={entry.paid ? `Marcar ${entry.title} como não pago` : `Marcar ${entry.title} como pago`} className={`p-1.5 rounded-lg ${entry.paid ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'}`}><Wallet size={16} /></button>
                <button type="button" onClick={() => editEntry(entry)} aria-label={`Editar ${entry.title}`} className="p-1.5 text-slate-500 hover:text-sky-700"><Pencil size={16} /></button>
                <button type="button" onClick={() => updateEntry(entry.id, items => items.filter(item => item.id !== entry.id))} aria-label={`Excluir ${entry.title}`} className="p-1.5 text-slate-500 hover:text-rose-700"><Trash2 size={16} /></button>
              </div>
            ))}
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
            <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-700"><span>Pagamento realizado</span><input type="checkbox" checked={paid} onChange={event => setPaid(event.target.checked)} className="h-5 w-5 accent-emerald-600" /></label>
            <label className="block text-xs font-bold text-slate-700">Anotação<input value={notes} onChange={event => setNotes(event.target.value)} placeholder="Endereço, reserva ou detalhes" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900" /></label>
            <button type="submit" className="w-full rounded-xl bg-sky-600 hover:bg-sky-700 text-white py-3 font-bold text-sm">Salvar atividade</button>
          </form>
        </div>
      </div>}
    </div>
  );
}
