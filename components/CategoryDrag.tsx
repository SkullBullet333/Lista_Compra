'use client';

import React, { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Category, CategoryId } from '@/types/grocery';

type MovingItem = { id: string; name: string; category: CategoryId };
type Drag = { item: MovingItem; pointerId: number | null; x: number; y: number };
type DragContext = {
  scope: string;
  activeId?: string;
  target: CategoryId | null;
  disabled: boolean;
  start: (item: MovingItem, event: { isPrimary: boolean; button: number; pointerId: number; clientX: number; clientY: number; currentTarget: HTMLElement }) => void;
  choose: (item: MovingItem) => void;
  panel?: React.ReactNode;
};
const Context = createContext<DragContext | null>(null);

export function CategoryDragProvider({ categories, onMove, disabled = false, children }: {
  categories: Record<string, Category>;
  onMove: (id: string, category: CategoryId) => void | Promise<void>;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const scope = useId();
  const [drag, setDrag] = useState<Drag | null>(null);
  const [target, setTarget] = useState<CategoryId | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!message) return;
    const timeout = setTimeout(() => setMessage(''), 3000);
    return () => clearTimeout(timeout);
  }, [message]);
  const tray = useRef<HTMLDivElement>(null);
  const preview = useRef<HTMLDivElement>(null);
  const startPosition = useRef({ x: 0, y: 0 });
  const callbacks = useRef({ onMove, categories });
  useEffect(() => { callbacks.current = { onMove, categories }; });
  const busy = useRef(false);

  const finish = async (item: MovingItem, category: CategoryId | null) => {
    setDrag(null);
    setTarget(null);
    if (!category || category === item.category || !callbacks.current.categories[category] || busy.current) return;
    busy.current = true;
    setSaving(true);
    try {
      await callbacks.current.onMove(item.id, category);
      setMessage(`${item.name} movido para ${callbacks.current.categories[category]?.label || category}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível mover o item. Tente novamente.');
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };
  const finishRef = useRef(finish);
  useEffect(() => { finishRef.current = finish; });

  useEffect(() => {
    if (!drag) return;
    const cancel = () => { setDrag(null); setTarget(null); };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); cancel(); }
    };
    window.addEventListener('keydown', keydown, true);
    window.addEventListener('blur', cancel);
    if (drag.pointerId === null) {
      tray.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
      return () => {
      window.removeEventListener('keydown', keydown, { capture: true });
      window.removeEventListener('blur', cancel);
      };
    }

    const pointerId = drag.pointerId;
    const item = drag.item;
    let point = { x: drag.x, y: drag.y };
    let moved = false;
    let frame = 0;
    const hit = () => {
      const element = document.elementFromPoint(point.x, point.y)?.closest<HTMLElement>('[data-category-drop]');
      return element?.dataset.categoryScope === scope ? element.dataset.categoryDrop || null : null;
    };
    const move = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      event.preventDefault();
      point = { x: event.clientX, y: event.clientY };
      preview.current?.style.setProperty('transform', `translate(${point.x + 12}px, ${point.y - 44}px)`);
      moved ||= Math.hypot(point.x - startPosition.current.x, point.y - startPosition.current.y) > 6;
      setTarget(hit());
    };
    const scroll = () => {
      const panel = tray.current;
      const rect = panel?.getBoundingClientRect();
      if (panel && rect && point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom) {
        if (point.y < rect.top + 36) panel.scrollTop -= 7;
        else if (point.y > rect.bottom - 36) panel.scrollTop += 7;
      } else if (point.y < 64) window.scrollBy(0, -9);
      else if (point.y > window.innerHeight - 64) window.scrollBy(0, 9);
      setTarget(hit());
      frame = requestAnimationFrame(scroll);
    };
    const up = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      point = { x: event.clientX, y: event.clientY };
      if (moved) void finishRef.current(item, hit());
      else setDrag(current => current ? { ...current, pointerId: null } : null);
    };
    const pointerCancel = (event: PointerEvent) => { if (event.pointerId === pointerId) cancel(); };
    const preventTouchScroll = (event: TouchEvent) => event.preventDefault();
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.setProperty('user-select', 'none');
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', pointerCancel);
    window.addEventListener('touchmove', preventTouchScroll, { passive: false, capture: true });
    frame = requestAnimationFrame(scroll);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.setProperty('user-select', previousUserSelect);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', pointerCancel);
      window.removeEventListener('touchmove', preventTouchScroll, { capture: true });
      window.removeEventListener('keydown', keydown, { capture: true });
      window.removeEventListener('blur', cancel);
    };
  }, [drag, scope]);

  const panel = drag && (
    <div className="relative mt-4 w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl" aria-label={`Mover ${drag.item.name} de categoria`}>
      <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900"><span className="min-w-0 flex-1 truncate">Mover: {drag.item.name}</span><button type="button" aria-label="Cancelar movimento" onClick={() => { setDrag(null); setTarget(null); }} className="p-2"><X size={18} /></button></div>
      <p className="mb-2 text-xs text-slate-500">Solte sobre uma categoria ou toque para selecionar.</p>
      <div ref={tray} className="grid max-h-[35dvh] grid-cols-2 sm:grid-cols-3 gap-2 overflow-y-auto overscroll-contain p-1">
        {Object.values(categories).map(category => <button key={category.id} type="button" data-category-drop={category.id} data-category-scope={scope}
          disabled={category.id === drag.item.category}
          onClick={() => void finish(drag.item, category.id)}
          className={`flex min-h-11 items-center gap-2 rounded-xl border p-2 text-left text-xs font-bold text-slate-800 disabled:opacity-40 ${target === category.id && category.id !== drag.item.category ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500' : 'border-slate-200 hover:bg-slate-50'}`}>
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: category.color }} /><span>{category.label}{category.id === drag.item.category ? ' (atual)' : ''}</span>
        </button>)}
      </div>
    </div>
  );

  return <Context.Provider value={{ panel, scope, activeId: drag?.item.id, target, disabled: disabled || saving,
    start: (item, event) => {
      if (disabled || busy.current || !event.isPrimary || event.button !== 0) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      startPosition.current = { x: event.clientX, y: event.clientY };
      setMessage('');
      setDrag({ item, pointerId: event.pointerId, x: event.clientX, y: event.clientY });
    },
    choose: item => { if (!disabled && !busy.current) { setMessage(''); setDrag({ item, pointerId: null, x: 0, y: 0 }); } },
  }}>
    {children}
    <p role="status" aria-live="polite" className="sr-only">{saving ? 'Salvando categoria…' : message}</p>
    {message && <div role="status" className="fixed left-1/2 top-20 z-[80] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 shadow-xl flex items-center gap-2">
      <span className="flex-1">{message}</span><button type="button" aria-label="Fechar aviso" onClick={() => setMessage('')}><X size={16} /></button>
    </div>}
    {drag && createPortal(<>{drag.pointerId !== null && <div ref={preview} aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-[90] max-w-[60vw] truncate rounded-xl border border-emerald-500 bg-white px-3 py-2 text-sm font-bold text-slate-800 shadow-xl" style={{ transform: `translate(${drag.x + 12}px, ${drag.y - 44}px)` }}>{drag.item.name}</div>}
</>, document.body)}
  </Context.Provider>;
}

export function CategoryDragPanel() {
  const context = useContext(Context);
  return context?.panel ?? null;
}

export function CategoryDragItem({ item, children, ...props }: React.HTMLAttributes<HTMLDivElement> & { item: MovingItem }) {
  const context = useContext(Context);
  const activated = useRef(false);
  const cancelPending = useRef<(() => void) | null>(null);
  useEffect(() => () => cancelPending.current?.(), []);
  useEffect(() => {
    if (context?.disabled) cancelPending.current?.();
  }, [context?.disabled]);

  return <div {...props}
    style={{ ...props.style, userSelect: 'none', WebkitTouchCallout: 'none', cursor: context?.activeId === item.id ? 'grabbing' : props.style?.cursor }}
    tabIndex={context && !context.disabled ? (props.tabIndex ?? 0) : props.tabIndex}
    title="Clique e segure para mover de categoria. Pelo teclado, Alt + Enter."
    data-category-dragging={context?.activeId === item.id || undefined}
    onPointerDownCapture={event => {
      props.onPointerDownCapture?.(event);
      cancelPending.current?.();
      activated.current = false;
      if (!context || context.disabled || !event.isPrimary || event.button !== 0 ||
        (event.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"]')) return;
      const pointer = { isPrimary: event.isPrimary, button: event.button, pointerId: event.pointerId,
        clientX: event.clientX, clientY: event.clientY, currentTarget: event.currentTarget };
      const cancel = () => {
        clearTimeout(timer);
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', end);
        window.removeEventListener('pointercancel', end);
        window.removeEventListener('blur', cancel);
        window.removeEventListener('keydown', keydown);
        cancelPending.current = null;
      };
      const move = (next: PointerEvent) => {
        if (next.pointerId === pointer.pointerId && Math.hypot(next.clientX - pointer.clientX, next.clientY - pointer.clientY) > 8) cancel();
      };
      const end = (next: PointerEvent) => { if (next.pointerId === pointer.pointerId) cancel(); };
      const keydown = (next: KeyboardEvent) => { if (next.key === 'Escape') cancel(); };
      const timer = setTimeout(() => {
        cancel();
        activated.current = true;
        context.start(item, pointer);
      }, 200);
      cancelPending.current = cancel;
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);
      window.addEventListener('blur', cancel);
      window.addEventListener('keydown', keydown);
    }}
    onClickCapture={event => {
      if (activated.current) { event.preventDefault(); event.stopPropagation(); return; }
      props.onClickCapture?.(event);
    }}
    onTouchMoveCapture={event => {
      if (activated.current) { event.stopPropagation(); return; }
      props.onTouchMoveCapture?.(event);
    }}
    onDragStart={event => { event.preventDefault(); }}
    onContextMenu={event => {
      if (cancelPending.current || activated.current) event.preventDefault();
      props.onContextMenu?.(event);
    }}
    onKeyDown={event => {
      props.onKeyDown?.(event);
      if (event.target === event.currentTarget && event.altKey && event.key === 'Enter' && context && !context.disabled) {
        event.preventDefault(); context.choose(item);
      }
    }}>{children}</div>;
}

export function CategoryDropZone({ category, children, className = '' }: { category: CategoryId; children: React.ReactNode; className?: string }) {
  const context = useContext(Context);
  return <div data-category-drop={category} data-category-scope={context?.scope}
    className={`${className} ${context?.activeId && context.target === category ? 'ring-2 ring-emerald-500' : ''}`}>{children}</div>;
}
