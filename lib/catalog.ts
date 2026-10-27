import { CategoryId, UnitType } from '@/types/grocery';

export interface CatalogPreset {
  name: string;
  category: CategoryId;
  defaultUnit: UnitType;
  defaultPrice: number;
  imageUrl: string;
}

export const CATALOG_PRESETS: CatalogPreset[] = [
  // Feira & Hortifrúti
  {
    name: 'Maçã',
    category: 'feira',
    defaultUnit: 'kg',
    defaultPrice: 9.80,
    imageUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Banana',
    category: 'feira',
    defaultUnit: 'kg',
    defaultPrice: 6.90,
    imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Tomate',
    category: 'feira',
    defaultUnit: 'kg',
    defaultPrice: 8.50,
    imageUrl: 'https://images.unsplash.com/photo-1546470427-227c7369a94d?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Alface',
    category: 'feira',
    defaultUnit: 'un',
    defaultPrice: 3.50,
    imageUrl: 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Cebola',
    category: 'feira',
    defaultUnit: 'kg',
    defaultPrice: 5.80,
    imageUrl: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Batata',
    category: 'feira',
    defaultUnit: 'kg',
    defaultPrice: 6.20,
    imageUrl: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Cenoura',
    category: 'feira',
    defaultUnit: 'kg',
    defaultPrice: 5.40,
    imageUrl: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5c317?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Abacate',
    category: 'feira',
    defaultUnit: 'un',
    defaultPrice: 4.90,
    imageUrl: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Laranja',
    category: 'feira',
    defaultUnit: 'kg',
    defaultPrice: 4.80,
    imageUrl: 'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=400&auto=format&fit=crop&q=80',
  },

  // Padaria & Grãos
  {
    name: 'Pão',
    category: 'padaria',
    defaultUnit: 'kg',
    defaultPrice: 16.90,
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Pão de Forma',
    category: 'padaria',
    defaultUnit: 'pct',
    defaultPrice: 9.50,
    imageUrl: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Croissant',
    category: 'padaria',
    defaultUnit: 'un',
    defaultPrice: 6.50,
    imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Granola',
    category: 'padaria',
    defaultUnit: 'pct',
    defaultPrice: 14.80,
    imageUrl: 'https://images.unsplash.com/photo-1517093157656-b9ec81640a1b?w=400&auto=format&fit=crop&q=80',
  },

  // Mercearia & Despensa
  {
    name: 'Arroz',
    category: 'mercearia',
    defaultUnit: 'pct',
    defaultPrice: 28.90,
    imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Feijão',
    category: 'mercearia',
    defaultUnit: 'pct',
    defaultPrice: 7.90,
    imageUrl: 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Azeite',
    category: 'mercearia',
    defaultUnit: 'un',
    defaultPrice: 42.00,
    imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Café',
    category: 'mercearia',
    defaultUnit: 'pct',
    defaultPrice: 19.90,
    imageUrl: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Macarrão',
    category: 'mercearia',
    defaultUnit: 'pct',
    defaultPrice: 4.80,
    imageUrl: 'https://images.unsplash.com/photo-1551462147-37885acc36f1?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Molho de Tomate',
    category: 'mercearia',
    defaultUnit: 'un',
    defaultPrice: 3.20,
    imageUrl: 'https://images.unsplash.com/photo-1598514982205-f36b96d1e8d4?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Açúcar',
    category: 'mercearia',
    defaultUnit: 'pct',
    defaultPrice: 4.90,
    imageUrl: 'https://images.unsplash.com/photo-1622484216257-268670845a7c?w=400&auto=format&fit=crop&q=80',
  },

  // Carnes & Frios
  {
    name: 'Peito de Frango',
    category: 'carnes',
    defaultUnit: 'kg',
    defaultPrice: 21.90,
    imageUrl: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Carne Moída',
    category: 'carnes',
    defaultUnit: 'kg',
    defaultPrice: 38.90,
    imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Picanha',
    category: 'carnes',
    defaultUnit: 'kg',
    defaultPrice: 79.90,
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Presunto',
    category: 'carnes',
    defaultUnit: 'g',
    defaultPrice: 0.05, // 50 por kg -> 200g = 10
    imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Ovos',
    category: 'carnes',
    defaultUnit: 'dz',
    defaultPrice: 12.90,
    imageUrl: 'https://images.unsplash.com/photo-1516448620398-c5f44bf9f441?w=400&auto=format&fit=crop&q=80',
  },

  // Laticínios
  {
    name: 'Leite',
    category: 'laticinios',
    defaultUnit: 'un',
    defaultPrice: 5.49,
    imageUrl: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Queijo',
    category: 'laticinios',
    defaultUnit: 'pct',
    defaultPrice: 14.50,
    imageUrl: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Manteiga',
    category: 'laticinios',
    defaultUnit: 'un',
    defaultPrice: 11.90,
    imageUrl: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Iogurte',
    category: 'laticinios',
    defaultUnit: 'un',
    defaultPrice: 4.20,
    imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Requeijão',
    category: 'laticinios',
    defaultUnit: 'un',
    defaultPrice: 8.90,
    imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&auto=format&fit=crop&q=80',
  },

  // Higiene & Limpeza
  {
    name: 'Detergente',
    category: 'limpeza',
    defaultUnit: 'un',
    defaultPrice: 2.90,
    imageUrl: 'https://images.unsplash.com/photo-1585837575652-267c041d77d4?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Sabão em Pó',
    category: 'limpeza',
    defaultUnit: 'cx',
    defaultPrice: 18.90,
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Amaciante',
    category: 'limpeza',
    defaultUnit: 'un',
    defaultPrice: 22.90,
    imageUrl: 'https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Papel Higiênico',
    category: 'limpeza',
    defaultUnit: 'pct',
    defaultPrice: 19.80,
    imageUrl: 'https://images.unsplash.com/photo-1584556812952-905ffd0c611a?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Creme Dental',
    category: 'limpeza',
    defaultUnit: 'un',
    defaultPrice: 5.60,
    imageUrl: 'https://images.unsplash.com/photo-1559591937-e62fb330bc1f?w=400&auto=format&fit=crop&q=80',
  },

  // Bebidas
  {
    name: 'Suco de Laranja',
    category: 'bebidas',
    defaultUnit: 'un',
    defaultPrice: 12.90,
    imageUrl: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Água Mineral',
    category: 'bebidas',
    defaultUnit: 'un',
    defaultPrice: 2.50,
    imageUrl: 'https://images.unsplash.com/photo-1560023907-5f339617ea30?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Cerveja',
    category: 'bebidas',
    defaultUnit: 'un',
    defaultPrice: 4.80,
    imageUrl: 'https://images.unsplash.com/photo-1608270118837-1481b37f4077?w=400&auto=format&fit=crop&q=80',
  },
];

// Helper to find matching catalog item or infer category
export function matchCatalogItem(query: string): CatalogPreset | null {
  const normalized = query.trim().toLocaleLowerCase('pt-BR');
  if (!normalized) return null;

  return CATALOG_PRESETS.find(p => p.name.toLocaleLowerCase('pt-BR') === normalized)
    || CATALOG_PRESETS.filter(p => p.name.toLocaleLowerCase('pt-BR').includes(normalized)
      || normalized.includes(p.name.toLocaleLowerCase('pt-BR')))
      .sort((a, b) => b.name.length - a.name.length)[0]
    || null;
}

// Automatic category detection for arbitrary user input
export function guessCategory(name: string): CategoryId {
  const n = name.toLowerCase();
  if (/maç[aã]|banana|uva|lim[aã]o|tomate|alface|cebola|batata|cenoura|fruta|legume|verdura|hortali[cç]|morango|melancia|laranja|alho|abacate|manga|abacaxi/i.test(n)) {
    return 'feira';
  }
  if (/p[aã]o|croissant|bolo|biscoito|bolacha|torrada|granola|aveia|trigo|farinha/i.test(n)) {
    return 'padaria';
  }
  if (/arroz|feij[aã]o|azeite|[oó]leo|caf[eé]|a[cç][uú]car|sal|macarr[aã]o|massa|molho|enlatado|atum|sardinha|conserva|vinagre/i.test(n)) {
    return 'mercearia';
  }
  if (/carne|frango|peixe|picanha|alcatra|lingui[cç]a|salsicha|presunto|bacon|costela|salm[aã]o|til[aá]pia|ovo|ovos/i.test(n)) {
    return 'carnes';
  }
  if (/leite|queijo|manteiga|iogurte|requeij[aã]o|nata|creme de leite|condensado/i.test(n)) {
    return 'laticinios';
  }
  if (/detergente|sab[aã]o|amaciante|desinfetante|esponja|papel|creme dental|shampoo|sabonete|pasta|cloro|alvejante|vassoura|lixo/i.test(n)) {
    return 'limpeza';
  }
  if (/refrigerante|suco|[aá]gua|cerveja|vinho|ch[aá]|energ[eé]tico|vodka|gin/i.test(n)) {
    return 'bebidas';
  }
  return 'outros';
}
