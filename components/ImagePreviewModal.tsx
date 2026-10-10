'use client';

import React from 'react';
import { X, ExternalLink } from 'lucide-react';
import { CategoryId } from '@/types/grocery';
import { getAllCategories } from '@/lib/categories';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string;
  itemName: string;
  category: CategoryId;
}

export function ImagePreviewModal({
  isOpen,
  onClose,
  imageUrl,
  itemName,
  category,
}: ImagePreviewModalProps) {
  if (!isOpen || !imageUrl) return null;

  const categories = getAllCategories();
  const categoryMeta = categories[category] || categories.outros;
  const isLocalPhoto = imageUrl.startsWith('data:');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">{itemName}</h3>
            <span
              className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full mt-0.5"
              style={{ backgroundColor: categoryMeta.bgColor, color: categoryMeta.color }}
            >
              {categoryMeta.label}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="relative aspect-4/3 bg-slate-100 overflow-hidden flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={itemName}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="truncate max-w-[280px]">{isLocalPhoto ? 'Foto do produto' : `Link direto: ${imageUrl}`}</span>
          {!isLocalPhoto && <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-emerald-700 font-semibold hover:underline"
          >
            <span>Abrir</span>
            <ExternalLink size={12} />
          </a>}
        </div>
      </div>
    </div>
  );
}
