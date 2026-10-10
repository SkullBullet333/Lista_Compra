import { CATEGORIES, Category } from '@/types/grocery';

const CUSTOM_CATEGORIES_KEY = 'fresh_market_custom_categories_v1';

export function getCustomCategories(): Category[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(CUSTOM_CATEGORIES_KEY) || '[]');
    return Array.isArray(parsed)
      ? parsed.filter((category): category is Category =>
          !!category && typeof category.id === 'string' && category.id.startsWith('custom-') &&
          typeof category.label === 'string' && typeof category.color === 'string'
        )
      : [];
  } catch {
    return [];
  }
}

export function saveCustomCategories(categories: Category[]): void {
  localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(categories));
}

export function getAllCategories(): Record<string, Category> {
  return Object.fromEntries([
    ...Object.entries(CATEGORIES),
    ...getCustomCategories().map(category => [category.id, category] as const),
  ]);
}

export function makeCustomCategory(label: string, color: string): Category {
  return {
    id: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    label: label.trim(),
    color,
    bgColor: '#f1f5f9',
    borderColor: '#e2e8f0',
    badgeBg: 'bg-slate-50 text-slate-800 border-slate-200',
    badgeText: 'text-slate-800',
  };
}
