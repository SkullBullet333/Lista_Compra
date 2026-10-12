'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ShoppingCart, Plus, Layers, Sparkles, ArrowLeft, MoreVertical, Plane, Download, Copy, Pencil, Trash2 } from 'lucide-react';
import { ListType } from '@/types/grocery';

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

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function Navbar({
  activeTab,
  onSelectTab,
  onNewList,
  onOpenSettings,
  listTitle,
  itemCount = 0,
  listType = 'market',
  onOpenListEdit,
  onBackFromList,
  onBackFromSettings,
  onDuplicateList,
  onRequestDeleteList,
}: NavbarProps) {
  const isInsideShoppingList = activeTab === 'shopping';
  const [isHomeMenuOpen, setIsHomeMenuOpen] = useState(false);
  const [isListMenuOpen, setIsListMenuOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const homeMenuRef = useRef<HTMLDivElement>(null);
  const mobileListMenuRef = useRef<HTMLDivElement>(null);
  const desktopListMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      if (!homeMenuRef.current?.contains(event.target as Node)) setIsHomeMenuOpen(false);
      if (!mobileListMenuRef.current?.contains(event.target as Node) && !desktopListMenuRef.current?.contains(event.target as Node)) setIsListMenuOpen(false);
    };
    document.addEventListener('mousedown', closeOutside);
    return () => document.removeEventListener('mousedown', closeOutside);
  }, []);

  useEffect(() => {
    const captureInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const clearInstallPrompt = () => setInstallPrompt(null);
    window.addEventListener('beforeinstallprompt', captureInstallPrompt);
    window.addEventListener('appinstalled', clearInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', captureInstallPrompt);
      window.removeEventListener('appinstalled', clearInstallPrompt);
    };
  }, []);

  const installApp = async () => {
    if (!installPrompt) return;
    setIsHomeMenuOpen(false);
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const listMenu = isListMenuOpen && <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-lg z-50">
    <button type="button" onClick={() => { setIsListMenuOpen(false); onOpenListEdit?.(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"><Pencil size={16} />Editar lista</button>
    <button type="button" onClick={() => { setIsListMenuOpen(false); onDuplicateList?.(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"><Copy size={16} />Duplicar lista</button>
    <button type="button" onClick={() => { setIsListMenuOpen(false); onRequestDeleteList?.(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50"><Trash2 size={16} />Excluir lista</button>
  </div>;

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
                <span className="text-[10px] text-slate-500 font-medium block -mt-0.5">
                  {itemCount} {listType === 'travel' ? (itemCount === 1 ? 'atividade' : 'atividades') : (itemCount === 1 ? 'item' : 'itens')}
                </span>
              </div>
            </div>

            {/* Apenas o ícone de 3 pontos empilhados */}
            <div ref={mobileListMenuRef} className="relative shrink-0">
              <button type="button" onClick={() => setIsListMenuOpen(open => !open)} aria-label="Opções da lista" aria-expanded={isListMenuOpen} className="w-9 h-9 rounded-full text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 flex items-center justify-center transition-colors"><MoreVertical size={20} /></button>
              {listMenu}
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
              <ShoppingCart size={17} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight text-slate-900">
                {activeTab === 'lists' ? 'Minhas Listas' : 'Fresh Market'}
              </span>
              {activeTab !== 'lists' && <span className="text-[10px] text-slate-500 font-medium -mt-1 hidden sm:block">Lista & Calculadora</span>}
            </div>
          </div>}

          {/* Zone 2: Navigation Links */}
          {activeTab !== 'lists' && activeTab !== 'settings' && <nav className="flex items-center gap-1 sm:gap-2">
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
              <span>Minhas Listas</span>
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

          {/* Zone 3: Primary Action & 3-dots */}
          {activeTab !== 'settings' && <div className="flex items-center gap-1.5">
            {activeTab !== 'lists' && <button
              onClick={onNewList}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-lg transition-all shadow-xs flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>Novo</span>
            </button>}

            {activeTab === 'lists' && <div ref={homeMenuRef} className="relative">
              <button type="button" onClick={() => setIsHomeMenuOpen(open => !open)} aria-label="Mais opções" aria-expanded={isHomeMenuOpen} className="w-9 h-9 rounded-lg text-slate-700 hover:bg-slate-100 flex items-center justify-center"><MoreVertical size={20} /></button>
              {isHomeMenuOpen && <div className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-slate-200 bg-white shadow-lg p-1 z-50">
                {installPrompt && <button type="button" onClick={installApp} className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50 flex items-center gap-2"><Download size={16} />Instalar aplicativo</button>}
                <button type="button" onClick={() => { setIsHomeMenuOpen(false); onOpenSettings(); }} className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50">Configurações</button>
              </div>}
            </div>}

            {isInsideShoppingList && <div ref={desktopListMenuRef} className="relative">
              <button type="button" onClick={() => setIsListMenuOpen(open => !open)} aria-label="Opções da lista" aria-expanded={isListMenuOpen} className="w-8 h-8 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition-colors" title="Opções da lista"><MoreVertical size={17} /></button>
              {listMenu}
            </div>}
          </div>}
        </div>
      </div>
    </header>
  );
}
