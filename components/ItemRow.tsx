'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, Trash2, Edit3, Plus, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { GroceryItem } from '@/types/grocery';
import { formatCurrency } from '@/lib/storage';
import { ItemImage } from './ItemImage';

interface ItemRowProps {
  item: GroceryItem;
  onToggleCheck: (id: string) => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  onSetQuantity?: (id: string, quantity: number) => void;
  onSetPrice?: (id: string, price: number) => void;
  onEdit: (item: GroceryItem) => void;
  onDelete: (id: string) => void;
  onOpenImage: (imageUrl: string, name: string) => void;
}

export function ItemRow({
  item,
  onToggleCheck,
  onUpdateQuantity,
  onSetQuantity,
  onSetPrice,
  onEdit,
  onDelete,
  onOpenImage,
}: ItemRowProps) {
  const lineTotal = item.quantity * item.price;
  const priceDifference = item.previousPrice && item.price > 0 ? item.price - item.previousPrice : 0;

  // Estado para edição em linha da QUANTIDADE
  const [isEditingQty, setIsEditingQty] = useState(false);
  const [qtyInput, setQtyInput] = useState(() => item.quantity.toString().replace('.', ','));

  // Estado para edição em linha do VALOR
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState(() =>
    item.price > 0 ? item.price.toFixed(2).replace('.', ',') : '0,00'
  );
  const [swipeOffset, setSwipeOffset] = useState(0);
  const swipeStart = useRef<{ x: number; y: number; offset: number } | null>(null);

  useEffect(() => {
    setSwipeOffset(0);
  }, [item.checked]);

  const handleTouchStart = (event: React.TouchEvent) => {
    if ((event.target as HTMLElement).closest('button, input')) {
      swipeStart.current = null;
      return;
    }
    const touch = event.touches[0];
    swipeStart.current = { x: touch.clientX, y: touch.clientY, offset: swipeOffset };
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    if (!swipeStart.current) return;
    const touch = event.touches[0];
    const deltaX = touch.clientX - swipeStart.current.x;
    const deltaY = touch.clientY - swipeStart.current.y;
    if (Math.abs(deltaY) > Math.abs(deltaX)) return;
    setSwipeOffset(Math.max(-76, Math.min(0, swipeStart.current.offset + deltaX)));
  };

  const handleTouchEnd = () => {
    setSwipeOffset(current => current <= -38 ? -76 : 0);
    swipeStart.current = null;
  };

  const handleStepDelta = (delta: number) => {
    const step = item.unit === 'kg' || item.unit === 'g' || item.unit === 'L' ? 0.2 : 1;
    onUpdateQuantity(item.id, delta * step);
  };

  // Salva edição em linha da Quantidade
  const handleCommitQty = () => {
    setIsEditingQty(false);
    const parsed = parseFloat(qtyInput.replace(',', '.'));
    const finalQty = !isNaN(parsed) && parsed > 0 ? parsed : 1;
    if (onSetQuantity) {
      onSetQuantity(item.id, finalQty);
    } else {
      onUpdateQuantity(item.id, finalQty - item.quantity);
    }
  };

  // Salva edição em linha do Valor
  const handleCommitPrice = () => {
    setIsEditingPrice(false);
    const parsed = parseFloat(priceInput.replace(',', '.'));
    const finalPrice = !isNaN(parsed) && parsed >= 0 ? parsed : 0;
    if (onSetPrice) {
      onSetPrice(item.id, finalPrice);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      <button
        type="button"
        onClick={() => { setSwipeOffset(0); onDelete(item.id); }}
        className="absolute inset-y-0 right-0 flex w-[76px] items-center justify-center gap-1 bg-rose-600 text-xs font-bold text-white sm:hidden"
        aria-label={`Excluir ${item.name}`}
      >
        <Trash2 size={15} />
        <span>Excluir</span>
      </button>
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ transform: `translateX(${swipeOffset}px)`, touchAction: 'pan-y' }}
        className={`group relative flex items-center gap-2 sm:gap-3 p-2 sm:p-3 sm:px-4 rounded-xl border transition-[transform,background-color,border-color,opacity] duration-150 ${
        item.checked
          ? 'bg-slate-50/70 border-slate-200/60 opacity-80'
          : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-xs'
        }`}
      >
      {/* 1. Caixa de seleção */}
      <button
        type="button"
        onClick={() => {
          setSwipeOffset(0);
          onToggleCheck(item.id);
        }}
        className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center shrink-0 focus:outline-none"
        aria-label={item.checked ? 'Desmarcar do carrinho' : 'Marcar no carrinho'}
      >
        <div
          className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center transition-all border ${
            item.checked
              ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
              : 'border-slate-300 bg-white hover:border-emerald-500'
          }`}
        >
          {item.checked && <Check size={12} strokeWidth={3} className="sm:hidden" />}
          {item.checked && <Check size={14} strokeWidth={3} className="hidden sm:block" />}
        </div>
      </button>

      {/* 2. A foto */}
      <ItemImage
        key={item.imageUrl || 'no-photo'}
        src={item.imageUrl}
        alt={item.name}
        category={item.category}
        size="sm"
        className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg shrink-0 cursor-pointer"
        onClick={item.imageUrl ? () => onOpenImage(item.imageUrl!, item.name) : () => onEdit(item)}
      />

      {/* 3. O nome */}
      <div
        className="flex-1 min-w-0 cursor-pointer py-0.5"
        onClick={() => onEdit(item)}
      >
        <span
          className={`font-semibold text-xs sm:text-sm block truncate ${
            item.checked
              ? 'line-through text-slate-400 font-normal'
              : 'text-slate-900'
          }`}
        >
          {item.name}
        </span>
        {/* Informações detalhadas visíveis apenas no desktop (sm:) */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
          <span className="font-medium text-slate-500 tabular-nums">
            {formatCurrency(item.price)} / {item.unit}
          </span>
          {item.notes && (
            <>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="text-[11px] text-slate-400 italic truncate max-w-[160px]">
                {item.notes}
              </span>
            </>
          )}
        </div>
        {item.previousPrice !== undefined && item.previousPrice > 0 && item.price > 0 && (
          <div className={`flex items-center gap-1 mt-0.5 text-[10px] font-bold ${priceDifference > 0 ? 'text-rose-600' : priceDifference < 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
            {priceDifference > 0 ? <TrendingUp size={11} /> : priceDifference < 0 ? <TrendingDown size={11} /> : null}
            <span>{priceDifference === 0 ? 'Mesmo preço anterior' : `${priceDifference > 0 ? 'Mais caro' : 'Mais barato'} ${formatCurrency(Math.abs(priceDifference))}`}</span>
          </div>
        )}
      </div>

      {/* 4. A quantidade (com EDIÇÃO EM LINHA e teclado numérico direto no celular) */}
      <div className="shrink-0 flex items-center">
        {isEditingQty ? (
          <div className="flex items-center gap-1 bg-emerald-50 border-2 border-emerald-500 rounded-lg p-0.5 shadow-xs animate-fade-in">
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              autoFocus
              value={qtyInput}
              onFocus={e => e.target.select()}
              onChange={e => setQtyInput(e.target.value.replace(/[^0-9,.]/g, ''))}
              onBlur={handleCommitQty}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCommitQty();
                if (e.key === 'Escape') setIsEditingQty(false);
              }}
              className="w-14 sm:w-16 text-center text-xs sm:text-sm font-extrabold text-slate-900 bg-white rounded border border-emerald-400 focus:outline-none py-1 tabular-nums"
              title="Digite a quantidade e confirme"
            />
            <span className="text-[10px] font-extrabold text-emerald-800 pr-1 uppercase">
              {item.unit}
            </span>
          </div>
        ) : (
          <>
            {/* Mobile: Pílula clicável que abre o teclado numérico */}
            <div className="flex sm:hidden items-center">
              <button
                type="button"
                onClick={() => {
                  setQtyInput(item.quantity.toString().replace('.', ','));
                  setIsEditingQty(true);
                }}
                className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 active:bg-emerald-100 border border-slate-200/60 px-2 py-1 rounded-md tabular-nums whitespace-nowrap transition-all"
                title="Toque para editar quantidade direto com teclado numérico"
              >
                {item.quantity} {item.unit}
              </button>
            </div>

            {/* Desktop (sm+): Stepper completo com número clicável para digitação */}
            <div className="hidden sm:flex items-center bg-slate-100 rounded-lg border border-slate-200/80 p-0.5">
              <button
                type="button"
                onClick={() => handleStepDelta(-1)}
                className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition-all active:scale-90"
                title="Diminuir quantidade"
              >
                <Minus size={13} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setQtyInput(item.quantity.toString().replace('.', ','));
                  setIsEditingQty(true);
                }}
                className="min-w-10 text-center text-xs font-bold text-slate-800 tabular-nums px-1 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                title="Clique para digitar quantidade numérica"
              >
                {item.quantity} {item.unit}
              </button>
              <button
                type="button"
                onClick={() => handleStepDelta(1)}
                className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition-all active:scale-90"
                title="Aumentar quantidade"
              >
                <Plus size={13} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* 5. O valor (com EDIÇÃO EM LINHA e teclado numérico direto no celular) */}
      <div className="text-right shrink-0 min-w-[62px] sm:min-w-[85px] flex justify-end">
        {isEditingPrice ? (
          <div className="flex items-center gap-0.5 bg-emerald-50 border-2 border-emerald-500 rounded-lg p-0.5 shadow-xs animate-fade-in">
            <span className="text-[10px] font-bold text-emerald-800 pl-1 select-none">
              R$
            </span>
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              autoFocus
              value={priceInput}
              onFocus={e => e.target.select()}
              onChange={e => setPriceInput(e.target.value.replace(/[^0-9,.]/g, ''))}
              onBlur={handleCommitPrice}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCommitPrice();
                if (e.key === 'Escape') setIsEditingPrice(false);
              }}
              className="w-16 sm:w-20 text-right text-xs sm:text-sm font-extrabold text-slate-900 bg-white rounded border border-emerald-400 focus:outline-none py-1 pr-1 tabular-nums"
              title="Digite o preço unitário e confirme"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setPriceInput(item.price > 0 ? item.price.toFixed(2).replace('.', ',') : '0,00');
              setIsEditingPrice(true);
            }}
            className={`text-xs sm:text-sm font-extrabold tabular-nums px-1.5 py-1 rounded-md transition-all hover:bg-emerald-50 hover:text-emerald-700 active:scale-95 ${
              item.checked ? 'text-slate-400 line-through' : 'text-slate-900'
            }`}
            title="Toque para editar o valor direto com teclado numérico"
          >
            {formatCurrency(lineTotal)}
          </button>
        )}
      </div>

      {/* Ações adicionais no desktop; no celular, arraste para a esquerda. */}
      <div className="hidden sm:flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => onEdit(item)}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
          title="Editar item"
        >
          <Edit3 size={14} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          title="Excluir item"
        >
          <Trash2 size={14} />
        </button>
      </div>
      </div>
    </div>
  );
}
