'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  Store,
  Check,
  RotateCcw,
  Trash2,
  Sliders,
  DollarSign,
  Mail,
  UserMinus,
  Users,
} from 'lucide-react';
import { ListCollaborator, ShoppingList } from '@/types/grocery';
import { getListCollaborators, removeListCollaborator, shareListWithEmail } from '@/lib/supabase';

interface ListEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  list: ShoppingList;
  onSave: (targetBudget: number | undefined, marketName: string | undefined, title: string) => void;
  onUncheckAll?: () => void;
  onClearChecked?: () => void;
  onRequestDelete?: () => void;
}

function ListEditModalForm({
  list,
  onClose,
  onSave,
  onUncheckAll,
  onClearChecked,
  onRequestDelete,
}: {
  list: ShoppingList;
  onClose: () => void;
  onSave: (targetBudget: number | undefined, marketName: string | undefined, title: string) => void;
  onUncheckAll?: () => void;
  onClearChecked?: () => void;
  onRequestDelete?: () => void;
}) {
  const [title, setTitle] = useState(list.title || '');
  const [marketName, setMarketName] = useState((list.type === 'travel' ? list.destination : list.marketName) || '');
  const [budgetStr, setBudgetStr] = useState(
    list.targetBudget ? list.targetBudget.toFixed(2).replace('.', ',') : ''
  );
  const [shareEmail, setShareEmail] = useState('');
  const [shareRole, setShareRole] = useState<'editor' | 'viewer'>('editor');
  const [collaborators, setCollaborators] = useState<ListCollaborator[]>([]);
  const [shareMessage, setShareMessage] = useState('');
  const [shareBusy, setShareBusy] = useState(false);

  const refreshCollaborators = async () => {
    try { setCollaborators(await getListCollaborators(list.id)); } catch { setCollaborators([]); }
  };

  useEffect(() => {
    let active = true;
    getListCollaborators(list.id).then(result => { if (active) setCollaborators(result); }).catch(() => { if (active) setCollaborators([]); });
    return () => { active = false; };
  }, [list.id]);

  const shareList = async () => {
    if (!shareEmail.trim()) return;
    setShareBusy(true);
    setShareMessage('');
    try {
      setShareMessage(await shareListWithEmail(list, shareEmail.trim(), shareRole));
      setShareEmail('');
      await refreshCollaborators();
    } catch (error) {
      setShareMessage(error instanceof Error ? error.message : 'Não foi possível compartilhar.');
    } finally { setShareBusy(false); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = budgetStr.trim() ? parseFloat(budgetStr.replace(',', '.')) : undefined;
    onSave(parsed, marketName.trim() || undefined, title.trim() || list.title);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Sliders size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">{list.type === 'travel' ? 'Editar Viagem' : 'Editar Lista de Compras'}</h3>
              <p className="text-xs text-slate-500">{list.type === 'travel' ? 'Ajuste o nome, destino e orçamento' : 'Ajuste o nome, mercado e teto de gastos'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 max-h-[82vh] overflow-y-auto">
          {/* Nome da Lista */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nome da Lista <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Feira da Semana, Mercado Mensal"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          {/* Mercado / Estabelecimento */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              {list.type === 'travel' ? 'Destino' : 'Mercado / Estabelecimento'}
            </label>
            <div className="relative">
              <Store size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={marketName}
                onChange={e => setMarketName(e.target.value)}
                placeholder={list.type === 'travel' ? 'Ex: Rio de Janeiro, Portugal' : 'Ex: Assaí Atacadista, Pão de Açúcar, Feira Livre'}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Teto de Gastos */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              {list.type === 'travel' ? 'Orçamento da viagem (R$)' : 'Teto de Gastos / Orçamento Planejado (R$)'}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                R$
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={budgetStr}
                onChange={e => {
                  const cleaned = e.target.value.replace(/[^0-9,.]/g, '');
                  setBudgetStr(cleaned);
                }}
                placeholder="Ex: 250,00 (opcional)"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Ações Rápidas da Lista */}
          {(onUncheckAll || onClearChecked) && <div className="pt-2 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Ações Rápidas
            </span>

            <div className="grid grid-cols-2 gap-2">
              {onUncheckAll && (
                <button
                  type="button"
                  onClick={() => {
                    onUncheckAll();
                    onClose();
                  }}
                  className="p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center justify-center gap-2 transition-colors text-center"
                >
                  <RotateCcw size={15} className="text-slate-500 shrink-0" />
                  <span>Desmarcar todos</span>
                </button>
              )}

              {onClearChecked && (
                <button
                  type="button"
                  onClick={() => {
                    onClearChecked();
                    onClose();
                  }}
                  className="p-2.5 rounded-xl border border-rose-100 bg-rose-50/50 text-rose-700 hover:bg-rose-50 text-xs font-semibold flex items-center justify-center gap-2 transition-colors text-center"
                >
                  <RotateCcw size={15} className="text-rose-500 shrink-0" />
                  <span>Remover comprados</span>
                </button>
              )}
            </div>
          </div>}

          {list.accessRole === 'owner' && <div className="pt-2 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center gap-2"><Users size={16} className="text-emerald-700" /><span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Compartilhar lista</span></div>
            <div className="grid grid-cols-[1fr_105px] gap-2">
              <label className="relative"><Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="email" value={shareEmail} onChange={event => setShareEmail(event.target.value)} placeholder="email@exemplo.com" className="w-full rounded-xl border border-slate-300 pl-8 pr-3 py-2.5 text-sm" /></label>
              <select value={shareRole} onChange={event => setShareRole(event.target.value as 'editor' | 'viewer')} className="rounded-xl border border-slate-300 px-2 py-2.5 text-xs font-semibold"><option value="editor">Pode editar</option><option value="viewer">Só visualizar</option></select>
            </div>
            <button type="button" disabled={shareBusy || !shareEmail.trim()} onClick={shareList} className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white disabled:opacity-50">{shareBusy ? 'Compartilhando...' : 'Compartilhar acesso'}</button>
            {shareMessage && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">{shareMessage}</p>}
            {collaborators.length > 0 && <div className="space-y-1.5">
              {collaborators.map(person => <div key={`${person.email}-${person.role}`} className="flex items-center gap-2 rounded-lg border border-slate-100 px-2.5 py-2">
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-800">{person.email}</p><p className="text-[10px] text-slate-500">{person.role === 'owner' ? 'Proprietário' : person.role === 'editor' ? 'Pode editar' : 'Somente leitura'}{person.status === 'pending' ? ' · convite pendente' : ''}</p></div>
                {person.role !== 'owner' && <button type="button" onClick={async () => { await removeListCollaborator(list.id, person.email); await refreshCollaborators(); }} className="h-8 w-8 rounded-lg text-rose-600 hover:bg-rose-50 flex items-center justify-center" aria-label={`Remover acesso de ${person.email}`}><UserMinus size={15} /></button>}
              </div>)}
            </div>}
          </div>}

          {/* Zona de Exclusão da Lista */}
          {onRequestDelete && (
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRequestDelete();
                }}
                className="w-full p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors active:scale-98"
              >
                <Trash2 size={15} />
                <span>{list.type === 'travel' ? 'Excluir esta Viagem' : 'Excluir esta Lista de Compras'}</span>
              </button>
            </div>
          )}

          {/* Footer Save & Cancel */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-xs transition-colors flex items-center gap-1.5 active:scale-95"
            >
              <Check size={14} />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ListEditModal({
  isOpen,
  onClose,
  list,
  onSave,
  onUncheckAll,
  onClearChecked,
  onRequestDelete,
}: ListEditModalProps) {
  if (!isOpen) return null;

  return (
    <ListEditModalForm
      key={list.id + '-' + (list.updatedAt || 0)}
      list={list}
      onClose={onClose}
      onSave={onSave}
      onUncheckAll={onUncheckAll}
      onClearChecked={onClearChecked}
      onRequestDelete={onRequestDelete}
    />
  );
}
