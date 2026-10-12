'use client';

import React, { useState } from 'react';
import {
  Calendar,
  Copy,
  MoreVertical,
  Pencil,
  Trash2,
  Store,
  Sparkles,
  ArrowRight,
  Target,
  CheckCircle2,
  Plane,
  Plus,
} from 'lucide-react';
import { ListType, ShoppingList } from '@/types/grocery';
import { calculateListTotals, formatCurrency } from '@/lib/storage';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { getTemplates } from '@/lib/templates';

interface ListsManagerProps {
  lists: ShoppingList[];
  activeListId: string;
  onSelectList: (id: string) => void;
  onCreateList: (title: string, type: ListType, location?: string, targetBudget?: number) => void;
  onDuplicateList: (id: string) => void;
  onDeleteList: (id: string) => void;
  onEditList: (id: string) => void;
  onLoadTemplate: (templateType: string) => void;
  isNewModalOpen: boolean;
  onCloseNewModal: () => void;
  onOpenNewModal: () => void;
  listFilter: ListType;
  onFilterChange: (filter: ListType) => void;
}

export function ListsManager({
  lists,
  activeListId,
  onSelectList,
  onCreateList,
  onDuplicateList,
  onDeleteList,
  onEditList,
  onLoadTemplate,
  isNewModalOpen,
  onCloseNewModal,
  onOpenNewModal,
  listFilter,
  onFilterChange,
}: ListsManagerProps) {
  const [listToDelete, setListToDelete] = useState<ShoppingList | null>(null);
  const [openListMenuId, setOpenListMenuId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<ListType>('market');
  const [newMarket, setNewMarket] = useState('');
  const [newBudget, setNewBudget] = useState('');
  const templates = getTemplates();

  const closeNewModal = () => {
    setNewTitle('');
    setNewType('market');
    setNewMarket('');
    setNewBudget('');
    onCloseNewModal();
  };

  const openNewModal = () => {
    setNewType(listFilter);
    setNewMarket('');
    onOpenNewModal();
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const budget = newBudget ? parseFloat(newBudget.replace(',', '.')) : undefined;
    onCreateList(newTitle.trim(), newType, newMarket.trim() || undefined, budget);
    closeNewModal();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-28">
      <div className="mb-5 flex items-center justify-between gap-3" aria-label="Filtrar listas por tipo">
        <div className="flex items-center gap-2">
        {([['market', 'Mercado'], ['travel', 'Viagem']] as const).map(([value, label]) => (
          <button key={value} type="button" onClick={() => onFilterChange(value)} className={`rounded-full px-3 py-1.5 text-xs font-bold border ${listFilter === value ? 'bg-emerald-50 text-emerald-900 border-emerald-300' : 'bg-white text-slate-600 border-slate-200'}`}>{label}</button>
        ))}
        </div>
        <button type="button" onClick={openNewModal} className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-colors active:scale-95 ${listFilter === 'travel' ? 'travel-accent-bg hover:opacity-90' : 'bg-emerald-600 hover:bg-emerald-700'}`}><Plus size={15} strokeWidth={2.5} />Novo</button>
      </div>
      {/* Grid of Shopping Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {lists.filter(list => (list.type || 'market') === listFilter).map(list => {
          const totals = calculateListTotals(list.items);
          const isTravel = list.type === 'travel';
          const tripEntries = list.travelEntries || [];
          const completedTripEntries = tripEntries.filter(entry => entry.done).length;
          const tripTotal = tripEntries.reduce((sum, entry) => sum + entry.amount, 0);
          const progress = isTravel ? (tripEntries.length ? Math.round(completedTripEntries / tripEntries.length * 100) : 0) : totals.percentDone;
          const isActive = list.id === activeListId;

          return (
            <div
              key={list.id}
              onClick={() => onSelectList(list.id)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer relative group flex flex-col justify-between ${
                isActive
                  ? 'bg-white border-emerald-500 shadow-sm ring-2 ring-emerald-500/20'
                  : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
              }`}
            >
              <div>
                {/* List Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-extrabold text-slate-900 truncate">
                        {list.title}
                      </h2>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${isTravel ? 'travel-accent-surface' : 'bg-emerald-50 text-emerald-800'}`}>{isTravel ? 'Viagem' : 'Mercado'}</span>
                      {list.accessRole && list.accessRole !== 'owner' && <span className="text-[10px] font-extrabold bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full shrink-0">Compartilhada · {list.accessRole === 'editor' ? 'edição' : 'leitura'}</span>}
                    </div>

                    {(isTravel ? list.destination : list.marketName) && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 truncate">
                        {isTravel ? <Plane size={13} className="text-slate-400 shrink-0" /> : <Store size={13} className="text-slate-400 shrink-0" />}
                        <span className="truncate">{isTravel ? list.destination : list.marketName}</span>
                      </div>
                    )}
                  </div>

                  <div className="relative shrink-0" onClick={event => event.stopPropagation()}>
                    <button type="button" onClick={() => setOpenListMenuId(current => current === list.id ? null : list.id)} aria-label={`Opções da lista ${list.title}`} aria-expanded={openListMenuId === list.id} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"><MoreVertical size={17} /></button>
                    {openListMenuId === list.id && <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                      <button type="button" onClick={() => { setOpenListMenuId(null); onEditList(list.id); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50"><Pencil size={15} />Editar</button>
                      <button type="button" onClick={() => { setOpenListMenuId(null); onDuplicateList(list.id); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50"><Copy size={15} />Duplicar</button>
                      <button type="button" onClick={() => { setOpenListMenuId(null); setListToDelete(list); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-rose-700 hover:bg-rose-50"><Trash2 size={15} />Excluir</button>
                    </div>}
                  </div>

                </div>

                {/* Progress bar */}
                <div className="mt-3 mb-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>
                      {isTravel ? `${completedTripEntries} de ${tripEntries.length} atividades concluídas` : `${totals.checkedCount} de ${totals.itemCount} itens comprados`}
                    </span>
                    <span className="font-bold text-slate-700">{progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`${isTravel ? 'travel-accent-bg' : 'bg-emerald-500'} h-full rounded-full transition-all duration-300`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Totals & Open CTA */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block uppercase">
                    {isTravel ? 'Gastos registrados' : 'Total Estimado'}
                  </span>
                  <span className="text-base font-extrabold text-slate-900 tabular-nums">
                    {formatCurrency(isTravel ? tripTotal : totals.totalEstimated)}
                  </span>
                </div>

                <div className={`flex items-center gap-1 text-xs font-bold group-hover:translate-x-0.5 transition-transform ${isTravel ? 'travel-accent-text' : 'text-emerald-700'}`}>
                  <span>{isTravel ? 'Abrir Viagem' : 'Abrir Lista'}</span>
                  <ArrowRight size={14} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Pre-made Templates Section */}
      {listFilter !== 'travel' && <div className="bg-emerald-50/60 rounded-2xl p-5 border border-emerald-100">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={16} className="text-emerald-700" />
          <h2 className="text-sm font-extrabold text-emerald-950">
            Modelos Prontos de Lista (Criar com 1 Clique)
          </h2>
        </div>
        <p className="text-xs text-slate-600 mb-4">
          Crie rapidamente uma lista nova já preenchida com itens essenciais, fotos e estimativas de preço:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {templates.map(template => (
            <button key={template.id} onClick={() => onLoadTemplate(template.id)} className="p-3 bg-white rounded-xl border border-emerald-200/80 hover:border-emerald-500 hover:shadow-xs transition-all text-left group">
              <span className="text-base block mb-1">{template.emoji}</span>
              <span className="text-xs font-extrabold text-slate-800 block group-hover:text-emerald-700">{template.name}</span>
              <span className="text-[11px] text-slate-500">{template.description}</span>
            </button>
          ))}
        </div>
      </div>}

      {/* New List Modal */}
      {isNewModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in"
          onClick={closeNewModal}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-xl border border-slate-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-extrabold text-slate-900">{newType === 'travel' ? 'Nova Viagem' : 'Nova Lista de Compras'}</h2>
              <button
                onClick={closeNewModal}
                className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {newType === 'travel' ? 'Nome da Viagem' : 'Título da Lista'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder={newType === 'travel' ? 'Ex: Férias em Salvador' : 'Ex: Mercado Mensal, Feira de Sábado'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {newType === 'travel' ? 'Destino (opcional)' : 'Mercado / Local (Opcional)'}
                </label>
                <input
                  type="text"
                  value={newMarket}
                  onChange={e => setNewMarket(e.target.value)}
                  placeholder={newType === 'travel' ? 'Ex: Rio de Janeiro, Portugal' : 'Ex: Assaí Atacadista, Carrefour, Feira Livre'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Orçamento (opcional)
                </label>
                <input
                  type="text"
                  value={newBudget}
                  onChange={e => {
                    const cleaned = e.target.value.replace(/[^0-9,.]/g, '');
                    setNewBudget(cleaned);
                  }}
                  placeholder="Ex: 200,00"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeNewModal}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
                >
                  Criar Lista
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={!!listToDelete}
        onClose={() => setListToDelete(null)}
        onConfirm={() => {
          if (listToDelete) {
            onDeleteList(listToDelete.id);
            setListToDelete(null);
          }
        }}
        title={listToDelete?.title || ''}
        itemCount={listToDelete?.type === 'travel' ? (listToDelete.travelEntries?.length || 0) : (listToDelete?.items?.length || 0)}
        listType={listToDelete?.type || 'market'}
      />

    </div>
  );
}
