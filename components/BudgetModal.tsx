'use client';

import { usePageScrollLock } from '@/hooks/use-page-scroll-lock';

import React, { useState } from 'react';
import { X, Target, Store, Check } from 'lucide-react';
import { ShoppingList } from '@/types/grocery';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  list: ShoppingList;
  onSave: (targetBudget: number | undefined, marketName: string | undefined, title: string) => void;
}

function BudgetModalForm({
  list,
  onClose,
  onSave,
}: {
  list: ShoppingList;
  onClose: () => void;
  onSave: (targetBudget: number | undefined, marketName: string | undefined, title: string) => void;
}) {
  const [budgetStr, setBudgetStr] = useState<string>(
    list.targetBudget ? list.targetBudget.toFixed(2).replace('.', ',') : ''
  );
  const [marketName, setMarketName] = useState<string>(list.marketName || '');
  const [title, setTitle] = useState<string>(list.title || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = budgetStr ? parseFloat(budgetStr.replace(',', '.')) : undefined;
    onSave(parsed, marketName.trim() || undefined, title.trim() || list.title);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full overflow-hidden md:max-h-[90dvh] md:overflow-y-auto md:overscroll-contain shadow-xl border border-slate-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Target size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Configurar Lista & Teto</h3>
              <p className="text-xs text-slate-500">Defina o orçamento para alertar sobre gastos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nome da Lista
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Feira da Semana"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Mercado / Estabelecimento
            </label>
            <div className="relative">
              <Store size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={marketName}
                onChange={e => setMarketName(e.target.value)}
                placeholder="Ex: Assaí Atacadista, Pão de Açúcar, Feira Livre"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Teto de Gastos / Orçamento Planejado (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                R$
              </span>
              <input
                type="text"
                value={budgetStr}
                onChange={e => {
                  const cleaned = e.target.value.replace(/[^0-9,.]/g, '');
                  setBudgetStr(cleaned);
                }}
                placeholder="Ex: 250,00"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Deixe em branco se não quiser teto fixo. O app alertará se o total ultrapassar.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Check size={14} />
              Salvar Configurações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function BudgetModal({
  isOpen,
  onClose,
  list,
  onSave,
}: BudgetModalProps) {
  usePageScrollLock(isOpen, onClose);
  if (!isOpen) return null;

  return (
    <BudgetModalForm
      key={list.id + (list.updatedAt || 0)}
      list={list}
      onClose={onClose}
      onSave={onSave}
    />
  );
}
