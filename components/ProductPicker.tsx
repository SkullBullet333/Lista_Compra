'use client';

import React, { useMemo, useState } from 'react';
import { Check, Plus, Search, X } from 'lucide-react';
import { CategoryId, GroceryItem, ShoppingList } from '@/types/grocery';
import { getAllCategories } from '@/lib/categories';
import { getLatestPrice, getRegisteredItems, RegisteredCandidate } from '@/lib/storage';
import { guessCategory } from '@/lib/catalog';

interface ProductPickerProps {
  list: ShoppingList;
  lists: ShoppingList[];
  onUpdateList: (updated: ShoppingList) => void;
  onClose: () => void;
}

function createListItem(product: RegisteredCandidate, lists: ShoppingList[], currentListId: string): GroceryItem {
  const now = Date.now();
  return {
    id: `item-${now}-${Math.random().toString(36).slice(2, 8)}`,
    name: product.name,
    category: product.category,
    quantity: 1,
    unit: product.unit,
    price: product.price || 0,
    previousPrice: getLatestPrice(product.name, lists, currentListId),
    imageUrl: product.imageUrl,
    notes: product.notes,
    checked: false,
    createdAt: now,
  };
}

function updateListItems(list: ShoppingList, items: GroceryItem[]): ShoppingList {
  return { ...list, items, updatedAt: Date.now() };
}

export function ProductPicker({ list, lists, onUpdateList, onClose }: ProductPickerProps) {
  const [query, setQuery] = useState('');
  const [initialItemIds] = useState(() => new Set(list.items.map(item => item.id)));
  const categories = useMemo(() => getAllCategories(), []);
  const hasNewItems = list.items.some(item => !initialItemIds.has(item.id));
  const products = useMemo(() => getRegisteredItems(lists), [lists]);
  const visibleProducts = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR');
    return products.filter(product =>
      (!term || product.name.toLocaleLowerCase('pt-BR').includes(term))
    );
  }, [products, query]);
  const typedName = query.trim();
  const exactProduct = products.find(product =>
    product.name.trim().toLocaleLowerCase('pt-BR') === typedName.toLocaleLowerCase('pt-BR')
  );

  const findInList = (product: RegisteredCandidate) => list.items.find(item =>
    item.category === product.category &&
    item.name.trim().toLocaleLowerCase('pt-BR') === product.name.trim().toLocaleLowerCase('pt-BR')
  );

  const toggleProduct = (product: RegisteredCandidate) => {
    const existing = findInList(product);
    const items = existing
      ? list.items.filter(item => item.id !== existing.id)
      : [createListItem(product, lists, list.id), ...list.items];
    onUpdateList(updateListItems(list, items));
  };

  const addTypedProduct = () => {
    if (!typedName || exactProduct) return;
    const product: RegisteredCandidate = {
      id: `custom-${typedName.toLocaleLowerCase('pt-BR')}`,
      name: typedName,
      category: guessCategory(typedName),
      unit: 'un',
      price: 0,
      source: 'history',
    };
    toggleProduct(product);
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 pt-4 pb-28">
      <div className="relative mb-3">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          autoFocus
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault();
              if (exactProduct) toggleProduct(exactProduct);
              else addTypedProduct();
            }
          }}
          placeholder="Buscar produtos cadastrados"
          aria-label="Buscar produtos cadastrados"
          className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        {query && <button type="button" onClick={() => setQuery('')} aria-label="Limpar busca" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"><X size={17} /></button>}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-100 flex justify-between text-xs font-bold text-slate-600">
          <span>Produtos cadastrados</span>
          <span>{visibleProducts.length}</span>
        </div>
        {typedName && !exactProduct && (
          <button
            type="button"
            onClick={addTypedProduct}
            className="w-full flex items-center gap-3 px-4 py-3 text-left bg-emerald-50 hover:bg-emerald-100 border-b border-emerald-100"
          >
            <span className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0"><Plus size={17} strokeWidth={3} /></span>
            <span className="text-sm font-bold text-emerald-900 truncate">Adicionar “{typedName}”</span>
          </button>
        )}
        {visibleProducts.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">{typedName ? 'Você pode adicionar o nome digitado acima.' : 'Nenhum produto encontrado.'}</p>
        ) : (
          <div className="max-h-[65vh] overflow-y-auto divide-y divide-slate-100">
            {visibleProducts.map(product => {
              const selected = !!findInList(product);
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => toggleProduct(product)}
                  aria-pressed={selected}
                  aria-label={`${selected ? 'Remover' : 'Adicionar'} ${product.name} ${selected ? 'da' : 'à'} lista`}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${selected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {selected ? <Check size={17} strokeWidth={3} /> : <Plus size={17} strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-semibold text-slate-800 truncate">{product.name}</span>
                  <span className="text-[11px] text-slate-500 text-right shrink-0">{categories[product.category]?.label || 'Outros Itens'}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      {hasNewItems && (
        <button
          type="button"
          onClick={onClose}
          className="fixed bottom-6 right-4 sm:right-6 z-40 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 text-sm font-extrabold shadow-lg"
        >
          Concluir
        </button>
      )}
    </div>
  );
}
