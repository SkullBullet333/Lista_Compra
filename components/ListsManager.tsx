'use client';

import React, { useState } from 'react';
import {
  Plus,
  ShoppingCart,
  Copy,
  Trash2,
  Calendar,
  Store,
  Sparkles,
  ArrowRight,
  Target,
  CheckCircle2,
} from 'lucide-react';
import { ShoppingList } from '@/types/grocery';
import { calculateListTotals, formatCurrency } from '@/lib/storage';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface ListsManagerProps {
  lists: ShoppingList[];
  activeListId: string;
  onSelectList: (id: string) => void;
  onCreateList: (title: string, marketName?: string, targetBudget?: number) => void;
  onDuplicateList: (id: string) => void;
  onDeleteList: (id: string) => void;
  onLoadTemplate: (templateType: 'churrasco' | 'feira' | 'basica' | 'cafe') => void;
}

export function ListsManager({
  lists,
  activeListId,
  onSelectList,
  onCreateList,
  onDuplicateList,
  onDeleteList,
  onLoadTemplate,
}: ListsManagerProps) {
  const [showNewModal, setShowNewModal] = useState(false);
  const [listToDelete, setListToDelete] = useState<ShoppingList | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newMarket, setNewMarket] = useState('');
  const [newBudget, setNewBudget] = useState('');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const budget = newBudget ? parseFloat(newBudget.replace(',', '.')) : undefined;
    onCreateList(newTitle.trim(), newMarket.trim() || undefined, budget);
    setNewTitle('');
    setNewMarket('');
    setNewBudget('');
    setShowNewModal(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-28">
      {/* Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Minhas Listas de Compras
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Gerencie múltiplos mercados, orçamentos e listas recorrentes
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Criar Nova Lista</span>
        </button>
      </div>

      {/* Grid of Shopping Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {lists.map(list => {
          const totals = calculateListTotals(list.items);
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
                      {isActive && (
                        <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full shrink-0">
                          Ativa
                        </span>
                      )}
                    </div>

                    {list.marketName && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 truncate">
                        <Store size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate">{list.marketName}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions (Duplicate, Delete) */}
                  <div
                    className="flex items-center gap-1"
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => onDuplicateList(list.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      title="Duplicar lista"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setListToDelete(list)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Excluir lista"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3 mb-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>
                      {totals.checkedCount} de {totals.itemCount} itens comprados
                    </span>
                    <span className="font-bold text-slate-700">{totals.percentDone}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${totals.percentDone}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Totals & Open CTA */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block uppercase">
                    Total Estimado
                  </span>
                  <span className="text-base font-extrabold text-slate-900 tabular-nums">
                    {formatCurrency(totals.totalEstimated)}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-xs font-bold text-emerald-700 group-hover:translate-x-0.5 transition-transform">
                  <span>Abrir Lista</span>
                  <ArrowRight size={14} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Pre-made Templates Section */}
      <div className="bg-emerald-50/60 rounded-2xl p-5 border border-emerald-100">
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
          <button
            onClick={() => onLoadTemplate('feira')}
            className="p-3 bg-white rounded-xl border border-emerald-200/80 hover:border-emerald-500 hover:shadow-xs transition-all text-left group"
          >
            <span className="text-base block mb-1">🍎</span>
            <span className="text-xs font-extrabold text-slate-800 block group-hover:text-emerald-700">
              Feira Saudável
            </span>
            <span className="text-[11px] text-slate-500">Frutas & legumes</span>
          </button>

          <button
            onClick={() => onLoadTemplate('churrasco')}
            className="p-3 bg-white rounded-xl border border-emerald-200/80 hover:border-emerald-500 hover:shadow-xs transition-all text-left group"
          >
            <span className="text-base block mb-1">🥩</span>
            <span className="text-xs font-extrabold text-slate-800 block group-hover:text-emerald-700">
              Churrasco Amigos
            </span>
            <span className="text-[11px] text-slate-500">Carnes & bebidas</span>
          </button>

          <button
            onClick={() => onLoadTemplate('basica')}
            className="p-3 bg-white rounded-xl border border-emerald-200/80 hover:border-emerald-500 hover:shadow-xs transition-all text-left group"
          >
            <span className="text-base block mb-1">🛒</span>
            <span className="text-xs font-extrabold text-slate-800 block group-hover:text-emerald-700">
              Despensa Básica
            </span>
            <span className="text-[11px] text-slate-500">Arroz, feijão, café</span>
          </button>

          <button
            onClick={() => onLoadTemplate('cafe')}
            className="p-3 bg-white rounded-xl border border-emerald-200/80 hover:border-emerald-500 hover:shadow-xs transition-all text-left group"
          >
            <span className="text-base block mb-1">☕</span>
            <span className="text-xs font-extrabold text-slate-800 block group-hover:text-emerald-700">
              Café & Lanche
            </span>
            <span className="text-[11px] text-slate-500">Pães, queijo, leite</span>
          </button>
        </div>
      </div>

      {/* New List Modal */}
      {showNewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in"
          onClick={() => setShowNewModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-xl border border-slate-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-extrabold text-slate-900">Nova Lista de Compras</h2>
              <button
                onClick={() => setShowNewModal(false)}
                className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Título da Lista <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Ex: Mercado Mensal, Feira de Sábado"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mercado / Local (Opcional)
                </label>
                <input
                  type="text"
                  value={newMarket}
                  onChange={e => setNewMarket(e.target.value)}
                  placeholder="Ex: Assaí Atacadista, Carrefour, Feira Livre"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Orçamento / Teto Planejado (R$)
                </label>
                <input
                  type="text"
                  value={newBudget}
                  onChange={e => {
                    const cleaned = e.target.value.replace(/[^0-9,.]/g, '');
                    setNewBudget(cleaned);
                  }}
                  placeholder="Ex: 200,00 (opcional)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
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

      {/* Modal de Confirmação de Exclusão (sem dependência de window.confirm) */}
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
        itemCount={listToDelete?.items?.length || 0}
      />
    </div>
  );
}
