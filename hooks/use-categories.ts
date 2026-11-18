'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { getAllCategories } from '@/lib/categories';
import { CATEGORIES, Category } from '@/types/grocery';

function subscribe(onChange: () => void) {
  window.addEventListener('categories-updated', onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener('categories-updated', onChange);
    window.removeEventListener('storage', onChange);
  };
}

const getSnapshot = () => JSON.stringify(getAllCategories());
const getServerSnapshot = () => JSON.stringify(CATEGORIES);

export function useCategories(): Record<string, Category> {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => JSON.parse(snapshot) as Record<string, Category>, [snapshot]);
}
