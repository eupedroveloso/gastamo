"use client";

import { useState, useMemo, useActionState, useEffect } from "react";
import {
  FunnelDollarIcon,
  SearchIcon,
  PlusIcon,
  PencilIcon,
  TrashCanIcon,
  CloseIcon,
  ChevronDownIcon,
  UploadIcon,
} from "./icons";
import { createExpense, updateExpense, deleteExpense } from "@/lib/actions/expenses";
import { ExpenseImportPanel } from "./expense-import-panel";
import { Calendar, CalendarRange } from "./calendar";

function getCurrentMonthRange(): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const lastDay = new Date(y, m + 1, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    start: `${y}-${pad(m + 1)}-01`,
    end: `${y}-${pad(m + 1)}-${pad(lastDay)}`,
  };
}

type Expense = {
  id: string;
  name: string;
  amount: number;
  date: Date;
  type: string;
  pending: boolean;
  totalInstallments: number | null;
  currentInstallment: number | null;
  invoiceId: string | null;
  category: { id: string; name: string } | null;
  responsible: { id: string; name: string };
  card: { id: string; name: string } | null;
};

interface Props {
  expenses: Expense[];
  categories: { id: string; name: string }[];
  cards: { id: string; name: string }[];
  members: { userId: string; name: string }[];
}

const EXPENSE_TYPES = [
  { value: "avulsa", label: "Avulsa" },
  { value: "fixa", label: "Fixa" },
  { value: "parcelada", label: "Parcelada" },
];

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  avulsa: { bg: "#F5F5F5", text: "#525252" },
  fixa: { bg: "#D6F5E3", text: "#0F6B38" },
  parcelada: { bg: "#EFF6FF", text: "#1A56DB" },
};

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

const fieldStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  background: "var(--color-bg-default)",
  border: "1px solid var(--color-border-default)",
  borderRadius: "16px",
  padding: "8px 12px",
} as const;

const inputStyle = {
  flex: 1,
  border: "none",
  outline: "none",
  background: "transparent",
  fontFamily: "inherit",
  fontWeight: 400,
  fontSize: 13,
  lineHeight: 1.5,
  color: "var(--color-fg-default)",
} as const;

const selectResetStyle = {
  WebkitAppearance: "none" as const,
  appearance: "none" as const,
};

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <label style={{ fontWeight: 600, fontSize: 12, color: "var(--color-fg-muted)", lineHeight: 1.5 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function ExpenseForm({
  expense,
  categories,
  cards,
  members,
  onClose,
  action,
  isPending,
  state,
}: {
  expense?: Expense;
  categories: { id: string; name: string }[];
  cards: { id: string; name: string }[];
  members: { userId: string; name: string }[];
  onClose: () => void;
  action: (payload: FormData) => void;
  isPending: boolean;
  state: { error?: string; success?: boolean } | null;
}) {
  const [selectedType, setSelectedType] = useState(expense?.type ?? "avulsa");
  const [installments, setInstallments] = useState(String(expense?.totalInstallments ?? "12"));
  const [currentInst, setCurrentInst] = useState(String(expense?.currentInstallment ?? "1"));
  const [selectedDate, setSelectedDate] = useState(
    expense ? new Date(expense.date).toISOString().split("T")[0] : ""
  );

  const defaultAmount = expense
    ? expense.amount.toFixed(2).replace(".", ",")
    : "0,00";

  return (
    <form
      action={action}
      style={{ display: "flex", flexDirection: "column", height: "100%" }}
    >
      {expense && <input type="hidden" name="expenseId" value={expense.id} />}
      <input type="hidden" name="date" value={selectedDate} />

      <div
        style={{
          padding: "32px",
          display: "flex",
          flexDirection: "column",
          gap: "32px",
          flex: 1,
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 400, fontSize: 16, color: "var(--color-fg-default)", lineHeight: 1.5 }}>
            {expense ? "Editar Gasto" : "Adicionar Gasto"}
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 48,
              height: 32,
              background: "var(--color-bg-default)",
              border: "1px solid var(--color-border-default)",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <CloseIcon size={16} color="var(--color-fg-default)" />
          </button>
        </div>

        {/* Amount */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ fontWeight: 700, fontSize: 40, lineHeight: 1.2, letterSpacing: "-0.8px", color: "var(--color-bg-brand-strong)" }}>
            R$
          </span>
          <input
            name="amount"
            defaultValue={defaultAmount}
            placeholder="0,00"
            style={{
              fontWeight: 700, fontSize: 40, lineHeight: 1.2, letterSpacing: "-0.8px",
              color: "var(--color-bg-brand-strong)", border: "none", outline: "none",
              background: "transparent", fontFamily: "inherit", width: "100%",
            }}
          />
        </div>

        {state?.error && (
          <p style={{ fontSize: 13, color: "#f87171", background: "rgba(248,113,113,0.1)", padding: "8px 12px", borderRadius: "8px" }}>
            {state.error}
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <FormField label="Nome do Gasto">
            <div style={fieldStyle}>
              <input name="name" placeholder="Ex: Café da manhã" required defaultValue={expense?.name} style={inputStyle} />
            </div>
          </FormField>

          <FormField label="Tipo de Gasto">
            <div style={{ display: "flex", gap: "8px" }}>
              {EXPENSE_TYPES.map((t) => {
                const isSelected = selectedType === t.value;
                return (
                  <label
                    key={t.value}
                    onClick={() => setSelectedType(t.value)}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "8px 12px",
                      border: isSelected
                        ? "1px solid var(--color-bg-brand-default)"
                        : "1px solid var(--color-border-default)",
                      borderRadius: "16px",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: isSelected ? 600 : 400,
                      color: isSelected ? "var(--color-bg-brand-default)" : "var(--color-fg-subtle)",
                      lineHeight: 1.5,
                      userSelect: "none",
                      background: isSelected ? "rgba(26,173,99,0.08)" : "transparent",
                      transition: "all 0.15s",
                    }}
                  >
                    <input type="radio" name="type" value={t.value} checked={isSelected} onChange={() => setSelectedType(t.value)} style={{ display: "none" }} />
                    {t.label}
                  </label>
                );
              })}
            </div>
          </FormField>

          {/* Installment fields */}
          {selectedType === "parcelada" && (
            <div style={{ display: "flex", gap: "8px" }}>
              <FormField label="Total de Parcelas">
                <div style={fieldStyle}>
                  <select
                    name="totalInstallments"
                    value={installments}
                    onChange={(e) => {
                      setInstallments(e.target.value);
                      if (parseInt(currentInst) > parseInt(e.target.value)) {
                        setCurrentInst(e.target.value);
                      }
                    }}
                    style={{ ...inputStyle, cursor: "pointer", ...selectResetStyle }}
                  >
                    {Array.from({ length: 48 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n}x</option>
                    ))}
                  </select>
                  <ChevronDownIcon size={16} color="var(--color-fg-subtle)" />
                </div>
              </FormField>
              <FormField label="Parcela Atual">
                <div style={fieldStyle}>
                  <select
                    name="currentInstallment"
                    value={currentInst}
                    onChange={(e) => setCurrentInst(e.target.value)}
                    style={{ ...inputStyle, cursor: "pointer", ...selectResetStyle }}
                  >
                    {Array.from({ length: parseInt(installments) || 1 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n}/{installments}</option>
                    ))}
                  </select>
                  <ChevronDownIcon size={16} color="var(--color-fg-subtle)" />
                </div>
              </FormField>
            </div>
          )}

          <FormField label="Identificador na Fatura">
            <div style={fieldStyle}>
              <input name="invoiceId" placeholder="Ex: Mr.Soluctions32" defaultValue={expense?.invoiceId ?? ""} style={inputStyle} />
            </div>
          </FormField>

          <FormField label="Data do Gasto">
            <Calendar
              value={selectedDate}
              onChange={setSelectedDate}
              placeholder="Selecione a data"
            />
          </FormField>

          <FormField label="Categoria">
            <div style={fieldStyle}>
              <select name="categoryId" defaultValue={expense?.category?.id ?? ""} style={{ ...inputStyle, color: "var(--color-fg-subtle)", cursor: "pointer", ...selectResetStyle }}>
                <option value="">Selecione uma Categoria</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDownIcon size={16} color="var(--color-fg-subtle)" />
            </div>
          </FormField>

          <FormField label="Responsável">
            <div style={fieldStyle}>
              <select name="responsibleId" defaultValue={expense?.responsible?.id ?? ""} required style={{ ...inputStyle, color: "var(--color-fg-subtle)", cursor: "pointer", ...selectResetStyle }}>
                <option value="">Selecione quem fez o gasto</option>
                {members.map((m) => <option key={m.userId} value={m.userId}>{m.name}</option>)}
              </select>
              <ChevronDownIcon size={16} color="var(--color-fg-subtle)" />
            </div>
          </FormField>

          <FormField label="Cartão Utilizado">
            <div style={fieldStyle}>
              <select name="cardId" defaultValue={expense?.card?.id ?? ""} style={{ ...inputStyle, color: "var(--color-fg-subtle)", cursor: "pointer", ...selectResetStyle }}>
                <option value="">Selecione o Cartão</option>
                {cards.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDownIcon size={16} color="var(--color-fg-subtle)" />
            </div>
          </FormField>
        </div>
      </div>

      <div style={{ padding: "16px 32px 32px", display: "flex", flexDirection: "column", gap: "8px" }}>
        <button
          type="submit"
          disabled={isPending}
          style={{
            width: "100%", padding: "12px 16px",
            background: isPending ? "var(--color-bg-brand-strong)" : "var(--color-bg-brand-default)",
            border: "none", borderRadius: "16px", fontFamily: "inherit", fontWeight: 600,
            fontSize: 16, color: "var(--color-fg-inverse)", cursor: isPending ? "not-allowed" : "pointer", lineHeight: 1.5,
          }}
        >
          {isPending ? "Salvando..." : expense ? "Salvar Alterações" : "Adicionar"}
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%", padding: "8px 16px", background: "transparent", border: "none",
            fontFamily: "inherit", fontWeight: 600, fontSize: 14, color: "var(--color-fg-subtle)",
            cursor: "pointer", lineHeight: 1.5,
          }}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function SlidePanel({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 40 }} />
      <div
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: 410, zIndex: 50,
          background: "var(--color-bg-default)", borderLeft: "1px solid var(--color-border-muted)",
          borderRadius: "32px 0 0 32px", animation: "slideIn 0.25s ease-out",
        }}
      >
        {children}
      </div>
      <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </>
  );
}

// Column config matching Figma
const COL_TEMPLATE = "minmax(150px, 2fr) 112px 112px 136px 112px 112px 112px 68px";

export function TransactionsClient({ expenses, categories, cards, members }: Props) {
  const [search, setSearch] = useState("");
  const defaultRange = getCurrentMonthRange();
  const [dateStart, setDateStart] = useState(defaultRange.start);
  const [dateEnd, setDateEnd] = useState(defaultRange.end);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterType, setFilterType] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterCard, setFilterCard] = useState("");
  const [filterMember, setFilterMember] = useState("");

  const [panelMode, setPanelMode] = useState<"add" | "edit" | "import" | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const [createState, createAction, isCreating] = useActionState(createExpense, null);
  const [updateState, updateAction, isUpdating] = useActionState(updateExpense, null);

  useEffect(() => {
    if (createState?.success) setPanelMode(null);
  }, [createState]);

  useEffect(() => {
    if (updateState?.success) { setPanelMode(null); setEditingExpense(null); }
  }, [updateState]);

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (dateStart || dateEnd) {
        const expDate = new Date(e.date).toISOString().split("T")[0];
        if (dateStart && expDate < dateStart) return false;
        if (dateEnd && expDate > dateEnd) return false;
      }
      if (filterType && e.type !== filterType) return false;
      if (filterCategory && e.category?.id !== filterCategory) return false;
      if (filterCard && e.card?.id !== filterCard) return false;
      if (filterMember && e.responsible.id !== filterMember) return false;
      return true;
    });
  }, [expenses, search, dateStart, dateEnd, filterType, filterCategory, filterCard, filterMember]);

  const hasActiveFilters = filterType || filterCategory || filterCard || filterMember;
  const activeFilterCount = [filterType, filterCategory, filterCard, filterMember].filter(Boolean).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, height: "100%" }}>
      {/* ── Header bar ── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          background: "#FFFFFF",
          border: "1px solid #F5F5F5",
          borderRadius: 32,
          padding: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            padding: "8px 0 8px 16px",
          }}
        >
          <span style={{ fontWeight: 400, fontSize: 16, color: "#0A0A0A", whiteSpace: "nowrap", lineHeight: 1.5 }}>
            Lista de Gastos
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Filtrar */}
            <button
              type="button"
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "8px 16px",
                background: hasActiveFilters ? "#0F8F4E" : "#F5F5F5",
                border: "none", borderRadius: 16, cursor: "pointer",
                fontFamily: "inherit", fontWeight: 600, fontSize: 14,
                color: hasActiveFilters ? "#FFFFFF" : "#0A0A0A", whiteSpace: "nowrap", lineHeight: 1.5,
              }}
            >
              <FunnelDollarIcon size={16} color={hasActiveFilters ? "#FFFFFF" : "#0A0A0A"} />
              Filtrar{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </button>

            {/* Date range filter */}
            <CalendarRange
              startDate={dateStart}
              endDate={dateEnd}
              onChange={(s, e) => { setDateStart(s); setDateEnd(e); }}
              placeholder="Período"
            />

            {/* Search */}
            <div
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "#FFFFFF", border: "1px solid #E5E5E5",
                borderRadius: 16, padding: "8px 12px", width: 196,
              }}
            >
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ex: Café da manhã"
                style={{
                  flex: 1, border: "none", outline: "none", background: "transparent",
                  fontFamily: "inherit", fontSize: 13, fontWeight: 400,
                  color: "#0A0A0A", lineHeight: 1.5, minWidth: 0,
                }}
              />
              <SearchIcon size={16} color="#A3A3A3" />
            </div>

            {/* Importar */}
            <button
              type="button"
              onClick={() => setPanelMode("import")}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "8px 16px",
                background: "var(--color-bg-brand-muted)", border: "1px solid var(--color-bg-brand-default)",
                borderRadius: 16, cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
                fontSize: 14, color: "var(--color-fg-brand)", whiteSpace: "nowrap", lineHeight: 1.5,
              }}
            >
              <UploadIcon size={16} color="var(--color-fg-brand)" />
              Importar
            </button>

            {/* Novo Gasto */}
            <button
              type="button"
              onClick={() => { setEditingExpense(null); setPanelMode("add"); }}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "8px 16px",
                background: "#0F8F4E", border: "none", borderRadius: 16, cursor: "pointer",
                fontFamily: "inherit", fontWeight: 600, fontSize: 14,
                color: "#FFFFFF", whiteSpace: "nowrap", lineHeight: 1.5,
              }}
            >
              <PlusIcon size={16} color="#FFFFFF" />
              Novo Gasto
            </button>
          </div>
        </div>
      </div>

      {/* ── Filter Panel ── */}
      {showFilterPanel && (
        <div
          style={{
            background: "#FFFFFF", border: "1px solid #F5F5F5", borderRadius: 24,
            padding: "20px 24px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr",
            gap: 16, alignItems: "end",
          }}
        >
          {[
            { label: "Tipo", value: filterType, set: setFilterType, options: EXPENSE_TYPES.map((t) => ({ value: t.value, label: t.label })), all: "Todos" },
            { label: "Categoria", value: filterCategory, set: setFilterCategory, options: categories.map((c) => ({ value: c.id, label: c.name })), all: "Todas" },
            { label: "Cartão", value: filterCard, set: setFilterCard, options: cards.map((c) => ({ value: c.id, label: c.name })), all: "Todos" },
            { label: "Responsável", value: filterMember, set: setFilterMember, options: members.map((m) => ({ value: m.userId, label: m.name })), all: "Todos" },
          ].map((f) => (
            <div key={f.label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#525252" }}>{f.label}</label>
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#FAFAFA", border: "1px solid #F5F5F5", borderRadius: 12, padding: "6px 10px" }}>
                <select
                  value={f.value}
                  onChange={(e) => f.set(e.target.value)}
                  style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, color: "#0A0A0A", fontFamily: "inherit", width: "100%", cursor: "pointer", ...selectResetStyle }}
                >
                  <option value="">{f.all}</option>
                  {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDownIcon size={14} color="#A3A3A3" />
              </div>
            </div>
          ))}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => { setFilterType(""); setFilterCategory(""); setFilterCard(""); setFilterMember(""); }}
              style={{
                gridColumn: "4", padding: "6px 14px", background: "transparent",
                border: "1px solid #E5E5E5", borderRadius: 12, cursor: "pointer",
                fontSize: 12, fontWeight: 600, color: "#A3A3A3", fontFamily: "inherit", marginTop: "auto",
              }}
            >
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {/* ── Table ── */}
      <div
        style={{
          display: "flex", flexDirection: "column", flex: 1,
          overflow: "hidden", gap: 8,
        }}
      >
        {/* Table Header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: COL_TEMPLATE,
            gap: 4,
            padding: "16px 24px",
            background: "#FAFAFA",
            borderRadius: 24,
          }}
        >
          <span style={{ fontWeight: 600, fontSize: 14, color: "#0A0A0A", lineHeight: 1.5 }}>
            Nome do Gasto
          </span>
          {["Tipo", "Categoria", "Cartão", "Responsável", "Data", "Valor"].map((col) => (
            <span key={col} style={{ fontWeight: 300, fontSize: 14, color: "#0A0A0A", lineHeight: 1.5, textAlign: "center" }}>
              {col}
            </span>
          ))}
          <span />
        </div>

        {/* Table Body */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #F5F5F5",
            borderRadius: 24,
            overflow: "hidden",
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ flex: 1, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "48px 24px", textAlign: "center", color: "#A3A3A3", fontSize: 14 }}>
                {expenses.length === 0 ? "Nenhum gasto registrado ainda" : "Nenhum resultado para os filtros selecionados"}
              </div>
            ) : (
              filtered.map((expense, i) => {
                const typeColor = TYPE_COLORS[expense.type] ?? TYPE_COLORS.avulsa;
                const typeLabel = EXPENSE_TYPES.find((t) => t.value === expense.type)?.label ?? expense.type;
                const installmentLabel = expense.type === "parcelada" && expense.currentInstallment && expense.totalInstallments
                  ? ` ${expense.currentInstallment}/${expense.totalInstallments}`
                  : "";
                return (
                  <div
                    key={expense.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: COL_TEMPLATE,
                      gap: 4,
                      padding: expense.pending ? "15px 23px" : "16px 24px",
                      borderBottom: (!expense.pending && i < filtered.length - 1) ? "1px solid #F5F5F5" : "none",
                      alignItems: "center",
                      ...(expense.pending
                        ? {
                            border: "1px solid #EAB308",
                            borderRadius: 12,
                            background: "#FEFCE8",
                            margin: "4px 8px",
                          }
                        : {}),
                    }}
                  >
                    {/* Name */}
                    <span style={{ fontWeight: 600, fontSize: 14, color: "#0A0A0A", lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {expense.name}
                      {expense.pending && (
                        <span style={{
                          marginLeft: 8, fontSize: 10, fontWeight: 600, color: "#92400E",
                          background: "#FEF3C7", border: "1px solid #EAB308", borderRadius: 20,
                          padding: "1px 7px", verticalAlign: "middle", letterSpacing: "0.04em", textTransform: "uppercase",
                        }}>
                          Pendente
                        </span>
                      )}
                    </span>

                    {/* Type */}
                    <span style={{ textAlign: "center" }}>
                      <span style={{
                        background: typeColor.bg, color: typeColor.text,
                        padding: "2px 10px", borderRadius: 16,
                        fontSize: 12, fontWeight: 600, lineHeight: 1.5, whiteSpace: "nowrap", display: "inline-block",
                        letterSpacing: "0.02em",
                      }}>
                        {typeLabel}{installmentLabel}
                      </span>
                    </span>

                    {/* Category */}
                    <span style={{ textAlign: "center" }}>
                      {expense.category ? (
                        <span style={{
                          background: "#F5F5F5", color: "#525252",
                          padding: "2px 10px", borderRadius: 16,
                          fontSize: 12, fontWeight: 600, lineHeight: 1.5, display: "inline-block",
                          letterSpacing: "0.02em",
                        }}>
                          {expense.category.name}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: "#A3A3A3" }}>—</span>
                      )}
                    </span>

                    {/* Card */}
                    <span style={{ fontSize: 12, fontWeight: 400, color: "#0A0A0A", textAlign: "center", lineHeight: 1.5, letterSpacing: "0.02em" }}>
                      {expense.card?.name ?? "—"}
                    </span>

                    {/* Responsible */}
                    <span style={{ fontSize: 12, fontWeight: 400, color: "#0A0A0A", textAlign: "center", lineHeight: 1.5, letterSpacing: "0.02em" }}>
                      {expense.responsible.name.split(" ")[0]}
                    </span>

                    {/* Date */}
                    <span style={{ fontSize: 12, fontWeight: 400, color: "#0A0A0A", textAlign: "center", lineHeight: 1.5, letterSpacing: "0.02em" }}>
                      {formatDate(expense.date)}
                    </span>

                    {/* Value */}
                    <span style={{ fontWeight: 600, fontSize: 12, color: "#0F8F4E", textAlign: "center", lineHeight: 1.5 }}>
                      {formatBRL(expense.amount)}
                    </span>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 4, alignItems: "center", justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        onClick={() => { setEditingExpense(expense); setPanelMode("edit"); }}
                        title={expense.pending ? "Revisar gasto importado" : "Editar gasto"}
                        style={{
                          width: 28, height: 28,
                          border: expense.pending ? "1px solid #EAB308" : "1px solid #F5F5F5",
                          borderRadius: 8,
                          background: expense.pending ? "#FEF3C7" : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                        }}
                      >
                        <PencilIcon size={12} color={expense.pending ? "#92400E" : "#A3A3A3"} />
                      </button>
                      <form action={deleteExpense.bind(null, expense.id)}>
                        <button
                          type="submit"
                          style={{
                            width: 28, height: 28, border: "1px solid #F5F5F5", borderRadius: 8,
                            background: "transparent", display: "flex", alignItems: "center",
                            justifyContent: "center", cursor: "pointer",
                          }}
                        >
                          <TrashCanIcon size={12} color="#A3A3A3" />
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "12px 24px", borderTop: "1px solid #F5F5F5",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: 12, color: "#A3A3A3", fontWeight: 300 }}>
              {filtered.length} {filtered.length === 1 ? "gasto" : "gastos"} encontrado{filtered.length !== 1 ? "s" : ""}
            </span>
            {(search || dateStart || dateEnd || hasActiveFilters) && (
              <button
                type="button"
                onClick={() => { setSearch(""); setDateStart(""); setDateEnd(""); setFilterType(""); setFilterCategory(""); setFilterCard(""); setFilterMember(""); }}
                style={{ fontSize: 12, color: "#A3A3A3", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
              >
                Limpar tudo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Panels ── */}
      {panelMode === "add" && (
        <SlidePanel onClose={() => setPanelMode(null)}>
          <ExpenseForm categories={categories} cards={cards} members={members} onClose={() => setPanelMode(null)} action={createAction} isPending={isCreating} state={createState} />
        </SlidePanel>
      )}

      {panelMode === "edit" && editingExpense && (
        <SlidePanel onClose={() => { setPanelMode(null); setEditingExpense(null); }}>
          <ExpenseForm expense={editingExpense} categories={categories} cards={cards} members={members} onClose={() => { setPanelMode(null); setEditingExpense(null); }} action={updateAction} isPending={isUpdating} state={updateState} />
        </SlidePanel>
      )}

      {panelMode === "import" && (
        <ExpenseImportPanel categories={categories} cards={cards} members={members} onClose={() => setPanelMode(null)} />
      )}
    </div>
  );
}
