'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Plus,
  Search,
  CheckCheck,
  ChevronDown,
  Layers,
  Check,
  ListFilter,
  X,
  ShoppingBag,
} from 'lucide-react';
import { ShoppingList, GroceryItem, CategoryId, CATEGORIES } from '@/types/grocery';
import { calculateListTotals, formatCurrency, getRegisteredItems, RegisteredCandidate } from '@/lib/storage';
import { guessCategory } from '@/lib/catalog';
import { ItemRow } from './ItemRow';
import { ItemImage } from './ItemImage';

interface ShoppingViewProps {
  list: ShoppingList;
  onUpdateList: (updated: ShoppingList) => void;
  onOpenAddItemModal: (category?: CategoryId) => void;
  onOpenEditItemModal: (item: GroceryItem) => void;
  onOpenShareModal: () => void;
  onOpenBudgetModal: () => void;
  onOpenImagePreview: (url: string, name: string, category: CategoryId) => void;
  onSwitchToLists: () => void;
}

export function ShoppingView({
  list,
  onUpdateList,
  onOpenAddItemModal,
  onOpenEditItemModal,
  onOpenImagePreview,
}: ShoppingViewProps) {
  const [listFilterQuery, setListFilterQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all'>('all');
  const [showCategoryListModal, setShowCategoryListModal] = useState(false);
  const [viewMode, setViewMode] = useState<'categories' | 'status'>('categories'); // 'categories' = Modo de Lista por Categoria

  // Barra de Pesquisa Única para Buscar Itens Cadastrados & Lançar
  const [searchAddQuery, setSearchAddQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<Map<string, RegisteredCandidate>>(new Map());
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Fecha o dropdown de sugestões ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totals = useMemo(() => calculateListTotals(list.items), [list.items]);

  // Lista de itens cadastrados (da memória do usuário, catálogo e histórico de listas)
  const registeredItems = useMemo(() => getRegisteredItems([list]), [list]);

  // Filtra itens cadastrados em tempo real pela digitação na barra
  const searchResults = useMemo(() => {
    const q = searchAddQuery.trim().toLowerCase();
    if (!q) {
      // Sugestões populares quando vazia
      return registeredItems.slice(0, 10);
    }
    return registeredItems.filter(item =>
      item.name.toLowerCase().includes(q) ||
      CATEGORIES[item.category]?.label.toLowerCase().includes(q)
    ).slice(0, 16);
  }, [registeredItems, searchAddQuery]);

  // Verifica se há correspondência exata para o nome digitado
  const exactMatch = useMemo(() => {
    const q = searchAddQuery.trim().toLowerCase();
    if (!q) return null;
    return registeredItems.find(i => i.name.toLowerCase() === q) || null;
  }, [registeredItems, searchAddQuery]);

  // Alterna seleção de item para lançamento múltiplo
  const handleToggleCandidate = (cand: RegisteredCandidate) => {
    setSelectedCandidates(prev => {
      const next = new Map(prev);
      if (next.has(cand.id)) {
        next.delete(cand.id);
      } else {
        next.set(cand.id, cand);
      }
      return next;
    });
  };

  // Lança na lista: se houver itens selecionados, lança todos. Se não, cria a partir do digitado (unidade e valor 0).
  const handleLaunch = () => {
    // Caso 1: Lançar itens selecionados com o botão de lançar (1 ou múltiplos itens)
    if (selectedCandidates.size > 0) {
      const itemsToAdd: GroceryItem[] = Array.from(selectedCandidates.values()).map(c => ({
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: c.name,
        category: c.category,
        quantity: 1,
        unit: c.unit,
        price: c.price || 0,
        imageUrl: c.imageUrl,
        notes: c.notes,
        checked: false,
        createdAt: Date.now(),
      }));

      onUpdateList({
        ...list,
        items: [...itemsToAdd, ...list.items],
        updatedAt: Date.now(),
      });

      setSelectedCandidates(new Map());
      setSearchAddQuery('');
      setIsSearchOpen(false);
      return;
    }

    // Caso 2: Não há seleção marcada, mas o usuário digitou um nome
    const trimmed = searchAddQuery.trim();
    if (!trimmed) return;

    if (exactMatch) {
      const newItem: GroceryItem = {
        id: `item-${Date.now()}`,
        name: exactMatch.name,
        category: exactMatch.category,
        quantity: 1,
        unit: exactMatch.unit,
        price: exactMatch.price || 0,
        imageUrl: exactMatch.imageUrl,
        notes: exactMatch.notes,
        checked: false,
        createdAt: Date.now(),
      };
      onUpdateList({
        ...list,
        items: [newItem, ...list.items],
        updatedAt: Date.now(),
      });
    } else {
      // Requisito: "caso não tenha cadastro criar um item a partir do nome digitado sempre como unidade pra iniciar e valor zerado sendo editado na lista"
      const newItem: GroceryItem = {
        id: `item-${Date.now()}`,
        name: trimmed,
        category: guessCategory(trimmed),
        quantity: 1,
        unit: 'un', // Sempre unidade pra iniciar
        price: 0,   // Valor zerado sendo editado na lista
        checked: false,
        createdAt: Date.now(),
      };
      onUpdateList({
        ...list,
        items: [newItem, ...list.items],
        updatedAt: Date.now(),
      });
    }

    setSearchAddQuery('');
    setIsSearchOpen(false);
  };

  // Adiciona um item individual rapidamente direto do botão (+)
  const handleAddSingleCandidate = (cand: RegisteredCandidate, e: React.MouseEvent) => {
    e.stopPropagation();
    const newItem: GroceryItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: cand.name,
      category: cand.category,
      quantity: 1,
      unit: cand.unit,
      price: cand.price || 0,
      imageUrl: cand.imageUrl,
      notes: cand.notes,
      checked: false,
      createdAt: Date.now(),
    };
    onUpdateList({
      ...list,
      items: [newItem, ...list.items],
      updatedAt: Date.now(),
    });
    setSelectedCandidates(prev => {
      const next = new Map(prev);
      next.delete(cand.id);
      return next;
    });
  };

  // Cria item customizado a partir do nome digitado (sempre 1 un e valor zerado)
  const handleCreateNewCustom = (name: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const trimmed = name.trim();
    if (!trimmed) return;
    const newItem: GroceryItem = {
      id: `item-${Date.now()}`,
      name: trimmed,
      category: guessCategory(trimmed),
      quantity: 1,
      unit: 'un', // Sempre unidade pra iniciar
      price: 0,   // Valor zerado sendo editado na lista
      checked: false,
      createdAt: Date.now(),
    };
    onUpdateList({
      ...list,
      items: [newItem, ...list.items],
      updatedAt: Date.now(),
    });
    setSearchAddQuery('');
    setIsSearchOpen(false);
  };

  // Toggle item checked
  const handleToggleCheck = (id: string) => {
    const updated = list.items.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    onUpdateList({ ...list, items: updated, updatedAt: Date.now() });
  };

  // Update item quantity (stepper)
  const handleUpdateQuantity = (id: string, delta: number) => {
    const updated = list.items.map(item => {
      if (item.id === id) {
        const nextQty = Math.max(0.1, Number((item.quantity + delta).toFixed(2)));
        return { ...item, quantity: nextQty };
      }
      return item;
    });
    onUpdateList({ ...list, items: updated, updatedAt: Date.now() });
  };

  // Set quantity directly from inline editing (aceita qualquer decimal numérico)
  const handleSetQuantity = (id: string, quantity: number) => {
    const updated = list.items.map(item => {
      if (item.id === id) {
        return { ...item, quantity: Math.max(0.01, quantity) };
      }
      return item;
    });
    onUpdateList({ ...list, items: updated, updatedAt: Date.now() });
  };

  // Set price directly from inline editing (aceita qualquer decimal numérico)
  const handleSetPrice = (id: string, price: number) => {
    const updated = list.items.map(item => {
      if (item.id === id) {
        return { ...item, price: Math.max(0, price) };
      }
      return item;
    });
    onUpdateList({ ...list, items: updated, updatedAt: Date.now() });
  };

  // Delete item
  const handleDeleteItem = (id: string) => {
    const updated = list.items.filter(item => item.id !== id);
    onUpdateList({ ...list, items: updated, updatedAt: Date.now() });
  };

  // Clear all checked items
  const handleClearChecked = () => {
    if (confirm('Deseja remover todos os itens já marcados no carrinho?')) {
      const updated = list.items.filter(item => !item.checked);
      onUpdateList({ ...list, items: updated, updatedAt: Date.now() });
    }
  };

  // Uncheck all items
  const handleUncheckAll = () => {
    const updated = list.items.map(item => ({ ...item, checked: false }));
    onUpdateList({ ...list, items: updated, updatedAt: Date.now() });
  };

  // Check all items
  const handleCheckAll = () => {
    const updated = list.items.map(item => ({ ...item, checked: true }));
    onUpdateList({ ...list, items: updated, updatedAt: Date.now() });
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return list.items.filter(item => {
      const matchesSearch =
        listFilterQuery === '' ||
        item.name.toLowerCase().includes(listFilterQuery.toLowerCase()) ||
        (item.notes && item.notes.toLowerCase().includes(listFilterQuery.toLowerCase()));

      const matchesCat =
        selectedCategory === 'all' || item.category === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [list.items, listFilterQuery, selectedCategory]);

  // Group items by category for list mode
  const categoryGroups = useMemo(() => {
    const activeCats = (Object.keys(CATEGORIES) as CategoryId[]).filter(catKey => {
      if (selectedCategory !== 'all' && selectedCategory !== catKey) return false;
      return filteredItems.some(i => i.category === catKey);
    });

    return activeCats.map(catKey => {
      const cat = CATEGORIES[catKey];
      const items = filteredItems.filter(i => i.category === catKey);
      const pending = items.filter(i => !i.checked);
      const checked = items.filter(i => i.checked);
      const subtotal = items.reduce((acc, i) => acc + i.quantity * i.price, 0);

      return {
        key: catKey,
        category: cat,
        items,
        pending,
        checked,
        subtotal,
      };
    });
  }, [filteredItems, selectedCategory]);

  const pendingItems = filteredItems.filter(i => !i.checked);
  const checkedItems = filteredItems.filter(i => i.checked);

  // Budget calculations
  const budgetRatio = list.targetBudget ? totals.totalInCart / list.targetBudget : null;
  const isOverBudget = budgetRatio !== null && totals.totalInCart > list.targetBudget!;
  const isNearBudget = budgetRatio !== null && !isOverBudget && budgetRatio >= 0.85;

  return (
    <div className="pb-32">
      {/* Slim Animated Progress Indicator */}
      <div className="w-full bg-slate-200 h-1.5 overflow-hidden">
        <div
          className="bg-emerald-500 h-full transition-all duration-300 ease-out"
          style={{ width: `${totals.percentDone}%` }}
        />
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-6 pt-3 sm:pt-4">
        {/* BARRA DE PESQUISA ÚNICA PARA BUSCAR ITENS CADASTRADOS & LANÇAR NA LISTA */}
        <div ref={searchContainerRef} className="relative mb-3.5 z-20">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchAddQuery}
                onChange={e => {
                  setSearchAddQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleLaunch();
                  } else if (e.key === 'Escape') {
                    setIsSearchOpen(false);
                  }
                }}
                placeholder="Buscar itens cadastrados ou digitar novo..."
                className="w-full pl-10 pr-9 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl border-2 border-slate-200 focus:border-emerald-600 bg-white shadow-xs text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
              />
              {searchAddQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchAddQuery('');
                    setIsSearchOpen(true);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
                  title="Limpar pesquisa"
                >
                  ✕
                </button>
              )}
            </div>

            {/* BOTÃO DE LANÇAR NA LISTA (com contador dinâmico para múltiplos itens) */}
            <button
              type="button"
              onClick={handleLaunch}
              disabled={selectedCandidates.size === 0 && !searchAddQuery.trim()}
              className={`px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 transition-all shadow-xs shrink-0 active:scale-95 ${
                selectedCandidates.size > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 ring-2 ring-emerald-500/30'
                  : searchAddQuery.trim()
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
              }`}
              title={
                selectedCandidates.size > 0
                  ? `Lançar ${selectedCandidates.size} ${selectedCandidates.size === 1 ? 'item' : 'itens'} na lista`
                  : searchAddQuery.trim()
                  ? 'Lançar item digitado'
                  : 'Selecione itens ou digite para lançar'
              }
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>
                {selectedCandidates.size > 1
                  ? `Lançar (${selectedCandidates.size})`
                  : selectedCandidates.size === 1
                  ? 'Lançar (1)'
                  : 'Lançar'}
              </span>
            </button>
          </div>

          {/* PAINEL DE SUGESTÕES E RESULTADOS DA BUSCA */}
          {isSearchOpen && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden z-30 max-h-[70vh] flex flex-col animate-fade-in">
              {/* Barra de Itens Selecionados no topo do dropdown */}
              {selectedCandidates.size > 0 && (
                <div className="p-2 sm:p-2.5 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-x-auto no-scrollbar py-0.5">
                    <span className="text-[11px] font-extrabold text-emerald-900 shrink-0">
                      Selecionados ({selectedCandidates.size}):
                    </span>
                    {Array.from(selectedCandidates.values()).map(cand => (
                      <span
                        key={cand.id}
                        className="inline-flex items-center gap-1 bg-white text-emerald-900 border border-emerald-200 text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 shadow-2xs"
                      >
                        <span className="truncate max-w-[120px]">{cand.name}</span>
                        <button
                          type="button"
                          onClick={() => handleToggleCandidate(cand)}
                          className="hover:text-rose-600 font-bold ml-0.5"
                          title="Remover seleção"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedCandidates(new Map())}
                      className="text-[11px] text-slate-500 hover:text-slate-800 font-medium px-1.5 py-1"
                    >
                      Limpar
                    </button>
                    <button
                      type="button"
                      onClick={handleLaunch}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                    >
                      Lançar Todos
                    </button>
                  </div>
                </div>
              )}

              {/* Lista rolagem de resultados cadastrados */}
              <div className="overflow-y-auto divide-y divide-slate-100 flex-1 p-1">
                {/* Opção especial: Criar Novo se digitou e não é correspondência exata */}
                {searchAddQuery.trim() && !exactMatch && (
                  <div
                    onClick={() => handleCreateNewCustom(searchAddQuery)}
                    className="p-2.5 sm:p-3 hover:bg-emerald-50/70 transition-colors cursor-pointer flex items-center justify-between gap-3 group rounded-xl bg-emerald-50/30"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <Plus size={18} strokeWidth={2.5} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs sm:text-sm text-emerald-900 truncate">
                            {`Criar "${searchAddQuery.trim()}"`}
                          </span>
                          <span className="text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded shrink-0">
                            Novo
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 block truncate">
                          Inicia como 1 un · R$ 0,00 (editar valor na lista)
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={e => handleCreateNewCustom(searchAddQuery, e)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shrink-0 shadow-xs"
                    >
                      Criar & Lançar
                    </button>
                  </div>
                )}

                {/* Título de seção se a busca está vazia */}
                {!searchAddQuery.trim() && (
                  <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/60">
                    Itens Frequentes & Cadastrados (Marque para lançar)
                  </div>
                )}

                {/* Itens cadastrados encontrados */}
                {searchResults.map(cand => {
                  const isSelected = selectedCandidates.has(cand.id);
                  const cat = CATEGORIES[cand.category];

                  return (
                    <div
                      key={cand.id}
                      onClick={() => handleToggleCandidate(cand)}
                      className={`p-2 sm:p-2.5 transition-colors cursor-pointer flex items-center justify-between gap-2.5 rounded-xl ${
                        isSelected ? 'bg-emerald-50/80 border border-emerald-200' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {/* Caixa de seleção múltipla */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleCandidate(cand)}
                          onClick={e => e.stopPropagation()}
                          className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 focus:ring-emerald-500 shrink-0 cursor-pointer"
                        />

                        {/* Foto do item cadastrado */}
                        <ItemImage
                          src={cand.imageUrl}
                          alt={cand.name}
                          category={cand.category}
                          size="sm"
                          className="w-8 h-8 rounded-lg shrink-0"
                        />

                        {/* Nome, unidade e categoria */}
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold text-xs sm:text-sm text-slate-900 block truncate">
                            {cand.name}
                          </span>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                              {cand.unit}
                            </span>
                            <span className="truncate max-w-[120px]">{cat?.label?.split('&')[0]}</span>
                            {cand.price > 0 && (
                              <span className="font-bold text-emerald-700 tabular-nums">
                                {formatCurrency(cand.price)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Botão rápido individual (+) */}
                      <button
                        type="button"
                        onClick={e => handleAddSingleCandidate(cand, e)}
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-600 flex items-center justify-center transition-colors shrink-0 shadow-2xs"
                        title="Lançar diretamente este item"
                      >
                        <Plus size={14} strokeWidth={2.5} />
                      </button>
                    </div>
                  );
                })}

                {searchResults.length === 0 && !searchAddQuery.trim() && (
                  <div className="p-4 text-center text-xs text-slate-400">
                    Nenhum item cadastrado encontrado.
                  </div>
                )}
              </div>

              {/* Rodapé do dropdown */}
              <div className="p-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500">
                <span>Marque múltiplos itens e clique em <strong>Lançar</strong>.</span>
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 px-2 py-0.5 rounded hover:bg-slate-200/60"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Barra de Filtros e Categorias no Modo de Lista */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between gap-2">
            {/* Campo de Busca Rápida para filtrar itens na lista */}
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={listFilterQuery}
                onChange={e => setListFilterQuery(e.target.value)}
                placeholder="Filtrar itens da lista..."
                className="w-full pl-8 pr-7 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500/20"
              />
              {listFilterQuery && (
                <button
                  onClick={() => setListFilterQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Alternador de Modo de Exibição */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('categories')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  viewMode === 'categories'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Modo de Lista por Categorias"
              >
                <Layers size={13} />
                <span className="hidden sm:inline">Por Categoria</span>
                <span className="sm:hidden">Categorias</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('status')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  viewMode === 'status'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Modo A Comprar e No Carrinho"
              >
                <CheckCheck size={13} />
                <span className="hidden sm:inline">Status</span>
                <span className="sm:hidden">Status</span>
              </button>
            </div>

            {/* Botão para abrir o Filtro de Categorias em Lista */}
            <button
              onClick={() => setShowCategoryListModal(!showCategoryListModal)}
              className={`px-2.5 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 shrink-0 ${
                selectedCategory !== 'all'
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-extrabold'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              title="Filtrar categoria em modo de lista"
            >
              <ListFilter size={14} />
              <span className="hidden sm:inline">
                {selectedCategory === 'all'
                  ? 'Filtrar Categoria'
                  : CATEGORIES[selectedCategory].label.split('&')[0]}
              </span>
              <ChevronDown size={13} />
            </button>
          </div>

          {/* Categoria em Modo de Lista (Menu suspenso / gaveta vertical limpa de categorias) */}
          {showCategoryListModal && (
            <div className="bg-white border border-slate-200 rounded-2xl p-2.5 shadow-md animate-fade-in space-y-1">
              <div className="flex items-center justify-between px-2 py-1 text-xs font-extrabold text-slate-700 border-b border-slate-100 mb-1">
                <span>Categorias (Modo de Lista)</span>
                <button
                  onClick={() => setShowCategoryListModal(false)}
                  className="text-slate-400 hover:text-slate-700 text-xs"
                >
                  Fechar
                </button>
              </div>

              {/* Opção Todas */}
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setShowCategoryListModal(false);
                }}
                className={`w-full p-2 rounded-xl text-xs font-bold text-left transition-colors flex items-center justify-between ${
                  selectedCategory === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>Todas as Categorias</span>
                <span className="text-[11px] opacity-80">{list.items.length} itens</span>
              </button>

              {/* Lista Vertical de Categorias */}
              {(Object.keys(CATEGORIES) as CategoryId[]).map(catKey => {
                const cat = CATEGORIES[catKey];
                const count = list.items.filter(i => i.category === catKey).length;
                const isSelected = selectedCategory === catKey;

                return (
                  <button
                    key={catKey}
                    onClick={() => {
                      setSelectedCategory(catKey);
                      setShowCategoryListModal(false);
                    }}
                    className={`w-full p-2 rounded-xl text-xs font-semibold text-left transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-950 font-bold border border-emerald-200'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span>{cat.label}</span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-500 tabular-nums">
                      {count} {count === 1 ? 'item' : 'itens'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Conteúdo da Lista de Itens */}
        {list.items.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-slate-200/90 text-center shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <ShoppingBag size={28} />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">Sua lista está vazia</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Busque itens cadastrados na barra de pesquisa acima ou digite um novo nome para lançar diretamente na lista!
            </p>
            <button
              onClick={() => onOpenAddItemModal()}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all inline-flex items-center gap-1.5"
            >
              <Plus size={15} />
              <span>Adicionar Primeiro Item</span>
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center">
            <p className="text-sm font-bold text-slate-700">Nenhum item encontrado</p>
            <p className="text-xs text-slate-400 mt-1">
              Verifique o termo buscado ou selecione outra categoria.
            </p>
            <button
              onClick={() => {
                setListFilterQuery('');
                setSelectedCategory('all');
              }}
              className="mt-3 text-xs font-bold text-emerald-700 hover:underline"
            >
              Limpar filtros
            </button>
          </div>
        ) : viewMode === 'categories' ? (
          /* MODO DE LISTA POR CATEGORIAS (Requisito "ajuste a categoria para ficar em modo de lista") */
          <div className="space-y-4">
            {categoryGroups.map(group => (
              <div
                key={group.key}
                className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-xs space-y-2.5"
              >
                {/* Cabeçalho da Categoria em Lista */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: group.category.color }}
                    />
                    <h2 className="text-xs sm:text-sm font-extrabold text-slate-900">
                      {group.category.label}
                    </h2>
                    <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.2 rounded-full">
                      {group.items.length} {group.items.length === 1 ? 'item' : 'itens'}
                    </span>
                  </div>

                  <span className="text-xs font-extrabold text-slate-700 tabular-nums">
                    {formatCurrency(group.subtotal)}
                  </span>
                </div>

                {/* Itens da Categoria no Layout Mobile: Caixa de seleção, foto, nome, quantidade e valor */}
                <div className="space-y-1.5">
                  {group.items.map(item => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      onToggleCheck={handleToggleCheck}
                      onUpdateQuantity={handleUpdateQuantity}
                      onSetQuantity={handleSetQuantity}
                      onSetPrice={handleSetPrice}
                      onEdit={onOpenEditItemModal}
                      onDelete={handleDeleteItem}
                      onOpenImage={url => onOpenImagePreview(url, item.name, item.category)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* MODO POR STATUS (A Comprar vs No Carrinho) */
          <div className="space-y-4">
            {/* A Comprar */}
            {pendingItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span>A Comprar</span>
                    <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {pendingItems.length}
                    </span>
                  </h2>
                  <span className="text-xs font-bold text-slate-500 tabular-nums">
                    Subtotal: {formatCurrency(totals.totalPending)}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {pendingItems.map(item => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      onToggleCheck={handleToggleCheck}
                      onUpdateQuantity={handleUpdateQuantity}
                      onSetQuantity={handleSetQuantity}
                      onSetPrice={handleSetPrice}
                      onEdit={onOpenEditItemModal}
                      onDelete={handleDeleteItem}
                      onOpenImage={url => onOpenImagePreview(url, item.name, item.category)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* No Carrinho */}
            {checkedItems.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span>No Carrinho</span>
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      {checkedItems.length}
                    </span>
                  </h2>
                  <span className="text-xs font-bold text-emerald-800 tabular-nums">
                    Comprado: {formatCurrency(totals.totalInCart)}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {checkedItems.map(item => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      onToggleCheck={handleToggleCheck}
                      onUpdateQuantity={handleUpdateQuantity}
                      onSetQuantity={handleSetQuantity}
                      onSetPrice={handleSetPrice}
                      onEdit={onOpenEditItemModal}
                      onDelete={handleDeleteItem}
                      onOpenImage={url => onOpenImagePreview(url, item.name, item.category)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Botão Flutuante (FAB) "Adicionar" sobre a lista na parte inferior direito */}
      <button
        type="button"
        onClick={() => onOpenAddItemModal()}
        className="fixed bottom-20 right-4 sm:bottom-20 sm:right-6 z-40 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-sm sm:text-base px-5 py-3 sm:px-6 sm:py-3.5 rounded-full shadow-lg shadow-emerald-950/25 border border-emerald-500/40 ring-4 ring-emerald-500/15 flex items-center gap-2 transition-all cursor-pointer select-none"
        title="Adicionar item à lista"
        aria-label="Adicionar item à lista"
      >
        <Plus size={20} strokeWidth={2.8} />
        <span>Adicionar</span>
      </button>

      {/* Sticky Financial Dock (Dock inferior) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_16px_-2px_rgba(15,23,42,0.06),0_-2px_6px_-1px_rgba(15,23,42,0.03)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-2.5">
          <div className="grid grid-cols-3 divide-x divide-slate-200">
            <div className="pr-2 sm:pr-4 flex flex-col justify-center">
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                Pendente
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-600 tabular-nums truncate">
                {formatCurrency(totals.totalPending)}
              </span>
            </div>

            <div className="px-2 sm:px-4 flex flex-col justify-center">
              <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-800 uppercase tracking-wider truncate">
                No Carrinho
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-emerald-700 tabular-nums truncate">
                {formatCurrency(totals.totalInCart)}
              </span>
            </div>

            <div className="pl-2 sm:pl-4 flex flex-col justify-center">
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                Total Geral
              </span>
              <span className="text-sm sm:text-base font-extrabold text-slate-900 tabular-nums truncate">
                {formatCurrency(totals.totalEstimated)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
