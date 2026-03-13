import { getDashboardData } from "@/lib/actions/dashboard";
import { DonutChart } from "@/components/donut-chart";
import { ExpenseButtonPanel } from "@/components/expense-button-panel";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function AvatarStack({ members }: { members: { name: string; avatar?: string | null }[] }) {
  const colors = [
    "var(--color-bg-brand-accent)",
    "var(--color-bg-brand-muted)",
    "var(--color-bg-brand-strong)",
  ];
  const shown = members.slice(0, 3);
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {shown.map((m, i) => (
        <div
          key={i}
          title={m.name}
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: colors[i % colors.length],
            border: "2px solid var(--color-bg-default)",
            marginLeft: i > 0 ? -8 : 0,
            zIndex: shown.length - i,
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 600,
            color: i === 2 ? "var(--color-fg-inverse)" : "var(--color-fg-default)",
          }}
        >
          {m.avatar ? (
            <img src={m.avatar} alt={m.name} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            m.name.charAt(0).toUpperCase()
          )}
        </div>
      ))}
    </div>
  );
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  if (!data) return null;

  const { user, family, expenses, totalSpent, daysInMonth, categories, cards, memberSpending } = data;
  const typeStats = data.typeStats ?? { avulsa: 0, fixa: 0, parcelada: 0 };

  const totalBudget = family?.budget ?? 0;
  const dailyBudget = daysInMonth && totalBudget > 0 ? totalBudget / daysInMonth : 0;

  const donutSegments =
    totalSpent > 0
      ? [
          { value: typeStats.avulsa || 0.001, color: "#A3A3A3" },
          { value: typeStats.fixa || 0.001, color: "#0F8F4E" },
          { value: typeStats.parcelada || 0.001, color: "#1A56DB" },
        ]
      : [{ value: 1, color: "var(--color-border-default)" }];

  const panelMembers = memberSpending.map((m: { userId: string; name: string }) => ({ userId: m.userId, name: m.name }));

  return (
    <>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--space-16)",
          borderRadius: "var(--radius-3xl)",
          height: 70,
        }}
      >
        <h1
          style={{
            fontWeight: 400,
            fontSize: 32,
            lineHeight: 1.2,
            letterSpacing: "-0.6px",
            color: "#000000",
          }}
        >
          Olá {user.name.split(" ")[0]}
        </h1>

        <ExpenseButtonPanel
          categories={categories.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))}
          cards={cards.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))}
          members={panelMembers}
        />
      </div>

      {/* Main 2-column layout */}
      <div style={{ display: "flex", gap: "var(--space-16)", flex: 1, width: "100%" }}>

        {/* Left Column — Budget Cards */}
        <div
          style={{
            flex: "0 1 40%",
            maxWidth: "40%",
            background: "var(--color-bg-default)",
            border: "var(--border-sm) solid var(--color-border-muted)",
            borderRadius: "var(--radius-4xl)",
            padding: "var(--space-16)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-8)",
          }}
        >
          {/* Card Geral */}
          <div
            style={{
              flex: 1,
              background: "var(--color-bg-brand-default)",
              border: "var(--border-sm) solid var(--color-border-muted)",
              borderRadius: "var(--radius-3xl)",
              padding: "var(--space-24)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <AvatarStack members={memberSpending} />
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <span style={{ fontWeight: 600, fontSize: 14, color: "var(--color-fg-inverse)", lineHeight: 1.5 }}>
                Orçamento Geral
              </span>
              <span style={{ fontWeight: 700, fontSize: 48, lineHeight: 1.1, letterSpacing: "-1px", color: "var(--color-fg-inverse)" }}>
                {formatBRL(totalBudget)}
              </span>
              <span style={{ fontWeight: 600, fontSize: 14, color: "var(--color-fg-inverse)", lineHeight: 1.5 }}>
                {formatBRL(dailyBudget)}/dia
              </span>
            </div>
          </div>

          {/* Cards por membro */}
          {memberSpending.length === 0 ? (
            <div
              style={{
                flex: 1,
                background: "var(--color-bg-brand-accent)",
                border: "var(--border-sm) solid var(--color-border-muted)",
                borderRadius: "var(--radius-3xl)",
                padding: "var(--space-24)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                gap: "var(--space-4)",
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 14, color: "var(--color-bg-brand-strong)", lineHeight: 1.5 }}>
                Nenhum membro ainda
              </span>
            </div>
          ) : (
            memberSpending.map((member: { userId: string; name: string; spent: number; dailyBudget: number }, i) => {
              const bgColors = [
                "var(--color-bg-brand-accent)",
                "var(--color-bg-brand-muted)",
                "var(--color-bg-default)",
              ];
              const labelColors = [
                "var(--color-bg-brand-strong)",
                "var(--color-fg-default)",
                "var(--color-bg-brand-strong)",
              ];
              const valueColors = [
                "var(--color-fg-default)",
                "var(--color-fg-default)",
                "var(--color-bg-brand-strong)",
              ];
              const borderColor = i === 2 ? "var(--color-border-default)" : "var(--color-border-muted)";
              return (
                <div
                  key={member.userId}
                  style={{
                    flex: 1,
                    background: bgColors[i % bgColors.length],
                    border: `var(--border-sm) solid ${borderColor}`,
                    borderRadius: "var(--radius-3xl)",
                    padding: "var(--space-24)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    gap: "var(--space-4)",
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: 14, color: labelColors[i % labelColors.length], lineHeight: 1.5 }}>
                    {member.name}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: 48, lineHeight: 1.1, letterSpacing: "-1px", color: valueColors[i % valueColors.length] }}>
                    {formatBRL(member.spent)}
                  </span>
                  <span style={{ fontWeight: 600, fontSize: 14, color: valueColors[i % valueColors.length], lineHeight: 1.5 }}>
                    {formatBRL(member.dailyBudget)}/dia
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column */}
        <div
          style={{
            flex: "0 1 60%",
            maxWidth: "60%",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-16)",
          }}
        >
          {/* Últimos Gastos */}
          <div
            style={{
              background: "var(--color-bg-default)",
              border: "var(--border-sm) solid var(--color-border-muted)",
              borderRadius: "var(--radius-4xl)",
              padding: "var(--space-16)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-8)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px" }}>
              <span style={{ fontWeight: 400, fontSize: 16, color: "var(--color-fg-default)", lineHeight: 1.5 }}>
                Últimos Gastos
              </span>
              <a
                href="/transactions"
                style={{ fontWeight: 300, fontSize: 12, letterSpacing: "0.2px", color: "var(--color-fg-default)", padding: "8px 16px", borderRadius: "var(--radius-2xl)", cursor: "pointer", lineHeight: 1.5, textDecoration: "none" }}
              >
                Ver tudo
              </a>
            </div>

            {/* Table Header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1.2fr 1fr 1fr 1fr 1fr",
                alignItems: "center",
                gap: "var(--space-8)",
                padding: "16px 24px",
                background: "var(--color-bg-subtle)",
                borderRadius: "var(--radius-3xl)",
                width: "100%",
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 14, color: "var(--color-fg-default)", lineHeight: 1.5 }}>Nome do Gasto</span>
              <span style={{ fontWeight: 300, fontSize: 14, color: "var(--color-fg-default)", textAlign: "center", lineHeight: 1.5 }}>Categoria</span>
              <span style={{ fontWeight: 300, fontSize: 14, color: "var(--color-fg-default)", textAlign: "center", lineHeight: 1.5 }}>Cartão</span>
              <span style={{ fontWeight: 300, fontSize: 14, color: "var(--color-fg-default)", textAlign: "center", lineHeight: 1.5 }}>Responsável</span>
              <span style={{ fontWeight: 300, fontSize: 14, color: "var(--color-fg-default)", textAlign: "center", lineHeight: 1.5 }}>Data</span>
              <span style={{ fontWeight: 300, fontSize: 14, color: "var(--color-fg-default)", textAlign: "center", lineHeight: 1.5 }}>Valor</span>
            </div>

            {/* Table Body */}
            {expenses.length === 0 ? (
              <div
                style={{
                  padding: "32px 24px",
                  textAlign: "center",
                  color: "var(--color-fg-subtle)",
                  fontSize: 14,
                  fontWeight: 400,
                  border: "var(--border-sm) solid var(--color-border-muted)",
                  borderRadius: "var(--radius-3xl)",
                }}
              >
                Nenhum gasto registrado ainda
              </div>
            ) : (
              <div
                style={{
                  background: "var(--color-bg-default)",
                  border: "var(--border-sm) solid var(--color-border-muted)",
                  borderRadius: "var(--radius-3xl)",
                }}
              >
                {expenses.map((expense, i) => (
                  <div
                    key={expense.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1.2fr 1fr 1fr 1fr 1fr",
                      alignItems: "center",
                      gap: "var(--space-8)",
                      padding: "16px 24px",
                      borderBottom: i < expenses.length - 1 ? "var(--border-sm) solid var(--color-border-muted)" : "none",
                      width: "100%",
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 14, color: "var(--color-fg-default)", lineHeight: 1.5 }}>
                      {expense.name}
                    </span>
                    <span style={{ display: "flex", justifyContent: "center" }}>
                      {expense.category ? (
                        <span
                          style={{
                            background: "var(--color-bg-muted)",
                            padding: "2px 4px",
                            borderRadius: "var(--radius-2xl)",
                            fontWeight: 600,
                            fontSize: 12,
                            color: "var(--color-fg-muted)",
                            lineHeight: 1.5,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {expense.category.name}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--color-fg-subtle)" }}>—</span>
                      )}
                    </span>
                    <span style={{ fontWeight: 400, fontSize: 12, color: "var(--color-fg-default)", textAlign: "center", lineHeight: 1.5 }}>
                      {expense.card?.name ?? "—"}
                    </span>
                    <span style={{ fontWeight: 400, fontSize: 12, color: "var(--color-fg-default)", textAlign: "center", lineHeight: 1.5 }}>
                      {expense.responsible.name.split(" ")[0]}
                    </span>
                    <span style={{ fontWeight: 400, fontSize: 12, color: "var(--color-fg-default)", textAlign: "center", lineHeight: 1.5 }}>
                      {formatDate(expense.date)}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: 12, color: "var(--color-fg-brand)", textAlign: "center", lineHeight: 1.5 }}>
                      {formatBRL(expense.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Row */}
          <div style={{ display: "flex", gap: "var(--space-16)", flex: 1 }}>

            {/* Divisão do Orçamento */}
            <div
              style={{
                flex: 1,
                background: "#FFFFFF",
                border: "1px solid #F5F5F5",
                borderRadius: 32,
                padding: "24px 24px 32px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 24,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                <span style={{ fontWeight: 400, fontSize: 16, color: "#0A0A0A", lineHeight: 1.5 }}>
                  Divisão do Orçamento
                </span>
                <AvatarStack members={memberSpending.map((m) => ({ name: m.name, avatar: m.avatar }))} />
              </div>

              <DonutChart
                segments={donutSegments}
                size={200}
                strokeWidth={32}
                centerLabel={formatBRL(totalSpent)}
                centerSublabel={totalBudget > 0 ? `De ${formatBRL(totalBudget)}` : "Total gasto"}
              />

              <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", alignSelf: "stretch" }}>
                {[
                  { color: "#A3A3A3", label: "Avulsa", value: typeStats.avulsa },
                  { color: "#0F8F4E", label: "Fixa", value: typeStats.fixa },
                  { color: "#1A56DB", label: "Parcelada", value: typeStats.parcelada },
                ].map((item, i) => {
                  const pct = totalSpent > 0 ? Math.round((item.value / totalSpent) * 100) : 0;
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: 4,
                            background: item.color,
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontSize: 12, fontWeight: 400, color: "#525252", lineHeight: 1.5 }}>
                          {item.label}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#0A0A0A", lineHeight: 1.5 }}>
                          {formatBRL(item.value)}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 400, color: "#A3A3A3", lineHeight: 1.5, minWidth: 36 }}>
                          {pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Limite por Categoria */}
            <div
              style={{
                flex: 1,
                background: "var(--color-bg-default)",
                border: "var(--border-sm) solid var(--color-border-muted)",
                borderRadius: "var(--radius-4xl)",
                padding: "var(--space-16)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-8)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
                <span style={{ fontWeight: 400, fontSize: 16, color: "var(--color-fg-default)", lineHeight: 1.5 }}>
                  Limite por Categoria
                </span>
                <span style={{ fontWeight: 300, fontSize: 12, letterSpacing: "0.2px", color: "var(--color-fg-default)", cursor: "pointer", lineHeight: 1.5 }}>
                  Ver mais
                </span>
              </div>

              {categories.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--color-fg-subtle)", padding: "8px", fontWeight: 300 }}>
                  Nenhuma categoria cadastrada
                </p>
              ) : (
                categories.map((cat) => (
                  <div key={cat.id} style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)", padding: "0 8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 300, fontSize: 12, letterSpacing: "0.2px", color: "var(--color-fg-default)", lineHeight: 1.5 }}>
                        {cat.name}
                      </span>
                      <span style={{ fontWeight: 300, fontSize: 12, letterSpacing: "0.2px", color: "var(--color-fg-default)", lineHeight: 1.5 }}>
                        {cat.percentage}%
                      </span>
                    </div>
                    <div style={{ background: "var(--color-bg-subtle)", height: 8, borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
                      <div
                        style={{
                          background: "var(--color-bg-brand-default)",
                          height: "100%",
                          borderRadius: "var(--radius-lg)",
                          width: `${cat.percentage}%`,
                          transition: "width 0.3s",
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
