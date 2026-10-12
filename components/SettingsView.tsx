'use client';

import React, { useRef, useState } from 'react';
import { Check, ChevronRight, Circle, Cloud, Download, Eye, EyeOff, FileSpreadsheet, LayoutTemplate, LogOut, Moon, PackagePlus, Palette, Sun, Tags, Upload } from 'lucide-react';
import { Category, CategoryId, ListTemplate, SavedItemConfig, ThemeMode } from '@/types/grocery';
import { getAllCategories, getCustomCategories, makeCustomCategory, saveCustomCategories } from '@/lib/categories';
import { deleteItemConfig, getRegisteredItems, getSavedItemConfigs, saveItemConfig } from '@/lib/storage';
import { applyTheme, getThemePreferences, saveThemePreferences } from '@/lib/preferences';
import { getTemplates, saveTemplate } from '@/lib/templates';
import { backupAppData, scheduleSupabaseBackup } from '@/lib/supabase';
import { getStoredLists } from '@/lib/storage';

export type SettingsSection = 'home' | 'categories' | 'items' | 'templates' | 'appearance';

function currentTimestamp() {
  return Date.now();
}

export function SettingsView({ userEmail, onSignOut, section: controlledSection, onSectionChange }: { userEmail?: string; onSignOut?: () => void; section?: SettingsSection; onSectionChange?: (section: SettingsSection) => void }) {
  const [internalSection, setInternalSection] = useState<SettingsSection>('home');
  const section = controlledSection ?? internalSection;
  const setSection = (nextSection: SettingsSection) => {
    setInternalSection(nextSection);
    onSectionChange?.(nextSection);
  };
  const [customCategories, setCustomCategories] = useState(getCustomCategories);
  const [savedItems, setSavedItems] = useState(() => Object.values(getSavedItemConfigs()).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [isCategoryEditorOpen, setIsCategoryEditorOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState('#0d9488');
  const [categorySwipeId, setCategorySwipeId] = useState<string | null>(null);
  const categoryTouchStart = useRef<number | null>(null);
  const [itemName, setItemName] = useState('');
  const [editingItemName, setEditingItemName] = useState<string | null>(null);
  const [itemCategory, setItemCategory] = useState<CategoryId>('feira');
  const [itemUnit, setItemUnit] = useState('un');
  const [itemPrice, setItemPrice] = useState('');
  const [itemNotes, setItemNotes] = useState('');
  const [isImportingItems, setIsImportingItems] = useState(false);
  const [isImportingTemplates, setIsImportingTemplates] = useState(false);
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
      ? customCategories.map(category => category.id === editingCategoryId ? { ...category, label } : category)
      : [...customCategories, makeCustomCategory(label, Object.values(categories).map(category => category.color))];
    try {
      saveCustomCategories(next);
      setCustomCategories(next);
      setCategoryName('');
      setCategoryColor('#0d9488');
      setIsCategoryEditorOpen(false);
      setEditingCategoryId(null);
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
    setIsCategoryEditorOpen(true);
    setNotice('');
  };

  const deleteCategory = (id: string) => {
    const next = customCategories.filter(category => category.id !== id);
    saveCustomCategories(next);
    setCustomCategories(next);
    setCategorySwipeId(null);
    scheduleSupabaseBackup(getStoredLists());
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

  const downloadItemImportExample = async () => {
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet([
      { Nome: 'Arroz', valor: 25.9, categoria: 'Mercearia & Despensa', fator: 'pct' },
      { Nome: 'Leite integral', valor: 6.5, categoria: 'Laticínios', fator: 'un' },
    ]);
    worksheet['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 26 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Itens');
    XLSX.writeFile(workbook, 'modelo-itens-cadastrados.xlsx');
  };

  const readImportedPrice = (value: unknown) => {
    if (typeof value === 'number') return value;
    const text = String(value ?? '').trim();
    if (!text) return 0;
    const normalized = text.includes(',') ? text.replace(/\./g, '').replace(',', '.') : text;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  };

  const importItemsFromSpreadsheet = async (file?: File) => {
    if (!file) return;
    setIsImportingItems(true);
    setNotice('Importando itens...');
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });
      const normalizeHeader = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
      const headers = new Set(rows.flatMap(row => Object.keys(row).map(normalizeHeader)));
      if (!['nome', 'valor', 'categoria', 'fator'].every(header => headers.has(header))) {
        setNotice('A planilha precisa das colunas Nome, valor, categoria e fator. Baixe o modelo para começar.');
        return;
      }
      const existingItems = getSavedItemConfigs();
      const preparedItems: SavedItemConfig[] = [];
      const invalidCategories: string[] = [];

      rows.forEach((row, index) => {
        const entries = Object.entries(row);
        const valueFor = (header: string) => entries.find(([key]) => normalizeHeader(key) === header)?.[1];
        const name = String(valueFor('nome') ?? '').trim();
        if (!name) return;
        const key = name.toLocaleLowerCase('pt-BR');
        const previous = existingItems[key];
        const importedCategory = String(valueFor('categoria') ?? '').trim();
        const normalizedCategory = normalizeHeader(importedCategory);
        const category = Object.values(categories).find(candidate => normalizeHeader(candidate.id) === normalizedCategory || normalizeHeader(candidate.label) === normalizedCategory)?.id;
        if (!category) {
          invalidCategories.push(`linha ${index + 2}: ${importedCategory || 'categoria vazia'}`);
          return;
        }
        const unit = String(valueFor('fator') ?? '').trim() || previous?.unit || 'un';
        preparedItems.push({
          name,
          category,
          unit,
          defaultPrice: readImportedPrice(valueFor('valor')),
          notes: previous?.notes,
          imageUrl: previous?.imageUrl,
          updatedAt: Date.now(),
        });
      });

      if (invalidCategories.length) {
        setNotice(`Importação cancelada: categoria não cadastrada (${invalidCategories.slice(0, 3).join('; ')}).`);
        return;
      }
      if (!preparedItems.length) {
        setNotice('Nenhum item foi importado. Use as colunas Nome, valor, categoria e fator.');
        return;
      }
      preparedItems.forEach(saveItemConfig);
      setSavedItems(Object.values(getSavedItemConfigs()).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
      scheduleSupabaseBackup(getStoredLists());
      setNotice(`${preparedItems.length} ${preparedItems.length === 1 ? 'item importado' : 'itens importados'} com sucesso.`);
    } catch {
      setNotice('Não foi possível ler a planilha. Use um arquivo Excel .xlsx com as colunas Nome, valor, categoria e fator.');
    } finally {
      setIsImportingItems(false);
    }
  };

  const downloadTemplateImportExample = async () => {
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet([
      { Lista: 'Café da manhã', descrição: 'Itens para a semana', ícone: '☕', Item: 'Leite Integral 1L', Categoria: 'Laticínios', quantidade: 2, fator: 'un', valor: 6.5 },
      { Lista: 'Café da manhã', descrição: 'Itens para a semana', ícone: '☕', Item: 'Pão Francês', Categoria: 'Padaria & Grãos', quantidade: 10, fator: 'un', valor: 1.2 },
    ]);
    worksheet['!cols'] = [{ wch: 24 }, { wch: 28 }, { wch: 10 }, { wch: 28 }, { wch: 26 }, { wch: 14 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Modelos');
    XLSX.writeFile(workbook, 'modelo-listas-prontas.xlsx');
  };

  const importTemplatesFromSpreadsheet = async (file?: File) => {
    if (!file) return;
    setIsImportingTemplates(true);
    setNotice('Importando modelos...');
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });
      const normalizeHeader = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
      const headers = new Set(rows.flatMap(row => Object.keys(row).map(normalizeHeader)));
      const requiredHeaders = ['lista', 'item', 'categoria', 'quantidade', 'fator', 'valor'];
      if (!requiredHeaders.every(header => headers.has(header))) {
        setNotice('A planilha de modelos precisa das colunas Lista, Item, Categoria, quantidade, fator e valor.');
        return;
      }

      const invalidRows: string[] = [];
      const grouped = new Map<string, { name: string; description: string; emoji: string; items: ListTemplate['items'] }>();
      rows.forEach((row, index) => {
        const entries = Object.entries(row);
        const valueFor = (header: string) => entries.find(([key]) => normalizeHeader(key) === header)?.[1];
        const listName = String(valueFor('lista') ?? '').trim();
        const itemName = String(valueFor('item') ?? '').trim();
        const categoryName = String(valueFor('categoria') ?? '').trim();
        const category = Object.values(categories).find(candidate => normalizeHeader(candidate.id) === normalizeHeader(categoryName) || normalizeHeader(candidate.label) === normalizeHeader(categoryName));
        const registeredItem = registeredItems.find(item => normalizeHeader(item.name) === normalizeHeader(itemName));
        if (!listName || !itemName || !category || !registeredItem || registeredItem.category !== category?.id) {
          invalidRows.push(`linha ${index + 2}`);
          return;
        }
        const quantity = Number(String(valueFor('quantidade') ?? '').replace(',', '.'));
        const unit = String(valueFor('fator') ?? '').trim();
        if (!Number.isFinite(quantity) || quantity <= 0 || !unit) {
          invalidRows.push(`linha ${index + 2}`);
          return;
        }
        const templateKey = listName.toLocaleLowerCase('pt-BR');
        const template = grouped.get(templateKey) || {
          name: listName,
          description: String(valueFor('descricao') ?? valueFor('descrição') ?? '').trim(),
          emoji: String(valueFor('icone') ?? valueFor('ícone') ?? '').trim() || '🛒',
          items: [],
        };
        template.items.push({ name: registeredItem.name, category: category.id, quantity, unit, price: readImportedPrice(valueFor('valor')), imageUrl: registeredItem.imageUrl, notes: registeredItem.notes });
        grouped.set(templateKey, template);
      });

      if (invalidRows.length) {
        setNotice(`Importação cancelada: item, categoria ou dados inválidos (${invalidRows.slice(0, 3).join(', ')}).`);
        return;
      }
      if (!grouped.size) {
        setNotice('Nenhum modelo foi importado.');
        return;
      }
      const now = currentTimestamp();
      const importedTemplates = Array.from(grouped.values()).map((template, index): ListTemplate => ({
        id: `imported-${now.toString(36)}-${index}`,
        name: template.name,
        description: template.description || `${template.items.length} itens`,
        emoji: template.emoji,
        items: template.items,
        createdAt: now,
        updatedAt: now,
      }));
      let nextTemplates = templates;
      importedTemplates.forEach(template => { nextTemplates = saveTemplate(template); });
      setTemplates(nextTemplates);
      scheduleSupabaseBackup(getStoredLists());
      setNotice(`${importedTemplates.length} ${importedTemplates.length === 1 ? 'modelo importado' : 'modelos importados'} com sucesso.`);
    } catch {
      setNotice('Não foi possível ler a planilha de modelos. Baixe o modelo para conferir as colunas.');
    } finally {
      setIsImportingTemplates(false);
    }
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

  const updateTheme = (mode: ThemeMode, primaryColor = theme.primaryColor, showImages = theme.showImages, travelColor = theme.travelColor) => {
    const next = { mode, primaryColor, showImages, travelColor };
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

  const openSection = (nextSection: Exclude<typeof section, 'home'>) => {
    setSection(nextSection);
    setNotice('');
  };

  const settingsOptions = [
    { id: 'categories' as const, icon: Tags, title: 'Categorias', description: 'Organize os grupos dos seus itens.' },
    { id: 'items' as const, icon: PackagePlus, title: 'Itens cadastrados', description: 'Cadastre produtos para adicionar às listas.' },
    { id: 'templates' as const, icon: LayoutTemplate, title: 'Modelos de lista', description: 'Crie listas prontas para reutilizar.' },
    { id: 'appearance' as const, icon: Palette, title: 'Aparência', description: 'Tema, cor principal e imagens dos itens.' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 pb-24">
      {section === 'home' ? <>
        <div className="mb-6">
          <h1 className="text-xl font-extrabold text-slate-900">Configurações</h1>
          <p className="mt-1 text-sm text-slate-500">Personalize suas listas e os itens cadastrados.</p>
        </div>
        <section className="mb-6">
          <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-slate-500">Listas e itens</h2>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
            {settingsOptions.map(({ id, icon: Icon, title, description }) => <button key={id} type="button" onClick={() => openSection(id)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 active:bg-slate-100"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Icon size={20} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-800">{title}</span><span className="mt-0.5 block text-xs text-slate-500">{description}</span></span><ChevronRight size={20} className="shrink-0 text-slate-400" /></button>)}
          </div>
        </section>
        <section>
          <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-slate-500">Conta e dados</h2>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
            <button type="button" onClick={runBackup} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 active:bg-slate-100"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><Cloud size={20} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-800">Sincronizar agora</span><span className="mt-0.5 block text-xs text-slate-500">Faça backup das listas no Supabase.</span></span><ChevronRight size={20} className="shrink-0 text-slate-400" /></button>
            {userEmail && <div className="flex items-center gap-3 px-4 py-3.5"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><Circle size={18} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-800">Conta conectada</span><span className="mt-0.5 block truncate text-xs text-slate-500">{userEmail}</span></span></div>}
            {onSignOut && <button type="button" onClick={onSignOut} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-rose-50 active:bg-rose-100"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700"><LogOut size={20} /></span><span className="flex-1 text-sm font-bold text-rose-700">Sair da conta</span><ChevronRight size={20} className="shrink-0 text-rose-400" /></button>}
          </div>
        </section>
      </> : <>
      {notice && <p role="status" className="mb-4 text-sm font-semibold text-emerald-800 bg-emerald-50 rounded-xl px-3 py-2">{notice}</p>}

      {section === 'categories' ? <><div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 items-start">
        <form onSubmit={saveCategory} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
          <h2 className="font-extrabold text-slate-900">Nova categoria</h2>
          <label className="block text-xs font-bold text-slate-700">Nome<input required maxLength={40} value={categoryName} onChange={event => setCategoryName(event.target.value)} placeholder="Ex: Pet shop" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900" /></label>
          <div className="flex gap-2"><button type="submit" className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 text-sm font-bold flex items-center justify-center gap-2"><Check size={16} />Salvar categoria</button></div>
        </form>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <h2 className="font-extrabold text-slate-900 mb-3">Categorias disponíveis</h2>
          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {Object.values(categories).map(category => {
              const isCustom = customCategories.some(custom => custom.id === category.id);
              const isSwiped = categorySwipeId === category.id;
              return <div key={category.id} className="relative overflow-hidden rounded-xl border-b border-slate-100 last:border-0">
                {isCustom && <button type="button" onClick={() => deleteCategory(category.id)} className="absolute inset-y-0 right-0 flex w-24 items-center justify-center bg-rose-600 text-xs font-bold text-white">Excluir</button>}
                <button type="button" disabled={!isCustom} onClick={() => { if (!isCustom) return; if (isSwiped) { setCategorySwipeId(null); return; } editCategory(category); }} onTouchStart={event => { categoryTouchStart.current = event.touches[0].clientX; }} onTouchEnd={event => { const start = categoryTouchStart.current; const offset = start === null ? 0 : event.changedTouches[0].clientX - start; if (isCustom && offset < -35) setCategorySwipeId(category.id); if (isCustom && offset > 35) setCategorySwipeId(null); categoryTouchStart.current = null; }} style={{ width: isCustom && isSwiped ? 'calc(100% - 96px)' : '100%' }} className={`relative flex items-center gap-2 bg-white py-2 text-left transition-[width] duration-150 ${isCustom ? 'cursor-pointer' : 'cursor-default'}`}><span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: category.color }} /><span className="flex-1 text-sm text-slate-800">{category.label}</span>{!isCustom && <span className="text-[11px] text-slate-400">Padrão</span>}</button>
              </div>;
            })}
          </div>
        </div>
      </div>{isCategoryEditorOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => { setIsCategoryEditorOpen(false); setEditingCategoryId(null); setCategoryName(''); }}><form onSubmit={saveCategory} onClick={event => event.stopPropagation()} className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 space-y-4"><label className="block text-xs font-bold text-slate-700">Nome<input required maxLength={40} value={categoryName} onChange={event => setCategoryName(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900" /></label><label className="flex items-center justify-between text-xs font-bold text-slate-700">Cor<input type="color" value={categoryColor} onChange={event => setCategoryColor(event.target.value)} className="h-10 w-12 cursor-pointer rounded-lg" /></label><div className="flex gap-2"><button type="button" onClick={() => { setIsCategoryEditorOpen(false); setEditingCategoryId(null); setCategoryName(''); }} className="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-bold text-slate-700">Cancelar</button><button type="submit" className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white">Salvar</button></div></form></div>}</> : section === 'items' ? <><div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><FileSpreadsheet size={20} /></span><div><h2 className="text-sm font-extrabold text-slate-900">Importar itens por Excel</h2><p className="text-xs text-slate-500">Colunas necessárias: Nome, valor, categoria e fator (unidade).</p></div></div><div className="flex gap-2"><button type="button" onClick={() => { void downloadItemImportExample(); }} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><Download size={15} />Modelo</button><label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"><Upload size={15} />{isImportingItems ? 'Importando...' : 'Importar'}<input type="file" accept=".xlsx,.xls" className="hidden" disabled={isImportingItems} onChange={event => { void importItemsFromSpreadsheet(event.target.files?.[0]); event.currentTarget.value = ''; }} /></label></div></div></div><div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 items-start">
        <form onSubmit={saveItem} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
          <h2 className="font-extrabold text-slate-900">{editingItemName ? 'Editar item' : 'Cadastrar item'}</h2>
          <label className="block text-xs font-bold text-slate-700">Nome<input required maxLength={100} value={itemName} onChange={event => setItemName(event.target.value)} placeholder="Ex: Ração para cachorro" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900" /></label>
          <div className="grid grid-cols-2 gap-2"><label className="block text-xs font-bold text-slate-700">Categoria<select value={itemCategory} onChange={event => setItemCategory(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-2 py-2.5 text-sm text-slate-900">{Object.values(categories).map(category => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label><label className="block text-xs font-bold text-slate-700">Unidade<input value={itemUnit} onChange={event => setItemUnit(event.target.value)} maxLength={20} placeholder="un, kg, pct..." className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900" /></label></div>
          <label className="block text-xs font-bold text-slate-700">Preço padrão (R$)<input inputMode="decimal" value={itemPrice} onChange={event => setItemPrice(event.target.value.replace(/[^0-9,.]/g, ''))} placeholder="0,00" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900" /></label>
          <label className="block text-xs font-bold text-slate-700">Observação<input value={itemNotes} onChange={event => setItemNotes(event.target.value)} placeholder="Marca ou preferência" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900" /></label>
          <div className="flex gap-2"><button type="submit" className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 text-sm font-bold flex items-center justify-center gap-2"><Check size={16} />Salvar item</button>{editingItemName && <button type="button" onClick={() => { setEditingItemName(null); setItemName(''); setItemCategory('feira'); setItemUnit('un'); setItemPrice(''); setItemNotes(''); }} className="rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-600">Cancelar</button>}</div>
        </form>
        <div className="bg-white border border-slate-200 rounded-2xl p-4"><h2 className="font-extrabold text-slate-900 mb-1">Itens cadastrados</h2><p className="text-xs text-slate-500 mb-3">Os produtos prontos do catálogo também aparecem ao adicionar itens à lista.</p>{savedItems.length ? <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100">{savedItems.map(item => <div key={item.name.toLocaleLowerCase('pt-BR')} className="flex items-center gap-2 py-2"><div className="flex-1 min-w-0"><p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p><p className="text-xs text-slate-500">{categories[item.category]?.label || 'Outros Itens'} · {item.unit}</p></div><button type="button" onClick={() => editItem(item)} className="text-xs font-bold text-emerald-700">Editar</button></div>)}</div> : <p className="text-sm text-slate-500 py-4">Nenhum item personalizado cadastrado.</p>}</div>
      </div></> : section === 'templates' ? <><div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><FileSpreadsheet size={20} /></span><div><h2 className="text-sm font-extrabold text-slate-900">Importar modelos por Excel</h2><p className="text-xs text-slate-500">Colunas: Lista, Item, Categoria, quantidade, fator e valor.</p></div></div><div className="flex gap-2"><button type="button" onClick={() => { void downloadTemplateImportExample(); }} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><Download size={15} />Modelo</button><label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"><Upload size={15} />{isImportingTemplates ? 'Importando...' : 'Importar'}<input type="file" accept=".xlsx,.xls" className="hidden" disabled={isImportingTemplates} onChange={event => { void importTemplatesFromSpreadsheet(event.target.files?.[0]); event.currentTarget.value = ''; }} /></label></div></div></div><div className="grid md:grid-cols-2 gap-4 items-start">
        <form onSubmit={saveListTemplate} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
          <h2 className="font-extrabold text-slate-900">Novo modelo de lista</h2>
          <div className="grid grid-cols-[64px_1fr] gap-2"><label className="block text-xs font-bold text-slate-700">Ícone<input value={templateEmoji} onChange={event => setTemplateEmoji(event.target.value)} maxLength={4} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-center" /></label><label className="block text-xs font-bold text-slate-700">Nome<input required value={templateName} onChange={event => setTemplateName(event.target.value)} placeholder="Ex: Compras para festa" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900" /></label></div>
          <label className="block text-xs font-bold text-slate-700">Descrição<input value={templateDescription} onChange={event => setTemplateDescription(event.target.value)} placeholder="Ex: Bebidas e petiscos" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900" /></label>
          <fieldset><legend className="text-xs font-bold text-slate-700 mb-2">Itens do modelo</legend><div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">{registeredItems.map(item => <label key={item.id} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700"><input type="checkbox" checked={templateItems.includes(item.name)} onChange={event => setTemplateItems(current => event.target.checked ? [...current, item.name] : current.filter(name => name !== item.name))} /><span className="flex-1 truncate">{item.name}</span></label>)}</div></fieldset>
          <button type="submit" disabled={!templateName.trim() || !templateItems.length} className="w-full rounded-xl bg-emerald-600 disabled:bg-slate-300 text-white py-2.5 text-sm font-bold">Salvar modelo</button>
        </form>
        <div className="bg-white border border-slate-200 rounded-2xl p-4"><h2 className="font-extrabold text-slate-900 mb-3">Modelos disponíveis</h2><div className="space-y-2">{templates.map(template => <div key={template.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"><span className="text-xl">{template.emoji}</span><div className="min-w-0"><p className="text-sm font-bold text-slate-800 truncate">{template.name}</p><p className="text-xs text-slate-500">{template.items.length} itens · {template.description}</p></div></div>)}</div></div>
      </div></> : <div className="bg-white border border-slate-200 rounded-2xl p-4 max-w-xl space-y-5">
        <div><h2 className="font-extrabold text-slate-900">Tema do aplicativo</h2><p className="text-xs text-slate-500 mt-1">Escolha como o aplicativo aparece neste dispositivo.</p></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{([['light', 'Claro', Sun], ['dark', 'Escuro', Moon], ['black', 'Preto', Circle], ['system', 'Sistema', Palette]] as const).map(([mode, label, Icon]) => <button key={mode} type="button" onClick={() => updateTheme(mode)} className={`rounded-xl border p-3 flex flex-col items-center gap-1 text-xs font-bold ${theme.mode === mode ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-slate-200 text-slate-600'}`}><Icon size={18} fill={mode === 'black' ? 'currentColor' : 'none'} />{label}</button>)}</div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-bold text-slate-700">Cor principal<div className="mt-2"><input type="color" value={theme.primaryColor} onChange={event => updateTheme(theme.mode, event.target.value)} className="h-11 w-14 cursor-pointer rounded-lg" /></div></label>
          <label className="block text-xs font-bold text-slate-700">Cor da viagem<div className="mt-2"><input type="color" value={theme.travelColor} onChange={event => updateTheme(theme.mode, theme.primaryColor, theme.showImages, event.target.value)} className="h-11 w-14 cursor-pointer rounded-lg" /></div></label>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-3.5 py-3"><div className="flex items-center gap-3"><span className={`flex h-9 w-9 items-center justify-center rounded-lg ${theme.showImages ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{theme.showImages ? <Eye size={18} /> : <EyeOff size={18} />}</span><div><p className="text-sm font-bold text-slate-800">Exibir imagens dos itens</p><p className="text-xs text-slate-500">{theme.showImages ? 'Fotos visíveis nas listas.' : 'Fotos ocultas nas listas.'}</p></div></div><button type="button" role="switch" aria-checked={theme.showImages} onClick={() => updateTheme(theme.mode, theme.primaryColor, !theme.showImages)} className={`relative h-6 w-11 shrink-0 overflow-hidden rounded-full p-1 transition-colors ${theme.showImages ? 'bg-emerald-600' : 'bg-slate-300'}`}><span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${theme.showImages ? 'translate-x-5' : 'translate-x-0'}`} /></button></div>
      </div>}</>}
    </div>
  );
}
