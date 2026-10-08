'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  X,
  Image as ImageIcon,
  Check,
  Sparkles,
  Plus,
  Minus,
  AlertCircle,
  BookmarkCheck,
  Apple,
  Croissant,
  Package,
  Beef,
  Milk,
  Sparkles as CleanIcon,
  Coffee,
  ShoppingBag,
} from 'lucide-react';
import { GroceryItem, CategoryId, UnitType, CATEGORIES } from '@/types/grocery';
import { CATALOG_PRESETS } from '@/lib/catalog';
import { formatCurrency, saveItemConfig, findConfiguredItem } from '@/lib/storage';

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<GroceryItem, 'id' | 'createdAt'> & { id?: string }) => void;
  initialItem?: GroceryItem | null;
  defaultCategory?: CategoryId;
}

const UNITS: { id: UnitType; label: string }[] = [
  { id: 'un', label: 'un (unidade)' },
  { id: 'kg', label: 'kg (quilo)' },
  { id: 'g', label: 'g (gramas)' },
  { id: 'pct', label: 'pct (pacote)' },
  { id: 'cx', label: 'cx (caixa)' },
  { id: 'L', label: 'L (litro)' },
  { id: 'ml', label: 'ml (mililitros)' },
  { id: 'dz', label: 'dz (dúzia)' },
];

function getCategoryIcon(cat: CategoryId, size = 16) {
  switch (cat) {
    case 'feira':
      return <Apple size={size} className="text-emerald-700" />;
    case 'padaria':
      return <Croissant size={size} className="text-amber-700" />;
    case 'mercearia':
      return <Package size={size} className="text-orange-700" />;
    case 'carnes':
      return <Beef size={size} className="text-rose-700" />;
    case 'laticinios':
      return <Milk size={size} className="text-sky-700" />;
    case 'limpeza':
      return <CleanIcon size={size} className="text-purple-700" />;
    case 'bebidas':
      return <Coffee size={size} className="text-teal-700" />;
    default:
      return <ShoppingBag size={size} className="text-slate-600" />;
  }
}

function ItemModalForm({
  onClose,
  onSave,
  initialItem,
  defaultCategory = 'feira',
}: {
  onClose: () => void;
  onSave: (item: Omit<GroceryItem, 'id' | 'createdAt'> & { id?: string }) => void;
  initialItem?: GroceryItem | null;
  defaultCategory?: CategoryId;
}) {
  const [name, setName] = useState(initialItem?.name || '');
  const [category, setCategory] = useState<CategoryId>(initialItem?.category || defaultCategory);
  const [quantity, setQuantity] = useState<number>(initialItem?.quantity ?? 1);
  const [unit, setUnit] = useState<UnitType>(initialItem?.unit || 'un');
  const [price, setPrice] = useState<string>(
    initialItem ? initialItem.price.toFixed(2).replace('.', ',') : '0,00'
  );
  const [imageUrl, setImageUrl] = useState<string>(initialItem?.imageUrl || '');
  const [notes, setNotes] = useState<string>(initialItem?.notes || '');
  const [checked, setChecked] = useState<boolean>(initialItem?.checked || false);
  const [imageError, setImageError] = useState(false);
  const [autoMatchedSource, setAutoMatchedSource] = useState<string | null>(null);

  const parsedPrice = parseFloat(price.replace(',', '.')) || 0;
  const totalPrice = quantity * parsedPrice;

  // Search memory and catalog when typing name
  const handleNameChange = (val: string) => {
    setName(val);
    if (!initialItem && val.trim().length >= 2) {
      const match = findConfiguredItem(val);
      if (match.source !== 'default') {
        setCategory(match.category);
        setUnit(match.unit);
        if (match.imageUrl && !imageUrl) {
          setImageUrl(match.imageUrl);
        }
        if (match.notes && !notes) {
          setNotes(match.notes);
        }
        setAutoMatchedSource(
          match.source === 'user_saved'
            ? 'Memória de Itens Salvos'
            : match.source === 'list_history'
            ? 'Histórico de Listas'
            : 'Catálogo de Produtos'
        );
      } else {
        setCategory(match.category);
        setAutoMatchedSource(null);
      }
    } else {
      setAutoMatchedSource(null);
    }
  };

  const handleSelectPreset = (preset: typeof CATALOG_PRESETS[0]) => {
    setName(preset.name);
    setCategory(preset.category);
    setPrice(preset.defaultPrice.toFixed(2).replace('.', ','));
    setUnit(preset.defaultUnit);
    setImageUrl(preset.imageUrl);
    setAutoMatchedSource('Catálogo');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const trimmedName = name.trim();
    const finalUnit = unit;
    const finalCategory = category;
    const finalImage = imageUrl.trim() || undefined;
    const finalNotes = notes.trim() || undefined;

    // 1. Salvar configuração do item na memória para futuras listas
    saveItemConfig({
      name: trimmedName,
      unit: finalUnit,
      category: finalCategory,
      imageUrl: finalImage,
      defaultPrice: parsedPrice > 0 ? parsedPrice : undefined,
      notes: finalNotes,
      updatedAt: Date.now(),
    });

    // 2. Salvar o item na lista ativa
    onSave({
      ...(initialItem ? { id: initialItem.id } : {}),
      name: trimmedName,
      category: finalCategory,
      quantity: Math.max(0.01, quantity),
      unit: finalUnit,
      price: parsedPrice,
      imageUrl: finalImage,
      notes: finalNotes,
      checked,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#f8fafc] sm:bg-slate-900/60 sm:backdrop-blur-xs sm:items-center sm:justify-center sm:p-4 overflow-hidden animate-fade-in">
      <div
        className="w-full h-full sm:h-auto sm:max-w-xl sm:rounded-2xl sm:shadow-2xl sm:border sm:border-slate-200 bg-[#f8fafc] flex flex-col sm:max-h-[92vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header no estilo Página / Topbar com botão Voltar */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 bg-white border-b border-slate-200 flex items-center justify-between gap-3 shrink-0 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 sm:w-8 sm:h-8 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 flex items-center justify-center transition-colors shrink-0"
              title="Voltar para a lista"
              aria-label="Voltar para a lista"
            >
              <ArrowLeft size={20} strokeWidth={2.5} />
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">
                {initialItem ? 'Editar Item' : 'Adicionar Item'}
              </h1>
              <p className="text-[11px] text-slate-500 truncate hidden sm:block">
                {initialItem ? 'Atualize os dados e valores do item' : 'Configure os dados do produto para a lista'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="hidden sm:flex px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-4 py-2 sm:py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-xs font-bold text-white shadow-xs transition-all flex items-center gap-1.5"
            >
              <Check size={15} strokeWidth={2.5} />
              <span>Salvar</span>
            </button>
          </div>
        </div>

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3.5">
          {/* Card: Nome do Item */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Nome do Item <span className="text-rose-500">*</span>
              </label>
              {autoMatchedSource && (
                <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                  <BookmarkCheck size={13} />
                  {autoMatchedSource}
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                required
                autoFocus
                value={name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="Ex: Arroz Tio João, Banana Prata, Sabão..."
                className="w-full px-3.5 py-2.5 sm:py-3 rounded-xl border border-slate-300 text-slate-900 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all font-semibold placeholder:font-normal placeholder:text-slate-400"
              />
              {name && (
                <button
                  type="button"
                  onClick={() => {
                    setName('');
                    setAutoMatchedSource(null);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
                  title="Limpar nome"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Catalog Suggestions */}
            {!initialItem && (
              <div className="pt-1">
                <span className="text-[10px] sm:text-[11px] text-slate-400 font-semibold uppercase tracking-wider block mb-1.5">
                  Sugestões rápidas:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {CATALOG_PRESETS.filter(p =>
                    !name.trim() || p.name.toLowerCase().includes(name.toLowerCase())
                  )
                    .slice(0, 5)
                    .map(preset => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1 border border-emerald-200/60 active:scale-95"
                      >
                        <Sparkles size={11} className="text-emerald-700" />
                        <span>{preset.name}</span>
                        <span className="text-[10px] text-emerald-700 opacity-80">
                          ({formatCurrency(preset.defaultPrice)})
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Card: Quantidade & Unidade */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Quantidade
                </label>
                <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20 bg-white">
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity(prev =>
                        Math.max(0.1, Number((prev - (unit === 'kg' || unit === 'g' ? 0.2 : 1)).toFixed(2)))
                      )
                    }
                    className="w-12 h-11 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 transition-colors shrink-0"
                    title="Diminuir quantidade"
                  >
                    <Minus size={16} strokeWidth={2.5} />
                  </button>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    inputMode="decimal"
                    value={quantity}
                    onChange={e => {
                      const val = parseFloat(e.target.value);
                      setQuantity(isNaN(val) ? 0 : val);
                    }}
                    className="w-full text-center py-2.5 text-slate-900 font-extrabold text-base sm:text-lg focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity(prev =>
                        Number((prev + (unit === 'kg' || unit === 'g' ? 0.2 : 1)).toFixed(2))
                      )
                    }
                    className="w-12 h-11 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 transition-colors shrink-0"
                    title="Aumentar quantidade"
                  >
                    <Plus size={16} strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Unidade de Medida
                </label>
                <select
                  value={unit}
                  onChange={e => setUnit(e.target.value as UnitType)}
                  className="w-full px-3.5 py-2.5 sm:py-3 rounded-xl border border-slate-300 text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white h-11"
                >
                  {UNITS.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Card: Preço Unitário & Subtotal Calculado */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Valor / Preço Unitário (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={price}
                    onChange={e => {
                      const cleaned = e.target.value.replace(/[^0-9,.]/g, '');
                      setPrice(cleaned);
                    }}
                    placeholder="0,00"
                    className="w-full pl-9 pr-3.5 py-2.5 sm:py-3 rounded-xl border border-slate-300 text-slate-900 text-sm sm:text-base font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Subtotal Display Box */}
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex flex-col justify-center">
                <span className="text-[11px] font-semibold text-emerald-900">
                  Total estimado ({quantity} {unit} × {formatCurrency(parsedPrice)}):
                </span>
                <span className="text-base sm:text-lg font-extrabold text-emerald-800 tabular-nums">
                  {formatCurrency(totalPrice)}
                </span>
              </div>
            </div>
          </div>

          {/* Card: Categoria */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Categoria do Produto
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                {CATEGORIES[category]?.label}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(CATEGORIES) as CategoryId[]).map(catKey => {
                const cat = CATEGORIES[catKey];
                const isSelected = category === catKey;
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setCategory(catKey)}
                    className={`p-2 sm:p-2.5 rounded-xl text-xs font-semibold text-left transition-all border flex items-center justify-between ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-xs ring-2 ring-emerald-500/20'
                        : 'border-slate-200/80 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                        style={{ backgroundColor: cat.bgColor }}
                      >
                        {getCategoryIcon(catKey, 14)}
                      </div>
                      <span className="truncate text-xs">{cat.label}</span>
                    </div>

                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <Check size={10} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card: Imagem do Produto (Opcional) */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon size={14} className="text-emerald-700" />
                <span>Foto do Produto</span>
              </label>
              <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded-full">
                Opcional
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="url"
                value={imageUrl}
                onChange={e => {
                  setImageUrl(e.target.value);
                  setImageError(false);
                }}
                placeholder="Cole o link da foto (URL)..."
                className="flex-1 px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="px-2.5 text-xs text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium"
                >
                  Limpar
                </button>
              )}
            </div>

            {/* Quick Catalog Photos */}
            <div className="pt-1">
              <span className="text-[10px] text-slate-400 font-medium block mb-1">
                Ou selecione uma foto pronta do catálogo:
              </span>
              <div className="flex gap-2 overflow-x-auto py-1 no-scrollbar">
                {CATALOG_PRESETS.slice(0, 8).map(preset => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setImageUrl(preset.imageUrl);
                      setImageError(false);
                    }}
                    className={`w-10 h-10 rounded-xl overflow-hidden border shrink-0 transition-all ${
                      imageUrl === preset.imageUrl
                        ? 'border-emerald-600 ring-2 ring-emerald-500'
                        : 'border-slate-200 hover:border-slate-400'
                    }`}
                    title={preset.name}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preset.imageUrl}
                      alt={preset.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Live Image Preview */}
            {imageUrl && (
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 bg-white shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt="Pré-visualização"
                    referrerPolicy="no-referrer"
                    onError={() => setImageError(true)}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-xs flex-1 min-w-0">
                  {imageError ? (
                    <div className="text-rose-600 font-semibold flex items-center gap-1">
                      <AlertCircle size={13} />
                      <span>URL inacessível (usará ícone da categoria)</span>
                    </div>
                  ) : (
                    <div className="text-emerald-800 font-semibold flex items-center gap-1">
                      <Check size={13} />
                      <span>Imagem pronta para exibição</span>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">{imageUrl}</p>
                </div>
              </div>
            )}
          </div>

          {/* Card: Observações / Marca */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Observações / Marca Preferida (Opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ex: Marca Quero, sem lactose, bem maduro..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          {/* Card: Já no Carrinho */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={checked}
                onChange={e => setChecked(e.target.checked)}
                className="w-5 h-5 rounded-md text-emerald-600 focus:ring-emerald-500 border-slate-300"
              />
              <div>
                <span className="text-xs sm:text-sm font-bold text-slate-800 block">
                  Já colocar no carrinho (comprado)
                </span>
                <span className="text-[11px] text-slate-500 block">
                  O item entrará marcado na lista somando direto no carrinho
                </span>
              </div>
            </label>
          </div>
        </form>

        {/* Sticky Bottom Actions Bar (Rodapé Fixo) */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shadow-lg flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-3 rounded-xl border border-slate-200 font-bold text-xs sm:text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex-1 py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold text-sm sm:text-base shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Check size={18} strokeWidth={2.5} />
            <span>{initialItem ? 'Salvar Alterações' : 'Adicionar à Lista'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function ItemModal({
  isOpen,
  onClose,
  onSave,
  initialItem,
  defaultCategory,
}: ItemModalProps) {
  if (!isOpen) return null;

  return (
    <ItemModalForm
      key={initialItem?.id || 'new-' + (defaultCategory || 'default')}
      onClose={onClose}
      onSave={onSave}
      initialItem={initialItem}
      defaultCategory={defaultCategory}
    />
  );
}
