import { CATALOG_PRESETS } from '@/lib/catalog';
import { ListTemplate } from '@/types/grocery';

const TEMPLATES_KEY = 'fresh_market_templates_v1';

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
  { id: 'churrasco', name: 'Churrasco Amigos', description: 'Carnes & bebidas', emoji: '🥩', marketName: 'Empório de Carnes', targetBudget: 250, items: [presetItem('Picanha Bovina', 1.5), presetItem('Carne Moída Patinho', 1.5), presetItem('Cerveja Puro Malte Lata', 2), presetItem('Pão Francês', 2), presetItem('Suco de Laranja Integral 900ml', 2)], createdAt: 1740000000000, updatedAt: 1740000000000 },
  { id: 'basica', name: 'Despensa Básica', description: 'Arroz, feijão, café', emoji: '🛒', marketName: 'Supermercado Atacadista', targetBudget: 200, items: ['Arroz Branco 5kg', 'Feijão Carioca 1kg', 'Azeite Extra Virgem 500ml', 'Café Torrado e Moído 500g', 'Macarrão Espaguete 500g', 'Sabão em Pó 1.6kg', 'Detergente Neutro 500ml'].map(name => presetItem(name)), createdAt: 1740000000000, updatedAt: 1740000000000 },
  { id: 'cafe', name: 'Café & Lanche', description: 'Pães, queijo, leite', emoji: '☕', marketName: 'Padaria & Confeitaria', targetBudget: 60, items: ['Pão Francês', 'Pão de Forma Integral', 'Manteiga com Sal 200g', 'Queijo Mussarela Fatiado', 'Leite Integral 1L', 'Café Torrado e Moído 500g'].map(name => presetItem(name)), createdAt: 1740000000000, updatedAt: 1740000000000 },
];

export function getTemplates(): ListTemplate[] {
  if (typeof window === 'undefined') return DEFAULT_TEMPLATES;
  try {
    const custom = JSON.parse(localStorage.getItem(TEMPLATES_KEY) || '[]') as ListTemplate[];
    const map = new Map(DEFAULT_TEMPLATES.map(template => [template.id, template]));
    custom.forEach(template => map.set(template.id, template));
    return Array.from(map.values());
  } catch {
    return DEFAULT_TEMPLATES;
  }
}

export function saveTemplate(template: ListTemplate): ListTemplate[] {
  const custom = getTemplates().filter(item => !DEFAULT_TEMPLATES.some(defaultItem => defaultItem.id === item.id));
  const next = [...custom.filter(item => item.id !== template.id), template];
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(next));
  return getTemplates();
}
