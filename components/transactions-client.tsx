"use client";

import { useState, useMemo, useActionState, useEffect, useTransition, useRef } from "react";
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
import { createExpense, updateExpense, deleteExpense, bulkDeleteExpenses } from "@/lib/actions/expenses";
import { formatDateBrazil, getTodayBrazilYMD, toBrazilCalendarYMD } from "@/lib/date-local";
import { formatBillingYmShort } from "@/lib/expense-billing-ym";
import { ExpenseImportPanel } from "./expense-import-panel";
import { Calendar } from "./calendar";
import { PaymentCardThumbnail } from "./payment-card-thumbnail";


type Expense = {
  id: string;
  name: string;
  amount: number;
  date: Date;
  billingYm: string;
  type: string;
  pending: boolean;
  totalInstallments: number | null;
  currentInstallment: number | null;
  invoiceId: string | null;
  category: { id: string; name: string } | null;
  responsible: { id: string; name: string };
  card: { id: string; name: string; image: string | null } | null;
};

interface Props {
  expenses: Expense[];
  categories: { id: string; name: string }[];
  cards: {
    id: string;
    name: string;
    image?: string | null;
    statementClosingDay?: number | null;
    dueDayOffset?: number | null;
  }[];
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

/** Interpreta a busca como valor em reais (ex.: 50, 50,00, 1.500,99, R$ 100, 1.500). Só aceita texto “só número”. */
function parseAmountSearchQuery(raw: string): number | null {
  const t = raw.trim().replace(/r\$/gi, "").replace(/\s/g, "");
  if (!t || !/^\d[\d.,]*$/.test(t)) return null;
  let normalized = t;
  if (t.includes(",")) {
    normalized = t.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
    normalized = t.replace(/\./g, "");
  }
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

function expenseMatchesAmountSearch(amount: number, rawSearch: string): boolean {
  const parsed = parseAmountSearchQuery(rawSearch);
  if (parsed === null) return false;
  return Math.abs(amount - parsed) < 0.005;
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

function FormField({
  label,
  children,
  helperText,
}: {
  label: string;
  children: React.ReactNode;
  helperText?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <label style={{ fontWeight: 600, fontSize: 12, color: "var(--color-fg-muted)", lineHeight: 1.5 }}>
        {label}
      </label>
      {children}
      {helperText && (
        <span style={{ fontWeight: 400, fontSize: 10, color: "var(--color-fg-subtle)", lineHeight: 1.45 }}>
          {helperText}
        </span>
      )}
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
  const [billingYm, setBillingYm] = useState(() => {
    if (expense?.billingYm) return expense.billingYm;
    return getTodayBrazilYMD().slice(0, 7);
  });
  const [selectedDate, setSelectedDate] = useState(
    expense ? toBrazilCalendarYMD(expense.date) : ""
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
      <input type="hidden" name="billingYm" value={billingYm} />

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

          <FormField
            label="Data da compra"
            helperText="Só para referência; os gastos são agrupados pelo mês em que foram lançados."
          >
            <Calendar
              value={selectedDate}
              onChange={setSelectedDate}
              placeholder="Selecione a data"
            />
          </FormField>

          <FormField
            label="Gastos do mês"
            helperText={
              !expense &&
              selectedType === "parcelada" &&
              billingYm &&
              parseInt(currentInst, 10) === 1
                ? `Serão criados ${installments} lançamentos parcelados, um em cada mês seguinte.`
                : "Mês em que este gasto será contabilizado."
            }
          >
            <Calendar
              value={billingYm ? `${billingYm}-01` : ""}
              onChange={(ds) => setBillingYm(ds ? ds.slice(0, 7) : "")}
              placeholder="Selecione o mês"
              competenceMonthLabel
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

          <FormField label="Pagamento">
            <div style={fieldStyle}>
              <select name="cardId" defaultValue={expense?.card?.id ?? ""} style={{ ...inputStyle, color: "var(--color-fg-subtle)", cursor: "pointer", ...selectResetStyle }}>
                <option value="">Selecione o pagamento</option>
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

function MultiCategorySelect({
  categories,
  selected,
  onChange,
}: {
  categories: { id: string; name: string }[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    onChange(next);
  };

  const label = selected.size === 0
    ? "Todas"
    : selected.size === 1
      ? categories.find((c) => selected.has(c.id))?.name ?? "1 selecionada"
      : `${selected.size} selecionadas`;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div
        onClick={() => setOpen((v) => !v)}
        style={{ display: "flex", alignItems: "center", gap: 6, background: "#FFFFFF", border: "1px solid #F5F5F5", borderRadius: 12, padding: "6px 10px", cursor: "pointer" }}
      >
        <span style={{ flex: 1, fontSize: 13, color: selected.size > 0 ? "#0A0A0A" : "#A3A3A3", fontFamily: "inherit", userSelect: "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {label}
        </span>
        <ChevronDownIcon size={14} color="#A3A3A3" />
      </div>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 100,
          background: "#FFFFFF", border: "1px solid #E5E5E5", borderRadius: 12,
          boxShadow: "0 4px 16px rgba(0,0,0,0.08)", padding: "4px 0", minWidth: 160,
        }}>
          {categories.map((c) => (
            <label
              key={c.id}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", cursor: "pointer", fontSize: 13, color: "#0A0A0A", fontFamily: "inherit" }}
            >
              <input
                type="checkbox"
                checked={selected.has(c.id)}
                onChange={() => toggle(c.id)}
                style={{ accentColor: "var(--color-bg-brand-strong)", cursor: "pointer" }}
              />
              {c.name}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// Colunas: … responsável | fatura (competência) | data documental | valor | ações
const COL_TEMPLATE = "32px minmax(150px, 2fr) 112px 112px 136px 112px 88px 96px 112px 68px";

export function TransactionsClient({ expenses, categories, cards, members }: Props) {
  const [search, setSearch] = useState("");
  const [filterMonth, setFilterMonth] = useState(() => getTodayBrazilYMD().slice(0, 7));
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterType, setFilterType] = useState("");
  const [filterCategory, setFilterCategory] = useState<Set<string>>(new Set());
  const [filterCard, setFilterCard] = useState("");
  const [filterMember, setFilterMember] = useState("");
  const [filterDateStart, setFilterDateStart] = useState("");
  const [filterDateEnd, setFilterDateEnd] = useState("");

  const [panelMode, setPanelMode] = useState<"add" | "edit" | "import" | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, startBulkDelete] = useTransition();

  const [createState, createAction, isCreating] = useActionState(createExpense, null);
  const [updateState, updateAction, isUpdating] = useActionState(updateExpense, null);

  useEffect(() => {
    if (createState?.success) setPanelMode(null);
  }, [createState]);

  useEffect(() => {
    if (updateState?.success) { setPanelMode(null); setEditingExpense(null); }
  }, [updateState]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((e) => e.id)));
    }
  };

  const handleBulkDelete = () => {
    if (!selectedIds.size) return;
    startBulkDelete(async () => {
      await bulkDeleteExpenses(Array.from(selectedIds));
      setSelectedIds(new Set());
    });
  };

  const filtered = useMemo(() => {
    const raw = search.trim();
    const q = raw.toLowerCase();
    const list = expenses.filter((e) => {
      if (q) {
        const inName = e.name.toLowerCase().includes(q);
        const inInvoice = e.invoiceId?.toLowerCase().includes(q) ?? false;
        const inCardId = e.card?.id.toLowerCase().includes(q) ?? false;
        const inCardName = e.card?.name.toLowerCase().includes(q) ?? false;
        const inAmount = expenseMatchesAmountSearch(e.amount, raw);
        if (!inName && !inInvoice && !inCardId && !inCardName && !inAmount) return false;
      }
      if (filterMonth && e.billingYm !== filterMonth) return false;
      if (filterType && e.type !== filterType) return false;
      if (filterCategory.size > 0 && !filterCategory.has(e.category?.id ?? "")) return false;
      if (filterCard && e.card?.id !== filterCard) return false;
      if (filterMember && e.responsible.id !== filterMember) return false;
      if (filterDateStart || filterDateEnd) {
        const expYmd = toBrazilCalendarYMD(e.date);
        if (filterDateStart && expYmd < filterDateStart) return false;
        if (filterDateEnd && expYmd > filterDateEnd) return false;
      }
      return true;
    });
    list.sort((a, b) => {
      if (a.billingYm !== b.billingYm) return b.billingYm.localeCompare(a.billingYm);
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    return list;
  }, [
    expenses,
    search,
    filterMonth,
    filterType,
    filterCategory,
    filterCard,
    filterMember,
    filterDateStart,
    filterDateEnd,
  ]);

  const { filteredCount, filteredAmountSum } = useMemo(() => {
    const count = filtered.length;
    const total = filtered.reduce((sum, e) => sum + e.amount, 0);
    return { filteredCount: count, filteredAmountSum: total };
  }, [filtered]);

  const hasActiveFilters = Boolean(filterType) || filterCategory.size > 0 || Boolean(filterCard) || Boolean(filterMember) || Boolean(filterDateStart) || Boolean(filterDateEnd);
  const currentMonth = getTodayBrazilYMD().slice(0, 7);
  const activeFilterCount = [filterType, filterCard, filterMember, filterDateStart, filterDateEnd].filter(Boolean).length + (filterCategory.size > 0 ? 1 : 0);

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
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            padding: "8px 0 8px 16px",
          }}
        >
          <span style={{ fontWeight: 400, fontSize: 16, color: "#0A0A0A", whiteSpace: "nowrap", lineHeight: 1.5 }}>
            Gastos do mês
          </span>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            {/* Pesquisa — primeiro item do grupo de ações (antes de Filtrar) */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#FFFFFF",
                border: "1px solid #E5E5E5",
                borderRadius: 16,
                padding: "8px 12px",
                width: 240,
                flexShrink: 0,
              }}
            >
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nome, valor, ID da fatura ou pagamento"
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontFamily: "inherit",
                  fontSize: 13,
                  fontWeight: 400,
                  color: "#0A0A0A",
                  lineHeight: 1.5,
                  minWidth: 0,
                }}
              />
              <SearchIcon size={16} color="#A3A3A3" />
            </div>

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

            <Calendar
              value={filterMonth ? `${filterMonth}-01` : ""}
              onChange={(ds) => setFilterMonth(ds ? ds.slice(0, 7) : "")}
              placeholder="Selecione o mês"
              competenceMonthLabel
            />

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

        {/* Painel de filtros: acima dos cards de quantidade / total */}
        {showFilterPanel && (
          <div
            style={{
              margin: "0 16px 8px",
              padding: "20px 24px",
              background: "#FAFAFA",
              border: "1px solid #F5F5F5",
              borderRadius: 24,
              display: "flex",
              flexDirection: "column",
              gap: 16,
              boxSizing: "border-box",
            }}
          >
            {/* Linha 1: selects de tipo/categoria/cartão/responsável */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16, alignItems: "end" }}>
              {(
                [
                  {
                    label: "Tipo",
                    value: filterType,
                    set: setFilterType,
                    options: EXPENSE_TYPES.map((t) => ({ value: t.value, label: t.label })),
                    all: "Todos",
                  },
                  {
                    label: "Cartão",
                    value: filterCard,
                    set: setFilterCard,
                    options: cards.map((c) => ({ value: c.id, label: c.name })),
                    all: "Todos",
                  },
                  {
                    label: "Responsável",
                    value: filterMember,
                    set: setFilterMember,
                    options: members.map((m) => ({ value: m.userId, label: m.name })),
                    all: "Todos",
                  },
                ] as const
              ).map((f) => (
                <div key={f.label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#525252" }}>{f.label}</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#FFFFFF", border: "1px solid #F5F5F5", borderRadius: 12, padding: "6px 10px" }}>
                    <select
                      value={f.value}
                      onChange={(e) => f.set(e.target.value)}
                      style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, color: "#0A0A0A", fontFamily: "inherit", width: "100%", cursor: "pointer", ...selectResetStyle }}
                    >
                      <option value="">{f.all}</option>
                      {f.options.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDownIcon size={14} color="#A3A3A3" />
                  </div>
                </div>
              ))}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#525252" }}>Categoria</label>
                <MultiCategorySelect
                  categories={categories}
                  selected={filterCategory}
                  onChange={setFilterCategory}
                />
              </div>
            </div>

            {/* Linha 2: filtro de data do gasto */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16, alignItems: "end" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#525252" }}>Data início</label>
                <Calendar
                  value={filterDateStart}
                  onChange={setFilterDateStart}
                  placeholder="De"
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#525252" }}>Data fim</label>
                <Calendar
                  value={filterDateEnd}
                  onChange={setFilterDateEnd}
                  placeholder="Até"
                />
              </div>
              <div />
              {hasActiveFilters ? (
              <button
                type="button"
                onClick={() => {
                  setFilterType("");
                  setFilterCategory(new Set());
                  setFilterCard("");
                  setFilterMember("");
                  setFilterDateStart("");
                  setFilterDateEnd("");
                }}
                style={{
                  padding: "6px 14px",
                  background: "transparent",
                  border: "1px solid #E5E5E5",
                  borderRadius: 12,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#A3A3A3",
                  fontFamily: "inherit",
                  marginTop: "auto",
                  justifySelf: "end",
                  whiteSpace: "nowrap",
                }}
              >
                Limpar filtros
              </button>
            ) : (
              <div />
            )}
            </div>
          </div>
        )}

        {/* Resumo: quantidade e total (Design System — frame com dois cards) */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "stretch",
            gap: 8,
            padding: "8px 16px 16px",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              flex: "1 1 200px",
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 16,
              padding: 24,
              background: "#0F8F4E",
              border: "1px solid #F5F5F5",
              borderRadius: 24,
              boxSizing: "border-box",
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.5, color: "#FFFFFF" }}>
              Quantidade de Gastos
            </span>
            <span
              style={{
                fontWeight: 700,
                fontSize: 48,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                color: "#FFFFFF",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {filteredCount}
            </span>
          </div>
          <div
            style={{
              flex: "1 1 200px",
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              alignItems: "stretch",
              gap: 4,
              padding: 24,
              background: "#99E83A",
              border: "1px solid #F5F5F5",
              borderRadius: 24,
              boxSizing: "border-box",
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.5, color: "#0C7341" }}>Total</span>
            <span
              style={{
                fontWeight: 700,
                fontSize: 48,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                color: "#0A0A0A",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatBRL(filteredAmountSum)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div
        style={{
          display: "flex", flexDirection: "column", flex: 1,
          overflow: "hidden", gap: 8,
        }}
      >
        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "#FFF7ED", border: "1px solid #FED7AA",
            borderRadius: 16, padding: "10px 20px",
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#92400E" }}>
              {selectedIds.size} {selectedIds.size === 1 ? "gasto selecionado" : "gastos selecionados"}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                style={{
                  padding: "6px 14px", borderRadius: 10, border: "1px solid #FED7AA",
                  background: "transparent", cursor: "pointer", fontFamily: "inherit",
                  fontSize: 13, fontWeight: 600, color: "#92400E",
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                style={{
                  padding: "6px 14px", borderRadius: 10, border: "none",
                  background: isBulkDeleting ? "#FCA5A5" : "#EF4444",
                  cursor: isBulkDeleting ? "not-allowed" : "pointer",
                  fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: "#FFFFFF",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                <TrashCanIcon size={13} color="#FFFFFF" />
                {isBulkDeleting ? "Apagando..." : "Apagar selecionados"}
              </button>
            </div>
          </div>
        )}

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
          {/* Select all checkbox */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <input
              type="checkbox"
              checked={filtered.length > 0 && selectedIds.size === filtered.length}
              ref={(el) => { if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < filtered.length; }}
              onChange={toggleSelectAll}
              style={{ width: 14, height: 14, cursor: "pointer", accentColor: "#0F8F4E" }}
            />
          </div>
          <span style={{ fontWeight: 600, fontSize: 14, color: "#0A0A0A", lineHeight: 1.5 }}>
            Nome do Gasto
          </span>
          {["Tipo", "Categoria", "Cartão", "Responsável", "Mês", "Data (doc.)", "Valor"].map((col) => (
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
                const isSelected = selectedIds.has(expense.id);
                const showRowDivider = !expense.pending && i < filtered.length - 1;
                const pendingBorder = {
                  borderTopWidth: 1,
                  borderRightWidth: 1,
                  borderBottomWidth: 1,
                  borderLeftWidth: 1,
                  borderTopStyle: "solid" as const,
                  borderRightStyle: "solid" as const,
                  borderBottomStyle: "solid" as const,
                  borderLeftStyle: "solid" as const,
                  borderTopColor: "#EAB308",
                  borderRightColor: "#EAB308",
                  borderBottomColor: "#EAB308",
                  borderLeftColor: "#EAB308",
                };
                const normalRowBorder = {
                  borderTopWidth: 0,
                  borderRightWidth: 0,
                  borderLeftWidth: 0,
                  borderBottomWidth: showRowDivider ? 1 : 0,
                  borderTopStyle: "none" as const,
                  borderRightStyle: "none" as const,
                  borderLeftStyle: "none" as const,
                  borderBottomStyle: showRowDivider ? ("solid" as const) : ("none" as const),
                  borderBottomColor: showRowDivider ? "#F5F5F5" : "transparent",
                };
                return (
                  <div
                    key={expense.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: COL_TEMPLATE,
                      gap: 4,
                      padding: expense.pending ? "15px 23px" : "16px 24px",
                      alignItems: "center",
                      background: isSelected
                        ? "#F0FDF4"
                        : expense.pending
                          ? "#FEFCE8"
                          : undefined,
                      borderRadius: expense.pending ? 12 : undefined,
                      margin: expense.pending ? "4px 8px" : undefined,
                      ...(expense.pending ? pendingBorder : normalRowBorder),
                    }}
                  >
                    {/* Checkbox */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(expense.id)}
                        style={{ width: 14, height: 14, cursor: "pointer", accentColor: "#0F8F4E" }}
                      />
                    </div>

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
                      {expense.card ? (
                        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                          <PaymentCardThumbnail imageUrl={expense.card.image} name={expense.card.name} width={30} />
                          <span>{expense.card.name}</span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </span>

                    {/* Responsible */}
                    <span style={{ fontSize: 12, fontWeight: 400, color: "#0A0A0A", textAlign: "center", lineHeight: 1.5, letterSpacing: "0.02em" }}>
                      {expense.responsible.name.split(" ")[0]}
                    </span>

                    {/* Fatura (competência) */}
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#0F8F4E", textAlign: "center", lineHeight: 1.5, letterSpacing: "0.02em" }}>
                      {formatBillingYmShort(expense.billingYm)}
                    </span>

                    {/* Data documental */}
                    <span style={{ fontSize: 11, fontWeight: 400, color: "#737373", textAlign: "center", lineHeight: 1.5, letterSpacing: "0.02em" }}>
                      {formatDateBrazil(expense.date)}
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
            {(search || filterMonth !== currentMonth || hasActiveFilters) && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilterMonth(currentMonth);
                  setFilterType("");
                  setFilterCategory(new Set());
                  setFilterCard("");
                  setFilterMember("");
                }}
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
