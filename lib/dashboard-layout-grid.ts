/**
 * Layout fixo do dashboard: grelha de 12 colunas × linhas de altura base (CSS Grid).
 */

import type { DashboardWidgetId } from "./dashboard-widget-ids";

export type DashboardLayoutItem = {
  id: DashboardWidgetId;
  x: number;
  y: number;
  w: number;
  h: number;
  chartVariant?: string;
};

/**
 * Faixa inferior: três cards com a mesma largura (flex 1 1 0 dentro da célula).
 * Ordem: divisão do orçamento | gasto por pagamento | limite por categoria.
 */
export const DASHBOARD_BOTTOM_ROW = {
  x: 4,
  y: 6,
  w: 8,
  h: 6,
  ids: ["divisao_orcamento", "gasto_pagamento", "limite_categoria"] as const satisfies readonly DashboardWidgetId[],
};

/** Posições padrão (x,y em células; w,h em spans). A faixa inferior é `DASHBOARD_BOTTOM_ROW`. */
export const DASHBOARD_GRID_DEFAULT_LAYOUT: DashboardLayoutItem[] = [
  { id: "budget_column", x: 0, y: 0, w: 4, h: 12 },
  { id: "gastos_periodo", x: 4, y: 0, w: 8, h: 6 },
];
