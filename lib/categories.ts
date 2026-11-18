import { CATEGORIES, Category } from '@/types/grocery';

const CUSTOM_CATEGORIES_KEY = 'fresh_market_custom_categories_v1';
const DELETED_CATEGORIES_KEY = 'fresh_market_deleted_categories_v1';

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
  if (typeof window === 'undefined') return;
  const ids = new Set(categories.map(category => category.id));
  const deleted = new Set([...getDeletedCategoryIds(), ...getCustomCategories().filter(category => !ids.has(category.id)).map(category => category.id)]);
  for (const id of ids) deleted.delete(id);
  localStorage.setItem(DELETED_CATEGORIES_KEY, JSON.stringify([...deleted]));
  replaceCustomCategories(categories);
}

export function getDeletedCategoryIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const value: unknown = JSON.parse(localStorage.getItem(DELETED_CATEGORIES_KEY) || '[]');
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string' && id.startsWith('custom-')) : [];
  } catch {
    return [];
  }
}

export function acknowledgeDeletedCategory(id: string): void {
  localStorage.setItem(DELETED_CATEGORIES_KEY, JSON.stringify(getDeletedCategoryIds().filter(deleted => deleted !== id)));
}

export function replaceCustomCategories(categories: Category[]): void {
  if (typeof window === 'undefined') return;
  const value = JSON.stringify(categories);
  if (localStorage.getItem(CUSTOM_CATEGORIES_KEY) === value) return;
  localStorage.setItem(CUSTOM_CATEGORIES_KEY, value);
  window.dispatchEvent(new Event('categories-updated'));
}

export function getAllCategories(): Record<string, Category> {
  return Object.fromEntries([
    ...Object.entries(CATEGORIES),
    ...getCustomCategories().map(category => [category.id, category] as const),
  ]);
}

const CATEGORY_COLORS = [
  '#db2777', '#7c3aed', '#2563eb', '#0891b2', '#059669', '#65a30d',
  '#ca8a04', '#ea580c', '#dc2626', '#be123c', '#4338ca', '#0f766e',
  '#4f46e5', '#c026d3', '#e11d48', '#0284c7', '#16a34a', '#a16207',
];

export function makeCustomCategory(label: string, existingColors: string[], icon = 'shopping-bag'): Category {
  const usedColors = new Set(existingColors.map(color => color.toLowerCase()));
  const availableColors = CATEGORY_COLORS.filter(color => !usedColors.has(color.toLowerCase()));
  const color = availableColors.length
    ? availableColors[Math.floor(Math.random() * availableColors.length)]
    : `hsl(${Math.floor(Math.random() * 360)} 72% 44%)`;
  return {
    id: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    label: label.trim(),
    icon,
    color,
    bgColor: '#f1f5f9',
    borderColor: '#e2e8f0',
    badgeBg: 'bg-slate-50 text-slate-800 border-slate-200',
    badgeText: 'text-slate-800',
  };
}
