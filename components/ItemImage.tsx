'use client';

import React, { useState } from 'react';
import { CategoryIcon } from '@/components/CategoryIcon';
import { CategoryId } from '@/types/grocery';
import { useCategories } from '@/hooks/use-categories';
import { getThemePreferences } from '@/lib/preferences';

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

  const categories = useCategories();
  const categoryMeta = categories[category] || categories.outros;
  const showImages = getThemePreferences().showImages;

  // Fallback icon container
  const fallbackNode = (
    <div
      className={`shrink-0 flex items-center justify-center font-medium select-none ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: categoryMeta.bgColor }}
      title={`${alt} (${categoryMeta.label})`}
    >
      <CategoryIcon category={category} size={iconSizes[size]} />
    </div>
  );

  if (!showImages) {
    return null;
  }

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
          <CategoryIcon category={category} size={iconSizes[size]} />
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
