'use client';

import React, { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Navbar } from '@/components/Navbar';
import { ShoppingView } from '@/components/ShoppingView';
import { TravelView } from '@/components/TravelView';
import { ListsManager } from '@/components/ListsManager';
import { SettingsView, SettingsSection } from '@/components/SettingsView';
import { ItemModal } from '@/components/ItemModal';
import { ListEditModal } from '@/components/ListEditModal';
import { ImagePreviewModal } from '@/components/ImagePreviewModal';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { AuthView } from '@/components/AuthView';
import { ShoppingList, GroceryItem, CategoryId, ListType } from '@/types/grocery';
import {
  getStoredLists,
  saveLists,
  getStoredActiveListId,
  getStoredNavigation,
  saveActiveListId,
  saveNavigation,
  INITIAL_LISTS,
  saveItemConfig,
  recordItemPrice,
  getLatestPrice,
} from '@/lib/storage';
import { setThemeUser } from '@/lib/preferences';
import { useThemePreferences } from '@/hooks/use-theme-preferences';
import {
  backupAppData,
  deleteListFromSupabase,
  flushPendingSupabaseBackup,
  getCurrentSession,
  isOfflineSyncPending,
  isSupabaseConfigured,
  loadCategoriesFromSupabase,
  loadItemConfigsFromSupabase,
  loadListsFromSupabase,
  loadTemplatesFromSupabase,
  loadThemeFromSupabase,
  onAuthSessionChange,
  scheduleSupabaseBackup,
  signOut,
  subscribeToListChanges,
} from '@/lib/supabase';
import { getTemplates } from '@/lib/templates';
import { CATALOG_PRESETS } from '@/lib/catalog';

const emptySubscribe = () => () => {};

function useIsMounted() {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function ShoppingApp() {
  useThemePreferences();
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const captureInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const clearInstallPrompt = () => setInstallPrompt(null);
    window.addEventListener('beforeinstallprompt', captureInstallPrompt);
    window.addEventListener('appinstalled', clearInstallPrompt);
  return () => {
      window.removeEventListener('beforeinstallprompt', captureInstallPrompt);
      window.removeEventListener('appinstalled', clearInstallPrompt);
    };
  }, []);

  const installApp = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  
  const [restoredNavigation] = useState(() => getStoredNavigation());
  const [lists, setLists] = useState<ShoppingList[]>(() => getStoredLists());
  const [activeListId, setActiveListId] = useState<string>(() => restoredNavigation?.listId || getStoredActiveListId());
  const [activeTab, setActiveTab] = useState<'shopping' | 'lists' | 'stats' | 'settings'>(() => restoredNavigation?.tab || 'lists');
  const [listTypeFilter, setListTypeFilter] = useState<ListType>(() => restoredNavigation?.listFilter || 'market');
  const [settingsSection, setSettingsSection] = useState<SettingsSection>('home');
  const [isNewListModalOpen, setIsNewListModalOpen] = useState(false);
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured());
  const [session, setSession] = useState<Session | null>(null);
  const [syncNotice, setSyncNotice] = useState('');
  const [syncFailure, setSyncFailure] = useState('');
  const localEditVersion = React.useRef(0);

  // Modals state
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GroceryItem | null>(null);
  const [defaultCategoryForNewItem, setDefaultCategoryForNewItem] = useState<CategoryId>('feira');

  const [isListEditModalOpen, setIsListEditModalOpen] = useState(false);
  const [listToDelete, setListToDelete] = useState<ShoppingList | null>(null);

  const [previewImage, setPreviewImage] = useState<{
    url: string;
    name: string;
    category: CategoryId;
  } | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const acceptSession = (current: Session | null) => {
      setThemeUser(current?.user.id || null);
      setSession(current);
      setAuthReady(true);
    };
    getCurrentSession().then(acceptSession).catch(() => setAuthReady(true));
    return onAuthSessionChange(acceptSession);
  }, []);

  useEffect(() => {
    saveNavigation(activeTab, activeListId, listTypeFilter);
  }, [activeTab, activeListId, listTypeFilter]);

  useEffect(() => {
    const showFailure = (event: Event) => setSyncFailure((event as CustomEvent<string>).detail);
    const clearFailure = () => setSyncFailure('');
    window.addEventListener('supabase-sync-error', showFailure);
    window.addEventListener('supabase-sync-success', clearFailure);
    return () => {
      window.removeEventListener('supabase-sync-error', showFailure);
      window.removeEventListener('supabase-sync-success', clearFailure);
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    let active = true;
    let unsubscribeRealtime = () => {};
    let refreshing = false;
    let refreshRequested = false;
    const applyRemote = async () => {
      if (!active || !navigator.onLine) return;
      refreshRequested = true;
      if (refreshing) return;
      refreshing = true;
      try {
        while (active && refreshRequested && navigator.onLine) {
          refreshRequested = false;
          await flushPendingSupabaseBackup();
          if (isOfflineSyncPending()) return;
          const version = localEditVersion.current;
          // List updates must not wait for catalog or template downloads.
          const [remote] = await Promise.all([loadListsFromSupabase(), loadCategoriesFromSupabase()]);
          if (!active) return;
          if (version !== localEditVersion.current || isOfflineSyncPending()) {
            refreshRequested = true;
            continue;
          }
          setLists(remote);
          saveLists(remote);
          if (remote.length && !remote.some(list => list.id === getStoredActiveListId())) {
            setActiveListId(remote[0].id);
            saveActiveListId(remote[0].id);
          }
          await Promise.all([loadItemConfigsFromSupabase(), loadTemplatesFromSupabase()]);
          if (active) setSyncFailure('');
        }
      } catch (error) {
        if (active) setSyncFailure(error instanceof Error ? error.message : 'Não foi possível atualizar os dados.');
      } finally {
        refreshing = false;
      }
    };
    const initialize = async () => {
      try {
        if (!navigator.onLine) {
          setSyncNotice('Modo offline: alterações salvas neste aparelho.');
          return;
        }
        await loadThemeFromSupabase(session.user.id);
        await flushPendingSupabaseBackup();
        const version = localEditVersion.current;
        await loadCategoriesFromSupabase();
        await loadItemConfigsFromSupabase();
        await loadTemplatesFromSupabase();
        const remote = await loadListsFromSupabase();
        if (!active || version !== localEditVersion.current || isOfflineSyncPending()) return;
        if (remote.length) {
          setLists(remote);
          saveLists(remote);
          setActiveListId(current => remote.some(list => list.id === current) ? current : remote[0].id);
        } else {
          const userPrefix = session.user.id;
          const storedLists = getStoredLists();
          const migratableLists = storedLists.filter(list => !list.ownerId || list.ownerId === userPrefix);
          const sourceLists = migratableLists.length
            ? migratableLists
            : INITIAL_LISTS;
          const claimed = sourceLists.map(list => {
            // A consulta remota confirmou que esta conta ainda não possui listas.
            // Gere IDs novos mesmo quando o armazenamento local diz que a lista já
            // pertence ao usuário: um ID antigo pode estar ocupado por um registro
            // invisível para esta sessão e o RLS bloquearia o upsert.
            const listId = `${userPrefix}-list-${crypto.randomUUID()}`;
            return ({
            ...list,
            id: listId,
            ownerId: userPrefix,
            accessRole: 'owner' as const,
            items: list.items.map(item => ({ ...item, id: `${userPrefix}-item-${crypto.randomUUID()}` })),
            travelEntries: list.travelEntries?.map(entry => ({ ...entry, id: `${userPrefix}-travel-${crypto.randomUUID()}` })),
          });
          });
          setLists(claimed);
          saveLists(claimed);
          if (claimed.length) { setActiveListId(claimed[0].id); saveActiveListId(claimed[0].id); }
          await backupAppData(claimed);
        }
        setSyncNotice('');
      } catch (error) {
        setSyncNotice(error instanceof Error ? error.message : 'Não foi possível sincronizar com o Supabase.');
      } finally {
        if (active) unsubscribeRealtime = subscribeToListChanges(() => { void applyRemote(); });
      }
    };
    const handleOnline = async () => {
      setSyncNotice('Conexão recuperada. Sincronizando alterações...');
      try {
        await flushPendingSupabaseBackup();
        await applyRemote();
        if (active) {
          setSyncNotice('');
        }
      } catch (error) {
        if (active) setSyncNotice(error instanceof Error ? error.message : 'A sincronização será tentada novamente.');
      }
    };
    const handleOffline = () => setSyncNotice('Modo offline: alterações salvas neste aparelho.');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    void initialize();
    return () => {
      active = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribeRealtime();
    };
  }, [session]);

  // SUPORTE AO BOTÃO VOLTAR DO CELULAR E TECLA ESC
  useEffect(() => {
    // Configura estado inicial do histórico
    if (typeof window !== 'undefined' && !window.history.state) {
      window.history.replaceState({ screen: activeTab }, '');
    }

    const handlePopState = () => {
      if (isNewListModalOpen) {
        setIsNewListModalOpen(false);
        return;
      }
      if (isProductPickerOpen) {
        setIsProductPickerOpen(false);
        return;
      }
      // Prioridade 1: se houver modal ou preview aberto, feche-o primeiro
      if (isItemModalOpen) {
        setIsItemModalOpen(false);
        return;
      }
      if (isListEditModalOpen) {
        setIsListEditModalOpen(false);
        return;
      }
      if (previewImage) {
        setPreviewImage(null);
        return;
      }
      if (listToDelete) {
        setListToDelete(null);
        return;
      }

      // Dentro de Configurações, primeiro volte para a lista de opções.
      if (activeTab === 'settings' && settingsSection !== 'home') {
        setSettingsSection('home');
        return;
      }

      // Prioridade 2: se estiver visualizando a lista ('shopping') ou estatísticas ('stats'), volta para 'lists'
      if (activeTab === 'shopping' || activeTab === 'stats' || activeTab === 'settings') {
        setActiveTab('lists');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat || document.querySelector('dialog[open]')) return;
      if (e.key === 'Escape') {
        if (isNewListModalOpen) {
          setIsNewListModalOpen(false);
          return;
        }
        if (isProductPickerOpen) {
          setIsProductPickerOpen(false);
          return;
        }
        if (isItemModalOpen) {
          setIsItemModalOpen(false);
          return;
        }
        if (isListEditModalOpen) {
          setIsListEditModalOpen(false);
          return;
        }
        if (previewImage) {
          setPreviewImage(null);
          return;
        }
        if (listToDelete) {
          setListToDelete(null);
          return;
        }

        if (activeTab === 'settings' && settingsSection !== 'home') {
          setSettingsSection('home');
          return;
        }

        // Se estiver no shopping, tecla ESC volta para a tela de listas
        if (activeTab === 'shopping' || activeTab === 'stats' || activeTab === 'settings') {
          setActiveTab('lists');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    activeTab,
    isNewListModalOpen,
    isProductPickerOpen,
    isItemModalOpen,
    isListEditModalOpen,
    previewImage,
    listToDelete,
    settingsSection,
  ]);

  // Save to localStorage when lists update
  const handleUpdateLists = (newLists: ShoppingList[]) => {
    localEditVersion.current += 1;
    setLists(newLists);
    saveLists(newLists);
    scheduleSupabaseBackup(newLists);
  };

  const activeList = lists.find(l => l.id === activeListId) || lists[0] || INITIAL_LISTS[0];

  const handleUpdateActiveList = (updated: ShoppingList) => {
    if (activeList.accessRole === 'viewer') {
      setSyncNotice('Esta lista foi compartilhada somente para visualização.');
      return;
    }
    updated.items.forEach(item => recordItemPrice(item, updated));
    const updatedLists = lists.map(l => (l.id === updated.id ? updated : l));
    handleUpdateLists(updatedLists);
  };

  const closePopups = () => {
    setIsNewListModalOpen(false);
    setIsProductPickerOpen(false);
    setIsItemModalOpen(false);
    setEditingItem(null);
    setIsListEditModalOpen(false);
    setListToDelete(null);
    setPreviewImage(null);
  };

  // Switch active list (empurra estado para histórico do celular)
  const handleSelectList = (id: string) => {
    closePopups();
    const selectedList = lists.find(list => list.id === id);
    setListTypeFilter(selectedList?.type || 'market');
    setActiveListId(id);
    saveActiveListId(id);
    setActiveTab('shopping');
    if (typeof window !== 'undefined') {
      window.history.pushState({ screen: 'shopping', listId: id }, '');
    }
  };

  const handleSelectTab = (tab: 'shopping' | 'lists' | 'stats' | 'settings') => {
    closePopups();
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      window.history.pushState({ screen: tab }, '');
    }
  };

  // Create new list
  const handleCreateList = (title: string, type: ListType = 'market', location?: string, targetBudget?: number) => {
    const newList: ShoppingList = {
      id: `${session?.user.id ? `${session.user.id}-` : ''}list-${Date.now()}`,
      title,
      type,
      marketName: type === 'market' ? location : undefined,
      destination: type === 'travel' ? location : undefined,
      targetBudget,
      items: [],
      travelEntries: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ownerId: session?.user.id,
      accessRole: session ? 'owner' : undefined,
    };
    const updated = [newList, ...lists];
    handleUpdateLists(updated);
    setActiveListId(newList.id);
    saveActiveListId(newList.id);
    setActiveTab('shopping');
    if (typeof window !== 'undefined') {
      window.history.pushState({ screen: 'shopping', listId: newList.id }, '');
    }
  };

  // Duplicate list
  const handleDuplicateList = (id: string) => {
    const target = lists.find(l => l.id === id);
    if (!target) return;

    const duplicated: ShoppingList = {
      ...target,
      id: `${session?.user.id ? `${session.user.id}-` : ''}list-${Date.now()}`,
      title: `${target.title} (Cópia)`,
      ownerId: session?.user.id,
      accessRole: session ? 'owner' : undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      items: target.items.map(i => ({
        ...i,
        id: `${session?.user.id ? `${session.user.id}-` : ''}item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        checked: false,
      })),
      travelEntries: target.travelEntries?.map(entry => ({
        ...entry,
        id: `${session?.user.id ? `${session.user.id}-` : ''}trip-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        done: false,
        paid: false,
      })),
    };

    const updated = [duplicated, ...lists];
    handleUpdateLists(updated);
    setActiveListId(duplicated.id);
    saveActiveListId(duplicated.id);
    setActiveTab('shopping');
    if (typeof window !== 'undefined') {
      window.history.pushState({ screen: 'shopping', listId: duplicated.id }, '');
    }
  };

  // EXCLUSÃO DE LISTAS AJUSTADA: funciona com qualquer número de listas sem travar em window.confirm
  const handleDeleteList = (id: string) => {
    const target = lists.find(list => list.id === id);
    if (target?.accessRole === 'viewer' || target?.accessRole === 'editor') {
      setSyncNotice('Somente o proprietário pode excluir uma lista compartilhada.');
      return;
    }
    const updated = lists.filter(l => l.id !== id);
    if (updated.length === 0) {
      // Se era a última lista, cria uma nova limpa imediatamente
      const freshList: ShoppingList = {
        id: `${session?.user.id ? `${session.user.id}-` : ''}list-${Date.now()}`,
        title: 'Nova Lista de Compras',
        type: 'market',
        items: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ownerId: session?.user.id,
        accessRole: session ? 'owner' : undefined,
      };
      handleUpdateLists([freshList]);
      setActiveListId(freshList.id);
      saveActiveListId(freshList.id);
    } else {
      handleUpdateLists(updated);
      if (activeListId === id) {
        setActiveListId(updated[0].id);
        saveActiveListId(updated[0].id);
      }
    }
    // Retorna para a tela de Minhas Listas
    setActiveTab('lists');
    void deleteListFromSupabase(id).catch(error => setSyncNotice(error instanceof Error ? error.message : 'Não foi possível excluir no servidor.'));
  };

  // Load template lists
  const handleLoadTemplate = (templateType: string) => {
    const storedTemplate = getTemplates().find(template => template.id === templateType);
    if (storedTemplate) {
      const now = Date.now();
      const newList: ShoppingList = {
        id: `${session?.user.id ? `${session.user.id}-` : ''}list-${now}`, title: storedTemplate.name, type: 'market', marketName: storedTemplate.marketName,
        targetBudget: storedTemplate.targetBudget,
        items: storedTemplate.items.map((item, index) => ({ ...item, id: `${session?.user.id ? `${session.user.id}-` : ''}tpl-${now}-${index}`, checked: false, previousPrice: undefined, createdAt: now - index })),
        createdAt: now, updatedAt: now,
        ownerId: session?.user.id, accessRole: session ? 'owner' : undefined,
      };
      handleUpdateLists([newList, ...lists]);
      setActiveListId(newList.id);
      saveActiveListId(newList.id);
      setActiveTab('shopping');
      window.history.pushState({ screen: 'shopping', listId: newList.id }, '');
      return;
    }
    let title = '';
    let marketName = '';
    let targetBudget = 0;
    let templateItems: GroceryItem[] = [];

    const now = Date.now();

    if (templateType === 'feira') {
      title = 'Feira Saudável da Semana';
      marketName = 'Hortifrúti da Vila';
      targetBudget = 85.0;
      const feiraPresets = CATALOG_PRESETS.filter(p => p.category === 'feira').slice(0, 7);
      templateItems = feiraPresets.map((p, idx) => ({
        id: `tpl-${now}-${idx}`,
        name: p.name,
        category: p.category,
        quantity: p.defaultUnit === 'kg' ? 1.0 : 1,
        unit: p.defaultUnit,
        price: p.defaultPrice,
        checked: false,
        imageUrl: p.imageUrl,
        createdAt: now - idx * 1000,
      }));
    } else if (templateType === 'churrasco') {
      title = 'Churrasco com a Galera';
      marketName = 'Empório de Carnes';
      targetBudget = 250.0;
      const churrascoNames = ['Picanha', 'Carne Moída', 'Cerveja', 'Pão', 'Suco de Laranja'];
      templateItems = churrascoNames.map((name, idx) => {
        const p = CATALOG_PRESETS.find(item => item.name === name) || CATALOG_PRESETS[0];
        return {
          id: `tpl-${now}-${idx}`,
          name: p.name,
          category: p.category,
          quantity: p.defaultUnit === 'kg' ? 1.5 : 2,
          unit: p.defaultUnit,
          price: p.defaultPrice,
          checked: false,
          imageUrl: p.imageUrl,
          createdAt: now - idx * 1000,
        };
      });
    } else if (templateType === 'basica') {
      title = 'Despensa do Mês';
      marketName = 'Supermercado Atacadista';
      targetBudget = 200.0;
      const basicaNames = ['Arroz', 'Feijão', 'Azeite', 'Café', 'Macarrão', 'Sabão em Pó', 'Detergente'];
      templateItems = basicaNames.map((name, idx) => {
        const p = CATALOG_PRESETS.find(item => item.name === name) || CATALOG_PRESETS[0];
        return {
          id: `tpl-${now}-${idx}`,
          name: p.name,
          category: p.category,
          quantity: 1,
          unit: p.defaultUnit,
          price: p.defaultPrice,
          checked: false,
          imageUrl: p.imageUrl,
          createdAt: now - idx * 1000,
        };
      });
    } else {
      title = 'Café da Manhã Completo';
      marketName = 'Padaria & Confeitaria';
      targetBudget = 60.0;
      const cafeNames = ['Pão', 'Pão de Forma', 'Manteiga', 'Queijo', 'Leite', 'Café'];
      templateItems = cafeNames.map((name, idx) => {
        const p = CATALOG_PRESETS.find(item => item.name === name) || CATALOG_PRESETS[0];
        return {
          id: `tpl-${now}-${idx}`,
          name: p.name,
          category: p.category,
          quantity: 1,
          unit: p.defaultUnit,
          price: p.defaultPrice,
          checked: false,
          imageUrl: p.imageUrl,
          createdAt: now - idx * 1000,
        };
      });
    }

    const newList: ShoppingList = {
      id: `${session?.user.id ? `${session.user.id}-` : ''}list-${now}`,
      title,
      type: 'market',
      marketName,
      targetBudget,
      items: templateItems,
      createdAt: now,
      updatedAt: now,
      ownerId: session?.user.id,
      accessRole: session ? 'owner' : undefined,
    };

    const updated = [newList, ...lists];
    handleUpdateLists(updated);
    setActiveListId(newList.id);
    saveActiveListId(newList.id);
    setActiveTab('shopping');
    if (typeof window !== 'undefined') {
      window.history.pushState({ screen: 'shopping', listId: newList.id }, '');
    }
  };

  // Add / Edit item handlers
  const handleOpenAddItem = (category?: CategoryId) => {
    setEditingItem(null);
    setDefaultCategoryForNewItem(category || 'feira');
    setIsItemModalOpen(true);
    if (typeof window !== 'undefined') {
      window.history.pushState({ modal: 'item' }, '');
    }
  };

  const handleOpenEditItem = (item: GroceryItem) => {
    setEditingItem(item);
    setIsItemModalOpen(true);
    if (typeof window !== 'undefined') {
      window.history.pushState({ modal: 'item' }, '');
    }
  };

  const handleSaveItem = (itemData: Omit<GroceryItem, 'id' | 'createdAt'> & { id?: string }) => {
    // Salva a configuração do item para uso em futuras listas
    saveItemConfig({
      name: itemData.name,
      unit: itemData.unit,
      category: itemData.category,
      imageUrl: itemData.imageUrl,
      defaultPrice: itemData.price > 0 ? itemData.price : undefined,
      notes: itemData.notes,
      updatedAt: Date.now(),
    });

    if (itemData.id) {
      // Edit existing
      const updatedItems = activeList.items.map(item =>
        item.id === itemData.id
          ? {
              ...item,
              ...itemData,
            }
          : item
      );
      handleUpdateActiveList({
        ...activeList,
        items: updatedItems,
        updatedAt: Date.now(),
      });
    } else {
      // Create new
      const newItem: GroceryItem = {
        ...itemData,
        id: `${session?.user.id ? `${session.user.id}-` : ''}item-${Date.now()}`,
        previousPrice: getLatestPrice(itemData.name, lists, activeList.id),
        createdAt: Date.now(),
      };
      handleUpdateActiveList({
        ...activeList,
        items: [newItem, ...activeList.items],
        updatedAt: Date.now(),
      });
    }
  };

  // Salvar configurações gerais da lista
  const handleSaveListSettings = (
    targetBudget: number | undefined,
    location: string | undefined,
    title: string
  ) => {
    handleUpdateActiveList({
      ...activeList,
      targetBudget,
      marketName: activeList.type === 'travel' ? activeList.marketName : location,
      destination: activeList.type === 'travel' ? location : activeList.destination,
      title,
      updatedAt: Date.now(),
    });
  };

  // Desmarcar todos os itens da lista atual
  const handleUncheckAll = () => {
    const updatedItems = activeList.items.map(i => ({ ...i, checked: false }));
    handleUpdateActiveList({ ...activeList, items: updatedItems, updatedAt: Date.now() });
  };

  // Limpar itens do carrinho da lista atual
  const handleClearChecked = () => {
    const updatedItems = activeList.items.filter(i => !i.checked);
    handleUpdateActiveList({ ...activeList, items: updatedItems, updatedAt: Date.now() });
  };

  if (isSupabaseConfigured() && !authReady) return <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center"><div className="w-9 h-9 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (isSupabaseConfigured() && !session) return <AuthView />;

  return (
    <div data-list-type={activeTab === 'settings' ? undefined : activeTab === 'lists' ? listTypeFilter : activeList.type || 'market'} className="min-h-screen bg-[#f8fafc] text-[#0f172a] flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onBackFromList={() => {
          if (isProductPickerOpen) {
            setIsProductPickerOpen(false);
            window.history.replaceState({ screen: 'shopping', listId: activeList.id }, '');
          } else {
            setListTypeFilter(activeList.type || 'market');
            handleSelectTab('lists');
          }
        }}
        onNewList={() => {
          closePopups();
          setActiveTab('lists');
          setIsNewListModalOpen(true);
          window.history.pushState({ modal: 'newList' }, '');
        }}
        onOpenSettings={() => {
          setSettingsSection('home');
          handleSelectTab('settings');
        }}
        onBackFromSettings={() => {
          if (settingsSection !== 'home') {
            window.history.back();
            return;
          }
          handleSelectTab('lists');
        }}
        listTitle={activeList?.title}
        listType={activeTab === 'lists' ? listTypeFilter : activeList.type || 'market'}
        itemCount={activeList.type === 'travel' ? (activeList.travelEntries?.length || 0) : (activeList.items?.length || 0)}
        onOpenListEdit={() => {
          setIsListEditModalOpen(true);
          if (typeof window !== 'undefined') {
            window.history.pushState({ modal: 'listEdit' }, '');
          }
        }}
        onDuplicateList={() => handleDuplicateList(activeList.id)}
        onRequestDeleteList={() => setListToDelete(activeList)}
      />
      {(syncFailure || syncNotice) && <div role={syncFailure ? 'alert' : 'status'} className={`fixed top-16 left-1/2 z-40 flex w-[min(90vw,36rem)] -translate-x-1/2 items-start gap-3 rounded-xl border px-4 py-2 text-xs font-bold shadow-lg ${syncFailure ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
        <span className="min-w-0 flex-1 break-words">{syncFailure ? `Falha na sincronização: ${syncFailure}` : syncNotice}</span>
        <button type="button" aria-label="Fechar aviso" onClick={() => { setSyncFailure(''); setSyncNotice(''); }} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-lg hover:bg-black/5">×</button>
      </div>}

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'shopping' && activeList.type === 'travel' && (
          <TravelView key={activeList.id} list={activeList} onUpdateList={handleUpdateActiveList} />
        )}
        {(activeTab === 'shopping' || activeTab === 'stats') && activeList.type !== 'travel' && (
          <ShoppingView
            key={activeList.id}
            list={activeList}
            lists={lists}
            onUpdateList={handleUpdateActiveList}
            isProductPickerOpen={isProductPickerOpen}
            onOpenProductPicker={() => {
              setIsProductPickerOpen(true);
              window.history.pushState({ screen: 'productPicker', listId: activeList.id }, '');
            }}
            onCloseProductPicker={() => {
              setIsProductPickerOpen(false);
              window.history.replaceState({ screen: 'shopping', listId: activeList.id }, '');
            }}
            onOpenEditItemModal={handleOpenEditItem}
            onOpenBudgetModal={() => {
              setIsListEditModalOpen(true);
              if (typeof window !== 'undefined') {
                window.history.pushState({ modal: 'listEdit' }, '');
              }
            }}
            onOpenImagePreview={(url, name, category) => {
              setPreviewImage({ url, name, category });
              if (typeof window !== 'undefined') {
                window.history.pushState({ modal: 'preview' }, '');
              }
            }}
            onSwitchToLists={() => handleSelectTab('lists')}
            onOpenSummary={() => handleSelectTab('stats')}
            onCloseSummary={() => handleSelectTab('shopping')}
            isSummary={activeTab === 'stats'}
          />
        )}

        {activeTab === 'lists' && (
          <ListsManager
            key={listTypeFilter}
            lists={lists}
            isNewModalOpen={isNewListModalOpen}
            onCloseNewModal={() => setIsNewListModalOpen(false)}
            onSelectList={handleSelectList}
            onCreateList={handleCreateList}
            onDuplicateList={handleDuplicateList}
            onDeleteList={handleDeleteList}
            onEditList={id => {
              setActiveListId(id);
              saveActiveListId(id);
              setIsListEditModalOpen(true);
              if (typeof window !== 'undefined') {
                window.history.pushState({ modal: 'listEdit' }, '');
              }
            }}
            onLoadTemplate={handleLoadTemplate}
            onOpenNewModal={() => {
              setIsNewListModalOpen(true);
              if (typeof window !== 'undefined') {
                window.history.pushState({ modal: 'newList' }, '');
              }
            }}
            listFilter={listTypeFilter}
            onFilterChange={filter => { closePopups(); setListTypeFilter(filter); }}
          />
        )}

        {activeTab === 'settings' && <SettingsView onInstallApp={installPrompt ? installApp : undefined} userEmail={session?.user.email} onSignOut={() => { void signOut(); }} section={settingsSection} onSectionChange={section => {
          setSettingsSection(section);
          if (section !== 'home' && typeof window !== 'undefined') {
            window.history.pushState({ screen: 'settings', settingsSection: section }, '');
          }
        }} />}

      </main>

      {/* Modals */}
      <ItemModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        onSave={handleSaveItem}
        initialItem={editingItem}
        defaultCategory={defaultCategoryForNewItem}
      />

      {/* Popup de Edição da Lista Atual Selecionada (acionado pelo ícone de 3 pontos) */}
      <ListEditModal
        isOpen={isListEditModalOpen}
        onClose={() => setIsListEditModalOpen(false)}
        list={activeList}
        onSave={handleSaveListSettings}
        onUncheckAll={activeList.type === 'travel' ? undefined : handleUncheckAll}
        onClearChecked={activeList.type === 'travel' ? undefined : handleClearChecked}
      />

      <ImagePreviewModal
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage?.url}
        itemName={previewImage?.name || ''}
        category={previewImage?.category || 'feira'}
      />

      {/* Modal de Confirmação Segura de Exclusão (sem window.confirm) */}
      <DeleteConfirmModal
        isOpen={!!listToDelete}
        onClose={() => setListToDelete(null)}
        onConfirm={() => {
          if (listToDelete) {
            handleDeleteList(listToDelete.id);
            setListToDelete(null);
          }
        }}
        title={listToDelete?.title || ''}
        itemCount={listToDelete?.type === 'travel' ? (listToDelete.travelEntries?.length || 0) : (listToDelete?.items?.length || 0)}
        listType={listToDelete?.type || 'market'}
      />
    </div>
  );
}

export default function Home() {
  const isMounted = useIsMounted();

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-9 h-9 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-500">Carregando listas de compras...</span>
        </div>
      </div>
    );
  }

  return <ShoppingApp />;
}

