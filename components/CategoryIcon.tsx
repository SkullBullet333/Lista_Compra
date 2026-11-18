'use client';

import { Apple, Beef, Carrot, Coffee, Cookie, Croissant, Fish, Flower2, Gift, Heart, House, Milk, Package, PawPrint, Pill, Pizza, Shirt, ShoppingBag, Snowflake, Sparkles, SprayCan, Utensils, Wine, Wrench } from 'lucide-react';
import { CategoryId } from '@/types/grocery';
import { useCategories } from '@/hooks/use-categories';

export const CATEGORY_ICON_OPTIONS = [
  { id: 'shopping-bag', label: 'Sacola', Icon: ShoppingBag },
  { id: 'package', label: 'Pacote', Icon: Package },
  { id: 'apple', label: 'Frutas', Icon: Apple },
  { id: 'carrot', label: 'Legumes', Icon: Carrot },
  { id: 'croissant', label: 'Padaria', Icon: Croissant },
  { id: 'beef', label: 'Carnes', Icon: Beef },
  { id: 'fish', label: 'Peixes', Icon: Fish },
  { id: 'milk', label: 'Laticínios', Icon: Milk },
  { id: 'coffee', label: 'Café', Icon: Coffee },
  { id: 'wine', label: 'Bebidas', Icon: Wine },
  { id: 'cookie', label: 'Biscoitos', Icon: Cookie },
  { id: 'pizza', label: 'Lanches', Icon: Pizza },
  { id: 'utensils', label: 'Cozinha', Icon: Utensils },
  { id: 'sparkles', label: 'Higiene', Icon: Sparkles },
  { id: 'spray-can', label: 'Limpeza', Icon: SprayCan },
  { id: 'paw-print', label: 'Animais', Icon: PawPrint },
  { id: 'pill', label: 'Farmácia', Icon: Pill },
  { id: 'heart', label: 'Cuidados', Icon: Heart },
  { id: 'shirt', label: 'Roupas', Icon: Shirt },
  { id: 'house', label: 'Casa', Icon: House },
  { id: 'flower', label: 'Jardim', Icon: Flower2 },
  { id: 'gift', label: 'Presentes', Icon: Gift },
  { id: 'snowflake', label: 'Congelados', Icon: Snowflake },
  { id: 'wrench', label: 'Ferramentas', Icon: Wrench },
];

const BUILT_IN_ICONS = {
  feira: { Icon: Apple, className: 'text-emerald-700' },
  padaria: { Icon: Croissant, className: 'text-amber-700' },
  mercearia: { Icon: Package, className: 'text-orange-700' },
  carnes: { Icon: Beef, className: 'text-rose-700' },
  laticinios: { Icon: Milk, className: 'text-sky-700' },
  limpeza: { Icon: Sparkles, className: 'text-purple-700' },
  bebidas: { Icon: Coffee, className: 'text-teal-700' },
  outros: { Icon: ShoppingBag, className: 'text-slate-600' },
};

export function CategoryIcon({ category, size = 16 }: { category: CategoryId; size?: number }) {
  const categories = useCategories();
  if (Object.prototype.hasOwnProperty.call(BUILT_IN_ICONS, category)) {
    const { Icon, className } = BUILT_IN_ICONS[category as keyof typeof BUILT_IN_ICONS];
    return <Icon size={size} className={className} />;
  }
  const meta = categories[category];
  const Icon = CATEGORY_ICON_OPTIONS.find(option => option.id === meta?.icon)?.Icon || ShoppingBag;
  return <Icon size={size} style={{ color: meta?.color }} className="text-slate-600" />;
}

export function CategoryIconPicker({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
  return <fieldset>
    <legend className="mb-2 text-xs font-bold text-slate-700">Ícone da categoria</legend>
    <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
      {CATEGORY_ICON_OPTIONS.map(({ id, label, Icon }) => <button key={id} type="button" aria-label={label} title={label} aria-pressed={value === id} onClick={() => onChange(id)} className={`flex h-10 w-full items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${value === id ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}><Icon size={20} /></button>)}
    </div>
  </fieldset>;
}
