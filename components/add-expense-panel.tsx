"use client";

import type { CSSProperties } from "react";
import { useActionState, useEffect, useRef, useState } from "react";
import { ChevronDownIcon, CloseIcon, PlusIcon } from "./icons";
import { Calendar } from "./calendar";
import { createExpense } from "@/lib/actions/expenses";
import { createCardQuick, createCategoryQuick } from "@/lib/actions/quick-create";

interface Props {
  open: boolean;
  onClose: () => void;
  categories: { id: string; name: string }[];
  cards: { id: string; name: string; statementClosingDay?: number | null }[];
  members: { userId: string; name: string }[];
}

const EXPENSE_TYPES = [
  { value: "avulsa", label: "Avulsa" },
  { value: "fixa", label: "Fixa" },
  { value: "parcelada", label: "Parcelada" },
];

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
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <label
        style={{
          fontWeight: 600,
          fontSize: 12,
          letterSpacing: "0.2px",
          color: "var(--color-fg-muted)",
          lineHeight: 1.5,
        }}
      >
        {label}
      </label>
      {children}
      {helperText && (
        <span
          style={{
            fontWeight: 400,
            fontSize: 10,
            letterSpacing: "0.4px",
            color: "var(--color-fg-subtle)",
            lineHeight: 1.5,
          }}
        >
          {helperText}
        </span>
      )}
    </div>
  );
}

const fieldStyle = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-8)",
  background: "var(--color-bg-default)",
  border: "var(--border-sm) solid var(--color-border-default)",
  borderRadius: "var(--radius-2xl)",
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

const linkBtnStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: 0,
  border: "none",
  background: "none",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--color-bg-brand-default)",
  letterSpacing: "0.2px",
};

export function AddExpensePanel({ open, onClose, categories, cards, members }: Props) {
  const [state, formAction, isPending] = useActionState(createExpense, null);
  const [selectedType, setSelectedType] = useState("avulsa");
  const [installments, setInstallments] = useState("12");
  const [currentInst, setCurrentInst] = useState("1");
  const [billingYm, setBillingYm] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [localCategories, setLocalCategories] = useState(categories);
  const [localCards, setLocalCards] = useState(cards);
  const [categoryId, setCategoryId] = useState("");
  const [cardId, setCardId] = useState("");
  const [responsibleId, setResponsibleId] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [showNewCard, setShowNewCard] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCardName, setNewCardName] = useState("");
  const [newCategoryErr, setNewCategoryErr] = useState<string | null>(null);
  const [newCardErr, setNewCardErr] = useState<string | null>(null);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [creatingCard, setCreatingCard] = useState(false);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!open) return;
    setLocalCategories(categories);
    setLocalCards(cards);
  }, [open, categories, cards]);

  useEffect(() => {
    if (open && !wasOpen.current) {
      setCategoryId("");
      setCardId("");
      setResponsibleId("");
      setShowNewCategory(false);
      setShowNewCard(false);
      setNewCategoryName("");
      setNewCardName("");
      setNewCategoryErr(null);
      setNewCardErr(null);
      setSelectedType("avulsa");
      setInstallments("12");
      setCurrentInst("1");
      setBillingYm("");
    }
    wasOpen.current = open;
  }, [open]);

  useEffect(() => {
    if (state?.success) {
      onClose();
    }
  }, [state, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 40 }}
      />

      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 410,
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          background: "var(--color-bg-default)",
          borderLeft: "var(--border-sm) solid var(--color-border-muted)",
          borderRadius: "var(--radius-4xl) 0 0 var(--radius-4xl)",
          animation: "slideIn 0.3s ease-out",
        }}
      >
        <form
          action={formAction}
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          <input type="hidden" name="date" value={selectedDate} />
          <input type="hidden" name="billingYm" value={billingYm} />
          <div
            style={{
              padding: "var(--space-32)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-40)",
              flex: 1,
              overflowY: "auto",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 400, fontSize: 16, color: "var(--color-fg-default)", lineHeight: 1.5 }}>
                Adicionar Gasto
              </span>
              <button
                type="button"
                onClick={onClose}
                style={{
                  width: 48,
                  height: 32,
                  background: "var(--color-bg-default)",
                  border: "var(--border-sm) solid var(--color-border-default)",
                  borderRadius: "var(--radius-2xl)",
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
                defaultValue="0,00"
                placeholder="0,00"
                style={{
                  fontWeight: 700,
                  fontSize: 40,
                  lineHeight: 1.2,
                  letterSpacing: "-0.8px",
                  color: "var(--color-bg-brand-strong)",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontFamily: "inherit",
                  width: "100%",
                }}
              />
            </div>

            {/* Error */}
            {state?.error && (
              <p style={{ fontSize: 13, color: "#f87171", background: "rgba(248,113,113,0.1)", padding: "8px 12px", borderRadius: "var(--radius-lg)" }}>
                {state.error}
              </p>
            )}

            {/* Fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-16)" }}>
              <FormField label="Nome do Gasto">
                <div style={fieldStyle}>
                  <input name="name" placeholder="Ex: Café da manhã" required style={inputStyle} />
                </div>
              </FormField>

              <FormField
                label="Identificador na Fatura"
                helperText="Esta informação não aparece na tabela de Gastos"
              >
                <div style={fieldStyle}>
                  <input name="invoiceId" placeholder="Ex: Mr.Soluctions32" style={inputStyle} />
                </div>
              </FormField>

              <FormField
                label="Data da compra"
                helperText="Só para referência; totais e filtros usam a fatura (competência)."
              >
                <Calendar
                  value={selectedDate}
                  onChange={setSelectedDate}
                  placeholder="Selecione a data"
                />
              </FormField>

              <FormField
                label="Fatura (competência)"
                helperText={
                  selectedType === "parcelada" &&
                  billingYm &&
                  parseInt(currentInst, 10) === 1
                    ? `Serão criados ${installments} lançamentos parcelados, um em cada fatura seguinte.`
                    : "Opcional. Mês em que o gasto entra na fatura. Vazio = calcular pela data e pelo cartão."
                }
              >
                <Calendar
                  value={billingYm ? `${billingYm}-01` : ""}
                  onChange={(ds) => setBillingYm(ds ? ds.slice(0, 7) : "")}
                  placeholder="Mês da fatura (opcional)"
                  competenceMonthLabel
                />
              </FormField>

              <FormField label="Tipo de Gasto">
                <div style={{ display: "flex", gap: "var(--space-8)" }}>
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
                            ? "var(--border-sm) solid var(--color-bg-brand-default)"
                            : "var(--border-sm) solid var(--color-border-default)",
                          borderRadius: "var(--radius-2xl)",
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
                        <input
                          type="radio"
                          name="type"
                          value={t.value}
                          checked={isSelected}
                          onChange={() => setSelectedType(t.value)}
                          style={{ display: "none" }}
                        />
                        {t.label}
                      </label>
                    );
                  })}
                </div>
              </FormField>

              {selectedType === "parcelada" && (
                <div style={{ display: "flex", gap: "var(--space-8)" }}>
                  <FormField label="Total de Parcelas">
                    <div style={fieldStyle}>
                      <select
                        name="totalInstallments"
                        value={installments}
                        onChange={(e) => {
                          setInstallments(e.target.value);
                          if (parseInt(currentInst, 10) > parseInt(e.target.value, 10)) {
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
                        {Array.from({ length: parseInt(installments, 10) || 1 }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>{n}/{installments}</option>
                        ))}
                      </select>
                      <ChevronDownIcon size={16} color="var(--color-fg-subtle)" />
                    </div>
                  </FormField>
                </div>
              )}

              <FormField label="Categoria">
                <div style={fieldStyle}>
                  <select
                    name="categoryId"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    style={{ ...inputStyle, color: "var(--color-fg-subtle)", cursor: "pointer" }}
                  >
                    <option value="">Selecione uma Categoria (opcional)</option>
                    {localCategories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <ChevronDownIcon size={16} color="var(--color-fg-subtle)" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewCategory((v) => !v);
                      setNewCategoryErr(null);
                    }}
                    style={linkBtnStyle}
                  >
                    <PlusIcon size={12} color="var(--color-bg-brand-default)" />
                    {showNewCategory ? "Fechar" : "Nova categoria"}
                  </button>
                  {showNewCategory && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Nome da categoria"
                        disabled={creatingCategory}
                        style={{
                          ...inputStyle,
                          flex: 1,
                          minWidth: 140,
                          padding: "8px 10px",
                          border: "var(--border-sm) solid var(--color-border-default)",
                          borderRadius: "var(--radius-lg)",
                          background: "var(--color-bg-subtle)",
                        }}
                      />
                      <button
                        type="button"
                        disabled={creatingCategory || !newCategoryName.trim()}
                        onClick={async () => {
                          setNewCategoryErr(null);
                          setCreatingCategory(true);
                          const res = await createCategoryQuick(newCategoryName);
                          setCreatingCategory(false);
                          if ("error" in res) {
                            setNewCategoryErr(res.error);
                            return;
                          }
                          setLocalCategories((prev) => {
                            if (prev.some((x) => x.id === res.id)) return prev;
                            return [...prev, { id: res.id, name: res.name }];
                          });
                          setCategoryId(res.id);
                          setNewCategoryName("");
                          setShowNewCategory(false);
                        }}
                        style={{
                          padding: "8px 14px",
                          borderRadius: "var(--radius-lg)",
                          border: "none",
                          background: "var(--color-bg-brand-default)",
                          color: "var(--color-fg-inverse)",
                          fontWeight: 600,
                          fontSize: 12,
                          cursor: creatingCategory || !newCategoryName.trim() ? "not-allowed" : "pointer",
                          fontFamily: "inherit",
                          opacity: creatingCategory || !newCategoryName.trim() ? 0.6 : 1,
                        }}
                      >
                        {creatingCategory ? "…" : "Criar"}
                      </button>
                    </div>
                  )}
                  {newCategoryErr && (
                    <span style={{ fontSize: 11, color: "#f87171" }}>{newCategoryErr}</span>
                  )}
                </div>
              </FormField>

              <FormField label="Responsável">
                <div style={fieldStyle}>
                  <select
                    name="responsibleId"
                    value={responsibleId}
                    onChange={(e) => setResponsibleId(e.target.value)}
                    required
                    style={{ ...inputStyle, color: "var(--color-fg-subtle)", cursor: "pointer" }}
                  >
                    <option value="">Selecione quem fez o gasto</option>
                    {members.map((m) => (
                      <option key={m.userId} value={m.userId}>{m.name}</option>
                    ))}
                  </select>
                  <ChevronDownIcon size={16} color="var(--color-fg-subtle)" />
                </div>
              </FormField>

              <FormField label="Pagamento">
                <div style={fieldStyle}>
                  <select
                    name="cardId"
                    value={cardId}
                    onChange={(e) => setCardId(e.target.value)}
                    style={{ ...inputStyle, color: "var(--color-fg-subtle)", cursor: "pointer" }}
                  >
                    <option value="">Selecione o pagamento (opcional)</option>
                    {localCards.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <ChevronDownIcon size={16} color="var(--color-fg-subtle)" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewCard((v) => !v);
                      setNewCardErr(null);
                    }}
                    style={linkBtnStyle}
                  >
                    <PlusIcon size={12} color="var(--color-bg-brand-default)" />
                    {showNewCard ? "Fechar" : "Novo pagamento"}
                  </button>
                  {showNewCard && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                      <input
                        type="text"
                        value={newCardName}
                        onChange={(e) => setNewCardName(e.target.value)}
                        placeholder="Ex: Nubank, débito…"
                        disabled={creatingCard}
                        style={{
                          ...inputStyle,
                          flex: 1,
                          minWidth: 140,
                          padding: "8px 10px",
                          border: "var(--border-sm) solid var(--color-border-default)",
                          borderRadius: "var(--radius-lg)",
                          background: "var(--color-bg-subtle)",
                        }}
                      />
                      <button
                        type="button"
                        disabled={creatingCard || !newCardName.trim()}
                        onClick={async () => {
                          setNewCardErr(null);
                          setCreatingCard(true);
                          const res = await createCardQuick(newCardName);
                          setCreatingCard(false);
                          if ("error" in res) {
                            setNewCardErr(res.error);
                            return;
                          }
                          setLocalCards((prev) => {
                            if (prev.some((x) => x.id === res.id)) return prev;
                            return [...prev, { id: res.id, name: res.name }];
                          });
                          setCardId(res.id);
                          setNewCardName("");
                          setShowNewCard(false);
                        }}
                        style={{
                          padding: "8px 14px",
                          borderRadius: "var(--radius-lg)",
                          border: "none",
                          background: "var(--color-bg-brand-default)",
                          color: "var(--color-fg-inverse)",
                          fontWeight: 600,
                          fontSize: 12,
                          cursor: creatingCard || !newCardName.trim() ? "not-allowed" : "pointer",
                          fontFamily: "inherit",
                          opacity: creatingCard || !newCardName.trim() ? 0.6 : 1,
                        }}
                      >
                        {creatingCard ? "…" : "Criar"}
                      </button>
                    </div>
                  )}
                  {newCardErr && (
                    <span style={{ fontSize: 11, color: "#f87171" }}>{newCardErr}</span>
                  )}
                </div>
              </FormField>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "var(--space-16) var(--space-32) var(--space-32)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-8)",
            }}
          >
            <button
              type="submit"
              disabled={isPending}
              style={{
                width: "100%",
                padding: "12px 16px",
                background: isPending ? "var(--color-bg-brand-strong)" : "var(--color-bg-brand-default)",
                border: "none",
                borderRadius: "var(--radius-2xl)",
                fontFamily: "inherit",
                fontWeight: 600,
                fontSize: 16,
                color: "var(--color-fg-inverse)",
                cursor: isPending ? "not-allowed" : "pointer",
                lineHeight: 1.5,
                transition: "background 0.2s",
              }}
            >
              {isPending ? "Salvando..." : "Adicionar"}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                width: "100%",
                padding: "8px 16px",
                background: "var(--color-bg-default)",
                border: "none",
                borderRadius: "var(--radius-2xl)",
                fontFamily: "inherit",
                fontWeight: 600,
                fontSize: 14,
                color: "var(--color-fg-subtle)",
                cursor: "pointer",
                lineHeight: 1.5,
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
