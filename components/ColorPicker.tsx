'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, X } from 'lucide-react';
import { lockPageScroll } from '@/hooks/use-page-scroll-lock';
import { colorForeground, hexToRgb, HSV, hsvToHex, normalizeHex, rgbToHex, rgbToHsv } from '@/lib/colors';

const PALETTE = [
  '#FFFFFF', '#E2E8F0', '#94A3B8', '#475569', '#1E293B', '#111111', '#000000', '#78350F',
  '#FEE2E2', '#FFEDD5', '#FEF3C7', '#FEF9C3', '#DCFCE7', '#CCFBF1', '#DBEAFE', '#F3E8FF',
  '#FCA5A5', '#FDBA74', '#FCD34D', '#FDE047', '#86EFAC', '#5EEAD4', '#93C5FD', '#D8B4FE',
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#22C55E', '#14B8A6', '#3B82F6', '#A855F7',
  '#DC2626', '#EA580C', '#D97706', '#CA8A04', '#059669', '#0D9488', '#0284C7', '#7C3AED',
  '#991B1B', '#9A3412', '#92400E', '#854D0E', '#166534', '#115E59', '#1E40AF', '#581C87',
];

type ColorPickerProps = { value: string; onChange: (color: string) => void; title?: string; className?: string };

export function ColorPicker({ value, onChange, title = 'Cor Primária de Destaque', className = '' }: ColorPickerProps) {
  const id = useId();
  const applied = normalizeHex(value) || '#059669';
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(applied);
  const [source, setSource] = useState(applied);
  const trigger = useRef<HTMLButtonElement>(null);
  if (source !== applied) { setSource(applied); setText(applied); }
  const modalTitle = title === 'Cor Primária de Destaque' ? 'Selecionar cor primária' : `Selecionar ${title.toLocaleLowerCase('pt-BR')}`;
  return <div className={`color-picker ${className}`}>
    <label htmlFor={`${id}-hex`} className="color-picker__label">{title}</label>
    <div className="color-picker__field">
      <button ref={trigger} type="button" className="color-picker__swatch" style={{ background: applied }} aria-label={`${modalTitle}, atual ${applied}`} aria-haspopup="dialog" onClick={() => setOpen(true)} />
      <input id={`${id}-hex`} aria-label={`${title} HEX`} value={text} spellCheck={false} autoComplete="off" maxLength={7} aria-invalid={!normalizeHex(text)}
        onChange={event => setText(event.target.value)} onBlur={() => {
          const valid = normalizeHex(text);
          if (valid) { setText(valid); if (valid !== applied) onChange(valid); }
        }} onKeyDown={event => {
          if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); }
          if (event.key === 'Escape') { event.preventDefault(); setText(applied); }
        }} />
    </div>
    {!normalizeHex(text) && <p className="color-picker__error">Use HEX com 3 ou 6 dígitos.</p>}
    {open && createPortal(<ColorDialog value={applied} title={modalTitle} onCancel={() => { setOpen(false); trigger.current?.focus(); }} onConfirm={color => { onChange(color); setText(color); setOpen(false); trigger.current?.focus(); }} />, document.body)}
  </div>;
}

function ColorDialog({ value, title, onCancel, onConfirm }: { value: string; title: string; onCancel: () => void; onConfirm: (color: string) => void }) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<'standard' | 'custom'>('standard');
  const [draft, setDraft] = useState(value);
  const [hsv, setHsv] = useState(() => rgbToHsv(hexToRgb(value)));
  const [hex, setHex] = useState(value);
  const [rgb, setRgb] = useState(() => Object.values(hexToRgb(value)).map(String));
  const hexValid = Boolean(normalizeHex(hex));
  const rgbValid = rgb.every(c => /^\d{1,3}$/.test(c) && Number(c) <= 255);
  const valid = hexValid && rgbValid;

  useEffect(() => {
    const modal = dialog.current!;
    const previous = document.activeElement as HTMLElement | null;
    modal.showModal();
    const release = lockPageScroll();
    return () => { modal.close(); release(); previous?.focus(); };
  }, []);

  const update = (color: string, visual?: HSV, preserve?: 'hex' | 'rgb') => {
    setDraft(color);
    setHsv(visual || rgbToHsv(hexToRgb(color)));
    if (preserve !== 'hex') setHex(color);
    if (preserve !== 'rgb') setRgb(Object.values(hexToRgb(color)).map(String));
  };
  const updateVisual = (next: HSV) => update(hsvToHex(next), next);
  const position = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const clamp = (n: number) => Math.max(0, Math.min(1, n));
    updateVisual({ ...hsv, s: clamp((event.clientX - rect.left) / rect.width), v: 1 - clamp((event.clientY - rect.top) / rect.height) });
  };
  return <dialog ref={dialog} className="color-dialog" aria-labelledby={`${id}-title`} onCancel={event => { event.preventDefault(); onCancel(); }} onClick={event => {
    if (event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onCancel();
  }}>
    <div className="color-dialog__header"><h2 id={`${id}-title`}>{title}</h2><button type="button" aria-label="Fechar seletor de cor" onClick={onCancel}><X size={20} /></button></div>
    <div className="color-dialog__body">
      <div role="tablist" aria-label="Modo de seleção de cor" className="color-dialog__tabs">
        {(['standard', 'custom'] as const).map((name, index) => <button key={name} type="button" role="tab" id={`${id}-${name}`} aria-controls={`${id}-${name}-panel`} aria-selected={tab === name} tabIndex={tab === name ? 0 : -1} onClick={() => setTab(name)} onKeyDown={event => {
          if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
            event.preventDefault();
            const next = event.key === 'Home' ? 'standard' : event.key === 'End' ? 'custom' : index ? 'standard' : 'custom';
            setTab(next); document.getElementById(`${id}-${next}`)?.focus();
          }
        }}>{name === 'standard' ? 'Padrão' : 'Personalizar'}</button>)}
      </div>
      <div role="tabpanel" id={`${id}-standard-panel`} aria-labelledby={`${id}-standard`} hidden={tab !== 'standard'} className="color-dialog__palette">
        {PALETTE.map((color, index) => <button key={color} type="button" style={{ background: color, color: colorForeground(color) }} aria-label={`Cor ${color}`} aria-pressed={draft === color} className="color-dialog__chip" onClick={() => update(color)} onKeyDown={event => {
          const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -8, ArrowDown: 8 };
          if (event.key in offsets) { event.preventDefault(); (event.currentTarget.parentElement?.children[Math.max(0, Math.min(PALETTE.length - 1, index + offsets[event.key]))] as HTMLElement)?.focus(); }
        }}>{draft === color && <Check size={18} strokeWidth={3} />}</button>)}
      </div>
      <div role="tabpanel" id={`${id}-custom-panel`} aria-labelledby={`${id}-custom`} hidden={tab !== 'custom'}>
        <div className="color-dialog__saturation" style={{ backgroundColor: hsvToHex({ h: hsv.h, s: 1, v: 1 }) }} role="group" aria-label="Saturação e brilho. Use as setas para ajustar." tabIndex={0}
          onPointerDown={event => { event.preventDefault(); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId); position(event); }}
          onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) position(event); }}
          onPointerUp={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
          onKeyDown={event => {
            const step = event.shiftKey ? 0.1 : 0.01;
            const delta: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
            if (delta[event.key]) { event.preventDefault(); const [s, v] = delta[event.key]; updateVisual({ ...hsv, s: Math.max(0, Math.min(1, hsv.s + s)), v: Math.max(0, Math.min(1, hsv.v + v)) }); }
          }}><span className="color-dialog__cursor" style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: draft }} /></div>
        <div className="color-dialog__sr-controls">
          <label>Saturação<input type="range" min="0" max="100" value={Math.round(hsv.s * 100)} onChange={event => updateVisual({ ...hsv, s: Number(event.target.value) / 100 })} /></label>
          <label>Brilho<input type="range" min="0" max="100" value={Math.round(hsv.v * 100)} onChange={event => updateVisual({ ...hsv, v: Number(event.target.value) / 100 })} /></label>
        </div>
        <label className="color-dialog__hue-label">Matiz<input aria-label="Matiz" className="color-dialog__hue" type="range" min="0" max="360" value={hsv.h} onChange={event => updateVisual({ ...hsv, h: Number(event.target.value) })} /></label>
        <div className="color-dialog__channels">
          {(['R', 'G', 'B'] as const).map((label, index) => <label key={label}>{label}<input aria-label={label} type="text" inputMode="numeric" maxLength={3} value={rgb[index]} aria-invalid={!/^\d{1,3}$/.test(rgb[index]) || Number(rgb[index]) > 255} onChange={event => {
            const next = [...rgb]; next[index] = event.target.value; setRgb(next);
            if (next.every(c => /^\d{1,3}$/.test(c) && Number(c) <= 255)) update(rgbToHex({ r: +next[0], g: +next[1], b: +next[2] }), undefined, 'rgb');
          }} /></label>)}
          <label className="color-dialog__hex">HEX<input aria-label="HEX da nova cor" maxLength={7} value={hex} spellCheck={false} aria-invalid={!hexValid} onChange={event => {
            setHex(event.target.value); const color = normalizeHex(event.target.value); if (color) update(color, undefined, 'hex');
          }} onBlur={() => { const color = normalizeHex(hex); if (color) setHex(color); }} /></label>
        </div>
        {!valid && <p role="status" className="color-picker__error">Use RGB de 0 a 255 e HEX com 3 ou 6 dígitos.</p>}
      </div>
      <div className="color-dialog__previews">{[['Atual', value], ['Nova', draft]].map(([label, color]) => <div key={label}><span>{label}</span><div style={{ background: color, color: colorForeground(color) }}>{color}</div></div>)}</div>
    </div>
    <div className="color-dialog__footer"><button type="button" onClick={onCancel}>Cancelar</button><button type="button" className="color-dialog__confirm" disabled={!valid} onClick={() => onConfirm(draft)}>OK</button></div>
  </dialog>;
}
