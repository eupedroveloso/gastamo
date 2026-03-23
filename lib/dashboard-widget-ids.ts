export type DashboardWidgetId =
  | "budget_column"
  | "gastos_periodo"
  | "divisao_orcamento"
  | "gasto_pagamento"
  | "limite_categoria";

export const DASHBOARD_WIDGET_ORDER: DashboardWidgetId[] = [
  "budget_column",
  "gastos_periodo",
  "divisao_orcamento",
  "gasto_pagamento",
  "limite_categoria",
];
