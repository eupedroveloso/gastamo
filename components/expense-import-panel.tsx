"use client";

import { useState, useRef, useCallback } from "react";
import { UploadIcon, CloseIcon, SparklesIcon, TrashCanIcon } from "./icons";
import { bulkCreateExpenses } from "@/lib/actions/expenses";
import { getTodayBrazilYMD } from "@/lib/date-local";

type Step = "upload" | "loading" | "review" | "success";

type ExtractedExpense = {
  id: string;
  name: string;
  invoiceId: string;
  amount: number;
  date: string;
  type: string;
  selected: boolean;
};

interface Props {
  categories: { id: string; name: string }[];
  cards: { id: string; name: string }[];
  members: { userId: string; name: string }[];
  onClose: () => void;
}

const EXPENSE_TYPES = ["avulsa", "fixa", "parcelada"];

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  avulsa: { bg: "#F5F5F5", text: "#525252" },
  fixa: { bg: "#D6F5E3", text: "#0F6B38" },
  parcelada: { bg: "#EFF6FF", text: "#1A56DB" },
};

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--color-border-default)",
  borderRadius: "8px",
  padding: "4px 8px",
  fontFamily: "inherit",
  fontSize: 12,
  color: "var(--color-fg-default)",
  background: "var(--color-bg-default)",
  outline: "none",
  width: "100%",
};

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ExpenseImportPanel({ categories, cards, members, onClose }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<ExtractedExpense[]>([]);
  const [responsibleId, setResponsibleId] = useState(members[0]?.userId ?? "");
  const [categoryId, setCategoryId] = useState("");
  const [cardId, setCardId] = useState("");
  const [importedCount, setImportedCount] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setFileName(file.name);
    setStep("loading");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/ai/import", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error ?? "Erro ao analisar o arquivo");
        setStep("upload");
        return;
      }

      const extracted: ExtractedExpense[] = (data.expenses as Array<{
        name?: string;
        amount?: number | string;
        date?: string;
        type?: string;
      }>).map((e, i) => ({
        id: `${i}-${Date.now()}`,
        name: "",
        invoiceId: String(e.name ?? ""),
        amount: Number(e.amount) || 0,
        date: String(e.date ?? getTodayBrazilYMD()),
        type: String(e.type ?? "avulsa"),
        selected: true,
      }));

      setExpenses(extracted);
      setStep("review");
    } catch {
      setError("Erro ao se comunicar com a IA");
      setStep("upload");
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleImport = async () => {
    const selected = expenses.filter((e) => e.selected);
    if (!selected.length) return;
    if (!responsibleId) {
      setError("Selecione um responsável");
      return;
    }

    setIsImporting(true);
    setError(null);

    const currentMonth = getTodayBrazilYMD().slice(0, 7);
    const result = await bulkCreateExpenses(
      selected.map((e) => ({
        name: e.name,
        invoiceId: e.invoiceId || undefined,
        amount: e.amount,
        date: e.date,
        type: e.type,
        categoryId: categoryId || undefined,
        responsibleId,
        cardId: cardId || undefined,
      })),
      currentMonth,
    );

    setIsImporting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setImportedCount(result.count ?? selected.length);
    setStep("success");
  };

  const updateExpense = (
    id: string,
    field: keyof ExtractedExpense,
    value: string | number | boolean
  ) => {
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };

  const removeExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const selectedCount = expenses.filter((e) => e.selected).length;

  const selectStyle: React.CSSProperties = {
    border: "1px solid var(--color-border-default)",
    borderRadius: "8px",
    padding: "6px 10px",
    fontFamily: "inherit",
    fontSize: 13,
    color: "var(--color-fg-default)",
    background: "var(--color-bg-default)",
    outline: "none",
    cursor: "pointer",
    width: "100%",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.4)",
        padding: "16px",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "var(--color-bg-default)",
          borderRadius: "16px",
          width: "100%",
          maxWidth: step === "review" ? 780 : 480,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px",
            borderBottom: "1px solid var(--color-border-muted)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "8px",
                background: "var(--color-bg-brand-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <SparklesIcon size={16} color="var(--color-fg-brand)" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--color-fg-default)" }}>
                Importar Gastos via IA
              </div>
              <div style={{ fontSize: 12, color: "var(--color-fg-subtle)", fontWeight: 300 }}>
                Foto de recibo, fatura ou extrato bancário
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              color: "var(--color-fg-subtle)",
            }}
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          {/* Upload Step */}
          {step === "upload" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${isDragging ? "var(--color-fg-brand)" : "var(--color-border-default)"}`,
                  borderRadius: "12px",
                  padding: "40px 24px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                  cursor: "pointer",
                  background: isDragging ? "var(--color-bg-brand-muted)" : "var(--color-bg-subtle)",
                  transition: "all 0.15s",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "12px",
                    background: "var(--color-bg-brand-muted)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <UploadIcon size={24} color="var(--color-fg-brand)" />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--color-fg-default)" }}>
                    Arraste ou clique para enviar
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-fg-subtle)", marginTop: 4, fontWeight: 300 }}>
                    JPG, PNG, WebP ou PDF — máximo 10MB
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "var(--color-fg-subtle)", fontWeight: 300, lineHeight: 1.5 }}>
                  Suporta: recibos, notas fiscais, faturas e extratos bancários
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,application/pdf"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
              {error && (
                <div
                  style={{
                    background: "#FEF2F2",
                    border: "1px solid #FECACA",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    fontSize: 13,
                    color: "#B91C1C",
                  }}
                >
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Loading Step */}
          {step === "loading" && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 20,
                padding: "32px 0",
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "14px",
                  background: "var(--color-bg-brand-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              >
                <SparklesIcon size={28} color="var(--color-fg-brand)" />
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: "var(--color-fg-default)" }}>
                  Analisando documento…
                </div>
                <div style={{ fontSize: 13, color: "var(--color-fg-subtle)", marginTop: 6, fontWeight: 300 }}>
                  {fileName}
                </div>
                <div style={{ fontSize: 12, color: "var(--color-fg-subtle)", marginTop: 8, fontWeight: 300 }}>
                  A IA está lendo e extraindo os gastos
                </div>
              </div>
              <div
                style={{
                  width: "80%",
                  height: 3,
                  background: "var(--color-border-muted)",
                  borderRadius: 999,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    background: "var(--color-fg-brand)",
                    borderRadius: 999,
                    animation: "loading-bar 1.8s ease-in-out infinite",
                    width: "60%",
                  }}
                />
              </div>
              <style>{`
                @keyframes loading-bar {
                  0% { transform: translateX(-100%); }
                  100% { transform: translateX(260%); }
                }
                @keyframes pulse {
                  0%, 100% { opacity: 1; }
                  50% { opacity: 0.5; }
                }
              `}</style>
            </div>
          )}

          {/* Review Step */}
          {step === "review" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div
                style={{
                  background: "var(--color-bg-brand-muted)",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <SparklesIcon size={14} color="var(--color-fg-brand)" />
                <span style={{ fontSize: 13, color: "var(--color-fg-brand)", fontWeight: 500 }}>
                  {expenses.length} {expenses.length === 1 ? "gasto identificado" : "gastos identificados"} em{" "}
                  <strong>{fileName}</strong>. Revise e edite antes de importar.
                </span>
              </div>

              {/* Table */}
              <div
                style={{
                  border: "1px solid var(--color-border-muted)",
                  borderRadius: "10px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "32px 1fr 1fr 90px 110px 90px 32px",
                    gap: "8px",
                    padding: "8px 12px",
                    background: "var(--color-bg-subtle)",
                    borderBottom: "1px solid var(--color-border-muted)",
                  }}
                >
                  {["", "Nome", "Identificador", "Valor (R$)", "Data", "Tipo", ""].map((h, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--color-fg-subtle)",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {h}
                    </span>
                  ))}
                </div>

                <div style={{ maxHeight: 300, overflowY: "auto" }}>
                  {expenses.map((expense) => (
                    <div
                      key={expense.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "32px 1fr 1fr 90px 110px 90px 32px",
                        gap: "8px",
                        padding: "8px 12px",
                        borderBottom: "1px solid var(--color-border-muted)",
                        alignItems: "center",
                        opacity: expense.selected ? 1 : 0.4,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={expense.selected}
                        onChange={(e) => updateExpense(expense.id, "selected", e.target.checked)}
                        style={{ cursor: "pointer", width: 14, height: 14 }}
                      />
                      <input
                        type="text"
                        value={expense.name}
                        onChange={(e) => updateExpense(expense.id, "name", e.target.value)}
                        style={inputStyle}
                        placeholder="Nome do gasto"
                      />
                      <input
                        type="text"
                        value={expense.invoiceId}
                        onChange={(e) => updateExpense(expense.id, "invoiceId", e.target.value)}
                        style={{ ...inputStyle, color: "var(--color-fg-subtle)" }}
                        placeholder="Identificador"
                      />
                      <input
                        type="number"
                        value={expense.amount}
                        onChange={(e) => updateExpense(expense.id, "amount", parseFloat(e.target.value) || 0)}
                        style={{ ...inputStyle, textAlign: "right" }}
                        step="0.01"
                        min="0"
                      />
                      <input
                        type="date"
                        value={expense.date}
                        onChange={(e) => updateExpense(expense.id, "date", e.target.value)}
                        style={inputStyle}
                      />
                      <select
                        value={expense.type}
                        onChange={(e) => updateExpense(expense.id, "type", e.target.value)}
                        style={{
                          ...inputStyle,
                          background: TYPE_COLORS[expense.type]?.bg ?? "#F5F5F5",
                          color: TYPE_COLORS[expense.type]?.text ?? "#525252",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {EXPENSE_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeExpense(expense.id)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 2,
                          color: "var(--color-fg-subtle)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <TrashCanIcon size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Global fields */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-fg-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Aplicar a todos os gastos selecionados
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-fg-muted)", display: "block", marginBottom: 4 }}>
                      Responsável *
                    </label>
                    <select
                      value={responsibleId}
                      onChange={(e) => setResponsibleId(e.target.value)}
                      style={selectStyle}
                    >
                      {members.map((m) => (
                        <option key={m.userId} value={m.userId}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-fg-muted)", display: "block", marginBottom: 4 }}>
                      Categoria
                    </label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      style={selectStyle}
                    >
                      <option value="">Sem categoria</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-fg-muted)", display: "block", marginBottom: 4 }}>
                      Pagamento
                    </label>
                    <select
                      value={cardId}
                      onChange={(e) => setCardId(e.target.value)}
                      style={selectStyle}
                    >
                      <option value="">Sem pagamento</option>
                      {cards.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {error && (
                <div
                  style={{
                    background: "#FEF2F2",
                    border: "1px solid #FECACA",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    fontSize: 13,
                    color: "#B91C1C",
                  }}
                >
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Success Step */}
          {step === "success" && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
                padding: "32px 0",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "#D6F5E3",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 28,
                }}
              >
                ✓
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "var(--color-fg-default)" }}>
                  {importedCount} {importedCount === 1 ? "gasto importado" : "gastos importados"} com sucesso!
                </div>
                <div style={{ fontSize: 13, color: "var(--color-fg-subtle)", marginTop: 6, fontWeight: 300 }}>
                  Os gastos já aparecem na lista de transações
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {(step === "review" || step === "success") && (
          <div
            style={{
              padding: "16px 24px",
              borderTop: "1px solid var(--color-border-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 10,
            }}
          >
            {step === "review" && (
              <>
                <button
                  type="button"
                  onClick={() => { setStep("upload"); setExpenses([]); setError(null); }}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "1px solid var(--color-border-default)",
                    background: "transparent",
                    fontSize: 13,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    color: "var(--color-fg-muted)",
                  }}
                >
                  Outro arquivo
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={isImporting || selectedCount === 0}
                  style={{
                    padding: "8px 20px",
                    borderRadius: "8px",
                    border: "none",
                    background: selectedCount === 0 ? "var(--color-border-default)" : "var(--color-fg-brand)",
                    color: selectedCount === 0 ? "var(--color-fg-subtle)" : "#fff",
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: "inherit",
                    cursor: selectedCount === 0 ? "not-allowed" : "pointer",
                    opacity: isImporting ? 0.7 : 1,
                  }}
                >
                  {isImporting ? "Importando…" : `Importar ${selectedCount} ${selectedCount === 1 ? "gasto" : "gastos"}`}
                </button>
              </>
            )}
            {step === "success" && (
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: "8px 20px",
                  borderRadius: "8px",
                  border: "none",
                  background: "var(--color-fg-brand)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: "pointer",
                }}
              >
                Fechar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
