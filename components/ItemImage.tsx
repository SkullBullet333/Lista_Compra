'use client';

import React, { useState } from 'react';
import { Apple, Croissant, Package, Beef, Milk, Sparkles, Coffee, ShoppingBag } from 'lucide-react';
import { CategoryId, CATEGORIES } from '@/types/grocery';

interface ItemImageProps {
  src?: string;
  alt: string;
  category: CategoryId;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

export function ItemImage({
  src,
  alt,
  category,
  size = 'md',
  className = '',
  onClick,
}: ItemImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8 rounded-md text-xs',
    md: 'w-11 h-11 rounded-lg text-sm',
    lg: 'w-16 h-16 rounded-xl text-base',
  };

  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 26,
  };

  const getCategoryIcon = (cat: CategoryId, iconSize: number) => {
    switch (cat) {
      case 'feira':
        return <Apple size={iconSize} className="text-emerald-700" />;
      case 'padaria':
        return <Croissant size={iconSize} className="text-amber-700" />;
      case 'mercearia':
        return <Package size={iconSize} className="text-orange-700" />;
      case 'carnes':
        return <Beef size={iconSize} className="text-rose-700" />;
      case 'laticinios':
        return <Milk size={iconSize} className="text-sky-700" />;
      case 'limpeza':
        return <Sparkles size={iconSize} className="text-purple-700" />;
      case 'bebidas':
        return <Coffee size={iconSize} className="text-teal-700" />;
      default:
        return <ShoppingBag size={iconSize} className="text-slate-600" />;
    }
  };

  const categoryMeta = CATEGORIES[category] || CATEGORIES.outros;

  // Fallback icon container
  const fallbackNode = (
    <div
      className={`shrink-0 flex items-center justify-center font-medium select-none ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: categoryMeta.bgColor }}
      title={`${alt} (${categoryMeta.label})`}
    >
      {getCategoryIcon(category, iconSizes[size])}
    </div>
  );

  if (!src || hasError) {
    return fallbackNode;
  }

  return (
    <div
      onClick={onClick}
      className={`relative shrink-0 overflow-hidden bg-slate-100 border border-slate-200/80 ${sizeClasses[size]} ${
        onClick ? 'cursor-pointer hover:opacity-90 active:scale-95 transition-transform' : ''
      } ${className}`}
      title={`${alt} - clique para ver imagem`}
    >
      {!isLoaded && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-slate-100"
          style={{ backgroundColor: categoryMeta.bgColor }}
        >
          {getCategoryIcon(category, iconSizes[size])}
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
