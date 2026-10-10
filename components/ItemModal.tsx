'use client';

import React, { useRef, useState } from 'react';
import {
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
  Camera,
  Upload,
} from 'lucide-react';
import { GroceryItem, CategoryId, UnitType } from '@/types/grocery';
import { getAllCategories } from '@/lib/categories';
import { CATALOG_PRESETS } from '@/lib/catalog';
import { formatCurrency, saveItemConfig, findConfiguredItem } from '@/lib/storage';

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<GroceryItem, 'id' | 'createdAt'> & { id?: string }) => void;
  initialItem?: GroceryItem | null;
  defaultCategory?: CategoryId;
}

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

function prepareProductPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Escolha um arquivo de imagem.'));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const photo = new window.Image();
    photo.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, 1024 / Math.max(photo.naturalWidth, photo.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(photo.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(photo.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Não foi possível preparar a foto.'));
        return;
      }
      context.drawImage(photo, 0, 0, canvas.width, canvas.height);
      try {
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      } catch {
        reject(new Error('Não foi possível salvar a foto.'));
      }
    };
    photo.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Não foi possível abrir essa imagem.'));
    };
    photo.src = objectUrl;
  });
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
  const [imageError, setImageError] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [autoMatchedSource, setAutoMatchedSource] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const categories = React.useMemo(() => getAllCategories(), []);
  const touchStartY = useRef<number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const parsedPrice = parseFloat(price.replace(',', '.')) || 0;
  const totalPrice = quantity * parsedPrice;

  const handlePhotoSelected = async (file?: File) => {
    if (!file) return;
    setPhotoError('');
    setIsProcessingPhoto(true);
    try {
      const prepared = await prepareProductPhoto(file);
      setImageUrl(prepared);
      setImageError(false);
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : 'Não foi possível carregar a foto.');
    } finally {
      setIsProcessingPhoto(false);
    }
  };

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
    if (!name.trim() || isProcessingPhoto) return;

    const trimmedName = name.trim();
    const finalUnit = unit.trim() || 'un';
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
      checked: initialItem?.checked ?? false,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/50 backdrop-blur-xs sm:items-center sm:justify-center sm:p-4 overflow-hidden animate-fade-in" onClick={onClose}>
      <div
        className={`w-full sm:max-w-xl rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 bg-[#f8fafc] flex flex-col overflow-hidden transition-[height] duration-300 ease-out ${isExpanded ? 'h-[92dvh] sm:h-[88vh]' : 'h-[42dvh] sm:h-[62vh]'}`}
        onClick={e => e.stopPropagation()}
        onTouchStart={e => { touchStartY.current = e.touches[0].clientY; }}
        onTouchEnd={e => {
          if (touchStartY.current === null) return;
          const distance = e.changedTouches[0].clientY - touchStartY.current;
          if (distance < -45) setIsExpanded(true);
          if (distance > 45 && (formRef.current?.scrollTop ?? 0) === 0) setIsExpanded(false);
          touchStartY.current = null;
        }}
      >
        <button
          type="button"
          onClick={() => setIsExpanded(value => !value)}
          className="h-7 bg-white flex items-center justify-center text-slate-500 hover:text-emerald-700 shrink-0"
          aria-label={isExpanded ? 'Recolher ajustes' : 'Expandir ajustes'}
          title={isExpanded ? 'Recolher ajustes' : 'Expandir ajustes'}
        >
          <span className="w-10 h-1.5 rounded-full bg-slate-300" />
        </button>
        {/* Form Body - Scrollable */}
        <form ref={formRef} onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3.5">
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
                autoFocus={!initialItem}
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
          <div className="bg-white p-2.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 items-end">
              <div className="min-w-0">
                <label className="block text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Quantidade
                </label>
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
                    className="w-full h-9 sm:h-11 rounded-xl border border-slate-300 text-center text-slate-900 font-extrabold text-base sm:text-lg focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                  />
              </div>

              <div className="min-w-0">
                <label className="block text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Unidade
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                  maxLength={20}
                  placeholder="Ex: un, kg"
                  className="w-full px-2.5 h-9 sm:h-11 rounded-xl border border-slate-300 text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                />
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setQuantity(prev => Math.max(1, Math.ceil(prev) - 1))}
                  className="w-8 h-9 sm:w-9 sm:h-11 rounded-xl border border-slate-300 bg-slate-50 text-slate-700 flex items-center justify-center hover:bg-slate-100"
                  title="Diminuir quantidade"
                  aria-label="Diminuir quantidade"
                ><Minus size={16} strokeWidth={2.5} /></button>
                <button
                  type="button"
                  onClick={() => setQuantity(prev => Math.floor(prev) + 1)}
                  className="w-8 h-9 sm:w-9 sm:h-11 rounded-xl border border-slate-300 bg-slate-50 text-slate-700 flex items-center justify-center hover:bg-slate-100"
                  title="Aumentar quantidade"
                  aria-label="Aumentar quantidade"
                ><Plus size={16} strokeWidth={2.5} /></button>
              </div>
            </div>
          </div>
          {isExpanded && <div className="space-y-3.5">

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
                {categories[category]?.label}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(categories) as CategoryId[]).map(catKey => {
                const cat = categories[catKey];
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

            <div className="grid grid-cols-2 gap-2">
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                aria-label="Tirar foto com a câmera"
                onChange={e => {
                  void handlePhotoSelected(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                aria-label="Escolher foto da galeria"
                onChange={e => {
                  void handlePhotoSelected(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs sm:text-sm font-bold text-emerald-900 hover:bg-emerald-100"
              >
                <Camera size={17} /> Tirar foto
              </button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                <Upload size={17} /> Escolher da galeria
              </button>
            </div>
            {photoError && <p role="alert" className="text-xs font-semibold text-rose-600">{photoError}</p>}
            {isProcessingPhoto && <p role="status" className="text-xs font-semibold text-emerald-700">Preparando foto...</p>}

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
                      <span>Imagem indisponível (usará ícone da categoria)</span>
                    </div>
                  ) : (
                    <div className="text-emerald-800 font-semibold flex items-center gap-1">
                      <Check size={13} />
                      <span>Imagem pronta para exibição</span>
                    </div>
                  )}
                  <button type="button" onClick={() => { setImageUrl(''); setPhotoError(''); setImageError(false); }} className="text-xs font-semibold text-rose-600 hover:underline mt-1">Remover foto</button>
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
          </div>}

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
            disabled={isProcessingPhoto}
            className="flex-1 py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-wait active:scale-98 text-white font-extrabold text-sm sm:text-base shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
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
