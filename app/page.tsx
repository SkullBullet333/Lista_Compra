'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { ShoppingView } from '@/components/ShoppingView';
import { ListsManager } from '@/components/ListsManager';
import { StatsView } from '@/components/StatsView';
import { ItemModal } from '@/components/ItemModal';
import { ListEditModal } from '@/components/ListEditModal';
import { ShareModal } from '@/components/ShareModal';
import { ImagePreviewModal } from '@/components/ImagePreviewModal';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { ShoppingList, GroceryItem, CategoryId } from '@/types/grocery';
import {
  getStoredLists,
  saveLists,
  getStoredActiveListId,
  saveActiveListId,
  INITIAL_LISTS,
  saveItemConfig,
} from '@/lib/storage';
import { CATALOG_PRESETS } from '@/lib/catalog';

const emptySubscribe = () => () => {};

function useIsMounted() {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

function ShoppingApp() {
  const [lists, setLists] = useState<ShoppingList[]>(() => getStoredLists());
  const [activeListId, setActiveListId] = useState<string>(() => getStoredActiveListId());
  const [activeTab, setActiveTab] = useState<'shopping' | 'lists' | 'stats'>('shopping');

  // Modals state
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GroceryItem | null>(null);
  const [defaultCategoryForNewItem, setDefaultCategoryForNewItem] = useState<CategoryId>('feira');

  const [isListEditModalOpen, setIsListEditModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [listToDelete, setListToDelete] = useState<ShoppingList | null>(null);

  const [previewImage, setPreviewImage] = useState<{
    url: string;
    name: string;
    category: CategoryId;
  } | null>(null);

  // SUPORTE AO BOTÃO VOLTAR DO CELULAR E TECLA ESC
  useEffect(() => {
    // Configura estado inicial do histórico
    if (typeof window !== 'undefined' && !window.history.state) {
      window.history.replaceState({ screen: activeTab }, '');
    }

    const handlePopState = () => {
      // Prioridade 1: se houver modal ou preview aberto, feche-o primeiro
      if (isItemModalOpen) {
        setIsItemModalOpen(false);
        return;
      }
      if (isListEditModalOpen) {
        setIsListEditModalOpen(false);
        return;
      }
      if (isShareModalOpen) {
        setIsShareModalOpen(false);
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

      // Prioridade 2: se estiver visualizando a lista ('shopping') ou estatísticas ('stats'), volta para 'lists'
      if (activeTab === 'shopping' || activeTab === 'stats') {
        setActiveTab('lists');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isItemModalOpen) {
          setIsItemModalOpen(false);
          return;
        }
        if (isListEditModalOpen) {
          setIsListEditModalOpen(false);
          return;
        }
        if (isShareModalOpen) {
          setIsShareModalOpen(false);
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

        // Se estiver no shopping, tecla ESC volta para a tela de listas
        if (activeTab === 'shopping' || activeTab === 'stats') {
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
    isItemModalOpen,
    isListEditModalOpen,
    isShareModalOpen,
    previewImage,
    listToDelete,
  ]);

  // Save to localStorage when lists update
  const handleUpdateLists = (newLists: ShoppingList[]) => {
    setLists(newLists);
    saveLists(newLists);
  };

  const activeList = lists.find(l => l.id === activeListId) || lists[0] || INITIAL_LISTS[0];

  const handleUpdateActiveList = (updated: ShoppingList) => {
    const updatedLists = lists.map(l => (l.id === updated.id ? updated : l));
    handleUpdateLists(updatedLists);
  };

  // Switch active list (empurra estado para histórico do celular)
  const handleSelectList = (id: string) => {
    setActiveListId(id);
    saveActiveListId(id);
    setActiveTab('shopping');
    if (typeof window !== 'undefined') {
      window.history.pushState({ screen: 'shopping', listId: id }, '');
    }
  };

  const handleSelectTab = (tab: 'shopping' | 'lists' | 'stats') => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      window.history.pushState({ screen: tab }, '');
    }
  };

  // Create new list
  const handleCreateList = (title: string, marketName?: string, targetBudget?: number) => {
    const newList: ShoppingList = {
      id: `list-${Date.now()}`,
      title,
      marketName,
      targetBudget,
      items: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
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
      id: `list-${Date.now()}`,
      title: `${target.title} (Cópia)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      items: target.items.map(i => ({
        ...i,
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        checked: false,
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
    const updated = lists.filter(l => l.id !== id);
    if (updated.length === 0) {
      // Se era a última lista, cria uma nova limpa imediatamente
      const freshList: ShoppingList = {
        id: `list-${Date.now()}`,
        title: 'Nova Lista de Compras',
        items: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
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
  };

  // Load template lists
  const handleLoadTemplate = (templateType: 'churrasco' | 'feira' | 'basica' | 'cafe') => {
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
      const churrascoNames = ['Picanha Bovina', 'Carne Moída Patinho', 'Cerveja Puro Malte Lata', 'Pão Francês', 'Suco de Laranja Integral 900ml'];
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
      const basicaNames = ['Arroz Branco 5kg', 'Feijão Carioca 1kg', 'Azeite Extra Virgem 500ml', 'Café Torrado e Moído 500g', 'Macarrão Espaguete 500g', 'Sabão em Pó 1.6kg', 'Detergente Neutro 500ml'];
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
      const cafeNames = ['Pão Francês', 'Pão de Forma Integral', 'Manteiga com Sal 200g', 'Queijo Mussarela Fatiado', 'Leite Integral 1L', 'Café Torrado e Moído 500g'];
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
      id: `list-${now}`,
      title,
      marketName,
      targetBudget,
      items: templateItems,
      createdAt: now,
      updatedAt: now,
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
        id: `item-${Date.now()}`,
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
    marketName: string | undefined,
    title: string
  ) => {
    handleUpdateActiveList({
      ...activeList,
      targetBudget,
      marketName,
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

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onNewList={() => handleCreateList('Nova Lista de Compras')}
        listTitle={activeList?.title}
        itemCount={activeList?.items?.length || 0}
        onOpenListEdit={() => {
          setIsListEditModalOpen(true);
          if (typeof window !== 'undefined') {
            window.history.pushState({ modal: 'listEdit' }, '');
          }
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'shopping' && (
          <ShoppingView
            list={activeList}
            onUpdateList={handleUpdateActiveList}
            onOpenAddItemModal={handleOpenAddItem}
            onOpenEditItemModal={handleOpenEditItem}
            onOpenShareModal={() => {
              setIsShareModalOpen(true);
              if (typeof window !== 'undefined') {
                window.history.pushState({ modal: 'share' }, '');
              }
            }}
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
          />
        )}

        {activeTab === 'lists' && (
          <ListsManager
            lists={lists}
            activeListId={activeListId}
            onSelectList={handleSelectList}
            onCreateList={handleCreateList}
            onDuplicateList={handleDuplicateList}
            onDeleteList={handleDeleteList}
            onLoadTemplate={handleLoadTemplate}
          />
        )}

        {activeTab === 'stats' && (
          <StatsView
            list={activeList}
            onSwitchToShopping={() => handleSelectTab('shopping')}
          />
        )}
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
        onShare={() => {
          setIsListEditModalOpen(false);
          setIsShareModalOpen(true);
        }}
        onUncheckAll={handleUncheckAll}
        onClearChecked={handleClearChecked}
        onRequestDelete={() => {
          setIsListEditModalOpen(false);
          setListToDelete(activeList);
        }}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        list={activeList}
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
        itemCount={listToDelete?.items?.length || 0}
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

