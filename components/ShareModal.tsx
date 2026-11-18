'use client';

import { usePageScrollLock } from '@/hooks/use-page-scroll-lock';

import React, { useState } from 'react';
import { X, Copy, Check, MessageSquare } from 'lucide-react';
import { ShoppingList } from '@/types/grocery';
import { calculateListTotals, formatCurrency } from '@/lib/storage';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  list: ShoppingList;
}

export function ShareModal({ isOpen, onClose, list }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  usePageScrollLock(isOpen && !!list, onClose);

  if (!isOpen || !list) return null;

  const totals = calculateListTotals(list.items);

  const generateText = () => {
    let text = `🛒 *${list.title}*\n`;
    if (list.marketName) {
      text += `📍 Local: ${list.marketName}\n`;
    }
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;

    const pending = list.items.filter(i => !i.checked);
    const checked = list.items.filter(i => i.checked);

    if (pending.length > 0) {
      text += `*A COMPRAR (${pending.length}):*\n`;
      pending.forEach(item => {
        const itemTotal = (item.quantity * item.price);
        text += `◽ ${item.quantity}${item.unit} ${item.name}`;
        if (item.price > 0) {
          text += ` - ${formatCurrency(itemTotal)}`;
        }
        if (item.notes) {
          text += ` _(${item.notes})_`;
        }
        text += `\n`;
      });
      text += `\n`;
    }

    if (checked.length > 0) {
      text += `*NO CARRINHO (${checked.length}):*\n`;
      checked.forEach(item => {
        const itemTotal = (item.quantity * item.price);
        text += `✅ ${item.quantity}${item.unit} ${item.name}`;
        if (item.price > 0) {
          text += ` - ${formatCurrency(itemTotal)}`;
        }
        text += `\n`;
      });
      text += `\n`;
    }

    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💵 *Total Estimado:* ${formatCurrency(totals.totalEstimated)}\n`;
    text += `🛒 *No Carrinho:* ${formatCurrency(totals.totalInCart)}\n`;
    text += `⏳ *Pendente:* ${formatCurrency(totals.totalPending)}\n`;
    if (list.targetBudget) {
      text += `🎯 *Teto:* ${formatCurrency(list.targetBudget)}\n`;
    }
    text += `\nCriado com Fresh Market App 🥑`;
    return text;
  };

  const shareText = generateText();

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsApp = () => {
    const encoded = encodeURIComponent(shareText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full overflow-hidden md:max-h-[90dvh] md:overflow-y-auto md:overscroll-contain shadow-xl border border-slate-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">Compartilhar Lista</h3>
            <p className="text-xs text-slate-500">Envie a lista formatada com totais pelo WhatsApp ou copie o texto</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-56 overflow-y-auto font-mono text-xs whitespace-pre-wrap text-slate-800 leading-relaxed">
            {shareText}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={handleCopy}
              className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                copied
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
            </button>

            <button
              onClick={handleWhatsApp}
              className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-xs font-bold text-white shadow-xs transition-all flex items-center justify-center gap-1.5"
            >
              <MessageSquare size={16} />
              <span>Enviar no WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
