'use client';

import React from 'react';
import { ShoppingCart, Plus, Layers, Sparkles, ArrowLeft, MoreVertical } from 'lucide-react';

interface NavbarProps {
  activeTab: 'shopping' | 'lists' | 'stats';
  onSelectTab: (tab: 'shopping' | 'lists' | 'stats') => void;
  onNewList: () => void;
  listTitle?: string;
  itemCount?: number;
  onOpenListEdit?: () => void;
}

export function Navbar({
  activeTab,
  onSelectTab,
  onNewList,
  listTitle,
  itemCount = 0,
  onOpenListEdit,
}: NavbarProps) {
  const isInsideShoppingList = activeTab === 'shopping';

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between">
        {/* MOBILE MODE QUANDO ESTÁ DENTRO DA LISTA:
            Requisito do usuário: "No mobile, quanto entro na lista, não botões 'Mercado' 'minhas listas' e 'Nova' na barra superior,
            deixe apenas o ícone de 3 pontos empilhados que deve abrir um popup de edição da lista atual selecionada." */}
        {isInsideShoppingList ? (
          <div className="flex sm:hidden items-center justify-between w-full">
            {/* Voltar para minhas listas + Título da lista atual */}
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <button
                type="button"
                onClick={() => onSelectTab('lists')}
                className="w-9 h-9 -ml-1 rounded-full text-slate-700 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center shrink-0 active:scale-90 transition-all"
                title="Voltar para Minhas Listas"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="min-w-0">
                <span className="text-sm font-extrabold text-slate-900 block truncate">
                  {listTitle || 'Lista de Compras'}
                </span>
                <span className="text-[10px] text-slate-500 font-medium block -mt-0.5">
                  {itemCount} {itemCount === 1 ? 'item' : 'itens'}
                </span>
              </div>
            </div>

            {/* Apenas o ícone de 3 pontos empilhados */}
            <button
              type="button"
              onClick={onOpenListEdit}
              className="w-9 h-9 rounded-full text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 flex items-center justify-center shrink-0 transition-colors"
              title="Opções e edição da lista"
            >
              <MoreVertical size={20} />
            </button>
          </div>
        ) : null}

        {/* LAYOUT NORMAL (Desktop ou quando fora da lista no mobile) */}
        <div className={`items-center justify-between w-full ${isInsideShoppingList ? 'hidden sm:flex' : 'flex'}`}>
          {/* Zone 1: Single text element wordmark */}
          <button
            onClick={() => onSelectTab('shopping')}
            className="flex items-center gap-2 text-left group focus:outline-none"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <ShoppingCart size={17} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight text-slate-900 group-hover:text-emerald-700 transition-colors">
                Fresh Market
              </span>
              <span className="text-[10px] text-slate-500 font-medium -mt-1 hidden sm:block">
                Lista & Calculadora
              </span>
            </div>
          </button>

          {/* Zone 2: Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => onSelectTab('shopping')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'shopping'
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <ShoppingCart size={15} />
              <span>Mercado</span>
              {itemCount > 0 && (
                <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-200/80 text-emerald-900">
                  {itemCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectTab('lists')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'lists'
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Layers size={15} />
              <span>Minhas Listas</span>
            </button>

            <button
              onClick={() => onSelectTab('stats')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap hidden md:flex items-center gap-1.5 ${
                activeTab === 'stats'
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Sparkles size={15} />
              <span>Resumo</span>
            </button>
          </nav>

          {/* Zone 3: Primary Action & 3-dots */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onNewList}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-lg transition-all shadow-xs flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span className="hidden sm:inline">Nova Lista</span>
              <span className="sm:hidden">Nova</span>
            </button>

            {isInsideShoppingList && onOpenListEdit && (
              <button
                type="button"
                onClick={onOpenListEdit}
                className="w-8 h-8 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition-colors"
                title="Opções da lista"
              >
                <MoreVertical size={17} />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
