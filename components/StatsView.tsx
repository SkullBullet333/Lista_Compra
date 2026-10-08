'use client';

import React from 'react';
import { PieChart, TrendingUp, CheckCircle2, Clock, Wallet, ShoppingBag } from 'lucide-react';
import { ShoppingList, CATEGORIES, CategoryId } from '@/types/grocery';
import { calculateListTotals, formatCurrency } from '@/lib/storage';

interface StatsViewProps {
  list: ShoppingList;
  onSwitchToShopping: () => void;
}

export function StatsView({ list, onSwitchToShopping }: StatsViewProps) {
  const totals = calculateListTotals(list.items);

  // Group spending by category
  const categoryBreakdown = (Object.keys(CATEGORIES) as CategoryId[]).map(catKey => {
    const cat = CATEGORIES[catKey];
    const catItems = list.items.filter(i => i.category === catKey);
    const count = catItems.length;
    const total = catItems.reduce((acc, item) => acc + item.quantity * item.price, 0);
    const inCartTotal = catItems
      .filter(i => i.checked)
      .reduce((acc, item) => acc + item.quantity * item.price, 0);

    return {
      category: catKey,
      label: cat.label,
      color: cat.color,
      bgColor: cat.bgColor,
      count,
      total,
      inCartTotal,
      percentage: totals.totalEstimated > 0 ? (total / totals.totalEstimated) * 100 : 0,
    };
  }).filter(c => c.count > 0).sort((a, b) => b.total - a.total);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-28">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Resumo Financeiro & Totais
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Lista: <strong className="text-slate-800">{list.title}</strong>
        </p>
      </div>

      {/* Top 3 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        {/* Total Estimado */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Estimado</span>
            <Wallet size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
            {formatCurrency(totals.totalEstimated)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {totals.itemCount} itens planejados
          </span>
        </div>

        {/* No Carrinho */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">No Carrinho</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 tabular-nums">
            {formatCurrency(totals.totalInCart)}
          </div>
          <span className="text-[11px] text-emerald-800 font-semibold mt-1 block">
            {totals.checkedCount} itens comprados ({totals.percentDone}%)
          </span>
        </div>

        {/* Pendente */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Pendente</span>
            <Clock size={16} className="text-slate-400" />
          </div>
          <div className="text-2xl font-extrabold text-slate-600 tabular-nums">
            {formatCurrency(totals.totalPending)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {totals.pendingCount} itens a comprar
          </span>
        </div>
      </div>

      {/* Spending Breakdown by Category */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs mb-6">
        <h2 className="text-sm font-extrabold text-slate-900 mb-4 flex items-center gap-2">
          <PieChart size={17} className="text-emerald-700" />
          <span>Distribuição de Gastos por Categoria</span>
        </h2>

        {categoryBreakdown.length === 0 ? (
          <p className="text-xs text-slate-400">Nenhum item com preço cadastrado nesta lista.</p>
        ) : (
          <div className="space-y-4">
            {categoryBreakdown.map(cat => (
              <div key={cat.category} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="font-bold text-slate-800">{cat.label}</span>
                    <span className="text-slate-400 font-medium">({cat.count} itens)</span>
                  </div>
                  <div className="flex items-center gap-2 font-bold tabular-nums">
                    <span className="text-slate-900">{formatCurrency(cat.total)}</span>
                    <span className="text-slate-400 text-[11px]">
                      ({cat.percentage.toFixed(0)}%)
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.max(4, cat.percentage)}%`,
                      backgroundColor: cat.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <button
          onClick={onSwitchToShopping}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-2"
        >
          <ShoppingBag size={15} />
          <span>Voltar para Lista de Compras</span>
        </button>
      </div>
    </div>
  );
}
