'use client';

import React, { useRef, useState } from 'react';
import { ShoppingCart, Plus, Layers, Sparkles, ArrowLeft, Settings, Plane, MoreVertical, Pencil, Copy, Trash2 } from 'lucide-react';
import { ListType } from '@/types/grocery';
import { useOutsideDismiss } from '@/hooks/use-outside-dismiss';

interface NavbarProps {
  activeTab: 'shopping' | 'lists' | 'stats' | 'settings';
  onSelectTab: (tab: 'shopping' | 'lists' | 'stats' | 'settings') => void;
  onNewList: () => void;
  onOpenSettings: () => void;
  listTitle?: string;
  itemCount?: number;
  listType?: ListType;
  onOpenListEdit?: () => void;
  onBackFromList?: () => void;
  onBackFromSettings?: () => void;
  onDuplicateList?: () => void;
  onRequestDeleteList?: () => void;
}

export function Navbar({
  activeTab,
  onSelectTab,
  onNewList,
  onOpenSettings,
  listTitle,
  itemCount = 0,
  listType = 'market',
  onBackFromList,
  onBackFromSettings,
  onOpenListEdit,
  onDuplicateList,
  onRequestDeleteList,
}: NavbarProps) {
  const isInsideShoppingList = activeTab === 'shopping' || activeTab === 'stats';
  const [isListMenuOpen, setIsListMenuOpen] = useState(false);
  const mobileListMenuRef = useRef<HTMLDivElement>(null);
  useOutsideDismiss(mobileListMenuRef, isListMenuOpen, () => setIsListMenuOpen(false));
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between">
        {/* Mobile list header */}
        {isInsideShoppingList ? (
          <div className="flex sm:hidden items-center justify-between w-full">
            {/* Voltar para minhas listas + Título da lista atual */}
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <button
                type="button"
                onClick={onBackFromList}
                className="w-9 h-9 -ml-1 rounded-full text-slate-700 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center shrink-0 active:scale-90 transition-all"
                title="Voltar"
                aria-label="Voltar"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="min-w-0">
                <span className="text-sm font-extrabold text-slate-900 block truncate">
                  {listTitle || 'Lista de Compras'}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <div ref={mobileListMenuRef} className="relative" onKeyDown={event => {
                if (event.key !== 'Escape' || !isListMenuOpen) return;
                event.preventDefault();
                event.stopPropagation();
                setIsListMenuOpen(false);
                mobileListMenuRef.current?.querySelector('button')?.focus();
              }}>
                <button type="button" onClick={() => setIsListMenuOpen(open => !open)} aria-label="Opções da lista" aria-expanded={isListMenuOpen} className="w-9 h-9 rounded-full text-slate-700 hover:bg-slate-100 flex items-center justify-center"><MoreVertical size={20} /></button>
                {isListMenuOpen && <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                  <button type="button" onClick={() => { setIsListMenuOpen(false); onOpenListEdit?.(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"><Pencil size={16} />Editar lista</button>
                  <button type="button" onClick={() => { setIsListMenuOpen(false); onDuplicateList?.(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"><Copy size={16} />Duplicar lista</button>
                  <button type="button" onClick={() => { setIsListMenuOpen(false); onRequestDeleteList?.(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50"><Trash2 size={16} />Excluir lista</button>
                </div>}
              </div>
            </div>
          </div>
        ) : null}

        {/* LAYOUT NORMAL (Desktop ou quando fora da lista no mobile) */}
        <div className={`items-center justify-between w-full ${isInsideShoppingList ? 'hidden sm:flex' : 'flex'}`}>
          {/* Zone 1: Single text element wordmark */}
          {activeTab === 'settings' ? (
            <button type="button" onClick={onBackFromSettings} className="flex items-center gap-2 min-w-0 text-left text-slate-800 hover:text-emerald-700" aria-label="Voltar"><ArrowLeft size={20} className="shrink-0" /><span className="font-extrabold truncate">Configurações</span></button>
          ) : isInsideShoppingList ? (
            <button type="button" onClick={onBackFromList} className="hidden sm:flex items-center gap-2 min-w-0 text-left text-slate-800 hover:text-emerald-700" aria-label="Voltar" title="Voltar">
              <ArrowLeft size={20} className="shrink-0" />
              <span className="font-extrabold truncate">{listTitle || 'Lista de Compras'}</span>
            </button>
          ) : <div className="flex items-center gap-2 text-left">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              {listType === 'travel' ? <Plane size={17} strokeWidth={2.5} /> : <ShoppingCart size={17} strokeWidth={2.5} />}
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight text-emerald-800">
                {activeTab === 'lists' ? (listType === 'travel' ? 'Viagens e Destinos' : 'Listas de Compras') : 'Fresh Market'}
              </span>
              {activeTab !== 'lists' && <span className="text-[10px] text-slate-500 font-medium -mt-1 hidden sm:block">Lista & Calculadora</span>}
            </div>
          </div>}

          {/* Zone 2: Navigation Links */}
          {activeTab !== 'lists' && activeTab !== 'settings' && <nav className={`${activeTab === 'stats' ? 'hidden md:flex' : 'flex'} items-center gap-1 sm:gap-2`}>
            <button
              onClick={() => onSelectTab('shopping')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'shopping'
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {listType === 'travel' ? <Plane size={15} /> : <ShoppingCart size={15} />}
              <span>{listType === 'travel' ? 'Viagem' : 'Mercado'}</span>
              {itemCount > 0 && (
                <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-200/80 text-emerald-900">
                  {itemCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectTab('lists')}
              className="px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            >
              <Layers size={15} />
              <span>{listType === 'travel' ? 'Viagens e Destinos' : 'Listas de Compras'}</span>
            </button>

            {listType !== 'travel' && <button
              onClick={() => onSelectTab('stats')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap hidden md:flex items-center gap-1.5 ${
                activeTab === 'stats'
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Sparkles size={15} />
              <span>Resumo</span>
            </button>}
          </nav>}

          {/* Zone 3: Primary action and settings */}
          {activeTab !== 'settings' && <div className="flex items-center gap-1.5">
            {activeTab !== 'lists' && <button
              onClick={onNewList}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-lg transition-all shadow-xs flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>Novo</span>
            </button>}

            <button type="button" onClick={onOpenSettings} aria-label="Configurações" title="Configurações" className="w-9 h-9 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors"><Settings size={20} /></button>
          </div>}
        </div>
      </div>
    </header>
  );
}
