'use client';

import { usePageScrollLock } from '@/hooks/use-page-scroll-lock';

import React, { useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { CategoryIcon } from '@/components/CategoryIcon';
export { CategoryIcon } from '@/components/CategoryIcon';
import { CategoryId } from '@/types/grocery';
import { useCategories } from '@/hooks/use-categories';
import { useOutsideDismiss } from '@/hooks/use-outside-dismiss';

export function CategorySelect({ value, onChange, disabled = false }: { value: CategoryId; onChange: (value: CategoryId) => void; disabled?: boolean }) {
  const categories = useCategories();
  const pickerRef = useRef<HTMLDetailsElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  usePageScrollLock(isOpen);
  useOutsideDismiss(pickerRef, true, () => {
    if (pickerRef.current) pickerRef.current.open = false;
  });

  return (
    <details
      ref={pickerRef}
      onToggle={event => setIsOpen(event.currentTarget.open)}
      className="group/category-picker relative min-w-0"
      onKeyDown={event => {
        if (event.key !== 'Escape' || !event.currentTarget.open) return;
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.open = false;
        event.currentTarget.querySelector('summary')?.focus();
      }}
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
      }}
    >
      <summary data-form-control aria-disabled={disabled} tabIndex={disabled ? -1 : 0} onClick={event => { if (disabled) event.preventDefault(); }} aria-label={`Categoria do produto: ${categories[value]?.label || 'Selecionar'}`} className="flex cursor-pointer list-none items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm font-semibold text-slate-800 transition-colors hover:border-emerald-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 group-open/category-picker:border-emerald-400 group-open/category-picker:bg-white [&::-webkit-details-marker]:hidden">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200/60" style={{ backgroundColor: categories[value]?.bgColor }}>
          <CategoryIcon category={value} size={15} />
        </span>
        <span className="min-w-0 flex-1 truncate">{categories[value]?.label || 'Selecionar categoria'}</span>
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: categories[value]?.color }} />
        <ChevronDown size={16} className="shrink-0 text-slate-400 transition-transform group-open/category-picker:rotate-180" />
      </summary>
      <div aria-label="Categorias disponíveis" className="absolute inset-x-0 top-full z-20 mt-1.5 max-h-44 space-y-0.5 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
        {Object.values(categories).map(cat => (
          <button
            key={cat.id}
            type="button"
            disabled={disabled}
            aria-pressed={value === cat.id}
            onClick={() => {
              onChange(cat.id);
              if (pickerRef.current) {
                pickerRef.current.open = false;
                pickerRef.current.querySelector('summary')?.focus();
              }
            }}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 ${value === cat.id ? 'bg-emerald-50 font-bold text-emerald-900' : 'font-medium text-slate-700 hover:bg-slate-50'}`}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: cat.bgColor }}><CategoryIcon category={cat.id} size={14} /></span>
            <span className="min-w-0 flex-1 truncate">{cat.label}</span>
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: cat.color }} />
            <span className="flex h-4 w-4 shrink-0 items-center justify-center">{value === cat.id && <Check size={14} className="text-emerald-600" strokeWidth={2.5} />}</span>
          </button>
        ))}
      </div>
    </details>
  );
}
