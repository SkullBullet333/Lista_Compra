import { CATALOG_PRESETS } from '@/lib/catalog';
import { ListTemplate } from '@/types/grocery';

const TEMPLATES_KEY = 'fresh_market_templates_v1';
const DELETED_TEMPLATES_KEY = 'fresh_market_deleted_templates_v1';

function presetItem(name: string, quantity = 1) {
  const preset = CATALOG_PRESETS.find(item => item.name === name) || CATALOG_PRESETS[0];
  return {
    name: preset.name,
    category: preset.category,
    quantity,
    unit: preset.defaultUnit,
    price: preset.defaultPrice,
    imageUrl: preset.imageUrl,
  };
}

export const DEFAULT_TEMPLATES: ListTemplate[] = [
  { id: 'feira', name: 'Feira Saudável', description: 'Frutas & legumes', emoji: '🍎', marketName: 'Hortifrúti da Vila', targetBudget: 85, items: CATALOG_PRESETS.filter(item => item.category === 'feira').slice(0, 7).map(item => ({ name: item.name, category: item.category, quantity: item.defaultUnit === 'kg' ? 1 : 1, unit: item.defaultUnit, price: item.defaultPrice, imageUrl: item.imageUrl })), createdAt: 1740000000000, updatedAt: 1740000000000 },
  { id: 'churrasco', name: 'Churrasco Amigos', description: 'Carnes & bebidas', emoji: '🥩', marketName: 'Empório de Carnes', targetBudget: 250, items: [presetItem('Picanha', 1.5), presetItem('Carne Moída', 1.5), presetItem('Cerveja', 2), presetItem('Pão', 2), presetItem('Suco de Laranja', 2)], createdAt: 1740000000000, updatedAt: 1740000000000 },
  { id: 'basica', name: 'Despensa Básica', description: 'Arroz, feijão, café', emoji: '🛒', marketName: 'Supermercado Atacadista', targetBudget: 200, items: ['Arroz', 'Feijão', 'Azeite', 'Café', 'Macarrão', 'Sabão em Pó', 'Detergente'].map(name => presetItem(name)), createdAt: 1740000000000, updatedAt: 1740000000000 },
  { id: 'cafe', name: 'Café & Lanche', description: 'Pães, queijo, leite', emoji: '☕', marketName: 'Padaria & Confeitaria', targetBudget: 60, items: ['Pão', 'Pão de Forma', 'Manteiga', 'Queijo', 'Leite', 'Café'].map(name => presetItem(name)), createdAt: 1740000000000, updatedAt: 1740000000000 },
];

export function getTemplates(): ListTemplate[] {
  if (typeof window === 'undefined') return DEFAULT_TEMPLATES;
  try {
    const custom = getStoredTemplateOverrides();
    const deleted = new Set(getDeletedTemplateIds());
    const map = new Map(DEFAULT_TEMPLATES.map(template => [template.id, template]));
    custom.forEach(template => map.set(template.id, template));
    return Array.from(map.values()).filter(template => !deleted.has(template.id));
  } catch {
    return DEFAULT_TEMPLATES;
  }
}

export function getStoredTemplateOverrides(): ListTemplate[] {
  if (typeof window === 'undefined') return [];
  try {
    const value = JSON.parse(localStorage.getItem(TEMPLATES_KEY) || '[]');
    return Array.isArray(value) ? value.filter((template): template is ListTemplate => Boolean(template?.id && template?.name && Array.isArray(template?.items))) : [];
  } catch {
    return [];
  }
}

export function getDeletedTemplateIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const value = JSON.parse(localStorage.getItem(DELETED_TEMPLATES_KEY) || '[]');
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function replaceTemplatesFromSupabase(overrides: ListTemplate[], deletedIds: string[]): void {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(overrides));
  localStorage.setItem(DELETED_TEMPLATES_KEY, JSON.stringify(deletedIds));
  window.dispatchEvent(new Event('templates-updated'));
}

export function saveTemplate(template: ListTemplate): ListTemplate[] {
  const custom = getStoredTemplateOverrides();
  const next = [...custom.filter(item => item.id !== template.id), template];
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(next));
  localStorage.setItem(DELETED_TEMPLATES_KEY, JSON.stringify(getDeletedTemplateIds().filter(id => id !== template.id)));
  window.dispatchEvent(new Event('templates-updated'));
  return getTemplates();
}

export function deleteTemplate(id: string): ListTemplate[] {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(getStoredTemplateOverrides().filter(template => template.id !== id)));
  localStorage.setItem(DELETED_TEMPLATES_KEY, JSON.stringify([...new Set([...getDeletedTemplateIds(), id])]));
  window.dispatchEvent(new Event('templates-updated'));
  return getTemplates();
}
