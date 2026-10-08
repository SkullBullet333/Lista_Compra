export type CategoryId =
  | 'feira'
  | 'padaria'
  | 'mercearia'
  | 'carnes'
  | 'laticinios'
  | 'limpeza'
  | 'bebidas'
  | 'outros';

export type UnitType = 'un' | 'kg' | 'g' | 'L' | 'ml' | 'pct' | 'cx' | 'dz';

export interface Category {
  id: CategoryId;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  badgeBg: string;
  badgeText: string;
}

export const CATEGORIES: Record<CategoryId, Category> = {
  feira: {
    id: 'feira',
    label: 'Feira & Hortifrúti',
    color: '#16a34a',
    bgColor: '#dcfce7',
    borderColor: '#bbf7d0',
    badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    badgeText: 'text-emerald-800',
  },
  padaria: {
    id: 'padaria',
    label: 'Padaria & Grãos',
    color: '#d97706',
    bgColor: '#fef3c7',
    borderColor: '#fde68a',
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
    badgeText: 'text-amber-800',
  },
  mercearia: {
    id: 'mercearia',
    label: 'Mercearia & Despensa',
    color: '#ea580c',
    bgColor: '#ffedd5',
    borderColor: '#fed7aa',
    badgeBg: 'bg-orange-50 text-orange-800 border-orange-200',
    badgeText: 'text-orange-800',
  },
  carnes: {
    id: 'carnes',
    label: 'Carnes & Frios',
    color: '#e11d48',
    bgColor: '#ffe4e6',
    borderColor: '#fecdd3',
    badgeBg: 'bg-rose-50 text-rose-800 border-rose-200',
    badgeText: 'text-rose-800',
  },
  laticinios: {
    id: 'laticinios',
    label: 'Laticínios',
    color: '#0284c7',
    bgColor: '#e0f2fe',
    borderColor: '#bae6fd',
    badgeBg: 'bg-sky-50 text-sky-800 border-sky-200',
    badgeText: 'text-sky-800',
  },
  limpeza: {
    id: 'limpeza',
    label: 'Higiene & Limpeza',
    color: '#7c3aed',
    bgColor: '#f3e8ff',
    borderColor: '#e9d5ff',
    badgeBg: 'bg-purple-50 text-purple-800 border-purple-200',
    badgeText: 'text-purple-800',
  },
  bebidas: {
    id: 'bebidas',
    label: 'Bebidas',
    color: '#0d9488',
    bgColor: '#ccfbf1',
    borderColor: '#99f6e4',
    badgeBg: 'bg-teal-50 text-teal-800 border-teal-200',
    badgeText: 'text-teal-800',
  },
  outros: {
    id: 'outros',
    label: 'Outros Itens',
    color: '#475569',
    bgColor: '#f1f5f9',
    borderColor: '#e2e8f0',
    badgeBg: 'bg-slate-100 text-slate-800 border-slate-200',
    badgeText: 'text-slate-800',
  },
};

export interface GroceryItem {
  id: string;
  name: string;
  category: CategoryId;
  quantity: number;
  unit: UnitType;
  price: number; // Preço unitário em R$
  checked: boolean; // No carrinho
  imageUrl?: string; // Link direto para imagem do HTML
  notes?: string;
  createdAt: number;
}

export interface ShoppingList {
  id: string;
  title: string;
  marketName?: string;
  targetBudget?: number; // Teto de gastos planejado
  items: GroceryItem[];
  createdAt: number;
  updatedAt: number;
  color?: string;
}

export interface SavedItemConfig {
  name: string;
  unit: UnitType;
  category: CategoryId;
  imageUrl?: string;
  defaultPrice?: number;
  notes?: string;
  updatedAt: number;
}

export interface ListTotals {
  totalEstimated: number; // Soma de todos os itens
  totalInCart: number; // Soma dos itens marcados
  totalPending: number; // Soma dos itens pendentes
  itemCount: number;
  checkedCount: number;
  pendingCount: number;
  percentDone: number;
}
