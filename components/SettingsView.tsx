'use client';

import React, { useState } from 'react';
import { Check, Circle, Cloud, LayoutTemplate, LogOut, Moon, PackagePlus, Palette, Sun, Tags } from 'lucide-react';
import { Category, CategoryId, ListTemplate, SavedItemConfig, ThemeMode } from '@/types/grocery';
import { getAllCategories, getCustomCategories, makeCustomCategory, saveCustomCategories } from '@/lib/categories';
import { deleteItemConfig, getRegisteredItems, getSavedItemConfigs, saveItemConfig } from '@/lib/storage';
import { applyTheme, getThemePreferences, saveThemePreferences } from '@/lib/preferences';
import { getTemplates, saveTemplate } from '@/lib/templates';
import { backupAppData, scheduleSupabaseBackup } from '@/lib/supabase';
import { getStoredLists } from '@/lib/storage';

function currentTimestamp() {
  return Date.now();
}

export function SettingsView({ userEmail, onSignOut }: { userEmail?: string; onSignOut?: () => void }) {
  const [section, setSection] = useState<'categories' | 'items' | 'templates' | 'appearance'>('categories');
  const [customCategories, setCustomCategories] = useState(getCustomCategories);
  const [savedItems, setSavedItems] = useState(() => Object.values(getSavedItemConfigs()).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState('#0d9488');
  const [itemName, setItemName] = useState('');
  const [editingItemName, setEditingItemName] = useState<string | null>(null);
  const [itemCategory, setItemCategory] = useState<CategoryId>('feira');
  const [itemUnit, setItemUnit] = useState('un');
  const [itemPrice, setItemPrice] = useState('');
  const [itemNotes, setItemNotes] = useState('');
  const [notice, setNotice] = useState('');
  const [templates, setTemplates] = useState(getTemplates);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateEmoji, setTemplateEmoji] = useState('🛒');
  const [templateItems, setTemplateItems] = useState<string[]>([]);
  const [theme, setTheme] = useState(getThemePreferences);
  const categories = getAllCategories();
  const registeredItems = getRegisteredItems();

  const saveCategory = (event: React.FormEvent) => {
    event.preventDefault();
    const label = categoryName.trim();
    if (!label) return;
    if (Object.values(categories).some(category => category.id !== editingCategoryId && category.label.toLocaleLowerCase('pt-BR') === label.toLocaleLowerCase('pt-BR'))) {
      setNotice('Já existe uma categoria com esse nome.');
      return;
    }
    const next: Category[] = editingCategoryId
      ? customCategories.map(category => category.id === editingCategoryId ? { ...category, label, color: categoryColor } : category)
      : [...customCategories, makeCustomCategory(label, categoryColor)];
    try {
      saveCustomCategories(next);
      setCustomCategories(next);
      setEditingCategoryId(null);
      setCategoryName('');
      setCategoryColor('#0d9488');
      setNotice('Categoria salva.');
      scheduleSupabaseBackup(getStoredLists());
    } catch {
      setNotice('Não foi possível salvar a categoria neste dispositivo.');
    }
  };

  const editCategory = (category: Category) => {
    setEditingCategoryId(category.id);
    setCategoryName(category.label);
    setCategoryColor(category.color);
    setNotice('');
  };

  const saveItem = (event: React.FormEvent) => {
    event.preventDefault();
    const name = itemName.trim();
    if (!name) return;
    const normalizedPrice = itemPrice.includes(',') ? itemPrice.replace(/\./g, '').replace(',', '.') : itemPrice;
    const parsedPrice = Number(normalizedPrice);
    const originalConfig = getSavedItemConfigs()[(editingItemName || name).toLocaleLowerCase('pt-BR')];
    const config: SavedItemConfig = {
      name,
      category: itemCategory,
      unit: itemUnit.trim() || 'un',
      defaultPrice: Number.isFinite(parsedPrice) && parsedPrice >= 0 ? parsedPrice : 0,
      notes: itemNotes.trim() || undefined,
      imageUrl: originalConfig?.imageUrl,
      updatedAt: Date.now(),
    };
    if (editingItemName && editingItemName.toLocaleLowerCase('pt-BR') !== name.toLocaleLowerCase('pt-BR')) {
      deleteItemConfig(editingItemName);
    }
    saveItemConfig(config);
    setSavedItems(Object.values(getSavedItemConfigs()).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
    setItemName('');
    setEditingItemName(null);
    setItemCategory('feira');
    setItemUnit('un');
    setItemPrice('');
    setItemNotes('');
    setNotice('Item salvo e disponível ao adicionar produtos à lista.');
    scheduleSupabaseBackup(getStoredLists());
  };

  const editItem = (item: SavedItemConfig) => {
    setSection('items');
    setItemName(item.name);
    setEditingItemName(item.name);
    setItemCategory(item.category);
    setItemUnit(item.unit);
    setItemPrice(item.defaultPrice ? item.defaultPrice.toFixed(2).replace('.', ',') : '');
    setItemNotes(item.notes || '');
    setNotice('');
  };

  const saveListTemplate = (event: React.FormEvent) => {
    event.preventDefault();
    if (!templateName.trim() || templateItems.length === 0) return;
    const now = currentTimestamp();
    const template: ListTemplate = {
      id: `custom-${now.toString(36)}`,
      name: templateName.trim(),
      description: templateDescription.trim() || `${templateItems.length} itens`,
      emoji: templateEmoji.trim() || '🛒',
      items: templateItems.map(name => {
        const item = registeredItems.find(candidate => candidate.name === name)!;
        return { name: item.name, category: item.category, quantity: 1, unit: item.unit, price: item.price, imageUrl: item.imageUrl, notes: item.notes };
      }),
      createdAt: now,
      updatedAt: now,
    };
    setTemplates(saveTemplate(template));
    setTemplateName('');
    setTemplateDescription('');
    setTemplateEmoji('🛒');
    setTemplateItems([]);
    setNotice('Modelo salvo e disponível na tela inicial.');
    scheduleSupabaseBackup(getStoredLists());
  };

  const updateTheme = (mode: ThemeMode, primaryColor = theme.primaryColor) => {
    const next = { mode, primaryColor };
    setTheme(next);
    saveThemePreferences(next);
    applyTheme(next);
    setNotice('Aparência atualizada.');
    scheduleSupabaseBackup(getStoredLists());
  };

  const runBackup = async () => {
    setNotice('Fazendo backup...');
    try {
      const backedUp = await backupAppData(getStoredLists());
      setNotice(backedUp ? 'Backup concluído no Supabase.' : 'Configure as chaves do Supabase para ativar o backup.');
    } catch {
      setNotice('Não foi possível concluir o backup. Verifique a configuração do Supabase.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 pb-24">
      <p className="text-sm text-slate-500 mb-5">Organize categorias, produtos, modelos, backup e aparência.</p>
      <div className="flex flex-wrap gap-2 mb-5">
        <button type="button" onClick={() => { setSection('categories'); setNotice(''); }} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${section === 'categories' ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}><Tags size={16} /> Categorias</button>
        <button type="button" onClick={() => { setSection('items'); setNotice(''); }} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${section === 'items' ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}><PackagePlus size={16} /> Itens</button>
        <button type="button" onClick={() => { setSection('templates'); setNotice(''); }} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${section === 'templates' ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}><LayoutTemplate size={16} /> Modelos</button>
        <button type="button" onClick={() => { setSection('appearance'); setNotice(''); }} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${section === 'appearance' ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}><Palette size={16} /> Tema</button>
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-2"><button type="button" onClick={runBackup} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"><Cloud size={15} /> Sincronizar agora</button>{userEmail && <span className="text-xs text-slate-500">Conectado como <strong className="text-slate-700">{userEmail}</strong></span>}{onSignOut && <button type="button" onClick={onSignOut} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"><LogOut size={14} /> Sair</button>}</div>
      {notice && <p role="status" className="mb-4 text-sm font-semibold text-emerald-800 bg-emerald-50 rounded-xl px-3 py-2">{notice}</p>}

      {section === 'categories' ? <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 items-start">
        <form onSubmit={saveCategory} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
          <h2 className="font-extrabold text-slate-900">{editingCategoryId ? 'Editar categoria' : 'Nova categoria'}</h2>
          <label className="block text-xs font-bold text-slate-700">Nome<input required maxLength={40} value={categoryName} onChange={event => setCategoryName(event.target.value)} placeholder="Ex: Pet shop" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900" /></label>
          <label className="flex items-center gap-3 text-xs font-bold text-slate-700">Cor<input type="color" value={categoryColor} onChange={event => setCategoryColor(event.target.value)} className="w-12 h-10 rounded-lg cursor-pointer" /></label>
          <div className="flex gap-2"><button type="submit" className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 text-sm font-bold flex items-center justify-center gap-2"><Check size={16} />Salvar categoria</button>{editingCategoryId && <button type="button" onClick={() => { setEditingCategoryId(null); setCategoryName(''); setCategoryColor('#0d9488'); }} className="rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-600">Cancelar</button>}</div>
        </form>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <h2 className="font-extrabold text-slate-900 mb-3">Categorias disponíveis</h2>
          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {Object.values(categories).map(category => {
              const isCustom = customCategories.some(custom => custom.id === category.id);
              return <div key={category.id} className="flex items-center gap-2 py-2 border-b border-slate-100 last:border-0"><span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: category.color }} /><span className="flex-1 text-sm text-slate-800">{category.label}</span>{isCustom ? <button type="button" onClick={() => editCategory(category)} className="text-xs font-bold text-emerald-700">Editar</button> : <span className="text-[11px] text-slate-400">Padrão</span>}</div>;
            })}
          </div>
        </div>
      </div> : section === 'items' ? <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 items-start">
        <form onSubmit={saveItem} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
          <h2 className="font-extrabold text-slate-900">{editingItemName ? 'Editar item' : 'Cadastrar item'}</h2>
          <label className="block text-xs font-bold text-slate-700">Nome<input required maxLength={100} value={itemName} onChange={event => setItemName(event.target.value)} placeholder="Ex: Ração para cachorro" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900" /></label>
          <div className="grid grid-cols-2 gap-2"><label className="block text-xs font-bold text-slate-700">Categoria<select value={itemCategory} onChange={event => setItemCategory(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-2 py-2.5 text-sm text-slate-900">{Object.values(categories).map(category => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label><label className="block text-xs font-bold text-slate-700">Unidade<input value={itemUnit} onChange={event => setItemUnit(event.target.value)} maxLength={20} placeholder="un, kg, pct..." className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900" /></label></div>
          <label className="block text-xs font-bold text-slate-700">Preço padrão (R$)<input inputMode="decimal" value={itemPrice} onChange={event => setItemPrice(event.target.value.replace(/[^0-9,.]/g, ''))} placeholder="0,00" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900" /></label>
          <label className="block text-xs font-bold text-slate-700">Observação<input value={itemNotes} onChange={event => setItemNotes(event.target.value)} placeholder="Marca ou preferência" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900" /></label>
          <div className="flex gap-2"><button type="submit" className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 text-sm font-bold flex items-center justify-center gap-2"><Check size={16} />Salvar item</button>{editingItemName && <button type="button" onClick={() => { setEditingItemName(null); setItemName(''); setItemCategory('feira'); setItemUnit('un'); setItemPrice(''); setItemNotes(''); }} className="rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-600">Cancelar</button>}</div>
        </form>
        <div className="bg-white border border-slate-200 rounded-2xl p-4"><h2 className="font-extrabold text-slate-900 mb-1">Itens cadastrados</h2><p className="text-xs text-slate-500 mb-3">Os produtos prontos do catálogo também aparecem ao adicionar itens à lista.</p>{savedItems.length ? <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100">{savedItems.map(item => <div key={item.name.toLocaleLowerCase('pt-BR')} className="flex items-center gap-2 py-2"><div className="flex-1 min-w-0"><p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p><p className="text-xs text-slate-500">{categories[item.category]?.label || 'Outros Itens'} · {item.unit}</p></div><button type="button" onClick={() => editItem(item)} className="text-xs font-bold text-emerald-700">Editar</button></div>)}</div> : <p className="text-sm text-slate-500 py-4">Nenhum item personalizado cadastrado.</p>}</div>
      </div> : section === 'templates' ? <div className="grid md:grid-cols-2 gap-4 items-start">
        <form onSubmit={saveListTemplate} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
          <h2 className="font-extrabold text-slate-900">Novo modelo de lista</h2>
          <div className="grid grid-cols-[64px_1fr] gap-2"><label className="block text-xs font-bold text-slate-700">Ícone<input value={templateEmoji} onChange={event => setTemplateEmoji(event.target.value)} maxLength={4} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-center" /></label><label className="block text-xs font-bold text-slate-700">Nome<input required value={templateName} onChange={event => setTemplateName(event.target.value)} placeholder="Ex: Compras para festa" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900" /></label></div>
          <label className="block text-xs font-bold text-slate-700">Descrição<input value={templateDescription} onChange={event => setTemplateDescription(event.target.value)} placeholder="Ex: Bebidas e petiscos" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900" /></label>
          <fieldset><legend className="text-xs font-bold text-slate-700 mb-2">Itens do modelo</legend><div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">{registeredItems.map(item => <label key={item.id} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700"><input type="checkbox" checked={templateItems.includes(item.name)} onChange={event => setTemplateItems(current => event.target.checked ? [...current, item.name] : current.filter(name => name !== item.name))} /><span className="flex-1 truncate">{item.name}</span></label>)}</div></fieldset>
          <button type="submit" disabled={!templateName.trim() || !templateItems.length} className="w-full rounded-xl bg-emerald-600 disabled:bg-slate-300 text-white py-2.5 text-sm font-bold">Salvar modelo</button>
        </form>
        <div className="bg-white border border-slate-200 rounded-2xl p-4"><h2 className="font-extrabold text-slate-900 mb-3">Modelos disponíveis</h2><div className="space-y-2">{templates.map(template => <div key={template.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"><span className="text-xl">{template.emoji}</span><div className="min-w-0"><p className="text-sm font-bold text-slate-800 truncate">{template.name}</p><p className="text-xs text-slate-500">{template.items.length} itens · {template.description}</p></div></div>)}</div></div>
      </div> : <div className="bg-white border border-slate-200 rounded-2xl p-4 max-w-xl space-y-5">
        <div><h2 className="font-extrabold text-slate-900">Tema do aplicativo</h2><p className="text-xs text-slate-500 mt-1">Escolha como o aplicativo aparece neste dispositivo.</p></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{([['light', 'Claro', Sun], ['dark', 'Escuro', Moon], ['black', 'Preto', Circle], ['system', 'Sistema', Palette]] as const).map(([mode, label, Icon]) => <button key={mode} type="button" onClick={() => updateTheme(mode)} className={`rounded-xl border p-3 flex flex-col items-center gap-1 text-xs font-bold ${theme.mode === mode ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-slate-200 text-slate-600'}`}><Icon size={18} fill={mode === 'black' ? 'currentColor' : 'none'} />{label}</button>)}</div>
        <label className="block text-xs font-bold text-slate-700">Cor principal<div className="mt-2 flex items-center gap-3"><input type="color" value={theme.primaryColor} onChange={event => updateTheme(theme.mode, event.target.value)} className="w-14 h-11 rounded-lg cursor-pointer" /><span className="text-sm font-mono text-slate-600 uppercase">{theme.primaryColor}</span></div></label>
      </div>}
    </div>
  );
}
