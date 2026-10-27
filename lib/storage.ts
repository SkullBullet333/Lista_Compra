import { ShoppingList, GroceryItem, ListTotals, SavedItemConfig, UnitType, CategoryId, ListType } from '@/types/grocery';
import { CATALOG_PRESETS, guessCategory } from '@/lib/catalog';
import { SHARED_CATALOG_EDIT } from '@/lib/catalog-mode';

const STORAGE_KEY = 'fresh_market_shopping_lists_v1';
const ACTIVE_LIST_KEY = 'fresh_market_active_list_id_v1';
const LAST_NAVIGATION_KEY = 'fresh_market_last_navigation_v1';
const LAST_NAVIGATION_MAX_AGE = 5 * 60 * 1000;
const SAVED_CONFIGS_KEY = 'fresh_market_item_configs_v1';
const SHARED_CATALOG_KEY = 'fresh_market_shared_catalog_v1';
const PRICE_HISTORY_KEY = 'fresh_market_price_history_v1';

export interface PriceHistoryEntry {
  id: string;
  itemName: string;
  normalizedName: string;
  price: number;
  listId: string;
  marketName?: string;
  recordedAt: number;
}

export function getPriceHistory(): PriceHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(PRICE_HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

export function recordItemPrice(item: GroceryItem, list: ShoppingList): void {
  if (typeof window === 'undefined' || item.price <= 0) return;
  const history = getPriceHistory();
  const latest = history.find(entry => entry.listId === list.id && entry.normalizedName === item.name.trim().toLocaleLowerCase('pt-BR'));
  if (latest?.price === item.price) return;
  const entry: PriceHistoryEntry = {
    id: `price-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    itemName: item.name,
    normalizedName: item.name.trim().toLocaleLowerCase('pt-BR'),
    price: item.price,
    listId: list.id,
    marketName: list.marketName,
    recordedAt: Date.now(),
  };
  localStorage.setItem(PRICE_HISTORY_KEY, JSON.stringify([entry, ...history].slice(0, 5000)));
}

export function getLatestPrice(name: string, lists: ShoppingList[], excludeListId?: string): number | undefined {
  const normalized = name.trim().toLocaleLowerCase('pt-BR');
  const recorded = getPriceHistory()
    .filter(entry => entry.normalizedName === normalized && entry.listId !== excludeListId)
    .sort((a, b) => b.recordedAt - a.recordedAt)[0];
  if (recorded) return recorded.price;
  return lists
    .filter(list => list.id !== excludeListId)
    .flatMap(list => list.items.map(item => ({ item, date: Math.max(item.createdAt, list.updatedAt) })))
    .filter(entry => entry.item.name.trim().toLocaleLowerCase('pt-BR') === normalized && entry.item.price > 0)
    .sort((a, b) => b.date - a.date)[0]?.item.price;
}

export const INITIAL_LISTS: ShoppingList[] = [
  {
    id: 'list-feira-semana',
    title: 'Feira da Semana',
    marketName: 'Hortifrúti & Mercado Natural',
    targetBudget: 150.00,
    createdAt: 1740000000000,
    updatedAt: 1740000000000,
    color: '#16a34a',
    items: [
      {
        id: 'item-1',
        name: 'Maçã',
        category: 'feira',
        quantity: 1.5,
        unit: 'kg',
        price: 9.80,
        checked: true,
        imageUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&auto=format&fit=crop&q=80',
        notes: 'Vermelhinhas e firmes',
        createdAt: 1740000000000,
      },
      {
        id: 'item-2',
        name: 'Banana',
        category: 'feira',
        quantity: 1.2,
        unit: 'kg',
        price: 6.90,
        checked: true,
        imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&auto=format&fit=crop&q=80',
        notes: 'Meio maduras',
        createdAt: 1740000000000,
      },
      {
        id: 'item-3',
        name: 'Tomate',
        category: 'feira',
        quantity: 1.0,
        unit: 'kg',
        price: 8.50,
        checked: false,
        imageUrl: 'https://images.unsplash.com/photo-1546470427-227c7369a94d?w=400&auto=format&fit=crop&q=80',
        notes: 'Para salada e molho',
        createdAt: 1740000000000,
      },
      {
        id: 'item-4',
        name: 'Alface Hidropônica',
        category: 'feira',
        quantity: 2,
        unit: 'un',
        price: 3.50,
        checked: false,
        imageUrl: 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=400&auto=format&fit=crop&q=80',
        createdAt: 1740000000000,
      },
      {
        id: 'item-5',
        name: 'Pão Crocante',
        category: 'padaria',
        quantity: 0.5,
        unit: 'kg',
        price: 16.90,
        checked: true,
        imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80',
        createdAt: 1740000000000,
      },
      {
        id: 'item-6',
        name: 'Leite',
        category: 'laticinios',
        quantity: 3,
        unit: 'un',
        price: 5.49,
        checked: false,
        imageUrl: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&auto=format&fit=crop&q=80',
        notes: 'Itambé ou Piracanjuba',
        createdAt: 1740000000000,
      },
      {
        id: 'item-7',
        name: 'Queijo',
        category: 'laticinios',
        quantity: 1,
        unit: 'pct',
        price: 14.50,
        checked: false,
        imageUrl: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&auto=format&fit=crop&q=80',
        createdAt: 1740000000000,
      },
      {
        id: 'item-8',
        name: 'Azeite',
        category: 'mercearia',
        quantity: 1,
        unit: 'un',
        price: 42.00,
        checked: false,
        imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&auto=format&fit=crop&q=80',
        notes: 'Vidro escuro',
        createdAt: 1740000000000,
      },
    ],
  },
  {
    id: 'list-churrasco',
    title: 'Churrasco de Domingo',
    marketName: 'Boutique de Carnes & Empório',
    targetBudget: 280.00,
    createdAt: 1740000000000,
    updatedAt: 1740000000000,
    color: '#e11d48',
    items: [
      {
        id: 'c-1',
        name: 'Picanha Resfriada',
        category: 'carnes',
        quantity: 1.8,
        unit: 'kg',
        price: 79.90,
        checked: true,
        imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&auto=format&fit=crop&q=80',
        createdAt: 1740000000000,
      },
      {
        id: 'c-2',
        name: 'Linguiça Toscana',
        category: 'carnes',
        quantity: 1.0,
        unit: 'kg',
        price: 24.90,
        checked: true,
        imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&auto=format&fit=crop&q=80',
        createdAt: 1740000000000,
      },
      {
        id: 'c-3',
        name: 'Cerveja Puro Malte Pack 12',
        category: 'bebidas',
        quantity: 2,
        unit: 'cx',
        price: 44.90,
        checked: false,
        imageUrl: 'https://images.unsplash.com/photo-1608270118837-1481b37f4077?w=400&auto=format&fit=crop&q=80',
        createdAt: 1740000000000,
      },
      {
        id: 'c-4',
        name: 'Pão de Alho Especial',
        category: 'padaria',
        quantity: 2,
        unit: 'pct',
        price: 13.50,
        checked: false,
        imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80',
        createdAt: 1740000000000,
      },
    ],
  },
  {
    id: 'list-compras-mes',
    title: 'Compras do Mês',
    marketName: 'Assaí Atacadista',
    targetBudget: 450.00,
    createdAt: 1740000000000,
    updatedAt: 1740000000000,
    color: '#0284c7',
    items: [
      {
        id: 'm-1',
        name: 'Arroz',
        category: 'mercearia',
        quantity: 2,
        unit: 'pct',
        price: 28.90,
        checked: false,
        imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=80',
        createdAt: 1740000000000,
      },
      {
        id: 'm-2',
        name: 'Feijão',
        category: 'mercearia',
        quantity: 3,
        unit: 'pct',
        price: 7.90,
        checked: false,
        imageUrl: 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=400&auto=format&fit=crop&q=80',
        createdAt: 1740000000000,
      },
      {
        id: 'm-3',
        name: 'Café',
        category: 'mercearia',
        quantity: 2,
        unit: 'pct',
        price: 19.90,
        checked: false,
        imageUrl: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&auto=format&fit=crop&q=80',
        createdAt: 1740000000000,
      },
      {
        id: 'm-4',
        name: 'Sabão em Pó',
        category: 'limpeza',
        quantity: 2,
        unit: 'cx',
        price: 18.90,
        checked: false,
        imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=80',
        createdAt: 1740000000000,
      },
      {
        id: 'm-5',
        name: 'Papel Higiênico',
        category: 'limpeza',
        quantity: 2,
        unit: 'pct',
        price: 19.80,
        checked: false,
        imageUrl: 'https://images.unsplash.com/photo-1584556812952-905ffd0c611a?w=400&auto=format&fit=crop&q=80',
        createdAt: 1740000000000,
      },
    ],
  },
];

export function getStoredLists(): ShoppingList[] {
  if (typeof window === 'undefined') return INITIAL_LISTS;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_LISTS));
      return INITIAL_LISTS;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed.map((list: ShoppingList) => ({
          ...list,
          type: list.type === 'travel' ? 'travel' : 'market',
          travelEntries: (list.travelEntries || []).map(entry => ({ ...entry, paid: Boolean(entry.done) })),
        }))
      : INITIAL_LISTS;
  } catch {
    return INITIAL_LISTS;
  }
}

export function saveLists(lists: ShoppingList[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
  } catch (e) {
    console.error('Failed to save shopping lists to localStorage', e);
  }
}

export function getStoredActiveListId(): string {
  if (typeof window === 'undefined') return INITIAL_LISTS[0].id;
  try {
    return localStorage.getItem(ACTIVE_LIST_KEY) || INITIAL_LISTS[0].id;
  } catch {
    return INITIAL_LISTS[0].id;
  }
}

export function saveActiveListId(id: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ACTIVE_LIST_KEY, id);
  } catch (e) {
    console.error('Failed to save active list id', e);
  }
}

export type AppTab = 'shopping' | 'lists' | 'stats' | 'settings';

export interface StoredNavigation {
  tab: AppTab;
  listId: string;
  listFilter?: ListType;
  savedAt: number;
}

export function getStoredNavigation(): StoredNavigation | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = localStorage.getItem(LAST_NAVIGATION_KEY);
    if (!value) return null;
    const navigation = JSON.parse(value) as StoredNavigation;
    const validTab = ['shopping', 'lists', 'stats', 'settings'].includes(navigation.tab);
    if (!validTab || !navigation.listId || Date.now() - navigation.savedAt > LAST_NAVIGATION_MAX_AGE) {
      localStorage.removeItem(LAST_NAVIGATION_KEY);
      return null;
    }
    return navigation;
  } catch {
    return null;
  }
}

export function saveNavigation(tab: AppTab, listId: string, listFilter: ListType = 'market'): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LAST_NAVIGATION_KEY, JSON.stringify({ tab, listId, listFilter, savedAt: Date.now() }));
  } catch (error) {
    console.error('Failed to save navigation state', error);
  }
}

export function calculateListTotals(items: GroceryItem[]): ListTotals {
  let totalEstimated = 0;
  let totalInCart = 0;
  let totalPending = 0;
  let checkedCount = 0;

  for (const item of items) {
    const lineTotal = (item.quantity || 0) * (item.price || 0);
    totalEstimated += lineTotal;
    if (item.checked) {
      totalInCart += lineTotal;
      checkedCount++;
    } else {
      totalPending += lineTotal;
    }
  }

  const itemCount = items.length;
  const pendingCount = itemCount - checkedCount;
  const percentDone = itemCount > 0 ? Math.round((checkedCount / itemCount) * 100) : 0;

  return {
    totalEstimated,
    totalInCart,
    totalPending,
    itemCount,
    checkedCount,
    pendingCount,
    percentDone,
  };
}

export function formatCurrency(value: number): string {
  const num = typeof value === 'number' && !isNaN(value) ? value : 0;
  const parts = num.toFixed(2).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${integerPart},${parts[1]}`;
}

// User Configured Items Memory (Item Detalhado saves here for future lists)
export function getSavedItemConfigs(): Record<string, SavedItemConfig> {
  if (typeof window === 'undefined') return {};
  try {
    const data = localStorage.getItem(SAVED_CONFIGS_KEY);
    if (!data) return {};
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export function replaceSavedItemConfigs(configs: Record<string, SavedItemConfig>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SAVED_CONFIGS_KEY, JSON.stringify(configs));
}

export function getSharedCatalogItems(): SavedItemConfig[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = localStorage.getItem(SHARED_CATALOG_KEY);
    return value === null ? null : JSON.parse(value) as SavedItemConfig[];
  } catch {
    return null;
  }
}

export function replaceSharedCatalogItems(items: SavedItemConfig[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SHARED_CATALOG_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('catalog-items-updated'));
}

export function getEditableItemConfigs(): SavedItemConfig[] {
  if (SHARED_CATALOG_EDIT) {
    const shared = getSharedCatalogItems();
    if (shared) return shared.filter(item => !item.deleted).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    return CATALOG_PRESETS.map(preset => ({
      name: preset.name, category: preset.category, unit: preset.defaultUnit,
      defaultPrice: preset.defaultPrice, imageUrl: preset.imageUrl, updatedAt: 0,
    })).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }
  const configs = getSavedItemConfigs();
  const items = new Map<string, SavedItemConfig>();
  for (const preset of CATALOG_PRESETS) {
    const key = preset.name.trim().toLocaleLowerCase('pt-BR');
    items.set(key, {
      name: preset.name, category: preset.category, unit: preset.defaultUnit,
      defaultPrice: preset.defaultPrice, imageUrl: preset.imageUrl, updatedAt: 0,
    });
  }
  for (const [key, config] of Object.entries(configs)) {
    if (config.deleted) items.delete(key);
    else items.set(key, config);
  }
  return Array.from(items.values()).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export function saveItemConfig(config: SavedItemConfig): void {
  if (SHARED_CATALOG_EDIT) return;
  if (typeof window === 'undefined') return;
  try {
    const current = getSavedItemConfigs();
    const key = config.name.trim().toLocaleLowerCase('pt-BR');
    current[key] = {
      ...current[key],
      ...config,
      deleted: false,
      updatedAt: Date.now(),
    };
    localStorage.setItem(SAVED_CONFIGS_KEY, JSON.stringify(current));
  } catch (e) {
    console.error('Failed to save item config to localStorage', e);
  }
}

export function saveEditedItemConfig(originalName: string, config: SavedItemConfig): void {
  if (SHARED_CATALOG_EDIT) return;
  if (typeof window === 'undefined') return;
  const configs = getSavedItemConfigs();
  const originalKey = originalName.trim().toLocaleLowerCase('pt-BR');
  const nextKey = config.name.trim().toLocaleLowerCase('pt-BR');
  const original = configs[originalKey];
  const isPreset = CATALOG_PRESETS.some(item => item.name.trim().toLocaleLowerCase('pt-BR') === originalKey);
  if (originalKey !== nextKey) {
    if (isPreset) {
      configs[originalKey] = {
        name: originalName, category: original?.category || 'outros', unit: original?.unit || 'un',
        deleted: true, updatedAt: Date.now(),
      };
    } else {
      delete configs[originalKey];
    }
  }
  configs[nextKey] = {
    ...config,
    catalogId: original?.catalogId || config.catalogId,
    previousName: originalKey !== nextKey ? (original?.previousName || originalName) : original?.previousName,
    deleted: false,
    updatedAt: Date.now(),
  };
  replaceSavedItemConfigs(configs);
}

export function markItemConfigSynced(name: string, catalogId: string): void {
  const configs = getSavedItemConfigs();
  const key = name.trim().toLocaleLowerCase('pt-BR');
  if (!configs[key] || configs[key].deleted) return;
  configs[key] = { ...configs[key], catalogId, previousName: undefined };
  replaceSavedItemConfigs(configs);
}

export function deleteItemConfig(name: string): void {
  if (SHARED_CATALOG_EDIT) return;
  if (typeof window === 'undefined') return;
  const configs = getSavedItemConfigs();
  const key = name.trim().toLocaleLowerCase('pt-BR');
  const existing = configs[key];
  configs[key] = existing
    ? { ...existing, deleted: true, updatedAt: Date.now() }
    : { name: name.trim(), category: 'outros', unit: 'un', deleted: true, updatedAt: Date.now() };
  localStorage.setItem(SAVED_CONFIGS_KEY, JSON.stringify(configs));
}

export interface InferredConfig {
  name: string;
  unit: UnitType;
  category: CategoryId;
  imageUrl?: string;
  notes?: string;
  source: 'user_saved' | 'list_history' | 'catalog' | 'default';
}

// Finds if an item has been configured (kg, un, cx, etc., category, photo)
export function findConfiguredItem(
  name: string,
  currentLists?: ShoppingList[]
): InferredConfig {
  const normalized = name.trim().toLocaleLowerCase('pt-BR');

  if (SHARED_CATALOG_EDIT) {
    const catalog = getEditableItemConfigs();
    const found = catalog.find(item => item.name.trim().toLocaleLowerCase('pt-BR') === normalized)
      || catalog.filter(item => {
        const itemName = item.name.trim().toLocaleLowerCase('pt-BR');
        return itemName.includes(normalized) || normalized.includes(itemName);
      }).sort((a, b) => b.name.length - a.name.length)[0];
    return found
      ? { name: found.name, unit: found.unit, category: found.category, imageUrl: found.imageUrl, notes: found.notes, source: 'catalog' }
      : { name, unit: 'un', category: guessCategory(name), source: 'default' };
  }

  // 1. Check user's saved items memory (from "Item Detalhado")
  const savedConfigs = getSavedItemConfigs();
  if (savedConfigs[normalized]?.deleted) {
    return { name, unit: 'un', category: guessCategory(name), source: 'default' };
  }
  if (savedConfigs[normalized]) {
    const cfg = savedConfigs[normalized];
    return {
      name: cfg.name,
      unit: cfg.unit,
      category: cfg.category,
      imageUrl: cfg.imageUrl,
      notes: cfg.notes,
      source: 'user_saved',
    };
  }

  // Partial match in user saved
  for (const key of Object.keys(savedConfigs)) {
    if (savedConfigs[key].deleted) continue;
    if (key.includes(normalized) || normalized.includes(key)) {
      const cfg = savedConfigs[key];
      return {
        name: cfg.name,
        unit: cfg.unit,
        category: cfg.category,
        imageUrl: cfg.imageUrl,
        notes: cfg.notes,
        source: 'user_saved',
      };
    }
  }

  // 2. Check if already configured in any shopping list in the app
  const listsToCheck = currentLists || getStoredLists();
  for (const l of listsToCheck) {
    const found = l.items.find(
      i => i.name.toLowerCase() === normalized || i.name.toLowerCase().includes(normalized)
    );
    if (found) {
      return {
        name: found.name,
        unit: found.unit,
        category: found.category,
        imageUrl: found.imageUrl,
        notes: found.notes,
        source: 'list_history',
      };
    }
  }

  // 3. Check catalog presets
  const preset = CATALOG_PRESETS.find(
    p => !savedConfigs[p.name.trim().toLocaleLowerCase('pt-BR')]?.deleted &&
      (p.name.toLowerCase() === normalized || p.name.toLowerCase().includes(normalized) || normalized.includes(p.name.toLowerCase()))
  );
  if (preset) {
    return {
      name: preset.name,
      unit: preset.defaultUnit,
      category: preset.category,
      imageUrl: preset.imageUrl,
      source: 'catalog',
    };
  }

  // 4. Default fallback with smart category detection
  return {
    name,
    unit: 'un',
    category: guessCategory(name),
    source: 'default',
  };
}

export interface RegisteredCandidate {
  id: string;
  name: string;
  category: CategoryId;
  unit: UnitType;
  price: number;
  imageUrl?: string;
  notes?: string;
  source: 'user_saved' | 'catalog' | 'history';
  previousPrice?: number;
}

export function getRegisteredItems(currentLists?: ShoppingList[]): RegisteredCandidate[] {
  if (SHARED_CATALOG_EDIT) {
    return getEditableItemConfigs().map(item => ({
      id: item.catalogId || `catalog-${item.name.toLocaleLowerCase('pt-BR')}`,
      name: item.name, category: item.category, unit: item.unit,
      price: item.defaultPrice || 0, imageUrl: item.imageUrl, notes: item.notes,
      source: 'catalog' as const,
    }));
  }
  const map = new Map<string, RegisteredCandidate>();

  // 1. User saved configs have highest precedence
  const savedConfigs = getSavedItemConfigs();
  for (const [, cfg] of Object.entries(savedConfigs)) {
    if (cfg.deleted) continue;
    const k = cfg.name.trim().toLowerCase();
    map.set(k, {
      id: `saved-${k}`,
      name: cfg.name,
      category: cfg.category,
      unit: cfg.unit,
      price: cfg.defaultPrice || 0,
      imageUrl: cfg.imageUrl,
      notes: cfg.notes,
      source: 'user_saved',
    });
  }

  // 2. Catalog presets (60+ items)
  for (const preset of CATALOG_PRESETS) {
    const k = preset.name.trim().toLowerCase();
    if (!map.has(k) && !savedConfigs[k]?.deleted) {
      map.set(k, {
        id: `preset-${k}`,
        name: preset.name,
        category: preset.category,
        unit: preset.defaultUnit,
        price: preset.defaultPrice,
        imageUrl: preset.imageUrl,
        source: 'catalog',
      });
    }
  }

  // 3. Lists history
  const listsToCheck = currentLists || (typeof window !== 'undefined' ? getStoredLists() : []);
  for (const l of listsToCheck) {
    for (const item of l.items) {
      const k = item.name.trim().toLowerCase();
      if (!map.has(k) && !savedConfigs[k]?.deleted) {
        map.set(k, {
          id: `hist-${k}`,
          name: item.name,
          category: item.category,
          unit: item.unit,
          price: item.price,
          imageUrl: item.imageUrl,
          notes: item.notes,
          source: 'history',
        });
      }
    }
  }

  const lists = currentLists || [];
  return Array.from(map.values()).map(item => ({
    ...item,
    price: item.source === 'user_saved' ? item.price : (getLatestPrice(item.name, lists) ?? item.price),
    previousPrice: getLatestPrice(item.name, lists),
  }));
}


