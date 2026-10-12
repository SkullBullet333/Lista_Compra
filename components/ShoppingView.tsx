'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  CheckCheck,
  ChevronDown,
  Layers,
  ListFilter,
  ShoppingBag,
} from 'lucide-react';
import { ShoppingList, GroceryItem, CategoryId } from '@/types/grocery';
import { getAllCategories } from '@/lib/categories';
import { calculateListTotals, formatCurrency } from '@/lib/storage';
import { ItemRow } from './ItemRow';
import { ProductPicker } from './ProductPicker';

interface ShoppingViewProps {
  list: ShoppingList;
  lists: ShoppingList[];
  onUpdateList: (updated: ShoppingList) => void;
  isProductPickerOpen: boolean;
  onOpenProductPicker: () => void;
  onCloseProductPicker: () => void;
  onOpenEditItemModal: (item: GroceryItem) => void;
  onOpenBudgetModal: () => void;
  onOpenImagePreview: (url: string, name: string, category: CategoryId) => void;
  onSwitchToLists: () => void;
}

export function ShoppingView({
  list,
  lists,
  onUpdateList,
  isProductPickerOpen,
  onOpenProductPicker,
  onCloseProductPicker,
  onOpenEditItemModal,
  onOpenImagePreview,
}: ShoppingViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all'>('all');
  const [showCategoryListModal, setShowCategoryListModal] = useState(false);
  const [viewMode, setViewMode] = useState<'categories' | 'status'>('categories');
  const [deletedItem, setDeletedItem] = useState<{ item: GroceryItem; index: number } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const categories = useMemo(() => getAllCategories(), []);
  const availableCategories = useMemo(
    () => (Object.keys(categories) as CategoryId[]).filter(categoryId => list.items.some(item => item.category === categoryId)),
    [categories, list.items]
  );
  const totals = useMemo(() => calculateListTotals(list.items), [list.items]);

  useEffect(() => {
    if (selectedCategory !== 'all' && !availableCategories.includes(selectedCategory)) {
      setSelectedCategory('all');
    }
  }, [availableCategories, selectedCategory]);

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

  useEffect(() => () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }, []);

  // Exclui e mantém uma janela curta para desfazer.
  const handleDeleteItem = (id: string) => {
    const index = list.items.findIndex(item => item.id === id);
    if (index < 0) return;
    const removed = list.items[index];
    const updated = list.items.filter(item => item.id !== removed.id);
    onUpdateList({ ...list, items: updated, updatedAt: Date.now() });
    setDeletedItem({ item: removed, index: Math.max(index, 0) });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setDeletedItem(null), 7000);
  };

  const undoDeleteItem = () => {
    if (!deletedItem) return;
    const restored = [...list.items];
    restored.splice(Math.min(deletedItem.index, restored.length), 0, deletedItem.item);
    onUpdateList({ ...list, items: restored, updatedAt: Date.now() });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = null;
    setDeletedItem(null);
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

  const filteredItems = useMemo(() => list.items.filter(item =>
    selectedCategory === 'all' || item.category === selectedCategory
  ), [list.items, selectedCategory]);

  // Group items by category for list mode
  const categoryGroups = useMemo(() => {
    const activeCats = (Object.keys(categories) as CategoryId[]).filter(catKey => {
      if (selectedCategory !== 'all' && selectedCategory !== catKey) return false;
      return filteredItems.some(i => i.category === catKey);
    });

    return activeCats.map(catKey => {
      const cat = categories[catKey];
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
  }, [filteredItems, selectedCategory, categories]);

  const pendingItems = filteredItems.filter(i => !i.checked);
  const checkedItems = filteredItems.filter(i => i.checked);

  if (isProductPickerOpen) {
    return <ProductPicker
      list={list}
      lists={lists}
      onUpdateList={onUpdateList}
      onClose={onCloseProductPicker}
    />;
  }

  return (
    <div className="pb-32">
      <div className="w-full bg-slate-200 h-1.5 overflow-hidden">
        <div className="bg-emerald-500 h-full transition-all duration-300 ease-out" style={{ width: `${totals.percentDone}%` }} />
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-6 pt-3 sm:pt-4">
        {/* Barra de Filtros e Categorias no Modo de Lista */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
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
              title="Categorias"
              aria-label="Categorias"
            >
              <ListFilter size={14} />
              <span>Categorias</span>
              <ChevronDown size={13} />
            </button>
          </div>

          {/* Categoria em Modo de Lista (Menu suspenso / gaveta vertical limpa de categorias) */}
          {showCategoryListModal && (
            <div className="bg-white border border-slate-200 rounded-2xl p-2.5 shadow-md animate-fade-in space-y-1">
              <div className="flex items-center justify-between px-2 py-1 text-xs font-extrabold text-black border-b border-slate-100 mb-1">
                <span>Selecionar Categoria</span>
                <button
                  onClick={() => setShowCategoryListModal(false)}
                  className="text-red-600 hover:text-red-700 text-xs"
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
                    ? 'bg-emerald-50 text-emerald-950 border border-emerald-200'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>Todas as Categorias</span>
                <span className="text-[11px] opacity-80">{list.items.length} itens</span>
              </button>

              {/* Lista Vertical de Categorias */}
              {availableCategories.map(catKey => {
                const cat = categories[catKey];
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
              Toque em Adicionar para escolher produtos cadastrados.
            </p>
            <button
              onClick={onOpenProductPicker}
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
              Selecione outra categoria para ver seus itens.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('all');
              }}
              className="mt-3 text-xs font-bold text-emerald-700 hover:underline"
            >
              Mostrar todas as categorias
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
        onClick={onOpenProductPicker}
        className="fixed bottom-28 right-4 sm:bottom-28 sm:right-6 z-40 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-sm sm:text-base px-5 py-3 sm:px-6 sm:py-3.5 rounded-full shadow-lg shadow-emerald-950/25 border border-emerald-500/40 ring-4 ring-emerald-500/15 flex items-center gap-2 transition-all cursor-pointer select-none"
        title="Adicionar item à lista"
        aria-label="Adicionar item à lista"
      >
        <Plus size={20} strokeWidth={2.8} />
        <span>Adicionar</span>
      </button>

      {deletedItem && <div role="status" className="app-undo-toast fixed bottom-20 left-1/2 z-70 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-3 rounded-xl px-4 py-3 text-sm shadow-2xl">
        <span className="min-w-0 flex-1 truncate">“{deletedItem.item.name}” foi excluído.</span>
        <button type="button" onClick={undoDeleteItem} className="app-undo-toast__action shrink-0 font-extrabold">Desfazer</button>
      </div>}

      <div className="fixed bottom-8 left-0 right-0 z-40 border-t border-slate-200/90 bg-white/95 shadow-[0_-4px_16px_-2px_rgba(15,23,42,0.06),0_-2px_6px_-1px_rgba(15,23,42,0.03)] backdrop-blur-md sm:bottom-8">
        <div className="max-w-4xl mx-auto px-4 py-2.5 sm:px-6">
          <div className="grid grid-cols-3 divide-x divide-slate-200">
            <div className="pr-2 sm:pr-4 flex flex-col justify-center">
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">Pendente</span>
              <span className="text-xs sm:text-sm font-bold text-slate-600 tabular-nums truncate">{formatCurrency(totals.totalPending)}</span>
            </div>
            <div className="px-2 sm:px-4 flex flex-col justify-center">
              <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-800 uppercase tracking-wider truncate">No Carrinho</span>
              <span className="text-xs sm:text-sm font-extrabold text-emerald-700 tabular-nums truncate">{formatCurrency(totals.totalInCart)}</span>
            </div>
            <div className="pl-2 sm:pl-4 flex flex-col justify-center">
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">Total Geral</span>
              <span className="text-sm sm:text-base font-extrabold text-slate-900 tabular-nums truncate">{formatCurrency(totals.totalEstimated)}</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
