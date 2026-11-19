'use client';

import React, { useRef, useState } from 'react';
import { ShoppingCart, ArrowLeft, Settings, Plane, MoreVertical, Pencil, Copy, Trash2 } from 'lucide-react';
import { ListType } from '@/types/grocery';
import { useOutsideDismiss } from '@/hooks/use-outside-dismiss';

interface NavbarProps {
  activeTab: 'shopping' | 'lists' | 'stats' | 'settings';
  onOpenSettings: () => void;
  listTitle?: string;
  settingsTitle?: string;
  listType?: ListType;
  onOpenListEdit?: () => void;
  onBackFromList?: () => void;
  onBackFromSettings?: () => void;
  onDuplicateList?: () => void;
  onRequestDeleteList?: () => void;
}

export function Navbar({
  activeTab,
  onOpenSettings,
  listTitle,
  settingsTitle = 'Configurações',
  listType = 'market',
  onBackFromList,
  onBackFromSettings,
  onOpenListEdit,
  onDuplicateList,
  onRequestDeleteList,
}: NavbarProps) {
  const isInsideShoppingList = activeTab === 'shopping' || activeTab === 'stats';
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
              <ListOptionsMenu onOpenListEdit={onOpenListEdit} onDuplicateList={onDuplicateList} onRequestDeleteList={onRequestDeleteList} />
            </div>
          </div>
        ) : null}

        {/* LAYOUT NORMAL (Desktop ou quando fora da lista no mobile) */}
        <div className={`items-center justify-between w-full ${isInsideShoppingList ? 'hidden sm:flex' : 'flex'}`}>
          {/* Zone 1: Single text element wordmark */}
          {activeTab === 'settings' ? (
            <button type="button" onClick={onBackFromSettings} className="flex items-center gap-2 min-w-0 text-left text-slate-800 hover:text-emerald-700" aria-label="Voltar"><ArrowLeft size={20} className="shrink-0" /><span className="font-extrabold truncate">{settingsTitle}</span></button>
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

          {/* Zone 3: Primary action and settings */}
          {activeTab !== 'settings' && <div className="flex items-center gap-1.5">
            {isInsideShoppingList ? <ListOptionsMenu onOpenListEdit={onOpenListEdit} onDuplicateList={onDuplicateList} onRequestDeleteList={onRequestDeleteList} /> : (
            <button type="button" onClick={onOpenSettings} aria-label="Configurações" title="Configurações" className="w-9 h-9 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors"><Settings size={20} /></button>
            )}
          </div>}
        </div>
      </div>
    </header>
  );
}

function ListOptionsMenu({ onOpenListEdit, onDuplicateList, onRequestDeleteList }: Pick<NavbarProps, 'onOpenListEdit' | 'onDuplicateList' | 'onRequestDeleteList'>) {
  const [isListMenuOpen, setIsListMenuOpen] = useState(false);
  const listMenuRef = useRef<HTMLDivElement>(null);
  useOutsideDismiss(listMenuRef, isListMenuOpen, () => setIsListMenuOpen(false));
  return (
    <div ref={listMenuRef} className="relative" onKeyDown={event => {
      if (event.key !== 'Escape' || !isListMenuOpen) return;
      event.preventDefault();
      event.stopPropagation();
      setIsListMenuOpen(false);
      listMenuRef.current?.querySelector('button')?.focus();
    }}>
      <button type="button" onClick={() => setIsListMenuOpen(open => !open)} aria-label="Opções da lista" aria-expanded={isListMenuOpen} className="w-9 h-9 rounded-full text-slate-700 hover:bg-slate-100 flex items-center justify-center"><MoreVertical size={20} /></button>
      {isListMenuOpen && <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
        <button type="button" onClick={() => { setIsListMenuOpen(false); onOpenListEdit?.(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"><Pencil size={16} />Editar lista</button>
        <button type="button" onClick={() => { setIsListMenuOpen(false); onDuplicateList?.(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"><Copy size={16} />Duplicar lista</button>
        <button type="button" onClick={() => { setIsListMenuOpen(false); onRequestDeleteList?.(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50"><Trash2 size={16} />Excluir lista</button>
      </div>}
    </div>
  );
}
